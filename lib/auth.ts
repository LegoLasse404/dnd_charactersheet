import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
});
