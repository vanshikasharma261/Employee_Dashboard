import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';

/**
 * Department management module.
 *
 * Imports PrismaModule (DB access) and AuthModule (for the exported
 * `AuthService.isUserActive` session check and the JWT/Roles guards used on the
 * controller). All department business logic lives in {@link DepartmentService}.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
})
export class DepartmentModule {}
