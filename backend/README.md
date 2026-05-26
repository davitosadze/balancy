# loans-backend

## Premium fields

The web app reads premium status from the authenticated Directus user.

Add these optional fields to `directus_users`:

- `premium_active` - boolean, default `false`
- `premium_plan` - string, optional
- `premium_until` - datetime, optional

For an existing local Directus database, run:

```bash
chmod +x docker/setup_premium_fields.sh
./docker/setup_premium_fields.sh
```

If Directus is not reachable but Postgres is running through Docker, run the
database fallback instead:

```bash
chmod +x docker/setup_premium_fields_db.sh
./docker/setup_premium_fields_db.sh
```

The main `docker/setup_schema.sh` script also creates these fields for fresh
local installs.

For the current web demo, the Premium page PATCHes
`/premium-status/me`. That endpoint updates the current user with elevated
Directus service permissions, which avoids `Forbidden` errors from `/users/me`
custom-field restrictions.

In production, replace the demo toggle with your payment webhook or an
admin-only flow, and keep users from freely activating premium themselves.
