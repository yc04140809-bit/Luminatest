import type { FastifyInstance } from "fastify";
import type { ThemeUpdateInput } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

/** 管理画面の配色設定（プリセット切り替え・個別カラー上書き）を扱うエンドポイント。 */
export async function themeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/theme", async () => officeStore.getTheme());

  app.patch("/api/theme", async (request) => {
    const patch = (request.body as ThemeUpdateInput) ?? {};
    return officeStore.updateTheme(patch);
  });
}
