import { drizzle } from "drizzle-orm/postgres-js";
import * as dotenv from "dotenv";
import * as schema from "./schemas/auth-schema";
import postgres from "postgres";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
