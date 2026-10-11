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
import { skillPowerText, skillReuseText, skillsOf } from '@mugen/content/skills/heroSkills';
import { presentationOf } from '@mugen/content/characters/characterPresentation';
import { statSheetOf } from '@mugen/content/characters/characterStats';
import { heroNameLength } from '@mugen/core/world/heroName';
import { isPortraitKey, portraitArt, statusVisualArt } from '../assets/portraits';
import { PortraitZoom, ZoomButton } from './common/PortraitZoom';
import { NewBadge } from './common/NewBadge';
import { newEquipmentIds } from './equipment';

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
 * THE SIX NUMBERS (作者指示 2026-10-11): HP, MP, 攻撃力 from the battle's
 * own sources; 防御力, 魔力, 素早さ shown from content/characters/
 * characterStats.ts, which the battle does not read yet.
 *
 * TWO COLUMNS AND A FOOT (2026-10-11): who they are on the left (it
 * scrolls), the picture large on the right, and the pages of them along
 * the foot — ステータス, プロフィール (their words), 装備 (its own screen),
 * スキル — with ストーリー and スキン named as plain text, no handler, no
 * press state, until they exist.
 */
interface Props {
  world: World;
  onBack: () => void;
  onEquipment: () => void;
}

/** A skill's NEW (the same mark the battle's skill tray clears on use). */
const skillMark = (id: string) => `skill:${id}`;

/** Whether he knows a skill nobody has looked at yet (in a fight or here). */
function unreadSkills(world: World): boolean {
  return skillsOf('hero').some((k) => !world.isRead(skillMark(k.id)));
}

/**
 * スキル — WHAT THEY KNOW. A closed row per skill; tapping it shows what
 * it does (from the skill's own numbers, so the words cannot drift from
 * the fight) and that is looking at it: only then is its NEW cleared.
 * Opening this list clears nothing. Somebody who knows none: 未習得.
 */
function SkillList({ world, characterId }: { world: World; characterId: string }) {
  const skills = skillsOf(characterId);
  const [open, setOpen] = useState<string | null>(null);
  if (skills.length === 0) {
    return (
      <p className="st-style-note" data-testid="status-skills-none">
        未習得
      </p>
    );
  }
  return (
    <div className="st-skills" data-testid="status-skill-list">
      {skills.map((skill) => {
        const shown = open === skill.id;
        return (
          <button
            key={skill.id}
            className={`st-skill${shown ? ' open' : ''}`}
            data-testid={`status-skill-${skill.id}`}
            aria-expanded={shown}
            onClick={() => {
              setOpen((now) => (now === skill.id ? null : skill.id));
              void world.markRead([skillMark(skill.id)]).catch(() => {});
            }}
          >
            <b>
              {skill.name}
              <NewBadge show={!world.isRead(skillMark(skill.id))} testId={`status-skill-${skill.id}-new`} />
            </b>
            {shown && (
              <span className="st-skill-detail" data-testid={`status-skill-${skill.id}-detail`}>
                <span data-testid={`status-skill-${skill.id}-power`}>威力：{skillPowerText(skill)}</span>
                <span data-testid={`status-skill-${skill.id}-reuse`}>再使用：{skillReuseText(skill)}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
  // Which page of them is open: the numbers, who they are, or what they know.
  const [view, setView] = useState<'STATUS' | 'PROFILE' | 'SKILLS'>('STATUS');
  const who = party[Math.min(at, party.length - 1)];
  const profile = battleProfileOf(who.id);
  const says = presentationOf(who.id);
  const art = statusArtOf(who.id);
  const kind = art?.kind ?? 'PORTRAIT';
  // Whose picture it is, too: on switching, the last one's is never shown under the next one's name.
  const [shownPicture, setPicture] = useState<{ id: string; src: string } | null>(null);
  const picture = shownPicture && shownPicture.id === who.id ? shownPicture.src : null;
  // The full-length picture, large, over everything (common/PortraitZoom).
  const [zoomed, setZoomed] = useState(false);

  /**
   * The picture for whoever is being looked at NOW. `alive` rather than a
   * bare setState, because switching quickly would otherwise let a slow
   * fetch for the previous character land on top of the current one.
   */
  useEffect(() => {
    let alive = true;
    setPicture(null);
    const key = art?.key ?? who.id;
    if (!isPortraitKey(key)) return;
    const load = kind === 'VISUAL' ? statusVisualArt : portraitArt;
    void load(key).then((src) => {
      if (alive) setPicture(src ? { id: who.id, src } : null);
    });
    return () => {
      alive = false;
    };
  }, [art?.key, kind, who.id]);

  const condition = world.getPartyCondition()[who.id];
  const progress = world.getProgress(who.id);
  const toNext = expToNextLevel(progress);
  const band = levelBand(progress);
  // At the ceiling nothing is owed, so the bar is full rather than empty.
  const filled = band ? Math.max(0, Math.min(1, band.into / band.span)) : 1;

  /**
   * A LONG NAME SHRINKS RATHER THAN WRAPPING. Ten characters are allowed;
   * nothing happens below eight, and it bottoms out rather than shrinking
   * without limit.
   */
  const nameScale = Math.max(0.68, Math.min(1, 8 / heroNameLength(who.label)));

  // What they are actually holding. Absent for anybody with an empty hand.
  const equippedId = world.getEquipped(who.id, 'WEAPON');
  const equippedWeapon = equippedId ? weaponDefOf(equippedId) : null;

  /**
   * THE SIX NUMBERS (作者指示 2026-10-11). HP, MP and his 攻撃力 are the
   * battle's own (getPartyCondition / getPartyStats); 防御力, 魔力 and 素早さ
   * are shown only, from content/characters/characterStats.ts.
   */
  const sheet = condition ? statSheetOf(who.id, progress.level, condition, world.getPartyStats()) : null;
  const rows: Row[] = sheet
    ? [
        { key: 'hp', label: 'HP', value: `${sheet.hp.current} / ${sheet.hp.max}` },
        { key: 'mp', label: 'MP', value: `${sheet.mp.current} / ${sheet.mp.max}` },
        // `status-attack` is the HOME panel's; this one is its own id.
        { key: 'attack-range', label: '攻撃力', value: `${sheet.attack.min}〜${sheet.attack.max}` },
        { key: 'defense', label: '防御力', value: String(sheet.defense) },
        { key: 'magic', label: '魔力', value: String(sheet.magic) },
        { key: 'speed', label: '素早さ', value: String(sheet.speed) },
      ]
    : [];

  /** A page of the foot's own: the one open is marked, the others are doors. */
  const page = (id: 'STATUS' | 'PROFILE' | 'SKILLS', label: string, testId: string, badge?: React.ReactNode) =>
    view === id ? (
      <span className="st-nav-item on" aria-current="page" data-testid={testId}>
        {label}
        {badge}
      </span>
    ) : (
      <button className="st-nav-item live" data-testid={testId} onClick={() => setView(id)}>
        {label}
        {badge}
      </button>
    );

  return (
    <div className="screen status-screen st-v2" data-art={kind} data-view={view} data-testid="status-screen">
      {/* THE MAIN VISUAL, large (作者指示 2026-10-11: キャラクターが主役):
          never stretched, its own shape, anchored at the head so the face
          stays big; what falls below the screen is the lower legs. */}
      <div className="st-visual" aria-hidden="true">
        {picture && <img src={picture} alt="" data-testid={`status-portrait-${who.id}`} />}
      </div>
      {picture && <ZoomButton testId="status-zoom" label={`${who.label}の立ち絵を拡大`} onClick={() => setZoomed(true)} />}
      {zoomed && picture && <PortraitZoom src={picture} name={who.label} onClose={() => setZoomed(false)} />}

      <div className="st-head">
        <p className="st-wordmark">
          <b>STATUS</b>
          <i>MUGEN ZERO</i>
        </p>
        {/* Only people who are actually in the party; the next to join appears here by being in it. */}
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
        <div className="st-info st-scroll" data-testid="status-scroll">
          <p className="st-name" data-testid="status-name">
            <b
              data-testid="status-name-text"
              style={nameScale < 1 ? { fontSize: `${(nameScale * 100).toFixed(0)}%` } : undefined}
            >
              {who.label}
            </b>
            {says && <i>{says.roman}</i>}
          </p>
          {says?.epithet && (
            <p className="st-epithet" data-testid="status-epithet">
              {says.epithet}
            </p>
          )}
          {view === 'SKILLS' ? (
            <>
              <p className="st-skills-head">スキル</p>
              <SkillList key={who.id} world={world} characterId={who.id} />
            </>
          ) : view === 'PROFILE' ? (
            <div className="st-prose" data-testid="status-profile">
              {says?.quote && <p className="st-quote">{says.quote}</p>}
              {says?.intro && <p className="st-intro">{says.intro}</p>}
              {says?.styleNote && <p className="st-style-note">{says.styleNote}</p>}
            </div>
          ) : (
            <>
              {/* Their own short line (作者指示 §6): one per character, from the data. */}
              {says?.quote && (
                <p className="st-quote st-one-line" data-testid="status-quote">
                  {says.quote}
                </p>
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

              <dl className="st-rows st-six">
                {rows.map((row) => (
                  <div className="st-row" key={row.key}>
                    <dt>{row.label}</dt>
                    <dd data-testid={`status-${row.key}`}>{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="st-marks">
                {equippedWeapon && (
                  <div className="st-mark">
                    <span>装備</span>
                    <b data-testid="status-equipped">{equippedWeapon.name}</b>
                  </div>
                )}
                {profile && (
                  <>
                    <div className="st-mark">
                      <span>武器種</span>
                      <b data-testid="status-weapon">{weaponLabelOf(profile)}</b>
                    </div>
                    <div className="st-mark">
                      <span>戦闘スタイル</span>
                      <b data-testid="status-style">{battleStyleLabelOf(profile)}</b>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* THE FOOT: the way out, and the pages of them. Laid out BELOW the
          column, never over it (the column scrolls to its last line above it). */}
      <div className="st-foot">
        <button className="st-back" data-testid="status-back" onClick={onBack}>
          もどる
        </button>
        <nav className="st-nav" aria-label="ステータス">
          {page('STATUS', 'ステータス', 'status-to-status')}
          {page('PROFILE', 'プロフィール', 'status-to-profile')}
          <button className="st-nav-item live" data-testid="status-to-equipment" onClick={onEquipment}>
            装備
            <NewBadge show={newEquipmentIds(world).length > 0} testId="status-equipment-new" />
          </button>
          {page('SKILLS', 'スキル', 'status-to-skills', <NewBadge show={unreadSkills(world)} testId="status-skills-new" />)}
          {/* NOT BUTTONS: named, never offered, until they exist. */}
          {(['ストーリー', 'スキン'] as const).map((label) => (
            <span
              className="st-nav-item soon"
              key={label}
              aria-disabled="true"
              data-testid={label === 'ストーリー' ? `status-menu-soon-${label}` : `status-detail-soon-${label}`}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
