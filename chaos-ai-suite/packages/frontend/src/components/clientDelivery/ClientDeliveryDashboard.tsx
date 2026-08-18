import { useEffect, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { CLIENT_PROJECT_STATUS_LABELS, RISK_LEVEL_LABELS, type ClientProject, type ClientProjectDraft, type RiskLevel } from "@chaos-ai-suite/shared";
import { createClientProject, listClientProjects } from "../../api/officeApi.js";
import { ClientProjectRoom } from "./ClientProjectRoom.js";

interface ClientDeliveryDashboardProps {
  onClose: () => void;
}

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40";

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  LOW: "border-office-border text-office-muted",
  MEDIUM: "border-office-gold/60 text-office-gold",
  HIGH: "border-orange-500/60 text-orange-400",
  CRITICAL: "border-red-500/60 text-red-400",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function ProjectCard({ project, onClick }: { project: ClientProject; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-office-border bg-office-panel p-4 text-left transition hover:border-office-gold/50"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="font-semibold text-office-text">{project.name}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${RISK_BADGE_CLASS[project.riskLevel]}`}>
          {project.riskLevel}
        </span>
      </div>
      <p className="mb-2 text-xs text-office-muted">{project.clientName || "（クライアント名未設定）"}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-office-muted">
        <span className="rounded-full bg-office-gold/10 px-2 py-0.5 font-semibold text-office-gold">
          {CLIENT_PROJECT_STATUS_LABELS[project.status]}
        </span>
        <span>作成: {formatDate(project.createdAt)}</span>
        <span>更新: {formatDate(project.updatedAt)}</span>
        <span>MVP承認: {project.mvpApproval?.status === "approved" ? "済" : "未"}</span>
      </div>
    </button>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (project: ClientProject) => void }) {
  const [form, setForm] = useState<ClientProjectDraft>({ name: "", clientName: "", industry: "", contactName: "", contactNote: "", memo: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ClientProjectDraft>(key: K, value: ClientProjectDraft[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!form.name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createClientProject(form);
      onCreated(project);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-office-gold/50 bg-office-panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg text-office-gold">新しい案件</h3>
          <button type="button" onClick={onClose} className="text-office-muted hover:text-office-text">
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 rounded-lg border border-office-gold/40 bg-office-gold/5 px-3 py-2 text-[11px] text-office-gold">
          必要以上の個人情報・機密情報を入力しないでください。仮名・要約での入力を推奨します。
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>案件名 *</label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} className={inputCls} placeholder="例）介護施設シフト作成支援" />
          </div>
          <div>
            <label className={labelCls}>クライアント名または仮名</label>
            <input value={form.clientName} onChange={(e) => update("clientName", e.target.value)} className={inputCls} placeholder="例）A施設様（仮名）" />
          </div>
          <div>
            <label className={labelCls}>業種</label>
            <input value={form.industry} onChange={(e) => update("industry", e.target.value)} className={inputCls} placeholder="例）介護" />
          </div>
          <div>
            <label className={labelCls}>担当者名</label>
            <input value={form.contactName} onChange={(e) => update("contactName", e.target.value)} className={inputCls} placeholder="例）担当者様（仮名で可）" />
          </div>
          <div>
            <label className={labelCls}>連絡先メモ</label>
            <textarea value={form.contactNote} onChange={(e) => update("contactNote", e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="必要最小限のメモのみ" />
          </div>
          <div>
            <label className={labelCls}>案件メモ</label>
            <textarea value={form.memo} onChange={(e) => update("memo", e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="ご相談内容の要約" />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button type="submit" disabled={creating || !form.name.trim()} className={btnPrimary}>
            {creating ? "作成中..." : "案件を作成"}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Client Delivery Mode（クライアント案件モード）のホーム画面。
 * 依頼者ヒアリング→整理→自動化分類→MVP提案→人間承認→Claude Code実装指示書生成、
 * という一気通貫ワークフローの入口。AIは整理・分析・提案・分類・指示書生成のみを行い、
 * MVP決定・契約・金額・納期・外部送信等は必ず人間が最終判断する。
 */
export function ClientDeliveryDashboard({ onClose }: ClientDeliveryDashboardProps) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listClientProjects()
      .then((list) => {
        if (cancelled) return;
        setProjects([...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("案件一覧の読み込みに失敗しました。");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleCreated(project: ClientProject): void {
    setProjects((prev) => [project, ...prev]);
    setNewOpen(false);
    setSelectedId(project.id);
  }

  function handleProjectUpdated(updated: ClientProject): void {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  if (selectedId) {
    return (
      <ClientProjectRoom
        projectId={selectedId}
        onBack={() => setSelectedId(null)}
        onUpdated={handleProjectUpdated}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
      <header className="flex items-center justify-between border-b border-office-border bg-office-panel px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-office-border px-2.5 py-1.5 text-xs text-office-muted transition hover:border-office-gold hover:text-office-gold"
        >
          オフィスへ戻る
        </button>
        <div className="flex items-center gap-2">
          <Briefcase size={18} className="text-office-gold" />
          <h1 className="font-display text-base text-office-gold">クライアント案件</h1>
        </div>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-office-gold px-3 py-1.5 text-xs font-semibold text-office-bg"
        >
          <Plus size={14} />
          新しい案件
        </button>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto p-4">
        {loadError && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{loadError}</p>}
        {loading && <p className="py-8 text-center text-xs text-office-muted">読み込み中...</p>}

        {!loading && projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-office-border px-4 py-10 text-center text-xs text-office-muted">
            <Briefcase size={24} className="mx-auto mb-2 opacity-50" />
            まだ案件がありません。
            <br />
            「新しい案件」から依頼者の相談を記録できます。
          </div>
        )}

        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onClick={() => setSelectedId(project.id)} />
        ))}
      </div>

      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
