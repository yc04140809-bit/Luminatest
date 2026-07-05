import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CHAR, UI } from "../data/constants";

/* メールのマジックリンクでログイン(パスワード不要) */
export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) setError("送信に失敗しました:" + err.message);
    else setSent(true);
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex justify-center font-sans">
      <div className="w-full max-w-md bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 h-full flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-sky-500 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-indigo-400 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <img src={CHAR.normal} alt="ケイオスちゃん" className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-300 shadow-lg mb-4 relative" />
        <h1 className="text-xl font-bold text-white mb-1 relative">🛡️ 接遇ガードAI</h1>
        <p className="text-xs text-amber-200 mb-8 relative">あなたの安心を、AIが守る</p>

        {sent ? (
          <div className="bg-white bg-opacity-95 rounded-2xl p-5 relative w-full">
            <p className="text-sm font-bold text-slate-800 mb-1">📩 メールを送信しました</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              {email} 宛にログイン用のリンクを送りました。メール内の「ログイン」リンクをタップすると、このアプリに戻って自動的にログインします。
            </p>
            <button onClick={() => setSent(false)} className="text-xs text-indigo-600 font-semibold mt-3">
              別のメールアドレスで送り直す
            </button>
          </div>
        ) : (
          <div className="w-full relative">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              className="w-full bg-white bg-opacity-95 rounded-xl p-3 text-sm outline-none mb-3 shadow-sm"
            />
            {error && <p className="text-xs text-red-300 mb-3">{error}</p>}
            <button onClick={sendLink} disabled={loading || !email.trim()} className={`w-full py-3 text-sm ${UI.btnGold}`}>
              {loading ? "送信中…" : "✉️ ログインリンクを送る"}
            </button>
            <p className="text-xs text-blue-200 mt-4 leading-relaxed">
              パスワードは不要です。入力したメールに届くリンクをタップするだけでログインできます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
