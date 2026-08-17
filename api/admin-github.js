/**
 * ケイオスちゃん 管理画面(CMS) 用 BFF (Vercel Serverless Function)
 *
 * 「Lumina事業部」として今後 部屋/ケイオスちゃん/演出/家具/季節イベント/
 * BGM/エフェクト/セリフ・会話/テーマ/お知らせ、といったモジュールを
 * 増やしていく前提のため、この関数は特定の機能に紐づいた専用エンドポイント
 * ではなく、「許可されたディレクトリ配下のJSON設定ファイルと画像/音声
 * アセットを読み書きするだけの、汎用コンテンツAPI」として設計している。
 * 新しいCMSモジュールを追加するときは、この関数もadmin.htmlのコードも
 * 変更せず、data/cms/ 以下に新しいJSONファイルを1つ増やすだけでよい。
 *
 * admin.html はコード変更なしにホーム画面の見た目を編集するための静的な
 * 操作画面で、秘密鍵は一切持たない。ここが唯一「GitHubリポジトリへの
 * 書き込み権限」を持つ場所で、admin.htmlからのリクエストをGitHub Contents
 * APIへ中継する。
 *
 * 保存の仕組み:
 *   admin.html → (この関数) → GitHub Contents API でコミット
 *     → 既存の .github/workflows/deploy-mvp-pages.yml が
 *       (paths: img/koufuku/**, data/cms/** を含むため)
 *       自動的にGitHub Pagesを再デプロイ → 数十秒〜1分程度でホーム画面に反映
 *
 * 必要な環境変数 (Vercel Project Settings > Environment Variables):
 *   ADMIN_PASSWORD      (必須) 管理画面ログイン用パスワード。admin.htmlは
 *                        これをそのまま Authorization: Bearer ヘッダーで
 *                        毎リクエスト送る(セッションを持たないシンプルな
 *                        方式。将来ログイン方式を強化する場合もこの関数の
 *                        認証チェック部分だけ差し替えればよい)。
 *   GITHUB_ADMIN_TOKEN   (必須) リポジトリへの書き込み権限を持つGitHubの
 *                        Personal Access Token (Fine-grained推奨。対象は
 *                        このリポジトリのみ、権限は Contents: Read and write)。
 *   GITHUB_REPO          (任意) "owner/repo" 形式。未設定時は
 *                        "yc04140809-bit/Luminatest"。
 *   GITHUB_BRANCH        (任意) コミット先ブランチ。未設定時は
 *                        "claude/koufuku-ai-phase18" (GitHub Pagesの
 *                        デプロイ元ブランチと必ず一致させること)。
 */

// ===== 書き込みを許可するディレクトリ/ファイルの一覧(ここが唯一の
// 「新しいモジュールを追加するときに触る場所」)。新モジュール用の
// JSONファイルは常に data/cms/ 配下に置く運用にすることで、この配列に
// 1行足すだけで済むようにしてある。 =====
const ASSET_DIRS = {
  "img/koufuku/room": { exts: [".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg"] },
  "audio/koufuku": { exts: [".mp3", ".ogg", ".wav", ".m4a"] },
};
const FIXED_JSON_PATHS = ["img/koufuku/room/room-config.json"];
const JSON_DIR_PREFIX = "data/cms/";
const MAX_BASE64_LEN = 6_000_000; // 概ね4.5MB程度のファイルまでを許容(Vercel関数のリクエストボディ上限に収める)
const MAX_JSON_LEN = 500_000; // 設定ファイル1つあたりの上限(壊れたデータの混入を防ぐ簡易ガード)

function buildAllowedOrigins() {
  const origins = [
    "https://yc04140809-bit.github.io",
    "http://localhost:8791",
    "http://localhost:3000",
  ];
  if (process.env.KAOSU_ALLOWED_ORIGIN) {
    origins.push(process.env.KAOSU_ALLOWED_ORIGIN);
  }
  return origins;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = buildAllowedOrigins();
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getRepo() {
  return process.env.GITHUB_REPO || "yc04140809-bit/Luminatest";
}
function getBranch() {
  return process.env.GITHUB_BRANCH || "claude/koufuku-ai-phase18";
}

async function githubApi(path, { method = "GET", body, timeoutMs = 10000 } = {}) {
  const token = process.env.GITHUB_ADMIN_TOKEN;
  if (!token) {
    const err = new Error("GITHUB_ADMIN_TOKEN is not configured");
    err.code = "no_github_token";
    throw err;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "koufuku-ai-admin",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error(
        `GitHub API ${method} ${path} -> HTTP ${res.status}: ${(data && data.message) || text.slice(0, 200)}`
      );
      err.status = res.status;
      err.githubData = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function isSafeBasename(name) {
  return typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_\-.]*$/.test(name) && !name.includes("..");
}

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

// アセット(画像/音声)用ディレクトリの妥当性チェック。ここで許可した
// ディレクトリ以外へは、admin.html側が何を送ってきても書き込めない。
function resolveAssetDir(dir) {
  if (typeof dir !== "string") return null;
  const clean = dir.replace(/\/+$/, "");
  return ASSET_DIRS[clean] ? clean : null;
}

// JSON設定ファイルのパスの妥当性チェック。room-config.json(既存・固定)
// か、data/cms/ 配下の *.json (新モジュール用、拡張し放題) のみ許可する。
function isAllowedJsonPath(path) {
  if (typeof path !== "string") return false;
  if (FIXED_JSON_PATHS.includes(path)) return true;
  if (!path.startsWith(JSON_DIR_PREFIX)) return false;
  if (!path.endsWith(".json")) return false;
  if (path.includes("..")) return false;
  const basename = path.slice(JSON_DIR_PREFIX.length, -".json".length);
  return /^[a-zA-Z0-9_\-]+$/.test(basename);
}

// ===== 各actionの実装(すべて汎用) =====

async function actionListFiles(payload) {
  const dir = resolveAssetDir(payload && payload.dir);
  if (!dir) {
    const err = new Error("invalid or disallowed dir");
    err.code = "invalid_dir";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  let entries;
  try {
    entries = await githubApi(`/repos/${repo}/contents/${dir}?ref=${encodeURIComponent(branch)}`);
  } catch (e) {
    if (e.status === 404) return { files: [] };
    throw e;
  }
  const allowedExts = ASSET_DIRS[dir].exts;
  const list = Array.isArray(entries) ? entries : [];
  const files = list
    .filter((it) => it.type === "file" && isSafeBasename(it.name) && allowedExts.includes(extOf(it.name)))
    .map((it) => ({
      name: it.name,
      path: it.path,
      sha: it.sha,
      size: it.size,
      url: `https://raw.githubusercontent.com/${repo}/${branch}/${it.path}`,
    }));
  return { files };
}

async function actionGetJson(payload) {
  const path = payload && payload.path;
  if (!isAllowedJsonPath(path)) {
    const err = new Error("invalid or disallowed json path");
    err.code = "invalid_path";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  try {
    const data = await githubApi(`/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    const content = Buffer.from(data.content, data.encoding || "base64").toString("utf-8");
    return { content: JSON.parse(content), sha: data.sha };
  } catch (e) {
    // まだファイルが存在しないモジュール(新規追加直後など)は、エラーに
    // せずcontent:nullを返す。どんな既定値を使うかはフロント側(モジュール
    // ごとのスキーマ)の責務とし、この関数はあくまで汎用のまま保つ。
    if (e.status === 404) return { content: null, sha: null };
    throw e;
  }
}

async function actionSaveJson(payload) {
  const path = payload && payload.path;
  if (!isAllowedJsonPath(path)) {
    const err = new Error("invalid or disallowed json path");
    err.code = "invalid_path";
    throw err;
  }
  const content = payload && payload.content;
  if (content === undefined || content === null || typeof content !== "object") {
    const err = new Error("content must be a JSON object or array");
    err.code = "invalid_content";
    throw err;
  }
  const serialized = JSON.stringify(content, null, 2) + "\n";
  if (serialized.length > MAX_JSON_LEN) {
    const err = new Error("config too large");
    err.code = "too_large";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  const contentBase64 = Buffer.from(serialized, "utf-8").toString("base64");
  const result = await githubApi(`/repos/${repo}/contents/${path}`, {
    method: "PUT",
    body: {
      message: `chore(admin): update ${path} via admin panel`,
      content: contentBase64,
      sha: payload.sha || undefined,
      branch,
    },
  });
  return {
    sha: result && result.content && result.content.sha,
    commitSha: result && result.commit && result.commit.sha,
  };
}

async function actionUploadFile(payload) {
  const dir = resolveAssetDir(payload && payload.dir);
  if (!dir) {
    const err = new Error("invalid or disallowed dir");
    err.code = "invalid_dir";
    throw err;
  }
  const filename = payload && payload.filename;
  if (!isSafeBasename(filename) || !ASSET_DIRS[dir].exts.includes(extOf(filename))) {
    const err = new Error(
      "invalid filename (allowed for this dir: letters/numbers/-_. and " + ASSET_DIRS[dir].exts.join("/") + ")"
    );
    err.code = "invalid_filename";
    throw err;
  }
  const contentBase64 = payload && payload.contentBase64;
  if (typeof contentBase64 !== "string" || !contentBase64) {
    const err = new Error("contentBase64 is required");
    err.code = "invalid_content";
    throw err;
  }
  if (contentBase64.length > MAX_BASE64_LEN) {
    const err = new Error("file too large (please keep uploads under ~4.5MB)");
    err.code = "too_large";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  const path = `${dir}/${filename}`;
  const result = await githubApi(`/repos/${repo}/contents/${path}`, {
    method: "PUT",
    body: {
      message: `chore(admin): ${payload.sha ? "replace" : "upload"} ${filename} via admin panel`,
      content: contentBase64,
      sha: payload.sha || undefined,
      branch,
    },
  });
  return {
    name: filename,
    path,
    sha: result && result.content && result.content.sha,
    url: `https://raw.githubusercontent.com/${repo}/${branch}/${path}`,
  };
}

async function actionDeleteFile(payload) {
  const path = payload && payload.path;
  const dir = path && path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (!resolveAssetDir(dir)) {
    const err = new Error("invalid or disallowed path");
    err.code = "invalid_path";
    throw err;
  }
  if (!payload.sha) {
    const err = new Error("sha is required to delete (re-fetch listFiles first)");
    err.code = "missing_sha";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  await githubApi(`/repos/${repo}/contents/${path}`, {
    method: "DELETE",
    body: {
      message: `chore(admin): delete ${path} via admin panel`,
      sha: payload.sha,
      branch,
    },
  });
  return { deleted: path };
}

// GitHub Pagesの自動デプロイが完了したかどうかを、直近のワークフロー実行から
// 該当コミットのものを探して確認する(保存後、admin.html側が「反映されました」
// を表示するためのポーリング用)。見つからない/取得失敗時も画面を壊さない
// よう、例外にせず status:"unknown" を返す。
async function actionCheckDeployStatus(payload) {
  const commitSha = payload && payload.commitSha;
  if (!commitSha) return { status: "unknown" };
  const repo = getRepo();
  const branch = getBranch();
  try {
    const data = await githubApi(
      `/repos/${repo}/actions/workflows/deploy-mvp-pages.yml/runs?branch=${encodeURIComponent(branch)}&per_page=10`
    );
    const runs = (data && data.workflow_runs) || [];
    const run = runs.find((r) => r.head_sha === commitSha);
    if (!run) return { status: "unknown" };
    return { status: run.status, conclusion: run.conclusion, htmlUrl: run.html_url };
  } catch (e) {
    return { status: "unknown" };
  }
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const action = body.action;

  try {
    let result;
    switch (action) {
      case "ping":
        result = { ok: true };
        break;
      case "listFiles":
        result = await actionListFiles(body);
        break;
      case "getJson":
        result = await actionGetJson(body);
        break;
      case "saveJson":
        result = await actionSaveJson(body);
        break;
      case "uploadFile":
        result = await actionUploadFile(body);
        break;
      case "deleteFile":
        result = await actionDeleteFile(body);
        break;
      case "checkDeployStatus":
        result = await actionCheckDeployStatus(body);
        break;
      default:
        res.status(400).json({ error: "unknown_action" });
        return;
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("[admin-github]", action, error);
    console.error(error && error.stack);
    const status = error && error.code === "no_github_token" ? 500 : error && error.status === 404 ? 404 : 502;
    res.status(status).json({ error: "admin_github_failed", message: String(error && error.message) });
  }
};
