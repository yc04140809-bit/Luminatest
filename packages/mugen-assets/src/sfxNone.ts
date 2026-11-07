// THE ARTIFACT'S SOUND EFFECTS: none, deliberately.
//
// The single-file build aliases `sfx.ts` to this. The artifact is a
// sixteen-megabyte page for looking at a game on a phone browser, and
// what it must spend its last megabyte on is the artwork; whether a
// sword sounds right is a question for the APK, where there is no
// limit and the delivered files are shipped whole.
//
// The same shape as the real module, so nothing downstream knows or
// cares: an empty map is exactly what "no sound has been delivered"
// already looks like everywhere else in the audio layer.

export const SFX_FILES: Record<string, string> = {};
