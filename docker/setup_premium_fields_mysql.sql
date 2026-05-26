-- Add Premium fields to an existing Directus/MySQL database.
-- This matches backend/.env when DB_CLIENT=mysql.

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_active boolean NOT NULL DEFAULT false;

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_plan varchar(255) NULL;

ALTER TABLE directus_users
  ADD COLUMN IF NOT EXISTS premium_until datetime NULL;

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
  `group`,
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
ON DUPLICATE KEY UPDATE
  interface = VALUES(interface),
  hidden = false,
  readonly = false,
  width = VALUES(width),
  note = VALUES(note);
