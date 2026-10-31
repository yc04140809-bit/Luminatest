// A STAND-IN VOICE, for seeing the voice's way through before any line is recorded (2026-10-30 タスクD).
//
// Debug builds only, and only when asked: `?voice=dummy` lends this one short tone as ケイオス's
// 《双極臨界》 shout (platform/voice.ts `battle.soukyoku_rinkai`), so her finisher's cut-in is heard
// saying it. A release build has neither this file nor its sound (src/dev/ is left out of it).
import dummy from './voice-dummy.mp3';
import { lendVoiceFiles, VOICE_LINES } from '../platform/voice';

export function lendDummyVoice(): void {
  lendVoiceFiles({ [VOICE_LINES['battle.soukyoku_rinkai'].files[0]]: dummy });
}
