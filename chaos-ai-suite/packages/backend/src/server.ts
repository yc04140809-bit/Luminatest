import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { agentRoutes } from "./routes/agents.js";
import { taskRoutes } from "./routes/tasks.js";
import { messageRoutes } from "./routes/messages.js";
import { directiveRoutes } from "./routes/directives.js";
import { registerOfficeSocket } from "./ws/officeSocket.js";
import { officeStore } from "./store/officeStore.js";
import { createAnthropicClient } from "./orchestration/llmClient.js";
import { createAgentRuntime } from "./orchestration/agentRuntime.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(websocket);

  const llm = createAnthropicClient(env.anthropicApiKey);
  const runtime = createAgentRuntime(officeStore, llm);

  app.get("/api/health", async () => ({ status: "ok", service: "chaos-ai-suite-backend" }));

  await app.register(agentRoutes);
  await app.register(taskRoutes);
  await app.register(messageRoutes);
  await app.register(directiveRoutes(runtime));
  await app.register(registerOfficeSocket);

  await app.listen({ port: env.port, host: env.host });
}

main().catch((error) => {
  console.error("Failed to start Chaos AI Suite backend:", error);
  process.exit(1);
});
