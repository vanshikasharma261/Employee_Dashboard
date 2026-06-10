/**
 * Department seed data.
 *
 * Contains department records only — no employees, assets, or business logic.
 * Department `name` is unique (schema constraint), so each entry here is a
 * stable key the seed orchestrator uses to resolve employee `department_id`.
 */

export interface DepartmentSeed {
  name: string;
}

export const departmentsSeedData: DepartmentSeed[] = [
  { name: 'Engineering' },
  { name: 'Human Resources' },
  { name: 'Finance' },
  { name: 'Marketing' },
  { name: 'Product' },
  { name: 'Operations' },
];
