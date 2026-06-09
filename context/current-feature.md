## Current Feature

**001 — Prisma ORM Setup & Initial Database Migration**

Configure Prisma 7 ORM in the NestJS backend, establish the PostgreSQL connection, create the initial schema from the project data model, generate the Prisma Client, and apply the first migration. This builds the database foundation that all future modules (auth, employee, department, asset, asset request) depend on.

Spec: [specs/001-prisma-setup.md](../specs/001-prisma-setup.md)

## Status

Completed (2026-06-09)

## Goal

Stand up a stable, reproducible database layer using Prisma 7 and PostgreSQL.

### Prisma configuration
- Install latest Prisma 7 (no deprecated versions / patterns).
- PostgreSQL provider, Prisma Client generation enabled.
- Datasource reads `DATABASE_URL` from env — no hardcoded credentials.
- Use the Prisma 7 PostgreSQL driver adapter configured from `DATABASE_URL`.

### Prisma module (DI)
- `prisma.module.ts` — register and export `PrismaService`; available app-wide.
- `prisma.service.ts` — extend `PrismaClient`, implement `OnModuleInit` (connect on startup) and `OnModuleDestroy` (disconnect on shutdown).
- Single shared `PrismaService` instance; no direct `PrismaClient` instantiation in feature modules. All DB access flows through `PrismaService`.

### Initial schema (source: [context/prisma-schema.md](prisma-schema.md), [context/database-design.md](database-design.md))
Enums: `Role`, `EmployeeStatus`, `AssetCategory`, `AssetStatus`, `RequestType`, `RequestStatus`.

Models (UUID PKs via `@db.Uuid`, snake_case `@@map` table names):
- `Department` (`departments`) — unique `name`; 1→many `Employee`. Soft delete. Indexes: `is_deleted`.
- `Employee` (`employees`) — unique `employee_code`, `official_email`, `personal_email`; `role` default `EMPLOYEE`; `status` default `WORKING`; FK `department_id` → Department; self-relation `reporting_manager_id` (`"ReportingManager"`, optional) with `direct_reports`. Soft delete. Indexes: `department_id`, `status`, `role`, `reporting_manager_id`, `is_deleted`.
- `Asset` (`assets`) — unique `asset_serial_number`; `status` default `AVAILABLE`; optional `allocated_to_id` → Employee with `onDelete: SetNull`. Soft delete. Indexes: `status`, `asset_category`, `allocated_to_id`, `is_deleted`.
- `AssetAllocationHistory` (`asset_allocation_history`) — FKs `asset_id` → Asset, `employee_id` → Employee; `allocated_at`, nullable `returned_at`, nullable `remarks`. **No soft delete** — immutable append-only audit log, never deleted. Indexes: `asset_id`, `employee_id`.
- `AssetRequest` (`asset_requests`) — FK `employee_id` → Employee, optional `asset_id` → Asset; `request_type`, `status` default `PENDING`, `description`, nullable `admin_response`. Soft delete. Indexes: `employee_id`, `status`, `request_type`, `is_deleted`.

**Soft delete convention:** deletable entities carry `is_deleted Boolean @default(false)` + `deleted_at DateTime?` with an `is_deleted` index. No hard deletes — delete operations set `is_deleted = true` and stamp `deleted_at`. All read queries must filter `is_deleted = false` by default.

### Migration
- Generate and apply the initial migration via Prisma migrations only — never `prisma db push`.
- Commit migration files to source control; schema must be reproducible from them.

### Validation (Definition of Done)
- Schema validates; Prisma Client generates; migration generates and applies.
- Verify all tables, enums, indexes, and FK constraints created.
- NestJS app compiles with Prisma integrated; `PrismaService` connects on startup and disconnects gracefully on shutdown.

## Notes

- Use Context7 docs for the latest Prisma 7 adapter configuration and migration workflow.
- Schema blueprint in [context/prisma-schema.md](prisma-schema.md) is the source of truth — do not invent fields.
- **Soft delete confirmed (2026-06-09):** user requires soft delete for every delete. Added `is_deleted` / `deleted_at` to all deletable entities in [prisma-schema.md](prisma-schema.md) (blueprint updated). `AssetAllocationHistory` excluded as an immutable audit log.
- Backend default port 3000, API prefix `/api`.

## History

- 2026-06-09 — Reviewed spec 001 and all referenced context (prisma-schema, database-design, business-rules). Populated current-feature.md with scope, schema summary, and Definition of Done. Status: Not Started, ready to implement.
- 2026-06-09 — User confirmed soft delete required for every delete. Updated prisma-schema.md blueprint: added `is_deleted` + `deleted_at` + `is_deleted` index to Department, Employee, Asset, AssetRequest. AssetAllocationHistory left as immutable audit log.
- 2026-06-09 — **Implemented & verified.** Installed Prisma 7.8.0 with the PostgreSQL driver adapter (`@prisma/adapter-pg`), Query Compiler enabled. Per Prisma 7: `prisma.config.ts` holds the datasource `url` (`env("DATABASE_URL")`, loaded via `dotenv/config`) — the schema datasource no longer accepts `url`; the `prisma-client` generator (`runtime nodejs`, `moduleFormat cjs`) emits the client to `src/generated/prisma` (gitignored + eslint-ignored). Created the full schema (6 enums, 5 models + soft-delete fields, FKs/relations/indexes) per the blueprint. Built `PrismaService` (extends generated `PrismaClient`, builds `PrismaPg` adapter from `ConfigService`, `onModuleInit`→`$connect`, `onModuleDestroy`→`$disconnect`) and `PrismaModule` (providers/exports PrismaService; **imported explicitly by feature modules — not `@Global`**, per user preference). Added `ConfigModule.forRoot({ isGlobal: true, validate })` with class-validator env validation (boots-fail on missing `DATABASE_URL`/`JWT_SECRET`/`JWT_EXPIRES_IN`); `main.ts` sets `/api` prefix + `enableShutdownHooks()`. Initial migration `20260609105719_init` generated via `prisma migrate dev` (no `db push`) and applied. **Verified:** schema validates, client generates, migration applies; DB has 5 domain tables, 6 enums, 27 indexes, 7 FK constraints; `npm run build` compiles; runtime smoke test confirmed "Prisma connected" on startup and "Prisma disconnected" on `app.close()`; lint clean.
