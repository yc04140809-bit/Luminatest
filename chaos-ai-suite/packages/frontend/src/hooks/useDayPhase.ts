import { useEffect, useState } from "react";

export type DayPhase = "morning" | "day" | "evening" | "night";

const CHECK_INTERVAL_MS = 60_000;

function resolveDayPhase(date: Date): DayPhase {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * AI Office画面専用の4段階の時間帯判定（morning/day/evening/night）。
 * 既存のuseTimeOfDay（オフィスビュー背景の昼/夜2値判定）とは独立させており、
 * そちらの挙動には一切影響しない。
 */
export function useDayPhase(): DayPhase {
  const [phase, setPhase] = useState<DayPhase>(() => resolveDayPhase(new Date()));

  useEffect(() => {
    const timer = setInterval(() => setPhase(resolveDayPhase(new Date())), CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return phase;
}
