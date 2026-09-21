// 明朝, SELF-HOSTED. Noto Serif JP under the SIL Open Font License
// 1.1 — free to embed and redistribute in a commercial game, and the
// licence text ships with it. See `docs/FONTS.md` for provenance and
// what the credit requirements actually are.
//
// IMPORTED HERE RATHER THAN GLOBALLY, and only the two subsets this
// screen can need. `@font-face` alone downloads nothing: the 1.36MB
// Japanese file is fetched when a glyph is first matched to the
// family, and the family is scoped to `.status-screen`, so a player
// who never opens this screen never pays for it. On Android it is a
// local file and there is no fetch at all.
import '@fontsource/noto-serif-jp/latin-400.css';
import '@fontsource/noto-serif-jp/japanese-400.css';
import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { MAX_LEVEL, expToNextLevel, levelBand } from '@mugen/core/progression/levelCurve';
import { activeParty } from '@mugen/game/party/battleParty';
import {
  battleProfileOf,
  battleStyleLabelOf,
  weaponLabelOf,
} from '@mugen/content/characters/battleProfiles';
import { statusArtOf } from '@mugen/content/characters/characterAppearance';
import { weaponDefOf } from '@mugen/content/equipment/equipment';
import { presentationOf } from '@mugen/content/characters/characterPresentation';
import { heroNameLength } from '@mugen/core/world/heroName';
import { isPortraitKey, portraitArt, statusVisualArt } from '../assets/portraits';

/**
 * THE STATUS SCREEN — built to the author's two reference images.
 *
 * Landscape: a menu down the left, who they are in the middle, and the
 * main visual filling the right. Pale gold and ivory, because the
 * reference is a bright cathedral, and this screen carries that on its
 * own while the rest of the app stays dark.
 *
 * NOT ONE NUMBER IS WORKED OUT HERE. The level and what is owed come
 * from `levelCurve` — `levelBand` exists so a bar can be drawn WITHOUT
 * a screen inventing a second copy of the curve — the ceilings and the
 * swing from `getPartyStats`, which is what the battle builds its
 * fighters from, and the remainder from `getPartyCondition`. If this
 * screen and the fight disagreed about a maximum, the fight would be
 * right and this would be a second sum that should not exist.
 *
 * WHAT IS NOT ON IT: 防御力, 魔力, 素早さ, and an equipped weapon's
 * name. The core has none of them, so they are absent — not 「0」, not
 * 「—」, not 「未実装」. They join the list on the day they are real.
 *
 * NOTHING HERE PRETENDS TO WORK. スキル, 装備, ストーリー, プロフィール
 * and スキン are named because the reference names them, and they are
 * rendered as plain text with no handler, no button and no press
 * state, so a player cannot mistake them for a door. The one live
 * entry is ステータス, which is this screen.
 */
interface Props {
  world: World;
  onBack: () => void;
  onEquipment: () => void;
}

/**
 * Named in the reference, and not built.
 *
 * 装備 is deliberately NOT repeated below: the reference puts it in
 * both places, and two entries for one unbuilt screen is worse than
 * one. It stays in the menu, where its neighbours are.
 */
const MENU_SOON = ['スキル', '装備', 'ストーリー'] as const;
const DETAIL_SOON = ['プロフィール', 'スキン'] as const;

interface Row {
  key: string;
  label: string;
  value: string;
}

export function StatusScreen({ world, onBack, onEquipment }: Props) {
  // THE SAVED NAME, not the roster's written label. The id stays
  // `hero`; only the word shown changes.
  const party = activeParty({ hero: world.getHeroName() });
  const [at, setAt] = useState(0);
  const who = party[Math.min(at, party.length - 1)];
  const profile = battleProfileOf(who.id);
  const says = presentationOf(who.id);
  const art = statusArtOf(who.id);
  const kind = art?.kind ?? 'PORTRAIT';
  const [picture, setPicture] = useState<string | null>(null);

  /**
   * The picture for whoever is being looked at NOW.
   *
   * A FINISHED RECTANGLE WINS over a cut-out master when one exists,
   * because the painted scene behind them is the screen's richness and
   * CSS cannot stand in for it. `alive` rather than a bare setState,
   * because switching quickly would otherwise let a slow fetch for the
   * previous character land on top of the current one.
   */
  useEffect(() => {
    let alive = true;
    setPicture(null);
    const key = art?.key ?? who.id;
    if (!isPortraitKey(key)) return;
    const load = kind === 'VISUAL' ? statusVisualArt : portraitArt;
    void load(key).then((src) => {
      if (alive) setPicture(src);
    });
    return () => {
      alive = false;
    };
  }, [art?.key, kind, who.id]);

  const stats = world.getPartyStats();
  const condition = world.getPartyCondition()[who.id];
  const progress = world.getProgress(who.id);
  const toNext = expToNextLevel(progress);
  const band = levelBand(progress);
  // At the ceiling nothing is owed, so the bar is full rather than empty.
  const filled = band ? Math.max(0, Math.min(1, band.into / band.span)) : 1;

  /**
   * A LONG NAME SHRINKS RATHER THAN WRAPPING.
   *
   * Ten characters are allowed and 「ケイオス師匠」 is already six, so
   * the name has to survive being long. Wrapping would push every
   * number down a line; a smaller name costs nothing. Nothing happens
   * below eight — the common case is untouched — and it bottoms out
   * rather than shrinking without limit.
   */
  const nameScale = Math.max(0.68, Math.min(1, 8 / heroNameLength(who.label)));

  // What they are actually holding. Absent for anybody with an empty
  // hand — 「装備なし」 belongs on the equipment screen, not here.
  const equippedId = world.getEquipped(who.id, 'WEAPON');
  const equippedWeapon = equippedId ? weaponDefOf(equippedId) : null;

  const rows: Row[] = [];
  if (condition) {
    rows.push(
      { key: 'hp', label: 'HP', value: `${condition.currentHp} / ${condition.maxHp}` },
      { key: 'mp', label: 'MP', value: `${condition.currentMp} / ${condition.maxMp}` },
    );
  }
  // `status-attack` is already the HOME panel's; this one is its own id
  // so that a test asking for one can never be handed the other.
  rows.push({
    key: 'attack-range',
    label: '攻撃力',
    value: `${stats.attackMin}〜${stats.attackMax}`,
  });

  return (
    <div className="screen status-screen" data-art={kind} data-testid="status-screen">
      {/* THE MAIN VISUAL, in an area the UI never draws into.
          Its own painted background is the richness, so it takes the
          full height and keeps its own shape — `contain`, never a
          forced stretch, and never a second copy of her tiled behind
          to fill the gap. What is left over is a gradient pitched at
          the picture's own pale gold, so the rectangle's edge stops
          announcing itself. */}
      <div className="st-visual" aria-hidden="true">
        {picture && <img src={picture} alt="" data-testid={`status-portrait-${who.id}`} />}
      </div>

      <div className="st-head">
        <p className="st-wordmark">
          <b>STATUS</b>
          <i>MUGEN ZERO</i>
        </p>
        {/* Only people who are actually in the party. Switching changes
            the middle and the right together, because they are one
            person being looked at. */}
        {party.length > 1 && (
          <div className="st-tabs" role="tablist">
            {party.map((member, i) => (
              <button
                className={i === at ? 'st-tab on' : 'st-tab'}
                key={member.id}
                role="tab"
                aria-selected={i === at}
                data-testid={`status-tab-${member.id}`}
                onClick={() => setAt(i)}
              >
                {member.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="st-body">
        <nav className="st-menu">
          <span className="st-menu-item on" aria-current="page">
            ステータス
          </span>
          {/* NOT BUTTONS. No handler, no press state, no cursor — the
              reference names them, and naming is all this build may
              honestly do. */}
          {MENU_SOON.map((label) =>
            // 装備 IS a screen now, so it gets a frame and a handler at
            // the same moment — never one without the other.
            label === '装備' ? (
              <button
                className="st-menu-item live"
                key={label}
                data-testid="status-to-equipment"
                onClick={onEquipment}
              >
                {label}
              </button>
            ) : (
              <span
                className="st-menu-item soon"
                key={label}
                aria-disabled="true"
                data-testid={`status-menu-soon-${label}`}
              >
                {label}
              </span>
            ),
          )}
        </nav>

        <div className="st-info">
          <p className="st-name" data-testid="status-name">
            {/* The name alone, so a test can assert it exactly rather
                than against the roman subtitle sitting beside it. */}
            <b
              data-testid="status-name-text"
              style={nameScale < 1 ? { fontSize: `${(nameScale * 100).toFixed(0)}%` } : undefined}
            >
              {who.label}
            </b>
            {says && <i>{says.roman}</i>}
          </p>
          {/* 肩書き is absent until the author writes one. */}
          {says?.epithet && <p className="st-epithet">{says.epithet}</p>}
          {/* THE PROSE IS WHAT GIVES WAY. On a short handset something
              has to, and it must never be the numbers: a status screen
              that has lost 攻撃力 is broken, while one showing a
              shortened introduction is merely smaller. This block
              shrinks and clips; everything below it cannot. */}
          {(says?.quote || says?.intro) && (
            <div className="st-prose">
              {says?.quote && <p className="st-quote">{says.quote}</p>}
              {says?.intro && <p className="st-intro">{says.intro}</p>}
            </div>
          )}

          <div className="st-level">
            <span className="st-level-label">LEVEL</span>
            <b data-testid="status-level">{progress.level}</b>
            <s>/ {MAX_LEVEL}</s>
            <span className="st-next">
              NEXT <b data-testid="status-next">{toNext === null ? '（最大）' : String(toNext)}</b>
            </span>
          </div>
          <div className="st-bar" aria-hidden="true">
            <i style={{ width: `${(filled * 100).toFixed(1)}%` }} />
          </div>

          <dl className="st-rows">
            {rows.map((row) => (
              <div className="st-row" key={row.key}>
                <dt>{row.label}</dt>
                <dd data-testid={`status-${row.key}`}>{row.value}</dd>
              </div>
            ))}
          </dl>

          {equippedWeapon && (
            <div className="st-marks">
              <div className="st-mark">
                <span>装備</span>
                <b data-testid="status-equipped">{equippedWeapon.name}</b>
              </div>
            </div>
          )}
          {profile && (
            <div className="st-marks">
              <div className="st-mark">
                <span>武器種</span>
                <b data-testid="status-weapon">{weaponLabelOf(profile)}</b>
              </div>
              <div className="st-mark">
                <span>戦闘スタイル</span>
                <b data-testid="status-style">{battleStyleLabelOf(profile)}</b>
              </div>
            </div>
          )}
          {says?.styleNote && <p className="st-style-note">{says.styleNote}</p>}
        </div>
      </div>

      <div className="st-foot">
        <button className="st-back" data-testid="status-back" onClick={onBack}>
          もどる
        </button>
        {/* Named, never offered. Same rule as the menu. */}
        <div className="st-details">
          {DETAIL_SOON.map((label) => (
            <span
              className="st-detail soon"
              key={label}
              aria-disabled="true"
              data-testid={`status-detail-soon-${label}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
