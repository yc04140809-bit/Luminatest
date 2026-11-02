import { useSyncExternalStore } from 'react';
import { displaySettings, watchDisplaySettings } from '../../platform/settings';

/**
 * 画面の明るさ (設定): over everything, and never in a finger's way. Darker — a black veil; brighter — what is
 * behind it drawn brighter (backdrop-filter). Neither touches the phone's own brightness. At 100%, nothing.
 */
export function BrightnessVeil() {
  const b = useSyncExternalStore(watchDisplaySettings, () => displaySettings().brightness);
  if (Math.abs(b - 1) < 0.005) return null;
  const style =
    b < 1
      ? { background: `rgba(0, 0, 0, ${(1 - b).toFixed(3)})` }
      : { backdropFilter: `brightness(${b.toFixed(3)})`, WebkitBackdropFilter: `brightness(${b.toFixed(3)})` };
  return <div className="brightness-veil" data-testid="brightness-veil" data-brightness={b.toFixed(2)} aria-hidden="true" style={style} />;
}
