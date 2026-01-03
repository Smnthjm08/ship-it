import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({
  path: "../../.env",
});

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schemas/**/*.ts",
  casing: "snake_case",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
