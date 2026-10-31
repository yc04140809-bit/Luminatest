import type { CapacitorConfig } from '@capacitor/cli';

/**
 * THE ANDROID WRAPPER, AND NOTHING MORE.
 *
 * MUGEN ZERO is a web game and stays one: this file does not change
 * what the game is, only where it runs. `webDir` is the ordinary Vite
 * build — the same `npm run build` the web version ships — so there is
 * no second, Android-only build of the game to keep in step.
 *
 * THIS IS A DEVELOPMENT BUILD. The application id says so, and it is
 * deliberately not a release identity: nothing here is set up for
 * signing, for a store listing, or for anybody but a playtester with
 * the APK in their hand.
 */
const config: CapacitorConfig = {
  appId: 'com.mugenzero.alpha',
  appName: 'MUGEN ZERO',
  webDir: 'dist',
  server: {
    /**
     * PINNED, BECAUSE THE SAVE IS ATTACHED TO IT.
     *
     * IndexedDB belongs to an ORIGIN, and in the Android shell the
     * origin is this scheme plus `localhost`. Changing it later would
     * not migrate a player's world — it would hand the game a
     * different, empty database and look exactly like the save being
     * lost. `https` is Capacitor's own default; it is written down
     * here so that it is a decision rather than a default somebody
     * can change without noticing what is attached to it.
     */
    androidScheme: 'https',
  },
  android: {
    // The stage is drawn on this, and a white flash before the first
    // paint is the one thing a dark game must not open with.
    backgroundColor: '#0b0b12',
    // A debug APK is for looking into. The release path does not exist
    // yet, and when it does this stays off there.
    webContentsDebuggingEnabled: true,
  },
};

export default config;
