import {
  AlertTriangle,
  ArrowRightLeft,
  Coffee,
  Crown,
  Megaphone,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Sunrise,
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
  briefing: Sunrise,
  banter: Coffee,
  pushback: Megaphone,
};

export function getMessageIcon(type: MessageType): LucideIcon {
  return MESSAGE_ICONS[type];
}
