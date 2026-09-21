#!/usr/bin/env node
// 立ち絵が docs/PORTRAIT_MASTER.md の仕様を満たしているか測る。
//
// 直すのではなく、報告するだけ。絵に手を入れるかどうかは作者の判断で、
// このスクリプトが勝手に決めることではない。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANVAS = { w: 1200, h: 2000 };
const BASELINE = 1940; // 不透明部分の下端。キャンバス下端から 3%。
const TOLERANCE = 2; // px

const ROOT = fileURLToPath(
  new URL('../../mugen-assets/files/characters/', import.meta.url),
);

/** PNG の IHDR から幅と高さだけ読む。デコードはしない。 */
function pngSize(path) {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// portraits.ts が実際に読んでいる画像。増えたらここに足す。
//
// 2種類あり、仕様が違う。
//   MASTER … 透過立ち絵。1200x1800 の共通キャンバス。汎用。
//   VISUAL … ステータス画面専用の背景込み長方形。寸法は自由。
// VISUAL にマスター仕様を当てるのは誤りなので、検査から除外する。
const MASTERS = [
  ['hero', 'hero/hero-battle-idle.png'],
  ['kaos', 'kaos/kaos-battle-default.png'],
];
const VISUALS = [
  ['hero', 'hero/hero-status-visual.png'],
  ['kaos', 'kaos/kaos-status-visual.png'],
];

let bad = 0;
console.log(`立ち絵マスター仕様: ${CANVAS.w}x${CANVAS.h} (3:5), 足元基準線 y=${BASELINE}\n`);
for (const [key, rel] of MASTERS) {
  const size = pngSize(join(ROOT, rel));
  if (!size) {
    console.log(`  x ${key}  ${rel} — PNG として読めない`);
    bad += 1;
    continue;
  }
  const faults = [];
  if (Math.abs(size.w - CANVAS.w) > TOLERANCE || Math.abs(size.h - CANVAS.h) > TOLERANCE) {
    faults.push(`キャンバス ${size.w}x${size.h}（要 ${CANVAS.w}x${CANVAS.h}）`);
  }
  if (Math.abs(size.w / size.h - 1200 / 2000) > 0.01) {
    faults.push(`比率 1:${(size.h / size.w).toFixed(3)}（要 1:1.667）`);
  }
  if (faults.length === 0) {
    console.log(`  o ${key}  ${rel}  ${size.w}x${size.h}`);
  } else {
    console.log(`  x ${key}  ${rel}`);
    for (const f of faults) console.log(`      ${f}`);
    bad += 1;
  }
}

// 足元基準線はアルファを読む必要があるため、ここでは測っていない。
console.log(`\n未適合 ${bad} 枚。UI は object-fit: contain なので表示は破綻しないが、`);
console.log('切り替え時に足元がずれる。マスターの用意は docs/PORTRAIT_MASTER.md を参照。');

// ステータス画面専用ビジュアルは背景込みの長方形で、寸法は自由。
// 検査はしないが、表示エリアが画像の比率と合っているかは報告する価値がある。
console.log('\nステータス画面専用ビジュアル（背景込み・長方形・寸法自由）');
for (const [key, rel] of VISUALS) {
  const size = pngSize(join(ROOT, rel));
  if (!size) {
    console.log(`  x ${key}  ${rel} — PNG として読めない`);
    continue;
  }
  const ratio = size.h / size.w;
  const h = 390; // 844x390 の横画面で全高に置いたとき
  console.log(`  o ${key}  ${rel}  ${size.w}x${size.h} (1:${ratio.toFixed(3)})`);
  console.log(
    `      全高表示なら ${Math.round(h / ratio)}px 幅 = 画面の ` +
      `${((h / ratio / 844) * 100).toFixed(1)}%  → styles.css の --portrait-w`,
  );
}
// 未適合は「まだ素材が来ていない」という正しい状態なので、ビルドは落とさない。
process.exit(0);
