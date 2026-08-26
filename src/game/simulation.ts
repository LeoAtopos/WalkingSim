import {
  SPEEDS,
  NPC_SPEED_MAX,
  NPC_SPEED_MIN,
  SPEECH_CONTINUE_DELAY,
  STRONG_COLLISION_SPEED_GAP,
  TASK_DURATION,
  type CollisionSide,
  type GameState,
  type SpeedDefinition,
  type WalkerState,
} from './types';
import { COPY } from './i18n';

const NPC_COLORS = [0xe96b5e, 0xf0ad4e, 0x59a884, 0x7658a5, 0xd97ea8, 0x426f9e, 0xc98e56];

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function randomStreetX(seed: number): number {
  // A high-power curve makes the centre visibly crowded while preserving a
  // small chance of walkers appearing near either edge of the road.
  const signed = seededUnit(seed) * 2 - 1;
  return Math.sign(signed) * Math.pow(Math.abs(signed), 6) * 4.05;
}

function makeWalker(index: number): WalkerState {
  // Most walkers use the full street width; a few naturally pass near the
  // player's route so the crowd still produces regular encounters.
  const targetX = index % 7 === 1
    ? (seededUnit(index * 2.31 + 0.8) - 0.5) * 0.75
    : randomStreetX(index * 3.71 + 1.4);
  const ahead = index < 20;
  const zJitter = seededUnit(index * 5.17 + 2.2) * 2.8;
  const z = ahead ? -4.5 - index * 4.1 - zJitter : 6.5 + (index - 20) * 5.3 + zJitter;
  const speedUnit = seededUnit(index * 11.83 + 4.6);
  return {
    id: `npc-${index}`,
    x: targetX,
    targetX,
    z,
    speed: NPC_SPEED_MIN + (NPC_SPEED_MAX - NPC_SPEED_MIN) * speedUnit,
    color: NPC_COLORS[index % NPC_COLORS.length],
    phase: index * 0.79,
    scale: 0.91 + ((index * 17) % 18) / 100,
    avoidanceTime: 0,
    recycles: 0,
  };
}

function freshTasks(): GameState['tasks'] {
  return {
    stopped: { progress: 0, complete: false },
    slow: { progress: 0, complete: false },
    normal: { progress: 0, complete: false },
    brisk: { progress: 0, complete: false },
    run: { progress: 0, complete: false },
  };
}

export class WalkingSimulation {
  state: GameState;

  constructor() {
    this.state = this.createState();
  }

  private createState(): GameState {
    return {
      mode: 'intro',
      speedLevel: 2,
      player: {
        id: 'player',
        x: 0,
        targetX: 0,
        z: 0,
        speed: SPEEDS[2].value,
        color: 0x287dd8,
        phase: 0,
        scale: 1,
        avoidanceTime: 0,
        recycles: 0,
      },
      npcs: Array.from({ length: 28 }, (_, index) => makeWalker(index)),
      tasks: freshTasks(),
      speech: null,
      speechQueue: [],
      pendingEvaluation: null,
      selectedEvaluations: {},
      allTasksComplete: false,
      elapsed: 0,
      distance: 0,
      interaction: null,
      interactionElapsed: 0,
      interactionCount: 0,
      impactTime: 0,
      impactTextTime: 0,
      impactStrength: 0,
      impactLabel: '',
      minorBumps: 0,
      strongCollisions: 0,
    };
  }

  reset(): void {
    this.state = this.createState();
  }

  startWalking(): void {
    if (this.state.mode !== 'intro') return;
    this.state.mode = 'walking';
    this.state.speedLevel = 2;
    this.state.player.speed = SPEEDS[2].value;
  }

  setSpeedLevel(level: number): void {
    if (this.state.mode !== 'walking' || this.state.speech || this.state.pendingEvaluation) return;
    const next = Math.max(0, Math.min(SPEEDS.length - 1, level));
    if (next !== this.state.speedLevel) {
      const previousTask = this.state.tasks[SPEEDS[this.state.speedLevel].id];
      if (!previousTask.complete) previousTask.progress = 0;
    }
    this.state.speedLevel = next;
    this.state.player.speed = SPEEDS[next].value;
  }

  changeSpeed(delta: number): void {
    this.setSpeedLevel(this.state.speedLevel + delta);
  }

  finishWalk(): void {
    if (this.state.mode !== 'walking' || this.state.speech || this.state.pendingEvaluation || !this.state.allTasksComplete) return;
    this.state.mode = 'return';
    this.state.speech = null;
    this.state.speechQueue = [];
    this.state.pendingEvaluation = null;
  }

  chooseInteraction(kind: Exclude<GameState['interaction'], null>): void {
    if (this.state.mode !== 'return') return;
    this.state.mode = 'interaction';
    this.state.interaction = kind;
    this.state.interactionElapsed = 0;
    this.state.interactionCount = 0;
  }

  interactWithLi(): void {
    if (this.state.mode !== 'interaction') return;
    this.state.interactionCount += 1;
    this.state.impactTime = this.state.interaction === 'punch' ? 0.48 : 0.34;
    this.state.impactStrength = this.state.interaction === 'punch' ? 1 : 0.22;
  }

  depart(): void {
    if (this.state.mode !== 'interaction' && this.state.mode !== 'return') return;
    this.state.mode = 'departed';
  }

  dismissSpeech(): void {
    if (!this.state.speech || this.state.speech.elapsed < SPEECH_CONTINUE_DELAY) return;
    const next = this.state.speechQueue.shift();
    this.state.speech = next ? { text: next, elapsed: 0 } : null;
  }

  chooseEvaluation(choiceIndex: number): void {
    const evaluationId = this.state.pendingEvaluation;
    if (this.state.mode !== 'walking' || !evaluationId) return;
    const speed = SPEEDS.find((definition) => definition.id === evaluationId);
    const text = speed?.phrases[choiceIndex];
    if (!text) return;
    this.state.pendingEvaluation = null;
    this.state.selectedEvaluations[evaluationId] = text;
    this.state.speech = { text, elapsed: 0 };
  }

  registerCollision(relativeSpeed: number, npcId?: string, side: CollisionSide = 'ahead'): void {
    if (this.state.mode !== 'walking') return;
    if (npcId) this.startNpcAvoidance(npcId, relativeSpeed);
    if (relativeSpeed >= STRONG_COLLISION_SPEED_GAP) {
      const phrases = side === 'ahead' ? COPY.collisions.ahead : COPY.collisions.behind;
      const phraseIndex = this.state.strongCollisions % phrases.length;
      this.state.strongCollisions += 1;
      this.state.impactTime = 0.78;
      this.state.impactTextTime = 2.6;
      this.state.impactStrength = Math.min(1.4, 0.72 + relativeSpeed * 0.025);
      this.state.impactLabel = phrases[phraseIndex];
    } else {
      this.state.minorBumps += 1;
      this.state.impactTime = Math.max(this.state.impactTime, 0.24);
      this.state.impactTextTime = Math.max(this.state.impactTextTime, 0.65);
      this.state.impactStrength = Math.max(this.state.impactStrength, 0.18);
      this.state.impactLabel = COPY.collisions.minor;
    }
  }

  private startNpcAvoidance(npcId: string, relativeSpeed: number): void {
    const npc = this.state.npcs.find((walker) => walker.id === npcId);
    if (!npc) return;

    const duration = relativeSpeed >= STRONG_COLLISION_SPEED_GAP ? 3.25 : 2.45;

    const idNumber = Number(npc.id.split('-')[1]) || 0;
    const continuingDirection = Math.sign(npc.targetX - npc.x);
    let direction = npc.avoidanceTime > 0.2 && continuingDirection !== 0
      ? continuingDirection
      : Math.abs(npc.x - this.state.player.x) > 0.18
      ? Math.sign(npc.x - this.state.player.x)
      : (idNumber % 2 === 0 ? -1 : 1);
    const sideStep = relativeSpeed >= STRONG_COLLISION_SPEED_GAP ? 3.05 : 2.15;
    if (npc.x + direction * sideStep > 4.15 || npc.x + direction * sideStep < -4.15) {
      direction *= -1;
    }
    npc.targetX = Math.max(-4.15, Math.min(4.15, npc.x + direction * sideStep));
    npc.avoidanceTime = Math.max(npc.avoidanceTime, duration);
  }

  update(dt: number): void {
    const state = this.state;
    if (state.mode === 'walking' && (state.speech || state.pendingEvaluation)) {
      if (state.speech) state.speech.elapsed += dt;
      return;
    }
    state.elapsed += dt;
    state.impactTime = Math.max(0, state.impactTime - dt);
    state.impactTextTime = Math.max(0, state.impactTextTime - dt);
    if (state.impactTime === 0 && state.impactTextTime === 0) state.impactStrength = 0;

    if (state.mode === 'walking') this.updateWalking(dt);
  }

  private updateWalking(dt: number): void {
    const state = this.state;
    const speed = SPEEDS[state.speedLevel];
    state.player.speed = speed.value;
    state.distance += speed.value * dt;
    state.npcs.forEach((npc) => {
      npc.avoidanceTime = Math.max(0, npc.avoidanceTime - dt);
    });
    SPEEDS.forEach((definition) => {
      if (definition.id !== speed.id && !state.tasks[definition.id].complete) {
        state.tasks[definition.id].progress = 0;
      }
    });

    const task = state.tasks[speed.id];
    if (!task.complete) {
      task.progress = Math.min(TASK_DURATION, task.progress + dt);
      if (task.progress >= TASK_DURATION) {
        task.complete = true;
        state.impactTime = 0;
        state.impactTextTime = 0;
        state.impactStrength = 0;
        state.impactLabel = '';
        state.pendingEvaluation = speed.id;
      }
    }

    state.allTasksComplete = SPEEDS.every((definition) => state.tasks[definition.id].complete);
  }

  get activeSpeed(): SpeedDefinition {
    return SPEEDS[this.state.speedLevel];
  }
}
