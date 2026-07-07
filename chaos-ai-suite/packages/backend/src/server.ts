import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { agentRoutes } from "./routes/agents.js";
import { taskRoutes } from "./routes/tasks.js";
import { messageRoutes } from "./routes/messages.js";
import { registerOfficeSocket } from "./ws/officeSocket.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(websocket);

  app.get("/api/health", async () => ({ status: "ok", service: "chaos-ai-suite-backend" }));

  await app.register(agentRoutes);
  await app.register(taskRoutes);
  await app.register(messageRoutes);
  await app.register(registerOfficeSocket);

  await app.listen({ port: env.port, host: env.host });
}

main().catch((error) => {
  console.error("Failed to start Chaos AI Suite backend:", error);
  process.exit(1);
});
