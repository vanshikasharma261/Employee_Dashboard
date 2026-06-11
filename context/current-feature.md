## Current Feature

**004 — AuthService Session Validation Utility**

Add a small, reusable service-level session-validation helper (`AuthService.isUserActive`) for future modules to call before running protected business logic. It reads the latest `Employee.is_active` straight from the database — an extra safeguard layered on top of the JWT strategy, not a replacement — so a session revoked after token issue is caught immediately. Backend-only; no schema, route, or auth-flow changes.

Spec: [specs/004-auth-validity.md](../specs/004-auth-validity.md)

## Status

Completed — implemented, built, and linted. Module-level integration is deferred: no Employee/Department/Asset modules exist yet to consume it.

## Goal

Provide one centralized `isUserActive(user)` check, reusable across Employee, Department, Asset, Allocation, and Request modules, that always validates the current `Employee.is_active` value from the database (never the JWT payload), returning only a boolean.

---

## Implementation

### Express User type augmentation

`backend/src/types/express.d.ts` (new) — declaration merging onto Express's `User`:

```ts
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}

export {};
```

- Reuses the existing `AuthenticatedUser` interface (`id`, `email`, `role`) — it is not redefined.
- `tsconfig.json` has no `include`, so all of `src/**` (including `.d.ts`) is already compiled and the declaration merge is auto-discovered. No tsconfig change needed.
- ESLint's `@typescript-eslint/no-empty-object-type` is disabled on that one line — the empty body is the intended merge pattern, not a mistake.

### Helper method

`backend/src/auth/auth.service.ts`:

```ts
async isUserActive(user: Express.User): Promise<boolean> {
  const employee = await this.prisma.employee.findUnique({
    where: { id: user.id },
    select: { is_active: true },
  });

  return employee?.is_active ?? false;
}
```

- Read-only: no writes, no token generation, no session mutation.
- Always reads the live DB value rather than the JWT payload (source of truth = `Employee.is_active`).

### Module export

`AuthModule` now `exports: [AuthService]` so future Employee/Department/Asset/Allocation/Request modules can inject it (they must also import `AuthModule`).

### Messages constant

`backend/src/constant/messages.constant.ts` (new):

```ts
export const AuthMessages = {
  UNAUTHORIZED_EXCEPTION: 'User session is inactive',
} as const;
```

**Deviation from spec:** placed in `src/constant/` (singular) to match the existing `src/constant/values.constant.ts`, not the spec's plural `src/constants/`.

Intended call-site usage in future modules:

```ts
const status = await this.authService.isUserActive(user);
if (!status) {
  throw new UnauthorizedException(AuthMessages.UNAUTHORIZED_EXCEPTION);
}
```

---

## Definition of Done (from spec)

- [x] Existing `AuthenticatedUser` interface reused.
- [x] Express `User` declaration merging implemented.
- [x] `src/types/express.d.ts` created.
- [x] `isUserActive()` added to `AuthService`.
- [x] Method accepts `Express.User`.
- [x] Method validates `Employee.is_active` using `user.id`.
- [x] Method returns `Promise<boolean>`.
- [x] No database updates performed.
- [x] `AuthMessages.UNAUTHORIZED_EXCEPTION` added.
- [ ] Utility successfully used by Employee module services — **deferred** (no Employee module exists yet; utility is exported and ready).
- [x] Build passes.
- [x] Lint passes.

---

## Notes / decisions

- Schema is the source of truth — no fields invented; the helper only reads the existing `Employee.is_active`.
- Messages constant kept under the existing singular `src/constant/` directory (spec said plural `src/constants/`).
- `AuthService` is now exported from `AuthModule`; consuming modules import `AuthModule` to receive it.
- This is layered on top of `JwtStrategy` (which already rejects inactive sessions at the guard level) — a deliberate service-level safeguard that re-reads the DB, useful for long-lived requests where the session may be revoked mid-flight.

## History

2026-06-09 — Reviewed spec 001 and all referenced context (prisma-schema, database-design, business-rules). Populated current-feature.md with scope, schema summary, and Definition of Done. Status: Not Started, ready to implement.
2026-06-09 — User confirmed soft delete required for every delete. Updated prisma-schema.md blueprint: added is_deleted + deleted_at + is_deleted index to Department, Employee, Asset, AssetRequest. AssetAllocationHistory left as immutable audit log.
2026-06-09 — Implemented & verified (001). Installed Prisma 7.8.0 with the PostgreSQL driver adapter (@prisma/adapter-pg), Query Compiler enabled. Per Prisma 7: prisma.config.ts holds the datasource url (env("DATABASE_URL"), loaded via dotenv/config) — the schema datasource no longer accepts url; the prisma-client generator (runtime nodejs, moduleFormat cjs) emits the client to src/generated/prisma (gitignored + eslint-ignored). Created the full schema (6 enums, 5 models + soft-delete fields, FKs/relations/indexes) per the blueprint. Built PrismaService (extends generated PrismaClient, builds PrismaPg adapter from ConfigService, onModuleInit→$connect, onModuleDestroy→$disconnect) and PrismaModule (providers/exports PrismaService; imported explicitly by feature modules — not @Global, per user preference). Added ConfigModule.forRoot({ isGlobal: true, validate }) with class-validator env validation (boots-fail on missing DATABASE_URL/JWT_SECRET/JWT_EXPIRES_IN); main.ts sets /api prefix + enableShutdownHooks(). Initial migration 20260609105719_init generated via prisma migrate dev (no db push) and applied. Verified: schema validates, client generates, migration applies; DB has 5 domain tables, 6 enums, 27 indexes, 7 FK constraints; npm run build compiles; runtime smoke test confirmed "Prisma connected" on startup and "Prisma disconnected" on app.close(); lint clean.
2026-06-10 — Started feature 002 (seed data). Reviewed spec 002 and re-read the live schema, database-design, package.json, and prisma.config.ts. Updated current-feature.md to the 002 plan: Prisma 7 seed wiring (config in prisma.config.ts, bcrypt to be added), the seed.ts + seed-data/ file layout, per-model seed requirements with exact enum values, the HR Admin bcrypt requirement, dependency-safe insert order (Departments → Employees → Assets), and the explicit exclusions (no allocations, no asset requests). Status: Not Started, ready to implement.
2026-06-10 — Implemented & verified (002). Branched feature/database-seed-data off main (after 001 merged). Added deps: bcrypt (runtime), @types/bcrypt + tsx (dev). Configured migrations.seed = 'tsx prisma/seed.ts' in prisma.config.ts. Runner change from plan: ts-node fails on the generated client's .js import specifiers (MODULE_NOT_FOUND: ./internal/class.js) under the nodenext tsconfig — verified by probe; switched to tsx, which resolves them natively. Created prisma/seed-data/{departments,employees,assets}\_seed_data.ts (data-only, typed, relationships referenced by business keys — department name, manager employee_code) and prisma/seed.ts (instantiates the generated PrismaClient via PrismaPg from DATABASE_URL/dotenv, mirroring PrismaService; hashes passwords with bcrypt rounds=10; inserts Departments → Employees → Assets via upsert for idempotency). Seeded 6 departments, 12 employees (incl. HR Admin hr.admin@company.com, role ADMIN), 19 assets across all 9 categories (statuses AVAILABLE/MAINTENANCE only). Verified: npx prisma db seed succeeds and is re-runnable (idempotent); admin password is bcrypt-hashed (bcrypt.compare true, not plaintext); 6 reporting-manager links resolve correctly (managers inserted before reports); 0 allocations / 0 allocation-history / 0 asset-requests and 0 allocated assets (out-of-scope exclusions honored); npm run build compiles; generated client remains gitignored. Status: Completed.

- 2026-06-11 — **Started feature 003 (authentication & authorization).** Read spec 003 and all referenced context (project-overview, prisma-schema, database-design, business-rules, api-contracts, development-rules) plus the live backend (schema, env.validation, main.ts, app.module, prisma.service, package.json). Rewrote current-feature.md with the 003 plan: required new deps (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` + types), the schema additions (`is_active`, `refresh_token_hash`) + migration `add_authentication_session_fields`, the full `src/auth` module layout, login/refresh/logout flows, JWT strategy + guards + RBAC, cookie/validation-pipe wiring in main.ts, and the Definition of Done. **Flagged two spec discrepancies:** (1) JWT refresh env vars are NOT actually configured in `env.validation.ts` (must be added)

- 2026-06-11 — **Implemented & verified (003).** Branched `feature/authentication` off main. Added deps `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `cookie-parser` (+ `@types/passport-jwt`, `@types/cookie-parser`). Added `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` (required) to `env.validation.ts` (they were already present in `.env`). Added `is_active Boolean @default(false)` + `refresh_token_hash String?` to the Employee model; generated & applied migration `20260611062935_add_authentication_session_fields` (additive `ALTER TABLE` only — existing seed data preserved: 12 employees / 6 departments / 19 assets intact); regenerated the client. Built the full `src/auth` module: thin controller (`POST /auth/login|refresh|logout`, `@HttpCode(200)`, `@Res({ passthrough:true })`), service with all logic, `LoginDto` (email `@Transform` trim+lowercase, password `@IsString/@IsNotEmpty`), `JwtStrategy` (cookie extractor, reloads employee, rejects missing/soft-deleted/inactive), `JwtAuthGuard`, `RolesGuard` + `@Roles` decorator (Reflector-based RBAC), interfaces. Wired `main.ts`: `cookieParser()` + global `ValidationPipe({ whitelist, transform })` with field-keyed `exceptionFactory`. Registered `AuthModule` in `app.module.ts` (imports PrismaModule explicitly, JwtModule.registerAsync via ConfigService — per-token secret/expiry passed explicitly when signing/verifying). Tokens delivered as httpOnly cookies (`secure` in prod, `sameSite: 'lax'`, maxAge mirrors TTL). **Two implementation decisions worth noting:** (a) `JwtSignOptions.expiresIn` requires the `ms` `StringValue` union, so the validated env string is cast to `JwtSignOptions['expiresIn']`; (b) **refresh-token rotation bug found during manual testing & fixed** — bcrypt only hashes the first 72 bytes, and two of the same employee's 249-byte refresh JWTs share their first 72 bytes (header + leading `sub`), so `bcrypt(rawToken)` could not distinguish them and the old token still validated after rotation. Fix (user-approved): SHA-256 the token to a 64-hex digest before `bcrypt.hash`/`bcrypt.compare` (still bcrypt + bcrypt.compare per spec). **Verified end-to-end against a running server:** valid login → 200 + both cookies + `is_active=true` + bcrypt hash stored; invalid email/password → 401 (generic, no leak); bad email format → 400 field-keyed (`{"email":...,"password":...}`); forged access token → 401; refresh rotation works and **invalidates the old token** (old → 401, current → 200); logout → 200 + `is_active=false` + `refresh_token_hash=null`; refresh after logout (inactive) → 401. `npm run build` and `npm run lint` both pass. **Tooling note:** Windows Defender false-positive-quarantined `node_modules/prisma/build/index.js` (`Trojan:JS/ShaiWorm.DBA!MTB`, ML heuristic) on install, blocking all Prisma CLI commands; confirmed false positive (only that one bundled file ever flagged, across every copy) — resolved via a scoped Defender folder exclusion + restore, then reinstalled. Status: Completed.

- 2026-06-11 — **Implemented & verified (004 — AuthService session-validation utility).** Read spec `specs/004-auth-validity.md`. Added a small, forward-looking helper for future modules. Changes: (1) created `backend/src/types/express.d.ts` — declaration merging `interface User extends AuthenticatedUser` under `namespace Express` (reuses the existing `AuthenticatedUser` interface; not redefined), so `request.user` / `Express.User` carries `id`/`email`/`role`. `tsconfig.json` has no `include`, so `src/**` (incl. `.d.ts`) is already compiled and the merge auto-discovers; disabled ESLint `@typescript-eslint/no-empty-object-type` on that one line since the empty body is the intended merge pattern. (2) Added `AuthService.isUserActive(user: Express.User): Promise<boolean>` — `findUnique` on `user.id` with `select: { is_active: true }`, returns `employee?.is_active ?? false`; read-only (no writes, no token generation, no session mutation), always reads the live DB value rather than the JWT payload. (3) `AuthModule` now `exports: [AuthService]` so future Employee/Department/Asset/Allocation/Request modules can inject it (they must also import `AuthModule`). (4) Added `AuthMessages.UNAUTHORIZED_EXCEPTION = 'User session is inactive'`. **Deviation from spec:** placed the messages constant at `backend/src/constant/messages.constant.ts` (singular `constant/`) to match the existing `src/constant/values.constant.ts`, not the spec's plural `src/constants/`. **Integration deferred:** the DoD item "used by Employee module services" cannot be completed yet — no Employee/Department/Asset modules exist; the utility is ready and exported for them to consume. `npm run build` and `npm run lint` both pass. Status: Completed.
