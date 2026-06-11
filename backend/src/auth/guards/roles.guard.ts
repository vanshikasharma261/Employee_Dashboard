import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../constant/values.constant';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Enforces Role-Based Access Control.
 *
 * Reads the roles required by the handler/controller (set via `@Roles`) and
 * compares them against the authenticated employee's role. Must run after
 * {@link JwtAuthGuard}, which attaches the employee to `request.user`.
 * Handlers without `@Roles` metadata are left unrestricted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
