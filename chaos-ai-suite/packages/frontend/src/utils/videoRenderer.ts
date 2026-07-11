import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import type { VideoEffectId, VideoTemplateId, VideoTransitionId } from "@chaos-ai-suite/shared";

/**
 * Chaos Video Studioの描画・書き出しエンジン。
 * すべてブラウザ内で完結する: Canvasに1フレームずつ描画し、端末内蔵の
 * エンコーダー（WebCodecs VideoEncoder）で圧縮して、mp4-muxerでMP4に詰める。
 * サーバーでのコマンド実行は存在しないため、任意コマンド実行の余地が構造的にない。
 * プレビューと書き出しは同じdrawFrame()を共有し、見た目のズレを防ぐ。
 */

export interface RenderableScene {
  image: ImageBitmap;
  text: string;
  duration: number;
  transition: VideoTransitionId;
  effect: VideoEffectId;
}

/** フェード切り替えの長さ（秒） */
const FADE_SEC = 0.5;
/** ズーム演出の最大倍率 */
const ZOOM_MAX = 1.08;

const FONT_STACK = "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif";

export function totalDuration(scenes: RenderableScene[]): number {
  return scenes.reduce((sum, scene) => sum + scene.duration, 0);
}

/** 画像をcoverフィット（中央トリミング）で描画。scaleはズーム演出用の中心拡大率。 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  width: number,
  height: number,
  scale: number,
): void {
  const baseScale = Math.max(width / image.width, height / image.height) * scale;
  const drawW = image.width * baseScale;
  const drawH = image.height * baseScale;
  ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
}

/** 改行と自動折り返しを考慮してテキストを行に分割する。 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const char of paragraph) {
      if (ctx.measureText(current + char).width > maxWidth && current !== "") {
        lines.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    lines.push(current);
  }
  return lines.filter((line, index) => line !== "" || index < lines.length - 1);
}

/** テンプレートごとのテロップ描画。 */
function drawTelop(
  ctx: CanvasRenderingContext2D,
  text: string,
  template: VideoTemplateId,
  width: number,
  height: number,
): void {
  if (!text.trim()) return;

  if (template === "simple") {
    const fontSize = Math.round(height * 0.042);
    ctx.font = `600 ${fontSize}px ${FONT_STACK}`;
    const lines = wrapText(ctx, text, width * 0.86);
    const lineHeight = fontSize * 1.45;
    const pad = fontSize * 0.9;
    const bandHeight = lines.length * lineHeight + pad * 2;
    const bandTop = height - bandHeight - height * 0.05;
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, bandTop, width, bandHeight);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      ctx.fillText(line, width / 2, bandTop + pad + lineHeight * (index + 0.5));
    });
    return;
  }

  if (template === "impact") {
    // 全体を少し暗くして文字を立たせる
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, width, height);
    const fontSize = Math.round(height * 0.068);
    ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
    const lines = wrapText(ctx, text, width * 0.88);
    const lineHeight = fontSize * 1.3;
    const blockTop = height * 0.5 - (lines.length * lineHeight) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((line, index) => {
      const y = blockTop + lineHeight * (index + 0.5);
      ctx.lineWidth = fontSize * 0.18;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      ctx.strokeText(line, width / 2, y);
      ctx.fillStyle = "#ffe14d";
      ctx.fillText(line, width / 2, y);
    });
    return;
  }

  // note宣伝: 上部の白カード + アクセントバー
  const fontSize = Math.round(height * 0.038);
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  const cardX = width * 0.06;
  const cardWidth = width * 0.88;
  const lines = wrapText(ctx, text, cardWidth - fontSize * 2);
  const lineHeight = fontSize * 1.5;
  const pad = fontSize;
  const cardHeight = lines.length * lineHeight + pad * 2 + fontSize * 0.5;
  const cardY = height * 0.06;
  const radius = fontSize * 0.8;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.fill();
  ctx.fillStyle = "#2cab8c";
  ctx.fillRect(cardX + pad, cardY + pad * 0.7, fontSize * 2.4, fontSize * 0.28);
  ctx.fillStyle = "#1f2933";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, cardX + pad, cardY + pad + fontSize * 0.5 + lineHeight * (index + 0.5));
  });
}

/** 経過秒tに対応するシーンとシーン内経過秒を求める。 */
function sceneAt(scenes: RenderableScene[], t: number): { index: number; local: number } {
  let elapsed = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]!;
    if (t < elapsed + scene.duration || index === scenes.length - 1) {
      return { index, local: Math.min(Math.max(t - elapsed, 0), scene.duration) };
    }
    elapsed += scene.duration;
  }
  return { index: 0, local: 0 };
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  scene: RenderableScene,
  progress: number,
  width: number,
  height: number,
): void {
  const zoom = scene.effect === "zoom" ? 1 + (ZOOM_MAX - 1) * Math.min(progress, 1) : 1;
  drawCover(ctx, scene.image, width, height, zoom);
}

/** 動画全体の経過秒tの1フレームを描画する（プレビュー・書き出し共通）。 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  scenes: RenderableScene[],
  t: number,
  width: number,
  height: number,
  template: VideoTemplateId,
): void {
  if (scenes.length === 0) {
    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  const { index, local } = sceneAt(scenes, t);
  const scene = scenes[index]!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // フェード切り替え: シーン先頭0.5秒は前のシーンの上に重ねて透明度を上げていく
  if (index > 0 && scene.transition === "fade" && local < FADE_SEC) {
    const prev = scenes[index - 1]!;
    drawScene(ctx, prev, 1, width, height);
    ctx.globalAlpha = local / FADE_SEC;
    drawScene(ctx, scene, local / scene.duration, width, height);
    ctx.globalAlpha = 1;
  } else {
    drawScene(ctx, scene, local / scene.duration, width, height);
  }
  drawTelop(ctx, scene.text, template, width, height);
}

// ---------- MP4書き出し（WebCodecs） ----------

export interface VideoCodecChoice {
  encoderCodec: string;
  muxCodec: "avc" | "vp9";
}

/**
 * この端末で使える動画コーデックを調べる。H.264（互換性最優先）→ VP9の順に試し、
 * どちらも使えなければnull（=このブラウザでは生成不可）。
 */
export async function detectVideoCodec(width: number, height: number, fps: number): Promise<VideoCodecChoice | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const candidates: VideoCodecChoice[] = [
    { encoderCodec: "avc1.420028", muxCodec: "avc" },
    { encoderCodec: "avc1.42001f", muxCodec: "avc" },
    { encoderCodec: "vp09.00.10.08", muxCodec: "vp9" },
  ];
  for (const candidate of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: candidate.encoderCodec,
        width,
        height,
        framerate: fps,
        bitrate: 6_000_000,
      });
      if (support.supported) return candidate;
    } catch {
      // 候補が解釈できないブラウザは次の候補へ
    }
  }
  return null;
}

export async function renderVideoMp4(params: {
  scenes: RenderableScene[];
  width: number;
  height: number;
  fps: number;
  template: VideoTemplateId;
  onProgress?: (percent: number) => void;
}): Promise<Blob> {
  const { scenes, width, height, fps, template, onProgress } = params;
  if (scenes.length === 0) throw new Error("シーンがありません。先に画像を追加してください。");

  const codec = await detectVideoCodec(width, height, fps);
  if (!codec) {
    throw new Error("このブラウザは動画生成に対応していません。スマホまたはPCのChrome / Edgeでお試しください。");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("描画領域を作成できませんでした。ページを再読み込みしてお試しください。");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: codec.muxCodec, width, height, frameRate: fps },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error instanceof Error ? error : new Error(String(error));
    },
  });
  encoder.configure({
    codec: codec.encoderCodec,
    width,
    height,
    framerate: fps,
    bitrate: width * height >= 1280 * 720 ? 6_000_000 : 4_000_000,
    ...(codec.muxCodec === "avc" ? { avc: { format: "avc" as const } } : {}),
  });

  const totalSec = totalDuration(scenes);
  const totalFrames = Math.max(1, Math.round(totalSec * fps));
  const frameMicros = Math.round(1_000_000 / fps);

  try {
    for (let i = 0; i < totalFrames; i += 1) {
      if (encoderError) throw encoderError;
      drawFrame(ctx, scenes, i / fps, width, height, template);
      const frame = new VideoFrame(canvas, { timestamp: i * frameMicros, duration: frameMicros });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      // エンコーダーの詰まり待ち（スマホのメモリ保護）と、UIを固めないための小休止
      while (encoder.encodeQueueSize > 8) {
        await new Promise((resolve) => setTimeout(resolve, 15));
        if (encoderError) throw encoderError;
      }
      if (i % 6 === 0) {
        onProgress?.(Math.round(((i + 1) / totalFrames) * 95));
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    await encoder.flush();
    if (encoderError) throw encoderError;
    muxer.finalize();
    onProgress?.(100);
    return new Blob([muxer.target.buffer], { type: "video/mp4" });
  } catch (error) {
    throw new Error(
      `動画の生成に失敗しました。画像の枚数や秒数を減らして再度お試しください。（詳細: ${(error as Error).message}）`,
    );
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
}
