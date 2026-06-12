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

/** Default page size for paginated department listings. */
export const DEPARTMENT_LIST_DEFAULT_LIMIT = 10;

/** Upper bound on a single page of departments, to cap query cost. */
export const DEPARTMENT_LIST_MAX_LIMIT = 100;

/** Upper bound on a free-text department search term, to cap query cost. */
export const DEPARTMENT_SEARCH_MAX_LENGTH = 100;

/** Upper bound on a department name. */
export const DEPARTMENT_NAME_MAX_LENGTH = 255;

/** Default page size for paginated asset listings. */
export const ASSET_LIST_DEFAULT_LIMIT = 10;

/** Upper bound on a single page of assets, to cap query cost. */
export const ASSET_LIST_MAX_LIMIT = 100;

/** Upper bound on a free-text asset search term, to cap query cost. */
export const ASSET_SEARCH_MAX_LENGTH = 100;

/** Upper bound on an asset serial number. */
export const ASSET_SERIAL_NUMBER_MAX_LENGTH = 255;

/** Default page size for paginated asset-request listings. */
export const ASSET_REQUEST_LIST_DEFAULT_LIMIT = 10;

/** Upper bound on a single page of asset requests, to cap query cost. */
export const ASSET_REQUEST_LIST_MAX_LIMIT = 100;

/** Upper bound on an asset-request description. */
export const ASSET_REQUEST_DESCRIPTION_MAX_LENGTH = 1000;

/** Upper bound on an admin's response on an asset request. */
export const ADMIN_RESPONSE_MAX_LENGTH = 1000;

/** Default page size for paginated asset-history listings. */
export const ASSET_HISTORY_LIST_DEFAULT_LIMIT = 10;

/** Upper bound on a single page of asset-history records, to cap query cost. */
export const ASSET_HISTORY_LIST_MAX_LIMIT = 100;

/** Employee statuses permitted to authenticate (business rule). */
export const LOGIN_ALLOWED_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.WORKING,
  EmployeeStatus.ON_NOTICE,
];

/** Metadata key shared by the `@Roles` decorator and the `RolesGuard`. */
export const ROLES_KEY = 'roles';
