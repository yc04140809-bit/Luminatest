import { useEffect, useState } from "react";

export type TimeOfDay = "day" | "night";

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;
const CHECK_INTERVAL_MS = 60_000;

function resolveTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? "day" : "night";
}

/** 現在時刻から昼/夜を判定し、オフィス背景を自動切り替えするためのフック。1分ごとに再評価する。 */
export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => resolveTimeOfDay(new Date()));

  useEffect(() => {
    const timer = setInterval(() => setTimeOfDay(resolveTimeOfDay(new Date())), CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return timeOfDay;
}
