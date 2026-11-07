import { useEffect, useRef, useState } from 'react';
import { battleEnemyArt, battlePartyArt } from '../ui/battle/battleArt';
import { battleBackgroundArt } from '../assets/battleBackground';
import { SpecialFx } from '../ui/fx/special/SpecialFx';
import { SPECIAL_FX, SKILL_SPECIAL_FX, type SpecialEffectType } from '../ui/fx/special/specialFx';
import { screenShake, hitStop } from '../ui/fx/screenShake';
import { camera } from '../ui/fx/camera';
import { playSfx } from '../platform/audio';

/**
 * `?preview=fx` — EACH CHARACTER'S OWN EFFECTS, ONE BUTTON EACH (DEBUG builds only).
 *
 * A still field (the grassland, a creature on the left, the three on the right) and every effect of
 * ui/fx/special played where it stands in a fight: グレイヴ's 重撃 and 豪断 on the creature, the
 * hero's red moon, 月影 and its counter, the twelve blades and the spider lily (samples), 零閃・天衝
 * over the whole picture, ケイオス's wings behind her. ×2, a giant or an ordinary creature, and the
 * jolts on or off, to look at each the way a fight would show it. Nothing is kept.
 *
 *   &fx=grave_juugeki   that one on opening
 */
type Where = 'foe' | 'hero' | 'grave' | 'kaos' | 'screen';

const BUTTONS: { label: string; plays: { type: SpecialEffectType; on: Where; at: number }[]; shake?: { at: number; level: 'small' | 'medium' | 'large'; stop?: number }[] }[] = [
  { label: 'グレイヴ 重撃', plays: [{ type: 'grave_juugeki', on: 'foe', at: 0 }], shake: [{ at: 60, level: 'medium', stop: 100 }] },
  {
    label: 'グレイヴ 豪断',
    plays: [
      { type: 'grave_goudan_charge', on: 'grave', at: 0 },
      { type: 'grave_goudan', on: 'foe', at: 160 },
    ],
    shake: [{ at: 210, level: 'large', stop: 120 }],
  },
  {
    label: 'グレイヴ 重撃・豪断（実戦）',
    plays: [
      { type: 'grave_juugeki', on: 'foe', at: 120 },
      { type: 'grave_goudan_charge', on: 'grave', at: 300 },
      { type: 'grave_goudan', on: 'foe', at: 460 },
    ],
    shake: [
      { at: 180, level: 'medium', stop: 100 },
      { at: 610, level: 'large', stop: 120 },
    ],
  },
  { label: '主人公 零閃・天衝', plays: [{ type: 'protagonist_zero_tenshou', on: 'screen', at: 0 }], shake: [{ at: 420, level: 'small' }] },
  { label: '主人公 赤黒の三日月（瞬断）', plays: [{ type: 'protagonist_redmoon_slash', on: 'foe', at: 0 }] },
  { label: '主人公 月影の構え', plays: [{ type: 'protagonist_counter_moon', on: 'hero', at: 0 }] },
  {
    label: '主人公 月影の反撃',
    plays: [
      { type: 'protagonist_counter_release', on: 'hero', at: 0 },
      { type: 'protagonist_counter_slash', on: 'foe', at: 40 },
    ],
  },
  { label: '主人公 月影の回避', plays: [{ type: 'protagonist_evade', on: 'hero', at: 0 }] },
  { label: '主人公 十二方向（試作）', plays: [{ type: 'protagonist_multi_slash', on: 'foe', at: 0 }], shake: [{ at: 150, level: 'small' }] },
  { label: '主人公 彼岸花（試作）', plays: [{ type: 'protagonist_higanbana', on: 'foe', at: 0 }] },
  { label: 'ケイオス 双翼', plays: [{ type: 'kaos_twin_wings', on: 'kaos', at: 0 }] },
  { label: 'ケイオス 双翼（軽）', plays: [{ type: 'kaos_twin_wings_light', on: 'kaos', at: 0 }] },
];

export function FxPreview({ params }: { params: URLSearchParams }) {
  const [bg, setBg] = useState<string | null>(null);
  const [giant, setGiant] = useState(true);
  const [fast, setFast] = useState(false);
  const [jolts, setJolts] = useState(true);
  const [run, setRun] = useState<{ n: number; i: number } | null>(() => {
    const first = BUTTONS.findIndex((b) => b.plays.some((p) => p.type === params.get('fx')));
    return first >= 0 ? { n: 1, i: first } : null;
  });
  const field = useRef<HTMLDivElement>(null);
  useEffect(() => void battleBackgroundArt('GRASSLAND').then(setBg), []);
  const k = fast ? 0.5 : 1;
  const foe = battleEnemyArt(giant ? 'valsheel' : 'moss_rabbit', 'front').asset?.src ?? null;
  const party = (id: 'hero' | 'grave' | 'kaos') => battlePartyArt(id, 'battle_idle').asset?.src ?? null;

  const play = (i: number) => {
    setRun((r) => ({ n: (r?.n ?? 0) + 1, i }));
    const b = BUTTONS[i];
    for (const p of b.plays) {
      const sfx = SPECIAL_FX[p.type].sfx;
      if (sfx) window.setTimeout(() => sfx.forEach((id) => playSfx(id)), (p.at + SPECIAL_FX[p.type].impact) * k);
    }
    if (!jolts) return;
    for (const s of b.shake ?? []) {
      window.setTimeout(() => {
        const at = field.current ?? undefined;
        void hitStop((s.stop ?? 0) * k, at).then(() => screenShake(s.level, at));
      }, s.at * k);
    }
    if (b.plays.some((p) => p.on === 'screen')) void camera({ kind: 'PUSH_IN', strength: 'small' }, field.current ?? undefined);
  };
  const shown = run ? BUTTONS[run.i] : null;
  const on = (where: Where) =>
    shown?.plays
      .filter((p) => p.on === where)
      .map((p, j) => <SpecialFx key={`${run!.n}-${j}`} type={p.type} delay={p.at * k} k={k} giant={where === 'foe' && giant} figure={where === 'hero' ? party('hero') : null} />);

  return (
    <div className="screen" data-testid="fx-preview" style={{ position: 'relative', overflow: 'hidden', background: '#111' }}>
      {bg && <img src={bg} alt="" data-shake-layer="backdrop" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.86)' }} />}
      <div ref={field} data-shake-layer="field" style={{ position: 'absolute', inset: 0 }}>
        <div data-testid="fx-foe" style={giant ? { position: 'absolute', left: '-8%', bottom: 0, height: '114%', width: '42%' } : { position: 'absolute', left: '12%', bottom: '18%', height: '26%', width: '10%' }}>
          {foe && <img src={foe} alt="" style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: 'bottom left' }} />}
          {on('foe')}
        </div>
        {(
          [
            ['grave', '44%', '14%', '42%'],
            ['hero', '56%', '6%', '40%'],
            ['kaos', '68%', '18%', '40%'],
          ] as const
        ).map(([id, left, bottom, height]) => (
          <div key={id} data-testid={`fx-${id}`} style={{ position: 'absolute', left, bottom, height, isolation: 'isolate' }}>
            {party(id) && <img src={party(id)!} alt="" style={{ position: 'relative', height: '100%', width: 'auto', display: 'block' }} />}
            {on(id)}
          </div>
        ))}
        {on('screen')}
      </div>
      <div style={{ position: 'absolute', right: 6, top: 6, bottom: 6, width: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, zIndex: 20 }}>
        {BUTTONS.map((b, i) => (
          <button key={b.label} className="btn" data-testid={`fx-play-${i}`} onClick={() => play(i)} style={{ fontSize: 12, padding: '4px 6px', minHeight: 0 }}>
            {b.label}
          </button>
        ))}
        <label style={{ color: '#fff', fontSize: 12 }}>
          <input type="checkbox" checked={giant} onChange={(e) => setGiant(e.target.checked)} /> 大型（ヴァルシール）
        </label>
        <label style={{ color: '#fff', fontSize: 12 }}>
          <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} /> ×2
        </label>
        <label style={{ color: '#fff', fontSize: 12 }}>
          <input type="checkbox" checked={jolts} onChange={(e) => setJolts(e.target.checked)} /> 揺れ・ヒットストップ
        </label>
        <small style={{ color: '#ccc', fontSize: 10 }}>技の旗：{Object.entries(SKILL_SPECIAL_FX).map(([id, t]) => `${id}→${t.join('+')}`).join(' / ')}</small>
      </div>
    </div>
  );
}
