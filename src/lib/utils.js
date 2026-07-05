/* ---------- クリップボードコピー(フォールバック付き) ---------- */
export async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/* 今日の日付キー(YYYY-MM-DD)— デイリーチャレンジ用 */
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* callClaude() の error コードを画面表示用の日本語メッセージに変換 */
export function aiErrorMessage(error) {
  if (error === "limit") return "今月のAI利用回数の上限に達しました。来月また利用いただけます。";
  if (error === "auth") return "ログインの有効期限が切れている可能性があります。再度ログインしてください。";
  return "AIへの接続に失敗しました。通信環境を確認して再度お試しください。";
}
