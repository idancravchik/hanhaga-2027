/**
 * Web Audio API synthesized sound effects.
 * Requires zero external audio files, works instantly offline.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx && AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not available:', e);
    return null;
  }
}

export const soundEngine = {
  init() {
    getAudioContext();
  },

  toggleMute(): boolean {
    isMuted = !isMuted;
    return isMuted;
  },

  getMuted(): boolean {
    return isMuted;
  },

  /**
   * Barcode / QR scan beep
   */
  playScanBeep() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  },

  /**
   * Correct answer click chime
   */
  playSuccessChime() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);

      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.22);
    });
  },

  /**
   * Station completed checkmark fanfare (3-chord burst)
   */
  playStationComplete() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const chords = [
      { freq: 523.25, delay: 0 },    // C5
      { freq: 659.25, delay: 0.1 },  // E5
      { freq: 783.99, delay: 0.2 },  // G5
      { freq: 1046.5, delay: 0.35 }, // C6
    ];

    chords.forEach(({ freq, delay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.5);
    });
  },

  /**
   * Grand finale victory fanfare
   */
  playGameVictory() {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 440.0, time: 0, dur: 0.15 },    // A4
      { freq: 554.37, time: 0.15, dur: 0.15 },// C#5
      { freq: 659.25, time: 0.3, dur: 0.2 },  // E5
      { freq: 880.0, time: 0.5, dur: 0.6 },   // A5
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + dur + 0.05);
    });
  },
};
