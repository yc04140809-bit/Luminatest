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
import { isPortraitKey, portraitArt, statusVisualArt } from '../assets/portraits';

/**
 * THE STATUS SCREEN: one character at a time, picture and numbers.
 *
 * Landscape, because the game is. The composition follows the art
 * direction we were given for this screen — the standing figure on the
 * RIGHT at full height, who they are and what they are worth on the
 * left, the people you can look at across the top — and stops exactly
 * where that picture stops being true of this build. See
 * `docs/STATUS_SCREEN.md` for the line-by-line reading of it.
 *
 * NOT ONE NUMBER IS WORKED OUT HERE. The level and the experience are
 * `world.getProgress` read through `levelCurve` — `levelBand` exists so
 * that a bar can be drawn WITHOUT a screen inventing a second copy of
 * the curve — the ceilings and the swing are `world.getPartyStats`,
 * which is the same function the battle builds its fighters from, and
 * what is LEFT is `world.getPartyCondition`. If this screen and the
 * fight ever disagreed about a maximum, the fight would be right and
 * this would be a second calculation that should not exist.
 *
 * WHAT IS NOT ON IT: 防御力, 魔力, 素早さ, and the name of an equipped
 * weapon. The core has no defence, no magic and no speed stat —
 * `PartyStats` is two ceilings and an attack range — and there is no
 * equipment system at all. They are not shown as 「0」, as 「—」 or as
 * 「未実装」, because a placeholder is a number nobody chose and this
 * screen would be telling the player something false. The rows below
 * are a list, so the day those exist they are entries in it.
 *
 * WHO IS ON IT comes from the party roster, never from a list written
 * here: the day somebody joins, they are on this screen without it
 * being touched. Levi, Aria and Gald have weapons in canon and are not
 * in the party, so they are not here — and nothing invents them.
 */
interface Props {
  world: World;
  onBack: () => void;
}

interface Row {
  key: string;
  label: string;
  value: string;
}

export function StatusScreen({ world, onBack }: Props) {
  const party = activeParty();
  const [at, setAt] = useState(0);
  const who = party[Math.min(at, party.length - 1)];
  const profile = battleProfileOf(who.id);
  const [portrait, setPortrait] = useState<string | null>(null);
  const art = statusArtOf(who.id);
  const kind = art?.kind ?? 'PORTRAIT';

  /**
   * The picture for whoever is being looked at NOW.
   *
   * `alive` rather than a bare setState, because switching quickly
   * would otherwise let a slow fetch for the previous character land
   * on top of the current one.
   */
  useEffect(() => {
    let alive = true;
    setPortrait(null);
    // WHAT THEY ARE WEARING decides this, never who they are: the id
    // goes to the appearance registry and a picture comes back. That
    // is the whole skin seam, and it is why a second outfit will not
    // touch this screen.
    //
    // A FINISHED RECTANGLE WINS over a cut-out master when one exists,
    // because the painted scene behind them is the screen's richness
    // and CSS cannot stand in for it. Neither kind waits on the other.
    const key = art?.key ?? who.id;
    if (!isPortraitKey(key)) return;
    const load = kind === 'VISUAL' ? statusVisualArt : portraitArt;
    void load(key).then((src) => {
      if (alive) setPortrait(src);
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
  // At the ceiling there is no band and no "next", so the bar is full
  // rather than empty: nothing is owed.
  const filled = band ? Math.max(0, Math.min(1, band.into / band.span)) : 1;

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
      <div className="status-head">
        <p className="place status-title">ステータス</p>

        {/* Switching: only ever between people who are actually here. */}
        {party.length > 1 && (
          <div className="status-tabs" role="tablist">
            {party.map((member, i) => (
              <button
                className={i === at ? 'btn primary' : 'btn'}
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

      <div className="status-body">
        {/* LEFT: what the world already knows about them. */}
        <div className="status-facts">
          <p className="status-who" data-testid="status-name">
            {who.label}
          </p>

          <div className="status-level">
            <span className="status-level-label">LEVEL</span>
            <span className="status-level-value" data-testid="status-level">
              {progress.level}
            </span>
            <span className="status-level-max">/ {MAX_LEVEL}</span>
            <span className="status-next">
              NEXT{' '}
              <b data-testid="status-next">{toNext === null ? '（最大）' : String(toNext)}</b>
            </span>
          </div>
          <div className="status-bar" aria-hidden="true">
            <i style={{ width: `${(filled * 100).toFixed(1)}%` }} />
          </div>

          <dl className="status-rows">
            {rows.map((row) => (
              <div className="status-row" key={row.key}>
                <dt>{row.label}</dt>
                <dd data-testid={`status-${row.key}`}>{row.value}</dd>
              </div>
            ))}
          </dl>

          {/* What they FIGHT as. A kind of weapon and a way of fighting
              are two different things, and a character may have the
              second without the first — so they are two marks, not one
              line, and neither is an equipment slot. */}
          {profile && (
            <div className="status-marks">
              <div className="status-mark">
                <span>武器種</span>
                <b data-testid="status-weapon">{weaponLabelOf(profile)}</b>
              </div>
              <div className="status-mark">
                <span>戦闘スタイル</span>
                <b data-testid="status-style">{battleStyleLabelOf(profile)}</b>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: THE ART'S OWN AREA, and nothing else's.
            A box pinned right and bottom that the UI never draws into
            and the picture never escapes. `contain` inside it, so a
            file that does not match the canvas still shows whole
            rather than cropped, and swapping one in needs no code.
            The numbers are CSS variables and differ by kind — a
            finished rectangle is framed as a picture, a cut-out figure
            is stood on the floor — so retuning either is one line,
            without touching a component. */}
        <div className="status-portrait" aria-hidden="true">
          {portrait && <img src={portrait} alt="" data-testid={`status-portrait-${who.id}`} />}
        </div>
      </div>

      <div className="actions">
        <button className="btn" data-testid="status-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
