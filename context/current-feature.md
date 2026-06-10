## Current Feature

**002 — Initial Database Seed Data**

Create the Prisma seed system that populates the database with realistic development data: departments, employees, one pre-seeded administrator, and company assets. Seed data must respect every schema constraint and relationship. This feature is data-only — it must not add or modify models, change the schema, or implement business logic. No asset allocations and no asset requests are seeded (reserved for future features).

Spec: [specs/002-seed-data.md](../specs/002-seed-data.md)

## Status

Completed (2026-06-10)

## Goal

Stand up a reproducible, dependency-safe seed process that fills the database with realistic, schema-valid development/demo data for local development, testing, and demos — never production.

### Seed wiring (Prisma 7)

- Configure the seed command in [backend/prisma.config.ts](../backend/prisma.config.ts) via `migrations.seed` (Prisma 7 reads seed config from `prisma.config.ts`, **not** the `package.json` `"prisma"` key). Run `prisma/seed.ts` under TypeScript via **`tsx`** (see note below).
- Seed must be runnable via `npx prisma db seed`.
- Reuse the existing `dotenv/config` + `env('DATABASE_URL')` setup — no hardcoded credentials.
- Add `bcrypt` + `@types/bcrypt` as dependencies (not currently installed) for password hashing.
- **Runner correction:** the plan assumed `ts-node`, but the Prisma 7 generated client (`src/generated/prisma`) imports modules with `.js` specifiers (e.g. `./internal/class.js`) that `ts-node` cannot resolve to their `.ts` sources under this `nodenext` tsconfig — confirmed empirically (`MODULE_NOT_FOUND`). `tsx` resolves them natively, so the seed uses `tsx` (added as a devDependency).

### File structure (per spec)

```text
backend/prisma/
├── seed.ts
└── seed-data/
    ├── departments_seed_data.ts
    ├── employees_seed_data.ts
    └── assets_seed_data.ts
```

- `departments_seed_data.ts` — department records only.
- `employees_seed_data.ts` — employee + administrator records only.
- `assets_seed_data.ts` — company asset records only.
- `seed.ts` — loads the data, inserts in dependency-safe order, resolves relationships, orchestrates execution. Instantiate the client via the generated `prisma-client` + `PrismaPg` adapter from `DATABASE_URL` (mirror [backend/src/prisma/prisma.service.ts](../backend/src/prisma/prisma.service.ts)); the client is generated to `src/generated/prisma`.

### Schema compliance (source of truth: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma))

All seed data must satisfy required fields, unique constraints, valid FK references, and exact enum values.

- **Department** (`departments`): unique `name`. Seed: Engineering, Human Resources, Finance, Marketing, Product, Operations.
- **Employee** (`employees`): required `employee_code` (unique), `first_name`, `last_name`, `official_email` (unique), `personal_email` (unique), `password` (hashed), `present_address`, `permanent_address`, `joining_date`, `department_id` (FK). Optional self-relation `reporting_manager_id` (`"ReportingManager"`). Defaults: `role = EMPLOYEE`, `status = WORKING`. Seed multiple employees across departments with realistic names/emails and some reporting-manager links (managers inserted before their reports so the self-FK resolves).
- **Asset** (`assets`): required `asset_serial_number` (unique), `asset_category` (enum). Default `status = AVAILABLE`. Leave `allocated_to_id` null (no allocations this feature). Seed across categories: `LAPTOP`, `MOUSE`, `KEYBOARD`, `HEADSET`, `EARPHONE`, `MOBILE_PHONE`, `SCREEN`, `COOLING_PAD`, `IPAD`. Use realistic statuses (`AVAILABLE` / `MAINTENANCE`) — but no `ALLOCATED` since nothing is allocated.

**Valid enum reference:** `Role` {ADMIN, EMPLOYEE} · `EmployeeStatus` {WORKING, ON_NOTICE, RESIGNED, TERMINATED} · `AssetCategory` {LAPTOP, MOUSE, KEYBOARD, HEADSET, EARPHONE, MOBILE_PHONE, SCREEN, COOLING_PAD, IPAD} · `AssetStatus` {AVAILABLE, ALLOCATED, MAINTENANCE, TRASHED}.

### Administrator account

- `first_name = "HR"`, `last_name = "Admin"`, `role = ADMIN`, password `Admin@123`.
- Password **must** be bcrypt-hashed before insertion — never stored or committed as plain text. Hash during seed execution (e.g. `bcrypt.hash('Admin@123', 10)`).
- Must satisfy all Employee constraints (unique `employee_code`, `official_email`, `personal_email`, a department, addresses, joining date).

### Execution order (dependency-safe)

1. Departments
2. Employees (managers before their direct reports)
3. Assets

Capture created department IDs to assign `department_id` on employees; capture manager IDs to assign `reporting_manager_id`. Make the seed safely re-runnable (e.g. `upsert` on unique keys, or guarded inserts) so it doesn't crash on unique-constraint violations on a second run.

### Out of scope (explicitly excluded)

- No new/modified models, no schema changes, no business logic.
- No asset allocations, no `AssetAllocationHistory` records.
- No asset requests, no request/approval history.

### Validation (Definition of Done)

- Prisma seed configured and runnable via `npx prisma db seed`.
- `seed.ts` + the three `seed-data/` files created.
- Departments, employees, HR Admin (bcrypt-hashed password), and assets seeded.
- All data satisfies schema constraints; all relationships resolve.
- Seed executes successfully end-to-end.
- No allocations and no asset-request records created.
- Seed code committed to source control.
- This file's status + history updated.

## Notes

- Schema is the source of truth — do not invent fields (consistent with [context/prisma-schema.md](prisma-schema.md)).
- Prisma 7 specifics: seed command lives in `prisma.config.ts`; the generated client is at `src/generated/prisma` and requires the `PrismaPg` adapter built from `DATABASE_URL`.
- bcrypt must be added to backend deps before implementation.
- Soft-delete fields (`is_deleted`, `deleted_at`) default correctly — seed rows should be left as active (`is_deleted = false`).
- **Feature 001 context (Prisma setup, completed 2026-06-09):** Use Context7 docs for the latest Prisma 7 adapter configuration and migration workflow. Soft delete confirmed required for every delete; `is_deleted` / `deleted_at` added to all deletable entities, `AssetAllocationHistory` excluded as an immutable audit log. Backend default port 3000, API prefix `/api`.

## History

- 2026-06-09 — Reviewed spec 001 and all referenced context (prisma-schema, database-design, business-rules). Populated current-feature.md with scope, schema summary, and Definition of Done. Status: Not Started, ready to implement.
- 2026-06-09 — User confirmed soft delete required for every delete. Updated prisma-schema.md blueprint: added `is_deleted` + `deleted_at` + `is_deleted` index to Department, Employee, Asset, AssetRequest. AssetAllocationHistory left as immutable audit log.
- 2026-06-09 — **Implemented & verified (001).** Installed Prisma 7.8.0 with the PostgreSQL driver adapter (`@prisma/adapter-pg`), Query Compiler enabled. Per Prisma 7: `prisma.config.ts` holds the datasource `url` (`env("DATABASE_URL")`, loaded via `dotenv/config`) — the schema datasource no longer accepts `url`; the `prisma-client` generator (`runtime nodejs`, `moduleFormat cjs`) emits the client to `src/generated/prisma` (gitignored + eslint-ignored). Created the full schema (6 enums, 5 models + soft-delete fields, FKs/relations/indexes) per the blueprint. Built `PrismaService` (extends generated `PrismaClient`, builds `PrismaPg` adapter from `ConfigService`, `onModuleInit`→`$connect`, `onModuleDestroy`→`$disconnect`) and `PrismaModule` (providers/exports PrismaService; **imported explicitly by feature modules — not `@Global`**, per user preference). Added `ConfigModule.forRoot({ isGlobal: true, validate })` with class-validator env validation (boots-fail on missing `DATABASE_URL`/`JWT_SECRET`/`JWT_EXPIRES_IN`); `main.ts` sets `/api` prefix + `enableShutdownHooks()`. Initial migration `20260609105719_init` generated via `prisma migrate dev` (no `db push`) and applied. **Verified:** schema validates, client generates, migration applies; DB has 5 domain tables, 6 enums, 27 indexes, 7 FK constraints; `npm run build` compiles; runtime smoke test confirmed "Prisma connected" on startup and "Prisma disconnected" on `app.close()`; lint clean.
- 2026-06-10 — **Started feature 002 (seed data).** Reviewed spec 002 and re-read the live schema, database-design, package.json, and prisma.config.ts. Updated current-feature.md to the 002 plan: Prisma 7 seed wiring (config in `prisma.config.ts`, `bcrypt` to be added), the `seed.ts` + `seed-data/` file layout, per-model seed requirements with exact enum values, the HR Admin bcrypt requirement, dependency-safe insert order (Departments → Employees → Assets), and the explicit exclusions (no allocations, no asset requests). Status: Not Started, ready to implement.
- 2026-06-10 — **Implemented & verified (002).** Branched `feature/database-seed-data` off main (after 001 merged). Added deps: `bcrypt` (runtime), `@types/bcrypt` + `tsx` (dev). Configured `migrations.seed = 'tsx prisma/seed.ts'` in `prisma.config.ts`. **Runner change from plan:** `ts-node` fails on the generated client's `.js` import specifiers (`MODULE_NOT_FOUND: ./internal/class.js`) under the `nodenext` tsconfig — verified by probe; switched to `tsx`, which resolves them natively. Created `prisma/seed-data/{departments,employees,assets}_seed_data.ts` (data-only, typed, relationships referenced by business keys — department `name`, manager `employee_code`) and `prisma/seed.ts` (instantiates the generated `PrismaClient` via `PrismaPg` from `DATABASE_URL`/dotenv, mirroring `PrismaService`; hashes passwords with `bcrypt` rounds=10; inserts Departments → Employees → Assets via `upsert` for idempotency). Seeded 6 departments, 12 employees (incl. HR Admin `hr.admin@company.com`, role ADMIN), 19 assets across all 9 categories (statuses AVAILABLE/MAINTENANCE only). **Verified:** `npx prisma db seed` succeeds and is re-runnable (idempotent); admin password is bcrypt-hashed (`bcrypt.compare` true, not plaintext); 6 reporting-manager links resolve correctly (managers inserted before reports); **0 allocations / 0 allocation-history / 0 asset-requests** and 0 allocated assets (out-of-scope exclusions honored); `npm run build` compiles; generated client remains gitignored. Status: Completed.
