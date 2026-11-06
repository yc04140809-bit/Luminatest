import { describe, expect, it } from 'vitest';
import { isHarmless } from './CrashScreen';

describe('B3: an error nothing caught is kept — not the harmless ones a browser says on its own', () => {
  it('a sound not allowed yet, a sound cut off, the layout resize loop: harmless; anything else is kept', () => {
    expect(isHarmless(new DOMException('play() failed', 'NotAllowedError'))).toBe(true);
    expect(isHarmless(new DOMException('The play() request was interrupted', 'AbortError'))).toBe(true);
    expect(isHarmless(new Error('ResizeObserver loop completed with undelivered notifications.'))).toBe(true);
    expect(isHarmless(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isHarmless('a string thrown')).toBe(false);
  });
});
