import {
  SPEEDS,
  NPC_SPEED_MAX,
  NPC_SPEED_MIN,
  SPEECH_CONTINUE_DELAY,
  STRONG_COLLISION_SPEED_GAP,
  TASK_DURATION,
  type ChallengeLevelId,
  type ChallengeFailureKind,
  type ChallengeState,
  type ChallengeUpgradeKey,
  type CollisionSide,
  type GameState,
  type LevelId,
  type MetaProgress,
  type SpeedDefinition,
  type WalkerState,
} from './types';
import { CHALLENGE_UI, getChallengeStats, getLevel, hasAvailableUpgrade, isUpgradeMaxed } from './challenges';
import { COPY, LANGUAGE } from './i18n';
import { getExperienceRequirement, getExperienceReward } from './balance';

const NPC_COLORS = [0xe96b5e, 0xf0ad4e, 0x59a884, 0x7658a5, 0xd97ea8, 0x426f9e, 0xc98e56];
const META_STORAGE_KEY = 'walking-sim-roguelike-v1';
export const NPC_COUNT = 84;
export const CHALLENGE_CROWD_HALF_WIDTH = 4.15;

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

let fallbackNpcSeed = Date.now() >>> 0;
export function freshNpcRandomSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] || 1;
  }
  fallbackNpcSeed = (Math.imul(fallbackNpcSeed, 1664525) + 1013904223) >>> 0;
  return fallbackNpcSeed || 1;
}

export function randomStreetX(seed: number, halfWidth = CHALLENGE_CROWD_HALF_WIDTH): number {
  return (seededUnit(seed) * 2 - 1) * halfWidth;
}

export function stratifiedStreetX(index: number, seed: number, halfWidth = CHALLENGE_CROWD_HALF_WIDTH): number {
  const bandCount = 7;
  const band = ((index * 3) % bandCount + bandCount) % bandCount;
  const unit = (band + seededUnit(seed)) / bandCount;
  return (unit * 2 - 1) * halfWidth;
}

function makeWalker(index: number): WalkerState {
  const randomSeed = freshNpcRandomSeed();
  const targetX = randomStreetX(randomSeed + index * 3.71 + 1.4);
  const ahead = index < 60;
  const localIndex = ahead ? index : index - 60;
  const zJitter = seededUnit(randomSeed + index * 5.17 + 2.2) * 0.9;
  const z = ahead ? -4.5 - localIndex * 1.55 - zJitter : 6.5 + localIndex * 2.1 + zJitter;
  const speedUnit = seededUnit(randomSeed + index * 11.83 + 4.6);
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
    randomSeed,
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

function freshMeta(): MetaProgress {
  return {
    completed: { 1: false, 2: false, 3: false },
    attempts: { 1: 0, 2: 0, 3: 0 },
    experience: { 1: 0, 2: 0, 3: 0 },
    growthLevel: { 1: 0, 2: 0, 3: 0 },
    upgradePoints: { 1: 0, 2: 0, 3: 0 },
    upgrades: {
      1: { response: 0, lateral: 0 },
      2: { maxSpeed: 0, power: 0 },
      3: { mood: 0, guard: 0 },
    },
  };
}

function loadMeta(): MetaProgress {
  const fallback = freshMeta();
  try {
    const parsed = JSON.parse(localStorage.getItem(META_STORAGE_KEY) ?? 'null') as Partial<MetaProgress> | null;
    if (!parsed) return fallback;
    ([1, 2, 3] as ChallengeLevelId[]).forEach((level) => {
      fallback.completed[level] = Boolean(parsed.completed?.[level]);
      fallback.attempts[level] = 0;
    });
  } catch {
    // A fresh run is still playable when storage is unavailable or malformed.
  }
  return fallback;
}

function freshChallenge(): ChallengeState {
  return {
    level: null,
    crowdSeed: 0,
    time: 0,
    timeLimit: 20,
    distance: 0,
    finishDistance: 0,
    targetSpeed: 0,
    currentSpeed: 0,
    minSpeed: 0,
    maxSpeed: 0,
    speedResponse: 0,
    targetAdjustRate: 0,
    lateralSpeed: 0,
    speedInput: 0,
    lateralInput: 0,
    mood: 0,
    maxMood: 0,
    hitDamage: 0,
    hitCount: 0,
    invulnerableTime: 0,
    failureElapsed: 0,
    failureDuration: 0,
    victoryElapsed: 0,
    victoryDuration: 0,
    failureProgress: 0,
    experienceGained: 0,
    experienceBefore: 0,
    experienceAfter: 0,
    experienceRequiredBefore: 0,
    experienceRequiredAfter: 0,
    growthLevelBefore: 0,
    growthLevelAfter: 0,
    failureKind: null,
    resultReason: '',
    lastUpgrade: null,
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
      selectedLevel: null,
      meta: loadMeta(),
      challenge: freshChallenge(),
      speedLevel: 2,
      player: {
        id: 'player', x: 0, targetX: 0, z: 0, speed: SPEEDS[2].value,
        color: 0x287dd8, phase: 0, scale: 1, avoidanceTime: 0, recycles: 0, randomSeed: 0,
      },
      npcs: Array.from({ length: NPC_COUNT }, (_, index) => makeWalker(index)),
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

  private saveMeta(): void {
    try {
      localStorage.setItem(META_STORAGE_KEY, JSON.stringify({
        completed: this.state.meta.completed,
      }));
    } catch {
      // Progress remains valid for the current session when storage is blocked.
    }
  }

  reset(): void {
    this.state = this.createState();
  }

  startWalking(): void {
    if (this.state.mode !== 'intro') return;
    this.state.mode = 'level-select';
    this.state.player.speed = 0;
  }

  isLevelFourUnlocked(): boolean {
    return ([1, 2, 3] as ChallengeLevelId[]).every((level) => this.state.meta.completed[level]);
  }

  selectLevel(level: LevelId): void {
    if (this.state.mode !== 'level-select') return;
    if (level === 4) {
      if (!this.isLevelFourUnlocked()) return;
      this.startLegacyWalk();
      return;
    }
    this.state.selectedLevel = level;
    this.configureChallenge(level);
    this.state.mode = 'level-briefing';
  }

  beginChallenge(): void {
    const level = this.state.challenge.level;
    if (this.state.mode !== 'level-briefing' || !level) return;
    this.configureChallenge(level);
    this.state.meta.attempts[level] += 1;
    this.state.mode = 'challenge';
  }

  returnToLevelSelect(): void {
    const level = this.state.challenge.level;
    if (level) {
      this.state.meta.attempts[level] = 0;
      this.state.meta.experience[level] = 0;
      this.state.meta.growthLevel[level] = 0;
      this.state.meta.upgradePoints[level] = 0;
      if (level === 1) this.state.meta.upgrades[1] = { response: 0, lateral: 0 };
      else if (level === 2) this.state.meta.upgrades[2] = { maxSpeed: 0, power: 0 };
      else this.state.meta.upgrades[3] = { mood: 0, guard: 0 };
    }
    this.state.mode = 'level-select';
    this.state.selectedLevel = null;
    this.state.challenge.speedInput = 0;
    this.state.challenge.lateralInput = 0;
    this.state.player.speed = 0;
    this.state.impactTime = 0;
    this.state.impactTextTime = 0;
    this.saveMeta();
  }

  chooseUpgrade(key: ChallengeUpgradeKey): void {
    const level = this.state.challenge.level;
    if (this.state.mode !== 'upgrade' || !level || this.state.meta.upgradePoints[level] < 1 || !getLevel(level).upgrades.includes(key) || isUpgradeMaxed(this.state.meta, level, key)) return;
    const upgrades = this.state.meta.upgrades[level] as Partial<Record<ChallengeUpgradeKey, number>>;
    upgrades[key] = (upgrades[key] ?? 0) + 1;
    this.state.meta.upgradePoints[level] -= 1;
    if (this.state.meta.upgradePoints[level] > 0 && hasAvailableUpgrade(this.state.meta, level)) {
      this.state.challenge.lastUpgrade = key;
      return;
    }
    this.configureChallenge(level, key);
    this.state.mode = 'level-briefing';
  }

  retryChallenge(): void {
    const level = this.state.challenge.level;
    if (this.state.mode !== 'upgrade' || !level || (this.state.meta.upgradePoints[level] > 0 && hasAvailableUpgrade(this.state.meta, level))) return;
    this.configureChallenge(level);
    this.state.mode = 'level-briefing';
  }

  finishVictory(): void {
    if (this.state.mode !== 'victory') return;
    this.returnToLevelSelect();
  }

  setChallengeInput(axis: 'speed' | 'lateral', value: -1 | 0 | 1): void {
    if (this.state.mode !== 'challenge') return;
    if (axis === 'speed') this.state.challenge.speedInput = value;
    else this.state.challenge.lateralInput = value;
  }

  private configureChallenge(level: ChallengeLevelId, lastUpgrade: ChallengeUpgradeKey | null = null): void {
    const stats = getChallengeStats(this.state.meta, level);
    const initialSpeed = 0;
    this.state.challenge = {
      ...freshChallenge(),
      level,
      crowdSeed: freshNpcRandomSeed(),
      timeLimit: stats.timeLimit,
      failureDuration: stats.failureDuration,
      victoryDuration: stats.victoryDuration,
      finishDistance: stats.finishDistance,
      targetSpeed: initialSpeed,
      currentSpeed: initialSpeed,
      minSpeed: stats.minSpeed,
      maxSpeed: stats.maxSpeed,
      speedResponse: stats.response,
      targetAdjustRate: stats.targetAdjustRate,
      lateralSpeed: stats.lateral,
      mood: stats.maxMood,
      maxMood: stats.maxMood,
      hitDamage: stats.hitDamage,
      lastUpgrade,
    };
    this.state.player.x = 0;
    this.state.player.targetX = 0;
    this.state.player.z = 0;
    this.state.player.speed = initialSpeed;
    this.state.distance = 0;
    this.state.elapsed = 0;
    this.state.impactTime = 0;
    this.state.impactTextTime = 0;
    this.state.impactLabel = '';
    this.state.minorBumps = 0;
    this.state.strongCollisions = 0;
    this.configureChallengeCrowd(level);
  }

  private configureChallengeCrowd(level: ChallengeLevelId): void {
    const balance = getChallengeStats(this.state.meta, level);
    const aheadCount = Math.max(0, Math.min(this.state.npcs.length, Math.round(balance.crowdAheadCount)));
    this.state.npcs.forEach((npc, index) => {
      npc.randomSeed = freshNpcRandomSeed();
      const ahead = index < aheadCount;
      const localIndex = ahead ? index : index - aheadCount;
      const bandOffset = this.state.challenge.crowdSeed % 7;
      const uniformX = stratifiedStreetX(index + level * 5 + bandOffset, npc.randomSeed + index * 5.83 + level * 31.17, CHALLENGE_CROWD_HALF_WIDTH);
      npc.x = uniformX;
      npc.targetX = uniformX;
      npc.avoidanceTime = 0;
      npc.recycles = 0;
      const aheadJitter = (seededUnit(npc.randomSeed + 71.3) - 0.5) * Math.min(1.2, balance.crowdAheadSpacing * 0.7);
      const behindJitter = (seededUnit(npc.randomSeed + 113.7) - 0.5) * Math.min(1.2, balance.crowdBehindSpacing * 0.7);
      if (level === 1) {
        npc.z = ahead ? -balance.crowdAheadStart - localIndex * balance.crowdAheadSpacing - aheadJitter : balance.crowdBehindStart + localIndex * balance.crowdBehindSpacing + behindJitter;
        npc.speed = 6.8 + seededUnit(npc.randomSeed + 211.2) * 5.4;
      } else if (level === 2) {
        npc.z = ahead ? -balance.crowdAheadStart - localIndex * balance.crowdAheadSpacing - aheadJitter : balance.crowdBehindStart + localIndex * balance.crowdBehindSpacing + behindJitter;
        npc.speed = 8.2 + seededUnit(npc.randomSeed + 313.8) * 6;
      } else {
        npc.z = ahead ? -balance.crowdAheadStart - localIndex * balance.crowdAheadSpacing - aheadJitter : balance.crowdBehindStart + localIndex * balance.crowdBehindSpacing + behindJitter;
        npc.speed = ahead ? 4.8 + seededUnit(npc.randomSeed + 419.1) * 4.4 : 10.8 + seededUnit(npc.randomSeed + 523.4) * 4.2;
      }
    });
  }

  private startLegacyWalk(): void {
    this.state.selectedLevel = 4;
    this.state.mode = 'walking';
    this.state.speedLevel = 2;
    this.state.player.x = 0;
    this.state.player.targetX = 0;
    this.state.player.z = 0;
    this.state.player.speed = SPEEDS[2].value;
    this.state.tasks = freshTasks();
    this.state.speech = null;
    this.state.speechQueue = [];
    this.state.pendingEvaluation = null;
    this.state.selectedEvaluations = {};
    this.state.allTasksComplete = false;
    this.state.distance = 0;
    this.state.elapsed = 0;
    this.state.minorBumps = 0;
    this.state.strongCollisions = 0;
    this.state.npcs.forEach((npc, index) => Object.assign(npc, makeWalker(index)));
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
    if (this.state.mode === 'challenge') {
      this.registerChallengeCollision(relativeSpeed, npcId);
      return;
    }
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

  private registerChallengeCollision(relativeSpeed: number, npcId?: string): void {
    const challenge = this.state.challenge;
    if (!challenge.level || challenge.invulnerableTime > 0) return;
    if (npcId) this.startNpcAvoidance(npcId, relativeSpeed);
    challenge.hitCount += 1;
    challenge.invulnerableTime = 0.72;
    this.state.strongCollisions += 1;
    this.state.impactTime = 0.62;
    this.state.impactTextTime = 1.2;
    this.state.impactStrength = 0.82;
    if (challenge.level === 1) {
      this.failChallenge(CHALLENGE_UI.reasons.touched, 'collision');
      return;
    }
    if (challenge.level === 2) {
      challenge.currentSpeed = Math.max(challenge.minSpeed, challenge.currentSpeed - challenge.hitDamage);
      this.state.player.speed = challenge.currentSpeed;
      this.state.impactLabel = `−${challenge.hitDamage.toFixed(1)} m/s`;
      return;
    }
    challenge.mood = Math.max(0, challenge.mood - challenge.hitDamage);
    this.state.impactLabel = `−${Math.round(challenge.hitDamage)}`;
    if (challenge.mood <= 0) this.failChallenge(CHALLENGE_UI.reasons.cried, 'cried');
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
    if (npc.x + direction * sideStep > 4.15 || npc.x + direction * sideStep < -4.15) direction *= -1;
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
    if (state.mode === 'challenge') this.updateChallenge(dt);
    if (state.mode === 'challenge-failure') this.updateChallengeFailure(dt);
    if (state.mode === 'challenge-victory') this.updateChallengeVictory(dt);
    if (state.mode === 'walking') this.updateWalking(dt);
  }

  private updateChallenge(dt: number): void {
    const challenge = this.state.challenge;
    if (!challenge.level) return;
    challenge.time = Math.min(challenge.timeLimit, challenge.time + dt);
    challenge.invulnerableTime = Math.max(0, challenge.invulnerableTime - dt);
    challenge.targetSpeed = Math.max(
      challenge.minSpeed,
      Math.min(challenge.maxSpeed, challenge.targetSpeed + challenge.speedInput * challenge.targetAdjustRate * dt),
    );
    const delta = challenge.targetSpeed - challenge.currentSpeed;
    const change = Math.sign(delta) * Math.min(Math.abs(delta), challenge.speedResponse * dt);
    challenge.currentSpeed += change;
    this.state.player.speed = challenge.currentSpeed;
    // The finish gate lives at z = -finishDistance. Derive progress from the
    // player's actual physics position so a run only ends once the character
    // has physically entered the gate, rather than when an abstract speed
    // integral gets there first.
    challenge.distance = Math.max(0, -this.state.player.z);
    this.state.distance = challenge.distance;
    this.state.npcs.forEach((npc) => { npc.avoidanceTime = Math.max(0, npc.avoidanceTime - dt); });

    if (challenge.level === 1 && challenge.time >= challenge.timeLimit) {
      this.winChallenge();
    } else if (challenge.level === 2) {
      if (this.state.player.z <= -challenge.finishDistance) this.winChallenge();
      else if (challenge.time >= challenge.timeLimit) this.failChallenge(CHALLENGE_UI.reasons.timeout, 'timeout');
    } else if (challenge.level === 3) {
      if (this.state.player.z <= -challenge.finishDistance) this.failChallenge(CHALLENGE_UI.reasons.arrivedEarly, 'arrived-early');
      else if (challenge.time >= challenge.timeLimit) this.winChallenge();
    }
  }

  private failChallenge(reason: string, kind: Exclude<ChallengeFailureKind, null>): void {
    if (this.state.mode !== 'challenge') return;
    const challenge = this.state.challenge;
    challenge.resultReason = reason;
    challenge.failureKind = kind;
    challenge.failureElapsed = 0;
    challenge.speedInput = 0;
    challenge.lateralInput = 0;
    challenge.targetSpeed = 0;
    challenge.currentSpeed = 0;
    this.state.player.speed = 0;
    this.awardFailureExperience(challenge.level);
    if (challenge.level === 1) {
      this.state.impactLabel = LANGUAGE === 'en' ? 'COLLISION!' : '碰撞！';
      this.state.impactTextTime = Math.max(this.state.impactTextTime, challenge.failureDuration);
    }
    this.state.mode = 'challenge-failure';
  }

  private awardFailureExperience(level: ChallengeLevelId | null): void {
    if (!level) return;
    const challenge = this.state.challenge;
    const progress = level === 2
      ? challenge.distance / Math.max(1, challenge.finishDistance)
      : challenge.time / Math.max(1, challenge.timeLimit);
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    const levelBefore = this.state.meta.growthLevel[level];
    const xpBefore = this.state.meta.experience[level];
    const requiredBefore = getExperienceRequirement(level, levelBefore);
    const gained = getExperienceReward(level, normalizedProgress);
    let currentLevel = levelBefore;
    let currentXp = xpBefore + gained;
    while (currentXp >= getExperienceRequirement(level, currentLevel)) {
      currentXp -= getExperienceRequirement(level, currentLevel);
      currentLevel += 1;
      this.state.meta.upgradePoints[level] += 1;
    }
    this.state.meta.experience[level] = currentXp;
    this.state.meta.growthLevel[level] = currentLevel;
    challenge.failureProgress = normalizedProgress;
    challenge.experienceGained = gained;
    challenge.experienceBefore = xpBefore;
    challenge.experienceAfter = currentXp;
    challenge.experienceRequiredBefore = requiredBefore;
    challenge.experienceRequiredAfter = getExperienceRequirement(level, currentLevel);
    challenge.growthLevelBefore = levelBefore;
    challenge.growthLevelAfter = currentLevel;
  }

  private updateChallengeFailure(dt: number): void {
    const challenge = this.state.challenge;
    challenge.failureElapsed = Math.min(challenge.failureDuration, challenge.failureElapsed + dt);
    if (challenge.failureElapsed >= challenge.failureDuration) this.state.mode = 'upgrade';
  }

  private updateChallengeVictory(dt: number): void {
    const challenge = this.state.challenge;
    challenge.victoryElapsed = Math.min(challenge.victoryDuration, challenge.victoryElapsed + dt);
    if (challenge.victoryElapsed >= challenge.victoryDuration) this.state.mode = 'victory';
  }

  private winChallenge(): void {
    const level = this.state.challenge.level;
    if (this.state.mode !== 'challenge' || !level) return;
    this.state.meta.completed[level] = true;
    this.saveMeta();
    const challenge = this.state.challenge;
    challenge.victoryElapsed = 0;
    challenge.speedInput = 0;
    challenge.lateralInput = 0;
    challenge.targetSpeed = 0;
    challenge.currentSpeed = 0;
    this.state.player.speed = 0;
    this.state.mode = 'challenge-victory';
  }

  private updateWalking(dt: number): void {
    const state = this.state;
    const speed = SPEEDS[state.speedLevel];
    state.player.speed = speed.value;
    state.distance += speed.value * dt;
    state.npcs.forEach((npc) => { npc.avoidanceTime = Math.max(0, npc.avoidanceTime - dt); });
    SPEEDS.forEach((definition) => {
      if (definition.id !== speed.id && !state.tasks[definition.id].complete) state.tasks[definition.id].progress = 0;
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
