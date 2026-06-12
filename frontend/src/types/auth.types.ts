import type { Employee } from "./employee.types";

/**
 * The authenticated principal. `GET /employees/me` returns the backend's
 * full `EMPLOYEE_SAFE_SELECT` employee, so the auth user is exactly that safe
 * `Employee` shape — `role`, `status`, identity, department and manager
 * summaries all come along for redirect, route protection and header identity.
 */
export type AuthUser = Employee;

/** Credentials submitted by the login form. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Shape of the `auth` slice state. */
export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while a login/logout request is in flight. */
  loading: boolean;
  /** True during the boot `fetchCurrentUser` cookie check (avoids login flash). */
  initializing: boolean;
  error: string | null;
}
