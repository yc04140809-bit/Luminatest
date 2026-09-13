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
 * The music, for the review build only.
 *
 * Same shape as a ReviewAsset and a different kind of encode: a
 * 45-second excerpt at 48 kbps stereo, because sixteen minutes of
 * delivered music does not fit in a 16 MiB artifact at any bitrate.
 * The delivered files are read and never written to.
 */
export declare const REVIEW_AUDIO: ReviewAsset[];

export interface ReviewAudioResult {
  out: string;
  from: number;
  to: number;
}

export declare function encodeReviewAudio(): ReviewAudioResult[];
