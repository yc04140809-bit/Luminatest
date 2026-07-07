/**
 * office-day.png / office-night.png（同一アングルの背景写真）上で、
 * 各AI社員のデスクが実際に写っている位置。画像サイズに対する割合(%)で指定し、
 * コンテナのaspect-ratioを固定することでレスポンシブでもズレないようにする。
 */
export const DESK_ANCHORS: Record<string, { xPct: number; yPct: number }> = {
  "agent-chaos": { xPct: 21, yPct: 33 },
  "agent-aria": { xPct: 50, yPct: 33 },
  "agent-levi": { xPct: 79, yPct: 33 },
  "agent-nemuri": { xPct: 16, yPct: 72 },
  "agent-mirai": { xPct: 50, yPct: 72 },
  "agent-sayla": { xPct: 84, yPct: 72 },
};

/** アンカー未定義のエージェント（GUIで追加された等）は、それらしい位置にフォールバックする。 */
export const DEFAULT_DESK_ANCHOR = { xPct: 50, yPct: 50 };

export function getDeskAnchor(agentId: string): { xPct: number; yPct: number } {
  return DESK_ANCHORS[agentId] ?? DEFAULT_DESK_ANCHOR;
}
