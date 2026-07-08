import { useEffect, useRef, useState } from "react";

const DEFAULT_SPEED_MS = 18;

/** テキストを一定間隔で1文字ずつ表示するタイプライター演出。textが変わるたびリセットされる。 */
export function useTypewriter(text: string, speedMs: number = DEFAULT_SPEED_MS): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    if (!text) return;

    const timer = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(timer);
    }, speedMs);

    return () => clearInterval(timer);
  }, [text, speedMs]);

  return { displayed, done: displayed.length >= text.length };
}
