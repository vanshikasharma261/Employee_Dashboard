import { ROUTES } from "./routes";

/**
 * Sidebar navigation model. Each section renders as a labelled group of links.
 * `icon` is a key resolved to an SVG by the sidebar's icon map, so this file
 * stays free of JSX and can be reused by both Admin and Employee sidebars.
 */
export interface NavItem {
  label: string;
  to: string;
  icon: NavIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type NavIcon =
  | "dashboard"
  | "employees"
  | "departments"
  | "hierarchy"
  | "assets"
  | "requests";

/** Admin sidebar: Administration + Employee Portal sections (per screenshots). */
export const ADMIN_NAV: NavSection[] = [
  {
    title: "Administration",
    items: [
      { label: "Dashboard", to: ROUTES.DASHBOARD, icon: "dashboard" },
      { label: "Employees", to: ROUTES.EMPLOYEES, icon: "employees" },
      { label: "Departments", to: ROUTES.DEPARTMENTS, icon: "departments" },
      { label: "Hierarchy", to: ROUTES.HIERARCHY, icon: "hierarchy" },
      { label: "Assets", to: ROUTES.ASSETS, icon: "assets" },
      { label: "Requests", to: ROUTES.ASSET_REQUESTS, icon: "requests" },
    ],
  },
  {
    title: "Employee Portal",
    items: [
      { label: "My Dashboard", to: ROUTES.DASHBOARD, icon: "dashboard" },
      { label: "My Assets", to: ROUTES.MY_ASSETS, icon: "assets" },
      { label: "My Requests", to: ROUTES.MY_REQUESTS, icon: "requests" },
    ],
  },
];

/** Employee sidebar: Employee Portal only. */
export const EMPLOYEE_NAV: NavSection[] = [
  {
    title: "Employee Portal",
    items: [
      { label: "My Dashboard", to: ROUTES.DASHBOARD, icon: "dashboard" },
      { label: "My Assets", to: ROUTES.MY_ASSETS, icon: "assets" },
      { label: "My Requests", to: ROUTES.MY_REQUESTS, icon: "requests" },
    ],
  },
];
