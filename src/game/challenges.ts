import { LANGUAGE } from './i18n';
import { getLevelBalance } from './balance';
import type { ChallengeLevelId, ChallengeUpgradeKey, LevelId, MetaProgress } from './types';

type Localized = { zh: string; en: string };

export interface LevelDefinition {
  id: LevelId;
  title: Localized;
  subtitle: Localized;
  rule: Localized;
  objective: Localized;
  accent: string;
  upgrades: readonly ChallengeUpgradeKey[];
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: 1,
    title: { zh: '一碰就死', en: 'One Touch, You Die' },
    subtitle: { zh: '别让任何人碰到你', en: 'Do not let anyone touch you' },
    rule: { zh: '控制步速与左右移动，坚持 20 秒。任何碰撞都会立刻结束本轮。', en: 'Control your pace and sidestep for 20 seconds. Any collision ends the run.' },
    objective: { zh: '零碰撞生存 20 秒', en: 'Survive 20s with zero collisions' },
    accent: '#ff5f4d',
    upgrades: ['response', 'lateral'],
  },
  {
    id: 2,
    title: { zh: '一晚就死', en: 'One Night, You Die' },
    subtitle: { zh: '今晚必须赶到', en: 'You must make it tonight' },
    rule: { zh: '在 20 秒内跑完 360 米。碰撞会让你掉速，攻击力越高，损失越小。', en: 'Cover 360m in 20 seconds. Collisions cut your speed; power reduces the loss.' },
    objective: { zh: '20 秒内抵达 360 米', en: 'Reach 360m within 20s' },
    accent: '#f4b942',
    upgrades: ['maxSpeed', 'power'],
  },
  {
    id: 3,
    title: { zh: '一哭就死', en: 'One Cry, You Die' },
    subtitle: { zh: '慢下来，但别被击垮', en: 'Slow down without breaking down' },
    rule: { zh: '这段路正常 10 秒走完。你要走满 20 秒仍不到终点；被快人撞会消耗心情。', en: 'This road normally takes 10s. Stay on it for 20s without finishing; faster walkers drain your mood.' },
    objective: { zh: '20 秒后仍未走完 140 米', en: 'Stay short of 140m after 20s' },
    accent: '#7c72ff',
    upgrades: ['mood', 'guard'],
  },
  {
    id: 4,
    title: { zh: '走路模拟器', en: 'Walking Simulator' },
    subtitle: { zh: '李欧丁的原始实验', en: "Leo Ding's original experiment" },
    rule: { zh: '完成前三关后解锁。保留当前项目原有的五档步速观察与结尾互动。', en: 'Unlock by clearing the first three levels. The original five-pace experiment awaits.' },
    objective: { zh: '完成五档步速观察', en: 'Complete the five-pace study' },
    accent: '#55c8bd',
    upgrades: [],
  },
] as const;

const UPGRADE_COPY: Record<ChallengeUpgradeKey, { name: Localized; effect: Localized }> = {
  response: {
    name: { zh: '加快变速响应', en: 'Faster pace response' },
    effect: { zh: '速度响应 +0.9 m/s²', en: 'Pace response +0.9 m/s²' },
  },
  lateral: {
    name: { zh: '加快左右移动', en: 'Faster sidestep' },
    effect: { zh: '横移速度 +0.45 m/s', en: 'Sidestep speed +0.45 m/s' },
  },
  maxSpeed: {
    name: { zh: '提高最高速度', en: 'Raise top speed' },
    effect: { zh: '最高速度 +1.6 m/s', en: 'Top speed +1.6 m/s' },
  },
  power: {
    name: { zh: '提高攻击力', en: 'Raise power' },
    effect: { zh: '每次碰撞少掉 1.4 m/s', en: 'Lose 1.4 m/s less per hit' },
  },
  mood: {
    name: { zh: '增加心情上限', en: 'Increase max mood' },
    effect: { zh: '心情上限 +14', en: 'Maximum mood +14' },
  },
  guard: {
    name: { zh: '封闭内心', en: 'Close your heart' },
    effect: { zh: '每次碰撞少掉 4 心情', en: 'Lose 4 less mood per hit' },
  },
};

export const CHALLENGE_UI = LANGUAGE === 'zh-CN' ? {
  selectKicker: 'SELECT YOUR PROBLEM', selectTitle: '今天，你想怎么死？', selectBody: '失败后可强化本关能力；退出关卡后等级重置。',
  locked: '尚未解锁', unlocked: '可以挑战', cleared: '已通关', attempt: '尝试', times: '次', clearCount: '前三关进度',
  briefingKicker: 'BEFORE YOU WALK', start: '开始这一轮', back: '返回选关', controls: 'W/S 切换持续加速或减速 · A/D 左右移动',
  run: '本轮', target: '目标', currentSpeed: '当前速度', targetSpeed: '目标速度', response: '变速响应', lateral: '横移速度',
  speedLatch: '按一下切换持续加速 / 减速',
  distance: '路程', mood: '心情', hits: '碰撞', seconds: '秒', meters: '米',
  failKicker: 'RUN OVER', failTitle: '这次没走成。', chooseUpgrade: '选一项本关强化，再试一次。',
  victoryKicker: 'LEVEL CLEAR', victoryTitle: '这一次，你走过去了。', victoryBack: '回到关卡选择',
  allUnlocked: '第四关已解锁', left: '左移', right: '右移', faster: '快一点', slower: '慢一点',
  rearWarning: '后方有人接近',
  reasons: {
    touched: '你碰到了别人。这里，一碰就死。', timeout: '夜已经过去，你还没到。', arrivedEarly: '你太快走完了这段路。', cried: '心情见底，你忍不住大哭起来。',
  },
} : {
  selectKicker: 'SELECT YOUR PROBLEM', selectTitle: 'How would you like to die today?', selectBody: 'Failures strengthen this level. Leaving it resets those upgrades.',
  locked: 'LOCKED', unlocked: 'READY', cleared: 'CLEARED', attempt: 'ATTEMPT', times: '', clearCount: 'FIRST THREE',
  briefingKicker: 'BEFORE YOU WALK', start: 'START THIS RUN', back: 'BACK TO LEVELS', controls: 'W/S latches acceleration or braking · A/D sidesteps',
  run: 'RUN', target: 'GOAL', currentSpeed: 'CURRENT', targetSpeed: 'TARGET', response: 'PACE RESPONSE', lateral: 'SIDESTEP',
  speedLatch: 'Press once to latch acceleration / braking',
  distance: 'DISTANCE', mood: 'MOOD', hits: 'HITS', seconds: 'SEC', meters: 'M',
  failKicker: 'RUN OVER', failTitle: 'That walk did not work.', chooseUpgrade: 'Choose one upgrade for this level, then try again.',
  victoryKicker: 'LEVEL CLEAR', victoryTitle: 'This time, you made it through.', victoryBack: 'BACK TO LEVEL SELECT',
  allUnlocked: 'LEVEL 04 UNLOCKED', left: 'LEFT', right: 'RIGHT', faster: 'FASTER', slower: 'SLOWER',
  rearWarning: 'FAST WALKER BEHIND',
  reasons: {
    touched: 'You touched someone. Here, one touch means death.', timeout: 'The night is over, and you are still not there.', arrivedEarly: 'You finished the road too quickly.', cried: 'Your mood hit zero. You burst into tears.',
  },
};

export function localized(value: Localized): string {
  return LANGUAGE === 'zh-CN' ? value.zh : value.en;
}

export function getLevel(id: LevelId): LevelDefinition {
  return LEVELS.find((level) => level.id === id) ?? LEVELS[0];
}

export function getUpgradeCopy(key: ChallengeUpgradeKey): { name: string; effect: string } {
  const value = UPGRADE_COPY[key];
  const level = key === 'response' || key === 'lateral' ? 1 : key === 'maxSpeed' || key === 'power' ? 2 : 3;
  const balance = getLevelBalance(level);
  const amount = key === 'response' ? balance.responseUpgrade
    : key === 'lateral' ? balance.lateralUpgrade
      : key === 'maxSpeed' ? balance.maxSpeedUpgrade
        : key === 'power' ? balance.powerReduction
          : key === 'mood' ? balance.moodUpgrade
            : balance.guardReduction;
  const unit = key === 'mood' || key === 'guard' ? '' : key === 'response' ? ' m/s²' : ' m/s';
  const prefix = key === 'power' || key === 'guard' ? '−' : '+';
  return { name: localized(value.name), effect: `${prefix}${amount}${unit}` };
}

export function getUpgradeLevel(meta: MetaProgress, level: ChallengeLevelId, key: ChallengeUpgradeKey): number {
  const upgrades = meta.upgrades[level] as Partial<Record<ChallengeUpgradeKey, number>>;
  return upgrades[key] ?? 0;
}

export function getChallengeStats(meta: MetaProgress, level: ChallengeLevelId) {
  const balance = getLevelBalance(level);
  if (level === 1) {
    return { ...balance, minSpeed: 0, response: balance.response + meta.upgrades[1].response * balance.responseUpgrade, lateral: balance.lateral + meta.upgrades[1].lateral * balance.lateralUpgrade };
  }
  if (level === 2) {
    return { ...balance, minSpeed: 0, maxSpeed: balance.maxSpeed + meta.upgrades[2].maxSpeed * balance.maxSpeedUpgrade, hitDamage: Math.max(0, balance.hitDamage - meta.upgrades[2].power * balance.powerReduction) };
  }
  return { ...balance, minSpeed: 0, maxMood: balance.maxMood + meta.upgrades[3].mood * balance.moodUpgrade, hitDamage: Math.max(0, balance.hitDamage - meta.upgrades[3].guard * balance.guardReduction) };
}
