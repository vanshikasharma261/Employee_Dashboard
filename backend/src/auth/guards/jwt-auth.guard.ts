import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Protects routes that require an authenticated employee.
 * Delegates to the `jwt` Passport strategy ({@link JwtStrategy}).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
