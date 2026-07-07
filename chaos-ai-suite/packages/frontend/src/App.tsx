import { useOfficeAgents } from "./hooks/useOfficeAgents.js";
import { AgentCard } from "./components/AgentCard.js";

/**
 * Step1のアーキテクチャ疎通確認用シェル。
 * バックエンドの /api/agents からシード済み6名を取得して表示するのみで、
 * ゲームライクなオフィスビュー・チャットログ・コマンドセンターはStep3で実装する。
 */
export default function App() {
  const { agents, loading, error } = useOfficeAgents();

  return (
    <div className="min-h-full bg-office-bg p-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-office-gold">My Chaos AI Suite</h1>
        <p className="text-office-muted">6人のAI社員があなたのオフィスで待機しています。</p>
      </header>

      {loading && <p className="text-office-muted">オフィスに接続中...</p>}
      {error && (
        <p className="text-red-400">
          バックエンドに接続できませんでした（{error}）。packages/backend を起動してください。
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
