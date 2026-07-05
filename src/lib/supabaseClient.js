import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 開発中に環境変数の設定漏れへ気づけるように、画面上にもわかりやすく出す
  console.error(
    "Supabaseの接続情報が設定されていません。.env(または Vercel の環境変数)に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。"
  );
}

export const supabase = createClient(url, anonKey);
