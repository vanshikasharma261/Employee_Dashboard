import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AssetMessages, AuthMessages } from '../constant/messages.constant';
import {
  ASSET_LIST_DEFAULT_LIMIT,
  ASSET_LIST_MAX_LIMIT,
} from '../constant/values.constant';
import { AssetCategory, AssetStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import {
  MANUAL_ASSET_STATUSES,
  UpdateAssetStatusDto,
} from './dto/update-asset-status.dto';

/**
 * Explicit allow-list of the fields any asset endpoint may expose.
 *
 * Selecting (rather than fetching-then-deleting) guarantees the internal
 * columns — `is_deleted`, `deleted_at`, `created_at`, `updated_at` — never
 * leave the database. The allocated employee is included as a small summary
 * (`null` when the asset is unallocated).
 */
const ASSET_SAFE_SELECT = {
  id: true,
  asset_serial_number: true,
  asset_category: true,
  status: true,
  allocated_to: {
    select: {
      id: true,
      first_name: true,
      last_name: true,
      official_email: true,
    },
  },
} satisfies Prisma.AssetSelect;

/** Options accepted by {@link AssetService.findAll}. */
export interface ListAssetsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * All asset business logic. Controllers stay thin and delegate here; every
 * Prisma access for the Asset model lives in this service.
 *
 * Each operation first confirms the acting session is still active via
 * {@link AuthService.isUserActive} (reads the live DB flag, not the JWT), and
 * all reads/writes scope to non-soft-deleted assets.
 */
@Injectable()
export class AssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async findAll(user: AuthenticatedUser, options: ListAssetsOptions = {}) {
    await this.assertActiveSession(user);

    const page = Math.max(1, Math.trunc(options.page ?? 1) || 1);
    const limit = Math.min(
      ASSET_LIST_MAX_LIMIT,
      Math.max(1, Math.trunc(options.limit ?? ASSET_LIST_DEFAULT_LIMIT) || 1),
    );
    const search = options.search?.trim();

    const where: Prisma.AssetWhereInput = {
      is_deleted: false,
      ...(search ? { OR: this.buildSearchOr(search) } : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        select: ASSET_SAFE_SELECT,
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

  async findOne(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    const asset = await this.prisma.asset.findFirst({
      where: { id, is_deleted: false },
      select: ASSET_SAFE_SELECT,
    });
    if (!asset) {
      throw new NotFoundException(AssetMessages.ASSET_NOT_FOUND);
    }
    return asset;
  }

  async create(user: AuthenticatedUser, dto: CreateAssetDto) {
    await this.assertActiveSession(user);

    await this.assertSerialAvailable(dto.asset_serial_number);

    try {
      const asset = await this.prisma.asset.create({
        data: {
          asset_serial_number: dto.asset_serial_number,
          asset_category: dto.asset_category,
          // Server-set defaults — stated explicitly even where the schema
          // already defaults them, so the intent is unambiguous.
          status: AssetStatus.AVAILABLE,
          allocated_to_id: null,
          is_deleted: false,
          deleted_at: null,
        },
        select: ASSET_SAFE_SELECT,
      });
      return {
        message: AssetMessages.ASSET_CREATED_SUCCESSFULLY,
        data: asset,
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAssetDto) {
    await this.assertActiveSession(user);

    await this.getActiveAssetOrThrow(id);

    if (dto.asset_serial_number !== undefined) {
      await this.assertSerialAvailable(dto.asset_serial_number, id);
    }

    try {
      const asset = await this.prisma.asset.update({
        // Scope to active rows: if a concurrent request soft-deleted this asset
        // between the check above and here, the write matches no row and Prisma
        // throws P2025 (mapped to NotFound) instead of mutating a deleted asset.
        where: { id, is_deleted: false },
        data: {
          ...(dto.asset_serial_number !== undefined
            ? { asset_serial_number: dto.asset_serial_number }
            : {}),
          ...(dto.asset_category !== undefined
            ? { asset_category: dto.asset_category }
            : {}),
        },
        select: ASSET_SAFE_SELECT,
      });
      return {
        message: AssetMessages.ASSET_UPDATED_SUCCESSFULLY,
        data: asset,
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateAssetStatusDto,
  ) {
    await this.assertActiveSession(user);

    // A manual transition to ALLOCATED is forbidden — allocation is owned by the
    // future Asset Request module.
    if (!MANUAL_ASSET_STATUSES.includes(dto.status)) {
      throw new BadRequestException(AssetMessages.INVALID_ASSET_STATUS);
    }

    await this.getActiveAssetOrThrow(id);

    try {
      const asset = await this.prisma.asset.update({
        // Scope to active rows: a concurrent soft-delete between the check above
        // and here matches no row, so Prisma throws P2025 (mapped to NotFound)
        // rather than mutating a deleted asset.
        where: { id, is_deleted: false },
        data: { status: dto.status },
        select: ASSET_SAFE_SELECT,
      });
      return {
        message: AssetMessages.ASSET_STATUS_UPDATED_SUCCESSFULLY,
        data: asset,
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    // Run the existence check, allocation guard, and soft-delete in one
    // interactive transaction so the asset cannot be allocated between reading
    // `allocated_to_id` and the delete (which would soft-delete an asset that is
    // still assigned to an employee).
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.asset.findUnique({
        where: { id },
        select: { id: true, is_deleted: true, allocated_to_id: true },
      });
      if (!existing) {
        throw new NotFoundException(AssetMessages.ASSET_NOT_FOUND);
      }
      if (existing.is_deleted) {
        throw new BadRequestException(AssetMessages.ASSET_ALREADY_DELETED);
      }
      // Allocation guard: an asset currently assigned to an employee cannot be
      // deleted. Deallocation belongs to the future Asset Allocation module.
      if (existing.allocated_to_id !== null) {
        throw new BadRequestException(AssetMessages.ASSET_CANNOT_BE_DELETED);
      }

      await tx.asset.update({
        where: { id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      });
    });

    return { message: AssetMessages.ASSET_DELETED_SUCCESSFULLY };
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

  /**
   * Confirms an active (non-soft-deleted) asset exists, throwing `NotFound`
   * otherwise. Selects only the id — callers (`update`, `updateStatus`) use this
   * purely as an existence guard before their scoped write, so there is no need
   * to fetch the full projection or join the allocated employee here.
   */
  private async getActiveAssetOrThrow(id: string): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, is_deleted: false },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException(AssetMessages.ASSET_NOT_FOUND);
    }
  }

  /**
   * Builds the case-insensitive search `OR` covering both the serial number
   * (substring match) and the category. Prisma enum fields don't support
   * `contains`, so the matching categories are resolved in JS and passed as an
   * `in` filter; the category arm is omitted entirely when nothing matches.
   */
  private buildSearchOr(search: string): Prisma.AssetWhereInput[] {
    const or: Prisma.AssetWhereInput[] = [
      { asset_serial_number: { contains: search, mode: 'insensitive' } },
    ];

    const needle = search.toLowerCase();
    const matchedCategories = Object.values(AssetCategory).filter((category) =>
      category.toLowerCase().includes(needle),
    );
    if (matchedCategories.length > 0) {
      or.push({ asset_category: { in: matchedCategories } });
    }

    return or;
  }

  /**
   * Enforces serial-number uniqueness across *all* assets, including soft-deleted
   * (trashed) ones — a trashed asset cannot be recovered, so its serial is
   * permanently retired and must never be reused. This matches the all-rows DB
   * `@unique` constraint. Every stored serial is already uppercased by the DTO
   * transform, so a plain `equals` check on the uppercased value catches
   * case-insensitive duplicates; `excludeId` skips the current row on update.
   */
  private async assertSerialAvailable(
    serial: string,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.prisma.asset.findFirst({
      where: {
        asset_serial_number: serial,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(AssetMessages.ASSET_ALREADY_EXISTS);
    }
  }

  /**
   * Maps Prisma write errors to friendly HTTP exceptions:
   *   - P2002 (unique violation): backs up the {@link assertSerialAvailable}
   *     pre-check for the race where two concurrent creates pass that check and
   *     both attempt to insert the same serial — the DB `@unique` rejects the
   *     loser. Map to a friendly conflict.
   *   - P2025 (record not found): the `update` matched no active row because the
   *     asset was soft-deleted concurrently — treat as NotFound.
   */
  private toWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(AssetMessages.ASSET_ALREADY_EXISTS);
      }
      if (error.code === 'P2025') {
        return new NotFoundException(AssetMessages.ASSET_NOT_FOUND);
      }
    }
    return error;
  }
}
