import type { Agent } from "@chaos-ai-suite/shared";

interface ChibiAvatarProps {
  agent: Agent;
  /** タイピング/思考など「作業中」を示すハンドモーションを有効にするか */
  active: boolean;
}

const SKIN_TONE = "#ffdfc4";
const UNIFORM_COLOR = "#1c1b28";

/**
 * コードだけで描画する、呼吸・まばたき・タイピング動作を持つちびキャラクター。
 * 髪と襟元の色はagent.accentColorに追従し、管理画面でのカラー変更にも即座に反応する。
 * agent.avatarUrlが設定されている場合はAgentDesk側でこちらの代わりに実イラストを表示する。
 */
export function ChibiAvatar({ agent, active }: ChibiAvatarProps) {
  const accent = agent.accentColor;

  return (
    <svg viewBox="0 0 64 64" width={46} height={46} className="overflow-visible">
      <g className="chibi-breathe">
        {/* 後ろ髪 */}
        <path d="M14 26 Q12 10 32 8 Q52 10 50 26 Q50 34 44 34 L20 34 Q14 34 14 26 Z" fill={accent} />

        {/* 頭 */}
        <circle cx={32} cy={26} r={14} fill={SKIN_TONE} />

        {/* 前髪 */}
        <path
          d="M18 22 Q20 12 32 12 Q44 12 46 22 Q40 16 32 16 Q24 16 18 22 Z"
          fill={accent}
        />

        {/* 目（まばたき） */}
        <g className="chibi-eyes">
          <ellipse cx={26.5} cy={27} rx={2} ry={2.6} fill="#2a2438" />
          <ellipse cx={37.5} cy={27} rx={2} ry={2.6} fill="#2a2438" />
        </g>

        {/* 口 */}
        <path d="M28.5 32 Q32 34.5 35.5 32" stroke="#a15c4a" strokeWidth={1.2} fill="none" strokeLinecap="round" />

        {/* ブレザー */}
        <path d="M16 60 Q16 40 32 40 Q48 40 48 60 Z" fill={UNIFORM_COLOR} />

        {/* 襟元アクセント */}
        <path d="M28 40 L32 47 L36 40 Z" fill={accent} />

        {/* 手（作業中はタイピングモーション） */}
        <g className={active ? "chibi-hand-left" : undefined}>
          <circle cx={22} cy={57} r={3.4} fill={SKIN_TONE} />
        </g>
        <g className={active ? "chibi-hand-right" : undefined}>
          <circle cx={42} cy={57} r={3.4} fill={SKIN_TONE} />
        </g>

        {/* デスクの縁 */}
        <rect x={12} y={59} width={40} height={2.5} rx={1.25} fill={accent} opacity={0.5} />
      </g>
    </svg>
  );
}
