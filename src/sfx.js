let audioContext = null;
let masterGain = null;

function getContext() {
  if (audioContext || typeof window === "undefined") {
    return audioContext;
  }

  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return null;
  }

  audioContext = new Context();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.18;
  masterGain.connect(audioContext.destination);

  return audioContext;
}

export function initAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function playTone({ type = "square", start = 440, end = 440, duration = 0.08, delay = 0, volume = 0.45 }) {
  const ctx = audioContext;
  if (!ctx || !masterGain) {
    return;
  }

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + duration);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function correctAnswerSound() {
  playTone({ type: "square", start: 520, end: 780, duration: 0.075, volume: 0.32 });
  playTone({ type: "square", start: 780, end: 1040, duration: 0.09, delay: 0.06, volume: 0.28 });
}

export function wrongAnswerSound() {
  playTone({ type: "square", start: 260, end: 120, duration: 0.16, volume: 0.34 });
  playTone({ type: "triangle", start: 180, end: 90, duration: 0.18, delay: 0.05, volume: 0.2 });
}

export function buttonClickSound() {
  playTone({ type: "square", start: 760, end: 520, duration: 0.045, volume: 0.22 });
}

export function levelUpSound() {
  playTone({ type: "square", start: 440, end: 660, duration: 0.07, volume: 0.26 });
  playTone({ type: "square", start: 660, end: 880, duration: 0.07, delay: 0.06, volume: 0.26 });
  playTone({ type: "triangle", start: 880, end: 1320, duration: 0.12, delay: 0.12, volume: 0.22 });
}

export function gameStartSound() {
  playTone({ type: "triangle", start: 220, end: 440, duration: 0.1, volume: 0.24 });
  playTone({ type: "square", start: 440, end: 880, duration: 0.12, delay: 0.08, volume: 0.26 });
}
