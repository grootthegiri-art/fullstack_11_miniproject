let audioCtx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void { muted = value; }
export function isMuted(): boolean { return muted; }

function ctx(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18): void {
  if (muted) return;
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ac.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol, ac.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + start);
    osc.stop(ac.currentTime + start + dur + 0.05);
  } catch { /* audio not available: ignore */ }
}

export function sound(kind: string): void {
  if (kind === "click") tone(700, 0, 0.08, "triangle", 0.12);
  else if (kind === "normal") tone(600, 0, 0.1, "sine", 0.1);
  else if (kind === "near_turn" || kind === "your_turn") { tone(880, 0, 0.12, "sine", 0.15); tone(1180, 0.14, 0.16, "sine", 0.15); }
  else if (kind === "delay") { tone(500, 0, 0.15, "sawtooth", 0.12); tone(380, 0.18, 0.2, "sawtooth", 0.12); }
  else if (kind === "emergency") { tone(950, 0, 0.12, "square", 0.16); tone(650, 0.15, 0.12, "square", 0.16); tone(950, 0.3, 0.12, "square", 0.16); tone(650, 0.45, 0.16, "square", 0.16); }
  else if (kind === "offline") tone(300, 0, 0.35, "sine", 0.12);
}
