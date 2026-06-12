import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AssetHistoryService } from '../asset-history/asset-history.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AssetRequestMessages,
  AuthMessages,
} from '../constant/messages.constant';
import {
  ASSET_REQUEST_LIST_DEFAULT_LIMIT,
  ASSET_REQUEST_LIST_MAX_LIMIT,
} from '../constant/values.constant';
import {
  AssetStatus,
  EmployeeStatus,
  Prisma,
  RequestStatus,
  RequestType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { CreateAssetRequestDto } from './dto/create-asset-request.dto';
import { ListAssetRequestsQueryDto } from './dto/list-asset-requests-query.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

/**
 * Explicit allow-list of the fields any asset-request endpoint may expose.
 *
 * Selecting (rather than fetching whole rows) guarantees the internal columns —
 * `is_deleted`, `deleted_at` — never leave the database. Small asset + employee
 * summaries are included for convenience.
 */
const REQUEST_SAFE_SELECT = {
  id: true,
  request_type: true,
  status: true,
  description: true,
  admin_response: true,
  created_at: true,
  updated_at: true,
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
} satisfies Prisma.AssetRequestSelect;

/**
 * Asset Request workflow engine (feature 008).
 *
 * Any authenticated principal (employee or admin — an admin is also a company
 * employee) may raise requests and view their own; admins additionally list,
 * view, approve, and reject everyone's. Approval is the *only* path that mutates
 * asset allocation/status: it runs inside a single Prisma transaction that
 * updates the request, mutates the asset, and appends the matching immutable
 * history record atomically.
 */
@Injectable()
export class AssetRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly assetHistory: AssetHistoryService,
  ) {}

  // ---------------------------------------------------------------------------
  // Create + self-service reads (any authenticated principal — own only)
  // ---------------------------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateAssetRequestDto) {
    await this.assertActiveSession(user);

    // The asset must exist and not be soft-deleted to be the subject of a request.
    const asset = await this.prisma.asset.findFirst({
      where: { id: dto.asset_id, is_deleted: false },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetRequestMessages.ASSET_NOT_FOUND);
    }

    const request = await this.prisma.assetRequest.create({
      data: {
        // employee_id is always the authenticated principal — never from the body.
        employee_id: user.id,
        asset_id: dto.asset_id,
        request_type: dto.request_type,
        description: dto.description,
        // Server-set defaults, stated explicitly so intent is unambiguous.
        status: RequestStatus.PENDING,
        admin_response: null,
        is_deleted: false,
        deleted_at: null,
      },
      select: REQUEST_SAFE_SELECT,
    });

    return {
      message: AssetRequestMessages.REQUEST_CREATED_SUCCESSFULLY,
      data: request,
    };
  }

  async findMy(user: AuthenticatedUser, query: ListAssetRequestsQueryDto = {}) {
    await this.assertActiveSession(user);

    const { page, limit } = this.resolvePagination(query);
    const where: Prisma.AssetRequestWhereInput = {
      employee_id: user.id,
      is_deleted: false,
      ...(query.status ? { status: query.status } : {}),
      ...(query.request_type ? { request_type: query.request_type } : {}),
    };

    return this.paginate(where, page, limit);
  }

  async findMyOne(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    // Scope to the principal's own requests so others' requests are not leaked —
    // a non-owned id is reported as not-found rather than forbidden.
    const request = await this.prisma.assetRequest.findFirst({
      where: { id, is_deleted: false, employee_id: user.id },
      select: REQUEST_SAFE_SELECT,
    });
    if (!request) {
      throw new NotFoundException(AssetRequestMessages.REQUEST_NOT_FOUND);
    }
    return request;
  }

  // ---------------------------------------------------------------------------
  // Admin reads
  // ---------------------------------------------------------------------------

  async findAll(
    user: AuthenticatedUser,
    query: ListAssetRequestsQueryDto = {},
  ) {
    await this.assertActiveSession(user);

    const { page, limit } = this.resolvePagination(query);
    const where: Prisma.AssetRequestWhereInput = {
      is_deleted: false,
      ...(query.status ? { status: query.status } : {}),
      ...(query.request_type ? { request_type: query.request_type } : {}),
    };

    return this.paginate(where, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    const request = await this.prisma.assetRequest.findFirst({
      where: { id, is_deleted: false },
      select: REQUEST_SAFE_SELECT,
    });
    if (!request) {
      throw new NotFoundException(AssetRequestMessages.REQUEST_NOT_FOUND);
    }
    return request;
  }

  // ---------------------------------------------------------------------------
  // Admin approve / reject
  // ---------------------------------------------------------------------------

  /**
   * Approves a pending request. Everything happens in one interactive
   * transaction so the request status change, the asset mutation, and the
   * history write are atomic — a failure at any step rolls all of them back.
   *
   * Lifecycle: PENDING → APPROVED → (asset effect + history) → COMPLETED.
   */
  async approve(user: AuthenticatedUser, id: string, dto: ApproveRequestDto) {
    await this.assertActiveSession(user);

    const data = await this.prisma.$transaction(async (tx) => {
      const request = await tx.assetRequest.findFirst({
        where: { id, is_deleted: false },
        select: {
          id: true,
          employee_id: true,
          asset_id: true,
          request_type: true,
          status: true,
        },
      });
      if (!request) {
        throw new NotFoundException(AssetRequestMessages.REQUEST_NOT_FOUND);
      }
      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException(
          AssetRequestMessages.REQUEST_ALREADY_PROCESSED,
        );
      }
      if (!request.asset_id) {
        // Defensive: the create DTO requires asset_id, but the column is nullable.
        throw new NotFoundException(AssetRequestMessages.ASSET_NOT_FOUND);
      }
      const assetId = request.asset_id;

      // 1. Mark APPROVED and store the admin's response.
      await tx.assetRequest.update({
        where: { id },
        data: {
          status: RequestStatus.APPROVED,
          admin_response: dto.admin_response,
        },
      });

      // 2. Perform the asset side effect + write the matching history record.
      switch (request.request_type) {
        case RequestType.NEW_ASSET:
          await this.applyNewAsset(
            tx,
            assetId,
            request.employee_id,
            dto.admin_response,
          );
          break;
        case RequestType.REMOVE_ASSET:
          await this.applyRemoveAsset(
            tx,
            assetId,
            request.employee_id,
            dto.admin_response,
          );
          break;
        case RequestType.MAINTENANCE:
          await this.applyMaintenance(
            tx,
            assetId,
            request.employee_id,
            dto.admin_response,
          );
          break;
      }

      // 3. Carry the request through to its terminal, read-only state.
      return tx.assetRequest.update({
        where: { id },
        data: { status: RequestStatus.COMPLETED },
        select: REQUEST_SAFE_SELECT,
      });
    });

    return {
      message: AssetRequestMessages.REQUEST_APPROVED_SUCCESSFULLY,
      data,
    };
  }

  async reject(user: AuthenticatedUser, id: string, dto: RejectRequestDto) {
    await this.assertActiveSession(user);

    const request = await this.prisma.assetRequest.findFirst({
      where: { id, is_deleted: false },
      select: { id: true, status: true },
    });
    if (!request) {
      throw new NotFoundException(AssetRequestMessages.REQUEST_NOT_FOUND);
    }
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        AssetRequestMessages.REQUEST_ALREADY_PROCESSED,
      );
    }

    // No asset mutation and no history record on rejection.
    const data = await this.prisma.assetRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        admin_response: dto.admin_response,
      },
      select: REQUEST_SAFE_SELECT,
    });

    return {
      message: AssetRequestMessages.REQUEST_REJECTED_SUCCESSFULLY,
      data,
    };
  }

  // ---------------------------------------------------------------------------
  // Per-request-type approval effects (run inside the approval transaction)
  // ---------------------------------------------------------------------------

  /**
   * NEW_ASSET: the requesting employee must be WORKING, and the asset must be
   * AVAILABLE and unallocated. Allocates the asset and records the allocation.
   */
  private async applyNewAsset(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ): Promise<void> {
    const employee = await tx.employee.findFirst({
      where: { id: employeeId, is_deleted: false },
      select: { status: true },
    });
    if (!employee || employee.status !== EmployeeStatus.WORKING) {
      throw new BadRequestException(
        AssetRequestMessages.EMPLOYEE_NOT_ALLOCATABLE,
      );
    }

    const asset = await tx.asset.findFirst({
      where: { id: assetId, is_deleted: false },
      select: { status: true, allocated_to_id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetRequestMessages.ASSET_NOT_FOUND);
    }
    if (
      asset.status !== AssetStatus.AVAILABLE ||
      asset.allocated_to_id !== null
    ) {
      throw new ConflictException(AssetRequestMessages.ASSET_NOT_AVAILABLE);
    }

    await tx.asset.update({
      where: { id: assetId, is_deleted: false },
      data: { allocated_to_id: employeeId, status: AssetStatus.ALLOCATED },
    });
    await this.assetHistory.recordAllocation(tx, assetId, employeeId, remarks);
  }

  /**
   * REMOVE_ASSET: the asset must currently be allocated to the requesting
   * employee. Deallocates the asset and records the return.
   */
  private async applyRemoveAsset(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ): Promise<void> {
    const asset = await tx.asset.findFirst({
      where: { id: assetId, is_deleted: false },
      select: { allocated_to_id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetRequestMessages.ASSET_NOT_FOUND);
    }
    if (asset.allocated_to_id !== employeeId) {
      throw new BadRequestException(AssetRequestMessages.INVALID_ASSET_OWNER);
    }

    await tx.asset.update({
      where: { id: assetId, is_deleted: false },
      data: { allocated_to_id: null, status: AssetStatus.AVAILABLE },
    });
    await this.assetHistory.recordDeallocation(
      tx,
      assetId,
      employeeId,
      remarks,
    );
  }

  /**
   * MAINTENANCE: sends the asset to maintenance. The asset is taken away from
   * whoever holds it — `allocated_to_id` is cleared — and the maintenance event
   * is recorded against the requester.
   */
  private async applyMaintenance(
    tx: Prisma.TransactionClient,
    assetId: string,
    employeeId: string,
    remarks: string,
  ): Promise<void> {
    const asset = await tx.asset.findFirst({
      where: { id: assetId, is_deleted: false },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetRequestMessages.ASSET_NOT_FOUND);
    }

    await tx.asset.update({
      where: { id: assetId, is_deleted: false },
      data: { status: AssetStatus.MAINTENANCE, allocated_to_id: null },
    });
    await this.assetHistory.recordMaintenance(tx, assetId, employeeId, remarks);
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

  private resolvePagination(query: ListAssetRequestsQueryDto): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, Math.trunc(query.page ?? 1) || 1);
    const limit = Math.min(
      ASSET_REQUEST_LIST_MAX_LIMIT,
      Math.max(
        1,
        Math.trunc(query.limit ?? ASSET_REQUEST_LIST_DEFAULT_LIMIT) || 1,
      ),
    );
    return { page, limit };
  }

  /** Runs a paginated, newest-first query for the given filter. */
  private async paginate(
    where: Prisma.AssetRequestWhereInput,
    page: number,
    limit: number,
  ) {
    const [total, data] = await this.prisma.$transaction([
      this.prisma.assetRequest.count({ where }),
      this.prisma.assetRequest.findMany({
        where,
        select: REQUEST_SAFE_SELECT,
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
}
