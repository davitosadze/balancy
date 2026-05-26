const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const index = trimmed.indexOf("=");
      if (index === -1) return env;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = value;
      return env;
    }, {});
}

async function ensureColumn(connection, database, column, definition) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'directus_users'
        AND COLUMN_NAME = ?`,
    [database, column],
  );

  if (rows.length > 0) {
    console.log(`  • directus_users.${column} already exists`);
    return;
  }

  await connection.query(`ALTER TABLE directus_users ADD COLUMN ${column} ${definition}`);
  console.log(`  ✓ Created directus_users.${column}`);
}

async function ensureDirectusField(connection, field, iface, note) {
  const [rows] = await connection.execute(
    `SELECT id FROM directus_fields WHERE collection = 'directus_users' AND field = ?`,
    [field],
  );

  if (rows.length > 0) {
    await connection.execute(
      `UPDATE directus_fields
          SET interface = ?,
              hidden = false,
              readonly = false,
              width = 'half',
              note = ?
        WHERE collection = 'directus_users'
          AND field = ?`,
      [iface, note, field],
    );
    console.log(`  • directus_fields.${field} already exists`);
    return;
  }

  await connection.execute(
    `INSERT INTO directus_fields
      (collection, field, special, interface, options, display, display_options,
       readonly, hidden, sort, width, translations, note, conditions, required,
       \`group\`, validation, validation_message)
     VALUES
      ('directus_users', ?, NULL, ?, NULL, NULL, NULL, false, false, NULL,
       'half', NULL, ?, NULL, false, NULL, NULL, NULL)`,
    [field, iface, note],
  );
  console.log(`  ✓ Created directus_fields.${field}`);
}

async function main() {
  const root = path.resolve(__dirname, "../..");
  const env = {
    ...readEnv(path.join(root, "backend/.env")),
    ...process.env,
  };

  const config = {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    database: env.DB_DATABASE || "loans",
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    multipleStatements: false,
  };

  console.log(
    `==> Adding premium fields through MySQL: ${config.user}@${config.host}:${config.port}/${config.database}`,
  );

  const connection = await mysql.createConnection(config);
  try {
    await ensureColumn(connection, config.database, "premium_active", "boolean NOT NULL DEFAULT false");
    await ensureColumn(connection, config.database, "premium_plan", "varchar(255) NULL");
    await ensureColumn(connection, config.database, "premium_until", "datetime NULL");

    await ensureDirectusField(
      connection,
      "premium_active",
      "boolean",
      "Whether Premium features are active for this user.",
    );
    await ensureDirectusField(
      connection,
      "premium_plan",
      "input",
      "Premium billing plan, for example monthly.",
    );
    await ensureDirectusField(
      connection,
      "premium_until",
      "datetime",
      "Optional Premium expiration date/time.",
    );
  } finally {
    await connection.end();
  }

  console.log("");
  console.log("✅ Premium MySQL fields are ready.");
  console.log("   Restart Directus if Admin still does not show them.");
}

main().catch((error) => {
  console.error("✗ Failed to create premium fields");
  console.error(error?.message ?? error);
  process.exit(1);
});
