// DEV ADMIN gate.
// Enabled in dev builds; a production build hides the entry and screens
// entirely unless VITE_ENABLE_DEV_ADMIN=1 is set at build time.

export const DEV_ADMIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_ADMIN === '1';

/** MVP-only convenience lock. NOT production security. */
export const DEV_LOCK_CODE = '0909';
