import { useEffect, useState } from "react";
import type { World } from "@mugen/core/world/world";
import { HERO_SPEAKER } from "@mugen/content/story/sekiryugaArc";
import type { DailyScene } from "@mugen/content/story/dailyScenes";
import { dailyFaceFor } from "../assets/dailyFaces";
import type { FaceBox } from "../assets/kaosFaces";
import { NewBadge } from "./common/NewBadge";
import { TalkStage, stageAt } from "./talkStage";
import { audioManager, playVoice } from "../platform/audio";

/**
 * 襲撃前の日常 — A SMALL THING IN THE VILLAGE, as they come back into it
 * (content/story/dailyScenes.ts). The same small box as Kaos's word on the
 * region map, at the TOP of the square under the title and marked NEW until
 * read (2026-10-11: at the foot it went unnoticed), read with 「つぎへ」. Not a button
 * and not a list: it is there when it happens, and gone once read. It stops
 * nothing — every door on the square stays where it was — and it is seen
 * when read to its end; left half way, it is there next time.
 */
export function DailyAside({
  world,
  scene,
}: {
  world: World;
  scene: DailyScene;
}) {
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  const line = scene.lines[Math.min(at, scene.lines.length - 1)];
  // A face beside the line, for whoever speaks and has one (assets/dailyFaces.ts) — fetched when needed.
  const want = dailyFaceFor(line);
  const [shown, setShown] = useState<{ key: string; src: string; box: FaceBox } | null>(null);
  useEffect(() => {
    if (!want) return;
    let gone = false;
    void want.load().then((p) => !gone && p && setShown({ key: want.key, ...p }));
    return () => {
      gone = true;
    };
  }, [want?.key]);
  // The line said as it is shown (platform/voice.ts `daily.<scene>.<line no.>`, from 1) — the last one cut off as
  // the next comes or the box closes. Silent where it has no file.
  useEffect(() => {
    audioManager.stopVoice();
    if (!done) playVoice(`daily.${scene.id}.${Math.min(at, scene.lines.length - 1) + 1}`);
  }, [scene.id, at, done]);
  useEffect(() => () => audioManager.stopVoice(), []);
  if (done) return null;
  const face = want && shown?.key === want.key ? shown : null;
  const last = at >= scene.lines.length - 1;
  const speaker =
    line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  // Only the two of them (and narration): they stand side by side while it is told (ui/talkStage).
  const twoOfThem = scene.lines.every(
    (l) =>
      l.speaker === null ||
      l.speaker === HERO_SPEAKER ||
      l.speaker === "ケイオス",
  );
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setDone(true);
    void world.finishDailyScene(scene.id).catch(() => {});
  };
  const box = (
    <div
      className="kaos-aside daily-aside"
      data-testid="daily-scene"
      data-scene={scene.id}
    >
      {face && (
        <div className="daily-face" data-testid="daily-face" data-face={face.key} aria-hidden="true">
          <img
            src={face.src}
            alt=""
            style={{
              width: `${(face.box.fileW / face.box.width) * 100}%`,
              height: `${(face.box.fileH / face.box.height) * 100}%`,
              left: `${(-face.box.x / face.box.width) * 100}%`,
              top: `${(-face.box.y / face.box.height) * 100}%`,
            }}
          />
        </div>
      )}
      <div className="kaos-aside-head">
        {speaker && <p className="kaos-aside-speaker">{speaker}</p>}
        <NewBadge testId="daily-new" />
      </div>
      <p className="kaos-aside-line" data-testid="daily-line">
        {speaker ? `「${line.text}」` : line.text}
      </p>
      <button
        className="kaos-aside-next"
        data-testid="daily-next"
        onClick={next}
      >
        {last ? "とじる" : "つぎへ"}
      </button>
    </div>
  );
  // The two of them alone: side by side over the painting, the words under them; anyone else: at the top, as before.
  return twoOfThem ? (
    <TalkStage {...stageAt(scene.lines, at)} box={box} />
  ) : (
    box
  );
}
