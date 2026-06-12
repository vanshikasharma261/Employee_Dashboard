import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { AssetHistoryService } from './asset-history.service';
import { ListAssetHistoryQueryDto } from './dto/list-asset-history-query.dto';

/**
 * Asset Allocation History routes (mounted under the global `/api` prefix).
 *
 * Read-only and immutable: there is intentionally no POST / PATCH / DELETE here.
 * Mixed access (mirrors `EmployeeController`'s per-method guard pattern):
 *   - `GET /asset-history/my` is open to any authenticated principal and returns
 *     only their own records (scoped in the service).
 *   - All other routes are ADMIN-only.
 *
 * Route order matters: `my` is declared before `asset/:assetId` and
 * `employee/:employeeId` so the static segment is matched first.
 */
@Controller('asset-history')
export class AssetHistoryController {
  constructor(private readonly assetHistoryService: AssetHistoryService) {}

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: Request) {
    return this.assetHistoryService.findMyHistory(
      req.user as AuthenticatedUser,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll(@Req() req: Request, @Query() query: ListAssetHistoryQueryDto) {
    return this.assetHistoryService.findAll(
      req.user as AuthenticatedUser,
      query,
    );
  }

  @Get('asset/:assetId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findByAsset(
    @Req() req: Request,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    return this.assetHistoryService.findByAsset(
      req.user as AuthenticatedUser,
      assetId,
    );
  }

  @Get('employee/:employeeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findByEmployee(
    @Req() req: Request,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.assetHistoryService.findByEmployee(
      req.user as AuthenticatedUser,
      employeeId,
    );
  }
}
