---
name: supabase-sql-control
description: Supabase connection checks, credentials handling, and SQL-side application management. Use when the user asks to verify Supabase URL/key setup, debug Supabase connectivity, update database schema/data with SQL, or manage migration-like SQL changes safely for this project.
---

# Supabase SQL Control

Use this skill to operate Supabase database workflows end-to-end with user-provided project URL and keys.

## Workflow

1. Collect runtime inputs before changing SQL.
   - Ask for `SUPABASE_URL` and the minimum required key (`anon` for read/client checks, `service_role` for privileged SQL operations).
   - Confirm target environment (development, staging, production).
2. Validate connection configuration in project files.
   - Check frontend/client wiring in `frontend/services/supabase.ts` and related env usage.
   - Ensure secrets stay in environment variables and are never hardcoded.
3. Inspect current database state before edits.
   - Identify target tables, relations, constraints, indexes, RLS policies, and functions.
   - Compare requested behavior with existing schema to avoid duplicate or conflicting SQL.
4. Prepare SQL changes as explicit, reviewable scripts.
   - Prefer idempotent SQL where possible (`IF NOT EXISTS`, guarded `ALTER`, safe backfills).
   - Separate schema changes, data migration, and permission/RLS changes.
   - Add rollback notes when rollback is feasible.
5. Apply changes in controlled order.
   - Run schema primitives first (types/tables/columns), then constraints/indexes, then data updates, then policies/grants.
   - Verify each step with read-after-write checks.
6. Validate application impact.
   - Confirm frontend/backend queries still match schema names and types.
   - Re-check role permissions for expected app flows.
7. Report outcome clearly.
   - Provide executed SQL summary, touched objects, verification queries, and follow-up risks.

## Safety Rules

- Never expose full keys in logs or messages; mask secrets except last 4 characters.
- Never run destructive SQL (`DROP`, mass `DELETE`, broad `UPDATE`) without explicit user confirmation.
- Treat production as high risk: require explicit confirmation before applying writes.
- Prefer transactional execution for multi-step changes when supported.

## Project-Specific Notes

- Use existing project documents first when relevant:
  - `SUPABASE_MIGRATION_GUIDE.md`
  - `frontend/scripts/seed_data.sql`
- Keep SQL changes compatible with current app paths in `frontend/` and `backend/`.

## Expected Outputs Per Task

- Connection check result (pass/fail + reason)
- SQL plan (ordered steps)
- SQL script or patch
- Verification query set
- Final status with any residual risks
