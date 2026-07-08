import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { secretsStore } from "./config/secretsStore.js";
import { agentRoutes } from "./routes/agents.js";
import { taskRoutes } from "./routes/tasks.js";
import { messageRoutes } from "./routes/messages.js";
import { directiveRoutes } from "./routes/directives.js";
import { themeRoutes } from "./routes/theme.js";
import { secretsRoutes } from "./routes/secrets.js";
import { meetingRoutes } from "./routes/meetings.js";
import { registerOfficeSocket } from "./ws/officeSocket.js";
import { officeStore } from "./store/officeStore.js";
import { createAnthropicClient } from "./orchestration/llmClient.js";
import { createAgentRuntime } from "./orchestration/agentRuntime.js";
import { createMeetingRuntime } from "./orchestration/meetingRuntime.js";
import { buildToolRegistry } from "./tools/index.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(websocket);

  const toolRegistry = buildToolRegistry();
  const llm = createAnthropicClient(() => secretsStore.get("ANTHROPIC_API_KEY"));
  const runtime = createAgentRuntime(officeStore, llm, toolRegistry);
  const meetingRuntime = createMeetingRuntime(officeStore, llm);

  app.get("/api/health", async () => ({ status: "ok", service: "chaos-ai-suite-backend" }));

  await app.register(agentRoutes);
  await app.register(taskRoutes(toolRegistry));
  await app.register(messageRoutes);
  await app.register(directiveRoutes(runtime));
  await app.register(themeRoutes);
  await app.register(secretsRoutes);
  await app.register(meetingRoutes(meetingRuntime));
  await app.register(registerOfficeSocket);

  await app.listen({ port: env.port, host: env.host });
}

main().catch((error) => {
  console.error("Failed to start Chaos AI Suite backend:", error);
  process.exit(1);
});
