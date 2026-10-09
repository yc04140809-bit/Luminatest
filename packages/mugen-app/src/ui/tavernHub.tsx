import { useState } from 'react';
import type { BgmId } from '@mugen/assets';
import type { TradeOutcome } from '@mugen/core/world/world';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { TRADE_WORDS, type TavernTrade, type TradeLine } from '@mugen/content/economy/tavernTrades';
import { BARD_WORDS, MUSIC_ARCHIVE, heardPieces } from '@mugen/content/audio/musicArchive';

/**
 * 酒場ハブ化 Phase 1 (2026-10-09) — WHAT TONIGHT'S STRANGER OFFERS after
 * their words, in the tavern's own box: a swap (物々交換) or the bard's
 * MUSIC ARCHIVE. Nothing here decides anything: the swap is the world's
 * `tradeItems` (the bag and the night's record in one commit), the music
 * is the App's to play, and the village's piece is the world's to keep.
 */

/** What the App hands the tavern for these. */
export interface TavernHub {
  /** How many of a thing the bag holds. */
  held: (itemId: string) => number;
  /** Whether this swap is already made tonight. */
  traded: (tradeId: string) => boolean;
  trade: (trade: TavernTrade) => Promise<TradeOutcome>;
  /** The pieces this world has heard, in the archive's order. */
  heard: readonly BgmId[];
  /** What the bard is playing now (null: the room's own). */
  playing: BgmId | null;
  play: (id: BgmId) => void;
  /** The village's chosen piece (null: its own). */
  villageBgm: BgmId | null;
  setVillageBgm: (id: BgmId | null) => Promise<boolean>;
}

const nameOf = (itemId: string) => itemDef(itemId)?.name ?? itemId;
const titleOf = (id: BgmId | null) => MUSIC_ARCHIVE.find((p) => p.id === id)?.title ?? '';

function Side({ label, lines, held, testId }: { label: string; lines: readonly TradeLine[]; held?: (id: string) => number; testId: string }) {
  return (
    <p className="tavern-trade-side" data-testid={testId}>
      <span className="tavern-trade-label">{label}：</span>
      {lines.map((l, i) => (
        <span key={l.itemId} className="tavern-trade-item">
          {i > 0 && '、'}
          {nameOf(l.itemId)} ×{l.quantity}
          {held && <span className="tavern-trade-held">（所持 {held(l.itemId)}）</span>}
        </span>
      ))}
    </p>
  );
}

/** 【交換】 — what they want, what they give, 交換する／やめる. */
export function TradePanel({
  trade,
  speaker,
  hub,
  onClose,
}: {
  trade: TavernTrade;
  speaker: string;
  hub: TavernHub;
  onClose: () => void;
}) {
  const [said, setSaid] = useState<{ text: string; theirs: boolean }>({
    text: trade.rare ? TRADE_WORDS.rareAsk : TRADE_WORDS.ask,
    theirs: true,
  });
  const [busy, setBusy] = useState(false);
  const done = hub.traded(trade.id);

  const make = () => {
    if (busy) return;
    setBusy(true);
    void hub
      .trade(trade)
      .then((r) =>
        setSaid(
          r === 'OK'
            ? { text: trade.rare ? TRADE_WORDS.rareDone : TRADE_WORDS.done, theirs: true }
            : r === 'SHORT'
              ? { text: TRADE_WORDS.short, theirs: false }
              : r === 'FULL'
                ? { text: TRADE_WORDS.full, theirs: false }
                : { text: TRADE_WORDS.already, theirs: false },
        ),
      )
      .catch(() => setSaid({ text: TRADE_WORDS.short, theirs: false }))
      .finally(() => setBusy(false));
  };

  return (
    <div className="tavern-panel tavern-trade" data-testid="tavern-trade" data-trade={trade.id} data-rare={trade.rare ? 'yes' : 'no'}>
      {said.theirs && <p className="speaker">{speaker}</p>}
      <p className="line tavern-panel-say" data-testid="tavern-trade-say">
        {said.theirs ? `「${said.text}」` : said.text}
      </p>
      <p className="tavern-trade-title">【交換】</p>
      <Side label="渡す" lines={trade.give} held={hub.held} testId="tavern-trade-give" />
      <Side label="受け取る" lines={trade.get} testId="tavern-trade-get" />
      <div className="actions">
        <button className="btn primary" data-testid="tavern-trade-do" disabled={busy || done} onClick={make}>
          {done ? '交換済み' : '交換する'}
        </button>
        <button className="btn" data-testid="tavern-panel-close" onClick={onClose}>
          {done ? 'もどる' : 'やめる'}
        </button>
      </div>
    </div>
  );
}

/** MUSIC ARCHIVE — the pieces heard, to play again; one of them for the village. */
export function MusicArchivePanel({ speaker, hub, onClose }: { speaker: string; hub: TavernHub; onClose: () => void }) {
  const [said, setSaid] = useState<string>(BARD_WORDS.ask);
  const pieces = heardPieces(hub.heard);

  return (
    <div className="tavern-panel tavern-archive" data-testid="tavern-archive">
      <p className="speaker">{speaker}</p>
      <p className="line tavern-panel-say" data-testid="tavern-archive-say">
        「{pieces.length === 0 ? BARD_WORDS.none : said}」
      </p>
      <p className="tavern-archive-title">MUSIC ARCHIVE</p>
      <ul className="tavern-archive-list" data-testid="tavern-archive-list">
        {pieces.map((p) => {
          const on = hub.playing === p.id;
          return (
            <li key={p.id} className={`tavern-archive-row${on ? ' on' : ''}`} data-testid={`tavern-piece-${p.id}`} data-playing={on ? 'yes' : 'no'}>
              <span className="tavern-piece-name">
                {on && <span className="tavern-piece-mark" aria-label="再生中">♪ </span>}
                {p.title}
                <span className="tavern-piece-heard">{p.heard}</span>
              </span>
              <button
                className="btn"
                data-testid={`tavern-play-${p.id}`}
                onClick={() => {
                  hub.play(p.id);
                  setSaid(BARD_WORDS.play);
                }}
              >
                再生
              </button>
            </li>
          );
        })}
      </ul>
      <p className="tavern-village-bgm" data-testid="tavern-village-bgm">
        村のBGM：{hub.villageBgm ? titleOf(hub.villageBgm) : 'いつもの曲'}
      </p>
      <div className="actions">
        {hub.playing && hub.playing !== (hub.villageBgm ?? 'ALDEN_VILLAGE') && (
          <button
            className="btn"
            data-testid="tavern-set-village"
            onClick={() => void hub.setVillageBgm(hub.playing).then((ok) => ok && setSaid(BARD_WORDS.setVillage))}
          >
            この曲を村のBGMに
          </button>
        )}
        {hub.villageBgm && (
          <button
            className="btn"
            data-testid="tavern-reset-village"
            onClick={() => void hub.setVillageBgm(null).then((ok) => ok && setSaid(BARD_WORDS.resetVillage))}
          >
            元に戻す
          </button>
        )}
        <button className="btn" data-testid="tavern-panel-close" onClick={onClose}>
          もどる
        </button>
      </div>
    </div>
  );
}
