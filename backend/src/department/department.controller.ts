import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../generated/prisma/client';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { ListDepartmentsQueryDto } from './dto/list-departments-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

/**
 * Department management routes (mounted under the global `/api` prefix).
 *
 * Thin by design: every method only extracts the request context and delegates
 * to {@link DepartmentService}. All routes require an authenticated ADMIN.
 */
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  findAll(@Req() req: Request, @Query() query: ListDepartmentsQueryDto) {
    return this.departmentService.findAll(req.user as AuthenticatedUser, query);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(req.user as AuthenticatedUser, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.departmentService.remove(req.user as AuthenticatedUser, id);
  }
}
