/**
 * Centralized API route constants. Every service references these instead of
 * hardcoding URL strings, so endpoints live in one place. Paths are relative
 * to `VITE_API_URL` (e.g. `http://localhost:3000/api`).
 */
export const AUTH = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
} as const;

export const EMPLOYEES = {
  ME: "/employees/me",
  BASE: "/employees",
} as const;

export const DEPARTMENTS = {
  BASE: "/departments",
} as const;

export const ASSETS = {
  BASE: "/assets",
} as const;

export const ASSET_REQUESTS = {
  BASE: "/asset-requests",
} as const;

export const ASSET_HISTORY = {
  BASE: "/asset-history",
} as const;
