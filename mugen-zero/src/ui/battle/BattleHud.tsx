// THE BATTLE HUD — four panels in four corners, over one battlefield.
//
// Every panel here is laid OVER the field rather than beside it. That
// is the whole of the overhaul: the fight used to be a middle band with
// numbers stacked above and below it, and it is now the screen, with
// the reading taken to the corners where it does not stand in front of
// anybody.
//
// The design language — deep navy ground, a double gold hairline, a
// four-pointed blue star at the seams — is reconstructed in CSS rather
// than cut from the delivered frame art. Two reasons, both practical:
// the delivered frames carry ornamental corners that cannot stretch to
// an arbitrary panel without distorting, which the brief forbids, and
// the whole game ships as ONE inlined html file with a hard size
// ceiling it is already near. What is read off the art is the language;
// what draws it is this file and the stylesheet.

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
    </span>
  );
}

/**
 * TURN ORDER — top left, read left to right.
 *
 * Horizontal on purpose: the right side of the screen is the party's
 * and a second vertical column there would be two lists of the same
 * people. The one acting is larger, lit and ringed — three signals, so
 * it survives a bright phone held at an angle.
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
                <FaceMark art={art} size={slot.acting ? 34 : 27} label={slot.actor.name} />
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
  children,
}: {
  kind: 'hp' | 'mp' | 'enemy-hp';
  now: number;
  max: number;
  testId?: string;
  children?: ReactNode;
}) {
  const share = max > 0 ? Math.max(0, Math.min(1, now / max)) : 0;
  return (
    <span className={`bx-meter ${kind}`} data-testid={testId}>
      <span className="bx-meter-track">
        <span className="bx-meter-fill" style={{ width: `${share * 100}%` }} />
        {children}
      </span>
      <span className="bx-meter-num">
        {now} <i>/</i> {max}
      </span>
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
 * One member of the party, on the right.
 *
 * WHY EACH CARD SHOWS ONE BAR AND NOT TWO. The fight models one health,
 * which is the hero's, and one pool of magic, which is hers — the
 * battle's own comment on `playerMp` says so: "what Kaos has left to
 * spend". So each of them is shown the resource they actually have, and
 * the other line says what they are doing instead of showing a bar that
 * would be a number nobody is keeping. B-2 gives each member their own
 * pair, and on that day both bars appear in a card that does not move.
 */
export function PartyCard<S extends string>({
  name,
  role,
  art,
  hp,
  mp,
  note,
  testId,
}: {
  name: string;
  role: string;
  art: ResolvedArt<S> | null;
  hp?: { now: number; max: number; testId?: string };
  mp?: { now: number; max: number; testId?: string };
  note?: string;
  testId?: string;
}) {
  return (
    <div className="bx-panel bx-member" data-testid={testId}>
      {art ? (
        <FaceMark art={art} size={38} label={name} />
      ) : (
        <span className="bx-face bx-face-blank" aria-hidden="true" />
      )}
      <span className="bx-member-body">
        <span className="bx-member-head">
          <b className="bx-member-name">{name}</b>
          <i className="bx-member-role">{role}</i>
        </span>
        {hp && <Meter kind="hp" now={hp.now} max={hp.max} testId={hp.testId} />}
        {mp && <Meter kind="mp" now={mp.now} max={mp.max} testId={mp.testId} />}
        {note && <span className="bx-member-note">{note}</span>}
      </span>
    </div>
  );
}
