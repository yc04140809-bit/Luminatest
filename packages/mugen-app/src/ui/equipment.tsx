import '@fontsource/noto-serif-jp/latin-400.css';
import '@fontsource/noto-serif-jp/japanese-400.css';
import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { activeParty } from '@mugen/game/party/battleParty';
import { statusArtOf } from '@mugen/content/characters/characterAppearance';
import { presentationOf } from '@mugen/content/characters/characterPresentation';
import { heroNameLength } from '@mugen/core/world/heroName';
import {
  EQUIPMENT_SLOTS,
  OPERABLE_SLOTS,
  SLOT_LABELS,
  weaponDefOf,
  type EquipmentSlot,
} from '@mugen/content/equipment/equipment';
import { equippableWeapons, weaponTypeOf } from '@mugen/content/equipment/equipResolve';
import { WEAPON_LABELS } from '@mugen/content/characters/battleProfiles';
import { isPortraitKey, portraitArt, statusVisualArt } from '../assets/portraits';

/**
 * THE EQUIPMENT SCREEN — the status screen's骨格, a different middle.
 *
 * Same columns, same palette, same 明朝, same picture area, and the
 * same character tabs. What changes is which menu entry is lit and
 * what the middle holds; nothing about the right-hand side is new
 * code, which is the point of having given the picture its own area.
 *
 * ONLY THE WEAPON CAN BE TOUCHED. The other three slots are drawn so
 * the shape of the thing is visible, with no border, no handler and no
 * press state — the same line the left menu holds. `OPERABLE_SLOTS`
 * decides that rather than a condition written here, so the day an
 * outfit exists the frame and the handler arrive together.
 *
 * KAOS HAS A WEAPON SLOT AND THE UNWRITTEN DO NOT. The slot is drawn
 * for anybody who could hold SOMETHING, and she can: the grimoire is a
 * magic focus and needs no weapon type. Somebody whose weapon type
 * nobody has decided gets no weapon row at all rather than an empty
 * one — undecided is not blank.
 */
interface Props {
  world: World;
  onBack: () => void;
  onStatus: () => void;
}

export function EquipmentScreen({ world, onBack, onStatus }: Props) {
  const party = activeParty({ hero: world.getHeroName() });
  const [at, setAt] = useState(0);
  const who = party[Math.min(at, party.length - 1)];
  const says = presentationOf(who.id);
  const art = statusArtOf(who.id);
  const kind = art?.kind ?? 'PORTRAIT';
  const [picture, setPicture] = useState<string | null>(null);
  /** Which slot's list is open, or null for none. */
  const [picking, setPicking] = useState<EquipmentSlot | null>(null);

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

  // Switching character closes an open list: it belonged to the
  // person you were looking at.
  useEffect(() => setPicking(null), [who.id]);

  const choices = equippableWeapons(who.id);
  const equippedId = world.getEquipped(who.id, 'WEAPON');
  const equipped = equippedId ? weaponDefOf(equippedId) : null;
  const weaponType = weaponTypeOf(who.id, equippedId);
  const owned = world.getOwnedEquipment();
  const nameScale = Math.max(0.68, Math.min(1, 8 / heroNameLength(who.label)));

  const wear = (id: string | null) => {
    void world.setEquipped(who.id, 'WEAPON', id).then(() => setPicking(null));
  };

  return (
    <div className="screen status-screen" data-art={kind} data-testid="equipment-screen">
      <div className="st-visual" aria-hidden="true">
        {picture && <img src={picture} alt="" data-testid={`equip-portrait-${who.id}`} />}
      </div>

      <div className="st-head">
        <p className="st-wordmark">
          <b>EQUIP</b>
          <i>MUGEN ZERO</i>
        </p>
        {party.length > 1 && (
          <div className="st-tabs" role="tablist">
            {party.map((member, i) => (
              <button
                className={i === at ? 'st-tab on' : 'st-tab'}
                key={member.id}
                role="tab"
                aria-selected={i === at}
                data-testid={`equip-tab-${member.id}`}
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
          {/* THE ONE LIVE WAY BACK UP. 装備 is where we are; ステータス
              is a real screen and gets a real control. The rest are
              named and nothing else. */}
          <button className="st-menu-item live" data-testid="equip-to-status" onClick={onStatus}>
            ステータス
          </button>
          <span className="st-menu-item soon" aria-disabled="true">
            スキル
          </span>
          <span className="st-menu-item on" aria-current="page">
            装備
          </span>
          <span className="st-menu-item soon" aria-disabled="true">
            ストーリー
          </span>
        </nav>

        <div className="st-info">
          <p className="st-name" data-testid="equip-name">
            <b style={nameScale < 1 ? { fontSize: `${(nameScale * 100).toFixed(0)}%` } : undefined}>
              {who.label}
            </b>
            {says && <i>{says.roman}</i>}
          </p>
          {says?.epithet && <p className="st-epithet">{says.epithet}</p>}

          <div className="eq-slots">
            {EQUIPMENT_SLOTS.map((slot) => {
              const operable = OPERABLE_SLOTS.includes(slot);
              // Nobody who could hold nothing gets a row offering it.
              if (operable && choices.length === 0) return null;
              // WHILE CHOOSING, THE SLOTS THAT CANNOT BE CHOSEN STEP
              // ASIDE. On a 321px handset the list had room for one
              // row and the swords were clipped out of sight; the
              // three unbuilt slots were using the space. They come
              // back the moment the list closes.
              if (!operable && picking) return null;
              if (!operable) {
                return (
                  <div className="eq-slot soon" key={slot} aria-disabled="true">
                    <u>{SLOT_LABELS[slot]}</u>
                    <b>—</b>
                  </div>
                );
              }
              return (
                <button
                  className={picking === slot ? 'eq-slot open' : 'eq-slot'}
                  key={slot}
                  data-testid={`equip-slot-${slot}`}
                  onClick={() => setPicking(picking === slot ? null : slot)}
                >
                  <u>{SLOT_LABELS[slot]}</u>
                  <b data-testid="equip-weapon-name">{equipped ? equipped.name : '装備なし'}</b>
                  <span className="eq-kind" data-testid="equip-weapon-type">
                    {weaponType ? WEAPON_LABELS[weaponType] : '魔法'}
                  </span>
                  <s>›</s>
                </button>
              );
            })}
          </div>

          {/* THE LIST REPLACES THE PROSE rather than covering it: what
              is held and what could be held belong on screen together. */}
          {picking ? (
            <div className="eq-pick" data-testid="equip-picker">
              <p>もちもの — {weaponType ? WEAPON_LABELS[weaponType] : '魔法'}</p>
              {/* TAKING IT OFF IS A CHOICE IN THE SAME LIST, offered
                  only when there is something to take off — an 「外す」
                  on an empty hand is a button that does nothing. */}
              {equippedId && (
                <button
                  className="eq-row"
                  data-testid="equip-remove"
                  onClick={() => wear(null)}
                >
                  <em />
                  <u>外す</u>
                  <s>装備なし</s>
                </button>
              )}
              {choices.map((weapon) => (
                <button
                  className={weapon.equipmentId === equippedId ? 'eq-row on' : 'eq-row'}
                  key={weapon.equipmentId}
                  disabled={(owned[weapon.equipmentId] ?? 0) <= 0}
                  data-testid={`equip-choice-${weapon.equipmentId}`}
                  onClick={() => wear(weapon.equipmentId)}
                >
                  <em>{weapon.equipmentId === equippedId ? '装備中' : ''}</em>
                  <u>{weapon.name}</u>
                  <s>攻撃 +{weapon.effect.attack}</s>
                </button>
              ))}
            </div>
          ) : (
            <p className="st-style-note" data-testid="equip-description">
              {equipped ? equipped.description : (says?.styleNote ?? '')}
            </p>
          )}
        </div>
      </div>

      <div className="st-foot">
        <button className="st-back" data-testid="equip-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
