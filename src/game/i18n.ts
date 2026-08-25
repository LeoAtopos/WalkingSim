export type GameLanguage = 'zh-CN' | 'en';
export type LocalizedSpeedId = 'stopped' | 'slow' | 'normal' | 'brisk' | 'run';

interface SpeedCopy {
  label: string;
  shortLabel: string;
  phrase: string;
}

interface GameCopy {
  meta: { title: string; description: string };
  loading: { message: string; errorTitle: string; unknownError: string; retry: string };
  canvasLabel: string;
  characterName: string;
  audio: { title: string; sound: string; muted: string; muteAria: string; unmuteAria: string };
  aria: {
    intro: string;
    walking: string;
    returning: string;
    interaction: string;
    departed: string;
    mouseSpeed: string;
    touchSpeed: string;
  };
  intro: { line1: string; line2: string; start: string };
  exitConfirm: { ariaLabel: string; kicker: string; title: string; body: string; cancel: string; confirm: string };
  walking: {
    tasks: string;
    holdSpeed: string;
    seconds: string;
    completeKicker: string;
    completeLine1: string;
    completeLine2: string;
    clickContinue: string;
    currentSpeed: string;
    accelerate: string;
    decelerate: string;
    finish: string;
  };
  returning: { line1: string; line2: string; punchChoice: string; petChoice: string };
  interaction: { punchEffect: string; depart: string; restart: string };
  departed: { kicker: string; title: string; line: string; restart: string };
  collisions: { ahead: readonly [string, string]; behind: readonly [string, string]; minor: string };
  speeds: Record<LocalizedSpeedId, SpeedCopy>;
  debug: {
    coordinateSystem: string;
    start: string;
    dismissSpeech: string;
    waitForSpeech: (seconds: string) => string;
    accelerate: string;
    decelerate: string;
    finish: string;
    punchChoice: string;
    petChoice: string;
    interact: string;
    depart: string;
    restart: string;
    departedRestart: string;
    exitCancel: string;
    exitConfirm: string;
  };
}

const ZH: GameCopy = {
  meta: {
    title: '李欧丁的走路模拟器',
    description: '李欧丁的走路模拟器——一款关于速度、碰撞与人群的 3D Web Game。',
  },
  loading: { message: '正在铺设街道…', errorTitle: '街道没有铺成功', unknownError: '未知错误', retry: '重试' },
  canvasLabel: '李欧丁的走路模拟器 3D 游戏画面',
  characterName: '李欧丁',
  audio: { title: '切换声音（M）', sound: '声音', muted: '静音', muteAria: '静音', unmuteAria: '开启声音' },
  aria: {
    intro: '游戏开场',
    walking: '走路任务',
    returning: '游戏结束对话',
    interaction: '与李欧丁互动',
    departed: '游戏结束',
    mouseSpeed: '鼠标速度控制',
    touchSpeed: '触屏速度控制',
  },
  intro: { line1: '你来了，', line2: '来玩玩我的走路模拟器吧。', start: '玩一下' },
  exitConfirm: {
    ariaLabel: '退出走路模拟器确认',
    kicker: 'ESC / EXIT',
    title: '退出走路模拟器？',
    body: '当前行走进度会被清除，并回到最开始。',
    cancel: '继续行走',
    confirm: '退出模拟',
  },
  walking: {
    tasks: '任务',
    holdSpeed: '保持当前速度',
    seconds: '秒',
    completeKicker: 'MISSION COMPLETE',
    completeLine1: '全部任务',
    completeLine2: '已完成',
    clickContinue: '点击继续',
    currentSpeed: '当前步速',
    accelerate: '加速',
    decelerate: '减速',
    finish: '结束模拟',
  },
  returning: {
    line1: '怎么样，这游戏？',
    line2: 'get到了么？精彩么？',
    punchChoice: '不好玩',
    petChoice: '有点意思',
  },
  interaction: { punchEffect: '砰！', depart: '转身离开', restart: '重新开始' },
  departed: { kicker: 'Walking Sim / CLOSED', title: '你转身离开了。', line: '走上了自己的人生路。', restart: '再走一次' },
  collisions: { ahead: ['让一下！', '闪开！'], behind: ['干嘛撞我？', '很烦哎！'], minor: '碰了一下' },
  speeds: {
    stopped: { label: '停下来', shortLabel: '静止', phrase: '他们到底要去哪？我为什么在这里？' },
    slow: { label: '慢一点', shortLabel: '慢速', phrase: '为何大家都这么急功近利！' },
    normal: { label: '普通速', shortLabel: '普通', phrase: '一路有磕碰，但也平淡。' },
    brisk: { label: '快一点', shortLabel: '稍快', phrase: '要进步真不容易！' },
    run: { label: '最高速', shortLabel: '奔跑', phrase: '为什么所有人都在阻挡我？!' },
  },
  debug: {
    coordinateSystem: 'Three.js 世界坐标：+x 向右，-z 向前，y 向上；距离单位为米。',
    start: '点击 #start-btn',
    dismissSpeech: '点击画面任意位置：关闭对话并继续',
    waitForSpeech: (seconds) => `等待 ${seconds} 秒后继续对话`,
    accelerate: 'W/方向键上：加速',
    decelerate: 'S/方向键下：减速',
    finish: '点击 #finish-walk-btn',
    punchChoice: '点击 #choice-punch',
    petChoice: '点击 #choice-pet',
    interact: '点击李欧丁',
    depart: '点击 #depart-btn',
    restart: '点击 #restart-btn',
    departedRestart: '点击 #departed-restart',
    exitCancel: '点击 #exit-cancel：继续行走',
    exitConfirm: '点击 #exit-confirm：退出模拟',
  },
};

const EN: GameCopy = {
  meta: {
    title: "Leo Ding's Walking Simulator",
    description: "Leo Ding's 3D web game about pace, collisions, and moving with the crowd.",
  },
  loading: { message: 'Laying down the street…', errorTitle: 'The street could not be built', unknownError: 'Unknown error', retry: 'Retry' },
  canvasLabel: "Leo Ding's Walking Simulator 3D game view",
  characterName: 'Leo Ding',
  audio: { title: 'Toggle sound (M)', sound: 'Sound', muted: 'Muted', muteAria: 'Mute sound', unmuteAria: 'Turn sound on' },
  aria: {
    intro: 'Game introduction',
    walking: 'Walking tasks',
    returning: 'End-of-game dialogue',
    interaction: 'Interact with Leo Ding',
    departed: 'Game over',
    mouseSpeed: 'Mouse speed controls',
    touchSpeed: 'Touch speed controls',
  },
  intro: { line1: 'You made it.', line2: 'Come try my walking simulator.', start: 'Give it a try' },
  exitConfirm: {
    ariaLabel: 'Confirm exit from the walking simulator',
    kicker: 'ESC / EXIT',
    title: 'Exit the walking simulator?',
    body: 'Your current walking progress will be cleared, and you will return to the beginning.',
    cancel: 'KEEP WALKING',
    confirm: 'EXIT SIMULATION',
  },
  walking: {
    tasks: 'TASKS',
    holdSpeed: 'HOLD THIS PACE',
    seconds: 'SEC',
    completeKicker: 'MISSION COMPLETE',
    completeLine1: 'ALL TASKS',
    completeLine2: 'COMPLETE',
    clickContinue: 'CLICK TO CONTINUE',
    currentSpeed: 'CURRENT PACE',
    accelerate: 'SPEED UP',
    decelerate: 'SLOW DOWN',
    finish: 'END SIMULATION',
  },
  returning: {
    line1: 'Well, how was it?',
    line2: 'Did you get it? Was it exciting?',
    punchChoice: 'NOT FUN',
    petChoice: 'KIND OF INTERESTING',
  },
  interaction: { punchEffect: 'POW!', depart: 'TURN AND LEAVE', restart: 'START OVER' },
  departed: {
    kicker: 'Walking Sim / CLOSED',
    title: 'You turned and walked away.',
    line: 'And stepped onto your own path in life.',
    restart: 'WALK AGAIN',
  },
  collisions: { ahead: ['MAKE WAY!', 'MOVE!'], behind: ["WHY'D YOU HIT ME?", 'SO ANNOYING!'], minor: 'JUST A BUMP' },
  speeds: {
    stopped: { label: 'STOP', shortLabel: 'STILL', phrase: 'Where is everyone going? Why am I here?' },
    slow: { label: 'SLOWER', shortLabel: 'SLOW', phrase: 'Why is everyone so hungry for quick success?' },
    normal: { label: 'NORMAL SPEED', shortLabel: 'NORMAL', phrase: 'A few bumps along the way, but mostly uneventful.' },
    brisk: { label: 'FASTER', shortLabel: 'BRISK', phrase: "Getting ahead really isn't easy!" },
    run: { label: 'TOP SPEED', shortLabel: 'RUN', phrase: 'Why is everyone getting in my way?!' },
  },
  debug: {
    coordinateSystem: 'Three.js world coordinates: +x is right, -z is forward, y is up; distances are meters.',
    start: 'click #start-btn',
    dismissSpeech: 'click anywhere: dismiss dialogue and resume',
    waitForSpeech: (seconds) => `wait ${seconds}s for dialogue`,
    accelerate: 'W/ArrowUp: increase speed',
    decelerate: 'S/ArrowDown: decrease speed',
    finish: 'click #finish-walk-btn',
    punchChoice: 'click #choice-punch',
    petChoice: 'click #choice-pet',
    interact: 'click Leo Ding',
    depart: 'click #depart-btn',
    restart: 'click #restart-btn',
    departedRestart: 'click #departed-restart',
    exitCancel: 'click #exit-cancel: keep walking',
    exitConfirm: 'click #exit-confirm: exit simulation',
  },
};

const LANGUAGE_STORAGE_KEY = 'walking-sim-language';

function detectLanguage(): GameLanguage {
  try {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === 'zh-CN' || savedLanguage === 'en') return savedLanguage;
  } catch {
    // Browser-language detection still works when storage is unavailable.
  }
  const browserLanguage = navigator.language || navigator.languages?.[0] || 'en';
  return browserLanguage.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export const LANGUAGE = detectLanguage();
export const COPY = LANGUAGE === 'zh-CN' ? ZH : EN;

export function setLanguagePreference(language: GameLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Reload still applies browser detection when storage is unavailable.
  }
  if (language !== LANGUAGE) window.location.reload();
}

export function applyDocumentLanguage(): void {
  document.documentElement.lang = LANGUAGE;
  document.title = COPY.meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', COPY.meta.description);
}
