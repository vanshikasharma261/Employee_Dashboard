/**
 * Centralized route paths. Components/router reference these constants instead
 * of hardcoding URL strings, so paths can be tuned in one place.
 */
export const ROUTES = {
  // Public
  LOGIN: "/login",
  UNAUTHORIZED: "/unauthorized",

  // Shared (role decides which dashboard/layout renders)
  DASHBOARD: "/dashboard",

  // Admin
  EMPLOYEES: "/employees",
  DEPARTMENTS: "/departments",
  HIERARCHY: "/hierarchy",
  ASSETS: "/assets",
  ASSET_REQUESTS: "/asset-requests",

  // Employee portal
  MY_ASSETS: "/my-assets",
  MY_REQUESTS: "/my-requests",
  PROFILE: "/profile",
} as const;
