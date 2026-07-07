import { useState } from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import type { Agent } from "@chaos-ai-suite/shared";
import { deleteAgent, updateAgent } from "../api/officeApi.js";
import { AgentEditorModal } from "./AgentEditorModal.js";

interface AgentManagerPanelProps {
  agents: Agent[];
}

/** AI社員の一覧・追加・編集・削除・有効/無効切り替えを行う管理画面。 */
export function AgentManagerPanel({ agents }: AgentManagerPanelProps) {
  const [editingAgent, setEditingAgent] = useState<Agent | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleToggleEnabled(agent: Agent): Promise<void> {
    setBusyId(agent.id);
    try {
      await updateAgent(agent.id, { enabled: !agent.enabled });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(agent: Agent): Promise<void> {
    if (!window.confirm(`${agent.name} を削除します。よろしいですか？`)) return;
    setBusyId(agent.id);
    try {
      await deleteAgent(agent.id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-office-text">AI社員一覧（{agents.length}名）</h3>
        <button
          type="button"
          onClick={() => setEditingAgent("new")}
          className="flex items-center gap-1 rounded-full bg-office-accent px-3 py-1 text-xs font-semibold text-white"
        >
          <Plus size={14} /> 追加
        </button>
      </div>

      <div className="space-y-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`flex items-center gap-3 rounded-lg border border-office-border bg-office-bg px-3 py-2 ${
              agent.enabled ? "" : "opacity-50"
            }`}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: agent.accentColor }}
              title={agent.accentColor}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-office-text">{agent.name}</p>
              <p className="truncate text-xs text-office-muted">{agent.title}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleEnabled(agent)}
              disabled={busyId === agent.id}
              title={agent.enabled ? "無効化する" : "有効化する"}
              className="text-office-muted hover:text-office-text disabled:opacity-40"
            >
              {agent.enabled ? <Power size={16} /> : <PowerOff size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setEditingAgent(agent)}
              title="編集"
              className="text-office-muted hover:text-office-text"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(agent)}
              disabled={busyId === agent.id}
              title="削除"
              className="text-office-muted hover:text-red-400 disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {editingAgent && (
        <AgentEditorModal
          agent={editingAgent === "new" ? undefined : editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
    </section>
  );
}
