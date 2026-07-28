import { defineConfig } from "drizzle-kit";

import { DEFAULT_DATABASE_URL } from "@/lib/db/constants";

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./lib/db/schema/",
});
