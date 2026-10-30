import type { KaosFace } from '@mugen/content/characters/kaosFaces';

/**
 * ケイオス'S FACE ON A WON FIGHT'S RESULT (2026-10-30 タスクG).
 *
 * Only where she fought: a fight she was not in shows nothing of her (`NO_KAOS`). Which face is two things —
 * who fought beside her, and how it was won — and the table below is the whole of it: a file by its name,
 * and until that file is delivered, the face of hers that stands in for it (assets/kaosFaces.ts).
 *
 *   who      DUO   ケイオス×主人公 — the two of them (a fight of one with her magic beside him): a picture of
 *                  the two, her ボケ and his ツッコミ
 *            TRIO  ケイオス・主人公・グレイヴ — the three
 *            NO_KAOS  she was not there: nothing
 *   how      NORMAL    an ordinary win
 *            BOSS      a boss beaten (a fight not to be fled)
 *            FINISHER  the last blow a party finisher (《双極臨界》 or 《彼岸花》) — before BOSS: it is the
 *                      blow that ended it that she is pleased with
 *
 * Delivered files go in mugen-assets/files/characters/kaos/result/ under the names written here (read as a
 * folder: put one there and it is used, no other line to add). docs/KAOS_RESULT_FACES.md has their spec.
 */

export type ResultParty = 'DUO' | 'TRIO' | 'NO_KAOS';
export type ResultHow = 'NORMAL' | 'BOSS' | 'FINISHER';

export interface ResultFaceArt {
  /** The delivered picture's name in mugen-assets/files/characters/kaos/result/. */
  file: string;
  /** Hers that stands in until it is delivered. */
  stand: KaosFace;
}

export const RESULT_FACES: Readonly<Record<Exclude<ResultParty, 'NO_KAOS'>, Readonly<Record<ResultHow, ResultFaceArt>>>> = {
  DUO: {
    NORMAL: { file: 'kaos-result-duo-normal.png', stand: 'SMILE' },
    BOSS: { file: 'kaos-result-duo-boss.png', stand: 'DOYA' },
    FINISHER: { file: 'kaos-result-duo-finisher.png', stand: 'DOYA' },
  },
  TRIO: {
    NORMAL: { file: 'kaos-result-trio-normal.png', stand: 'SMILE' },
    BOSS: { file: 'kaos-result-trio-boss.png', stand: 'DOYA' },
    FINISHER: { file: 'kaos-result-trio-finisher.png', stand: 'DOYA' },
  },
};

/** Who fought, by the members' ids: with her and him, two or three; without her, nothing. */
export function resultPartyOf(memberIds: readonly string[]): ResultParty {
  if (!memberIds.includes('kaos')) return 'NO_KAOS';
  return memberIds.includes('grave') ? 'TRIO' : 'DUO';
}

/** How it was won: a finisher's last blow first, then a boss, else an ordinary win. */
export function resultHowOf(won: { byFinisher: boolean; boss: boolean }): ResultHow {
  if (won.byFinisher) return 'FINISHER';
  return won.boss ? 'BOSS' : 'NORMAL';
}

/** The face for this result, or null where she was not in it. */
export function resultFaceFor(party: ResultParty, how: ResultHow): (ResultFaceArt & { party: ResultParty; how: ResultHow }) | null {
  if (party === 'NO_KAOS') return null;
  return { ...RESULT_FACES[party][how], party, how };
}

/** The delivered pictures, read as a folder: the name is the whole of it. */
const delivered = import.meta.glob('../../../../mugen-assets/files/characters/kaos/result/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** A delivered picture by its name, or null while it is not there (the stand-in is shown). */
export function resultFaceFile(file: string, files: Record<string, string> = delivered): string | null {
  const hit = Object.entries(files).find(([path]) => path.endsWith(`/${file}`));
  return hit ? hit[1] : null;
}
