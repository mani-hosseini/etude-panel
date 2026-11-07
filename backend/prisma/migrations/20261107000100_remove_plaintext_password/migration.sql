-- SECURITY: This migration permanently removes stored plaintext passwords.
-- Before applying to production: take and verify a database backup, deploy compatible
-- backend/frontend code, and test login, user editing, and password reset in staging.
-- Existing Argon2 passwordHash values and user credentials are NOT modified.
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordPlain";
