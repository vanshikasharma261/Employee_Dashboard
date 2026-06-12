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

// Safety guard: this seed inserts dev/demo data (incl. accounts with public
// default passwords). Refuse to run it against a production database.
if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'Refusing to run the database seed with NODE_ENV=production. ' +
      'Seed data is for local development and demos only.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedDepartments(): Promise<Map<string, string>> {
  const departmentIdByName = new Map<string, string>();

  for (const department of departmentsSeedData) {
    // `name` is no longer a Prisma-unique field (uniqueness is a partial,
    // case-insensitive expression index), so upsert-by-name is unavailable.
    // Find an existing active match first, then create — keeps the seed
    // idempotent without depending on a schema-level unique constraint.
    const existing = await prisma.department.findFirst({
      where: {
        name: { equals: department.name, mode: 'insensitive' },
        is_deleted: false,
      },
      select: { id: true },
    });
    const record =
      existing ??
      (await prisma.department.create({
        data: { name: department.name },
        select: { id: true },
      }));
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

    // Mutable profile fields, shared by create + update (single source of truth,
    // so adding a field can't silently diverge between the two branches).
    // Deliberately EXCLUDED from `update`:
    //   - employee_code: immutable business key (the upsert `where`).
    //   - official_email / personal_email: unique natural keys — overwriting them
    //     on a re-run risks a P2002 clash with another existing row.
    //   - password: never re-hashed on a re-run — avoids silently rotating
    //     credentials and pointless updated_at churn (bcrypt salts every call).
    const profileData = {
      first_name: employee.first_name,
      last_name: employee.last_name,
      role: employee.role,
      present_address: employee.present_address,
      permanent_address: employee.permanent_address,
      joining_date: new Date(employee.joining_date),
      status: employee.status,
      department_id: departmentId,
      reporting_manager_id: reportingManagerId ?? null,
    };

    const record = await prisma.employee.upsert({
      where: { employee_code: employee.employee_code },
      update: profileData,
      create: {
        employee_code: employee.employee_code,
        official_email: employee.official_email,
        personal_email: employee.personal_email,
        // Hashed and stored only on first insert; left untouched on re-runs.
        password: await bcrypt.hash(employee.password, BCRYPT_SALT_ROUNDS),
        ...profileData,
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
