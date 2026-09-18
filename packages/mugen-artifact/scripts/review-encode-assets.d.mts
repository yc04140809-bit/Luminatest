// Types for the review-copy encoder, which is plain ESM so it can also
// be run on its own (`node scripts/review-encode-assets.mjs`).

export declare const REVIEW_ASSET_DIR: string;

export interface ReviewAsset {
  /** The delivered file. Read only, never written to. */
  source: string;
  /** Where its review copy is written. */
  out: string;
}

export declare const REVIEW_ASSETS: ReviewAsset[];

export interface ReviewEncodeResult {
  out: string;
  /** "1536x1024" — asserted to be unchanged by the encode. */
  size: string;
  from: number;
  to: number;
}

export declare function encodeReviewAssets(): ReviewEncodeResult[];

/**
 * The music, FOR THE ARTIFACT ONLY.
 *
 * Same shape as a ReviewAsset and a different kind of encode: a short
 * PREVIEW LOOP of each piece at 48 kbps stereo, because sixteen
 * minutes of delivered music does not fit in a 16 MiB artifact at any
 * bitrate. The length and the start are chosen per piece so the seam
 * falls where the music most nearly repeats, and the seam itself is
 * crossfaded into the file so the wrap is a continuation rather than a
 * cut. The delivered files are read and never written to, and the
 * game never sees any of this — scripts/check-build-audio.mjs fails
 * the ordinary build if a preview reaches it.
 */
export declare const REVIEW_AUDIO: ReviewAsset[];

export interface ReviewAudioResult {
  out: string;
  from: number;
  to: number;
  /** Seconds into the delivered piece that the preview loop begins. */
  start: number;
  /** How long the loop is, in seconds. */
  length: number;
  /** How well the music matched across the seam, 0..1. */
  fit: number;
  /** How far the level moved across the seam, in octaves of RMS. */
  level: number;
}

export declare function encodeReviewAudio(): ReviewAudioResult[];
