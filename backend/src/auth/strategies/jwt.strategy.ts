import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ACCESS_TOKEN_COOKIE } from '../../constant/values.constant';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Reads the access token from the httpOnly access-token cookie.
 * Returns null when absent so Passport responds with 401 rather than throwing.
 */
const accessTokenCookieExtractor = (req: Request): string | null => {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
};

/**
 * Passport JWT strategy guarding authenticated routes.
 *
 * Verifies the access-token signature and expiry, then re-loads the employee to
 * confirm the session is still valid (exists, not soft-deleted, active). The
 * returned employee is attached to `request.user`. This is a read-only check —
 * no database writes occur for invalid requests.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([accessTokenCookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: payload.sub },
      // Read only what we need: the flags to validate the session, plus the
      // safe fields exposed on `request.user`. The password and
      // refresh_token_hash are never loaded.
      select: {
        id: true,
        official_email: true,
        role: true,
        is_active: true,
        is_deleted: true,
      },
    });

    if (!employee || employee.is_deleted || !employee.is_active) {
      throw new UnauthorizedException('Invalid or inactive session');
    }

    return {
      id: employee.id,
      email: employee.official_email,
      role: employee.role,
    };
  }
}
