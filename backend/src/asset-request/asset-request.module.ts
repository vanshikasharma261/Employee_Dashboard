import { Module } from '@nestjs/common';
import { AssetHistoryModule } from '../asset-history/asset-history.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetRequestController } from './asset-request.controller';
import { AssetRequestService } from './asset-request.service';

/**
 * Asset Request workflow module (feature 008).
 *
 * Imports PrismaModule (DB access), AuthModule (the exported
 * `AuthService.isUserActive` session check and the JWT/Roles guards), and
 * AssetHistoryModule (to inject `AssetHistoryService` and call its tx-aware
 * `record*` writers from the approval transaction). There is no reverse
 * dependency, so no circular import.
 */
@Module({
  imports: [PrismaModule, AuthModule, AssetHistoryModule],
  controllers: [AssetRequestController],
  providers: [AssetRequestService],
})
export class AssetRequestModule {}
