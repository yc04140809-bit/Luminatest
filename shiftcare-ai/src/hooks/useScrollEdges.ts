import { useEffect, useState, type RefObject } from 'react';

/** 横スクロール可能な要素の左右端到達状態を返す(スクロール可能であることを示すフェード表示に使う) */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      if (!el) return;
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    }

    update();
    el.addEventListener('scroll', update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { atStart, atEnd };
}
