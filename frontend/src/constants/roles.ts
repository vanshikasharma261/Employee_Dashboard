/**
 * Frontend mirror of the backend `Role` enum (Prisma schema / auth module).
 * Kept in sync manually — the backend is the source of truth.
 */
export const Role = {
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
