import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { validateEnv } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmployeeModule } from '../employee/employee.module';
import { DepartmentModule } from '../department/department.module';
import { AssetModule } from '../asset/asset.module';
import { AssetHistoryModule } from '../asset-history/asset-history.module';
import { AssetRequestModule } from '../asset-request/asset-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    EmployeeModule,
    DepartmentModule,
    AssetModule,
    AssetHistoryModule,
    AssetRequestModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
