/** Shared cross-feature types. */

/** Standard mutation envelope returned by the backend write endpoints. */
export interface MessageResponse<T = unknown> {
  message: string;
  data: T;
}

/** Pagination metadata returned by list endpoints. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Standard list envelope returned by the backend list endpoints. */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Normalized API error thrown by the service layer. `fieldErrors` carries the
 * backend's field-keyed `ValidationPipe` body (e.g. `{ email, password }`);
 * `message` is the general fallback message.
 */
export interface ApiError {
  message: string;
  status: number;
  fieldErrors?: Record<string, string>;
}
