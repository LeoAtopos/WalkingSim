export type GameLanguage = 'zh-CN' | 'en';
export type LocalizedSpeedId = 'stopped' | 'slow' | 'normal' | 'brisk' | 'run';

interface SpeedCopy {
  label: string;
  shortLabel: string;
  phrases: readonly [string, string, string];
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
  share: { button: string; copied: string; failed: string };
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
    evaluationKicker: string;
    evaluationPrompt: string;
  };
  returning: { line1: string; line2: string; punchChoice: string; petChoice: string };
  interaction: {
    punchEffect: string;
    punchHint: string;
    petHint: string;
    depart: string;
    restart: string;
    feedback: {
      punch: readonly [string, string, string, string, string];
      pet: readonly [string, string, string, string, string];
    };
  };
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
    chooseEvaluation: (index: number) => string;
    share: string;
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
  intro: { line1: '这是个「比喻性」的走路模拟器。', line2: '只能调节步速。', start: '玩一下' },
  share: {
    button: '点击分享给总是发生碰撞冲突的朋友',
    copied: '已复制到剪切板',
    failed: '复制失败，请手动复制链接',
  },
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
    evaluationKicker: '完成评价',
    evaluationPrompt: '这段路感觉如何？',
  },
  returning: {
    line1: '感谢游玩体验！',
    line2: '',
    punchChoice: '不好玩',
    petChoice: '有点意思',
  },
  interaction: {
    punchEffect: '砰！',
    punchHint: '点击李欧丁，教训他！',
    petHint: '点击李欧丁，鼓励他',
    depart: '转身离开',
    restart: '重新开始',
    feedback: {
      pet: ['改变速度，就改变与他人的关系', '太着急，全世界都成了敌人', '我想慢点也会撞上别人。', '每条路的适合速度都不同', '人生就是行路啊'],
      punch: ['什么鬼游戏', '叫你说教', '给我好玩的', '何意味', '浪费时间'],
    },
  },
  departed: { kicker: 'Walking Sim / CLOSED', title: '你转身离开了。', line: '走上了自己的人生路。', restart: '再走一次' },
  collisions: { ahead: ['让一下！', '闪开！'], behind: ['干嘛撞我？', '很烦哎！'], minor: '碰了一下' },
  speeds: {
    stopped: { label: '停下来', shortLabel: '静止', phrases: ['他们到底要去哪？', '我为什么在这里？', '我是不是该换条路？'] },
    slow: { label: '慢一点', shortLabel: '慢速', phrases: ['为何人们都这么急功近利？', '这些Jerk都着什么急啊？', '这个时代太糟糕了。'] },
    normal: { label: '普通速', shortLabel: '普通', phrases: ['一路有磕碰，但也平淡。', '和大家差不多，才能少碰撞。', '和大家差不多，也会有点冲突。'] },
    brisk: { label: '快一点', shortLabel: '稍快', phrases: ['要进步真不容易！', '出现了碍事的人！', '他们就不能快点么！'] },
    run: { label: '最高速', shortLabel: '奔跑', phrases: ['为什么所有人都在阻碍我？', '全世界都在跟我作对！', '低能蠢人太多了！'] },
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
    chooseEvaluation: (index) => `点击 #evaluation-choice-${index}：选择评语`,
    share: '点击分享按钮：复制游戏链接',
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
  intro: { line1: 'This is a “metaphorical” walking simulator.', line2: 'The only thing you can control is your pace.', start: 'Give it a try' },
  share: {
    button: 'Share with a friend who keeps running into conflict',
    copied: 'Link copied to clipboard',
    failed: 'Could not copy. Please copy the link manually.',
  },
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
    evaluationKicker: 'TASK REFLECTION',
    evaluationPrompt: 'How did that stretch feel?',
  },
  returning: {
    line1: 'Thanks for playing!',
    line2: '',
    punchChoice: 'NOT FUN',
    petChoice: 'KIND OF INTERESTING',
  },
  interaction: {
    punchEffect: 'POW!',
    punchHint: 'Click Leo Ding to teach him a lesson!',
    petHint: 'Click Leo Ding to encourage him',
    depart: 'TURN AND LEAVE',
    restart: 'START OVER',
    feedback: {
      pet: ['Change your pace, and you change your relationship with others.', 'Rush too much, and the whole world becomes your enemy.', 'I tried to slow down and still ran into people.', 'Every road has a pace that suits it.', 'Life is just walking a road.'],
      punch: ['What kind of game is this?', 'Enough with the lecture!', 'Give me something fun.', 'What is this supposed to mean?', 'What a waste of time.'],
    },
  },
  departed: {
    kicker: 'Walking Sim / CLOSED',
    title: 'You turned and walked away.',
    line: 'And stepped onto your own path in life.',
    restart: 'WALK AGAIN',
  },
  collisions: { ahead: ['MAKE WAY!', 'MOVE!'], behind: ["WHY'D YOU HIT ME?", 'SO ANNOYING!'], minor: 'JUST A BUMP' },
  speeds: {
    stopped: { label: 'STOP', shortLabel: 'STILL', phrases: ['Where is everyone going?', 'Why am I here?', 'Should I take another road?'] },
    slow: { label: 'SLOWER', shortLabel: 'SLOW', phrases: ['Why is everyone so desperate for quick success?', 'What are these jerks in such a rush for?', 'This era is terrible.'] },
    normal: { label: 'NORMAL SPEED', shortLabel: 'NORMAL', phrases: ['There were bumps along the way, but it was mostly uneventful.', 'Matching everyone else means fewer collisions.', 'Even matching everyone else brings some conflict.'] },
    brisk: { label: 'FASTER', shortLabel: 'BRISK', phrases: ["Getting ahead really isn't easy!", 'Some people just got in the way!', "Can't they move any faster?!"] },
    run: { label: 'TOP SPEED', shortLabel: 'RUN', phrases: ['Why is everyone getting in my way?', 'The whole world is against me!', 'There are too many incompetent idiots!'] },
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
    chooseEvaluation: (index) => `click #evaluation-choice-${index}: choose reflection`,
    share: 'click a share button: copy game link',
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
