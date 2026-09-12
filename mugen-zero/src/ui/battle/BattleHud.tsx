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

import type { ReactNode } from 'react';
import { CharacterArt } from '../art/CharacterArt';
import type { ResolvedArt } from '../../core/art/artStates';
import type { TurnSlot } from './battleHud';

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
export function WorldMemoryPanel({ rows, depth }: { rows: readonly string[]; depth: number }) {
  return (
    <div className="bx-panel bx-memory" data-testid="bx-world-memory">
      <span className="bx-panel-label">WORLD MEMORY</span>
      <ul className="bx-memory-list">
        {rows.map((line, at) => (
          <li key={at} className={line === '？？？' ? 'unknown' : undefined}>
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
    </div>
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
 * THE PARTY, as one HUD rather than a stack of cards.
 *
 * It was one framed card per member, and at two members that was a
 * third of the screen's height down the right-hand side — at four it
 * would have been two thirds, which is the whole party column eating
 * the battlefield it is supposed to sit beside.
 *
 * So the frame is drawn ONCE, around all of them, and each member is a
 * row inside it: face, name, health, magic. Four rows cost four row
 * heights and one frame, not four frames. That is the "一体化" the brief
 * asks for, and it is also what makes a third and a fourth member a
 * longer list rather than a different layout.
 */
export function PartyHud({ children }: { children: ReactNode }) {
  return (
    <div className="bx-party" data-testid="bx-party">
      <span className="bx-panel-label">PARTY</span>
      <div className="bx-party-rows">{children}</div>
    </div>
  );
}

/**
 * One member of the party, as a row of that HUD.
 *
 * BOTH RAILS ARE ALWAYS DRAWN, because the frame draws both: a card
 * with one of them blanked out would be a broken picture. What varies
 * is whether a rail carries a number.
 *
 * The fight keeps one health, which is the hero's, and one pool of
 * magic, which is hers — the battle's own comment on `playerMp` says so:
 * "what Kaos has left to spend". So each of them is given the resource
 * they actually have, and the other rail says 「—」 rather than nought.
 * That distinction is the whole reason `now` is nullable: an empty bar
 * on Kaos would tell the player she is about to die.
 *
 * B-2 gives every member their own pair, and on that day the nulls go
 * and nothing else about this card changes.
 */
export function PartyCard<S extends string>({
  name,
  role,
  art,
  hp,
  mp,
  testId,
}: {
  name: string;
  role: string;
  art: ResolvedArt<S> | null;
  hp: { now: number | null; max: number | null; testId?: string };
  mp: { now: number | null; max: number | null; testId?: string };
  testId?: string;
}) {
  return (
    <div className="bx-member" data-testid={testId}>
      {art ? (
        <FaceMark art={art} size={30} label={name} />
      ) : (
        <span className="bx-face bx-face-blank" aria-hidden="true" />
      )}
      <span className="bx-member-head">
        <b className="bx-member-name">{name}</b>
        <i className="bx-member-role">{role}</i>
        {/* Whichever of the two this member actually has — and it
            carries the testid, because it is where the number IS. A bar
            with no numeral on it is not what "read the health" means. */}
        <Readout
          now={hp.now ?? mp.now}
          max={hp.max ?? mp.max}
          testId={hp.now !== null ? hp.testId : mp.testId}
        />
      </span>
      <span className="bx-member-bars">
        <Meter kind="hp" now={hp.now} max={hp.max} bare />
        <Meter kind="mp" now={mp.now} max={mp.max} bare />
      </span>
    </div>
  );
}
