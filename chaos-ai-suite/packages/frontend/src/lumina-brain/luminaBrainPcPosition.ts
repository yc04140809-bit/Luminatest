/**
 * オフィス背景写真（office-day.png / office-night.png）上の、Lumina Brain入口オブジェクトの座標設定。
 * 既存の紫色ウォールディスプレイ（右壁面、どのAI社員のデスクとも重ならない位置）に重ねる想定の初期値。
 * 実機（ブラウザ・スマホ）で見た目を確認し、既存デスクと重ならないよう必要に応じて調整すること
 * （deskAnchors.tsのエージェント座標と同じ「%指定・アスペクト比固定」の考え方）。
 */
export interface LuminaBrainPcPosition {
  xPct: number;
  yPct: number;
  scale: number;
  mobileXPct: number;
  mobileYPct: number;
  mobileScale: number;
}

export const LUMINA_BRAIN_PC_POSITION: LuminaBrainPcPosition = {
  xPct: 93,
  yPct: 19,
  scale: 1,
  mobileXPct: 93,
  mobileYPct: 19,
  // スマホはタップ領域を確保するため見た目をやや大きくする（最小44px四方の目安に近づける）
  mobileScale: 1.3,
};
