import { Briefcase, Code, FileText, GraduationCap, Megaphone, Shield, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgentRoleKey } from "@chaos-ai-suite/shared";

const ROLE_ICONS: Partial<Record<AgentRoleKey, LucideIcon>> = {
  "customer-care": Shield,
  documentation: FileText,
  training: GraduationCap,
  "dev-spec": Code,
  sns: Megaphone,
  management: Briefcase,
};

export function getAgentIcon(roleKey: AgentRoleKey): LucideIcon {
  return ROLE_ICONS[roleKey] ?? User;
}
