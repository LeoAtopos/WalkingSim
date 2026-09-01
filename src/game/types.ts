import { COPY } from './i18n';

export type GameMode =
  | 'intro'
  | 'level-select'
  | 'level-briefing'
  | 'challenge'
  | 'challenge-failure'
  | 'upgrade'
  | 'victory'
  | 'walking'
  | 'return'
  | 'interaction'
  | 'departed';
export type InteractionKind = 'punch' | 'pet' | null;
export type CollisionSide = 'ahead' | 'behind';
export type ChallengeLevelId = 1 | 2 | 3;
export type LevelId = ChallengeLevelId | 4;
export type ChallengeUpgradeKey = 'response' | 'lateral' | 'maxSpeed' | 'power' | 'mood' | 'guard';
export type ChallengeFailureKind = 'collision' | 'timeout' | 'arrived-early' | 'cried' | null;

export interface SpeedDefinition {
  id: 'stopped' | 'slow' | 'normal' | 'brisk' | 'run';
  label: string;
  shortLabel: string;
  value: number;
  phrases: readonly [string, string, string];
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

export interface MetaProgress {
  completed: Record<ChallengeLevelId, boolean>;
  attempts: Record<ChallengeLevelId, number>;
  experience: Record<ChallengeLevelId, number>;
  growthLevel: Record<ChallengeLevelId, number>;
  upgradePoints: Record<ChallengeLevelId, number>;
  upgrades: {
    1: { response: number; lateral: number };
    2: { maxSpeed: number; power: number };
    3: { mood: number; guard: number };
  };
}

export interface ChallengeState {
  level: ChallengeLevelId | null;
  time: number;
  timeLimit: number;
  distance: number;
  finishDistance: number;
  targetSpeed: number;
  currentSpeed: number;
  minSpeed: number;
  maxSpeed: number;
  speedResponse: number;
  targetAdjustRate: number;
  lateralSpeed: number;
  speedInput: -1 | 0 | 1;
  lateralInput: -1 | 0 | 1;
  mood: number;
  maxMood: number;
  hitDamage: number;
  hitCount: number;
  invulnerableTime: number;
  failureElapsed: number;
  failureDuration: number;
  failureProgress: number;
  experienceGained: number;
  experienceBefore: number;
  experienceAfter: number;
  experienceRequiredBefore: number;
  experienceRequiredAfter: number;
  growthLevelBefore: number;
  growthLevelAfter: number;
  failureKind: ChallengeFailureKind;
  resultReason: string;
  lastUpgrade: ChallengeUpgradeKey | null;
}

export interface GameState {
  mode: GameMode;
  selectedLevel: LevelId | null;
  meta: MetaProgress;
  challenge: ChallengeState;
  speedLevel: number;
  player: WalkerState;
  npcs: WalkerState[];
  tasks: Record<SpeedDefinition['id'], SpeedTask>;
  speech: SpeechState | null;
  speechQueue: string[];
  pendingEvaluation: SpeedDefinition['id'] | null;
  selectedEvaluations: Partial<Record<SpeedDefinition['id'], string>>;
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
    phrases: COPY.speeds.stopped.phrases,
  },
  {
    id: 'slow',
    label: COPY.speeds.slow.label,
    shortLabel: COPY.speeds.slow.shortLabel,
    value: 10.4,
    phrases: COPY.speeds.slow.phrases,
  },
  {
    id: 'normal',
    label: COPY.speeds.normal.label,
    shortLabel: COPY.speeds.normal.shortLabel,
    value: 23.2,
    phrases: COPY.speeds.normal.phrases,
  },
  {
    id: 'brisk',
    label: COPY.speeds.brisk.label,
    shortLabel: COPY.speeds.brisk.shortLabel,
    value: 36.8,
    phrases: COPY.speeds.brisk.phrases,
  },
  {
    id: 'run',
    label: COPY.speeds.run.label,
    shortLabel: COPY.speeds.run.shortLabel,
    value: 80.4,
    phrases: COPY.speeds.run.phrases,
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
