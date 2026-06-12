import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetHistoryController } from './asset-history.controller';
import { AssetHistoryService } from './asset-history.service';

/**
 * Asset Allocation History module (feature 009).
 *
 * Imports PrismaModule (DB access) and AuthModule (for the exported
 * `AuthService.isUserActive` session check and the JWT/Roles guards used on the
 * controller). Exports {@link AssetHistoryService} so `AssetRequestModule` can
 * inject it and call the tx-aware `record*` writers from its approval
 * transaction.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AssetHistoryController],
  providers: [AssetHistoryService],
  exports: [AssetHistoryService],
})
export class AssetHistoryModule {}
