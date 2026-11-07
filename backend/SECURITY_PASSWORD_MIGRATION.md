# Plaintext password removal — staged rollout

This change is intentionally isolated to `security/remove-plaintext-passwords`.

## Preserved behavior
- Existing login identifiers and passwords continue to be checked against `passwordHash` (Argon2).
- Registration still defaults to the national ID when no password is provided (existing academy policy; **known security risk**).
- User records and existing hashes are not reset or rewritten by the migration.

## Changes
- Student/teacher registration and admin user editing/reset no longer persist `passwordPlain`.
- Admin user detail responses no longer expose the saved password.
- Admin password input is empty by default; leaving it blank preserves the current password.
- Explicit password reset returns only `{ reset: true }` and revokes refresh tokens.
- National-ID edits that change the password also revoke refresh tokens.
- Prisma migration drops the `passwordPlain` column, removing existing plaintext values.

## Required before production merge
1. Back up the production PostgreSQL database and **verify a restore** in an isolated environment. Do not put a backup containing plaintext credentials in Git.
2. Run the Prisma migration and application against a staging copy (never expose real user data in staging).
3. Run `npm test -- --runInBand` and `npm run build` in `backend`, plus frontend lint/typecheck/build according to the project scripts.
4. Verify existing student, teacher, and admin logins; registration; editing user details without changing password; explicit reset; national-ID edit; and session revocation.
5. Verify admin screens no longer display saved passwords. Inform administrators of the UI change.
6. Merge/deploy only after tests pass and the backup is confirmed.

## Important
No production database backup, staging migration, or live login test can be performed through this GitHub-only change. Do not interpret a green PR as evidence that those steps were done.
