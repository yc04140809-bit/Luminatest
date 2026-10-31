import { useEffect, useRef } from 'react';
import { playVoice } from '../../platform/audio';

/**
 * A SHOP'S WELCOME, ITS THANKS, ITS KEEPER TOUCHED (2026-10-30 ボイス第4便 リナ・第5便 ミレイ).
 *
 * The shops of the village by an id (SHOP_VOICE_SPOTS — the bakery and the tavern by their places' ids, the tool
 * shop, which has no place of its own, by ALDEN_ITEM_SHOP): walked
 * into from the village, its keeper says one of their welcomes (platform/voice.ts `shop.<id>.welcome`, a
 * different one from the last); walked out of, back to the village, their thanks (`shop.<id>.thanks`). The
 * words are the table's — a shop whose keeper has none yet (the tool shop's ミレイ, the tavern's グレイヴ) is
 * silent, and giving them a voice is two lines there, nothing here.
 */

/** The village's shops, as the voice table names them. */
export const SHOP_VOICE_SPOTS = {
  BAKERY: 'ALDEN_BAKERY', // リナ
  ITEM_SHOP: 'ALDEN_ITEM_SHOP', // ミレイ
  TAVERN: 'MOONLIGHT_TAVERN', // グレイヴ (none yet)
} as const;
export type ShopVoiceSpot = (typeof SHOP_VOICE_SPOTS)[keyof typeof SHOP_VOICE_SPOTS];

/** The voice lines a shop says, by its id. */
export const shopWelcome = (spot: string) => `shop.${spot}.welcome`;
export const shopThanks = (spot: string) => `shop.${spot}.thanks`;
export const shopTouch = (spot: string) => `shop.${spot}.touch`;

/**
 * Which shop is open (its place's id, or null on the village), and whether the screen under it is the village:
 * in — the welcome; out, back to the village — the thanks. Leaving for anywhere else (a fight, the title) says
 * nothing.
 */
export function useShopVoices(spot: string | null, onTheVillage: boolean): void {
  const was = useRef<string | null>(null);
  useEffect(() => {
    const before = was.current;
    was.current = spot;
    if (spot === before) return;
    if (before && onTheVillage) playVoice(shopThanks(before));
    if (spot) playVoice(shopWelcome(spot));
  }, [spot, onTheVillage]);
}
