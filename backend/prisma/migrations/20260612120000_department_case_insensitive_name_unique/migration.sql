-- Replace the case-sensitive unique constraint on departments.name with a
-- case-insensitive, active-only partial unique index.
--
-- Why:
--   * Case-insensitive — "Human Resources" and "human resources" must not
--     coexist. The previous "departments_name_key" was a plain B-tree on the
--     raw value and only blocked exact-case duplicates, leaving a TOCTOU race
--     where two concurrent creates with differing case both committed.
--   * Active-only (WHERE is_deleted = false) — a name released by a soft-deleted
--     department may be reused, matching the service-level uniqueness check.
DROP INDEX "departments_name_key";

CREATE UNIQUE INDEX "departments_name_lower_active_key"
  ON "departments" (lower("name"))
  WHERE "is_deleted" = false;
