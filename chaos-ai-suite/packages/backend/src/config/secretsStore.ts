import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
/** src/config または dist/config のどちらから実行されても packages/backend/.env を指す。 */
const ENV_FILE_PATH = path.resolve(currentDir, "../../.env");

export interface SecretMeta {
  key: string;
  label: string;
  group: string;
  /** キーを設定しても既知の理由で機能が使えない場合の注記（GUIに警告として表示）。 */
  knownLimitation?: string;
}

/**
 * GUIの「外部連携」タブで入力できる秘匿値の一覧。
 * 実際の値はここではなく.env（packages/backend/.env、.gitignore対象）にのみ保存される。
 */
export const SECRET_DEFINITIONS: SecretMeta[] = [
  { key: "ANTHROPIC_API_KEY", label: "Anthropic APIキー", group: "LLM" },
  { key: "NOTION_API_KEY", label: "Notion Integration Token", group: "Notion" },
  { key: "NOTION_DATABASE_ID", label: "Notion データベースID", group: "Notion" },
  { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", label: "サービスアカウント メールアドレス", group: "Google" },
  { key: "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", label: "サービスアカウント 秘密鍵（PEM形式）", group: "Google" },
  { key: "GOOGLE_CALENDAR_ID", label: "GoogleカレンダーID", group: "Google" },
  {
    key: "GOOGLE_DRIVE_FOLDER_ID",
    label: "Google Drive 保存先フォルダID",
    group: "Google",
    knownLimitation:
      "既知の制約: 個人のGmailアカウント（Google Workspace非契約）では、サービスアカウント自体のDrive容量が0GBのため" +
      " storageQuotaExceeded エラーで保存できません。共有ドライブ（Workspace機能）対応の実装が必要です。",
  },
  { key: "SLACK_WEBHOOK_URL", label: "Slack Incoming Webhook URL", group: "Slack" },
  { key: "TWITTER_API_KEY", label: "X (Twitter) API Key", group: "X (Twitter)" },
  { key: "TWITTER_API_SECRET", label: "X (Twitter) API Secret", group: "X (Twitter)" },
  { key: "TWITTER_ACCESS_TOKEN", label: "X (Twitter) Access Token", group: "X (Twitter)" },
  { key: "TWITTER_ACCESS_TOKEN_SECRET", label: "X (Twitter) Access Token Secret", group: "X (Twitter)" },
  { key: "INSTAGRAM_ACCESS_TOKEN", label: "Instagram アクセストークン", group: "Instagram" },
  { key: "INSTAGRAM_BUSINESS_ACCOUNT_ID", label: "Instagram ビジネスアカウントID", group: "Instagram" },
];

const KNOWN_KEYS = new Set(SECRET_DEFINITIONS.map((definition) => definition.key));

/** .envの値は改行を含みうる（GoogleのPEM秘密鍵など）ため \n をエスケープして1行に保つ。 */
function encodeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

function decodeValue(raw: string): string {
  return raw.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
}

/**
 * APIキー等の秘匿値を管理するストア。GUIからの更新はプロセスのメモリと
 * .env ファイルの両方に即時反映され、再起動しても失われない。
 * 値そのものをHTTPレスポンスに含めることは一切ない（configured真偽値のみ公開）。
 * envFilePathは既定でpackages/backend/.envだが、テストでは実ファイルを汚さないよう
 * 一時パスを注入できるようにしている。
 */
export class SecretsStore {
  private values = new Map<string, string>();

  constructor(private envFilePath: string = ENV_FILE_PATH) {
    this.loadFromEnvFile();
    for (const { key } of SECRET_DEFINITIONS) {
      if (!this.values.has(key) && process.env[key]) {
        this.values.set(key, process.env[key]!);
      }
    }
  }

  private loadFromEnvFile(): void {
    if (!existsSync(this.envFilePath)) return;
    const content = readFileSync(this.envFilePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      if (!KNOWN_KEYS.has(key)) continue;
      this.values.set(key, decodeValue(trimmed.slice(eqIndex + 1).trim()));
    }
  }

  private persist(): void {
    const lines = Array.from(this.values.entries()).map(([key, value]) => `${key}=${encodeValue(value)}`);
    writeFileSync(this.envFilePath, lines.length > 0 ? `${lines.join("\n")}\n` : "", "utf-8");
  }

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  isConfigured(key: string): boolean {
    return Boolean(this.values.get(key)?.trim());
  }

  set(key: string, value: string): void {
    if (!KNOWN_KEYS.has(key)) throw new Error(`unknown secret key: ${key}`);
    this.values.set(key, value);
    process.env[key] = value;
    this.persist();
  }

  clear(key: string): void {
    if (!KNOWN_KEYS.has(key)) throw new Error(`unknown secret key: ${key}`);
    this.values.delete(key);
    delete process.env[key];
    this.persist();
  }

  listStatus(): Array<SecretMeta & { configured: boolean }> {
    return SECRET_DEFINITIONS.map((definition) => ({
      ...definition,
      configured: this.isConfigured(definition.key),
    }));
  }
}

export const secretsStore = new SecretsStore();
