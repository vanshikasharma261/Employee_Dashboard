import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

/**
 * Asset management module.
 *
 * Imports PrismaModule (DB access) and AuthModule (for the exported
 * `AuthService.isUserActive` session check and the JWT/Roles guards used on the
 * controller). All asset business logic lives in {@link AssetService}.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}
