/**
 * Application-wide exception / response messages.
 *
 * Centralised so the same wording is reused across modules rather than being
 * duplicated at each throw site.
 */

/** Authentication / session-validation messages. */
export const AuthMessages = {
  UNAUTHORIZED_EXCEPTION: 'User session is inactive',
} as const;

/** Employee-management messages (feature 005). */
export const EmployeeMessages = {
  EMPLOYEE_NOT_FOUND: 'Employee not found',
  EMPLOYEE_ALREADY_DELETED: 'Employee is already deleted',
  EMPLOYEE_CREATED_SUCCESSFULLY: 'Employee created successfully',
  EMPLOYEE_UPDATED_SUCCESSFULLY: 'Employee updated successfully',
  EMPLOYEE_STATUS_UPDATED_SUCCESSFULLY: 'Employee status updated successfully',
  EMPLOYEE_DELETED_SUCCESSFULLY: 'Employee deleted successfully',
  DEPARTMENT_NOT_FOUND: 'Department not found',
  EMAIL_ALREADY_EXISTS: 'An employee with this email already exists',
  REPORTING_MANAGER_NOT_FOUND: 'Reporting manager not found',
  REPORTING_MANAGER_NOT_WORKING: 'Reporting manager must have WORKING status',
  CANNOT_REPORT_TO_SELF: 'An employee cannot report to themselves',
  EMPLOYEE_CODE_GENERATION_FAILED:
    'Could not generate a unique employee code, please retry',
} as const;

/** Department-management messages (feature 006). */
export const DepartmentMessages = {
  DEPARTMENT_NOT_FOUND: 'Department not found',
  DEPARTMENT_ALREADY_EXISTS: 'Department already exists',
  DEPARTMENT_CREATED_SUCCESSFULLY: 'Department created successfully',
  DEPARTMENT_UPDATED_SUCCESSFULLY: 'Department updated successfully',
  DEPARTMENT_DELETED_SUCCESSFULLY: 'Department deleted successfully',
  DEPARTMENT_ALREADY_DELETED: 'Department is already deleted',
  DEPARTMENT_HAS_EMPLOYEES:
    'Department cannot be deleted while employees are assigned',
} as const;
