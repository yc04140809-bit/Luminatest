import { useEffect, useReducer, useRef } from "react";
import type { OfficeEvent, OfficeState } from "@chaos-ai-suite/shared";

export type SocketStatus = "connecting" | "open" | "closed";

interface OfficeSocketState {
  office: OfficeState | null;
  status: SocketStatus;
}

type Action = { type: "socket_status"; status: SocketStatus } | { type: "office_event"; event: OfficeEvent };

/** office_state_snapshot はreducerが直接処理するため、ここでは差分イベントのみを扱う。 */
function applyEvent(office: OfficeState, event: Exclude<OfficeEvent, { type: "office_state_snapshot" }>): OfficeState {
  switch (event.type) {
    case "agent_updated":
      return { ...office, agents: { ...office.agents, [event.agent.id]: event.agent } };
    case "agent_deleted": {
      const remainingAgents = { ...office.agents };
      delete remainingAgents[event.agentId];
      return { ...office, agents: remainingAgents };
    }
    case "task_updated":
      return { ...office, tasks: { ...office.tasks, [event.task.id]: event.task } };
    case "message_created":
      return { ...office, messages: [...office.messages, event.message] };
    case "meeting_started":
      return { ...office, activeMeetings: [...office.activeMeetings, event.meeting] };
    case "meeting_ended":
      return {
        ...office,
        activeMeetings: office.activeMeetings.filter((meeting) => meeting.id !== event.meetingId),
      };
    case "theme_updated":
      return { ...office, theme: event.theme };
    default: {
      const exhaustiveCheck: never = event;
      return exhaustiveCheck;
    }
  }
}

function reducer(state: OfficeSocketState, action: Action): OfficeSocketState {
  if (action.type === "socket_status") return { ...state, status: action.status };
  if (action.event.type === "office_state_snapshot") {
    return { ...state, office: action.event.state };
  }
  if (!state.office) return state;
  return { ...state, office: applyEvent(state.office, action.event) };
}

const RECONNECT_DELAY_MS = 2000;

/**
 * /ws/office を購読し、OfficeStateをローカルにミラーリングするフック。
 * 接続が切れた場合は自動で再接続を試みる（社内オフィスが常時稼働している前提のUI）。
 */
export function useOfficeSocket(): OfficeSocketState {
  const [state, dispatch] = useReducer(reducer, { office: null, status: "connecting" });
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect(): void {
      if (cancelled) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/office`);
      socketRef.current = socket;
      dispatch({ type: "socket_status", status: "connecting" });

      socket.onopen = () => dispatch({ type: "socket_status", status: "open" });

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data as string) as OfficeEvent;
          dispatch({ type: "office_event", event });
        } catch {
          // 壊れたフレームは無視する
        }
      };

      socket.onclose = () => {
        dispatch({ type: "socket_status", status: "closed" });
        if (!cancelled) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, []);

  return state;
}
