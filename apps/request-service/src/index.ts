import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.status(200).json({ status: "OK!", message: "Request service is up and running!" });
});

app.listen(3001, () => {
  console.log("Request service is running on http://localhost:3001/");
});
