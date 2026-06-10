import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module exposing the shared PrismaService.
 *
 * Feature modules that need database access import PrismaModule explicitly and
 * inject PrismaService via DI. Nest caches providers per module, so the single
 * client instance is reused across the application. Feature modules must never
 * instantiate PrismaClient directly — all database access flows through
 * PrismaService.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
