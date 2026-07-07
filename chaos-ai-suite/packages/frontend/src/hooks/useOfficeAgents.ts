import { useEffect, useState } from "react";
import type { Agent } from "@chaos-ai-suite/shared";

interface UseOfficeAgentsResult {
  agents: Agent[];
  loading: boolean;
  error: string | null;
}

/**
 * Step1時点ではREST APIを1回叩くだけの簡易フック。
 * Step3で /ws/office のWebSocket購読に置き換え、リアルタイム反映を行う。
 */
export function useOfficeAgents(): UseOfficeAgentsResult {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/agents")
      .then((res) => {
        if (!res.ok) throw new Error(`failed to fetch agents: ${res.status}`);
        return res.json() as Promise<Agent[]>;
      })
      .then((data) => {
        if (!cancelled) setAgents(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { agents, loading, error };
}
