import { EmployeeStatus } from '../generated/prisma/client';

/**
 * Application-wide constant values.
 */

/** Names of the httpOnly authentication cookies. */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** bcrypt cost factor used when hashing the refresh-token digest. */
export const REFRESH_HASH_ROUNDS = 10;

/** bcrypt cost factor used when hashing employee passwords. */
export const PASSWORD_HASH_ROUNDS = 10;

/** Default page size for paginated employee listings. */
export const EMPLOYEE_LIST_DEFAULT_LIMIT = 10;

/** Upper bound on a single page of employees, to cap query cost. */
export const EMPLOYEE_LIST_MAX_LIMIT = 100;

/** Upper bound on a free-text search term, to cap query cost. */
export const EMPLOYEE_SEARCH_MAX_LENGTH = 100;

/** Upper bound on free-text employee fields (names, addresses). */
export const EMPLOYEE_TEXT_MAX_LENGTH = 500;

/** Employee statuses permitted to authenticate (business rule). */
export const LOGIN_ALLOWED_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.WORKING,
  EmployeeStatus.ON_NOTICE,
];

/** Metadata key shared by the `@Roles` decorator and the `RolesGuard`. */
export const ROLES_KEY = 'roles';
