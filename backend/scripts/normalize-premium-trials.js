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
    `==> Normalizing active Premium trials in MySQL: ${config.user}@${config.host}:${config.port}/${config.database}`,
  );

  const connection = await mysql.createConnection(config);
  try {
    const [result] = await connection.execute(
      `UPDATE directus_users
          SET premium_plan = COALESCE(premium_plan, 'trial'),
              premium_until = DATE_ADD(NOW(), INTERVAL 7 DAY)
        WHERE premium_active = 1
          AND (premium_until IS NULL OR premium_until <= NOW())`,
    );

    console.log(`  ✓ Updated ${result.affectedRows} user(s)`);
  } finally {
    await connection.end();
  }

  console.log("");
  console.log("✅ Active Premium trials now have a future 7-day expiry.");
}

main().catch((error) => {
  console.error("✗ Failed to normalize Premium trials");
  console.error(error?.message ?? error);
  process.exit(1);
});
