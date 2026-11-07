import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: { kind: string; arg: unknown }[] = [];
let shareFails: string | null = null;
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE', Documents: 'DOCUMENTS' },
  Filesystem: {
    writeFile: vi.fn(async (o: { path: string; directory: string }) => {
      calls.push({ kind: 'write', arg: o });
      return { uri: `file:///${o.directory}/${o.path}` };
    }),
    checkPermissions: vi.fn(async () => ({ publicStorage: 'granted' })),
    requestPermissions: vi.fn(async () => ({ publicStorage: 'granted' })),
  },
}));
vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(async (o: unknown) => {
      calls.push({ kind: 'share', arg: o });
      if (shareFails) throw new Error(shareFails);
      return {};
    }),
  },
}));

import { keptName, saveNative, shareNative, KEPT_FOLDER } from './keepPicture';

const png = () => new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' });

describe('the picture to keep, in the APK (C1)', () => {
  beforeEach(() => {
    calls.length = 0;
    shareFails = null;
  });

  it('a name of its own each time', () => {
    expect(keptName('mugen-zero-chapter1.png', new Date(2026, 10, 7, 9, 5, 3))).toBe('mugen-zero-chapter1-20261107-090503.png');
  });

  it('共有する: written to the cache, then the share sheet with that file', async () => {
    expect(await shareNative(png(), 'mugen-zero-chapter1.png', 'あなたの第1章')).toEqual({ ok: true });
    const [write, share] = calls;
    expect(write.arg).toMatchObject({ path: 'mugen-zero-chapter1.png', directory: 'CACHE', data: btoa(String.fromCharCode(137, 80, 78, 71, 1, 2, 3)) });
    expect(share.arg).toMatchObject({ files: ['file:///CACHE/mugen-zero-chapter1.png'] });
  });

  it('put away without choosing: said as cancelled, not as a failure', async () => {
    shareFails = 'Share canceled';
    expect(await shareNative(png(), 'a.png', 'x')).toMatchObject({ ok: false, cancelled: true });
    shareFails = 'Something broke';
    expect(await shareNative(png(), 'a.png', 'x')).toMatchObject({ ok: false });
    expect((await shareNative(png(), 'a.png', 'x')) as { cancelled?: boolean }).not.toHaveProperty('cancelled', true);
  });

  it('保存する: into Documents/MUGEN ZERO, under a name of its own', async () => {
    const r = await saveNative(png(), 'mugen-zero-chapter1.png');
    expect(r).toEqual({ ok: true, where: `ドキュメント／${KEPT_FOLDER}` });
    expect(calls[0].arg).toMatchObject({ directory: 'DOCUMENTS', recursive: true });
    expect((calls[0].arg as { path: string }).path).toMatch(/^MUGEN ZERO\/mugen-zero-chapter1-\d{8}-\d{6}\.png$/);
  });
});
