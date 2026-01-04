// import "dotenv/config"; // MUST be first

import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth/server";
// import { db, project, session, user } from "@repo/db";
import * as dotenv from "dotenv";
import { prisma } from '@repo/db';

const app = express();
const port = 8000;

dotenv.config({
  path: "../../.env", // <-- adjust if needed
});

console.log("Starting backend service...", process.env.DATABASE_URL);

app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    // const result = await db.select().from(user);
    const res = await prisma.user.findMany();
    // const data = await db.select().from(user);
    return res.send({ result: res, data: "data" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// app.get("/healths", async (_req, res) => {
//   const dbName = await db.execute(
//     sql`SELECT current_database()`
//   );
//   res.json({ dbName });
// });

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
