/**
 * Chaos Video Studio（テンプレート型・短尺MP4動画生成）の型定義。
 * MVPは完全にブラウザ内で完結する: 画像・プロジェクトはIndexedDB
 * （DB "chaos-ai-suite-video"）に保存し、動画は端末内蔵のエンコーダー
 * （WebCodecs）でMP4化する。サーバーへのアップロード・サーバー処理は一切ない。
 * 将来DB保存や外部動画生成APIへ移行しやすいよう、id/日時つきのレコード構造にしてある。
 */

export const VIDEO_ASPECTS = [
  { id: "9:16", label: "縦型 9:16", hint: "リール・ショート・TikTok", width: 720, height: 1280 },
  { id: "1:1", label: "正方形 1:1", hint: "Instagramフィード", width: 720, height: 720 },
  { id: "16:9", label: "横型 16:9", hint: "YouTube・X", width: 1280, height: 720 },
] as const;

export type VideoAspectId = (typeof VIDEO_ASPECTS)[number]["id"];

export const VIDEO_TEMPLATES = [
  { id: "simple", label: "シンプル紹介", description: "下部の黒帯に白文字。落ち着いた商品・サービス紹介向け" },
  { id: "impact", label: "インパクト広告", description: "画面中央に大きな縁取り文字。目を引く広告・告知向け" },
  { id: "note", label: "note宣伝", description: "上部の白カードに濃色文字。記事・有料noteの宣伝向け" },
] as const;

export type VideoTemplateId = (typeof VIDEO_TEMPLATES)[number]["id"];

export const VIDEO_TRANSITIONS = [
  { id: "fade", label: "フェード" },
  { id: "none", label: "カット" },
] as const;

export type VideoTransitionId = (typeof VIDEO_TRANSITIONS)[number]["id"];

export const VIDEO_EFFECTS = [
  { id: "zoom", label: "ゆっくりズーム" },
  { id: "none", label: "なし" },
] as const;

export type VideoEffectId = (typeof VIDEO_EFFECTS)[number]["id"];

export const VIDEO_PROJECT_STATUSES = [
  { id: "draft", label: "編集中" },
  { id: "generating", label: "生成中" },
  { id: "done", label: "生成済み" },
  { id: "failed", label: "生成失敗" },
] as const;

export type VideoProjectStatusId = (typeof VIDEO_PROJECT_STATUSES)[number]["id"];

/** シーン1枚分（画像+テロップ+表示秒数+演出）。 */
export interface VideoScene {
  id: string;
  projectId: string;
  /** IndexedDB上の画像Blobのキー（URLではなく端末内キー） */
  imageKey: string;
  /** 元ファイル名（表示用。保存時に英数字等へ無害化済み） */
  imageName: string;
  text: string;
  /** 表示秒数（1〜10） */
  duration: number;
  order: number;
  transition: VideoTransitionId;
  effect: VideoEffectId;
}

export interface VideoProject {
  id: string;
  title: string;
  aspectRatio: VideoAspectId;
  templateId: VideoTemplateId;
  status: VideoProjectStatusId;
  scenes: VideoScene[];
  createdAt: string;
  updatedAt: string;
}

/** 生成結果のメタデータ。動画本体のBlobはIndexedDBに別キーで保存する。 */
export interface VideoOutput {
  id: string;
  projectId: string;
  status: "processing" | "done" | "failed";
  errorMessage?: string;
  /** 出力サイズ（バイト） */
  sizeBytes?: number;
  /** 出力の長さ（秒） */
  durationSec?: number;
  createdAt: string;
}

/** MVPの上限（スマホのメモリ保護のため）。 */
export const VIDEO_LIMITS = {
  maxScenes: 5,
  maxImageBytes: 10 * 1024 * 1024,
  minDurationSec: 1,
  maxDurationSec: 10,
  fps: 30,
  allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
