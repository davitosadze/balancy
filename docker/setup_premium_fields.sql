-- Add Premium fields to an existing Directus/Postgres database.
-- This is a fallback for cases where the Directus /fields API is not reachable.
--
-- Run inside the Postgres container/database, for example:
--   docker exec -i loans_postgres psql -U directus -d loans < docker/setup_premium_fields.sql

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_active boolean NOT NULL DEFAULT false;

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_plan varchar(255);

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

INSERT INTO directus_fields (
  collection,
  field,
  special,
  interface,
  options,
  display,
  display_options,
  readonly,
  hidden,
  sort,
  width,
  translations,
  note,
  conditions,
  required,
  "group",
  validation,
  validation_message
)
VALUES
  (
    'directus_users',
    'premium_active',
    NULL,
    'boolean',
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    'half',
    NULL,
    'Whether Premium features are active for this user.',
    NULL,
    false,
    NULL,
    NULL,
    NULL
  ),
  (
    'directus_users',
    'premium_plan',
    NULL,
    'input',
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    'half',
    NULL,
    'Premium billing plan, for example monthly.',
    NULL,
    false,
    NULL,
    NULL,
    NULL
  ),
  (
    'directus_users',
    'premium_until',
    NULL,
    'datetime',
    NULL,
    NULL,
    NULL,
    false,
    false,
    NULL,
    'half',
    NULL,
    'Optional Premium expiration date/time.',
    NULL,
    false,
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (collection, field) DO UPDATE SET
  interface = EXCLUDED.interface,
  hidden = false,
  readonly = false,
  width = EXCLUDED.width,
  note = EXCLUDED.note;
