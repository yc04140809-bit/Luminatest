/**
 * Types for the one alias table the whole workspace shares.
 *
 * A `.d.mts` beside the `.mjs` for the same reason
 * `scripts/review-encode-assets.d.mts` has one: a Vite config is
 * type-checked, and an untyped import into it is an `any` that the
 * strict build refuses.
 */
export declare function mugenAliases(): { find: string | RegExp; replacement: string }[];
