import { SPEEDS, type GameMode, type GameState, type InteractionKind } from './types';

type AudioEventName =
  | 'start'
  | 'speed'
  | 'continue'
  | 'task'
  | 'minorCollision'
  | 'strongCollision'
  | 'footstep'
  | 'finish'
  | 'choice'
  | 'punch'
  | 'pet'
  | 'depart'
  | 'restart'
  | 'toggle'
  | 'musicNote';

export interface AudioDebugState {
  supported: boolean;
  unlocked: boolean;
  muted: boolean;
  contextState: AudioContextState | 'not-created' | 'unsupported';
  scene: GameMode;
  masterGain: number;
  events: Record<AudioEventName, number>;
}

const EVENT_NAMES: readonly AudioEventName[] = [
  'start',
  'speed',
  'continue',
  'task',
  'minorCollision',
  'strongCollision',
  'footstep',
  'finish',
  'choice',
  'punch',
  'pet',
  'depart',
  'restart',
  'toggle',
  'musicNote',
];

const MUTE_STORAGE_KEY = 'walking-sim-muted';
const MASTER_VOLUME = 3.12;

export class GameAudio {
  private readonly supported = typeof AudioContext !== 'undefined';
  private readonly events = Object.fromEntries(EVENT_NAMES.map((name) => [name, 0])) as Record<AudioEventName, number>;
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private outputCompressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private footstepClock = 0;
  private footstepSide = 1;
  private scene: GameMode = 'intro';
  private muted = this.readMutedPreference();
  private lastTaskCount = 0;
  private lastMinorBumps = 0;
  private lastStrongCollisions = 0;
  private lastPlayTimes = new Map<AudioEventName, number>();

  isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    if (!this.supported) return;
    this.ensureGraph();
    if (!this.context) return;
    if (this.context.state === 'suspended') await this.context.resume().catch(() => undefined);
    this.applyMasterGain();
  }

  toggleMuted(): boolean {
    this.record('toggle');
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, String(this.muted));
    } catch {
      // Audio remains usable when storage is unavailable.
    }
    if (this.muted) {
      this.tone(420, 0.12, 0.055, 'sine', 0, 260);
      this.applyMasterGain();
    } else {
      void this.unlock().then(() => {
        this.applyMasterGain();
        this.tone(420, 0.1, 0.05, 'sine', 0, 620);
      });
    }
    return this.muted;
  }

  update(state: GameState, dt: number): void {
    if (state.mode !== this.scene) {
      const previousScene = this.scene;
      this.scene = state.mode;
      this.applySceneMix();
      this.footstepClock = 0;
      if (previousScene === 'challenge' && state.mode === 'challenge-victory') this.playFinish();
      if (previousScene === 'level-four-walk' && state.mode === 'level-four-summary') this.playFinish();
    }

    const completedTasks = SPEEDS.filter((speed) => state.tasks[speed.id].complete).length;
    if (completedTasks > this.lastTaskCount) this.playTaskComplete();
    this.lastTaskCount = completedTasks;

    if (state.strongCollisions > this.lastStrongCollisions) {
      this.playStrongCollision();
    } else if (state.minorBumps > this.lastMinorBumps) {
      this.playMinorCollision();
    }
    this.lastStrongCollisions = state.strongCollisions;
    this.lastMinorBumps = state.minorBumps;

    const challengeWalking = state.mode === 'challenge' && state.challenge.currentSpeed > 0;
    const legacyWalking = state.mode === 'walking' && !state.speech && !state.pendingEvaluation && state.speedLevel > 0;
    const fourthWalking = state.mode === 'level-four-walk' && state.fourth.selectedSpeed > 0;
    if (!challengeWalking && !legacyWalking && !fourthWalking) {
      this.footstepClock = 0;
      return;
    }

    this.footstepClock += Math.min(dt, 0.05);
    const paceRatio = challengeWalking
      ? Math.min(1, state.challenge.currentSpeed / Math.max(1, state.challenge.maxSpeed))
      : fourthWalking
        ? state.fourth.pace === 'fast' ? 1 : state.fourth.pace === 'slow' ? 0.2 : 0.55
      : state.speedLevel / (SPEEDS.length - 1);
    const interval = 0.66 - paceRatio * 0.46;
    if (this.footstepClock >= interval) {
      this.footstepClock %= interval;
      this.playFootstep(challengeWalking || fourthWalking ? paceRatio * 4 : state.speedLevel);
    }
  }

  resetTracking(state: GameState): void {
    this.lastTaskCount = SPEEDS.filter((speed) => state.tasks[speed.id].complete).length;
    this.lastMinorBumps = state.minorBumps;
    this.lastStrongCollisions = state.strongCollisions;
    this.footstepClock = 0;
  }

  playStart(): void {
    this.record('start');
    void this.unlock().then(() => {
      this.tone(220, 0.2, 0.08, 'triangle', 0, 330);
      this.tone(440, 0.24, 0.055, 'sine', 0.08, 554.37);
    });
  }

  playSpeedChange(delta: number, level: number): void {
    this.record('speed');
    const base = 230 + level * 58;
    const start = delta > 0 ? base : base * 1.25;
    const end = delta > 0 ? base * 1.25 : base;
    this.tone(start, 0.11, 0.06, 'square', 0, end);
  }

  playContinue(): void {
    this.record('continue');
    this.tone(680, 0.1, 0.045, 'sine', 0, 860);
  }

  playFinish(): void {
    this.record('finish');
    [293.66, 392, 523.25].forEach((frequency, index) => this.tone(frequency, 0.5, 0.06, 'triangle', index * 0.08));
  }

  playChoice(kind: Exclude<InteractionKind, null>): void {
    this.record('choice');
    if (kind === 'punch') {
      this.tone(180, 0.18, 0.075, 'sawtooth', 0, 110);
    } else {
      this.tone(523.25, 0.18, 0.05, 'sine', 0, 659.25);
    }
  }

  playInteraction(kind: Exclude<InteractionKind, null>): void {
    if (kind === 'punch') this.playPunch();
    else this.playPet();
  }

  playDepart(): void {
    this.record('depart');
    this.tone(330, 0.42, 0.07, 'triangle', 0, 146.83);
    this.tone(220, 0.48, 0.045, 'sine', 0.08, 110);
  }

  playRestart(): void {
    this.record('restart');
    [261.63, 329.63, 392].forEach((frequency, index) => this.tone(frequency, 0.18, 0.05, 'sine', index * 0.07));
  }

  getDebugState(): AudioDebugState {
    return {
      supported: this.supported,
      unlocked: this.context?.state === 'running',
      muted: this.muted,
      contextState: this.supported ? this.context?.state ?? 'not-created' : 'unsupported',
      scene: this.scene,
      masterGain: Number((this.masterGain?.gain.value ?? (this.muted ? 0 : MASTER_VOLUME)).toFixed(3)),
      events: { ...this.events },
    };
  }

  private ensureGraph(): void {
    if (this.context || !this.supported) return;
    const context = new AudioContext();
    this.context = context;
    this.masterGain = context.createGain();
    this.musicGain = context.createGain();
    this.ambienceGain = context.createGain();
    this.sfxGain = context.createGain();
    this.musicFilter = context.createBiquadFilter();
    this.outputCompressor = context.createDynamicsCompressor();

    this.masterGain.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.outputCompressor.threshold.value = -10;
    this.outputCompressor.knee.value = 12;
    this.outputCompressor.ratio.value = 4;
    this.outputCompressor.attack.value = 0.003;
    this.outputCompressor.release.value = 0.2;
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 1150;
    this.musicFilter.Q.value = 0.75;
    this.musicFilter.connect(this.musicGain);
    this.musicGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.outputCompressor).connect(context.destination);

    this.noiseBuffer = this.createNoiseBuffer(1.5);
    this.startAmbience();
    this.startDrone();
    this.applySceneMix(true);
    this.musicTimer = window.setInterval(() => this.playMusicNote(), 520);
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const context = this.context as AudioContext;
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.015;
      data[index] = Math.max(-1, Math.min(1, last * 3.2));
    }
    return buffer;
  }

  private startAmbience(): void {
    if (!this.context || !this.noiseBuffer || !this.ambienceGain) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const level = this.context.createGain();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 430;
    filter.Q.value = 0.42;
    level.gain.value = 0.11;
    source.connect(filter).connect(level).connect(this.ambienceGain);
    source.start();
  }

  private startDrone(): void {
    if (!this.context || !this.musicFilter) return;
    const drone = [73.42, 110, 146.83];
    drone.forEach((frequency, index) => {
      const oscillator = this.context?.createOscillator();
      const gain = this.context?.createGain();
      if (!oscillator || !gain || !this.musicFilter) return;
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 2 ? -7 : index === 0 ? 5 : 0;
      gain.gain.value = index === 1 ? 0.025 : 0.018;
      oscillator.connect(gain).connect(this.musicFilter);
      oscillator.start();
    });

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.075;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(this.musicFilter.frequency);
    lfo.start();
  }

  private playMusicNote(): void {
    if (!this.context || this.context.state !== 'running' || this.muted || this.scene === 'departed') return;
    if (this.scene !== 'walking' && this.scene !== 'level-four-walk' && this.musicStep % 2 === 1) {
      this.musicStep += 1;
      return;
    }
    const walkingNotes = [293.66, 349.23, 392, 440, 392, 523.25, 440, 349.23];
    const portraitNotes = [220, 261.63, 293.66, 261.63];
    const activeWalkingScene = this.scene === 'walking' || this.scene === 'level-four-walk';
    const notes = activeWalkingScene ? walkingNotes : portraitNotes;
    const frequency = notes[this.musicStep % notes.length];
    this.musicStep += 1;
    this.record('musicNote');
    this.tone(frequency, activeWalkingScene ? 0.34 : 0.55, 0.04, 'sine', 0, frequency * 1.003, this.musicFilter);
  }

  private playTaskComplete(): void {
    this.record('task');
    [392, 523.25, 659.25].forEach((frequency, index) => this.tone(frequency, 0.36, 0.075, 'sine', index * 0.1));
  }

  private playMinorCollision(): void {
    if (!this.canPlay('minorCollision', 0.14)) return;
    this.record('minorCollision');
    this.noise(0.09, 0.08, 680);
    this.tone(135, 0.1, 0.055, 'triangle', 0, 105);
  }

  private playStrongCollision(): void {
    if (!this.canPlay('strongCollision', 0.2)) return;
    this.record('strongCollision');
    this.noise(0.28, 0.19, 520);
    this.tone(92, 0.3, 0.14, 'sawtooth', 0, 44);
    this.tone(210, 0.12, 0.07, 'square', 0.035, 95);
  }

  private playFootstep(level: number): void {
    if (!this.canPlay('footstep', 0.14)) return;
    this.record('footstep');
    const pan = this.footstepSide * 0.18;
    this.footstepSide *= -1;
    this.noise(0.055, 0.035 + level * 0.005, 920, 0, pan);
    this.tone(72 + level * 8, 0.075, 0.055, 'sine', 0, 48 + level * 5, undefined, pan);
  }

  private playPunch(): void {
    this.record('punch');
    this.noise(0.2, 0.2, 470);
    this.tone(105, 0.22, 0.15, 'square', 0, 48);
  }

  private playPet(): void {
    this.record('pet');
    this.tone(659.25, 0.28, 0.055, 'sine', 0, 783.99, undefined, -0.15);
    this.tone(987.77, 0.32, 0.035, 'sine', 0.06, 1046.5, undefined, 0.18);
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    delay = 0,
    endFrequency = frequency,
    destination?: AudioNode | null,
    pan = 0,
  ): void {
    if (!this.context || !this.sfxGain || this.context.state !== 'running' || this.muted) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.value = pan;
    oscillator.connect(gain).connect(panner).connect(destination ?? this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(duration: number, volume: number, frequency: number, delay = 0, pan = 0): void {
    if (!this.context || !this.noiseBuffer || !this.sfxGain || this.context.state !== 'running' || this.muted) return;
    const start = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.88 + Math.random() * 0.24;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(this.sfxGain);
    source.start(start, Math.random() * Math.max(0.01, this.noiseBuffer.duration - duration), duration);
    source.stop(start + duration + 0.02);
  }

  private applySceneMix(immediate = false): void {
    if (!this.context || !this.musicGain || !this.ambienceGain) return;
    const mix: Record<GameMode, { music: number; ambience: number }> = {
      intro: { music: 0.3, ambience: 0.025 },
      'level-select': { music: 0.32, ambience: 0.025 },
      'level-briefing': { music: 0.31, ambience: 0.1 },
      challenge: { music: 0.42, ambience: 0.2 },
      'challenge-failure': { music: 0.12, ambience: 0.08 },
      'challenge-victory': { music: 0.5, ambience: 0.12 },
      upgrade: { music: 0.2, ambience: 0.08 },
      victory: { music: 0.46, ambience: 0.1 },
      'level-four-choice': { music: 0.34, ambience: 0.12 },
      'level-four-walk': { music: 0.4, ambience: 0.2 },
      'level-four-summary': { music: 0.12, ambience: 0.06 },
      'level-four-reflection': { music: 0.16, ambience: 0.08 },
      'level-four-ending': { music: 0.45, ambience: 0.1 },
      'all-endings': { music: 0.45, ambience: 0.1 },
      walking: { music: 0.38, ambience: 0.18 },
      return: { music: 0.28, ambience: 0.018 },
      interaction: { music: 0.22, ambience: 0.01 },
      departed: { music: 0.08, ambience: 0 },
    };
    const target = mix[this.scene];
    this.ramp(this.musicGain.gain, target.music, immediate ? 0.001 : 0.7);
    this.ramp(this.ambienceGain.gain, target.ambience, immediate ? 0.001 : 0.7);
  }

  private applyMasterGain(): void {
    if (!this.context || !this.masterGain) return;
    this.ramp(this.masterGain.gain, this.muted ? 0 : MASTER_VOLUME, 0.08);
  }

  private ramp(parameter: AudioParam, target: number, duration: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value, now);
    parameter.linearRampToValueAtTime(target, now + duration);
  }

  private canPlay(name: AudioEventName, cooldown: number): boolean {
    const now = this.context?.currentTime ?? performance.now() / 1000;
    const last = this.lastPlayTimes.get(name) ?? -Infinity;
    if (now - last < cooldown) return false;
    this.lastPlayTimes.set(name, now);
    return true;
  }

  private record(name: AudioEventName): void {
    this.events[name] += 1;
  }

  private readMutedPreference(): boolean {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
