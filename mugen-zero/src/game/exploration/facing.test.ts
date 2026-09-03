import { describe, it, expect } from 'vitest';
import { directionFor } from './facing';

describe('directionFor', () => {
  it('faces the way he walks, by the bigger axis', () => {
    expect(directionFor(-1, 0, 'back')).toBe('left');
    expect(directionFor(1, 0, 'back')).toBe('right');
    expect(directionFor(0, -1, 'front')).toBe('back');
    expect(directionFor(0, 1, 'back')).toBe('front');
  });

  it('reads a diagonal as the axis it mostly moves along', () => {
    // Mostly sideways, drifting up the screen: the side view.
    expect(directionFor(-0.9, -0.4, 'back')).toBe('left');
    expect(directionFor(0.9, 0.4, 'back')).toBe('right');
    // Mostly up or down, drifting sideways: back and front.
    expect(directionFor(-0.4, -0.9, 'front')).toBe('back');
    expect(directionFor(0.4, 0.9, 'back')).toBe('front');
  });

  it('keeps his back to us on a dead heat', () => {
    expect(directionFor(0.7071, -0.7071, 'back')).toBe('back');
    expect(directionFor(-0.7071, 0.7071, 'back')).toBe('front');
  });

  it('leaves him as he was when he is not going anywhere', () => {
    expect(directionFor(0, 0, 'left')).toBe('left');
    expect(directionFor(0, 0, 'back')).toBe('back');
  });
});
