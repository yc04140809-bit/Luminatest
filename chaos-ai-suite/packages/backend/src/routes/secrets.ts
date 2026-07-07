import type { FastifyInstance } from "fastify";
import { secretsStore } from "../config/secretsStore.js";

/**
 * 外部連携用のAPIキー等をGUIから管理するエンドポイント。
 * 値そのものは絶対にレスポンスへ含めない（configured真偽値のみ）——
 * 一度保存したキーをフロントエンドが読み返す必要はなく、上書き保存のみで運用する。
 */
export async function secretsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/secrets", async () => {
    return secretsStore.listStatus();
  });

  app.put("/api/secrets/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = (request.body as { value?: string }) ?? {};
    if (typeof value !== "string" || !value.trim()) {
      return reply.code(400).send({ error: "value is required" });
    }
    try {
      secretsStore.set(key, value);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
    return { key, configured: true };
  });

  app.delete("/api/secrets/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    try {
      secretsStore.clear(key);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
    return reply.code(204).send();
  });
}
