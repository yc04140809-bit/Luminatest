/** 代表からの指示投入・承認操作・設定変更用のAPIクライアント。状態そのものは /ws/office 経由で反映される。 */
import type {
  AgentDraft,
  BrandProfileUpdateInput,
  CaseQualityResult,
  CaseRequirements,
  ClientQuestions,
  DeliveryPack,
  NoteAnalysisResult,
  NoteEditLevelId,
  NoteEditModeId,
  NoteEditResult,
  NotePromoPack,
  NoteStructureTemplateId,
  ScoutAnalysis,
  SnsAnalysisResult,
  SnsMetrics,
  ThemeUpdateInput,
  TrendArticleResult,
  TrendResearchResult,
  TrendSource,
  TrendTheme,
} from "@chaos-ai-suite/shared";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendJson(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

async function sendDelete(path: string): Promise<void> {
  const res = await fetch(path, { method: "DELETE" });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? `request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** 全体指示。targetAgentIdを指定すると、その社員への個別メンション指示になる。 */
export function postDirective(directive: string, targetAgentId?: string): Promise<void> {
  return sendJson("POST", "/api/directives", targetAgentId ? { directive, targetAgentId } : { directive });
}

export function approveTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/approve`, { comment });
}

export function rejectTask(taskId: string, comment?: string): Promise<void> {
  return sendJson("POST", `/api/tasks/${taskId}/reject`, { comment });
}

/** 管理画面からのプリセット切り替え・カラー上書き。 */
export function updateTheme(patch: ThemeUpdateInput): Promise<void> {
  return sendJson("PATCH", "/api/theme", patch);
}

/** ブランド設定画面からの部分更新。反映結果はWebSocket経由で届く。 */
export function updateBrandProfile(patch: BrandProfileUpdateInput): Promise<void> {
  return sendJson("PATCH", "/api/brand-profile", patch);
}

/** ブランド設定を初期値（ケイオス師匠ブランド）へ戻す。 */
export function resetBrandProfile(): Promise<void> {
  return sendJson("POST", "/api/brand-profile/reset", {});
}

export function updateAgent(agentId: string, patch: Partial<AgentDraft>): Promise<void> {
  return sendJson("PATCH", `/api/agents/${agentId}`, patch);
}

export function createAgent(draft: AgentDraft): Promise<void> {
  return sendJson("POST", "/api/agents", draft);
}

export function deleteAgent(agentId: string): Promise<void> {
  return sendDelete(`/api/agents/${agentId}`);
}

/** 外部連携用APIキーの設定状態（値そのものは含まれない）。 */
export interface SecretStatus {
  key: string;
  label: string;
  group: string;
  configured: boolean;
  /** キーを設定しても既知の理由で機能が使えない場合の注記。 */
  knownLimitation?: string;
}

export function getSecretsStatus(): Promise<SecretStatus[]> {
  return getJson<SecretStatus[]>("/api/secrets");
}

export function setSecret(key: string, value: string): Promise<void> {
  return sendJson("PUT", `/api/secrets/${key}`, { value });
}

export function clearSecret(key: string): Promise<void> {
  return sendDelete(`/api/secrets/${key}`);
}

/** 戦略経営会議を開始する。既に会議が進行中の場合はエラーになる。 */
export function startMeeting(topic: string): Promise<void> {
  return sendJson("POST", "/api/meetings", { topic });
}

/** 朝会ブリーフィングを実行する。本日実施済みの場合はエラーになる。 */
export function postBriefing(): Promise<void> {
  return sendJson("POST", "/api/briefing", {});
}

/** オフィス雑談タイムを開始する。既に進行中の場合はエラーになる。 */
export function postBanter(): Promise<void> {
  return sendJson("POST", "/api/banter", {});
}

/** SNS投稿をミライ（SNS分析AI）に分析させる。LLM呼び出しのため完了まで10〜30秒程度かかる。 */
export function analyzeSnsPost(input: {
  content: string;
  platform: string;
  metrics: SnsMetrics;
}): Promise<SnsAnalysisResult> {
  return postJson<SnsAnalysisResult>("/api/sns/analyze", input);
}

/** 記事をネムリ（note編集AI）に編集させる。長文記事では30〜60秒程度かかる。 */
export function editNoteArticle(input: {
  content: string;
  mode: NoteEditModeId;
  level: NoteEditLevelId;
  template?: NoteStructureTemplateId;
}): Promise<NoteEditResult> {
  return postJson<NoteEditResult>("/api/note/edit", input);
}

/** 完成した記事から宣伝パック（Threads/X/Instagram導線・CTA一式）を生成する。担当はミライ。 */
export function generateNotePromoPack(input: { content: string; useBrandProfile?: boolean }): Promise<NotePromoPack> {
  return postJson<NotePromoPack>("/api/note/promo", input);
}

/** 案件スカウター: 募集案件の受注可否分析（セイラ・判定〜応募文まで1回呼び出し）。 */
export function analyzeScoutCase(input: {
  title: string;
  body: string;
  price?: number;
  applyDeadline?: string;
  deliveryDeadline?: string;
  source?: string;
  category?: string;
}): Promise<ScoutAnalysis> {
  return postJson<ScoutAnalysis>("/api/cases/scout", input);
}

/** 案件工房: 依頼文の要件整理（セイラ・1回呼び出し）。 */
export function organizeCaseRequirements(input: { requestText: string }): Promise<CaseRequirements> {
  return postJson<CaseRequirements>("/api/cases/requirements", input);
}

/** 案件工房: クライアント確認文3種（ネムリ・1回呼び出し）。 */
export function generateCaseQuestions(input: { missingInfo: string[]; questions: string[] }): Promise<ClientQuestions> {
  return postJson<ClientQuestions>("/api/cases/questions", input);
}

/** 案件工房: 作業工程の自動生成（レヴィ・1回呼び出し）。 */
export function generateCaseTasks(input: { requirementsText: string }): Promise<{
  tasks: { title: string; assignedAgentId: string; description: string; completionCriteria: string }[];
}> {
  return postJson("/api/cases/tasks", input);
}

/** 案件工房: 工程1件分の成果物作成・修正（担当AI社員の人格で実行）。 */
export function generateCaseDeliverable(input: {
  agentId?: string;
  caseTitle: string;
  requirementsText: string;
  taskTitle: string;
  taskDescription: string;
  completionCriteria: string;
  currentDraft?: string;
  instruction?: string;
  useBrandProfile?: boolean;
}): Promise<{ title: string; content: string }> {
  return postJson("/api/cases/deliverable", input);
}

/** 案件工房: 案件全体の品質チェック（ケイオス・1回呼び出し）。 */
export function checkCaseQuality(input: { requirementsText: string; deliverablesText: string }): Promise<CaseQualityResult> {
  return postJson<CaseQualityResult>("/api/cases/quality", input);
}

/** 案件工房: 納品パック3種（ネムリ・1回呼び出し）。 */
export function generateCaseDeliveryPack(input: {
  caseTitle: string;
  clientName: string;
  deliverablesSummary: string;
}): Promise<DeliveryPack> {
  return postJson<DeliveryPack>("/api/cases/delivery-pack", input);
}

/** トレンドnote: Web検索つきリサーチ（ミライ・1回呼び出し。30秒〜2分程度かかる）。 */
export function researchTrendTopics(input: { genre: string; audience: string; period: string }): Promise<TrendResearchResult> {
  return postJson<TrendResearchResult>("/api/trend/research", input);
}

/** トレンドnote: 選択テーマから記事・SNS告知・タイトル案・ファクトチェックを一括生成（ネムリ・1回呼び出し）。 */
export function generateTrendArticle(input: {
  theme: TrendTheme;
  sources: TrendSource[];
  researchDate: string;
  genre: string;
  audience: string;
  format: string;
  length: string;
  style: string;
  useBrandProfile?: boolean;
}): Promise<TrendArticleResult> {
  return postJson<TrendArticleResult>("/api/trend/generate", input);
}

/** 選択した部分だけを指示に従って書き直す（選択範囲のみ送信・小さい呼び出し）。 */
export function editNoteSection(input: { section: string; instruction: string }): Promise<{ revisedText: string }> {
  return postJson<{ revisedText: string }>("/api/note/edit-section", input);
}

/** 編集済み記事の読みやすさ診断・離脱ポイント・タイトル案・CTA案を取得する。 */
export function analyzeNoteArticle(input: { content: string }): Promise<NoteAnalysisResult> {
  return postJson<NoteAnalysisResult>("/api/note/analyze", input);
}
