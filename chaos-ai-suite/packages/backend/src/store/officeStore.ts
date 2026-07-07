import { randomUUID } from "node:crypto";
import {
  buildSeedOfficeState,
  type ActiveMeeting,
  type Agent,
  type AgentDraft,
  type Message,
  type MessageDraft,
  type OfficeEvent,
  type OfficeState,
  type Task,
  type TaskDraft,
  type ThemeSettings,
  type ThemeUpdateInput,
} from "@chaos-ai-suite/shared";

type Listener = (event: OfficeEvent) => void;

/**
 * インメモリのOfficeState管理。Step1では永続化を持たず、
 * プロセス再起動でシード状態にリセットされる。
 * Step2でDB/永続層に差し替える際もこのクラスのAPI形状は維持する想定。
 */
export class OfficeStore {
  private state: OfficeState = buildSeedOfficeState();
  private listeners = new Set<Listener>();

  getState(): OfficeState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: OfficeEvent): void {
    this.state.lastUpdated = new Date().toISOString();
    for (const listener of this.listeners) listener(event);
  }

  listAgents(): Agent[] {
    return Object.values(this.state.agents);
  }

  getAgent(id: string): Agent | undefined {
    return this.state.agents[id];
  }

  createAgent(draft: AgentDraft): Agent {
    const now = new Date().toISOString();
    const agent: Agent = {
      ...draft,
      id: `agent-${randomUUID()}`,
      status: "standby",
      createdAt: now,
      updatedAt: now,
    };
    this.state.agents[agent.id] = agent;
    this.emit({ type: "agent_updated", agent });
    return agent;
  }

  updateAgent(id: string, patch: Partial<AgentDraft>): Agent | undefined {
    const existing = this.state.agents[id];
    if (!existing) return undefined;
    const updated: Agent = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.state.agents[id] = updated;
    this.emit({ type: "agent_updated", agent: updated });
    return updated;
  }

  deleteAgent(id: string): boolean {
    if (!this.state.agents[id]) return false;
    delete this.state.agents[id];
    return true;
  }

  /**
   * オーケストレーションループ専用の状態更新。AgentDraft（GUI編集フォーム）とは別枠で、
   * status / currentTaskId / currentTaskSummary のみを扱う。
   */
  setAgentStatus(
    id: string,
    patch: Partial<Pick<Agent, "status" | "currentTaskId" | "currentTaskSummary">>,
  ): Agent | undefined {
    const existing = this.state.agents[id];
    if (!existing) return undefined;
    const updated: Agent = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.state.agents[id] = updated;
    this.emit({ type: "agent_updated", agent: updated });
    return updated;
  }

  startMeeting(input: {
    topic: string;
    participantAgentIds: string[];
    relatedTaskId?: string;
  }): ActiveMeeting {
    const meeting: ActiveMeeting = {
      id: `meeting-${randomUUID()}`,
      startedAt: new Date().toISOString(),
      ...input,
    };
    this.state.activeMeetings.push(meeting);
    this.emit({ type: "meeting_started", meeting });
    return meeting;
  }

  endMeeting(id: string): void {
    const index = this.state.activeMeetings.findIndex((meeting) => meeting.id === id);
    if (index === -1) return;
    this.state.activeMeetings.splice(index, 1);
    this.emit({ type: "meeting_ended", meetingId: id });
  }

  listTasks(): Task[] {
    return Object.values(this.state.tasks);
  }

  createTask(draft: TaskDraft): Task {
    const now = new Date().toISOString();
    const task: Task = {
      ...draft,
      id: `task-${randomUUID()}`,
      status: "pending",
      subtaskIds: [],
      handoffs: [],
      createdAt: now,
      updatedAt: now,
    };
    this.state.tasks[task.id] = task;
    if (task.approval.required && task.approval.status === "pending") {
      this.state.pendingApprovalTaskIds.push(task.id);
    }
    this.emit({ type: "task_updated", task });
    return task;
  }

  updateTask(id: string, patch: Partial<Task>): Task | undefined {
    const existing = this.state.tasks[id];
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.state.tasks[id] = updated;

    const pendingIdx = this.state.pendingApprovalTaskIds.indexOf(id);
    const stillPending = updated.approval.required && updated.approval.status === "pending";
    if (stillPending && pendingIdx === -1) this.state.pendingApprovalTaskIds.push(id);
    if (!stillPending && pendingIdx !== -1) this.state.pendingApprovalTaskIds.splice(pendingIdx, 1);

    this.emit({ type: "task_updated", task: updated });
    return updated;
  }

  getTheme(): ThemeSettings {
    return this.state.theme;
  }

  /**
   * presetIdの切り替えは個別上書き(overrides)をリセットする（新テーマを素の状態で見せるため）。
   * 同じ呼び出しでoverridesも渡せば、切り替え直後にそのまま上書きを適用できる。
   */
  updateTheme(patch: ThemeUpdateInput): ThemeSettings {
    const current = this.state.theme;
    let overrides = current.overrides;

    if (patch.presetId && patch.presetId !== current.presetId) overrides = {};
    if (patch.resetOverrides) overrides = {};
    if (patch.overrides) overrides = { ...overrides, ...patch.overrides };

    const updated: ThemeSettings = { presetId: patch.presetId ?? current.presetId, overrides };
    this.state.theme = updated;
    this.emit({ type: "theme_updated", theme: updated });
    return updated;
  }

  listMessages(limit = 100): Message[] {
    return this.state.messages.slice(-limit);
  }

  postMessage(draft: MessageDraft): Message {
    const message: Message = {
      ...draft,
      id: `msg-${randomUUID()}`,
      timestamp: new Date().toISOString(),
    };
    this.state.messages.push(message);
    this.emit({ type: "message_created", message });
    return message;
  }
}

export const officeStore = new OfficeStore();
