import express from "express";
import prisma from "@workspace/db";

const app = express();

app.get("/", async (req, res) => {
  try {
    const user = await prisma.user.findMany();
    res.status(200).json({ message: "request services.", data: user });
  } catch (error) {
    res.status(500).json({message: "internal server error"})
  }
});

app.listen(8001, () => {
  console.log("app is listening on port 8001");
});
