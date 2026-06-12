import {
  Body,
  Controller,
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
import { AssetRequestService } from './asset-request.service';
import { ApproveRequestDto } from './dto/approve-request.dto';
import { CreateAssetRequestDto } from './dto/create-asset-request.dto';
import { ListAssetRequestsQueryDto } from './dto/list-asset-requests-query.dto';
import { RejectRequestDto } from './dto/reject-request.dto';

/**
 * Asset Request routes (mounted under the global `/api` prefix).
 *
 * Thin by design: every method only extracts the request context and delegates
 * to {@link AssetRequestService}. Mixed access (per-method guards, mirroring
 * `EmployeeController`):
 *   - Create + the `my` reads are open to any authenticated principal; the
 *     "own only" scoping is enforced in the service, not by role (an admin is
 *     also an employee and may raise/view their own requests).
 *   - List-all, detail, approve, and reject are ADMIN-only.
 *
 * Route order matters: `my` and `my/:id` are declared before `:id` so `my` is
 * not captured as an id parameter.
 */
@Controller('asset-requests')
export class AssetRequestController {
  constructor(private readonly assetRequestService: AssetRequestService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request, @Body() dto: CreateAssetRequestDto) {
    return this.assetRequestService.create(req.user as AuthenticatedUser, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMy(@Req() req: Request, @Query() query: ListAssetRequestsQueryDto) {
    return this.assetRequestService.findMy(
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  findMyOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.assetRequestService.findMyOne(
      req.user as AuthenticatedUser,
      id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Req() req: Request, @Query() query: ListAssetRequestsQueryDto) {
    return this.assetRequestService.findAll(
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.assetRequestService.findOne(req.user as AuthenticatedUser, id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approve(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveRequestDto,
  ) {
    return this.assetRequestService.approve(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  reject(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRequestDto,
  ) {
    return this.assetRequestService.reject(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }
}
