import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth/server";

const app = express();

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "OK!", message: "Request service is up and running!" });
});

const port = 8000;

// app.all("/api/auth/*", toNodeHandler(auth));
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.listen(port, () => {
    console.log(`Better Auth app listening on port ${port}`);
});

app.listen(port, () => {
  console.log(`backend is running on http://localhost:${port}/`);
});
