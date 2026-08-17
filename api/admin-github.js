/**
 * ケイオスちゃん 管理画面(CMS) 用 BFF (Vercel Serverless Function)
 *
 * admin.html はコード変更なしにホーム画面の見た目(部屋背景/ケイオスちゃんの
 * 立ち絵・配置/家具)を編集するための静的な操作画面で、秘密鍵は一切持たない。
 * ここが唯一「GitHubリポジトリへの書き込み権限」を持つ場所で、admin.html
 * からのリクエストをGitHub Contents APIへ中継し、img/koufuku/room/ 以下の
 * 画像ファイルと room-config.json を直接コミットする。
 *
 * 保存の仕組み:
 *   admin.html → (この関数) → GitHub Contents API でコミット
 *     → 既存の .github/workflows/deploy-mvp-pages.yml が
 *       (paths: img/koufuku/** に room-config.json も含まれるため)
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

const ROOM_DIR = "img/koufuku/room";
const CONFIG_PATH = `${ROOM_DIR}/room-config.json`;
const ALLOWED_IMAGE_EXT = [".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg"];
const MAX_BASE64_LEN = 4_000_000; // 概ね3MB程度の画像までを許容(Vercel関数のリクエストボディ上限に収める)

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

function isSafeFilename(name) {
  if (typeof name !== "string" || !name) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-.]*$/.test(name)) return false;
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  return ALLOWED_IMAGE_EXT.includes(ext);
}

function isValidRoomConfig(config) {
  return (
    config &&
    typeof config === "object" &&
    typeof config.configVersion === "number" &&
    config.background &&
    typeof config.background === "object" &&
    config.character &&
    typeof config.character === "object" &&
    config.character.poses &&
    typeof config.character.poses === "object" &&
    config.entranceAnimations &&
    Array.isArray(config.entranceAnimations.items) &&
    config.furniture &&
    Array.isArray(config.furniture.items)
  );
}

// ===== 各actionの実装 =====

async function actionListImages() {
  const repo = getRepo();
  const branch = getBranch();
  let entries;
  try {
    entries = await githubApi(`/repos/${repo}/contents/${ROOM_DIR}?ref=${encodeURIComponent(branch)}`);
  } catch (e) {
    if (e.status === 404) return { images: [] };
    throw e;
  }
  const list = Array.isArray(entries) ? entries : [];
  const images = list
    .filter((it) => it.type === "file" && it.name !== "room-config.json" && isSafeFilename(it.name))
    .map((it) => ({
      name: it.name,
      path: it.path,
      sha: it.sha,
      size: it.size,
      url: `https://raw.githubusercontent.com/${repo}/${branch}/${it.path}`,
    }));
  return { images };
}

async function actionGetConfig() {
  const repo = getRepo();
  const branch = getBranch();
  const data = await githubApi(`/repos/${repo}/contents/${CONFIG_PATH}?ref=${encodeURIComponent(branch)}`);
  const content = Buffer.from(data.content, data.encoding || "base64").toString("utf-8");
  const config = JSON.parse(content);
  return { config, sha: data.sha };
}

async function actionSaveConfig(payload) {
  if (!payload || !isValidRoomConfig(payload.config)) {
    const err = new Error("invalid room-config payload");
    err.code = "invalid_config";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  const contentBase64 = Buffer.from(JSON.stringify(payload.config, null, 2) + "\n", "utf-8").toString("base64");
  const result = await githubApi(`/repos/${repo}/contents/${CONFIG_PATH}`, {
    method: "PUT",
    body: {
      message: "chore(admin): update room-config.json via admin panel",
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

async function actionUploadImage(payload) {
  const filename = payload && payload.filename;
  if (!isSafeFilename(filename)) {
    const err = new Error("invalid filename (allowed: letters/numbers/-_. and " + ALLOWED_IMAGE_EXT.join("/") + ")");
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
    const err = new Error("image too large (please keep uploads under ~3MB)");
    err.code = "too_large";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  const path = `${ROOM_DIR}/${filename}`;
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

async function actionDeleteImage(payload) {
  const filename = payload && payload.filename;
  if (!isSafeFilename(filename)) {
    const err = new Error("invalid filename");
    err.code = "invalid_filename";
    throw err;
  }
  if (!payload.sha) {
    const err = new Error("sha is required to delete (re-fetch listImages first)");
    err.code = "missing_sha";
    throw err;
  }
  const repo = getRepo();
  const branch = getBranch();
  const path = `${ROOM_DIR}/${filename}`;
  await githubApi(`/repos/${repo}/contents/${path}`, {
    method: "DELETE",
    body: {
      message: `chore(admin): delete ${filename} via admin panel`,
      sha: payload.sha,
      branch,
    },
  });
  return { deleted: filename };
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
      case "listImages":
        result = await actionListImages();
        break;
      case "getConfig":
        result = await actionGetConfig();
        break;
      case "saveConfig":
        result = await actionSaveConfig(body);
        break;
      case "uploadImage":
        result = await actionUploadImage(body);
        break;
      case "deleteImage":
        result = await actionDeleteImage(body);
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
