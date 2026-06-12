import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AssetHistoryMessages,
  AuthMessages,
} from '../constant/messages.constant';
import {
  ASSET_HISTORY_LIST_DEFAULT_LIMIT,
  ASSET_HISTORY_LIST_MAX_LIMIT,
} from '../constant/values.constant';
import { Prisma, RequestType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAssetHistoryQueryDto } from './dto/list-asset-history-query.dto';

/**
 * Explicit allow-list of the fields any asset-history endpoint may expose.
 *
 * Selecting (rather than fetching whole rows) keeps the projection stable and
 * includes small asset + employee summaries for convenience. The history model
 * is an immutable audit log, so there are no internal soft-delete columns to
 * hide here.
 */
const HISTORY_SAFE_SELECT = {
  id: true,
  event_type: true,
  allocated_at: true,
  returned_at: true,
  remarks: true,
  created_at: true,
  asset: {
    select: {
      id: true,
      asset_serial_number: true,
      asset_category: true,
      status: true,
    },
  },
  employee: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      official_email: true,
    },
  },
} satisfies Prisma.AssetAllocationHistorySelect;

/**
 * Asset Allocation History (feature 009).
 *
 * Three responsibilities:
 *   1. Admin-only **read** APIs over the immutable audit log (`findAll`,
 *      `findByAsset`, `findByEmployee`).
 *   2. A **self-service** read (`findMyHistory`) open to any authenticated
 *      principal — scoped in the service to their own records
 *      (`employee_id = user.id`), so an employee can only ever see their own.
 *   3. Internal **`record*`** writers called only by `AssetRequestService` from
 *      inside its approval transaction. Each takes the transaction client as its
 *      first argument so the history write joins the same atomic transaction;
 *      they are not individually session-guarded because the calling admin flow
 *      already validated the session.
 *
 * Every read guards the live session first. History records are never updated or
 * deleted — there is intentionally no mutation API beyond the append-only
 * `record*` writers.
 */
@Injectable()
export class AssetHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // Read APIs (admin only)
  // ---------------------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: ListAssetHistoryQueryDto = {}) {
    await this.assertActiveSession(user);

    const page = Math.max(1, Math.trunc(query.page ?? 1) || 1);
    const limit = Math.min(
      ASSET_HISTORY_LIST_MAX_LIMIT,
      Math.max(
        1,
        Math.trunc(query.limit ?? ASSET_HISTORY_LIST_DEFAULT_LIMIT) || 1,
      ),
    );

    const where: Prisma.AssetAllocationHistoryWhereInput = {
      ...(query.asset_id ? { asset_id: query.asset_id } : {}),
      ...(query.employee_id ? { employee_id: query.employee_id } : {}),
      ...(query.event_type ? { event_type: query.event_type } : {}),
    };

    return this.paginate(where, page, limit);
  }

  async findByAsset(user: AuthenticatedUser, assetId: string) {
    await this.assertActiveSession(user);

    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, is_deleted: false },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetHistoryMessages.ASSET_NOT_FOUND);
    }

    return this.findTimeline({ asset_id: assetId });
  }

  async findByEmployee(user: AuthenticatedUser, employeeId: string) {
    await this.assertActiveSession(user);

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, is_deleted: false },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException(AssetHistoryMessages.EMPLOYEE_NOT_FOUND);
    }

    return this.findTimeline({ employee_id: employeeId });
  }

  // ---------------------------------------------------------------------------
  // Self-service read (any authenticated principal — own records only)
  // ---------------------------------------------------------------------------

  /**
   * Returns the authenticated principal's own asset-activity timeline. The scope
   * (`employee_id = user.id`) is enforced here in the service, never from a
   * route param or the body, so an employee can only ever see their own history.
   */
  async findMyHistory(user: AuthenticatedUser) {
    await this.assertActiveSession(user);

    return this.findTimeline({ employee_id: user.id });
  }

  // ---------------------------------------------------------------------------
  // Internal record* writers (called from AssetRequestService's transaction)
  // ---------------------------------------------------------------------------

  /**
   * Records an allocation event when a NEW_ASSET request is approved.
   * `remarks` is the admin's response on the request.
   */
  recordAllocation(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ) {
    return tx.assetAllocationHistory.create({
      data: {
        asset_id: assetId,
        employee_id: employeeId,
        event_type: RequestType.NEW_ASSET,
        remarks,
        allocated_at: new Date(),
      },
    });
  }

  /**
   * Records a deallocation (return) event when a REMOVE_ASSET request is
   * approved. `remarks` is the admin's response on the request.
   */
  recordDeallocation(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ) {
    return tx.assetAllocationHistory.create({
      data: {
        asset_id: assetId,
        employee_id: employeeId,
        event_type: RequestType.REMOVE_ASSET,
        remarks,
        returned_at: new Date(),
      },
    });
  }

  /**
   * Records a maintenance event when a MAINTENANCE request is approved.
   * `employeeId` is the employee who raised the request (the requester); the
   * schema requires it (NOT NULL) and every approval carries
   * `request.employee_id`. `remarks` is the admin's response on the request.
   */
  recordMaintenance(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ) {
    return tx.assetAllocationHistory.create({
      data: {
        asset_id: assetId,
        employee_id: employeeId,
        event_type: RequestType.MAINTENANCE,
        remarks,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async assertActiveSession(user: AuthenticatedUser): Promise<void> {
    const isActive = await this.authService.isUserActive(user);
    if (!isActive) {
      throw new UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION);
    }
  }

  /** Runs a paginated, newest-first query for the given filter. */
  private async paginate(
    where: Prisma.AssetAllocationHistoryWhereInput,
    page: number,
    limit: number,
  ) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.assetAllocationHistory.count({ where }),
      this.prisma.assetAllocationHistory.findMany({
        where,
        select: HISTORY_SAFE_SELECT,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Returns the full newest-first timeline for a filter (no pagination) — used
   * by the by-asset, by-employee, and self-service routes, which each present a
   * complete timeline rather than a page.
   */
  private async findTimeline(where: Prisma.AssetAllocationHistoryWhereInput) {
    const data = await this.prisma.assetAllocationHistory.findMany({
      where,
      select: HISTORY_SAFE_SELECT,
      orderBy: { created_at: 'desc' },
    });
    return { data };
  }
}
