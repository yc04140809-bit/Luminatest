import type { ToolExecutor } from "./types.js";
import { secretsStore } from "../config/secretsStore.js";
import { getGoogleAccessToken } from "./googleAuth.js";

const DRIVE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";
const BOUNDARY = "chaos-ai-suite-drive-upload";

/**
 * ネムリちゃんが報告書・議事録・契約書をGoogleドキュメントとしてDriveへアップロードするツール。
 * サービスアカウントの認可のみで完結させるため、アップロード先フォルダは事前に
 * サービスアカウントのメールアドレスと共有しておく必要がある。
 */
export const googleDriveExportTool: ToolExecutor = {
  definition: {
    id: "google_drive_export",
    name: "Google Driveへ保存",
    description: "報告書・議事録・契約書の本文を、Googleドキュメントとして指定のDriveフォルダへアップロードする。",
    allowedAgentIds: ["agent-nemuri"],
    inputSchema: {
      properties: {
        title: { type: "string", description: "Googleドキュメントのファイル名" },
        content: { type: "string", description: "保存する本文（プレーンテキスト）" },
      },
      required: ["title", "content"],
    },
  },
  async execute({ input }) {
    const folderId = secretsStore.get("GOOGLE_DRIVE_FOLDER_ID");
    const accessToken = await getGoogleAccessToken([DRIVE_UPLOAD_SCOPE]);

    const title = String(input.title ?? "無題のドキュメント");
    const content = String(input.content ?? "");

    const metadata = {
      name: title,
      mimeType: GOOGLE_DOC_MIME_TYPE,
      ...(folderId ? { parents: [folderId] } : {}),
    };

    const multipartBody =
      `--${BOUNDARY}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
      `${content}\r\n` +
      `--${BOUNDARY}--`;

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${BOUNDARY}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      throw new Error(`Google Driveへの保存に失敗しました (${response.status}): ${await response.text()}`);
    }

    const body = (await response.json()) as { id: string };
    const docUrl = `https://docs.google.com/document/d/${body.id}/edit`;
    return { summary: `Google Driveに「${title}」を保存しました。${docUrl}`, data: body };
  },
};
