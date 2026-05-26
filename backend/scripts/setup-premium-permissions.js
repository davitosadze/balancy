const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const PREMIUM_FIELDS = ["premium_active", "premium_plan", "premium_until"];

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

function normalizeFields(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
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
  };

  console.log(
    `==> Updating premium permissions in MySQL: ${config.user}@${config.host}:${config.port}/${config.database}`,
  );

  const connection = await mysql.createConnection(config);
  try {
    const [rows] = await connection.execute(
      `SELECT id, action, fields
         FROM directus_permissions
        WHERE collection = 'directus_users'
          AND action IN ('read', 'update')`,
    );

    if (rows.length === 0) {
      console.log("  • No directus_users read/update permission rows found.");
      return;
    }

    for (const row of rows) {
      const fields = normalizeFields(row.fields);
      const next = Array.from(new Set([...fields, ...PREMIUM_FIELDS]));
      await connection.execute(
        "UPDATE directus_permissions SET fields = ? WHERE id = ?",
        [JSON.stringify(next), row.id],
      );
      console.log(`  ✓ ${row.action} permission includes premium fields`);
    }
  } finally {
    await connection.end();
  }

  console.log("");
  console.log("✅ Premium permissions are ready.");
  console.log("   Log out/in or refresh the app if the old token still behaves oddly.");
}

main().catch((error) => {
  console.error("✗ Failed to update premium permissions");
  console.error(error?.message ?? error);
  process.exit(1);
});
