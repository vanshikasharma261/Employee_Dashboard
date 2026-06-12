import type { Role } from "../constants/roles";

/** Mirrors the backend `EmployeeStatus` enum. */
export const EmployeeStatus = {
  WORKING: "WORKING",
  ON_NOTICE: "ON_NOTICE",
  RESIGNED: "RESIGNED",
  TERMINATED: "TERMINATED",
} as const;

export type EmployeeStatus =
  (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

/** Lightweight department summary embedded in employee responses. */
export interface DepartmentSummary {
  id: string;
  name: string;
}

/** Lightweight manager summary embedded in employee responses. */
export interface ReportingManagerSummary {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  official_email: string;
}

/**
 * Safe employee shape returned by every employee read endpoint
 * (`GET /employees`, `/employees/:id`, `/employees/me`).
 *
 * Mirrors the backend's `EMPLOYEE_SAFE_SELECT` exactly — sensitive columns
 * (`password`, `refresh_token_hash`, `is_active`, soft-delete/timestamp fields)
 * are never sent by the API and so are absent here.
 */
export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  official_email: string;
  personal_email: string | null;
  role: Role;
  present_address: string | null;
  permanent_address: string | null;
  joining_date: string;
  status: EmployeeStatus;
  department_id: string | null;
  reporting_manager_id: string | null;
  department: DepartmentSummary | null;
  reporting_manager: ReportingManagerSummary | null;
}
