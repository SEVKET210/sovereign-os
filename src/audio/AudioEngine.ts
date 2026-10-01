/* ============================================================
   SOVEREIGN-OS — Web Audio Engine
   Synthesized sounds, zero external assets
   ============================================================ */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private enabled = true;
  private initialized = false;

  // ── Initialize (must be called after user gesture) ──────
  init(): void {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.initialized = true;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(v ? 0.4 : 0, this.ctx.currentTime + 0.1);
    }
  }

  isEnabled(): boolean { return this.enabled; }

  getAnalyser(): AnalyserNode | null { return this.analyser; }

  private ensure(): AudioContext | null {
    if (!this.initialized) this.init();
    if (!this.enabled || !this.ctx || !this.masterGain) return null;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── Short sine click ─────────────────────────────────────
  playClick(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.06);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ── Ascending success arpeggio ───────────────────────────
  playSuccess(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + i * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  // ── Descending error chord ───────────────────────────────
  playError(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [440, 466.16, 493.88]; // A4 Bb4 B4 (dissonant cluster)
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.3);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  // ── Low ambient drone ────────────────────────────────────
  playAmbient(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const frequencies = [55, 82.41, 110]; // A1, E2, A2

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.15 + i * 0.05, t);
      lfoGain.gain.setValueAtTime(4, t);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 2);
      gain.gain.linearRampToValueAtTime(0, t + 6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      lfo.start(t);
      osc.start(t);
      lfo.stop(t + 7);
      osc.stop(t + 7);
    });
  }

  // ── Crypto operation noise burst ─────────────────────────
  playCryptoOp(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.setValueAtTime(3, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start(t);
  }

  // ── Canvas node connect pluck ─────────────────────────────
  playNodeConnect(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1320, t);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // ── Navigation whoosh ─────────────────────────────────────
  playNav(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}

export const audioEngine = new AudioEngine();
