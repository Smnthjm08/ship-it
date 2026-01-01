import { WebSocketServer } from "ws";
import { redisSub } from "@workspace/shared/redis/subscriber";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const wss = new WebSocketServer({ port: 8080 });

redisSub.pSubscribe("logs-*", (message, channel) => {
  console.log(`Received message from ${channel}: ${message}`);
});

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
    ws.send(`Echo: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

wss.on("close", () => {
  console.log("WebSocket server closed");
});

wss.on("error", (error) => {
  console.error("WebSocket server error:", error);
});
