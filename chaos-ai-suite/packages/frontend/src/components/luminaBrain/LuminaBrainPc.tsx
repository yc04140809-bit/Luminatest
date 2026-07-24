import { Cpu } from "lucide-react";
import { LUMINA_BRAIN_PC_POSITION } from "../../lumina-brain/luminaBrainPcPosition.js";

interface LuminaBrainPcProps {
  onOpen: () => void;
}

/**
 * オフィス背景（右壁面のディスプレイ）に重ねる、Lumina Brainへの入口オブジェクト。
 * 座標・大きさは luminaBrainPcPosition.ts の設定値だけを見て決まる（このファイルに座標を増やさない）。
 * デスクトップ/スマホでタップ領域を変えたいため、表示を2つに分けてTailwindのブレークポイントで切り替える
 * （どちらも同じonOpenを呼ぶだけの、見た目の出し分け）。
 */
export function LuminaBrainPc({ onOpen }: LuminaBrainPcProps) {
  const pos = LUMINA_BRAIN_PC_POSITION;

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Lumina Brainを開く"
        title="LUMINA BRAIN — My Chaos Central Intelligence"
        className="absolute hidden min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-purple-400/50 bg-black/40 px-2 py-1.5 text-center backdrop-blur-sm transition hover:border-purple-300 hover:bg-black/60 md:flex"
        style={{
          left: `${pos.xPct}%`,
          top: `${pos.yPct}%`,
          transform: `translate(-50%, -50%) scale(${pos.scale})`,
        }}
      >
        <Cpu size={16} className="text-purple-300" aria-hidden="true" />
        <span className="font-display text-[9px] leading-tight text-purple-200">LUMINA BRAIN</span>
        <span className="text-[7px] leading-tight text-purple-300/70">My Chaos Central Intelligence</span>
      </button>

      <button
        type="button"
        onClick={onOpen}
        aria-label="Lumina Brainを開く"
        title="LUMINA BRAIN — My Chaos Central Intelligence"
        className="absolute flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg border border-purple-400/50 bg-black/40 px-2 py-1.5 text-center backdrop-blur-sm transition active:bg-black/60 md:hidden"
        style={{
          left: `${pos.mobileXPct}%`,
          top: `${pos.mobileYPct}%`,
          transform: `translate(-50%, -50%) scale(${pos.mobileScale})`,
        }}
      >
        <Cpu size={16} className="text-purple-300" aria-hidden="true" />
        <span className="font-display text-[9px] leading-tight text-purple-200">LUMINA BRAIN</span>
      </button>
    </>
  );
}
