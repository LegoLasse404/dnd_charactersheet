/**
 * Usage: node scripts/create-user.mjs <email> <password> [name]
 * Example: node scripts/create-user.mjs john@example.com secret123 "John"
 */

import { Pool } from "@neondatabase/serverless";
import { createHash, randomUUID } from "crypto";

const [,, email, password, name = email] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-user.mjs <email> <password> [name]");
  process.exit(1);
}

const DATABASE_URL = "postgresql://neondb_owner:npg_KL1jR3zFwlUQ@ep-muddy-salad-b2ib16i5-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Better Auth uses scrypt for password hashing — use the same approach
// We'll use bcryptjs to hash, since that's what better-auth supports
async function hashPassword(pw) {
  const { hash } = await import("bcryptjs");
  return hash(pw, 10);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const client = await pool.connect();

try {
  // Check if user already exists
  const existing = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.error(`User with email ${email} already exists.`);
    process.exit(1);
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);
  const now = new Date();

  // Insert into user table
  await client.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $4)`,
    [userId, name, email, now]
  );

  // Insert into account table (credential provider)
  await client.query(
    `INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
    [randomUUID(), userId, userId, hashedPassword, now]
  );

  console.log(`Created user: ${email} (id: ${userId})`);
  console.log(`\nTo link existing characters to this user, run:`);
  console.log(`UPDATE characters SET user_id = '${userId}' WHERE user_id = '<old-supabase-uuid>';`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
