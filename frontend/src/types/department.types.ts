/**
 * Safe department shape returned by `GET /departments`
 * (mirrors the backend `DEPARTMENT_SAFE_SELECT` → `toDepartment` mapper).
 * Scaffold for Feature 012 (Department Management UI).
 */
export interface Department {
  id: string;
  name: string;
  employee_count: number;
}
