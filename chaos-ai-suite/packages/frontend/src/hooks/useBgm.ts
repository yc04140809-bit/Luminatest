import { useEffect, useRef, useState } from "react";
import { clearBgmTrack, loadBgmTrack, saveBgmTrack } from "../utils/bgmStorage.js";

const STORAGE_KEY = "chaos-ai-suite:bgm-enabled";
/** 内蔵BGM: 穏やかな和音（C3・E3・G3・C4）。ユーザーが音楽ファイルを設定していない時のフォールバック。
 * Web Audio APIのオシレーターだけで生成しているため、著作権上の心配なく常時再生できる。 */
const CHORD_FREQUENCIES = [130.81, 164.81, 196.0, 261.63];

interface SynthNodes {
  context: AudioContext;
  oscillators: OscillatorNode[];
  lfos: OscillatorNode[];
}

export interface BgmControls {
  enabled: boolean;
  toggle: () => void;
  /** ユーザーが設定した音楽ファイル名。未設定（内蔵BGM使用）ならnull。 */
  trackName: string | null;
  /** スマホ/PCから選んだ音楽ファイルをBGMに設定する（端末内のIndexedDBに保存）。 */
  setTrackFile: (file: File) => Promise<void>;
  /** 音楽ファイルを解除して内蔵BGMに戻す。 */
  clearTrackFile: () => Promise<void>;
}

/**
 * オフィスのBGM再生を管理するフック。
 * - 音楽ファイル設定済み: そのファイルをループ再生（HTMLAudioElement）
 * - 未設定: 内蔵のアンビエント和音（Web Audio API）
 * ON/OFFはlocalStorage、音楽ファイルはIndexedDBに保存され、次回起動時も引き継がれる。
 */
export function useBgm(): BgmControls {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [trackName, setTrackName] = useState<string | null>(null);

  const synthRef = useRef<SynthNodes | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const trackBlobRef = useRef<Blob | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  function startSynth(): void {
    if (synthRef.current) {
      void synthRef.current.context.resume();
      return;
    }
    const context = new AudioContext();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.05;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    masterGain.connect(filter);
    filter.connect(context.destination);

    const oscillators: OscillatorNode[] = [];
    const lfos: OscillatorNode[] = [];
    CHORD_FREQUENCIES.forEach((freq, index) => {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const voiceGain = context.createGain();
      voiceGain.gain.value = 0.2;

      // ゆっくりとしたうねり(LFO)で音量を揺らし、単調な電子音に聞こえないようにする
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.05 + index * 0.01;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 0.08;
      lfo.connect(lfoGain);
      lfoGain.connect(voiceGain.gain);

      osc.connect(voiceGain);
      voiceGain.connect(masterGain);
      osc.start();
      lfo.start();

      oscillators.push(osc);
      lfos.push(lfo);
    });

    synthRef.current = { context, oscillators, lfos };
  }

  function stopSynth(): void {
    void synthRef.current?.context.suspend();
  }

  function startFilePlayback(): void {
    const blob = trackBlobRef.current;
    if (!blob) return;
    if (!audioRef.current) {
      objectUrlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(objectUrlRef.current);
      audio.loop = true;
      audio.volume = 0.6;
      audioRef.current = audio;
    }
    audioRef.current.play().catch(() => {
      // ブラウザの自動再生制限（ユーザー操作なしのplay）で失敗した場合はOFF表示に戻す
      setEnabled(false);
    });
  }

  function stopFilePlayback(): void {
    audioRef.current?.pause();
  }

  function disposeFilePlayback(): void {
    stopFilePlayback();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function startPlayback(): void {
    if (trackBlobRef.current) {
      stopSynth();
      startFilePlayback();
    } else {
      startSynth();
    }
  }

  function stopPlayback(): void {
    stopFilePlayback();
    stopSynth();
  }

  // 起動時: 端末に保存済みの音楽ファイルがあれば読み込む
  useEffect(() => {
    let cancelled = false;
    void loadBgmTrack().then((track) => {
      if (cancelled || !track) return;
      trackBlobRef.current = track.blob;
      setTrackName(track.name);
      // 既に内蔵BGMが鳴っている場合はファイル再生へ切り替える
      if (enabledRef.current) {
        stopSynth();
        startFilePlayback();
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // localStorageが使えない環境では保存をあきらめる（再生自体は継続）
    }
    if (enabled) startPlayback();
    else stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    return () => {
      const synth = synthRef.current;
      if (synth) {
        for (const osc of synth.oscillators) osc.stop();
        for (const lfo of synth.lfos) lfo.stop();
        void synth.context.close();
      }
      disposeFilePlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setTrackFile(file: File): Promise<void> {
    await saveBgmTrack(file);
    disposeFilePlayback();
    trackBlobRef.current = file;
    setTrackName(file.name);
    if (enabledRef.current) {
      stopSynth();
      startFilePlayback();
    }
  }

  async function clearTrackFile(): Promise<void> {
    await clearBgmTrack();
    disposeFilePlayback();
    trackBlobRef.current = null;
    setTrackName(null);
    if (enabledRef.current) startSynth();
  }

  return { enabled, toggle: () => setEnabled((value) => !value), trackName, setTrackFile, clearTrackFile };
}
