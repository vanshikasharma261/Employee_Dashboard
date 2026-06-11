import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { Request, Response } from 'express';
import type { StringValue } from 'ms';
import {
  ACCESS_TOKEN_COOKIE,
  LOGIN_ALLOWED_STATUSES,
  REFRESH_HASH_ROUNDS,
  REFRESH_TOKEN_COOKIE,
} from '../constant/values.constant';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthSuccessResponse } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication business logic: login, refresh-token rotation and logout.
 *
 * Tokens are delivered as httpOnly cookies. Only one refresh token is valid per
 * employee at a time — its bcrypt hash is stored on the Employee record and the
 * raw token is never persisted.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, res: Response): Promise<AuthSuccessResponse> {
    const employee = await this.prisma.employee.findUnique({
      where: { official_email: dto.email },
    });

    // Generic message on both branches so we never leak which field was wrong.
    if (!employee || employee.is_deleted) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!LOGIN_ALLOWED_STATUSES.includes(employee.status)) {
      throw new UnauthorizedException('Account is not permitted to log in');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      employee.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens({
      sub: employee.id,
      email: employee.official_email,
      role: employee.role,
    });

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        is_active: true,
        refresh_token_hash: await this.hashRefreshToken(tokens.refreshToken),
      },
    });

    this.setAuthCookies(res, tokens);

    return { success: true, message: 'Logged in successfully' };
  }

  async refresh(req: Request, res: Response): Promise<AuthSuccessResponse> {
    const incomingRefreshToken = this.extractRefreshToken(req);
    if (!incomingRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify the signature/expiry before any database access. A forged or
    // expired token is rejected here and triggers no DB writes.
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        incomingRefreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Rotate atomically. The row lock serialises concurrent refreshes for the
    // same employee so two requests cannot both pass the hash check and each
    // issue a new token pair (which would orphan one valid session).
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the employee row for the duration of the rotation.
      await tx.$queryRaw`SELECT id FROM "employees" WHERE id = ${payload.sub}::uuid FOR UPDATE`;

      const employee = await tx.employee.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          official_email: true,
          role: true,
          status: true,
          is_deleted: true,
          is_active: true,
          refresh_token_hash: true,
        },
      });

      // Re-check status here, not just on login: an employee terminated or
      // resigned after their last login keeps is_active = true and a valid
      // hash, so without this they could rotate tokens until manual cleanup.
      if (
        !employee ||
        employee.is_deleted ||
        !employee.is_active ||
        !employee.refresh_token_hash ||
        !LOGIN_ALLOWED_STATUSES.includes(employee.status)
      ) {
        return { status: 'invalid' as const };
      }

      const tokenMatches = await bcrypt.compare(
        this.sha256(incomingRefreshToken),
        employee.refresh_token_hash,
      );
      if (!tokenMatches) {
        // The token's signature is valid but it no longer matches the stored
        // hash — it was already rotated, i.e. replayed. Treat this as a stolen
        // token and revoke the whole session so the attacker is locked out and
        // the legitimate user is forced to re-authenticate. The revoke is part
        // of this committed transaction; we signal the caller to reject after.
        await tx.employee.update({
          where: { id: employee.id },
          data: { is_active: false, refresh_token_hash: null },
        });
        return { status: 'reuse' as const };
      }

      // Issue a fresh pair and replace the stored hash so the previous refresh
      // token can no longer be used.
      const tokens = await this.generateTokens({
        sub: employee.id,
        email: employee.official_email,
        role: employee.role,
      });

      await tx.employee.update({
        where: { id: employee.id },
        data: {
          refresh_token_hash: await this.hashRefreshToken(tokens.refreshToken),
        },
      });

      return { status: 'ok' as const, tokens };
    });

    if (result.status !== 'ok') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.setAuthCookies(res, result.tokens);

    return { success: true, message: 'Token refreshed successfully' };
  }

  async logout(
    employeeId: string,
    res: Response,
  ): Promise<AuthSuccessResponse> {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { is_active: false, refresh_token_hash: null },
    });

    this.clearAuthCookies(res);

    return { success: true, message: 'Logged out successfully' };
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    // `expiresIn` accepts the `ms` StringValue union ("1d", "15m", …); the env
    // value is validated as a non-empty string, so cast it to that type.
    const accessOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_EXPIRES_IN',
      ) as StringValue,
    };
    const refreshOptions: JwtSignOptions = {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<string>(
        'JWT_REFRESH_EXPIRES_IN',
      ) as StringValue,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessOptions),
      this.jwtService.signAsync(payload, refreshOptions),
    ]);

    return { accessToken, refreshToken };
  }

  private extractRefreshToken(req: Request): string | null {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_TOKEN_COOKIE] ?? null;
  }

  /**
   * Produces the bcrypt hash stored for a refresh token.
   *
   * The token is first reduced with SHA-256: a JWT exceeds bcrypt's 72-byte
   * input limit, and two of the same employee's refresh tokens share their
   * first 72 bytes (header + leading claims), so hashing the raw token would
   * make rotation unable to distinguish them. SHA-256 folds the entire token
   * into a fixed 64-char digest that fits within that limit.
   */
  private hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(this.sha256(refreshToken), REFRESH_HASH_ROUNDS);
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.baseCookieOptions(),
      maxAge: this.durationToMs(
        this.configService.getOrThrow<string>('JWT_EXPIRES_IN'),
      ),
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.baseCookieOptions(),
      maxAge: this.durationToMs(
        this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'),
      ),
    });
  }

  private clearAuthCookies(res: Response): void {
    const options = this.baseCookieOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE, options);
    res.clearCookie(REFRESH_TOKEN_COOKIE, options);
  }

  private baseCookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: '/';
  } {
    return {
      httpOnly: true,
      // Secure only in production so cookies work over http during local dev.
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      // Scope to the whole app so the cookies are sent on every protected API
      // route, not just the /api/auth path that set them. clearCookie must use
      // the same path to match, which it does via this shared helper.
      path: '/',
    };
  }

  /**
   * Converts a JWT-style duration (`"15m"`, `"1d"`, `"7d"`, or a plain number of
   * seconds) into milliseconds so cookie expiry mirrors the token TTL.
   */
  private durationToMs(value: string): number {
    const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
    if (!match) {
      const asSeconds = Number(value);
      return Number.isFinite(asSeconds) ? asSeconds * 1000 : 0;
    }
    const amount = Number(match[1]);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return amount * unitMs[match[2] ?? 's'];
  }
}
