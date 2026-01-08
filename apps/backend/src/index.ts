import express from "express";

const app = express();

app.listen(3002, () => {
  console.log("Server is running on http://localhost:3002");
});
