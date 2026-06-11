import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

/**
 * Employee management module.
 *
 * Imports PrismaModule (DB access) and AuthModule (for the exported
 * `AuthService.isUserActive` session check and the JWT/Roles guards used on the
 * controller). All employee business logic lives in {@link EmployeeService}.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmployeeController],
  providers: [EmployeeService],
})
export class EmployeeModule {}
