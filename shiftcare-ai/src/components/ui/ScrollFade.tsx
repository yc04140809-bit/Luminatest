/**
 * 横スクロール可能なテーブル等の端に重ねる、スクロール可能であることを示すフェード表示。
 * 先頭列がsticky(左固定)なテーブルでは、左フェードを重ねると固定列の文字が隠れて見えるため
 * showStart=falseで左フェードを省略できる。
 */
export function ScrollFadeEdges({
  atStart,
  atEnd,
  showStart = true,
}: {
  atStart: boolean;
  atEnd: boolean;
  showStart?: boolean;
}) {
  return (
    <>
      {showStart && (
        <div
          aria-hidden
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-30 bg-gradient-to-r from-white to-transparent transition-opacity duration-200 ${
            atStart ? 'opacity-0' : 'opacity-100'
          }`}
        />
      )}
      <div
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-30 bg-gradient-to-l from-white to-transparent transition-opacity duration-200 ${
          atEnd ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </>
  );
}
