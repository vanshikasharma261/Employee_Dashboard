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

/** Asset-management messages (feature 007). */
export const AssetMessages = {
  ASSET_NOT_FOUND: 'Asset not found',
  ASSET_ALREADY_EXISTS: 'Asset already exists',
  ASSET_CREATED_SUCCESSFULLY: 'Asset created successfully',
  ASSET_UPDATED_SUCCESSFULLY: 'Asset updated successfully',
  ASSET_STATUS_UPDATED_SUCCESSFULLY: 'Asset status updated successfully',
  ASSET_DELETED_SUCCESSFULLY: 'Asset deleted successfully',
  ASSET_ALREADY_DELETED: 'Asset is already deleted',
  ASSET_CANNOT_BE_DELETED: 'Allocated asset cannot be deleted',
  INVALID_ASSET_STATUS: 'Invalid asset status transition',
} as const;

/** Asset-request workflow messages (feature 008). */
export const AssetRequestMessages = {
  REQUEST_NOT_FOUND: 'Asset request not found',
  ASSET_NOT_FOUND: 'Asset not found',
  REQUEST_CREATED_SUCCESSFULLY: 'Asset request created successfully',
  REQUEST_APPROVED_SUCCESSFULLY: 'Asset request approved successfully',
  REQUEST_REJECTED_SUCCESSFULLY: 'Asset request rejected successfully',
  REQUEST_ALREADY_PROCESSED: 'Request has already been processed',
  ASSET_NOT_AVAILABLE: 'Asset is not available for allocation',
  INVALID_ASSET_OWNER: 'Asset is not allocated to the employee',
  EMPLOYEE_NOT_ALLOCATABLE:
    'Asset cannot be allocated to a non-working employee',
} as const;

/** Asset allocation-history (audit log) messages (feature 009). */
export const AssetHistoryMessages = {
  HISTORY_NOT_FOUND: 'Asset history not found',
  ASSET_NOT_FOUND: 'Asset not found',
  EMPLOYEE_NOT_FOUND: 'Employee not found',
} as const;
