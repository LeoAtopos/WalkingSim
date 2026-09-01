import type { ChallengeLevelId } from './types';

export interface LevelBalance {
  timeLimit: number;
  failureDuration: number;
  xpRewardMax: number;
  xpBaseRequirement: number;
  xpLinearGrowth: number;
  xpQuadraticGrowth: number;
  finishDistance: number;
  maxSpeed: number;
  response: number;
  targetAdjustRate: number;
  lateral: number;
  hitDamage: number;
  maxMood: number;
  responseUpgrade: number;
  lateralUpgrade: number;
  maxSpeedUpgrade: number;
  powerReduction: number;
  moodUpgrade: number;
  guardReduction: number;
  crowdAheadCount: number;
  crowdAheadStart: number;
  crowdAheadSpacing: number;
  crowdBehindStart: number;
  crowdBehindSpacing: number;
}

export type BalanceConfig = Record<ChallengeLevelId, LevelBalance>;

const BALANCE_STORAGE_KEY = 'walking-sim-level-balance-v1';

export const DEFAULT_BALANCE: BalanceConfig = {
  1: {
    timeLimit: 20, failureDuration: 1.8, xpRewardMax: 50, xpBaseRequirement: 18, xpLinearGrowth: 12, xpQuadraticGrowth: 3,
    finishDistance: 0, maxSpeed: 16, response: 2.2, targetAdjustRate: 7.5, lateral: 0.8,
    hitDamage: 0, maxMood: 0, responseUpgrade: 0.9, lateralUpgrade: 0.45,
    maxSpeedUpgrade: 0, powerReduction: 0, moodUpgrade: 0, guardReduction: 0,
    crowdAheadCount: 66, crowdAheadStart: 4, crowdAheadSpacing: 2.65, crowdBehindStart: 5, crowdBehindSpacing: 3.4,
  },
  2: {
    timeLimit: 20, failureDuration: 2.6, xpRewardMax: 50, xpBaseRequirement: 18, xpLinearGrowth: 12, xpQuadraticGrowth: 3,
    finishDistance: 360, maxSpeed: 12, response: 3.2, targetAdjustRate: 3.2, lateral: 0.72,
    hitDamage: 7.2, maxMood: 0, responseUpgrade: 0, lateralUpgrade: 0,
    maxSpeedUpgrade: 1.6, powerReduction: 1.4, moodUpgrade: 0, guardReduction: 0,
    crowdAheadCount: 72, crowdAheadStart: 5.5, crowdAheadSpacing: 2.9, crowdBehindStart: 12, crowdBehindSpacing: 4.4,
  },
  3: {
    timeLimit: 20, failureDuration: 3.2, xpRewardMax: 50, xpBaseRequirement: 18, xpLinearGrowth: 12, xpQuadraticGrowth: 3,
    finishDistance: 140, maxSpeed: 10, response: 2.2, targetAdjustRate: 2.2, lateral: 0.75,
    hitDamage: 18, maxMood: 45, responseUpgrade: 0, lateralUpgrade: 0,
    maxSpeedUpgrade: 0, powerReduction: 0, moodUpgrade: 14, guardReduction: 4,
    crowdAheadCount: 42, crowdAheadStart: 4.5, crowdAheadSpacing: 3.25, crowdBehindStart: 10, crowdBehindSpacing: 3.6,
  },
};

const cloneDefaults = (): BalanceConfig => structuredClone(DEFAULT_BALANCE);

function sanitize(source: unknown): BalanceConfig {
  const result = cloneDefaults();
  if (!source || typeof source !== 'object') return result;
  ([1, 2, 3] as ChallengeLevelId[]).forEach((level) => {
    const candidate = (source as Partial<BalanceConfig>)[level];
    if (!candidate || typeof candidate !== 'object') return;
    (Object.keys(result[level]) as (keyof LevelBalance)[]).forEach((key) => {
      const value = Number(candidate[key]);
      if (Number.isFinite(value)) result[level][key] = Math.max(0, Math.min(9999, value));
    });
  });
  return result;
}

function load(): BalanceConfig {
  try {
    return sanitize(JSON.parse(localStorage.getItem(BALANCE_STORAGE_KEY) ?? 'null'));
  } catch {
    return cloneDefaults();
  }
}

let currentBalance = load();

export function getBalanceConfig(): BalanceConfig {
  return structuredClone(currentBalance);
}

export function getLevelBalance(level: ChallengeLevelId): LevelBalance {
  return currentBalance[level];
}

export function getExperienceRequirement(level: ChallengeLevelId, growthLevel: number): number {
  const balance = getLevelBalance(level);
  return Math.max(1, Math.round(balance.xpBaseRequirement + growthLevel * balance.xpLinearGrowth + growthLevel * growthLevel * balance.xpQuadraticGrowth));
}

export function getExperienceReward(level: ChallengeLevelId, progress: number): number {
  const normalized = Math.max(0, Math.min(1, progress));
  return Math.round(getLevelBalance(level).xpRewardMax * Math.sqrt(normalized));
}

export function saveBalanceConfig(config: BalanceConfig): void {
  currentBalance = sanitize(config);
  try {
    localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(currentBalance));
  } catch {
    // The edited values still apply for this page session when storage is unavailable.
  }
}

export function resetBalanceConfig(): BalanceConfig {
  currentBalance = cloneDefaults();
  try {
    localStorage.removeItem(BALANCE_STORAGE_KEY);
  } catch {
    // Defaults still apply for this page session when storage is unavailable.
  }
  return getBalanceConfig();
}
