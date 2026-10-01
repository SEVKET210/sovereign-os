/* ============================================================
   SOVEREIGN-OS — Tactile Sound Engine (Web Audio Synthesizer)
   Pure procedural sound design (zero external .mp3/.wav assets)
   ============================================================ */

export class TactileSoundEngine {
  private static ctx: AudioContext | null = null;
  private static masterGain: GainNode | null = null;
  private static analyserNode: AnalyserNode | null = null;
  private static isMuted = false;
  private static volume = 0.5;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;

      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public static setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public static toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  public static getMuted(): boolean {
    return this.isMuted;
  }

  public static getAnalyser(): AnalyserNode | null {
    this.getContext();
    return this.analyserNode;
  }

  /**
   * 1. Vault Lock Engagement:
   * Dual sine-wave descent from 160 Hz to 40 Hz with low-pass resonance (35 ms).
   */
  public static playVaultLock(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(40, now + 0.035);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(152, now);
    osc2.frequency.exponentialRampToValueAtTime(38, now + 0.035);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.Q.setValueAtTime(6.0, now);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.038);
    osc2.stop(now + 0.038);
  }

  /**
   * 2. Node Connection Snap:
   * Sharp metallic transient at 480 Hz with exponential decay (15 ms).
   */
  public static playNodeConnectSnap(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.015);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.018);
  }

  /**
   * 3. Rolling Key Refresh:
   * Pristine high-frequency shimmer (1200 Hz -> 2400 Hz, 60 ms, bandpass filtered).
   */
  public static playRollingKeyRefresh(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.060);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.060);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  /**
   * 4. Ledger Seal Mute:
   * Deep, authoritative 65 Hz sub-bass thud signifying immutable record creation.
   */
  public static playLedgerSealThud(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.120);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.120);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.130);
  }

  /**
   * Precision UI Click
   */
  public static playClick(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.008);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.010);
  }

  /**
   * 5. AI Prompt Sweep Launch:
   * Smooth ascending frequency glide (400 Hz -> 1800 Hz) signifying direct client-to-model dispatch.
   */
  public static playAiSweepLaunch(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.180);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.040);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.200);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.210);
  }

  /**
   * 6. AI Inference Stream Completion Chime:
   * Crisp dual-tone harmonic resolution (880 Hz fundamental + 1320 Hz perfect fifth) signifying completion.
   */
  public static playAiCompletionChime(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.240);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.240);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.250);

    gain2.gain.setValueAtTime(0.12, now + 0.030);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.250);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.260);

    osc2.start(now + 0.030);
    osc2.stop(now + 0.260);
  }

  /**
   * 7. Mechanical Keyboard Transient (480 Hz):
   * Crisp, tactile switch click for Command Palette (Ctrl+K) item navigation.
   */
  public static playMechanicalTransient(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, now);
    filter.Q.setValueAtTime(4.0, now);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.012);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.014);
  }

  /**
   * 8. Dependency Unlock Shimmer (1200 Hz -> 2400 Hz):
   * High-frequency ascending dual-sine shimmer played when prerequisite tasks unblock downstream nodes.
   */
  public static playUnlockShimmer(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.160);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, now + 0.020);
    osc2.frequency.exponentialRampToValueAtTime(3600, now + 0.180);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.030);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.220);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.220);

    osc2.start(now + 0.020);
    osc2.stop(now + 0.220);
  }

  /**
   * 9. Seismic Anti-Capture Alert (50 Hz Sub-Bass Wave):
   * Low-frequency 50 Hz sawtooth/sub-bass warning pulse played on unauthorized context menu
   * right-click or screen capture shortcut interception.
   */
  public static playSeismicWarning(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.18);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(90, now);
    filter.Q.setValueAtTime(8.0, now);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.20);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  /**
   * 10. Operational Mention Alert:
   * Subtle, dual-harmonic crystal ping (780 Hz & 1170 Hz) for incoming operator mentions.
   */
  public static playMentionAlert(): void {
    const ctx = this.getContext();
    if (!ctx || this.isMuted || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(780, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.080);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1170, now);
    osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.080);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.090);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.090);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.095);
    osc2.stop(now + 0.095);
  }

  /**
   * 11. Alternating Emergency Seismic Alarm Sequence:
   * Shifts between 50 Hz and 110 Hz with low-pass resonance and pulsing envelope
   * for Critical & Catastrophic operational invariant incidents.
   */
  private static emergencyAlarmInterval: ReturnType<typeof setInterval> | null = null;
  private static alarmToggle = false;

  public static startEmergencySeismicAlarm(): () => void {
    if (this.emergencyAlarmInterval) {
      return () => this.stopEmergencySeismicAlarm();
    }

    const triggerPulse = () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted || !this.masterGain) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      this.alarmToggle = !this.alarmToggle;
      // Alternating frequency between 50 Hz and 110 Hz
      const targetFreq = this.alarmToggle ? 50 : 110;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(targetFreq, now);
      osc.frequency.exponentialRampToValueAtTime(targetFreq * 0.75, now + 0.32);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(targetFreq * 2.2, now);
      filter.Q.setValueAtTime(6.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.35);
    };

    triggerPulse();
    this.emergencyAlarmInterval = setInterval(triggerPulse, 380);

    return () => this.stopEmergencySeismicAlarm();
  }

  public static stopEmergencySeismicAlarm(): void {
    if (this.emergencyAlarmInterval) {
      clearInterval(this.emergencyAlarmInterval);
      this.emergencyAlarmInterval = null;
    }
  }

  public static isSeismicAlarmActive(): boolean {
    return this.emergencyAlarmInterval !== null;
  }
}

