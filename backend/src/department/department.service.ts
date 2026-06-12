import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  AuthMessages,
  DepartmentMessages,
} from '../constant/messages.constant';
import {
  DEPARTMENT_LIST_DEFAULT_LIMIT,
  DEPARTMENT_LIST_MAX_LIMIT,
} from '../constant/values.constant';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

/**
 * Explicit allow-list of the fields any department endpoint may expose.
 *
 * Selecting (rather than fetching-then-deleting) guarantees the internal
 * columns — `is_deleted`, `deleted_at`, `created_at`, `updated_at` — never
 * leave the database. The active-employee count is included for convenience.
 */
const DEPARTMENT_SAFE_SELECT = {
  id: true,
  name: true,
  _count: {
    select: { employees: { where: { is_deleted: false } } },
  },
} satisfies Prisma.DepartmentSelect;

/** Reshapes a raw Prisma row into the public department shape. */
type DepartmentRow = {
  id: string;
  name: string;
  _count: { employees: number };
};

const toDepartment = ({ id, name, _count }: DepartmentRow) => ({
  id,
  name,
  employee_count: _count.employees,
});

/** Options accepted by {@link DepartmentService.findAll}. */
export interface ListDepartmentsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * All department business logic. Controllers stay thin and delegate here; every
 * Prisma access for the Department model lives in this service.
 *
 * Each operation first confirms the acting session is still active via
 * {@link AuthService.isUserActive} (reads the live DB flag, not the JWT), and
 * all reads/writes scope to non-soft-deleted departments.
 */
@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async findAll(user: AuthenticatedUser, options: ListDepartmentsOptions = {}) {
    await this.assertActiveSession(user);

    const page = Math.max(1, Math.trunc(options.page ?? 1) || 1);
    const limit = Math.min(
      DEPARTMENT_LIST_MAX_LIMIT,
      Math.max(
        1,
        Math.trunc(options.limit ?? DEPARTMENT_LIST_DEFAULT_LIMIT) || 1,
      ),
    );
    const search = options.search?.trim();

    const where: Prisma.DepartmentWhereInput = {
      is_deleted: false,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        select: DEPARTMENT_SAFE_SELECT,
        orderBy: { created_at: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows.map(toDepartment),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(user: AuthenticatedUser, dto: CreateDepartmentDto) {
    await this.assertActiveSession(user);

    await this.assertNameAvailable(dto.name);

    try {
      const department = await this.prisma.department.create({
        data: {
          name: dto.name,
          // Server-set defaults — stated explicitly even where the schema
          // already defaults them, so the intent is unambiguous.
          is_deleted: false,
          deleted_at: null,
        },
        select: DEPARTMENT_SAFE_SELECT,
      });
      return {
        message: DepartmentMessages.DEPARTMENT_CREATED_SUCCESSFULLY,
        data: toDepartment(department),
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDepartmentDto) {
    await this.assertActiveSession(user);

    await this.getActiveDepartmentOrThrow(id);

    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
    }

    try {
      const department = await this.prisma.department.update({
        // Scope to active rows: if a concurrent request soft-deleted this
        // department between the check above and here, the write matches no row
        // and Prisma throws P2025 (mapped to NotFound) instead of silently
        // rehydrating a deleted department's name.
        where: { id, is_deleted: false },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
        },
        select: DEPARTMENT_SAFE_SELECT,
      });
      return {
        message: DepartmentMessages.DEPARTMENT_UPDATED_SUCCESSFULLY,
        data: toDepartment(department),
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    // Run the existence check, employee-dependency guard, and soft-delete in one
    // interactive transaction so an employee cannot be assigned to the
    // department between the count and the delete (which would orphan them under
    // a deleted department).
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.department.findUnique({
        where: { id },
        select: { id: true, is_deleted: true },
      });
      if (!existing) {
        throw new NotFoundException(DepartmentMessages.DEPARTMENT_NOT_FOUND);
      }
      if (existing.is_deleted) {
        throw new BadRequestException(
          DepartmentMessages.DEPARTMENT_ALREADY_DELETED,
        );
      }

      // Employee-dependency guard: block deletion while active employees are
      // assigned to the department (consistent with the active-only count).
      const activeEmployees = await tx.employee.count({
        where: { department_id: id, is_deleted: false },
      });
      if (activeEmployees > 0) {
        throw new BadRequestException(
          DepartmentMessages.DEPARTMENT_HAS_EMPLOYEES,
        );
      }

      await tx.department.update({
        where: { id, is_deleted: false },
        data: { is_deleted: true, deleted_at: new Date() },
      });
    });

    return { message: DepartmentMessages.DEPARTMENT_DELETED_SUCCESSFULLY };
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

  private async getActiveDepartmentOrThrow(id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, is_deleted: false },
      select: { id: true },
    });
    if (!department) {
      throw new NotFoundException(DepartmentMessages.DEPARTMENT_NOT_FOUND);
    }
    return department;
  }

  /**
   * Enforces case-insensitive name uniqueness against active (non-soft-deleted)
   * departments. The DB `@unique` constraint is case-sensitive and spans
   * soft-deleted rows, so the business rule is enforced here; `excludeId` skips
   * the current row on update.
   */
  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        is_deleted: false,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(DepartmentMessages.DEPARTMENT_ALREADY_EXISTS);
    }
  }

  /**
   * Maps Prisma write errors to friendly HTTP exceptions:
   *   - P2002 (unique violation): the active-only case-insensitive uniqueness
   *     index. The pre-check catches duplicates already, but this closes the
   *     residual race between two concurrent writes that the raw constraint
   *     would otherwise surface as a 500.
   *   - P2025 (record not found): the `update` matched no active row because
   *     the department was soft-deleted concurrently — treat as NotFound.
   */
  private toWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new ConflictException(
          DepartmentMessages.DEPARTMENT_ALREADY_EXISTS,
        );
      }
      if (error.code === 'P2025') {
        return new NotFoundException(DepartmentMessages.DEPARTMENT_NOT_FOUND);
      }
    }
    return error;
  }
}
