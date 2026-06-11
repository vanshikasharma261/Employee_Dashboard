import { EmployeeStatus } from '../generated/prisma/client';

/**
 * Application-wide constant values.
 */

/** Names of the httpOnly authentication cookies. */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** bcrypt cost factor used when hashing the refresh-token digest. */
export const REFRESH_HASH_ROUNDS = 10;

/** Employee statuses permitted to authenticate (business rule). */
export const LOGIN_ALLOWED_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.WORKING,
  EmployeeStatus.ON_NOTICE,
];

/** Metadata key shared by the `@Roles` decorator and the `RolesGuard`. */
export const ROLES_KEY = 'roles';
