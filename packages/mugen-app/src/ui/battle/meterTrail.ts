import { useEffect, type RefObject } from 'react';

/**
 * HP の赤い残像 (作者 2026-10-16「HP減少時の赤い残像ゲージ」) for the battle HUD's meters.
 *
 * The meters are the Artifact's (BattleHud.tsx, copied as it is): each fill is revealed by its own
 * `--fill`, and clips whatever is inside it. So the trail is drawn by the meter's TRACK (behind the
 * fill, battle.app.css), and this keeps the track's `--trail` equal to its fill's `--fill`. The
 * stylesheet's transition does the rest: when the fill drops, the trail stays a moment where it was
 * and then follows it down — the damage seen. Nothing here reads or changes a number.
 */
export function syncMeterTrails(root: ParentNode): void {
  for (const fill of Array.from(root.querySelectorAll<HTMLElement>('.bx-meter-fill'))) {
    const track = fill.parentElement;
    if (!track) continue;
    const value = fill.style.getPropertyValue('--fill');
    if (value && track.style.getPropertyValue('--trail') !== value) track.style.setProperty('--trail', value);
  }
  // A party member's HP is a ring: its trail is a ring of its own, laid just under the lit one.
  for (const lit of Array.from(root.querySelectorAll<SVGCircleElement>('circle.bx-ring-lit.hp'))) {
    let trail = lit.previousElementSibling as SVGCircleElement | null;
    if (!trail || !trail.classList.contains('bx-ring-trail')) {
      trail = lit.cloneNode(false) as SVGCircleElement;
      trail.setAttribute('class', 'bx-ring-trail hp');
      trail.setAttribute('aria-hidden', 'true');
      lit.parentNode?.insertBefore(trail, lit);
    }
    const dash = lit.getAttribute('stroke-dasharray');
    if (dash && trail.getAttribute('stroke-dasharray') !== dash) trail.setAttribute('stroke-dasharray', dash);
  }
  // A ring gone (no number this fight): its trail goes too.
  for (const trail of Array.from(root.querySelectorAll('circle.bx-ring-trail'))) {
    if (!trail.nextElementSibling?.classList.contains('bx-ring-lit')) trail.remove();
  }
}

export function useMeterTrails(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    syncMeterTrails(el);
    const watch = new MutationObserver(() => syncMeterTrails(el));
    watch.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    return () => watch.disconnect();
  }, [root]);
}
