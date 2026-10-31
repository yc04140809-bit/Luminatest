import { useEffect, useRef } from 'react';

/**
 * Runs `run` once, as the screen it is drawn on is shown — after the
 * previous screen's celebrations were dropped (the host is keyed by the
 * screen), so what it asks for is shown here, on this screen.
 */
export function WhenShown({ run }: { run: () => void }) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    run();
    // Once, as it is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
