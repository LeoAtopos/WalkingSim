import { COPY } from './i18n';

export type GameMode = 'intro' | 'walking' | 'return' | 'interaction' | 'departed';
export type InteractionKind = 'punch' | 'pet' | null;
export type CollisionSide = 'ahead' | 'behind';

export interface SpeedDefinition {
  id: 'stopped' | 'slow' | 'normal' | 'brisk' | 'run';
  label: string;
  shortLabel: string;
  value: number;
  phrase: string;
}

export interface SpeedTask {
  progress: number;
  complete: boolean;
}

export interface WalkerState {
  id: string;
  x: number;
  z: number;
  targetX: number;
  speed: number;
  color: number;
  phase: number;
  scale: number;
  avoidanceTime: number;
  recycles: number;
}

export interface SpeechState {
  text: string;
  elapsed: number;
}

export interface GameState {
  mode: GameMode;
  speedLevel: number;
  player: WalkerState;
  npcs: WalkerState[];
  tasks: Record<SpeedDefinition['id'], SpeedTask>;
  speech: SpeechState | null;
  speechQueue: string[];
  allTasksComplete: boolean;
  elapsed: number;
  distance: number;
  interaction: InteractionKind;
  interactionElapsed: number;
  interactionCount: number;
  impactTime: number;
  impactTextTime: number;
  impactStrength: number;
  impactLabel: string;
  minorBumps: number;
  strongCollisions: number;
}

export const SPEEDS: readonly SpeedDefinition[] = [
  {
    id: 'stopped',
    label: COPY.speeds.stopped.label,
    shortLabel: COPY.speeds.stopped.shortLabel,
    value: 0,
    phrase: COPY.speeds.stopped.phrase,
  },
  {
    id: 'slow',
    label: COPY.speeds.slow.label,
    shortLabel: COPY.speeds.slow.shortLabel,
    value: 10.4,
    phrase: COPY.speeds.slow.phrase,
  },
  {
    id: 'normal',
    label: COPY.speeds.normal.label,
    shortLabel: COPY.speeds.normal.shortLabel,
    value: 23.2,
    phrase: COPY.speeds.normal.phrase,
  },
  {
    id: 'brisk',
    label: COPY.speeds.brisk.label,
    shortLabel: COPY.speeds.brisk.shortLabel,
    value: 36.8,
    phrase: COPY.speeds.brisk.phrase,
  },
  {
    id: 'run',
    label: COPY.speeds.run.label,
    shortLabel: COPY.speeds.run.shortLabel,
    value: 80.4,
    phrase: COPY.speeds.run.phrase,
  },
] as const;

export const TASK_DURATION = 10;
export const SPEECH_CONTINUE_DELAY = 1.5;
export const INTERACTION_TARGET = 5;
export const STRONG_COLLISION_SPEED_GAP = 10.6;

const NPC_SPEED_MIDPOINT = (SPEEDS[1].value + SPEEDS[3].value) / 2;
const NPC_SPEED_HALF_RANGE = ((SPEEDS[3].value - SPEEDS[1].value) / 2) * 0.8;
export const NPC_SPEED_MIN = NPC_SPEED_MIDPOINT - NPC_SPEED_HALF_RANGE;
export const NPC_SPEED_MAX = NPC_SPEED_MIDPOINT + NPC_SPEED_HALF_RANGE;
