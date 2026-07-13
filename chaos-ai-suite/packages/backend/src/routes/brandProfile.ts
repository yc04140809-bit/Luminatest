import type { FastifyInstance } from "fastify";
import type { BrandProfileUpdateInput } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

/** ケイオス師匠ブランド設定の取得・更新・初期化を扱うエンドポイント。 */
export async function brandProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/brand-profile", async () => officeStore.getBrandProfile());

  app.patch("/api/brand-profile", async (request) => {
    const patch = (request.body as BrandProfileUpdateInput) ?? {};
    return officeStore.updateBrandProfile(patch);
  });

  app.post("/api/brand-profile/reset", async () => officeStore.resetBrandProfile());
}
