import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Authentication & authorization module.
 *
 * PrismaModule is imported explicitly (it is not `@Global`). JwtModule is
 * configured asynchronously from environment via ConfigService — no secrets are
 * hardcoded. Per-token secrets/expiries are also passed explicitly when signing
 * (see {@link AuthService}) to keep the access and refresh tokens independent.
 */
@Module({
  imports: [
    PrismaModule,
    PassportModule,
    ConfigModule,
    // Only the secret is configured here; per-token secrets and expiries are
    // passed explicitly when signing/verifying (see AuthService) so the access
    // and refresh tokens stay independent.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Exported so Employee, Department, Asset, Allocation and Request modules can
  // inject AuthService and reuse `isUserActive()` for service-level session
  // checks. Importing modules must also import AuthModule to receive it.
  exports: [AuthService],
})
export class AuthModule {}
