import type { ClientProject } from "@chaos-ai-suite/shared";

/**
 * Client Delivery Modeの案件データに対する表示用の警告チェック（AI不使用）。
 * 実行をブロックするものではなく、画面に注意喚起を出すためだけの純粋関数。
 */
export function validateClientProject(project: ClientProject): string[] {
  const warnings: string[] = [];

  if (project.analysis && !project.analysis.successCriteria.trim()) {
    warnings.push("成功条件（Success Criteria）が未設定です。");
  }
  if (project.analysis && !project.analysis.targetUser.trim()) {
    warnings.push("対象ユーザーが不明です。");
  }
  if (project.analysis && project.analysis.mustHave.length === 0) {
    warnings.push("Must Have要求が0件です。MVPの範囲を決められません。");
  }
  if (project.mvpProposals.length > 0 && !project.mvpApproval) {
    warnings.push("MVPが未承認です。承認前は実装指示書を生成できません。");
  }
  if ((project.riskLevel === "HIGH" || project.riskLevel === "CRITICAL") && project.mvpApproval?.status !== "approved") {
    warnings.push(`リスクレベルが${project.riskLevel}ですが、まだ人間承認が完了していません。`);
  }
  const hasPrivacyConcern = project.analysis?.privacy && project.analysis.privacy !== "未確認" && project.analysis.privacy !== "なし";
  const hasSecurityRequirement = project.analysis?.security && project.analysis.security !== "未確認";
  if (hasPrivacyConcern && !hasSecurityRequirement) {
    warnings.push("個人情報を扱う可能性がありますが、セキュリティ要件が未整理です。");
  }

  return warnings;
}
