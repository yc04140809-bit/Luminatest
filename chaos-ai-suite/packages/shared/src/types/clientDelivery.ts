/**
 * Client Delivery Mode（クライアント案件モード）の型定義。
 *
 * 依頼者ヒアリング → 整理・分析 → 自動化分類 → MVP提案 → 人間承認 →
 * Claude Code実装指示書生成 → 案件データ保存、までを一気通貫で扱う。
 *
 * 最重要原則: AIは「整理・分析・提案・分類・指示書生成」のみを担当する。
 * MVP決定・契約内容・金額・納期・外部送信・個人情報利用・データ削除・本番公開・
 * Git push・デプロイ・課金処理・外部サービス接続は、必ず人間が最終判断する。
 * この型定義のどこにも「AIが自動承認する」「AIが自動実行する」ためのフィールドは存在しない。
 */

export type ClientProjectStatus =
  | "NEW"
  | "INTERVIEW"
  | "ANALYSIS"
  | "AUTOMATION_CLASSIFICATION"
  | "MVP_PROPOSAL"
  | "WAITING_MVP_APPROVAL"
  | "MVP_APPROVED"
  | "IMPLEMENTATION_SPEC_GENERATION"
  | "READY_FOR_BUILD"
  // 将来用（Phase 3以降）。今回はBUILDING以降への自動遷移・自動実行を一切実装しない。
  | "BUILDING"
  | "TESTING"
  | "SECURITY_REVIEW"
  | "WAITING_RELEASE_APPROVAL"
  | "DELIVERY"
  | "COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export const CLIENT_PROJECT_STATUS_LABELS: Record<ClientProjectStatus, string> = {
  NEW: "新規",
  INTERVIEW: "ヒアリング中",
  ANALYSIS: "整理・分析中",
  AUTOMATION_CLASSIFICATION: "自動化判定中",
  MVP_PROPOSAL: "MVP提案中",
  WAITING_MVP_APPROVAL: "MVP承認待ち",
  MVP_APPROVED: "MVP承認済み",
  IMPLEMENTATION_SPEC_GENERATION: "実装指示書生成中",
  READY_FOR_BUILD: "実装準備完了",
  BUILDING: "実装中（未実装フェーズ）",
  TESTING: "テスト中（未実装フェーズ）",
  SECURITY_REVIEW: "セキュリティレビュー中（未実装フェーズ）",
  WAITING_RELEASE_APPROVAL: "公開承認待ち（未実装フェーズ）",
  DELIVERY: "納品中（未実装フェーズ）",
  COMPLETED: "完了",
  ON_HOLD: "保留",
  CANCELLED: "キャンセル",
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "低（個人情報なし・一般情報）",
  MEDIUM: "中（社内情報を扱う）",
  HIGH: "高（個人情報・金銭・医療・契約）",
  CRITICAL: "重大（重大意思決定・自動外部実行を含む）",
};

export interface ClientProjectDraft {
  name: string;
  clientName: string;
  industry: string;
  contactName: string;
  contactNote: string;
  memo: string;
}

export type InterviewCategory =
  | "goal" | "current_workflow" | "users" | "requirements" | "constraints" | "risk" | "other";

export const INTERVIEW_CATEGORY_LABELS: Record<InterviewCategory, string> = {
  goal: "目的・成功条件",
  current_workflow: "現状の業務・課題",
  users: "利用者",
  requirements: "必要な機能",
  constraints: "制約（予算・納期・環境）",
  risk: "リスク（個人情報・金銭・法律等）",
  other: "その他",
};

export interface InterviewEntry {
  id: string;
  question: string;
  answer: string;
  category: InterviewCategory;
  createdAt: string;
}

/** ヒアリング完了判定に使う7項目。すべて揃った時点でAIは完了候補とする（人間も「ヒアリング完了」ボタンでいつでも終了できる）。 */
export type InterviewCoverageKey =
  | "problem" | "user" | "currentWorkflow" | "desiredOutcome" | "constraints" | "criticalRequirements" | "riskFactors";

export const INTERVIEW_COVERAGE_LABELS: Record<InterviewCoverageKey, string> = {
  problem: "課題",
  user: "利用者",
  currentWorkflow: "現状の業務フロー",
  desiredOutcome: "望む結果",
  constraints: "制約",
  criticalRequirements: "必須要件",
  riskFactors: "リスク要因",
};

export const INTERVIEW_BASE_QUESTIONS: string[] = [
  "何を作りたいですか？",
  "現在どんな業務で困っていますか？",
  "誰が使いますか？",
  "現在どのように対応していますか？",
  "一番時間がかかっている作業は何ですか？",
  "一番ミスが起きやすい作業は何ですか？",
  "絶対に必要な機能は何ですか？",
  "あれば便利な機能は何ですか？",
  "使っているサービス・Excel・システムはありますか？",
  "外部APIとの連携は必要ですか？",
  "個人情報・機密情報を扱いますか？",
  "金銭処理はありますか？",
  "法律・医療・介護・採用・人事など重要判断を含みますか？",
  "希望納期はありますか？",
  "予算感はありますか？",
  "スマホ中心ですか？PC中心ですか？",
  "利用人数は何人ですか？",
  "既存データ移行は必要ですか？",
  "最終的に何ができれば「成功」と言えますか？",
  "絶対にしてほしくないことはありますか？",
];

export interface RequirementItem {
  title: string;
  description: string;
}

export interface ProjectAnalysis {
  projectSummary: string;
  targetUser: string;
  currentSituation: string;
  mainProblem: string;
  rootCause: string;
  desiredOutcome: string;
  /** Solution Bias防止: 依頼者の最初の解決策をそのまま採用せず、Problem→Possible Solutions→Recommended Solutionの順で検討する。 */
  possibleSolutions: string[];
  recommendedSolution: string;
  mustHave: RequirementItem[];
  shouldHave: RequirementItem[];
  niceToHave: RequirementItem[];
  outOfScope: RequirementItem[];
  budget: string;
  deadline: string;
  device: string;
  userCount: string;
  technicalConstraints: string;
  legalCompliance: string;
  privacy: string;
  security: string;
  successCriteria: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  generatedAt: string;
}

export type AutomationClassification = "AUTOMATE" | "ASSIST" | "HUMAN_REQUIRED" | "DO_NOT_AUTOMATE";

export const AUTOMATION_CLASSIFICATION_LABELS: Record<AutomationClassification, string> = {
  AUTOMATE: "自動化候補",
  ASSIST: "AI支援＋人間確認",
  HUMAN_REQUIRED: "人間承認が原則必要",
  DO_NOT_AUTOMATE: "自動化禁止候補",
};

export interface AutomationCandidate {
  id: string;
  name: string;
  classification: AutomationClassification;
  /** 0〜100。Repetition/Rule Clarity/Data Availability/Time Saving/Error Reduction等を総合したスコア。 */
  automationScore: number;
  implementationDifficulty: number;
  securityRisk: number;
  legalRisk: number;
  reason: string;
  recommendedApproach: string;
}

export interface MvpProposal {
  id: string;
  /** "A" | "B" | "C" */
  label: string;
  title: string;
  description: string;
  targetUser: string;
  problemSolved: string;
  includedFeatures: string[];
  excludedFeatures: string[];
  implementationDifficulty: number;
  estimatedCostRange: string;
  estimatedDuration: string;
  riskLevel: RiskLevel;
  futureExpansion: string[];
  businessImpact: number;
  userValue: number;
  timeToValue: number;
  cost: number;
  securityRisk: number;
  legalRisk: number;
  maintenanceCost: number;
  totalScore: number;
  /** AIのおすすめ表示のみ。最終決定は人間（MvpApproval）が行う。 */
  isRecommended: boolean;
}

export type MvpApprovalStatus = "approved" | "modify_requested" | "re_proposal_requested" | "on_hold";

export const MVP_APPROVAL_STATUS_LABELS: Record<MvpApprovalStatus, string> = {
  approved: "承認",
  modify_requested: "修正依頼",
  re_proposal_requested: "再提案依頼",
  on_hold: "保留",
};

export interface MvpApproval {
  id: string;
  mvpProposalId: string;
  status: MvpApprovalStatus;
  approvedBy: string;
  approvedAt: string;
  note: string;
}

export interface ImplementationSpec {
  id: string;
  version: number;
  content: string;
  generatedAt: string;
}

/** AI推奨と人間の最終判断が異なった場合等に記録する（将来の納品資料に利用可能）。 */
export interface HumanDecisionEntry {
  id: string;
  aiRecommendation: string;
  humanDecision: string;
  reason: string;
  createdAt: string;
}

export type AuditLogEventType =
  | "project_created" | "interview_completed" | "analysis_generated"
  | "mvp_proposed" | "mvp_approved" | "implementation_spec_generated";

export const AUDIT_LOG_EVENT_LABELS: Record<AuditLogEventType, string> = {
  project_created: "案件作成",
  interview_completed: "ヒアリング完了",
  analysis_generated: "分析生成",
  mvp_proposed: "MVP提案",
  mvp_approved: "MVP承認判断",
  implementation_spec_generated: "実装指示書生成",
};

export interface AuditLogEntry {
  id: string;
  event: AuditLogEventType;
  detail: string;
  createdAt: string;
}

/** AI呼び出しごとのモデル使用量。将来のコストダッシュボード拡張に備えた記録用インターフェース（今回はダッシュボード自体は作らない）。 */
export interface AiUsageRecord {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  projectId: string;
  taskType: string;
  timestamp: string;
}

/** Client Delivery Modeの案件（集約ルート）。officeStoreにインメモリで保持し、WebSocketで進行状況を配信する。 */
export interface ClientProject {
  id: string;
  name: string;
  clientName: string;
  industry: string;
  contactName: string;
  contactNote: string;
  memo: string;
  status: ClientProjectStatus;
  riskLevel: RiskLevel;

  interviews: InterviewEntry[];
  nextQuestion?: string;
  interviewComplete: boolean;
  interviewCoverage: InterviewCoverageKey[];

  analysis?: ProjectAnalysis;
  automationCandidates: AutomationCandidate[];
  mvpProposals: MvpProposal[];
  mvpApproval?: MvpApproval;
  implementationSpecs: ImplementationSpec[];

  decisionLog: HumanDecisionEntry[];
  auditLog: AuditLogEntry[];
  usageLog: AiUsageRecord[];

  errorMessage?: string;

  createdAt: string;
  updatedAt: string;
}
