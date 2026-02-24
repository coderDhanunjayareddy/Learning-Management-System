// backend/update-superadmin.mjs
import dotenv from "dotenv";
import pool from "./config/db.js";
import { hashPassword } from "./utils/hash.js";

dotenv.config();

const parseArgs = (argv) => {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [rawKey, rawValue] = arg.split("=");
    const key = rawKey.replace(/^--/, "");
    if (rawValue !== undefined) {
      out[key] = rawValue;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
};

const envOrArg = (args, argKey, envKey, fallback) =>
  args[argKey] ?? process.env[envKey] ?? fallback;

const required = (value, label) => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required value: ${label}`);
  }
  return value.trim();
};

const upsertUser = async (client, { email, fullName, password, role }) => {
  const passwordHash = await hashPassword(password);
  const sql = `
    INSERT INTO users (email, full_name, password_hash, role, is_active)
    VALUES ($1, $2, $3, $4, TRUE)
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        is_active = TRUE
    RETURNING id, email, role;
  `;
  const result = await client.query(sql, [
    email,
    fullName,
    passwordHash,
    role,
  ]);
  return result.rows[0];
};

const main = async () => {
  const args = parseArgs(process.argv);

  const superEmail = required(
    envOrArg(args, "super-email", "SUPER_ADMIN_EMAIL", "super@lms.com"),
    "super admin email"
  );
  const superPassword = required(
    envOrArg(args, "super-password", "SUPER_ADMIN_PASSWORD"),
    "super admin password"
  );
  const superName = envOrArg(
    args,
    "super-name",
    "SUPER_ADMIN_NAME",
    "Super Admin"
  );

  const authorizerEmail = required(
    envOrArg(args, "authorizer-email", "CONTENT_AUTH_EMAIL"),
    "content authorizer email"
  );
  const authorizerPassword = required(
    envOrArg(args, "authorizer-password", "CONTENT_AUTH_PASSWORD"),
    "content authorizer password"
  );
  const authorizerName = envOrArg(
    args,
    "authorizer-name",
    "CONTENT_AUTH_NAME",
    "Content Authorizer"
  );

  const client = await pool.connect();
  try {
    console.log("Creating/updating users...");
    await client.query("BEGIN");

    const superAdmin = await upsertUser(client, {
      email: superEmail,
      fullName: superName,
      password: superPassword,
      role: "super_admin",
    });

    const contentAuthorizer = await upsertUser(client, {
      email: authorizerEmail,
      fullName: authorizerName,
      password: authorizerPassword,
      role: "content_authorizer",
    });

    await client.query("COMMIT");

    console.log("Done.");
    console.log("Super admin:", superAdmin.email, superAdmin.role);
    console.log(
      "Content authorizer:",
      contentAuthorizer.email,
      contentAuthorizer.role
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exitCode = 1;
});
