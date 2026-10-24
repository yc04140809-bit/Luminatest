import type { CSSProperties } from 'react';
import { SPECIAL_FX, type SpecialEffectType } from './specialFx';
import { SPECIAL_FX_ART } from './specialFxArt';
import './specialFx.css';

/**
 * One of the characters' own effects (specialFx.ts), drawn where it is put:
 * inside the one struck (ground / body), the one acting (back — behind their
 * drawing), or a whole picture (screen). CSS only — every layer starts at
 * its own time after `delay` and is gone by itself; nothing waits on it.
 *
 *   delay   ms before it starts (the blow it belongs to)
 *   k       how fast: 1, or 0.5 at ×2
 *   giant   drawn bigger, for a creature the size of ヴァルシール
 *   flip    turned the other way (a blow from the left)
 *   turn    tilted (deg) — the same cut made again at another angle (《瞬断》's two, 《彼岸花》's three)
 *   scale   bigger or smaller (《彼岸花》: two small quick cuts, a big third)
 *   figure  the drawing of the one it is on (the dodge's outline is made of it)
 */
export function SpecialFx({
  type,
  delay = 0,
  k = 1,
  giant = false,
  flip = false,
  turn = 0,
  scale = 1,
  figure,
}: {
  type: SpecialEffectType;
  delay?: number;
  k?: number;
  giant?: boolean;
  flip?: boolean;
  turn?: number;
  scale?: number;
  figure?: string | null;
}) {
  const spec = SPECIAL_FX[type];
  const style = { '--sx-delay': Math.round(delay), '--sx-k': k, '--sx-flip': flip ? -1 : 1, ...(turn ? { rotate: `${turn}deg` } : {}), ...(scale !== 1 ? { scale: String(scale) } : {}) } as CSSProperties;
  return (
    <span
      className={`sx sx-${spec.anchor} sx-own-${spec.owner} ${type}${giant ? ' giant' : ''}`}
      data-testid="special-fx"
      data-type={type}
      data-owner={spec.owner}
      aria-hidden="true"
      style={style}
    >
      {spec.layers.map((l) => {
        const vars = { '--a': l.at, '--d': l.ms } as CSSProperties;
        const cls = `sx-l ${l.part}`;
        if (l.part === 'ev-outline') return figure ? <img key={l.part} className={cls} src={figure} alt="" style={vars} /> : null;
        if (l.art) return <img key={l.part} className={cls} src={SPECIAL_FX_ART[l.art]} alt="" style={vars} />;
        return (
          <i key={l.part} className={cls} style={vars}>
            {l.count
              ? Array.from({ length: l.count }, (_, i) => <b key={i} style={flight(i, l.count!)} />)
              : null}
          </i>
        );
      })}
    </span>
  );
}

/**
 * Where each of several small things goes (a shard, a mote): a fan upward and outward, the same
 * every time — dx, dy at the top of its flight (px), and how far it turns (deg).
 */
function flight(i: number, n: number): CSSProperties {
  const angle = Math.PI * (1.08 + (0.84 * i) / Math.max(1, n - 1));
  const dist = 44 + ((i * 17) % 30);
  return {
    ['--dx' as string]: Math.round(Math.cos(angle) * dist),
    ['--dy' as string]: Math.round(Math.sin(angle) * dist),
    ['--r' as string]: (i % 2 ? 1 : -1) * (120 + i * 25),
  } as CSSProperties;
}
