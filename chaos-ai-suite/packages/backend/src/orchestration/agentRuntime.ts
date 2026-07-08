import type { OfficeStore } from "../store/officeStore.js";
import type { ToolRegistry } from "../tools/toolRegistry.js";
import { executeAgentTask, statusForOutputType } from "./agentExecutor.js";
import { decomposeDirective, type DecompositionPlan } from "./taskDecomposer.js";
import { reviewDirectiveRisk } from "./riskReview.js";
import type { LlmClient } from "./llmClient.js";

/** 同一タスクが引き継がれ続けることによる無限ループを防ぐ上限。 */
const MAX_HANDOFFS = 6;

/** タスク分解の作戦会議を主催する2名（固定シードのID）。 */
const STRATEGIST_ID = "agent-sayla";
const ARCHITECT_ID = "agent-levi";
/** 自発的なリスクレビュー（物申し機能）を担当するAI社員。 */
const RISK_REVIEWER_ID = "agent-chaos";

export interface AgentRuntime {
  /** 代表からの大雑把な指示を受けてタスク分解〜実行パイプラインを開始する */
  dispatchDirective(directive: string): Promise<void>;
  /** 特定のAI社員への個別メンション指示。作戦会議を挟まず直接タスク化して実行する */
  dispatchMention(agentId: string, directive: string): Promise<void>;
}

/**
 * イベント駆動のエージェント実行ループ。
 * 「タスク実行 → 次の担当エージェントの指名 → 状態更新」を1タスクずつ処理し、
 * 承認が必要な成果物は awaiting_approval で必ず停止させる（人間参加型ゲート）。
 */
export function createAgentRuntime(store: OfficeStore, llm: LlmClient, toolRegistry: ToolRegistry): AgentRuntime {
  function clearAgent(agentId: string): void {
    store.setAgentStatus(agentId, {
      status: "standby",
      currentTaskId: undefined,
      currentTaskSummary: undefined,
    });
  }

  async function runTask(taskId: string, hops = 0): Promise<void> {
    const task = store.listTasks().find((candidate) => candidate.id === taskId);
    if (!task || !task.assignedAgentId) return;

    const agent = store.getAgent(task.assignedAgentId);
    if (!agent) return;

    if (hops >= MAX_HANDOFFS) {
      store.updateTask(taskId, {
        status: "awaiting_approval",
        approval: { required: true, status: "pending" },
      });
      store.postMessage({
        channel: "command_center",
        fromAgentId: agent.id,
        type: "approval_request",
        content: `引き継ぎが${MAX_HANDOFFS}回を超えたため、代表の確認をお願いします。`,
        relatedTaskId: taskId,
      });
      return;
    }

    store.updateTask(taskId, { status: "in_progress" });
    store.setAgentStatus(agent.id, {
      status: statusForOutputType(task.outputType),
      currentTaskId: task.id,
      currentTaskSummary: task.title.slice(0, 24),
    });

    let result;
    try {
      result = await executeAgentTask({
        agent,
        task,
        roster: store.listAgents(),
        availableTools: toolRegistry.listForAgent(agent.id),
        llm,
      });
    } catch (error) {
      clearAgent(agent.id);
      store.updateTask(taskId, { status: "blocked" });
      store.postMessage({
        channel: "general",
        fromAgentId: agent.id,
        type: "system_log",
        content: `タスク実行中にエラーが発生しました: ${(error as Error).message}`,
        relatedTaskId: taskId,
      });
      return;
    }

    store.postMessage({
      channel: "general",
      fromAgentId: agent.id,
      type: "status_update",
      content: result.note
        ? `「${task.title}」に対応しました。${result.note}`
        : `「${task.title}」に対応しました。`,
      relatedTaskId: taskId,
    });

    if (result.action === "complete") {
      store.updateTask(taskId, { status: "completed", output: result.output });
      clearAgent(agent.id);
      return;
    }

    if (result.action === "request_approval") {
      store.updateTask(taskId, {
        status: "awaiting_approval",
        output: result.output,
        approval: { required: true, status: "pending" },
      });
      clearAgent(agent.id);
      store.postMessage({
        channel: "command_center",
        fromAgentId: agent.id,
        type: "approval_request",
        content: result.note ?? `「${task.title}」の成果物について承認をお願いします。`,
        relatedTaskId: taskId,
      });
      return;
    }

    if (result.action === "tool_call") {
      const toolDef = result.toolId ? toolRegistry.get(result.toolId)?.definition : undefined;
      const canUse = result.toolId ? toolRegistry.canUse(agent.id, result.toolId) : false;

      if (!toolDef || !canUse) {
        store.updateTask(taskId, {
          status: "awaiting_approval",
          output: result.output,
          approval: { required: true, status: "pending" },
        });
        clearAgent(agent.id);
        store.postMessage({
          channel: "command_center",
          fromAgentId: agent.id,
          type: "approval_request",
          content: `外部ツール（${result.toolId ?? "不明"}）の指定が不正だったため、代表の確認をお願いします。${
            result.note ? `（${result.note}）` : ""
          }`,
          relatedTaskId: taskId,
        });
        return;
      }

      store.updateTask(taskId, {
        status: "awaiting_approval",
        output: result.output,
        approval: { required: true, status: "pending" },
        pendingToolCall: { toolId: toolDef.id, input: result.toolInput ?? {}, note: result.note },
      });
      clearAgent(agent.id);
      store.postMessage({
        channel: "command_center",
        fromAgentId: agent.id,
        type: "approval_request",
        content: `${agent.name}が外部連携（${toolDef.name}）の実行を申請しています。承認しますか？${
          result.note ? `\n${result.note}` : ""
        }`,
        relatedTaskId: taskId,
      });
      return;
    }

    // action === "handoff"
    const target = result.targetAgentId ? store.getAgent(result.targetAgentId) : undefined;
    if (!target || !target.enabled || target.id === agent.id) {
      store.updateTask(taskId, {
        status: "awaiting_approval",
        output: result.output,
        approval: { required: true, status: "pending" },
      });
      clearAgent(agent.id);
      store.postMessage({
        channel: "command_center",
        fromAgentId: agent.id,
        type: "approval_request",
        content: `引き継ぎ先が特定できなかったため、代表の確認をお願いします。${result.note ? `（${result.note}）` : ""}`,
        relatedTaskId: taskId,
      });
      return;
    }

    store.updateTask(taskId, {
      status: "handed_off",
      output: result.output,
      assignedAgentId: target.id,
      handoffs: [
        ...task.handoffs,
        { fromAgentId: agent.id, toAgentId: target.id, note: result.note, timestamp: new Date().toISOString() },
      ],
    });
    clearAgent(agent.id);

    store.postMessage({
      channel: "general",
      fromAgentId: agent.id,
      toAgentId: target.id,
      type: "task_handoff",
      content: result.note ?? `「${task.title}」を引き継ぎます。`,
      relatedTaskId: taskId,
    });

    await runTask(taskId, hops + 1);
  }

  /**
   * リスク担当AI社員（ケイオスちゃん）による自発的な物申し。
   * あくまで助言であり、タスクの実行を止めない。懸念がなければ何も投稿しない。
   * レビュー自体が失敗しても本来のディスパッチ処理には影響させない。
   */
  async function runRiskReviewIfAvailable(directive: string, plan: DecompositionPlan): Promise<void> {
    const reviewer = store.getAgent(RISK_REVIEWER_ID);
    if (!reviewer || !reviewer.enabled) return;

    const planSummary = `${plan.meetingSummary}\n\nタスク一覧:\n${plan.subtasks
      .map((subtask) => `- ${subtask.title}`)
      .join("\n")}`;

    try {
      const review = await reviewDirectiveRisk({
        reviewer,
        directive,
        planSummary,
        recentMessages: store.listMessages(30),
        roster: store.listAgents(),
        llm,
      });
      if (review.hasConcern) {
        store.postMessage({
          channel: "general",
          fromAgentId: reviewer.id,
          type: "pushback",
          content: review.content,
        });
      }
    } catch {
      // 物申し機能はあくまで付加価値のため、失敗しても本来のディスパッチ処理は継続する
    }
  }

  async function dispatchDirective(directive: string): Promise<void> {
    store.postMessage({
      channel: "command_center",
      fromAgentId: "user",
      type: "directive",
      content: directive,
    });

    const strategist = store.getAgent(STRATEGIST_ID);
    const architect = store.getAgent(ARCHITECT_ID);
    if (!strategist || !architect) {
      throw new Error("セイラちゃん / レヴィちゃんが見つかりません。エージェント構成を確認してください。");
    }

    const meeting = store.startMeeting({
      topic: directive,
      participantAgentIds: [strategist.id, architect.id],
    });
    store.setAgentStatus(strategist.id, { status: "meeting", currentTaskSummary: "作戦会議中" });
    store.setAgentStatus(architect.id, { status: "meeting", currentTaskSummary: "作戦会議中" });

    let plan;
    try {
      plan = await decomposeDirective({
        directive,
        strategist,
        architect,
        roster: store.listAgents(),
        llm,
      });
    } catch (error) {
      store.endMeeting(meeting.id);
      clearAgent(strategist.id);
      clearAgent(architect.id);
      store.postMessage({
        channel: "general",
        fromAgentId: strategist.id,
        type: "system_log",
        content: `タスク分解中にエラーが発生しました: ${(error as Error).message}`,
      });
      throw error;
    }

    store.endMeeting(meeting.id);
    clearAgent(strategist.id);
    clearAgent(architect.id);

    store.postMessage({
      channel: "general",
      fromAgentId: strategist.id,
      type: "chat",
      content: plan.meetingSummary,
    });

    await runRiskReviewIfAvailable(directive, plan);

    const createdTaskIds: string[] = [];
    for (const subtask of plan.subtasks) {
      const assignee = store.getAgent(subtask.assignedAgentId) ?? architect;
      const task = store.createTask({
        title: subtask.title,
        description: subtask.description,
        priority: subtask.priority,
        outputType: subtask.outputType,
        createdBy: "user",
        assignedAgentId: assignee.id,
        approval: { required: subtask.requiresApprovalHint, status: "pending" },
        tags: [],
      });
      createdTaskIds.push(task.id);
      store.postMessage({
        channel: "general",
        fromAgentId: strategist.id,
        toAgentId: assignee.id,
        type: "task_handoff",
        content: `「${task.title}」をお願いします。`,
        relatedTaskId: task.id,
      });
    }

    await Promise.all(createdTaskIds.map((id) => runTask(id)));
  }

  async function dispatchMention(agentId: string, directive: string): Promise<void> {
    const agent = store.getAgent(agentId);
    if (!agent || !agent.enabled) {
      throw new Error(`指定されたAI社員（${agentId}）が見つからないか、無効化されています。`);
    }

    store.postMessage({
      channel: "command_center",
      fromAgentId: "user",
      toAgentId: agent.id,
      type: "directive",
      content: directive,
    });

    const task = store.createTask({
      title: directive.slice(0, 40),
      description: directive,
      priority: "medium",
      outputType: "text",
      createdBy: "user",
      assignedAgentId: agent.id,
      approval: { required: false, status: "pending" },
      tags: [],
    });

    await runTask(task.id);
  }

  return { dispatchDirective, dispatchMention };
}
