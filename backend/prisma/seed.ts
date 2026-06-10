/**
 * Database seed entry point.
 *
 * Populates the database with realistic development/demo data:
 *   1. Departments
 *   2. Employees (+ pre-seeded HR Admin) — managers before their reports
 *   3. Assets
 *
 * Responsibilities live here only: loading the seed data, hashing passwords,
 * resolving relationships, and inserting records in a dependency-safe order.
 * The data itself lives in `seed-data/`.
 *
 * Re-runnable: every insert is an `upsert` keyed on the model's unique business
 * key, so running the seed repeatedly does not violate unique constraints.
 *
 * NOT seeded (reserved for future features): asset allocations, allocation
 * history, and asset requests.
 *
 * Run with: `npx prisma db seed`
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { departmentsSeedData } from './seed-data/departments_seed_data';
import { employeesSeedData } from './seed-data/employees_seed_data';
import { assetsSeedData } from './seed-data/assets_seed_data';

const BCRYPT_SALT_ROUNDS = 10;

// Mirror PrismaService: build the Prisma 7 PostgreSQL driver adapter from
// DATABASE_URL (loaded above via dotenv) — no connection string is hardcoded.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — cannot run the database seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedDepartments(): Promise<Map<string, string>> {
  const departmentIdByName = new Map<string, string>();

  for (const department of departmentsSeedData) {
    const record = await prisma.department.upsert({
      where: { name: department.name },
      update: {},
      create: { name: department.name },
    });
    departmentIdByName.set(department.name, record.id);
  }

  console.log(`Seeded ${departmentIdByName.size} departments.`);
  return departmentIdByName;
}

async function seedEmployees(
  departmentIdByName: Map<string, string>,
): Promise<void> {
  // employee_code → database id, built as we insert so a report can resolve
  // its (already-inserted) manager's id.
  const employeeIdByCode = new Map<string, string>();
  let count = 0;

  for (const employee of employeesSeedData) {
    const departmentId = departmentIdByName.get(employee.department);
    if (!departmentId) {
      throw new Error(
        `Employee ${employee.employee_code} references unknown department "${employee.department}".`,
      );
    }

    let reportingManagerId: string | undefined;
    if (employee.reporting_manager_code) {
      reportingManagerId = employeeIdByCode.get(employee.reporting_manager_code);
      if (!reportingManagerId) {
        throw new Error(
          `Employee ${employee.employee_code} references manager ` +
            `"${employee.reporting_manager_code}" that has not been seeded yet. ` +
            `Ensure managers are ordered before their reports.`,
        );
      }
    }

    const passwordHash = await bcrypt.hash(employee.password, BCRYPT_SALT_ROUNDS);

    const record = await prisma.employee.upsert({
      where: { employee_code: employee.employee_code },
      update: {
        first_name: employee.first_name,
        last_name: employee.last_name,
        official_email: employee.official_email,
        personal_email: employee.personal_email,
        password: passwordHash,
        role: employee.role,
        present_address: employee.present_address,
        permanent_address: employee.permanent_address,
        joining_date: new Date(employee.joining_date),
        status: employee.status,
        department_id: departmentId,
        reporting_manager_id: reportingManagerId ?? null,
      },
      create: {
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        official_email: employee.official_email,
        personal_email: employee.personal_email,
        password: passwordHash,
        role: employee.role,
        present_address: employee.present_address,
        permanent_address: employee.permanent_address,
        joining_date: new Date(employee.joining_date),
        status: employee.status,
        department_id: departmentId,
        reporting_manager_id: reportingManagerId ?? null,
      },
    });

    employeeIdByCode.set(employee.employee_code, record.id);
    count += 1;
  }

  console.log(`Seeded ${count} employees (including the HR Admin).`);
}

async function seedAssets(): Promise<void> {
  let count = 0;

  for (const asset of assetsSeedData) {
    await prisma.asset.upsert({
      where: { asset_serial_number: asset.asset_serial_number },
      update: {
        asset_category: asset.asset_category,
        status: asset.status,
      },
      create: {
        asset_serial_number: asset.asset_serial_number,
        asset_category: asset.asset_category,
        status: asset.status,
      },
    });
    count += 1;
  }

  console.log(`Seeded ${count} assets.`);
}

async function main(): Promise<void> {
  console.log('Starting database seed...');

  // Dependency-safe order: departments → employees → assets.
  const departmentIdByName = await seedDepartments();
  await seedEmployees(departmentIdByName);
  await seedAssets();

  console.log('Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Database seed failed:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
