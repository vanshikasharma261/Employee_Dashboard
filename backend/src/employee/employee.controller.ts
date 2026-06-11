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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { EmployeeService } from './employee.service';

/**
 * Employee management routes (mounted under the global `/api` prefix).
 *
 * Thin by design: every method only extracts the request context and delegates
 * to {@link EmployeeService}. Admin routes require ADMIN; `GET /employees/me`
 * is open to any authenticated employee.
 *
 * Route order matters: `me` is declared before `:id` so it is not captured as
 * an id parameter.
 */
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrent(@Req() req: Request) {
    return this.employeeService.findMe(req.user as AuthenticatedUser);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Req() req: Request, @Query() query: ListEmployeesQueryDto) {
    return this.employeeService.findAll(req.user as AuthenticatedUser, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.findOne(req.user as AuthenticatedUser, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Req() req: Request, @Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(req.user as AuthenticatedUser, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(req.user as AuthenticatedUser, id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeeService.updateStatus(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.remove(req.user as AuthenticatedUser, id);
  }
}
