import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        {agents.map((agent) => {
          const expanded = expandedId === agent.id;
          return (
            <div
              key={agent.id}
              className={`rounded-lg border border-office-border bg-office-bg px-3 py-2 ${agent.enabled ? "" : "opacity-50"}`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : agent.id)}
                  title={expanded ? "詳細を閉じる" : "できることを見る"}
                  className="shrink-0 text-office-muted hover:text-office-text"
                >
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: agent.accentColor }}
                  title={agent.accentColor}
                />
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : agent.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-office-text">{agent.name}</p>
                  <p className="truncate text-xs text-office-muted">{agent.title}</p>
                </button>
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

              {expanded && (
                <div className="mt-2 border-t border-office-border pt-2 pl-6">
                  <p className="mb-2 text-xs leading-relaxed text-office-muted">{agent.description}</p>
                  <ul className="space-y-1">
                    {agent.responsibilities.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs text-office-text">
                        <Check size={12} className="mt-0.5 shrink-0 text-office-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
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
