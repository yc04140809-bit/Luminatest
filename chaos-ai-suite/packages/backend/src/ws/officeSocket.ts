import type { FastifyInstance } from "fastify";
import type { OfficeEvent } from "@chaos-ai-suite/shared";
import { officeStore } from "../store/officeStore.js";

/**
 * オフィス状態のリアルタイム配信。
 * 接続直後にsnapshotを1回送り、以後はOfficeStoreのイベントをそのまま流す。
 * フロントエンドはこれを購読してオフィスビュー・タイムラインビューを更新する。
 */
export async function registerOfficeSocket(app: FastifyInstance): Promise<void> {
  app.get("/ws/office", { websocket: true }, (socket) => {
    const send = (event: OfficeEvent) => socket.send(JSON.stringify(event));

    send({ type: "office_state_snapshot", state: officeStore.getState() });

    const unsubscribe = officeStore.subscribe(send);
    socket.on("close", unsubscribe);
  });
}
