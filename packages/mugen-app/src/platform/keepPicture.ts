import { Capacitor } from '@capacitor/core';

/**
 * THE PICTURE TO KEEP, ON THE PHONE (C1 — 作者 2026-11-07: 審査もテスター配布も APK が主形態).
 *
 * The Android shell's WebView has neither the Web Share API nor a way to save a `blob:` link, so in the APK the
 * picture goes through Capacitor instead:
 *
 *   共有する  written to the app's cache, then the device's own share sheet (Googleフォト, Drive, LINE, X …)
 *   保存する  written to the device's Documents, in 「MUGEN ZERO」 (Android 9 and lower: asked for once)
 *
 * In a browser neither is used (ui/chapterEnd: Web Share where there is one, and the download link). Every
 * failure is said, never thrown: the summary stays where it is.
 */
export const KEPT_FOLDER = 'MUGEN ZERO';

export function inNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function asBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** A name of its own each time (a second picture never fails on the first one's name). */
export function keptName(base: string, at = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}${p(at.getSeconds())}`;
  return base.replace(/\.png$/i, `-${stamp}.png`);
}

export type NativeOutcome = { ok: true; where?: string } | { ok: false; cancelled?: boolean; why: string };

/** Through the device's share sheet. */
export async function shareNative(blob: Blob, name: string, text: string): Promise<NativeOutcome> {
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const written = await Filesystem.writeFile({ path: name, data: await asBase64(blob), directory: Directory.Cache });
    await Share.share({ title: 'MUGEN ZERO', text, files: [written.uri], dialogTitle: text });
    return { ok: true };
  } catch (e) {
    const msg = String((e as { message?: string })?.message ?? e);
    // Put away without choosing anything: nothing to say.
    if (/cancel/i.test(msg)) return { ok: false, cancelled: true, why: msg };
    console.warn('Could not share the picture', e);
    return { ok: false, why: msg };
  }
}

/** Into Documents/MUGEN ZERO on the device. */
export async function saveNative(blob: Blob, name: string): Promise<NativeOutcome> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    // Android 9 and lower write to shared storage only with leave (10 and up: the app's own new files need none).
    try {
      const has = await Filesystem.checkPermissions();
      if (has.publicStorage !== 'granted') await Filesystem.requestPermissions();
    } catch {
      // Asked where it can be; the write says whether it worked.
    }
    await Filesystem.writeFile({
      path: `${KEPT_FOLDER}/${keptName(name)}`,
      data: await asBase64(blob),
      directory: Directory.Documents,
      recursive: true,
    });
    return { ok: true, where: `ドキュメント／${KEPT_FOLDER}` };
  } catch (e) {
    console.warn('Could not save the picture', e);
    return { ok: false, why: String((e as { message?: string })?.message ?? e) };
  }
}
