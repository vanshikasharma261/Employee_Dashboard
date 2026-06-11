import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/prisma/client';
import { ROLES_KEY } from '../../constant/values.constant';

/**
 * Declares the roles permitted to access a route handler or controller.
 * Read by {@link RolesGuard}. Usage: `@Roles(Role.ADMIN)`.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
