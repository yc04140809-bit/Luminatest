/**
 * THE PICTURES OF THE CHARACTERS' OWN EFFECTS (作者 2026-10-17: グレイヴ／主人公／ケイオス 専用演出).
 *
 * One line per picture, and nothing else: change the file here (a better
 * PNG or WebP with a transparent background, the whole effect inside its
 * frame) and every place that plays it plays the new one. The parts that
 * have no picture yet — the cleave's arc, the ground's crack, the shards,
 * the thin sparks, the stance's moon arc, the afterglow — are drawn in CSS
 * (specialFx.css) and can be given a picture the same way later.
 *
 *   graveImpact     グレイヴ: the blue-gold blow falling and the ground breaking under it (重撃)
 *   heroCrescent    主人公: the red-black crescent cut (零閃・天衝, 《瞬断》, the counter)
 *   heroTwelve      主人公: twelve blades opening from one point (多方向斬撃 — a sample for now)
 *   heroHiganbana   主人公: the red spider lily opening (彼岸花 — a sample for now)
 *   heroPetals      主人公: the author's sixteen red petals in one picture, 4×4 (彼岸花's petals over the screen — 作者 2026-10-25;
 *                   each petal shows one of them, its own size, turn and way)
 *   kaosWings       ケイオス: the twin wings, black-gold and silver-white, behind her (its edge faded out)
 *   kaosGold        ケイオス: the gold circle (《双極臨界》 — it turns clockwise; 作者 2026-10-26, fringe cleaned)
 *   kaosViolet      ケイオス: the purple circle (《双極臨界》 — it turns the other way)
 *   kaosCore        ケイオス: the light-and-dark core the two become (《双極臨界》)
 *   kaosCollapse    ケイオス: the cosmic blast as the core bursts (界核崩壊)
 */
import graveImpact from '@mugen/assets/files/effects/grave-heavy-impact.webp';
import heroCrescent from '@mugen/assets/files/effects/hero-redmoon-crescent.webp';
import heroTwelve from '@mugen/assets/files/effects/hero-twelve-blades.webp';
import heroHiganbana from '@mugen/assets/files/effects/hero-higanbana.webp';
import heroPetals from '@mugen/assets/files/effects/hero-higanbana-petals.webp';
import kaosWings from '@mugen/assets/files/effects/kaos-twin-wings.webp';
import kaosGold from '@mugen/assets/files/effects/kaos-circle-gold.webp';
import kaosViolet from '@mugen/assets/files/effects/kaos-circle-purple.webp';
import kaosCore from '@mugen/assets/files/effects/kaos-core.webp';
import kaosCollapse from '@mugen/assets/files/effects/kaos-collapse.webp';

export const SPECIAL_FX_ART = {
  graveImpact,
  heroCrescent,
  heroTwelve,
  heroHiganbana,
  heroPetals,
  kaosWings,
  kaosGold,
  kaosViolet,
  kaosCore,
  kaosCollapse,
} as const;

export type SpecialFxArtKey = keyof typeof SPECIAL_FX_ART;
