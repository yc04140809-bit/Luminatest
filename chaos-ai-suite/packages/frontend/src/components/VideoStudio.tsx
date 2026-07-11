import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Download,
  ImagePlus,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  VIDEO_ASPECTS,
  VIDEO_EFFECTS,
  VIDEO_LIMITS,
  VIDEO_TEMPLATES,
  VIDEO_TRANSITIONS,
  type VideoProject,
  type VideoScene,
} from "@chaos-ai-suite/shared";
import {
  deleteVideoImage,
  deleteVideoProject,
  getVideoImage,
  getVideoOutput,
  listVideoProjects,
  newVideoId,
  saveVideoImage,
  saveVideoOutput,
  saveVideoProject,
} from "../utils/videoProjects.js";
import { drawFrame, renderVideoMp4, totalDuration, type RenderableScene } from "../utils/videoRenderer.js";

const inputCls = "w-full rounded-lg border border-office-border bg-office-bg px-3 py-2 text-sm text-office-text placeholder:text-office-muted";
const labelCls = "mb-1 block text-[11px] font-semibold text-office-muted";
const btnPrimary = "w-full rounded-lg bg-office-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-40";
const btnSub = "rounded-lg border border-office-border px-3 py-2 text-xs font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold disabled:opacity-40";

function newProject(): VideoProject {
  const now = new Date().toISOString();
  return {
    id: newVideoId("vproj"),
    title: "新しい動画",
    aspectRatio: "9:16",
    templateId: "simple",
    status: "draft",
    scenes: [],
    createdAt: now,
    updatedAt: now,
  };
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-office-text">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-office-gold/20 text-[11px] font-bold text-office-gold">{step}</span>
      {title}
    </h3>
  );
}

/**
 * Chaos Video Studio。画像1〜5枚＋テロップからSNS用の短いMP4を生成する。
 * 生成は完全にブラウザ内（端末内蔵エンコーダー）で行い、画像・動画はサーバーへ送信されない。
 * AI呼び出しは0回。プロジェクトと素材はIndexedDB（既存BGMとは別DB）に自動保存される。
 */
export function VideoStudio() {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState<VideoProject | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; danger?: boolean; onOk: () => void } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputInfo, setOutputInfo] = useState<{ sizeBytes: number; durationSec: number } | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewStop = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const aspect = VIDEO_ASPECTS.find((entry) => entry.id === project?.aspectRatio) ?? VIDEO_ASPECTS[0];

  // ---------- 初期化・保存 ----------

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const projects = await listVideoProjects();
      const current = projects[0] ?? newProject();
      if (projects.length === 0) await saveVideoProject(current);
      setProject(current);
      await loadThumbs(current);
      const saved = await getVideoOutput(current.id);
      if (saved) {
        setOutputUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(saved);
        });
        setOutputInfo({ sizeBytes: saved.size, durationSec: current.scenes.reduce((sum, scene) => sum + scene.duration, 0) });
      }
    })();
    return () => {
      previewStop.current = true;
    };
  }, [open]);

  async function loadThumbs(target: VideoProject): Promise<void> {
    const next: Record<string, string> = {};
    for (const scene of target.scenes) {
      const stored = await getVideoImage(scene.imageKey);
      if (stored) next[scene.imageKey] = URL.createObjectURL(stored.blob);
    }
    setThumbs((prev) => {
      for (const url of Object.values(prev)) URL.revokeObjectURL(url);
      return next;
    });
  }

  function update(patch: Partial<VideoProject>): void {
    if (!project) return;
    const next = { ...project, ...patch, updatedAt: new Date().toISOString() };
    setProject(next);
    void saveVideoProject(next);
  }

  // ---------- 1. 素材アップロード ----------

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!project || !files || files.length === 0) return;
    setError(null);
    const room = VIDEO_LIMITS.maxScenes - project.scenes.length;
    if (room <= 0) {
      setError(`画像は最大${VIDEO_LIMITS.maxScenes}枚までです。不要なシーンを削除してください。`);
      return;
    }
    const added: VideoScene[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const imageKey = newVideoId("vimg");
        await saveVideoImage(imageKey, file);
        added.push({
          id: newVideoId("vscene"),
          projectId: project.id,
          imageKey,
          imageName: file.name.slice(0, 60),
          text: "",
          duration: 3,
          order: project.scenes.length + added.length,
          transition: "fade",
          effect: "zoom",
        });
      } catch (err) {
        setError((err as Error).message);
      }
    }
    if (added.length > 0) {
      const scenes = [...project.scenes, ...added];
      update({ scenes, status: "draft" });
      const next = { ...thumbs };
      for (const scene of added) {
        const stored = await getVideoImage(scene.imageKey);
        if (stored) next[scene.imageKey] = URL.createObjectURL(stored.blob);
      }
      setThumbs(next);
    }
    if (files.length > room) {
      setNotice(`最大${VIDEO_LIMITS.maxScenes}枚までのため、先頭${room}枚だけ追加しました。`);
      setTimeout(() => setNotice(null), 2500);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---------- 2. シーン編集 ----------

  function updateScene(sceneId: string, patch: Partial<VideoScene>): void {
    if (!project) return;
    update({ scenes: project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene)) });
  }

  function moveScene(index: number, delta: number): void {
    if (!project) return;
    const target = index + delta;
    if (target < 0 || target >= project.scenes.length) return;
    const scenes = [...project.scenes];
    const [moved] = scenes.splice(index, 1);
    scenes.splice(target, 0, moved!);
    update({ scenes: scenes.map((scene, order) => ({ ...scene, order })) });
  }

  function removeScene(scene: VideoScene): void {
    if (!project) return;
    setConfirm({
      message: `シーン「${scene.imageName}」を削除しますか？`,
      danger: true,
      onOk: () => {
        void deleteVideoImage(scene.imageKey);
        if (thumbs[scene.imageKey]) URL.revokeObjectURL(thumbs[scene.imageKey]!);
        update({ scenes: project.scenes.filter((entry) => entry.id !== scene.id).map((entry, order) => ({ ...entry, order })) });
      },
    });
  }

  // ---------- 5. プレビュー ----------

  async function buildRenderableScenes(): Promise<RenderableScene[]> {
    if (!project) return [];
    const scenes: RenderableScene[] = [];
    for (const scene of project.scenes) {
      const stored = await getVideoImage(scene.imageKey);
      if (!stored) throw new Error(`画像「${scene.imageName}」を読み込めませんでした。シーンを削除して追加し直してください。`);
      scenes.push({
        image: await createImageBitmap(stored.blob),
        text: scene.text,
        duration: scene.duration,
        transition: scene.transition,
        effect: scene.effect,
      });
    }
    return scenes;
  }

  // シーン・テンプレート・サイズが変わったら先頭フレームを静止プレビューとして描画
  useEffect(() => {
    if (!open || !project || previewPlaying) return;
    let cancelled = false;
    void (async () => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      canvas.width = aspect.width;
      canvas.height = aspect.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        const scenes = await buildRenderableScenes();
        if (cancelled) return;
        drawFrame(ctx, scenes, 0.6, aspect.width, aspect.height, project.templateId);
        for (const scene of scenes) scene.image.close();
      } catch {
        ctx.fillStyle = "#111318";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.scenes, project?.templateId, project?.aspectRatio, previewPlaying]);

  async function playPreview(): Promise<void> {
    if (!project || project.scenes.length === 0 || previewPlaying) return;
    setError(null);
    setPreviewPlaying(true);
    previewStop.current = false;
    try {
      const scenes = await buildRenderableScenes();
      const canvas = previewCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      canvas.width = aspect.width;
      canvas.height = aspect.height;
      const total = totalDuration(scenes);
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const t = (performance.now() - start) / 1000;
          if (previewStop.current || t >= total) {
            resolve();
            return;
          }
          drawFrame(ctx, scenes, t, aspect.width, aspect.height, project.templateId);
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      for (const scene of scenes) scene.image.close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPreviewPlaying(false);
    }
  }

  // ---------- 6. 動画生成 ----------

  async function generate(): Promise<void> {
    if (!project || generating) return;
    if (project.scenes.length === 0) {
      setError("先に画像を1枚以上アップロードしてください。");
      return;
    }
    setGenerating(true);
    setProgress(0);
    setError(null);
    update({ status: "generating" });
    try {
      const scenes = await buildRenderableScenes();
      const blob = await renderVideoMp4({
        scenes,
        width: aspect.width,
        height: aspect.height,
        fps: VIDEO_LIMITS.fps,
        template: project.templateId,
        onProgress: setProgress,
      });
      for (const scene of scenes) scene.image.close();
      await saveVideoOutput(project.id, blob);
      setOutputUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setOutputInfo({ sizeBytes: blob.size, durationSec: totalDuration(scenes) });
      update({ status: "done" });
    } catch (err) {
      setError((err as Error).message);
      update({ status: "failed" });
    } finally {
      setGenerating(false);
    }
  }

  // ---------- 新規作成 ----------

  function resetProject(): void {
    if (!project) return;
    setConfirm({
      message: "新しい動画を作ります。今のシーン・画像・完成動画は削除されます。よろしいですか？",
      danger: true,
      onOk: () => {
        void (async () => {
          await deleteVideoProject(project);
          const created = newProject();
          await saveVideoProject(created);
          setProject(created);
          setThumbs((prev) => {
            for (const url of Object.values(prev)) URL.revokeObjectURL(url);
            return {};
          });
          setOutputUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          setOutputInfo(null);
          setProgress(0);
        })();
      },
    });
  }

  const totalSec = project ? project.scenes.reduce((sum, scene) => sum + scene.duration, 0) : 0;

  return (
    <>
      <section className="rounded-xl border border-office-border bg-office-panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-office-gold">
          <Clapperboard size={18} />
          Chaos Video Studio
        </h2>
        <p className="mb-3 text-xs text-office-muted">画像とテロップを組み合わせて、SNS投稿用の短いMP4動画を作ります。</p>
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-office-border px-3 py-2 text-sm font-semibold text-office-text transition hover:border-office-gold hover:text-office-gold">
          スタジオを開く
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-office-bg">
          <div className="flex items-center justify-between border-b border-office-border px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-xl text-office-gold">
              <Clapperboard size={20} /> Chaos Video Studio
            </h2>
            <button type="button" onClick={() => { previewStop.current = true; setOpen(false); }} className="flex items-center gap-1.5 rounded-full border border-office-border px-3 py-1.5 text-sm text-office-muted transition hover:border-office-gold hover:text-office-gold">
              <X size={16} /> 戻る
            </button>
          </div>

          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
            {notice && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">{notice}</p>}

            {project && (
              <>
                <div>
                  <label className={labelCls}>動画タイトル（管理用）</label>
                  <input value={project.title} onChange={(event) => update({ title: event.target.value })} className={inputCls} />
                </div>

                {/* 1. 素材アップロード */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={1} title={`素材アップロード（${project.scenes.length}/${VIDEO_LIMITS.maxScenes}枚）`} />
                  <p className="text-[11px] text-office-muted">JPEG / PNG / WebP、1枚10MBまで。画像は端末内にだけ保存され、サーバーへは送信されません。</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleFiles(event.target.files)}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={generating || project.scenes.length >= VIDEO_LIMITS.maxScenes} className={`${btnPrimary} flex items-center justify-center gap-2`}>
                    <ImagePlus size={16} /> 画像を追加する
                  </button>
                </div>

                {/* 2. シーン編集 */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={2} title="シーン編集（並び替え・テロップ・秒数）" />
                  {project.scenes.length === 0 && <p className="text-xs text-office-muted">画像を追加するとここに表示されます。</p>}
                  {project.scenes.map((scene, index) => (
                    <div key={scene.id} className="rounded-lg border border-office-border bg-office-bg p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        {thumbs[scene.imageKey] ? (
                          <img src={thumbs[scene.imageKey]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-office-border/40" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-office-text">シーン{index + 1}: {scene.imageName}</p>
                          <p className="text-[10px] text-office-muted">{scene.duration}秒表示</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button type="button" onClick={() => moveScene(index, -1)} disabled={index === 0 || generating} className="rounded-lg border border-office-border p-2 text-office-muted disabled:opacity-30 hover:border-office-gold hover:text-office-gold"><ArrowUp size={14} /></button>
                          <button type="button" onClick={() => moveScene(index, 1)} disabled={index === project.scenes.length - 1 || generating} className="rounded-lg border border-office-border p-2 text-office-muted disabled:opacity-30 hover:border-office-gold hover:text-office-gold"><ArrowDown size={14} /></button>
                          <button type="button" onClick={() => removeScene(scene)} disabled={generating} className="rounded-lg border border-office-border p-2 text-office-muted hover:border-red-400 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <textarea
                        value={scene.text}
                        onChange={(event) => updateScene(scene.id, { text: event.target.value.slice(0, 120) })}
                        placeholder="テロップ（空欄なら文字なし・改行可）"
                        rows={2}
                        className={`${inputCls} mb-1.5 text-xs`}
                      />
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className={labelCls}>表示秒数</label>
                          <select value={scene.duration} onChange={(event) => updateScene(scene.id, { duration: Number(event.target.value) })} className={inputCls}>
                            {Array.from({ length: VIDEO_LIMITS.maxDurationSec - VIDEO_LIMITS.minDurationSec + 1 }, (_, i) => i + VIDEO_LIMITS.minDurationSec).map((sec) => (
                              <option key={sec} value={sec}>{sec}秒</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>切り替え</label>
                          <select value={scene.transition} onChange={(event) => updateScene(scene.id, { transition: event.target.value as VideoScene["transition"] })} className={inputCls}>
                            {VIDEO_TRANSITIONS.map((entry) => (<option key={entry.id} value={entry.id}>{entry.label}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>演出</label>
                          <select value={scene.effect} onChange={(event) => updateScene(scene.id, { effect: event.target.value as VideoScene["effect"] })} className={inputCls}>
                            {VIDEO_EFFECTS.map((entry) => (<option key={entry.id} value={entry.id}>{entry.label}</option>))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. テンプレート選択 */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={3} title="テンプレート選択" />
                  {VIDEO_TEMPLATES.map((template) => (
                    <button key={template.id} type="button" onClick={() => update({ templateId: template.id })} className={`block w-full rounded-lg border p-2.5 text-left transition ${project.templateId === template.id ? "border-office-gold bg-office-gold/10" : "border-office-border bg-office-bg"}`}>
                      <p className="text-sm font-semibold text-office-text">{template.label}</p>
                      <p className="text-[11px] text-office-muted">{template.description}</p>
                    </button>
                  ))}
                </div>

                {/* 4. 動画サイズ選択 */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={4} title="動画サイズ選択" />
                  <div className="grid grid-cols-3 gap-1.5">
                    {VIDEO_ASPECTS.map((entry) => (
                      <button key={entry.id} type="button" onClick={() => update({ aspectRatio: entry.id })} className={`rounded-lg border p-2.5 text-center transition ${project.aspectRatio === entry.id ? "border-office-gold bg-office-gold/10" : "border-office-border bg-office-bg"}`}>
                        <p className="text-sm font-semibold text-office-text">{entry.label}</p>
                        <p className="text-[10px] text-office-muted">{entry.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. プレビュー */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={5} title="プレビュー" />
                  <div className="flex justify-center rounded-lg bg-black/40 p-2">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-h-[420px] w-auto max-w-full rounded-lg"
                      style={{ aspectRatio: `${aspect.width} / ${aspect.height}` }}
                    />
                  </div>
                  <button type="button" onClick={() => (previewPlaying ? (previewStop.current = true) : void playPreview())} disabled={project.scenes.length === 0 || generating} className={`${btnSub} flex w-full items-center justify-center gap-2`}>
                    {previewPlaying ? <><Square size={13} /> 停止</> : <><Play size={13} /> 再生（{totalSec}秒）</>}
                  </button>
                </div>

                {/* 6. 動画生成 */}
                <div className="space-y-2 rounded-lg border border-office-border bg-office-panel p-3">
                  <StepHeading step={6} title="動画生成" />
                  <button type="button" onClick={() => void generate()} disabled={generating || project.scenes.length === 0} className={btnPrimary}>
                    {generating ? `生成中... ${progress}%` : "MP4動画を生成する（無料・端末内で処理）"}
                  </button>
                  {generating && (
                    <div className="h-2 overflow-hidden rounded-full bg-office-border/40">
                      <div className="h-full rounded-full bg-office-gold transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <p className="text-[10px] text-office-muted">※ 生成はこの端末の中だけで行われます（AI・サーバー・通信は使いません）。画面を閉じずにお待ちください。</p>
                </div>

                {/* 7. 完成動画表示 */}
                {outputUrl && (
                  <div className="space-y-2 rounded-lg border border-emerald-500/50 bg-office-panel p-3">
                    <StepHeading step={7} title="完成動画" />
                    <video src={outputUrl} controls playsInline className="w-full rounded-lg bg-black" style={{ aspectRatio: `${aspect.width} / ${aspect.height}`, maxHeight: 420 }} />
                    {outputInfo && (
                      <p className="text-[11px] text-office-muted">
                        {outputInfo.durationSec}秒 ・ {(outputInfo.sizeBytes / 1024 / 1024).toFixed(1)}MB ・ MP4
                      </p>
                    )}
                    <a href={outputUrl} download={`chaos-video-${new Date().toISOString().slice(0, 10)}.mp4`} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-3 text-sm font-semibold text-white">
                      <Download size={16} /> 動画をダウンロード
                    </a>
                    <p className="text-[10px] text-office-muted">※ 自動投稿はされません。ダウンロードして各SNSから投稿してください。</p>
                  </div>
                )}

                <button type="button" onClick={resetProject} disabled={generating} className={`${btnSub} flex w-full items-center justify-center gap-2 pb-2`}>
                  <Plus size={13} /> 新しい動画を作る（今の内容を破棄）
                </button>
                <div className="pb-6" />
              </>
            )}
          </div>

          {/* 確認ダイアログ */}
          {confirm && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6">
              <div className={`w-full max-w-sm rounded-xl border bg-office-panel p-5 ${confirm.danger ? "border-red-500/50" : "border-office-gold/50"}`}>
                <h4 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${confirm.danger ? "text-red-400" : "text-office-gold"}`}>
                  <AlertTriangle size={16} /> 確認
                </h4>
                <p className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-office-text">{confirm.message}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-office-border px-3 py-2.5 text-sm font-semibold text-office-text">キャンセル</button>
                  <button type="button" onClick={() => { const action = confirm.onOk; setConfirm(null); action(); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-white ${confirm.danger ? "bg-red-600" : "bg-office-accent"}`}>
                    実行する
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
