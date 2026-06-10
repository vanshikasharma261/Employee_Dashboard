/**
 * Employee + administrator seed data.
 *
 * Contains employee records only — no assets, allocations, or requests.
 *
 * Relationship references are expressed by stable business keys, resolved by
 * the seed orchestrator (seed.ts):
 *   - `department`              → Department.name  (→ department_id)
 *   - `reporting_manager_code`  → Employee.employee_code (→ reporting_manager_id)
 *
 * Ordering matters: a manager MUST appear before anyone who reports to them so
 * the self-relation resolves during a dependency-safe, in-order insert.
 *
 * Passwords here are plaintext DEV defaults only. They are bcrypt-hashed in
 * seed.ts before insertion — plain text is never written to the database.
 * Business rules respected: reporting managers are WORKING and no employee
 * reports to themselves.
 */

import { Role, EmployeeStatus } from '../../src/generated/prisma/enums';

export interface EmployeeSeed {
  employee_code: string;
  first_name: string;
  last_name: string;
  official_email: string;
  personal_email: string;
  /** Plaintext dev password; hashed with bcrypt before insertion. */
  password: string;
  role: Role;
  present_address: string;
  permanent_address: string;
  joining_date: string; // ISO date; converted to Date in seed.ts
  status: EmployeeStatus;
  /** Department.name reference (resolved to department_id). */
  department: string;
  /** Employee.employee_code of the reporting manager, if any. */
  reporting_manager_code?: string;
}

const DEFAULT_EMPLOYEE_PASSWORD =
  process.env.SEED_EMPLOYEE_PASSWORD ?? 'password';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password';

export const employeesSeedData: EmployeeSeed[] = [
  // ----- Administrator (pre-seeded) -----
  {
    employee_code: 'EMP001',
    first_name: 'HR',
    last_name: 'Admin',
    official_email: 'hr.admin@company.com',
    personal_email: 'hr.admin@gmail.com',
    password: ADMIN_PASSWORD,
    role: Role.ADMIN,
    present_address: '12 MG Road, Bengaluru, Karnataka 560001',
    permanent_address: '12 MG Road, Bengaluru, Karnataka 560001',
    joining_date: '2021-01-04',
    status: EmployeeStatus.WORKING,
    department: 'Human Resources',
  },

  // ----- Department leads (managers) — inserted before their reports -----
  {
    employee_code: 'EMP002',
    first_name: 'Aarav',
    last_name: 'Sharma',
    official_email: 'aarav.sharma@company.com',
    personal_email: 'aarav.sharma@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '45 Indiranagar, Bengaluru, Karnataka 560038',
    permanent_address: '8 Civil Lines, Jaipur, Rajasthan 302006',
    joining_date: '2021-03-15',
    status: EmployeeStatus.WORKING,
    department: 'Engineering',
  },
  {
    employee_code: 'EMP003',
    first_name: 'Diya',
    last_name: 'Patel',
    official_email: 'diya.patel@company.com',
    personal_email: 'diya.patel@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '23 Koramangala, Bengaluru, Karnataka 560034',
    permanent_address: '101 Satellite Road, Ahmedabad, Gujarat 380015',
    joining_date: '2021-06-01',
    status: EmployeeStatus.WORKING,
    department: 'Product',
  },
  {
    employee_code: 'EMP004',
    first_name: 'Vivaan',
    last_name: 'Mehta',
    official_email: 'vivaan.mehta@company.com',
    personal_email: 'vivaan.mehta@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '7 Bandra West, Mumbai, Maharashtra 400050',
    permanent_address: '7 Bandra West, Mumbai, Maharashtra 400050',
    joining_date: '2021-08-20',
    status: EmployeeStatus.WORKING,
    department: 'Finance',
  },
  {
    employee_code: 'EMP005',
    first_name: 'Kabir',
    last_name: 'Singh',
    official_email: 'kabir.singh@company.com',
    personal_email: 'kabir.singh@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '56 Hauz Khas, New Delhi, Delhi 110016',
    permanent_address: '56 Hauz Khas, New Delhi, Delhi 110016',
    joining_date: '2022-01-10',
    status: EmployeeStatus.WORKING,
    department: 'Marketing',
  },
  {
    employee_code: 'EMP006',
    first_name: 'Myra',
    last_name: 'Joshi',
    official_email: 'myra.joshi@company.com',
    personal_email: 'myra.joshi@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '90 Viman Nagar, Pune, Maharashtra 411014',
    permanent_address: '14 Shivaji Nagar, Nagpur, Maharashtra 440010',
    joining_date: '2022-02-14',
    status: EmployeeStatus.WORKING,
    department: 'Operations',
  },

  // ----- Individual contributors (reports) -----
  {
    employee_code: 'EMP007',
    first_name: 'Ananya',
    last_name: 'Iyer',
    official_email: 'ananya.iyer@company.com',
    personal_email: 'ananya.iyer@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '3 Whitefield, Bengaluru, Karnataka 560066',
    permanent_address: '22 T Nagar, Chennai, Tamil Nadu 600017',
    joining_date: '2022-05-09',
    status: EmployeeStatus.WORKING,
    department: 'Engineering',
    reporting_manager_code: 'EMP002',
  },
  {
    employee_code: 'EMP008',
    first_name: 'Aditya',
    last_name: 'Nair',
    official_email: 'aditya.nair@company.com',
    personal_email: 'aditya.nair@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '18 HSR Layout, Bengaluru, Karnataka 560102',
    permanent_address: '5 Marine Drive, Kochi, Kerala 682031',
    joining_date: '2022-07-25',
    status: EmployeeStatus.WORKING,
    department: 'Engineering',
    reporting_manager_code: 'EMP002',
  },
  {
    employee_code: 'EMP009',
    first_name: 'Ishaan',
    last_name: 'Reddy',
    official_email: 'ishaan.reddy@company.com',
    personal_email: 'ishaan.reddy@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '77 Gachibowli, Hyderabad, Telangana 500032',
    permanent_address: '77 Gachibowli, Hyderabad, Telangana 500032',
    joining_date: '2022-09-12',
    status: EmployeeStatus.WORKING,
    department: 'Product',
    reporting_manager_code: 'EMP003',
  },
  {
    employee_code: 'EMP010',
    first_name: 'Saanvi',
    last_name: 'Gupta',
    official_email: 'saanvi.gupta@company.com',
    personal_email: 'saanvi.gupta@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '34 Salt Lake, Kolkata, West Bengal 700064',
    permanent_address: '34 Salt Lake, Kolkata, West Bengal 700064',
    joining_date: '2023-01-30',
    status: EmployeeStatus.WORKING,
    department: 'Finance',
    reporting_manager_code: 'EMP004',
  },
  {
    employee_code: 'EMP011',
    first_name: 'Reyansh',
    last_name: 'Rao',
    official_email: 'reyansh.rao@company.com',
    personal_email: 'reyansh.rao@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '61 Aundh, Pune, Maharashtra 411007',
    permanent_address: '9 Banjara Hills, Hyderabad, Telangana 500034',
    joining_date: '2023-04-18',
    status: EmployeeStatus.WORKING,
    department: 'Marketing',
    reporting_manager_code: 'EMP005',
  },
  {
    employee_code: 'EMP012',
    first_name: 'Anika',
    last_name: 'Verma',
    official_email: 'anika.verma@company.com',
    personal_email: 'anika.verma@gmail.com',
    password: DEFAULT_EMPLOYEE_PASSWORD,
    role: Role.EMPLOYEE,
    present_address: '28 Gomti Nagar, Lucknow, Uttar Pradesh 226010',
    permanent_address: '28 Gomti Nagar, Lucknow, Uttar Pradesh 226010',
    joining_date: '2023-08-07',
    status: EmployeeStatus.ON_NOTICE,
    department: 'Operations',
    reporting_manager_code: 'EMP006',
  },
];
