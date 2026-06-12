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
import { AssetService } from './asset.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ListAssetsQueryDto } from './dto/list-assets-query.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto';

/**
 * Asset management routes (mounted under the global `/api` prefix).
 *
 * Thin by design: every method only extracts the request context and delegates
 * to {@link AssetService}. All routes require an authenticated ADMIN.
 */
@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  findAll(@Req() req: Request, @Query() query: ListAssetsQueryDto) {
    return this.assetService.findAll(req.user as AuthenticatedUser, query);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.findOne(req.user as AuthenticatedUser, id);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateAssetDto) {
    return this.assetService.create(req.user as AuthenticatedUser, dto);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(req.user as AuthenticatedUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetStatusDto,
  ) {
    return this.assetService.updateStatus(
      req.user as AuthenticatedUser,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.assetService.remove(req.user as AuthenticatedUser, id);
  }
}
