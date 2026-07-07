import {
  AlertTriangle,
  ArrowRightLeft,
  Crown,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { MessageType } from "@chaos-ai-suite/shared";

const MESSAGE_ICONS: Record<MessageType, LucideIcon> = {
  chat: MessageCircle,
  task_handoff: ArrowRightLeft,
  status_update: RefreshCw,
  approval_request: ShieldAlert,
  directive: Crown,
  system_log: AlertTriangle,
};

export function getMessageIcon(type: MessageType): LucideIcon {
  return MESSAGE_ICONS[type];
}
