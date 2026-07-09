import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "chaos-ai-suite:bgm-enabled";
/** 穏やかな和音（C3・E3・G3・C4）でアンビエントなBGMを鳴らす。外部音源ファイルを使わず、
 * Web Audio APIのオシレーターだけで生成しているため、著作権上の心配なく常時再生できる。 */
const CHORD_FREQUENCIES = [130.81, 164.81, 196.0, 261.63];

interface BgmNodes {
  context: AudioContext;
  oscillators: OscillatorNode[];
  lfos: OscillatorNode[];
}

export interface BgmControls {
  enabled: boolean;
  toggle: () => void;
}

/** オフィスのBGM再生状態を管理するフック。ON/OFFはlocalStorageに保存され次回起動時も引き継がれる。 */
export function useBgm(): BgmControls {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const nodesRef = useRef<BgmNodes | null>(null);

  function start(): void {
    if (nodesRef.current) {
      void nodesRef.current.context.resume();
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

    nodesRef.current = { context, oscillators, lfos };
  }

  function stop(): void {
    void nodesRef.current?.context.suspend();
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // localStorageが使えない環境では保存をあきらめる（再生自体は継続）
    }
    if (enabled) start();
    else stop();
  }, [enabled]);

  useEffect(() => {
    return () => {
      const nodes = nodesRef.current;
      if (!nodes) return;
      for (const osc of nodes.oscillators) osc.stop();
      for (const lfo of nodes.lfos) lfo.stop();
      void nodes.context.close();
    };
  }, []);

  return { enabled, toggle: () => setEnabled((value) => !value) };
}
