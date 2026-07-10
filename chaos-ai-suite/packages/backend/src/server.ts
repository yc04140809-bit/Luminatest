import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { env } from "./config/env.js";
import { secretsStore } from "./config/secretsStore.js";
import { agentRoutes } from "./routes/agents.js";
import { taskRoutes } from "./routes/tasks.js";
import { messageRoutes } from "./routes/messages.js";
import { directiveRoutes } from "./routes/directives.js";
import { themeRoutes } from "./routes/theme.js";
import { secretsRoutes } from "./routes/secrets.js";
import { meetingRoutes } from "./routes/meetings.js";
import { briefingRoutes } from "./routes/briefing.js";
import { banterRoutes } from "./routes/banter.js";
import { snsRoutes } from "./routes/sns.js";
import { noteRoutes } from "./routes/note.js";
import { caseRoutes } from "./routes/cases.js";
import { registerOfficeSocket } from "./ws/officeSocket.js";
import { officeStore } from "./store/officeStore.js";
import { createAnthropicClient } from "./orchestration/llmClient.js";
import { createAgentRuntime } from "./orchestration/agentRuntime.js";
import { createMeetingRuntime } from "./orchestration/meetingRuntime.js";
import { createMorningBriefingRuntime } from "./orchestration/morningBriefing.js";
import { createOfficeBanterRuntime } from "./orchestration/officeBanter.js";
import { buildToolRegistry } from "./tools/index.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.corsOrigin });
  await app.register(websocket);

  const toolRegistry = buildToolRegistry();
  const llm = createAnthropicClient(() => secretsStore.get("ANTHROPIC_API_KEY"));
  const runtime = createAgentRuntime(officeStore, llm, toolRegistry);
  const meetingRuntime = createMeetingRuntime(officeStore, llm);
  const briefingRuntime = createMorningBriefingRuntime(officeStore, llm);
  const banterRuntime = createOfficeBanterRuntime(officeStore, llm);

  app.get("/api/health", async () => ({ status: "ok", service: "chaos-ai-suite-backend" }));

  await app.register(agentRoutes);
  await app.register(taskRoutes(toolRegistry));
  await app.register(messageRoutes);
  await app.register(directiveRoutes(runtime));
  await app.register(themeRoutes);
  await app.register(secretsRoutes);
  await app.register(meetingRoutes(meetingRuntime));
  await app.register(briefingRoutes(briefingRuntime));
  await app.register(banterRoutes(banterRuntime));
  await app.register(snsRoutes(llm));
  await app.register(noteRoutes(llm));
  await app.register(caseRoutes(llm));
  await app.register(registerOfficeSocket);

  // 本番デプロイ用: フロントエンドのビルド成果物を同じサーバー・同一originから配信する
  // （開発時はVite devサーバーが別途/api・/wsをこのバックエンドへプロキシするため未使用）。
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(currentDir, "../../frontend/dist");
  if (existsSync(frontendDist)) {
    await app.register(fastifyStatic, { root: frontendDist });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.method !== "GET" || request.url.startsWith("/api") || request.url.startsWith("/ws")) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.sendFile("index.html");
    });
  } else {
    app.log.warn(`frontend build not found at ${frontendDist}; static serving disabled (dev mode?)`);
  }

  await app.listen({ port: env.port, host: env.host });
}

main().catch((error) => {
  console.error("Failed to start Chaos AI Suite backend:", error);
  process.exit(1);
});
