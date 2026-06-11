import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuthMessages, EmployeeMessages } from '../constant/messages.constant';
import {
  EMPLOYEE_LIST_DEFAULT_LIMIT,
  EMPLOYEE_LIST_MAX_LIMIT,
  PASSWORD_HASH_ROUNDS,
} from '../constant/values.constant';
import { EmployeeStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';

/**
 * Explicit allow-list of the fields any employee endpoint may expose.
 *
 * Selecting (rather than fetching-then-deleting) guarantees the sensitive
 * columns — `password`, `refresh_token_hash`, `is_active`, `is_deleted`,
 * `deleted_at`, `created_at`, `updated_at` — never leave the database.
 * Department and reporting-manager summaries are included for convenience.
 */
const EMPLOYEE_SAFE_SELECT = {
  id: true,
  employee_code: true,
  first_name: true,
  last_name: true,
  official_email: true,
  personal_email: true,
  role: true,
  present_address: true,
  permanent_address: true,
  joining_date: true,
  status: true,
  department_id: true,
  reporting_manager_id: true,
  department: { select: { id: true, name: true } },
  reporting_manager: {
    select: {
      id: true,
      employee_code: true,
      first_name: true,
      last_name: true,
      official_email: true,
    },
  },
} satisfies Prisma.EmployeeSelect;

/** Options accepted by {@link EmployeeService.findAll}. */
export interface ListEmployeesOptions {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * All employee business logic. Controllers stay thin and delegate here; every
 * Prisma access for the Employee model lives in this service.
 *
 * Each admin operation first confirms the acting session is still active via
 * {@link AuthService.isUserActive} (reads the live DB flag, not the JWT), and
 * all reads/writes scope to non-soft-deleted employees.
 */
@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateEmployeeDto) {
    await this.assertActiveSession(user);

    const departmentId = await this.resolveDepartmentId(dto.department_name);
    await this.assertEmailsAvailable(dto.official_email, dto.personal_email);

    let reportingManagerId: string | null = null;
    if (dto.reporting_manager_official_email) {
      if (dto.reporting_manager_official_email === dto.official_email) {
        throw new BadRequestException(EmployeeMessages.CANNOT_REPORT_TO_SELF);
      }
      reportingManagerId = await this.resolveReportingManagerId(
        dto.reporting_manager_official_email,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);

    try {
      const employee = await this.prisma.$transaction(async (tx) => {
        const employeeCode = await this.generateEmployeeCode(tx);
        return tx.employee.create({
          data: {
            employee_code: employeeCode,
            first_name: dto.first_name,
            last_name: dto.last_name,
            official_email: dto.official_email,
            personal_email: dto.personal_email,
            password: passwordHash,
            role: dto.role,
            present_address: dto.present_address,
            permanent_address: dto.permanent_address,
            joining_date: new Date(dto.joining_date),
            department_id: departmentId,
            reporting_manager_id: reportingManagerId,
            // Server-set defaults — stated explicitly even where the schema
            // already defaults them, so the intent is unambiguous.
            status: EmployeeStatus.WORKING,
            is_deleted: false,
            is_active: false,
            refresh_token_hash: null,
            deleted_at: null,
          },
          select: EMPLOYEE_SAFE_SELECT,
        });
      });

      return {
        message: EmployeeMessages.EMPLOYEE_CREATED_SUCCESSFULLY,
        data: employee,
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async findAll(user: AuthenticatedUser, options: ListEmployeesOptions = {}) {
    await this.assertActiveSession(user);

    const page = Math.max(1, Math.trunc(options.page ?? 1) || 1);
    const limit = Math.min(
      EMPLOYEE_LIST_MAX_LIMIT,
      Math.max(
        1,
        Math.trunc(options.limit ?? EMPLOYEE_LIST_DEFAULT_LIMIT) || 1,
      ),
    );
    const search = options.search?.trim();

    const where: Prisma.EmployeeWhereInput = {
      is_deleted: false,
      ...(search
        ? {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { official_email: { contains: search, mode: 'insensitive' } },
              { employee_code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        select: EMPLOYEE_SAFE_SELECT,
        orderBy: { employee_code: 'asc' },
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
    return this.getActiveEmployeeOrThrow(id);
  }

  /**
   * Current authenticated employee's own profile. The session was already
   * validated by {@link JwtStrategy}; we re-confirm it is still active (live DB
   * flag) for consistency with every other endpoint, then reload the full safe
   * profile by id because `request.user` only carries id/email/role.
   */
  async findMe(user: AuthenticatedUser) {
    await this.assertActiveSession(user);
    return this.getActiveEmployeeOrThrow(user.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmployeeDto) {
    await this.assertActiveSession(user);

    const existing = await this.prisma.employee.findFirst({
      where: { id, is_deleted: false },
      select: { id: true, official_email: true },
    });
    if (!existing) {
      throw new NotFoundException(EmployeeMessages.EMPLOYEE_NOT_FOUND);
    }

    const data: Prisma.EmployeeUncheckedUpdateInput = {};

    if (dto.first_name !== undefined) data.first_name = dto.first_name;
    if (dto.last_name !== undefined) data.last_name = dto.last_name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.present_address !== undefined) {
      data.present_address = dto.present_address;
    }
    if (dto.permanent_address !== undefined) {
      data.permanent_address = dto.permanent_address;
    }
    if (dto.joining_date !== undefined) {
      data.joining_date = new Date(dto.joining_date);
    }

    if (dto.official_email !== undefined || dto.personal_email !== undefined) {
      await this.assertEmailsAvailable(
        dto.official_email,
        dto.personal_email,
        id,
      );
      if (dto.official_email !== undefined) {
        data.official_email = dto.official_email;
      }
      if (dto.personal_email !== undefined) {
        data.personal_email = dto.personal_email;
      }
    }

    if (dto.department_name !== undefined) {
      data.department_id = await this.resolveDepartmentId(dto.department_name);
    }

    if (dto.reporting_manager_official_email !== undefined) {
      data.reporting_manager_id = await this.resolveReportingManagerId(
        dto.reporting_manager_official_email,
        id,
      );
    }

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);
      // Changing the password invalidates any live session: clear the active
      // flag and refresh-token hash so existing access/refresh tokens stop
      // working and the employee must re-authenticate with the new password.
      data.is_active = false;
      data.refresh_token_hash = null;
    }

    try {
      const employee = await this.prisma.employee.update({
        where: { id },
        data,
        select: EMPLOYEE_SAFE_SELECT,
      });
      return {
        message: EmployeeMessages.EMPLOYEE_UPDATED_SUCCESSFULLY,
        data: employee,
      };
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateEmployeeStatusDto,
  ) {
    await this.assertActiveSession(user);

    // Confirm the employee exists and is not soft-deleted before mutating.
    await this.getActiveEmployeeOrThrow(id);

    const employee = await this.prisma.employee.update({
      where: { id },
      data: { status: dto.status },
      select: EMPLOYEE_SAFE_SELECT,
    });

    return {
      message: EmployeeMessages.EMPLOYEE_STATUS_UPDATED_SUCCESSFULLY,
      data: employee,
    };
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.assertActiveSession(user);

    const existing = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, is_deleted: true },
    });
    if (!existing) {
      throw new NotFoundException(EmployeeMessages.EMPLOYEE_NOT_FOUND);
    }
    if (existing.is_deleted) {
      throw new BadRequestException(EmployeeMessages.EMPLOYEE_ALREADY_DELETED);
    }

    await this.prisma.employee.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });

    return { message: EmployeeMessages.EMPLOYEE_DELETED_SUCCESSFULLY };
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

  private async getActiveEmployeeOrThrow(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, is_deleted: false },
      select: EMPLOYEE_SAFE_SELECT,
    });
    if (!employee) {
      throw new NotFoundException(EmployeeMessages.EMPLOYEE_NOT_FOUND);
    }
    return employee;
  }

  private async resolveDepartmentId(name: string): Promise<string> {
    const department = await this.prisma.department.findFirst({
      where: { name, is_deleted: false },
      select: { id: true },
    });
    if (!department) {
      throw new NotFoundException(EmployeeMessages.DEPARTMENT_NOT_FOUND);
    }
    return department.id;
  }

  /**
   * Resolves a reporting manager's official email to their id, enforcing the
   * business rules: the manager must exist, not be soft-deleted, be WORKING,
   * and not be the employee themselves (`selfId`, on update).
   */
  private async resolveReportingManagerId(
    email: string,
    selfId?: string,
  ): Promise<string> {
    const manager = await this.prisma.employee.findFirst({
      where: { official_email: email, is_deleted: false },
      select: { id: true, status: true },
    });
    if (!manager) {
      throw new NotFoundException(EmployeeMessages.REPORTING_MANAGER_NOT_FOUND);
    }
    if (selfId && manager.id === selfId) {
      throw new BadRequestException(EmployeeMessages.CANNOT_REPORT_TO_SELF);
    }
    if (manager.status !== EmployeeStatus.WORKING) {
      throw new BadRequestException(
        EmployeeMessages.REPORTING_MANAGER_NOT_WORKING,
      );
    }
    return manager.id;
  }

  /**
   * Rejects creation/update when an email is already taken. The unique
   * constraint spans every row (including soft-deleted), so this check does the
   * same — it is not filtered by `is_deleted`.
   */
  private async assertEmailsAvailable(
    officialEmail?: string,
    personalEmail?: string,
    excludeId?: string,
  ): Promise<void> {
    const or: Prisma.EmployeeWhereInput[] = [];
    if (officialEmail !== undefined) {
      or.push({ official_email: officialEmail });
    }
    if (personalEmail !== undefined) {
      or.push({ personal_email: personalEmail });
    }
    if (or.length === 0) return;

    const clash = await this.prisma.employee.findFirst({
      where: {
        OR: or,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(EmployeeMessages.EMAIL_ALREADY_EXISTS);
    }
  }

  /**
   * Generates the next sequential `EMPxxx` code, matching the seed convention.
   * Run inside the create transaction so the read of the current maximum and
   * the insert that consumes it stay consistent.
   */
  private async generateEmployeeCode(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const last = await tx.employee.findFirst({
      orderBy: { employee_code: 'desc' },
      select: { employee_code: true },
    });
    const lastNumber = last
      ? Number.parseInt(last.employee_code.replace(/\D/g, ''), 10)
      : 0;
    const next = (Number.isFinite(lastNumber) ? lastNumber : 0) + 1;
    return `EMP${next.toString().padStart(3, '0')}`;
  }

  /**
   * Maps a Prisma unique-constraint violation to a friendly HTTP error. The
   * email pre-checks catch the common case; this guards the residual race where
   * two concurrent writes target the same email or generated employee code.
   */
  private toWriteError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = error.meta?.target;
      const fields = Array.isArray(target)
        ? target.join(',')
        : typeof target === 'string'
          ? target
          : '';
      if (fields.includes('email')) {
        return new ConflictException(EmployeeMessages.EMAIL_ALREADY_EXISTS);
      }
      if (fields.includes('employee_code')) {
        return new ConflictException(
          EmployeeMessages.EMPLOYEE_CODE_GENERATION_FAILED,
        );
      }
    }
    return error;
  }
}
