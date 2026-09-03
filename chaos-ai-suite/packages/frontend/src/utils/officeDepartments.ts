/**
 * AI Office画面向けの部署（部屋）マッピング。既存のAgent.roleKeyから導出する純粋データで、
 * バックエンド・既存のAgent型には一切手を加えない。将来PC版のオフィスマップUIでも
 * このマッピングをそのまま再利用できるよう、表示ロジックから完全に分離してある。
 */
import type { AgentRoleKey } from "@chaos-ai-suite/shared";

export interface OfficeDepartment {
  id: string;
  label: string;
}

const DEPARTMENT_BY_ROLE: Record<string, OfficeDepartment> = {
  management: { id: "strategy", label: "戦略室" },
  "dev-spec": { id: "dev", label: "開発室" },
  "customer-care": { id: "customer", label: "接遇室" },
  documentation: { id: "creative", label: "クリエイティブ室" },
  training: { id: "creative", label: "クリエイティブ室" },
  sns: { id: "research", label: "マーケティング・リサーチ室" },
};

const DEFAULT_DEPARTMENT: OfficeDepartment = { id: "general", label: "総務室" };

export function getDepartment(roleKey: AgentRoleKey): OfficeDepartment {
  return DEPARTMENT_BY_ROLE[roleKey] ?? DEFAULT_DEPARTMENT;
}

/** 部署の表示順（戦略→開発→接遇→クリエイティブ→リサーチ→その他）。 */
export const DEPARTMENT_ORDER = ["strategy", "dev", "customer", "creative", "research", "general"];
