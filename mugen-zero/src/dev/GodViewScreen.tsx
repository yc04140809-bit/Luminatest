import { useMemo, useState } from 'react';
import type { World } from '../core/world/world';
import type { CharacterState } from '../core/characters/types';
import { readWorldLife, WORLD_LIFE_RULES } from '../core/life/worldReading';
import type { WorldLifeState } from '../core/life/types';
import {
  ALDEN_REGION,
  WORLD_PEOPLE,
  type WorldPerson,
} from '../content/world/mugenWorld';
import {
  isolatedPeople,
  observeWorld,
  rosterLine,
  unreachedBlooms,
  type NpcObservation,
} from './godView';
import { grownDemoWorld } from './worldLifeDemo';

/**
 * GOD VIEW — the author looking at a world they are growing.
 *
 * DEV ONLY. A player is meant to find out what became of somebody by
 * walking into a bakery three years later; a screen listing 「SEED強度
 * 0.78」 would take that away from them for good. Nothing outside the
 * dev gate reaches this.
 *
 * A TABLE, ON PURPOSE. There is no graph library here and there should
 * not be one yet — a force-directed picture of fourteen vines is a
 * pretty way of not being able to read any of them. What an author
 * actually needs first is to see the numbers and to be able to narrow
 * to one person. When the world is large enough that a table stops
 * working, that is the moment to argue about drawing it.
 *
 * Everything on screen is derived, every time, from canon. There is no
 * GOD VIEW state to fall out of step with the world, and the screen
 * cannot write to anything.
 */

interface Props {
  world: World;
  onBack: () => void;
}

/**
 * Which world is being looked at.
 *
 * 'SAVE' is the tester's own, which on a fresh file is almost empty —
 * correctly, because nothing has happened. 'DEMO' is the HELP route
 * four years on, which is what an author wants when the question is
 * "does the world I wrote work" rather than "what has this playthrough
 * done". Both run the same rules through the same reader.
 */
type Source = 'SAVE' | 'DEMO';

export function GodViewScreen({ world, onBack }: Props) {
  const [source, setSource] = useState<Source>('SAVE');
  const [selected, setSelected] = useState<string | null>(null);

  const characters = useMemo(() => {
    const found: Record<string, CharacterState | undefined> = {};
    for (const person of WORLD_PEOPLE) found[person.npcId] = world.getCharacter(person.npcId);
    return found;
  }, [world]);

  const life: WorldLifeState = useMemo(
    () =>
      source === 'SAVE'
        ? readWorldLife(world.getEvents(), world.getClock())
        : grownDemoWorld(),
    [source, world],
  );

  const view = useMemo(
    () => observeWorld(life, WORLD_LIFE_RULES, WORLD_PEOPLE, ALDEN_REGION, characters),
    [life, characters],
  );

  const alone = isolatedPeople(view);
  const blocked = unreachedBlooms(view);
  const chosen =
    selected === null
      ? null
      : ([...view.people, ...view.outsiders].find((p) => p.npcId === selected) ?? null);

  const group = (standing: WorldPerson['standing']) =>
    view.people.filter((person) => person.standing === standing);

  return (
    <div className="screen" data-testid="god-view">
      <div className="screen-title">GOD VIEW / ALDEN VILLAGE</div>
      <div className="screen-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={ROW}>
          {(['SAVE', 'DEMO'] as const).map((which) => (
            <button
              key={which}
              className={source === which ? 'btn primary' : 'btn'}
              style={BTN}
              data-testid={`god-source-${which}`}
              onClick={() => {
                setSource(which);
                setSelected(null);
              }}
            >
              {which === 'SAVE' ? 'このセーブ' : 'デモ世界（HELP・約4年後）'}
            </button>
          ))}
        </div>

        <div className="location-desc" style={MONO} data-testid="god-clock">
          {`WORLD ${view.now.worldYear}年目 ${view.now.worldDay}日目`}
          {`  /  NPC ${view.people.length}人  MEMORY ${view.memories.length}件`}
          {`  SEED ${life.seeds.length}件  VINE ${life.vines.length}本  BLOOM ${life.blooms.length}件`}
        </div>

        {/* ---- 警告 ----
            The two quiet failures, at the top where they cannot be
            scrolled past. A world grows wrong silently; this is the
            only place it says so. */}
        <Block title="⚠ 孤立NPC（誰とも人生が繋がっていない）" id="isolated">
          {alone.length === 0 ? (
            <div className="location-desc" style={MONO}>
              なし — この地域の全員が誰かと繋がっています
            </div>
          ) : (
            alone.map((person) => (
              <button
                key={person.npcId}
                className="btn"
                style={{ ...BTN, textAlign: 'left', flex: '1 1 100%' }}
                data-testid={`god-isolated-${person.npcId}`}
                onClick={() => setSelected(person.npcId)}
              >
                <span style={MONO}>
                  {person.name}（{person.npcId}） — SEED {person.seeds.length}件 / MEMORY{' '}
                  {person.memories.length}件だが、人物VINE 0本
                </span>
              </button>
            ))
          )}
        </Block>

        {view.unlisted.length > 0 && (
          <Block title="⚠ 名簿に無いNPC（エンジンは人生を育てているが観測できない）" id="unlisted">
            <div className="location-desc" style={MONO} data-testid="god-unlisted">
              {view.unlisted.join(' / ')}
            </div>
          </Block>
        )}

        {/* ---- NPC一覧 ---- */}
        <Block title="NPC一覧（重要）" id="principals">
          <Roster people={group('PRINCIPAL')} selected={selected} onPick={setSelected} />
        </Block>
        <Block title="NPC一覧（一般）" id="ordinary">
          <Roster people={group('ORDINARY')} selected={selected} onPick={setSelected} />
        </Block>
        <Block title="場所（SEEDを持つ）" id="places">
          <Roster people={group('PLACE')} selected={selected} onPick={setSelected} />
        </Block>

        {/* ---- 他地域接続 ---- */}
        <Block title="他地域接続" id="outside">
          {view.outsiders.length === 0 ? (
            <div className="location-desc" style={MONO} data-testid="god-outside-none">
              なし — この地域から外へ伸びた人生の線はまだありません
            </div>
          ) : (
            <Roster people={view.outsiders} selected={selected} onPick={setSelected} showRegion />
          )}
        </Block>

        {/* ---- 選択したNPCだけ ---- */}
        {chosen && <Detail person={chosen} onClear={() => setSelected(null)} />}

        {/* ---- 世界全体 ---- */}
        {!chosen && (
          <>
            <Block title="WORLD MEMORY（全件）" id="memory">
              <div className="location-desc" style={MONO} data-testid="god-memory">
                {view.memories
                  .map(
                    (memory) =>
                      `Y${memory.time.worldYear}D${memory.time.worldDay}  ${memory.action}` +
                      `  ${memory.actor} → ${memory.target ?? '—'} @ ${memory.location}`,
                  )
                  .join('\n')}
              </div>
            </Block>
            <Block title="交差（WORLD VINE）" id="crossings">
              <div className="location-desc" style={MONO} data-testid="god-crossings">
                {view.crossings
                  .map(
                    (check) =>
                      `${check.already ? '済' : '未'}  ${check.def.id}  ` +
                      `[${check.def.between.join(' × ')}]` +
                      (check.already
                        ? ''
                        : '\n' +
                          check.reasons
                            .map((r) => `      ${r.met ? '✓' : '·'} ${r.requirement}: ${r.detail}`)
                            .join('\n')),
                  )
                  .join('\n')}
              </div>
            </Block>
            <Block title="まだ届いていないBLOOMと、止めている条件" id="blocked">
              <div className="location-desc" style={MONO} data-testid="god-blocked">
                {blocked.length === 0
                  ? '（書かれたBLOOMはすべて候補に立っています）'
                  : blocked
                      .map((entry) => `${entry.npcId}  ${entry.id}\n      ← ${entry.blocking.join(' / ')}`)
                      .join('\n')}
              </div>
            </Block>
          </>
        )}
      </div>
      {/* A compact footer, because this screen is mostly a wall of
          facts on a 390px-tall phone and the ordinary one costs a
          quarter of it for a single button. */}
      <div className="screen-footer" style={{ paddingTop: 4, paddingBottom: 4 }}>
        <button
          className="btn"
          style={{ fontSize: 12, padding: '8px 12px' }}
          data-testid="god-view-back"
          onClick={onBack}
        >
          もどる
        </button>
      </div>
    </div>
  );
}

/** One tappable line per person. The whole navigation of the screen. */
function Roster({
  people,
  selected,
  onPick,
  showRegion = false,
}: {
  people: readonly NpcObservation[];
  selected: string | null;
  onPick: (npcId: string) => void;
  showRegion?: boolean;
}) {
  if (people.length === 0) {
    return (
      <div className="location-desc" style={MONO}>
        （この分類のNPCはいません）
      </div>
    );
  }
  return (
    <>
      {people.map((person) => (
        <button
          key={person.npcId}
          className={selected === person.npcId ? 'btn primary' : 'btn'}
          style={{ ...BTN, textAlign: 'left', flex: '1 1 100%' }}
          data-testid={`god-npc-${person.npcId}`}
          onClick={() => onPick(person.npcId)}
        >
          <span style={MONO}>
            {rosterLine(person)}
            {showRegion ? `  @${person.region}` : ''}
          </span>
        </button>
      ))}
    </>
  );
}

/**
 * One person, and only what belongs to them.
 *
 * The narrowing the whole screen is for: an author asking 「この子の人生
 * はいま何でできているのか」 should not have to read the world's records
 * to find the four that are hers.
 */
function Detail({ person, onClear }: { person: NpcObservation; onClear: () => void }) {
  return (
    <div data-testid="god-detail">
      <Block title={`▼ ${person.name}（${person.npcId}）だけを表示`} id="detail">
        <button className="btn" style={BTN} data-testid="god-detail-clear" onClick={onClear}>
          絞り込みを解除
        </button>
        <div className="location-desc" style={MONO} data-testid="god-detail-core">
          {[
            `REGION    ${person.region}  /  ${person.standing}`,
            person.character
              ? `CANON     ${person.character.alive ? '生存' : '死亡'} ${person.character.age}歳` +
                ` / ${person.character.occupation} / ${person.character.location}`
              : 'CANON     CHARACTER_STATE未登録（この人を映せるシーンはまだ無い）',
            person.core
              ? `CORE      traits=[${person.core.traits.join(',')}] values=[${person.core.values.join(
                  ',',
                )}]\n          desires=[${person.core.desires.join(',')}] aptitudes=${JSON.stringify(
                  person.core.aptitudes,
                )}`
              : 'CORE      未定義（この人にはSEEDが根づきません）',
          ].join('\n')}
        </div>
      </Block>

      <Block title={`SEED（${person.seeds.length}）`} id="detail-seeds">
        <div className="location-desc" style={MONO} data-testid="god-detail-seeds">
          {person.seeds.length === 0
            ? 'なし'
            : person.seeds
                .map(
                  (seed) =>
                    `${seed.type}  ${seed.status}  強度 ${seed.strength.toFixed(2)}  (${seed.visibility})` +
                    `\n      ← ${seed.sourceMemoryId}` +
                    (seed.fedBy.length > 0 ? `  / 補強 ${seed.fedBy.length}回` : ''),
                )
                .join('\n')}
        </div>
      </Block>

      <Block title={`VINE（人物 ${person.linkedTo.length}）`} id="detail-vines">
        <div className="location-desc" style={MONO} data-testid="god-detail-vines">
          {[
            person.linkedTo.length === 0
              ? '人物との繋がり: なし ⚠ 孤立'
              : `人物との繋がり: ${person.linkedTo.join(' / ')}`,
            ...person.vinesOut.map((v) => `  → ${v.relationType} → ${v.target} [${v.status}]`),
            ...person.vinesIn.map((v) => `  ← ${v.source} --${v.relationType}--> [${v.status}]`),
            person.linkedOutside.length > 0
              ? `他地域: ${person.linkedOutside.map((o) => `${o.npcId}@${o.region}`).join(' / ')}`
              : '他地域: なし',
          ].join('\n')}
        </div>
      </Block>

      <Block title={`BLOOM（候補 ${person.blooms.length} / 定義 ${person.bloomChecks.length}）`} id="detail-blooms">
        <div className="location-desc" style={MONO} data-testid="god-detail-blooms">
          {person.bloomChecks.length === 0
            ? 'この人について書かれたBLOOMはありません'
            : person.bloomChecks
                .map(
                  (check) =>
                    `${check.met ? '候補' : 'まだ'}  ${check.def.id}` +
                    `\n      ${check.def.result}\n` +
                    check.reasons
                      .map((r) => `      ${r.met ? '✓' : '·'} ${r.requirement}: ${r.detail}`)
                      .join('\n'),
                )
                .join('\n')}
        </div>
      </Block>

      <Block title={`WORLD MEMORY（${person.memories.length}）`} id="detail-memory">
        <div className="location-desc" style={MONO} data-testid="god-detail-memory">
          {person.memories.length === 0
            ? 'なし'
            : person.memories
                .map(
                  (memory) =>
                    `Y${memory.time.worldYear}D${memory.time.worldDay}  ${memory.action}` +
                    `  ${memory.actor} → ${memory.target ?? '—'} @ ${memory.location}`,
                )
                .join('\n')}
        </div>
      </Block>
    </div>
  );
}

function Block({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div data-testid={`god-block-${id}`} style={{ marginBottom: 2 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.1em',
          color: 'var(--accent)',
          padding: '6px 2px 2px',
        }}
      >
        {title}
      </div>
      <div style={ROW}>{children}</div>
    </div>
  );
}

/** Traces are columns of facts, so they are set as one. */
const MONO: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 11,
  lineHeight: 1.5,
};

const ROW: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4 };
const BTN: React.CSSProperties = { fontSize: 12, padding: '6px 10px', flex: '1 1 40%' };
