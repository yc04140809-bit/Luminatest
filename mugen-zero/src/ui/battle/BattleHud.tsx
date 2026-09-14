// THE BATTLE HUD — four panels in four corners, over one battlefield.
//
// Every panel here is laid OVER the field rather than beside it. That
// is the whole of the overhaul: the fight used to be a middle band with
// numbers stacked above and below it, and it is now the screen, with
// the reading taken to the corners where it does not stand in front of
// anybody.
//
// EVERY FRAME HERE IS DELIVERED ART. The turn order's portrait plate,
// the creature's plate, the party cards, the message window, WORLD
// MEMORY's panel, the command diamond, the meters and the three corner
// chips are all pieces of the BATTLE UI ASSET PACK, cut out of the
// delivered sheets (see src/assets/ui/battle/README.md) and used at the
// ratio they were drawn at.
//
// Nothing is stretched out of shape to get there. Frames whose width is
// free are NINE-SLICED, so their ornamental ends are drawn at their own
// size and only the plain middle stretches; frames whose shape is fixed
// are given that exact aspect-ratio; and the meters are REVEALED from
// the left rather than squeezed, so the drawn gradient and its chevron
// cap are always at full size.
//
// The packs' frames arrive with specimen contents drawn into them — a
// red bar at some arbitrary value, four ？ rows, a 0%. None of that is
// shown: the slice discards the interior and the live numbers are drawn
// in its place, so the player is reading their own fight.

import { useState, type ReactNode } from 'react';
import { CharacterArt } from '../art/CharacterArt';
import type { ResolvedArt } from '../../core/art/artStates';
import { displayName } from './battleHud';
import { playSfx } from '../../platform/audio';
import type { TurnSlot } from './battleHud';
import { hudSpots, type FieldSpot, type HudSpot } from './formation';

/** The head of a drawing, in a diamond, at the size the strip wants. */
function FaceMark<S extends string>({
  art,
  size,
  label,
}: {
  art: ResolvedArt<S>;
  size: number;
  label: string;
}) {
  return (
    <span className="bx-face" style={{ width: size, height: size }}>
      <CharacterArt art={art} height={size} className="bx-face-art" label={label} bust />
      {/* The pack's own portrait plate, over the face. */}
      <span className="bx-face-frame" aria-hidden="true" />
    </span>
  );
}

/**
 * TURN ORDER — top left, read left to right.
 *
 * Horizontal on purpose: the right side of the screen is the party's
 * and a second vertical column there would be two lists of the same
 * people.
 *
 * FACES ONLY. It carried each name under its portrait and that was
 * wrong twice: the strip is read at a glance, where a face is faster
 * than a word, and five names across the top left corner is a paragraph
 * laid over the battlefield. The names are still in the DOM for a
 * screen reader and for the tests — they are simply never drawn.
 *
 * The one acting is larger, lit and ringed, and the pack's own chevron
 * points from each turn to the next.
 */
export function TurnOrder<S extends string>({
  slots,
  artOf,
}: {
  slots: readonly TurnSlot[];
  artOf: (actorId: string) => ResolvedArt<S> | null;
}) {
  return (
    <div className="bx-panel bx-turns" data-testid="bx-turn-order">
      <span className="bx-panel-label">TURN ORDER</span>
      <ol className="bx-turn-line">
        {slots.map((slot, at) => {
          const art = artOf(slot.actor.id);
          return (
            <li
              key={`${slot.actor.id}-${at}`}
              className={`bx-turn${slot.acting ? ' acting' : ''} ${slot.actor.side.toLowerCase()}`}
              data-testid={slot.acting ? 'bx-turn-acting' : undefined}
              data-actor={slot.actor.id}
              aria-current={slot.acting ? 'step' : undefined}
            >
              {art ? (
                <FaceMark art={art} size={slot.acting ? 36 : 26} label={slot.actor.name} />
              ) : (
                <span className="bx-face bx-face-blank" aria-hidden="true" />
              )}
              <i className="bx-turn-name">{slot.actor.name}</i>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * A bar that can be read across a room.
 *
 * Wide, short, and with the numbers ON it rather than beside it —
 * the brief's one hard requirement of both healths is that they are
 * understood at a glance rather than parsed.
 */
export function Meter({
  kind,
  now,
  max,
  testId,
  bare = false,
  children,
}: {
  kind: 'hp' | 'mp' | 'enemy-hp';
  /** Null for a rail this fight does not keep a number on. */
  now: number | null;
  max: number | null;
  testId?: string;
  /**
   * A bar with no number of its own.
   *
   * For the two frames that carry their number elsewhere: the pack's
   * rails are four or five pixels tall at the size a phone runs them
   * at, so the numeral goes on the name line and the bar is only a bar.
   * NOT RENDERED rather than hidden — a number that is in the DOM and
   * out of sight is still read by a screen reader, and was read twice
   * by the tests, which is how this was found.
   */
  bare?: boolean;
  children?: ReactNode;
}) {
  const blank = now === null || max === null;
  const share = !blank && max > 0 ? Math.max(0, Math.min(1, now / max)) : 0;
  return (
    <span className={`bx-meter ${kind}${blank ? ' blank' : ''}`} data-testid={testId}>
      <span className="bx-meter-track">
        {/* The pack's bar, REVEALED rather than stretched: the drawing
            is always at its own size and the stylesheet clips it from
            the right by `--fill`. A squashed gradient would have been a
            different picture at every hit point. */}
        <span
          className="bx-meter-fill"
          style={{ ['--fill' as string]: `${share * 100}%` }}
        />
        {children}
      </span>
      {!bare && (
        <span className="bx-meter-num">
          {blank ? '—' : (
            <>
              {now} <i>/</i> {max}
            </>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * WORLD MEMORY — bottom left, and not a decoration.
 *
 * It is here in a fight because a fight is one of the things the world
 * writes down. Compact enough that it takes a corner rather than a
 * band, and the unknown rows are left visibly unknown: an empty line
 * the player can still fill is the whole feeling this panel is for.
 */
/**
 * How many of the shown rows are something the world actually said.
 *
 * The panel pads itself out with question marks so it is always the
 * same height; those are not memories, they are room for memories, and
 * a count that included them would tell a player they know more than
 * they do.
 */
function knownCount(rows: readonly string[]): number {
  return rows.filter((line) => line !== UNKNOWN_ROW).length;
}

const UNKNOWN_ROW = '？？？';

/**
 * WORLD MEMORY, in the corner of a fight.
 *
 * SMALLER THAN IT WAS, AND NOT GONE. It had four lines and a title and
 * a meter, and at that size it was a panel the battlefield had to make
 * room for rather than something at the edge of it — in a corner of a
 * screen whose whole subject is two people a few feet apart.
 *
 * Compact keeps what a player glances at: the name, HOW MANY things
 * the world remembers, the newest two of them, and how deep the memory
 * runs. The rest is a tap away and goes away again. Nothing is
 * removed, and outside a fight the panel is unchanged.
 */
export function WorldMemoryPanel({
  rows,
  depth,
  compact = false,
  compactRows = 2,
}: {
  rows: readonly string[];
  depth: number;
  /** Small by default, with the rest one tap away. */
  compact?: boolean;
  /** How many lines the small form shows. */
  compactRows?: number;
}) {
  const [open, setOpen] = useState(false);
  const small = compact && !open;
  const shown = small ? rows.slice(0, compactRows) : rows;
  const body = (
    <>
      <span className="bx-panel-label">
        WORLD MEMORY
        {/* The count is the one number worth having at a glance, and it
            is the thing the small form must never drop: a player who
            cannot see the list still knows whether there is one. */}
        <b className="bx-memory-count" data-testid="bx-memory-count">
          {knownCount(rows)}
        </b>
      </span>
      <ul className="bx-memory-list">
        {shown.map((line, at) => (
          <li key={at} className={line === UNKNOWN_ROW ? 'unknown' : undefined}>
            <i aria-hidden="true">◆</i>
            {line}
          </li>
        ))}
      </ul>
      <span className="bx-memory-depth" data-testid="bx-memory-depth">
        記憶の深さ
        <span className="bx-depth-track" aria-hidden="true">
          <span className="bx-depth-fill" style={{ width: `${Math.max(0, Math.min(100, depth))}%` }} />
        </span>
        <b>{depth}%</b>
      </span>
    </>
  );

  if (!compact) {
    return (
      <div className="bx-panel bx-memory" data-testid="bx-world-memory">
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={`bx-panel bx-memory bx-memory-compact${open ? ' open' : ''}`}
      data-testid="bx-world-memory"
      data-open={open ? 'yes' : 'no'}
      aria-expanded={open}
      aria-label={open ? 'WORLD MEMORY を閉じる' : 'WORLD MEMORY をひらく'}
      onClick={() => {
        // The tap makes the sound; the updater only computes the next
        // state. A side effect inside an updater is fired twice under
        // StrictMode for one tap, and a reducer is the wrong place to
        // put a noise in any case.
        playSfx(open ? 'ui_menu_close' : 'ui_memory_open');
        setOpen((was) => !was);
      }}
    >
      {body}
    </button>
  );
}

/**
 * A live number, where the card has room for one.
 *
 * THE RAILS ARE TOO THIN TO WRITE ON. The pack's card draws its health
 * and magic rails four or five pixels tall at the size a party column
 * runs to on a phone — which is right for a bar and impossible for a
 * numeral. So the number sits on the name line instead, and each card
 * carries the one value it actually has.
 */
export function Readout({
  now,
  max,
  className = 'bx-member-read',
  testId,
}: {
  now: number | null;
  max: number | null;
  className?: string;
  testId?: string;
}) {
  if (now === null || max === null) {
    return (
      <i className={`${className} blank`} data-testid={testId}>
        —
      </i>
    );
  }
  return (
    <i className={className} data-testid={testId}>
      {now} <b>/</b> {max}
    </i>
  );
}

/**
 * THE PARTY, AS A MAP OF WHERE THEY ARE STANDING.
 *
 * It was a stack of rows down the right, and a stack says only the
 * order somebody was added in. This is a CROSS — front, two flanks and
 * a rear — and the whole point of it is the one thing the brief calls
 * most important: THE PANEL'S SHAPE IS THE FIELD'S SHAPE.
 *
 *   nearest the camera  →  lowest in the panel
 *   furthest up the path →  highest in the panel
 *   further toward the middle of the field → further left in the panel
 *
 * So a player who never reads a word of it still knows who is in front.
 * `hudSpots` in `formation.ts` does that conversion, from the very same
 * numbers the field is drawn from, which is what keeps the two honest:
 * move somebody on the field and they move in here, with no second
 * table to remember.
 *
 * A party of two fills two of the four places and leaves the others
 * empty, and that is not a hole — it is the formation, drawn. Three and
 * four arrive as more faces in the same diamond rather than as a
 * different panel.
 *
 * THE MIDDLE IS LEFT EMPTY on purpose. It is where the fight's shared
 * state goes — whose turn it is, a party link, a resonance — and none
 * of that exists yet, so nothing is put there to be moved later.
 */
export interface PartyMember<S extends string> {
  name: string;
  role: string;
  art: ResolvedArt<S> | null;
  hp: { now: number | null; max: number | null; testId?: string };
  mp: { now: number | null; max: number | null; testId?: string };
  /** Where this person is standing, in the field's own numbers. */
  spot: FieldSpot;
  /** Whose turn it is: a little larger, and the one carrying figures. */
  acting?: boolean;
  testId?: string;
}

export function PartyHud<S extends string>({ members }: { members: readonly PartyMember<S>[] }) {
  const spots = hudSpots(members.map((who) => who.spot));
  return (
    <div className="bx-party" data-testid="bx-party" data-size={members.length}>
      <span className="bx-panel-label">PARTY</span>
      <div className="bx-party-cross" data-testid="bx-party-cross">
        {/* THE LINE BETWEEN THEM, and it is drawn from the same spots
            the faces are placed at rather than from a fixed diamond:
            two people make a diagonal, four make the diamond, and both
            times the shape on the panel is the shape on the field. A
            guide drawn at fixed corners would have been a decoration
            that disagreed with the party standing on it. */}
        <PartyLink spots={spots} />
        {members.map((who, at) => (
          <PartyCard key={who.testId ?? who.name} who={who} at={spots[at]} />
        ))}
      </div>
    </div>
  );
}

/* ---- the gauges -----------------------------------------------------
   HP is the ring AROUND the portrait and MP the ring just inside it,
   because at this size a bar is four pixels of colour and a ring is a
   whole edge. `pathLength` makes the arithmetic disappear: the circle
   is declared to be 100 units long whatever its radius, so the dash is
   the percentage and nothing has to know about pi. */
const HP_RADIUS = 22.5;
const MP_RADIUS = 19.9;

/**
 * The formation, drawn as one line through everybody.
 *
 * Closed once there are three of them, because three points that are
 * not joined up are three points; open at two, because two joined at
 * both ends is the same line drawn twice.
 */
function PartyLink({ spots }: { spots: readonly HudSpot[] }) {
  if (spots.length < 2) return null;
  const path = spots.map((at) => `${at.x * 100},${at.y * 100}`);
  if (spots.length > 2) path.push(path[0]);
  return (
    <svg
      className="bx-cross-link"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={path.join(' ')} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function shareOf(now: number | null, max: number | null): number | null {
  if (now === null || max === null || max <= 0) return null;
  return Math.max(0, Math.min(1, now / max));
}

function Gauge({
  kind,
  radius,
  share,
}: {
  kind: 'hp' | 'mp';
  radius: number;
  share: number | null;
}) {
  return (
    <>
      <circle className={`bx-ring-bed ${kind}`} cx="24" cy="24" r={radius} pathLength={100} />
      {share !== null && (
        <circle
          className={`bx-ring-lit ${kind}`}
          cx="24"
          cy="24"
          r={radius}
          pathLength={100}
          strokeDasharray={`${share * 100} 100`}
        />
      )}
    </>
  );
}

/**
 * One member, at their own place in the cross.
 *
 * A face, two rings and one figure. The NAME IS NOT DRAWN — it is in
 * the DOM for a screen reader and for the tests, and on a thirty-pixel
 * portrait a face is read faster than a word in any case; the turn
 * order at the other corner has worked that way since the overhaul.
 *
 * BOTH RINGS ARE ALWAYS THERE, because a member with one of them
 * missing would be a different shape in the diamond. What varies is
 * whether a ring is filled: the fight keeps one health, which is his,
 * and one pool of magic, which is hers, so each of them lights the ring
 * they actually have and the other stays an empty bed. An empty bed is
 * not nought — nought would be a green ring drained to nothing, which
 * says somebody is dying.
 *
 * The figure is small for everybody and LARGE for whoever is acting,
 * which is the brief's rule about numbers: the gauges carry the fight
 * and the digits are for the one person you are deciding about.
 */
export function PartyCard<S extends string>({
  who,
  at,
}: {
  who: PartyMember<S>;
  at: HudSpot;
}) {
  const { name, role, art, hp, mp, acting = false, testId } = who;
  return (
    <div
      className={`bx-member${acting ? ' acting' : ''}`}
      data-testid={testId}
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
    >
      <span className="bx-member-ring">
        <svg className="bx-ring" viewBox="0 0 48 48" aria-hidden="true">
          <Gauge kind="hp" radius={HP_RADIUS} share={shareOf(hp.now, hp.max)} />
          <Gauge kind="mp" radius={MP_RADIUS} share={shareOf(mp.now, mp.max)} />
        </svg>
        {art ? (
          <FaceMark art={art} size={31} label={name} />
        ) : (
          <span className="bx-face bx-face-blank" aria-hidden="true" />
        )}
        {/* Whichever of the two this member actually has, on a chip
            across the bottom of the portrait — and it carries the
            testid, because it is where the number IS. */}
        <Readout
          now={hp.now ?? mp.now}
          max={hp.max ?? mp.max}
          testId={hp.now !== null ? hp.testId : mp.testId}
        />
      </span>
      <span className="bx-member-said">
        <b className="bx-member-name">{displayName(name)}</b>
        <i className="bx-member-role">{role}</i>
      </span>
    </div>
  );
}
