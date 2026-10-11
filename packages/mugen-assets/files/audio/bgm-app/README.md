# BGM — the App's own, and pieces not used yet

Byte for byte as delivered (2026-10-11), identified by the title tag inside
each file. Every one carries `yc04140809` as its artist tag: the author's own
music, written for this game.

**Why a folder of their own:** `../bgm/` is the music shared with the
Artifact, and the Artifact's build check (`mugen-artifact/scripts/
check-build-audio.mjs`) expects every file there in its build. These are
for the App only (named in `src/appMusic.ts`, which only the App reads) or
not used yet, so they live here.

| file | delivered title | id | where it is heard |
|---|---|---|---|
| `normal-battle-2.mp3` | 通常戦闘曲② | `NORMAL_BATTLE_2` (App) | the forest's newer creatures' ordinary fights (ヒョウレイ・イワホロ・コケマル・フウミミ), unless ♪ chose otherwise |
| `special-battle.mp3` | 狩りの鼓動 | `SPECIAL_BATTLE` (App) | a fight with somebody in particular — フウミミ met at the forest's edge |
| `sekiryuga-battle.mp3` | BOSS戦闘 | `SEKIRYUGA_BATTLE` (App) | セキリュウガ's fight (BOSS戦②) |
| `result-victory.mp3` | Victory's Clear Dawn | `RESULT_NORMAL` (App) | the winnings counted up after a fight (`RESULT_BOSS` borrows it until a boss's own arrives) |
| `royal-castle.mp3` | 西洋王城の威儀 | — (not imported yet) | a castle, when there is one (author 2026-10-11: 今すぐには使わない) |
| `church-hymn.mp3` | 厳かな協会の歌 | — (not imported yet) | the church (協会), when there is one; about an hour long |
| `chapter1-final-boss.mp3` | 立ち向かう背中 | — (not imported yet) | chapter 1's last boss, after セキリュウガ (not in the game yet) |

Not imported yet means not in any build and not in the APK's size: importing
one in `src/appMusic.ts` is what puts it in.
