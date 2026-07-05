import { useState, useRef, useEffect } from "react";
import { CHAR } from "../data/constants";
import { copyText } from "../lib/utils";

export function Badge({ text, color }) {
  return <span className={`${color} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>{text}</span>;
}

export function Spinner({ light }) {
  return <div className={`w-5 h-5 border-2 ${light ? "border-white" : "border-blue-500"} border-t-transparent rounded-full animate-spin`} />;
}

/* セクション見出し:グラデーションのアクセントバー付き */
export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center text-base font-bold text-slate-800">
        <span className="w-1.5 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-sky-400 mr-2" />
        {children}
      </h2>
      {right}
    </div>
  );
}

export function CopyBtn({ text, label = "コピー" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-colors ${done ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-600 active:bg-indigo-100"}`}
    >
      {done ? "✓ コピー済" : label}
    </button>
  );
}

/* ケイオスちゃんの吹き出し(表情差分対応) */
export function ChaosBubble({ expr = "normal", title = "ケイオスちゃん", children }) {
  return (
    <div className="flex items-start gap-2.5 mt-4">
      <img src={CHAR[expr] || CHAR.normal} alt="ケイオスちゃん" className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-300 shadow-md shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-indigo-700 mb-1">{title}</p>
        <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-md ring-1 ring-indigo-100">{children}</div>
      </div>
    </div>
  );
}

/* 長押しで発火する汎用ボタン(進捗バー付き・離すとキャンセル)— SOS発信用 */
export function HoldButton({ seconds = 2, onComplete, className = "", children }) {
  const [p, setP] = useState(0);
  const timer = useRef(null);
  const startAt = useRef(0);
  const stop = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setP(0);
  };
  const start = () => {
    if (timer.current) return;
    startAt.current = Date.now();
    timer.current = setInterval(() => {
      const v = Math.min((Date.now() - startAt.current) / (seconds * 1000), 1);
      setP(v);
      if (v >= 1) {
        stop();
        onComplete();
      }
    }, 50);
  };
  useEffect(() => stop, []);
  return (
    <button
      onMouseDown={start} onMouseUp={stop} onMouseLeave={stop}
      onTouchStart={(e) => { e.preventDefault(); start(); }} onTouchEnd={stop} onTouchCancel={stop}
      className={`relative overflow-hidden select-none active:scale-95 transition-transform ${className}`}
    >
      <div className="absolute inset-y-0 left-0 pointer-events-none" style={{ width: `${p * 100}%`, backgroundColor: "rgba(255,255,255,0.35)" }} />
      <div className="relative">
        {children}
        {p > 0 && <span className="ml-2 text-xs font-bold">…長押し中</span>}
      </div>
    </button>
  );
}
