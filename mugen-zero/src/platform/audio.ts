// AudioManager.
// Every slot may be empty (no third-party audio is bundled yet): a missing
// asset is silence, never a crash. Mobile browsers block autoplay, so
// nothing sounds until the player has interacted with the page.

import { BGM_ASSETS, SE_ASSETS, type BgmId, type SeId } from '../assets/manifest';

export class AudioManager {
  private bgmVolume = 0.6;
  private seVolume = 0.8;
  private unlocked = false;
  private currentBgmId: BgmId | null = null;
  private bgm: HTMLAudioElement | null = null;

  setVolumes(bgmVolume: number, seVolume: number): void {
    this.bgmVolume = bgmVolume;
    this.seVolume = seVolume;
    if (this.bgm) this.bgm.volume = bgmVolume;
  }

  /** Called from a real user gesture; only then may audio start. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.currentBgmId) this.playBgm(this.currentBgmId);
  }

  playBgm(id: BgmId): void {
    this.currentBgmId = id;
    const src = BGM_ASSETS[id];
    if (!src || !this.unlocked) return; // silence, not an error
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.bgmVolume;
      void audio.play().catch(() => {
        /* autoplay refused — stay silent */
      });
      this.bgm = audio;
    } catch {
      this.bgm = null;
    }
  }

  stopBgm(): void {
    this.currentBgmId = null;
    this.bgm?.pause();
    this.bgm = null;
  }

  playSe(id: SeId): void {
    const src = SE_ASSETS[id];
    if (!src || !this.unlocked) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.seVolume;
      void audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

export const audioManager = new AudioManager();
