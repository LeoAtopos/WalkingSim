import { INTERACTION_TARGET, SPEEDS, SPEECH_CONTINUE_DELAY, TASK_DURATION, type ChallengeUpgradeKey, type FourthEndingId, type FourthPace, type FourthResponse, type GameState, type InteractionKind, type LevelId } from './types';
import { COPY, LANGUAGE, setLanguagePreference } from './i18n';
import { CHALLENGE_UI, LEVELS, getChallengeStats, getLevel, getUpgradeCopy, getUpgradeLevel, getUpgradeStatValue, hasAvailableUpgrade, isUpgradeMaxed, localized } from './challenges';
import { DEFAULT_BALANCE, getBalanceConfig, getExperienceRequirement, getFourthBalance, saveBalanceConfig, type BalanceConfig } from './balance';
import { FOURTH_ENDING_IDS, FOURTH_PACE_ORDER, FOURTH_RESPONSE_ORDER, getFourthEndingCopy, getFourthPaceCopy, getFourthResponseCopy } from './fourth';

interface UIActions {
  onStart: () => void;
  onSelectLevel: (level: LevelId) => void;
  onBeginChallenge: () => void;
  onChooseUpgrade: (key: ChallengeUpgradeKey) => void;
  onRetryChallenge: () => void;
  onReturnToLevels: () => void;
  onFinishVictory: () => void;
  onChooseFourthPace: (pace: FourthPace) => void;
  onFourthLateralInput: (value: -1 | 0 | 1) => void;
  onChooseFourthResponse: (response: FourthResponse) => void;
  onFinishFourthEnding: () => void;
  onResetProgress: () => void;
  onChallengeInput: (axis: 'speed' | 'lateral', value: -1 | 0 | 1) => void;
  onSpeedChange: (delta: number) => void;
  onDismissSpeech: () => void;
  onChooseEvaluation: (choiceIndex: number) => void;
  onFinishWalk: () => void;
  onChooseInteraction: (kind: Exclude<InteractionKind, null>) => void;
  onInteract: () => void;
  onDepart: () => void;
  onRestart: () => void;
  onExitWalking: () => void;
  onToggleAudio: () => boolean;
  isAudioMuted: () => boolean;
}

const CHECKLIST_SPEEDS = [...SPEEDS].reverse();
const SHARE_URL = 'https://leoatopos.github.io/WalkingSim/';
type BalanceEditorLevel = 1 | 2 | 3 | 4;
interface BalanceField { key: string; label: string; unit: string; step: number }
const BALANCE_FIELDS: Record<BalanceEditorLevel, readonly BalanceField[]> = {
  1: [
    { key: 'timeLimit', label: '挑战时间', unit: '秒', step: 1 }, { key: 'failureDuration', label: '失败演出时长', unit: '秒', step: 0.1 }, { key: 'victoryDuration', label: '通关演出时长', unit: '秒', step: 0.1 },
    { key: 'xpRewardMax', label: '满进度经验奖励', unit: 'XP', step: 1 }, { key: 'xpBaseRequirement', label: '首次升级需求', unit: 'XP', step: 1 },
    { key: 'xpLinearGrowth', label: '每级需求增长', unit: 'XP', step: 1 }, { key: 'xpQuadraticGrowth', label: '高等级额外增长', unit: 'XP', step: 1 },
    { key: 'maxSpeed', label: '最高速度', unit: 'm/s', step: 0.1 },
    { key: 'response', label: '初始加速度', unit: 'm/s²', step: 0.1 }, { key: 'targetAdjustRate', label: '目标速度调节率', unit: 'm/s²', step: 0.1 },
    { key: 'lateral', label: '初始横移速度', unit: 'm/s', step: 0.01 }, { key: 'responseUpgrade', label: '加速度每级提升', unit: 'm/s²', step: 0.1 },
    { key: 'lateralUpgrade', label: '横移每级提升', unit: 'm/s', step: 0.05 },
    { key: 'crowdAheadCount', label: '前方 NPC 数量', unit: '人', step: 1 }, { key: 'crowdAheadStart', label: '前方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdAheadSpacing', label: '前方纵向间距', unit: '米', step: 0.1 }, { key: 'crowdBehindStart', label: '后方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdBehindSpacing', label: '后方纵向间距', unit: '米', step: 0.1 },
  ],
  2: [
    { key: 'timeLimit', label: '限时', unit: '秒', step: 1 }, { key: 'failureDuration', label: '失败演出时长', unit: '秒', step: 0.1 }, { key: 'victoryDuration', label: '通关演出时长', unit: '秒', step: 0.1 },
    { key: 'xpRewardMax', label: '满进度经验奖励', unit: 'XP', step: 1 }, { key: 'xpBaseRequirement', label: '首次升级需求', unit: 'XP', step: 1 },
    { key: 'xpLinearGrowth', label: '每级需求增长', unit: 'XP', step: 1 }, { key: 'xpQuadraticGrowth', label: '高等级额外增长', unit: 'XP', step: 1 },
    { key: 'finishDistance', label: '终点距离', unit: '米', step: 5 },
    { key: 'maxSpeed', label: '初始最高速度', unit: 'm/s', step: 0.1 }, { key: 'response', label: '初始加速度', unit: 'm/s²', step: 0.1 },
    { key: 'targetAdjustRate', label: '目标速度调节率', unit: 'm/s²', step: 0.1 }, { key: 'lateral', label: '横移速度', unit: 'm/s', step: 0.01 },
    { key: 'hitDamage', label: '碰撞掉速', unit: 'm/s', step: 0.1 }, { key: 'maxSpeedUpgrade', label: '最高速度每级提升', unit: 'm/s', step: 0.1 },
    { key: 'powerReduction', label: '攻击力每级减免', unit: 'm/s', step: 0.1 },
    { key: 'crowdAheadCount', label: '前方 NPC 数量', unit: '人', step: 1 }, { key: 'crowdAheadStart', label: '前方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdAheadSpacing', label: '前方纵向间距', unit: '米', step: 0.1 }, { key: 'crowdBehindStart', label: '后方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdBehindSpacing', label: '后方纵向间距', unit: '米', step: 0.1 },
  ],
  3: [
    { key: 'timeLimit', label: '坚持时间', unit: '秒', step: 1 }, { key: 'failureDuration', label: '失败演出时长', unit: '秒', step: 0.1 }, { key: 'victoryDuration', label: '通关演出时长', unit: '秒', step: 0.1 },
    { key: 'xpRewardMax', label: '满进度经验奖励', unit: 'XP', step: 1 }, { key: 'xpBaseRequirement', label: '首次升级需求', unit: 'XP', step: 1 },
    { key: 'xpLinearGrowth', label: '每级需求增长', unit: 'XP', step: 1 }, { key: 'xpQuadraticGrowth', label: '高等级额外增长', unit: 'XP', step: 1 },
    { key: 'finishDistance', label: '终点距离', unit: '米', step: 5 },
    { key: 'maxSpeed', label: '最高速度', unit: 'm/s', step: 0.1 }, { key: 'response', label: '初始加速度', unit: 'm/s²', step: 0.1 },
    { key: 'targetAdjustRate', label: '目标速度调节率', unit: 'm/s²', step: 0.1 }, { key: 'lateral', label: '横移速度', unit: 'm/s', step: 0.01 },
    { key: 'maxMood', label: '初始心情', unit: '', step: 1 }, { key: 'hitDamage', label: '每次碰撞心情伤害', unit: '', step: 1 },
    { key: 'moodUpgrade', label: '心情每级提升', unit: '', step: 1 }, { key: 'guardReduction', label: '封闭内心每级减免', unit: '', step: 1 },
    { key: 'crowdAheadCount', label: '前方 NPC 数量', unit: '人', step: 1 }, { key: 'crowdAheadStart', label: '前方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdAheadSpacing', label: '前方纵向间距', unit: '米', step: 0.1 }, { key: 'crowdBehindStart', label: '后方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdBehindSpacing', label: '后方纵向间距', unit: '米', step: 0.1 },
  ],
  4: [
    { key: 'duration', label: '行走持续时间', unit: '秒', step: 0.5 },
    { key: 'fastSpeed', label: '快速选项速度', unit: 'm/s', step: 0.1 },
    { key: 'normalSpeed', label: '平速选项速度', unit: 'm/s', step: 0.1 },
    { key: 'slowSpeed', label: '慢速选项速度', unit: 'm/s', step: 0.1 },
    { key: 'lateralSpeed', label: '左右移动速度', unit: 'm/s', step: 0.1 },
    { key: 'npcMinSpeed', label: 'NPC 最低速度', unit: 'm/s', step: 0.1 },
    { key: 'npcMaxSpeed', label: 'NPC 最高速度', unit: 'm/s', step: 0.1 },
    { key: 'crowdAheadCount', label: '前方 NPC 数量', unit: '人', step: 1 },
    { key: 'crowdAheadStart', label: '前方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdAheadSpacing', label: '前方纵向间距', unit: '米', step: 0.1 },
    { key: 'crowdBehindStart', label: '后方最近距离', unit: '米', step: 0.1 },
    { key: 'crowdBehindSpacing', label: '后方纵向间距', unit: '米', step: 0.1 },
  ],
};

function formatUpgradeValue(key: ChallengeUpgradeKey, value: number): string {
  if (LANGUAGE === 'en') {
    if (key === 'response') return `${value.toFixed(1)} m/s² response`;
    if (key === 'lateral') return `${value.toFixed(2)} m/s sidestep`;
    if (key === 'maxSpeed') return `${value.toFixed(1)} m/s top speed`;
    if (key === 'power') return `${value.toFixed(1)} m/s loss per hit`;
    if (key === 'mood') return `${Math.round(value)} max mood`;
    return `${Math.round(value)} mood loss per hit`;
  }
  if (key === 'response') return `${value.toFixed(1)} m/s² 变速响应`;
  if (key === 'lateral') return `${value.toFixed(2)} m/s 横移速度`;
  if (key === 'maxSpeed') return `${value.toFixed(1)} m/s 最高速度`;
  if (key === 'power') return `${value.toFixed(1)} m/s 碰撞掉速`;
  if (key === 'mood') return `${Math.round(value)} 心情上限`;
  return `${Math.round(value)} 心情伤害/次`;
}

export class GameUI {
  private readonly root: HTMLDivElement;
  private readonly walkingHud: HTMLElement;
  private readonly levelSelectScreen: HTMLElement;
  private readonly briefingScreen: HTMLElement;
  private readonly challengeHud: HTMLElement;
  private readonly upgradeScreen: HTMLElement;
  private readonly victoryScreen: HTMLElement;
  private readonly fourthChoiceScreen: HTMLElement;
  private readonly fourthWalkHud: HTMLElement;
  private readonly fourthReflectionScreen: HTMLElement;
  private readonly fourthEndingScreen: HTMLElement;
  private readonly levelGrid: HTMLElement;
  private readonly endingGrid: HTMLElement;
  private readonly endingConnection: SVGSVGElement;
  private readonly endingConnectionPath: SVGPathElement;
  private readonly briefingContent: HTMLElement;
  private readonly upgradeChoices: HTMLElement;
  private readonly challengeImpactText: HTMLElement;
  private readonly taskPanel: HTMLElement;
  private readonly taskCompleteArt: HTMLElement;
  private readonly introScreen: HTMLElement;
  private readonly returnScreen: HTMLElement;
  private readonly interactionScreen: HTMLElement;
  private readonly departedScreen: HTMLElement;
  private readonly speechBubble: HTMLElement;
  private readonly speechText: HTMLElement;
  private readonly impactFlash: HTMLElement;
  private readonly impactText: HTMLElement;
  private readonly completionButton: HTMLButtonElement;
  private readonly cursorFollower: HTMLElement;
  private readonly cursorGlyph: HTMLElement;
  private readonly departButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;
  private readonly interactionBurst: HTMLElement;
  private readonly speedName: HTMLElement;
  private readonly speedDots: HTMLElement;
  private readonly audioToggle: HTMLButtonElement;
  private readonly audioIcon: HTMLElement;
  private readonly audioLabel: HTMLElement;
  private readonly exitConfirmation: HTMLElement;
  private readonly introDialogue: HTMLElement;
  private readonly returnDialogue: HTMLElement;
  private readonly speedConsole: HTMLElement;
  private readonly evaluationPanel: HTMLElement;
  private readonly evaluationSpeed: HTMLElement;
  private readonly evaluationChoices: HTMLElement;
  private readonly interactionBalloons: HTMLElement;
  private readonly interactionHint: HTMLElement;
  private readonly shareToast: HTMLElement;
  private readonly shareButton: HTMLButtonElement;
  private readonly balanceEditor: HTMLElement;
  private readonly balanceEditorFields: HTMLElement;
  private readonly balanceEditorStatus: HTMLElement;
  private editingBalanceLevel: BalanceEditorLevel = 1;
  private editingBalance: BalanceConfig = getBalanceConfig();
  private readonly taskElements = new Map<string, { row: HTMLElement; fill: HTMLElement; status: HTMLElement; time: HTMLElement }>();
  private lastInteractionCount = 0;
  private lastMode: GameState['mode'] | null = null;
  private interactionUnlockAt = 0;
  private speechCanContinue = false;
  private lastPendingEvaluation: GameState['pendingEvaluation'] = null;
  private shareToastTimeout = 0;
  private lastUpgradeRenderKey = '';
  private lastBriefingRenderKey = '';
  private lastExperienceAnimationKey = '';
  private lastFourthReflectionPace: FourthPace | null = null;
  private lastEndingGalleryKey = '';
  private latestEndingForConnection: FourthEndingId | null = null;

  constructor(container: HTMLElement, private readonly actions: UIActions) {
    this.root = document.createElement('div');
    this.root.id = 'game-ui';
    this.root.innerHTML = `
      <div class="grain" aria-hidden="true"></div>
      <button id="audio-toggle" class="audio-toggle" type="button" title="${COPY.audio.title}">
        <span id="audio-icon" aria-hidden="true">♪</span><b id="audio-label">${COPY.audio.sound}</b>
      </button>
      <button id="portrait-share" class="share-button portrait-share is-hidden" type="button"><span aria-hidden="true">↗</span>${COPY.share.button}</button>

      <section id="intro-screen" class="scene-ui portrait-ui is-dialogue-waiting" aria-label="${COPY.aria.intro}">
        <div class="portrait-kicker"><span>Walking Sim</span><b>01</b></div>
        <div class="language-switch" role="group" aria-label="Language / 语言">
          <button id="language-zh" class="language-option ${LANGUAGE === 'zh-CN' ? 'is-active' : ''}" type="button" aria-pressed="${LANGUAGE === 'zh-CN'}">中文</button>
          <button id="language-en" class="language-option ${LANGUAGE === 'en' ? 'is-active' : ''}" type="button" aria-pressed="${LANGUAGE === 'en'}">EN</button>
        </div>
        <div class="dialogue-card intro-dialogue">
          <div class="dialogue-speaker">${COPY.characterName}</div>
          <p>${COPY.intro.line1}<br />${COPY.intro.line2}</p>
          <button id="start-btn" class="game-button primary-button">${COPY.intro.start} <span>→</span></button>
        </div>
      </section>

      <section id="level-select-screen" class="scene-ui level-select-ui is-hidden" aria-label="${CHALLENGE_UI.selectTitle}">
        <div class="level-select-heading">
          <span class="eyebrow">${CHALLENGE_UI.selectKicker}</span>
          <h1>${CHALLENGE_UI.selectTitle}</h1>
          <div class="level-clear-count"><span>${CHALLENGE_UI.clearCount}</span><strong id="level-clear-count">0 / 3</strong></div>
          <div class="level-select-actions">
            <button id="balance-editor-open" class="balance-editor-open" type="button"><span>⚙</span> 编辑关卡数值</button>
            <button id="progress-reset-open" class="progress-reset-open" type="button"><span>↻</span> 重新开始</button>
          </div>
        </div>
        <div id="level-grid" class="level-grid"></div>
        <section id="fourth-ending-map" class="fourth-ending-map" aria-label="第四关结局图谱">
          <header>
            <div><span class="eyebrow">ENDING MAP / 09</span><h2>第四关结局</h2><p>每一种走法，都可能通向三种解释。</p></div>
            <strong><b id="ending-unlocked-count">0</b> / 9</strong>
          </header>
          <div id="ending-grid" class="ending-grid"></div>
        </section>
        <svg id="ending-connection" class="ending-connection is-hidden" aria-hidden="true"><path id="ending-connection-path"></path></svg>
      </section>

      <section id="balance-editor" class="balance-editor is-hidden" aria-label="关卡数值编辑器">
        <div class="balance-editor-card">
          <header><div><span class="eyebrow">BALANCE LAB</span><h2>关卡数值实验室</h2><p>保存后，下一轮挑战立即采用这些数值。</p></div><button id="balance-editor-close" class="balance-editor-close" type="button" aria-label="关闭">×</button></header>
          <nav id="balance-editor-tabs" class="balance-editor-tabs" aria-label="选择关卡">
            <button type="button" data-balance-level="1">01 不想碰碰</button>
            <button type="button" data-balance-level="2">02 着急赶路</button>
            <button type="button" data-balance-level="3">03 就想慢点走</button>
            <button type="button" data-balance-level="4">04 走路模拟器</button>
          </nav>
          <div id="balance-editor-fields" class="balance-editor-fields"></div>
          <footer>
            <span id="balance-editor-status" class="balance-editor-status">数值仅用于实验配置</span>
            <div><button id="balance-editor-reset" class="text-button" type="button">恢复全部默认值</button><button id="balance-editor-save" class="game-button primary-button" type="button">保存并返回 <span>→</span></button></div>
          </footer>
        </div>
      </section>

      <section id="briefing-screen" class="scene-ui briefing-ui is-hidden" aria-label="${CHALLENGE_UI.briefingKicker}">
        <div id="briefing-content" class="briefing-card"></div>
        <div class="briefing-actions">
          <button id="briefing-back" class="text-button" type="button">← ${CHALLENGE_UI.back}</button>
          <button id="begin-challenge" class="game-button primary-button" type="button">${CHALLENGE_UI.start} <span>→</span></button>
        </div>
      </section>

      <section id="challenge-hud" class="scene-ui challenge-ui is-hidden" aria-label="${CHALLENGE_UI.run}">
        <div class="challenge-objective">
          <span id="challenge-level-index">LEVEL 01</span>
          <strong id="challenge-title"></strong>
          <small id="challenge-objective"></small>
        </div>
        <div class="challenge-timer"><strong id="challenge-time">20.0</strong><span>${CHALLENGE_UI.seconds}</span></div>
        <div class="challenge-progress"><i id="challenge-progress-fill"></i></div>
        <div class="challenge-stats">
          <div><span>${CHALLENGE_UI.distance}</span><strong><b id="challenge-distance">0</b> ${CHALLENGE_UI.meters}</strong></div>
          <div><span>${CHALLENGE_UI.currentSpeed}</span><strong><b id="challenge-current-speed">0.0</b> m/s</strong></div>
          <div><span>${CHALLENGE_UI.targetSpeed}</span><strong><b id="challenge-target-speed">0.0</b> m/s</strong></div>
          <div><span>${CHALLENGE_UI.hits}</span><strong id="challenge-hits">0</strong></div>
        </div>
        <div id="mood-meter" class="mood-meter is-hidden">
          <div><span>${CHALLENGE_UI.mood}</span><strong id="mood-value">0 / 0</strong></div>
          <em><i id="mood-fill"></i></em>
        </div>
        <div id="rear-warning" class="rear-warning is-hidden">↓ ${CHALLENGE_UI.rearWarning}</div>
        <div id="challenge-speed-gear" class="challenge-speed-gear" role="group" aria-label="${LANGUAGE === 'en' ? 'Acceleration gear' : '加减速档位'}">
          <button id="challenge-accelerate" type="button" data-challenge-axis="speed" data-challenge-value="1" aria-label="${CHALLENGE_UI.faster}"><b>＋</b><span>${CHALLENGE_UI.faster}</span></button>
          <div class="challenge-gear-track" aria-live="polite"><i></i><b id="challenge-gear-state">${LANGUAGE === 'en' ? 'NEUTRAL' : '空档'}</b></div>
          <button id="challenge-brake" type="button" data-challenge-axis="speed" data-challenge-value="-1" aria-label="${CHALLENGE_UI.slower}"><b>−</b><span>${CHALLENGE_UI.slower}</span></button>
        </div>
        <div class="challenge-control-hint"><kbd>W</kbd><kbd>S</kbd> ${CHALLENGE_UI.speedLatch} · <kbd>A</kbd><kbd>D</kbd> ${CHALLENGE_UI.lateral}</div>
        <div id="challenge-touch-controls" class="challenge-touch-controls">
          <button type="button" data-challenge-axis="lateral" data-challenge-value="-1">←<span>${CHALLENGE_UI.left}</span></button>
          <button type="button" data-challenge-axis="lateral" data-challenge-value="1">→<span>${CHALLENGE_UI.right}</span></button>
        </div>
        <div id="challenge-impact-text" class="impact-text is-hidden" aria-live="polite"></div>
        <div id="challenge-failure-sequence" class="challenge-failure-sequence is-hidden" aria-live="assertive">
          <div class="failure-visual" aria-hidden="true">
            <i class="collision-ring"></i><i class="collision-ring"></i>
            <div class="broken-heart"><span>♥</span><span>♥</span></div>
            <div class="cry-tears"><i></i><i></i><i></i><i></i></div>
          </div>
          <span id="failure-sequence-kicker"></span>
          <strong id="failure-sequence-title"></strong>
          <small id="failure-sequence-detail"></small>
        </div>
        <div id="challenge-victory-sequence" class="challenge-victory-sequence is-hidden" aria-live="assertive">
          <div class="victory-sequence-mark" aria-hidden="true"><i></i><b>✓</b></div>
          <span id="victory-sequence-kicker"></span>
          <strong id="victory-sequence-title"></strong>
          <small id="victory-sequence-detail"></small>
        </div>
      </section>

      <section id="upgrade-screen" class="scene-ui run-result-ui is-hidden" aria-label="${CHALLENGE_UI.failKicker}">
        <div class="run-result-card fail-card">
          <span class="eyebrow">${CHALLENGE_UI.failKicker}</span>
          <div id="persistent-failure-feedback" class="persistent-failure-feedback">
            <b id="persistent-failure-icon" aria-hidden="true"></b>
            <div><span id="persistent-failure-kicker"></span><strong id="persistent-failure-title"></strong><small id="persistent-failure-detail"></small></div>
          </div>
          <div id="experience-settlement" class="experience-settlement">
            <div class="experience-heading"><span id="experience-level"></span><strong id="experience-gained"></strong></div>
            <div class="experience-track"><i id="experience-fill"></i></div>
            <div class="experience-caption"><span id="experience-progress-copy"></span><b id="experience-next-copy"></b></div>
          </div>
          <h2>${CHALLENGE_UI.failTitle}</h2>
          <p id="failure-reason"></p>
          <small id="upgrade-instruction">${CHALLENGE_UI.chooseUpgrade}</small>
          <div id="upgrade-choices" class="upgrade-choices"></div>
          <button id="retry-without-upgrade" class="game-button primary-button retry-without-upgrade is-hidden" type="button"></button>
          <button id="upgrade-back" class="text-button" type="button">← ${CHALLENGE_UI.back}</button>
        </div>
      </section>

      <section id="victory-screen" class="scene-ui run-result-ui is-hidden" aria-label="${CHALLENGE_UI.victoryKicker}">
        <div class="run-result-card victory-card">
          <span class="eyebrow">${CHALLENGE_UI.victoryKicker}</span>
          <div class="persistent-victory-feedback"><b aria-hidden="true">✓</b><div><span id="persistent-victory-kicker"></span><strong id="persistent-victory-title"></strong><small id="persistent-victory-detail"></small></div></div>
          <h2>${CHALLENGE_UI.victoryTitle}</h2>
          <p id="victory-summary"></p>
          <div id="unlock-notice" class="unlock-notice is-hidden">✦ ${CHALLENGE_UI.allUnlocked}</div>
          <button id="victory-back" class="game-button primary-button" type="button">${CHALLENGE_UI.victoryBack} <span>→</span></button>
        </div>
      </section>

      <section id="fourth-choice-screen" class="scene-ui fourth-overlay fourth-choice-ui is-hidden" aria-label="选择第四关步速">
        <div class="fourth-panel fourth-choice-panel">
          <span class="eyebrow">LEVEL 04 / CHOOSE YOUR PACE</span>
          <h2>这一次，你想怎么走？</h2>
          <p>选择一种步速，在人群里走完 <b id="fourth-choice-duration">10</b> 秒。途中只能左右移动。</p>
          <div id="fourth-pace-choices" class="fourth-pace-choices">
            ${FOURTH_PACE_ORDER.map((pace, index) => {
              const copy = getFourthPaceCopy(pace);
              return `<button type="button" data-fourth-pace="${pace}" class="is-${pace}"><span>0${index + 1}</span><strong>${copy.choice}</strong><small>${copy.description}</small><b class="fourth-pace-value"></b><i>→</i></button>`;
            }).join('')}
          </div>
          <button id="fourth-choice-back" class="text-button" type="button">← 返回选关</button>
        </div>
      </section>

      <section id="fourth-walk-hud" class="scene-ui fourth-walk-ui is-hidden" aria-label="第四关行走">
        <div class="fourth-walk-objective"><span>LEVEL 04</span><strong id="fourth-walk-pace"></strong><small>只需左右移动，走完这一段路</small></div>
        <div class="fourth-walk-timer"><strong id="fourth-walk-time">10.0</strong><span>秒</span></div>
        <div class="fourth-walk-progress"><i id="fourth-walk-progress-fill"></i></div>
        <div class="fourth-walk-stats">
          <div><span>速度</span><strong><b id="fourth-walk-speed">0.0</b> m/s</strong></div>
          <div><span>碰撞</span><strong><b id="fourth-walk-hits">0</b> 次</strong></div>
        </div>
        <div class="fourth-control-hint"><kbd>A</kbd><kbd>D</kbd> 左右移动</div>
        <div id="fourth-touch-controls" class="fourth-touch-controls">
          <button type="button" data-fourth-lateral="-1">←<span>左移</span></button>
          <button type="button" data-fourth-lateral="1">→<span>右移</span></button>
        </div>
        <div id="fourth-impact-text" class="impact-text is-hidden" aria-live="polite"></div>
      </section>

      <section id="fourth-reflection-screen" class="scene-ui fourth-overlay fourth-reflection-ui is-hidden" aria-label="选择你如何理解这段路">
        <div class="fourth-panel fourth-reflection-panel">
          <span class="eyebrow">TEN SECONDS LATER</span>
          <div class="fourth-reflection-summary"><b id="fourth-reflection-pace"></b><span id="fourth-reflection-stats"></span></div>
          <h2 id="fourth-reflection-text"></h2>
          <p>你准备怎样解释刚才发生的一切？</p>
          <div id="fourth-response-choices" class="fourth-response-choices"></div>
          <button id="fourth-reflection-back" class="text-button" type="button">← 放弃本次，返回选关</button>
        </div>
      </section>

      <section id="fourth-ending-screen" class="scene-ui fourth-overlay fourth-ending-ui is-hidden" aria-label="第四关结局">
        <div id="fourth-ending-panel" class="fourth-panel fourth-ending-panel">
          <span class="eyebrow">ENDING UNLOCKED</span>
          <div id="fourth-ending-mark" class="fourth-ending-mark" aria-hidden="true"></div>
          <h2 id="fourth-ending-title"></h2>
          <p id="fourth-ending-body"></p>
          <div class="fourth-ending-route"><span id="fourth-ending-pace"></span><i>→</i><strong id="fourth-ending-response"></strong></div>
          <div class="fourth-ending-actions">
            <button id="fourth-ending-finish" class="game-button primary-button" type="button">查看结局图谱 <span>→</span></button>
          </div>
        </div>
      </section>

      <section id="walking-hud" class="scene-ui walking-ui is-hidden" aria-label="${COPY.aria.walking}">
        <aside id="task-panel" class="task-panel">
          <div class="task-heading">
            <span class="eyebrow">${COPY.walking.tasks}</span>
            <strong id="task-total">0 / 5</strong>
          </div>
          <div id="task-list" class="task-list"></div>
          <div class="task-footnote"><span>${COPY.walking.holdSpeed}</span><b>${TASK_DURATION} ${COPY.walking.seconds}</b></div>
        </aside>
        <div id="task-complete-art" class="task-complete-art is-hidden" aria-live="polite">
          <span>${COPY.walking.completeKicker}</span>
          <strong>${COPY.walking.completeLine1}<br />${COPY.walking.completeLine2}</strong>
          <i aria-hidden="true">✓</i>
        </div>

        <button id="player-speech" class="player-speech is-hidden" type="button" aria-live="polite">
          <span class="speech-pause-label">${COPY.walking.clickContinue}</span>
          <span id="player-speech-text"></span>
        </button>
        <div id="impact-text" class="impact-text is-hidden">${COPY.collisions.minor}</div>

        <div id="task-evaluation" class="task-evaluation is-hidden" role="dialog" aria-modal="true">
          <div class="task-evaluation-card">
            <div class="task-evaluation-heading"><span>${COPY.walking.evaluationKicker}</span><b id="evaluation-speed"></b></div>
            <h2>${COPY.walking.evaluationPrompt}</h2>
            <div id="evaluation-choices" class="evaluation-choices"></div>
          </div>
        </div>

        <div class="speed-console" aria-live="polite">
          <div class="speed-console-top">
            <span>${COPY.walking.currentSpeed}</span>
            <strong id="speed-name">${SPEEDS[2].shortLabel}</strong>
          </div>
          <div id="speed-dots" class="speed-dots"></div>
          <div class="control-hint">
            <span><kbd>W</kbd><kbd>↑</kbd> ${COPY.walking.accelerate}</span>
            <span><kbd>S</kbd><kbd>↓</kbd> ${COPY.walking.decelerate}</span>
          </div>
          <div class="desktop-speed-controls" aria-label="${COPY.aria.mouseSpeed}">
            <button id="mouse-slow" class="speed-step-button" type="button"><b>−</b><span>${COPY.walking.decelerate}</span></button>
            <button id="mouse-fast" class="speed-step-button" type="button"><span>${COPY.walking.accelerate}</span><b>＋</b></button>
          </div>
        </div>

        <div class="mobile-speed-controls" aria-label="${COPY.aria.touchSpeed}">
          <button id="mobile-slow" class="speed-step-button" aria-label="${COPY.walking.decelerate}">−</button>
          <button id="mobile-fast" class="speed-step-button" aria-label="${COPY.walking.accelerate}">＋</button>
        </div>

        <button id="finish-walk-btn" class="game-button finish-button is-hidden">${COPY.walking.finish} <span>↗</span></button>
      </section>

      <section id="return-screen" class="scene-ui portrait-ui is-hidden" aria-label="${COPY.aria.returning}">
        <div class="portrait-kicker"><span>Walking Sim</span><b>END?</b></div>
        <div class="dialogue-card return-dialogue">
          <div class="dialogue-speaker">${COPY.characterName}</div>
          <p>${COPY.returning.line1}${COPY.returning.line2 ? `<br />${COPY.returning.line2}` : ''}</p>
          <div class="choice-row">
            <button id="choice-punch" class="game-button choice-button bad-choice">${COPY.returning.punchChoice}</button>
            <button id="choice-pet" class="game-button choice-button good-choice">${COPY.returning.petChoice}</button>
          </div>
        </div>
      </section>

      <section id="interaction-screen" class="scene-ui interaction-ui is-hidden" aria-label="${COPY.aria.interaction}">
        <div id="interaction-hint" class="interaction-hint" aria-live="polite"></div>
        <div id="interaction-burst" class="interaction-burst is-hidden">${COPY.interaction.punchEffect}</div>
        <div id="interaction-balloons" class="interaction-balloons" aria-live="polite"></div>
        <div class="interaction-actions">
          <button id="depart-btn" class="text-button is-hidden">${COPY.interaction.depart}</button>
          <button id="restart-btn" class="game-button primary-button is-hidden">${COPY.interaction.restart} <span>↻</span></button>
        </div>
      </section>

      <div id="share-toast" class="share-toast is-hidden" role="status" aria-live="polite"></div>

      <section id="departed-screen" class="scene-ui departed-ui is-hidden" aria-label="${COPY.aria.departed}">
        <div class="departed-card">
          <span class="eyebrow">${COPY.departed.kicker}</span>
          <h2>${COPY.departed.title}</h2>
          <p>${COPY.departed.line}</p>
          <button id="departed-restart" class="game-button primary-button">${COPY.departed.restart} <span>↻</span></button>
        </div>
      </section>

      <div id="exit-confirmation" class="exit-confirmation is-hidden" role="dialog" aria-modal="true" aria-label="${COPY.exitConfirm.ariaLabel}">
        <div class="exit-confirmation-card">
          <span class="eyebrow">${COPY.exitConfirm.kicker}</span>
          <h2>${COPY.exitConfirm.title}</h2>
          <p>${COPY.exitConfirm.body}</p>
          <div class="exit-confirmation-actions">
            <button id="exit-cancel" class="game-button exit-cancel-button" type="button">${COPY.exitConfirm.cancel}</button>
            <button id="exit-confirm" class="game-button exit-confirm-button" type="button">${COPY.exitConfirm.confirm} <span>↗</span></button>
          </div>
        </div>
      </div>

      <div id="progress-reset-confirmation" class="progress-reset-confirmation is-hidden" role="dialog" aria-modal="true" aria-label="重新开始游戏">
        <div class="progress-reset-card">
          <span class="eyebrow">START OVER</span>
          <h2>重新开始游戏？</h2>
          <p>将清除前三关通关记录、经验与强化，以及第四关已发现的结局。</p>
          <strong>编辑关卡数值会保留，不会被清除。</strong>
          <div class="progress-reset-actions">
            <button id="progress-reset-cancel" class="game-button exit-cancel-button" type="button">取消</button>
            <button id="progress-reset-confirm" class="game-button progress-reset-confirm-button" type="button">清除进度并重新开始 <span>↻</span></button>
          </div>
        </div>
      </div>

      <div id="impact-flash" class="impact-flash is-hidden" aria-hidden="true"></div>
      <div id="cursor-follower" class="cursor-follower is-hidden" aria-hidden="true"><span id="cursor-glyph" class="cursor-glyph">✊</span></div>
    `;
    container.append(this.root);

    this.walkingHud = this.getElement('walking-hud');
    this.levelSelectScreen = this.getElement('level-select-screen');
    this.briefingScreen = this.getElement('briefing-screen');
    this.challengeHud = this.getElement('challenge-hud');
    this.upgradeScreen = this.getElement('upgrade-screen');
    this.victoryScreen = this.getElement('victory-screen');
    this.fourthChoiceScreen = this.getElement('fourth-choice-screen');
    this.fourthWalkHud = this.getElement('fourth-walk-hud');
    this.fourthReflectionScreen = this.getElement('fourth-reflection-screen');
    this.fourthEndingScreen = this.getElement('fourth-ending-screen');
    this.levelGrid = this.getElement('level-grid');
    this.endingGrid = this.getElement('ending-grid');
    this.endingConnection = this.root.querySelector<SVGSVGElement>('#ending-connection') as SVGSVGElement;
    this.endingConnectionPath = this.root.querySelector<SVGPathElement>('#ending-connection-path') as SVGPathElement;
    this.briefingContent = this.getElement('briefing-content');
    this.upgradeChoices = this.getElement('upgrade-choices');
    this.challengeImpactText = this.getElement('challenge-impact-text');
    this.taskPanel = this.getElement('task-panel');
    this.taskCompleteArt = this.getElement('task-complete-art');
    this.introScreen = this.getElement('intro-screen');
    this.returnScreen = this.getElement('return-screen');
    this.interactionScreen = this.getElement('interaction-screen');
    this.departedScreen = this.getElement('departed-screen');
    this.speechBubble = this.getElement('player-speech');
    this.speechText = this.getElement('player-speech-text');
    this.impactFlash = this.getElement('impact-flash');
    this.impactText = this.getElement('impact-text');
    this.completionButton = this.getElement('finish-walk-btn') as HTMLButtonElement;
    this.cursorFollower = this.getElement('cursor-follower');
    this.cursorGlyph = this.getElement('cursor-glyph');
    this.departButton = this.getElement('depart-btn') as HTMLButtonElement;
    this.restartButton = this.getElement('restart-btn') as HTMLButtonElement;
    this.interactionBurst = this.getElement('interaction-burst');
    this.speedName = this.getElement('speed-name');
    this.speedDots = this.getElement('speed-dots');
    this.audioToggle = this.getElement('audio-toggle') as HTMLButtonElement;
    this.audioIcon = this.getElement('audio-icon');
    this.audioLabel = this.getElement('audio-label');
    this.exitConfirmation = this.getElement('exit-confirmation');
    this.introDialogue = this.root.querySelector<HTMLElement>('.intro-dialogue') as HTMLElement;
    this.returnDialogue = this.root.querySelector<HTMLElement>('.return-dialogue') as HTMLElement;
    this.speedConsole = this.root.querySelector<HTMLElement>('.speed-console') as HTMLElement;
    this.evaluationPanel = this.getElement('task-evaluation');
    this.evaluationSpeed = this.getElement('evaluation-speed');
    this.evaluationChoices = this.getElement('evaluation-choices');
    this.interactionBalloons = this.getElement('interaction-balloons');
    this.interactionHint = this.getElement('interaction-hint');
    this.shareToast = this.getElement('share-toast');
    this.shareButton = this.getElement('portrait-share') as HTMLButtonElement;
    this.balanceEditor = this.getElement('balance-editor');
    this.balanceEditorFields = this.getElement('balance-editor-fields');
    this.balanceEditorStatus = this.getElement('balance-editor-status');

    this.createLevelCards();
    this.createEndingCards();
    this.createTaskRows();
    this.createSpeedDots();
    this.bindEvents();
    this.setAudioMuted(this.actions.isAudioMuted());
  }

  private getElement(id: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (!element) throw new Error(`Missing UI element #${id}`);
    return element;
  }

  private createLevelCards(): void {
    LEVELS.forEach((level) => {
      const card = document.createElement('button');
      card.id = `level-card-${level.id}`;
      card.className = `level-card level-card-${level.id}`;
      card.type = 'button';
      card.dataset.level = String(level.id);
      card.style.setProperty('--level-accent', level.accent);
      card.innerHTML = `
        <span class="level-number">0${level.id}</span>
        <span class="level-state"></span>
        <strong>${localized(level.title)}</strong>
        <em>${localized(level.subtitle)}</em>
        <p>${localized(level.rule)}</p>
        <div class="level-card-meta"><span class="level-objective"></span><b>→</b></div>
      `;
      this.levelGrid.append(card);
    });
  }

  private createEndingCards(): void {
    FOURTH_ENDING_IDS.forEach((endingId, index) => {
      const copy = getFourthEndingCopy(endingId);
      const card = document.createElement('article');
      card.id = `ending-card-${endingId}`;
      card.className = `ending-card is-locked is-${copy.response}`;
      card.dataset.ending = endingId;
      card.innerHTML = `
        <span class="ending-slot">ENDING ${String(index + 1).padStart(2, '0')}</span>
        <div class="ending-locked-content" aria-label="${LANGUAGE === 'en' ? 'Hidden ending' : '隐藏结局'}"><b>?</b><small>${LANGUAGE === 'en' ? 'NOT DISCOVERED' : '尚未发现'}</small></div>
        <div class="ending-revealed-content">
          <em>${copy.responseCopy.label}</em>
          <strong>${copy.responseCopy.endingTitle}</strong>
          <small>${copy.paceCopy.short} · ${copy.responseCopy.label}</small>
        </div>
      `;
      this.endingGrid.append(card);
    });
  }

  private createTaskRows(): void {
    const list = this.getElement('task-list');
    CHECKLIST_SPEEDS.forEach((speed, index) => {
      const row = document.createElement('div');
      row.className = 'task-row';
      row.dataset.task = speed.id;
      row.innerHTML = `
        <span class="task-index">0${index + 1}</span>
        <span class="task-check" aria-hidden="true">✓</span>
        <span class="task-copy"><b>${speed.label}</b><small><em>0</em> / ${TASK_DURATION} ${COPY.walking.seconds}</small></span>
        <span class="task-progress"><i></i></span>
      `;
      list.append(row);
      this.taskElements.set(speed.id, {
        row,
        fill: row.querySelector('.task-progress i') as HTMLElement,
        status: row.querySelector('.task-check') as HTMLElement,
        time: row.querySelector('.task-copy em') as HTMLElement,
      });
    });
  }

  private createSpeedDots(): void {
    SPEEDS.forEach((speed, index) => {
      const dot = document.createElement('span');
      dot.dataset.index = String(index);
      dot.title = speed.label;
      this.speedDots.append(dot);
    });
  }

  private bindEvents(): void {
    this.getElement('start-btn').addEventListener('click', this.actions.onStart);
    this.getElement('balance-editor-open').addEventListener('click', () => this.openBalanceEditor());
    this.getElement('progress-reset-open').addEventListener('click', () => {
      this.getElement('progress-reset-confirmation').classList.remove('is-hidden');
      requestAnimationFrame(() => (this.getElement('progress-reset-cancel') as HTMLButtonElement).focus());
    });
    this.getElement('progress-reset-cancel').addEventListener('click', () => this.getElement('progress-reset-confirmation').classList.add('is-hidden'));
    this.getElement('progress-reset-confirm').addEventListener('click', () => {
      this.getElement('progress-reset-confirmation').classList.add('is-hidden');
      this.actions.onResetProgress();
    });
    this.getElement('balance-editor-close').addEventListener('click', () => this.closeBalanceEditor());
    this.getElement('balance-editor-save').addEventListener('click', () => this.saveBalanceEditor());
    this.getElement('balance-editor-reset').addEventListener('click', () => {
      this.editingBalance = structuredClone(DEFAULT_BALANCE);
      this.renderBalanceEditor();
      this.balanceEditorStatus.textContent = '已载入默认值，点击“保存并返回”后生效';
    });
    this.getElement('balance-editor-tabs').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-balance-level]');
      if (!button) return;
      this.captureBalanceFields();
      this.editingBalanceLevel = Number(button.dataset.balanceLevel) as BalanceEditorLevel;
      this.renderBalanceEditor();
    });
    this.levelGrid.addEventListener('click', (event) => {
      const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-level]');
      if (!card || card.disabled) return;
      this.actions.onSelectLevel(Number(card.dataset.level) as LevelId);
    });
    this.getElement('begin-challenge').addEventListener('click', this.actions.onBeginChallenge);
    this.getElement('briefing-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('upgrade-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('retry-without-upgrade').addEventListener('click', this.actions.onRetryChallenge);
    this.getElement('victory-back').addEventListener('click', this.actions.onFinishVictory);
    this.getElement('fourth-pace-choices').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-fourth-pace]');
      if (button?.dataset.fourthPace) this.actions.onChooseFourthPace(button.dataset.fourthPace as FourthPace);
    });
    this.getElement('fourth-response-choices').addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-fourth-response]');
      if (button?.dataset.fourthResponse) this.actions.onChooseFourthResponse(button.dataset.fourthResponse as FourthResponse);
    });
    this.getElement('fourth-choice-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('fourth-reflection-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('fourth-ending-finish').addEventListener('click', this.actions.onFinishFourthEnding);
    this.root.querySelectorAll<HTMLButtonElement>('[data-fourth-lateral]').forEach((button) => {
      const value = Number(button.dataset.fourthLateral) as -1 | 1;
      const start = (event: PointerEvent) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        this.actions.onFourthLateralInput(value);
      };
      const stop = () => this.actions.onFourthLateralInput(0);
      button.addEventListener('pointerdown', start);
      button.addEventListener('pointerup', stop);
      button.addEventListener('pointercancel', stop);
      button.addEventListener('lostpointercapture', stop);
    });
    this.upgradeChoices.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-upgrade]');
      if (button?.dataset.upgrade) this.actions.onChooseUpgrade(button.dataset.upgrade as ChallengeUpgradeKey);
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-challenge-axis]').forEach((button) => {
      const axis = button.dataset.challengeAxis as 'speed' | 'lateral';
      const value = Number(button.dataset.challengeValue) as -1 | 1;
      const start = (event: PointerEvent) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        this.actions.onChallengeInput(axis, value);
      };
      const stop = () => {
        if (axis === 'lateral') this.actions.onChallengeInput(axis, 0);
      };
      button.addEventListener('pointerdown', start);
      button.addEventListener('pointerup', stop);
      button.addEventListener('pointercancel', stop);
      button.addEventListener('lostpointercapture', stop);
    });
    this.getElement('language-zh').addEventListener('click', () => setLanguagePreference('zh-CN'));
    this.getElement('language-en').addEventListener('click', () => setLanguagePreference('en'));
    this.shareButton.addEventListener('click', () => void this.copyShareLink());
    this.getElement('mobile-fast').addEventListener('click', () => this.actions.onSpeedChange(1));
    this.getElement('mobile-slow').addEventListener('click', () => this.actions.onSpeedChange(-1));
    this.getElement('mouse-fast').addEventListener('click', () => this.actions.onSpeedChange(1));
    this.getElement('mouse-slow').addEventListener('click', () => this.actions.onSpeedChange(-1));
    this.evaluationChoices.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-evaluation-choice]');
      if (!button) return;
      this.actions.onChooseEvaluation(Number(button.dataset.evaluationChoice));
    });
    this.completionButton.addEventListener('click', this.actions.onFinishWalk);
    this.getElement('choice-punch').addEventListener('click', () => this.actions.onChooseInteraction('punch'));
    this.getElement('choice-pet').addEventListener('click', () => this.actions.onChooseInteraction('pet'));
    this.departButton.addEventListener('click', this.actions.onDepart);
    this.restartButton.addEventListener('click', this.actions.onRestart);
    this.getElement('departed-restart').addEventListener('click', this.actions.onRestart);
    this.audioToggle.addEventListener('click', () => this.setAudioMuted(this.actions.onToggleAudio()));
    this.getElement('exit-cancel').addEventListener('click', () => this.setExitConfirmation(false));
    this.getElement('exit-confirm').addEventListener('click', () => {
      this.setExitConfirmation(false);
      this.actions.onExitWalking();
    });

    window.addEventListener('pointermove', (event) => {
      this.cursorFollower.style.left = `${event.clientX}px`;
      this.cursorFollower.style.top = `${event.clientY}px`;
    });
    window.addEventListener('pointerdown', (event) => {
      if (this.isExitConfirmationOpen()) return;
      if ((event.target as HTMLElement).closest('#audio-toggle')) return;
      if (this.lastMode === 'walking' && this.speechCanContinue) {
        event.preventDefault();
        this.actions.onDismissSpeech();
        return;
      }
      if (!this.root.classList.contains('is-interacting')) return;
      if ((event.target as HTMLElement).closest('button')) return;
      if (performance.now() < this.interactionUnlockAt) return;
      this.actions.onInteract();
    });
    window.addEventListener('resize', () => this.updateEndingConnection());
    this.levelSelectScreen.addEventListener('scroll', () => this.updateEndingConnection(), { passive: true });
  }

  private openBalanceEditor(): void {
    this.editingBalance = getBalanceConfig();
    this.editingBalanceLevel = 1;
    this.balanceEditorStatus.textContent = '数值仅用于实验配置';
    this.renderBalanceEditor();
    this.balanceEditor.classList.remove('is-hidden');
  }

  private closeBalanceEditor(): void {
    this.balanceEditor.classList.add('is-hidden');
  }

  private captureBalanceFields(): void {
    this.balanceEditorFields.querySelectorAll<HTMLInputElement>('input[data-balance-key]').forEach((input) => {
      const key = input.dataset.balanceKey;
      const value = Number(input.value);
      if (!key || !Number.isFinite(value)) return;
      const values = this.editingBalance[this.editingBalanceLevel] as unknown as Record<string, number>;
      values[key] = Math.max(0, value);
    });
  }

  private renderBalanceEditor(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-balance-level]').forEach((button) => {
      button.classList.toggle('is-active', Number(button.dataset.balanceLevel) === this.editingBalanceLevel);
    });
    const level = this.editingBalanceLevel;
    const values = this.editingBalance[level] as unknown as Record<string, number>;
    this.balanceEditorFields.innerHTML = BALANCE_FIELDS[level].map((field) => `
      <label class="balance-field">
        <span>${field.label}<small>${field.unit}</small></span>
        <input type="number" min="0" max="9999" step="${field.step}" value="${values[field.key]}" data-balance-key="${field.key}" />
      </label>
    `).join('');
  }

  private saveBalanceEditor(): void {
    this.captureBalanceFields();
    saveBalanceConfig(this.editingBalance);
    this.balanceEditorStatus.textContent = '已保存，下一轮挑战生效';
    window.setTimeout(() => this.closeBalanceEditor(), 260);
  }

  setAudioMuted(muted: boolean): void {
    this.audioToggle.classList.toggle('is-muted', muted);
    this.audioToggle.setAttribute('aria-pressed', String(muted));
    this.audioToggle.setAttribute('aria-label', muted ? COPY.audio.unmuteAria : COPY.audio.muteAria);
    this.audioIcon.textContent = muted ? '×' : '♪';
    this.audioLabel.textContent = muted ? COPY.audio.muted : COPY.audio.sound;
  }

  private async copyShareLink(): Promise<void> {
    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(SHARE_URL);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) {
      const input = document.createElement('textarea');
      input.value = SHARE_URL;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      copied = document.execCommand('copy');
      input.remove();
    }
    if (copied) {
      this.showShareToast(COPY.share.copied, false);
    } else {
      this.showShareToast(COPY.share.failed, true);
    }
  }

  private showShareToast(message: string, failed: boolean): void {
    window.clearTimeout(this.shareToastTimeout);
    this.shareToast.textContent = message;
    this.shareToast.classList.toggle('is-error', failed);
    this.shareToast.classList.remove('is-hidden', 'animate');
    void this.shareToast.offsetWidth;
    this.shareToast.classList.add('animate');
    this.shareToastTimeout = window.setTimeout(() => this.shareToast.classList.add('is-hidden'), 2400);
  }

  isExitConfirmationOpen(): boolean {
    return !this.exitConfirmation.classList.contains('is-hidden');
  }

  setExitConfirmation(open: boolean): void {
    this.exitConfirmation.classList.toggle('is-hidden', !open);
    if (open) {
      requestAnimationFrame(() => (this.getElement('exit-cancel') as HTMLButtonElement).focus());
    }
  }

  toggleExitConfirmation(): void {
    this.setExitConfirmation(!this.isExitConfirmationOpen());
  }

  update(
    state: GameState,
    playerScreen: { x: number; y: number; visible: boolean },
    portraitScreen: { x: number; y: number; visible: boolean },
    portraitReady: boolean,
  ): void {
    if (this.lastMode !== state.mode) {
      this.lastMode = state.mode;
      this.updateMode(state);
    }
    this.introScreen.classList.toggle('is-dialogue-waiting', state.mode === 'intro' && !portraitReady);
    this.returnScreen.classList.toggle('is-dialogue-waiting', state.mode === 'return' && !portraitReady);
    if ((state.mode === 'intro' || state.mode === 'return') && portraitScreen.visible) {
      this.positionNearCharacter(state.mode === 'intro' ? this.introDialogue : this.returnDialogue, portraitScreen, 'portrait');
    }
    if (['level-select', 'level-briefing', 'challenge', 'challenge-failure', 'challenge-victory', 'upgrade', 'victory'].includes(state.mode)) {
      this.updateChallengeFlow(state, playerScreen);
    }
    if (['level-four-choice', 'level-four-walk', 'level-four-reflection', 'level-four-ending'].includes(state.mode)) {
      this.updateFourthFlow(state);
    }
    if (state.mode === 'walking') this.updateWalking(state, playerScreen);
    if (state.mode === 'interaction') this.updateInteraction(state);
  }

  private updateMode(state: GameState): void {
    if (state.mode !== 'walking' && state.mode !== 'level-four-walk') this.setExitConfirmation(false);
    if (state.mode === 'intro' || state.mode === 'return') this.lastInteractionCount = 0;
    const screens: Array<[HTMLElement, boolean]> = [
      [this.introScreen, state.mode === 'intro'],
      [this.levelSelectScreen, state.mode === 'level-select'],
      [this.briefingScreen, state.mode === 'level-briefing'],
      [this.challengeHud, state.mode === 'challenge' || state.mode === 'challenge-failure' || state.mode === 'challenge-victory'],
      [this.upgradeScreen, state.mode === 'upgrade'],
      [this.victoryScreen, state.mode === 'victory'],
      [this.fourthChoiceScreen, state.mode === 'level-four-choice'],
      [this.fourthWalkHud, state.mode === 'level-four-walk'],
      [this.fourthReflectionScreen, state.mode === 'level-four-reflection'],
      [this.fourthEndingScreen, state.mode === 'level-four-ending'],
      [this.walkingHud, state.mode === 'walking'],
      [this.returnScreen, state.mode === 'return'],
      [this.interactionScreen, state.mode === 'interaction'],
      [this.departedScreen, state.mode === 'departed'],
    ];
    screens.forEach(([element, visible]) => element.classList.toggle('is-hidden', !visible));
    this.root.dataset.mode = state.mode;
    this.root.classList.toggle('is-interacting', state.mode === 'interaction');
    this.shareButton.classList.toggle('is-hidden', !['intro', 'return', 'interaction'].includes(state.mode));
    this.interactionUnlockAt = state.mode === 'interaction' ? performance.now() + 180 : 0;
    if (state.mode !== 'walking') this.speechCanContinue = false;
    this.cursorFollower.classList.toggle('is-hidden', state.mode !== 'interaction');
    document.body.classList.toggle('custom-cursor', state.mode === 'interaction');
    if (state.mode !== 'walking' && state.mode !== 'level-four-walk') {
      this.evaluationPanel.classList.add('is-hidden');
      this.lastPendingEvaluation = null;
      this.impactFlash.classList.add('is-hidden');
      this.impactText.classList.add('is-hidden');
    }
    if (state.mode !== 'interaction') this.interactionBalloons.replaceChildren();
    if (state.mode !== 'upgrade') this.lastUpgradeRenderKey = '';
    if (state.mode !== 'upgrade') this.lastExperienceAnimationKey = '';
  }

  private updateChallengeFlow(state: GameState, playerScreen: { x: number; y: number; visible: boolean }): void {
    const completedCount = ([1, 2, 3] as const).filter((level) => state.meta.completed[level]).length;
    const unlockedEndingCount = FOURTH_ENDING_IDS.filter((endingId) => state.meta.fourthEndings[endingId]).length;
    this.getElement('level-clear-count').textContent = `${completedCount} / 3`;
    this.updateEndingGallery(state);
    LEVELS.forEach((level) => {
      const card = this.getElement(`level-card-${level.id}`) as HTMLButtonElement;
      const locked = level.id === 4 && completedCount < 3;
      const cleared = level.id !== 4 && state.meta.completed[level.id];
      card.disabled = locked;
      card.classList.toggle('is-locked', locked);
      card.classList.toggle('is-cleared', cleared);
      (card.querySelector('.level-state') as HTMLElement).textContent = locked
        ? `${CHALLENGE_UI.locked} · ${completedCount}/3`
        : level.id === 4 && unlockedEndingCount > 0
          ? `${unlockedEndingCount} / 9 ${LANGUAGE === 'en' ? 'ENDINGS' : '结局'}`
          : cleared ? CHALLENGE_UI.cleared : CHALLENGE_UI.unlocked;
      (card.querySelector('.level-objective') as HTMLElement).textContent = level.id === 4
        ? (LANGUAGE === 'en' ? `${unlockedEndingCount} / 9 endings discovered` : `已发现 ${unlockedEndingCount} / 9 个结局`)
        : '';
      if (level.id !== 4) {
        (card.querySelector(':scope > p') as HTMLElement).textContent = this.dynamicRule(level.id, getChallengeStats(state.meta, level.id));
      } else {
        const fourth = getFourthBalance();
        (card.querySelector(':scope > p') as HTMLElement).textContent = LANGUAGE === 'en'
          ? `Choose a fixed pace, sidestep through the crowd for ${fourth.duration}s, then decide how to understand the walk.`
          : `选择一种固定步速，在人群中左右移动 ${fourth.duration} 秒，再决定如何理解这段路。`;
      }
    });

    const level = state.challenge.level;
    if (!level) return;
    const definition = getLevel(level);
    const challenge = state.challenge;
    const stats = getChallengeStats(state.meta, level);
    const lastUpgrade = challenge.lastUpgrade ? getUpgradeCopy(challenge.lastUpgrade) : null;
    const statLines = level === 1
      ? [[CHALLENGE_UI.response, `${stats.response.toFixed(1)} m/s²`, state.meta.upgrades[1].response], [CHALLENGE_UI.lateral, `${stats.lateral.toFixed(2)} m/s`, state.meta.upgrades[1].lateral]]
      : level === 2
      ? [[CHALLENGE_UI.currentSpeed, `${stats.maxSpeed.toFixed(2)} m/s MAX`, state.meta.upgrades[2].maxSpeed], [getUpgradeCopy('power').name, `−${stats.hitDamage.toFixed(1)} m/s / HIT`, state.meta.upgrades[2].power]]
      : [[CHALLENGE_UI.mood, `${stats.maxMood}`, state.meta.upgrades[3].mood], [getUpgradeCopy('guard').name, `−${stats.hitDamage.toFixed(0)} / HIT`, state.meta.upgrades[3].guard]];
    const dynamicGoal = this.dynamicGoal(level, stats);
    const dynamicRule = this.dynamicRule(level, stats);
    const growthLevel = state.meta.growthLevel[level];
    const growthXp = state.meta.experience[level];
    const growthRequired = getExperienceRequirement(level, growthLevel);
    const briefingRenderKey = `${level}:${dynamicGoal}:${dynamicRule}:${statLines.flat().join(':')}:${challenge.lastUpgrade ?? ''}:${growthLevel}:${growthXp}`;
    if (this.lastBriefingRenderKey !== briefingRenderKey) {
      this.lastBriefingRenderKey = briefingRenderKey;
      this.briefingContent.style.setProperty('--level-accent', definition.accent);
      this.briefingContent.innerHTML = `
        <span class="eyebrow">${CHALLENGE_UI.briefingKicker} / 0${level}</span>
        <h2>${localized(definition.title)}</h2>
        <p>${dynamicRule}</p>
        <div class="briefing-goal"><span>${CHALLENGE_UI.target}</span><strong>${dynamicGoal}</strong></div>
        <div class="briefing-growth"><span>${LANGUAGE === 'en' ? 'RUN GROWTH' : '本关成长'} · LV.${growthLevel}</span><strong>${growthXp} / ${growthRequired} XP</strong></div>
        <div class="briefing-stats">${statLines.map(([label, value, statLevel]) => `<div><span>${label}<em>LV.${statLevel}</em></span><strong>${value}</strong></div>`).join('')}</div>
        ${lastUpgrade ? `<div class="last-upgrade">↑ ${lastUpgrade.name} · ${lastUpgrade.effect}</div>` : ''}
        <small>${CHALLENGE_UI.controls}</small>
      `;
    }

    this.getElement('failure-reason').textContent = challenge.resultReason;
    const canUpgrade = state.meta.upgradePoints[level] > 0 && hasAvailableUpgrade(state.meta, level);
    const availableUpgradePoints = state.meta.upgradePoints[level];
    const upgradeRenderKey = `${level}:${definition.upgrades.map((key) => getUpgradeLevel(state.meta, level, key)).join(':')}:${canUpgrade}:${availableUpgradePoints}`;
    if (state.mode === 'upgrade' && this.lastUpgradeRenderKey !== upgradeRenderKey) {
      this.lastUpgradeRenderKey = upgradeRenderKey;
      this.upgradeChoices.replaceChildren(...definition.upgrades.map((key) => {
        const copy = getUpgradeCopy(key);
        const currentLevel = getUpgradeLevel(state.meta, level, key);
        const currentValue = getUpgradeStatValue(state.meta, level, key);
        const nextValue = getUpgradeStatValue(state.meta, level, key, 1);
        const maxed = isUpgradeMaxed(state.meta, level, key);
        const button = document.createElement('button');
        button.type = 'button';
        button.id = `upgrade-${key}`;
        button.dataset.upgrade = key;
        button.disabled = maxed;
        button.classList.toggle('is-maxed', maxed);
        button.innerHTML = `
          <span>${maxed ? 'LV.MAX' : `LV.${currentLevel} → LV.${currentLevel + 1}`}</span>
          <strong>${copy.name}</strong>
          <small><em>${formatUpgradeValue(key, currentValue)}</em><i>${maxed ? '·' : '→'}</i><em>${maxed ? (LANGUAGE === 'en' ? 'MINIMUM' : '最低值') : formatUpgradeValue(key, nextValue)}</em></small>
          <b>${maxed ? 'MAX' : '＋'}</b>
        `;
        return button;
      }));
    }
    this.upgradeChoices.classList.toggle('is-hidden', state.mode === 'upgrade' && !canUpgrade);
    const retryWithoutUpgrade = this.getElement('retry-without-upgrade') as HTMLButtonElement;
    retryWithoutUpgrade.classList.toggle('is-hidden', state.mode !== 'upgrade' || canUpgrade);
    retryWithoutUpgrade.textContent = LANGUAGE === 'en' ? 'TRY AGAIN TO EARN MORE XP →' : '再试一次，继续积累经验 →';
    this.getElement('upgrade-instruction').textContent = canUpgrade
      ? (LANGUAGE === 'en'
          ? `LEVEL UP! ${availableUpgradePoints} upgrade point${availableUpgradePoints === 1 ? '' : 's'} remaining.`
          : `成长等级提升！本次还可强化 ${availableUpgradePoints} 次。`)
      : (LANGUAGE === 'en' ? 'Not enough XP to level up. Try again and keep building it.' : '经验尚未满级，本轮不能强化；再试一次继续积累。');

    const leveledUp = challenge.growthLevelAfter > challenge.growthLevelBefore;
    const experienceSettlement = this.getElement('experience-settlement');
    experienceSettlement.classList.toggle('is-level-up', leveledUp);
    this.getElement('experience-level').textContent = leveledUp
      ? `${LANGUAGE === 'en' ? 'LEVEL UP' : '升级'} · LV.${challenge.growthLevelBefore} → LV.${challenge.growthLevelAfter}`
      : `${LANGUAGE === 'en' ? 'RUN GROWTH' : '本关成长'} · LV.${challenge.growthLevelAfter}`;
    this.getElement('experience-gained').textContent = `+${challenge.experienceGained} XP`;
    this.getElement('experience-progress-copy').textContent = `${LANGUAGE === 'en' ? 'RUN PROGRESS' : '本轮进度'} ${Math.round(challenge.failureProgress * 100)}%`;
    this.getElement('experience-next-copy').textContent = `${challenge.experienceAfter} / ${challenge.experienceRequiredAfter} XP`;
    const experienceFill = this.getElement('experience-fill') as HTMLElement;
    const experienceStart = Math.min(100, challenge.experienceBefore / Math.max(1, challenge.experienceRequiredBefore) * 100);
    const experienceEnd = Math.min(100, challenge.experienceAfter / Math.max(1, challenge.experienceRequiredAfter) * 100);
    experienceFill.style.width = `${experienceEnd}%`;
    if (state.mode === 'upgrade') {
      const animationKey = `${level}:${state.meta.attempts[level]}:${challenge.failureKind}:${challenge.experienceBefore}:${challenge.experienceAfter}:${challenge.growthLevelAfter}`;
      if (this.lastExperienceAnimationKey !== animationKey) {
        this.lastExperienceAnimationKey = animationKey;
        experienceFill.getAnimations().forEach((animation) => animation.cancel());
        const keyframes = leveledUp
          ? [
              { width: `${experienceStart}%`, offset: 0 },
              { width: '100%', offset: 0.56 },
              { width: '0%', offset: 0.64 },
              { width: `${experienceEnd}%`, offset: 1 },
            ]
          : [{ width: `${experienceStart}%` }, { width: `${experienceEnd}%` }];
        experienceFill.animate(keyframes, {
          duration: leveledUp ? 1800 : 950,
          easing: leveledUp ? 'linear' : 'cubic-bezier(.2,.8,.2,1)',
        });
        this.getElement('experience-gained').animate(
          [{ opacity: 0, transform: 'translateY(7px) scale(.86)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
          { duration: 520, delay: 180, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
      }
    }

    const victoryKicker = LANGUAGE === 'en' ? 'CHALLENGE COMPLETE' : '挑战完成';
    const victoryTitle = level === 1
      ? (LANGUAGE === 'en' ? 'Untouched to the end!' : '零碰撞坚持到底！')
      : level === 2
        ? (LANGUAGE === 'en' ? 'You made it in time!' : '你及时抵达了！')
        : (LANGUAGE === 'en' ? 'The crowd did not break you!' : '你没有被人群击垮！');
    const victoryDetail = level === 1
      ? (LANGUAGE === 'en' ? `${challenge.timeLimit}s without a collision` : `${challenge.timeLimit} 秒内没有发生碰撞`)
      : level === 2
        ? (LANGUAGE === 'en' ? `Reached ${challenge.finishDistance}m in ${challenge.time.toFixed(1)}s` : `${challenge.time.toFixed(1)} 秒抵达 ${challenge.finishDistance} 米终点`)
        : (LANGUAGE === 'en' ? `Stayed on the road for ${challenge.timeLimit}s with ${Math.max(0, challenge.finishDistance - challenge.distance).toFixed(1)}m left` : `在路上坚持 ${challenge.timeLimit} 秒，距终点还有 ${Math.max(0, challenge.finishDistance - challenge.distance).toFixed(1)} 米`);
    this.getElement('victory-summary').textContent = `${localized(definition.title)} · ${CHALLENGE_UI.attempt} ${state.meta.attempts[level]} ${CHALLENGE_UI.times}`;
    this.getElement('persistent-victory-kicker').textContent = victoryKicker;
    this.getElement('persistent-victory-title').textContent = victoryTitle;
    this.getElement('persistent-victory-detail').textContent = victoryDetail;
    this.getElement('unlock-notice').classList.toggle('is-hidden', completedCount < 3);

    this.getElement('challenge-level-index').textContent = `LEVEL 0${level}`;
    this.getElement('challenge-title').textContent = localized(definition.title);
    this.getElement('challenge-objective').textContent = dynamicGoal;
    this.getElement('challenge-time').textContent = Math.max(0, challenge.timeLimit - challenge.time).toFixed(1);
    this.getElement('challenge-distance').textContent = challenge.distance.toFixed(0);
    this.getElement('challenge-current-speed').textContent = challenge.currentSpeed.toFixed(1);
    this.getElement('challenge-target-speed').textContent = challenge.targetSpeed.toFixed(1);
    this.getElement('challenge-hits').textContent = String(challenge.hitCount);
    const shortfall = Math.max(0, challenge.finishDistance - challenge.distance);
    const arrivedEarly = challenge.failureKind === 'arrived-early';
    const failureKicker = arrivedEarly ? (LANGUAGE === 'en' ? 'TOO SOON' : '提前抵达终点')
      : level === 1 ? (LANGUAGE === 'en' ? 'IMPACT' : '碰撞发生')
        : level === 2 ? (LANGUAGE === 'en' ? 'TIME IS UP' : '天亮了')
          : (LANGUAGE === 'en' ? 'HEART BROKEN' : '心情见底');
    const failureTitle = arrivedEarly ? (LANGUAGE === 'en' ? 'You arrived too early.' : '你到得太早了。')
      : level === 1 ? (LANGUAGE === 'en' ? 'You hit someone.' : '你撞上了。')
        : level === 2 ? (LANGUAGE === 'en' ? `${shortfall.toFixed(1)}m short` : `还差 ${shortfall.toFixed(1)} 米`)
          : (LANGUAGE === 'en' ? 'You could not hold it in.' : '你忍不住哭了出来。');
    const failureDetail = arrivedEarly
      ? (LANGUAGE === 'en' ? `Only ${challenge.time.toFixed(1)} / ${challenge.timeLimit}s spent on the road` : `只在路上待了 ${challenge.time.toFixed(1)} / ${challenge.timeLimit} 秒`)
      : level === 1 ? (LANGUAGE === 'en' ? 'The collision ended this run.' : '这次碰撞结束了本轮挑战。')
        : level === 2 ? (LANGUAGE === 'en' ? `${challenge.distance.toFixed(1)} / ${challenge.finishDistance}m reached` : `本轮走了 ${challenge.distance.toFixed(1)} / ${challenge.finishDistance} 米`)
          : (LANGUAGE === 'en' ? 'Your heart broke, and the tears came.' : '心碎了，眼泪已经止不住了。');
    const persistentFeedback = this.getElement('persistent-failure-feedback');
    persistentFeedback.className = `persistent-failure-feedback is-level-${level}${arrivedEarly ? ' is-arrived-early' : ''}`;
    this.getElement('persistent-failure-icon').textContent = arrivedEarly ? '⚑' : level === 1 ? '◎' : level === 2 ? '━' : '♥';
    this.getElement('persistent-failure-kicker').textContent = failureKicker;
    this.getElement('persistent-failure-title').textContent = failureTitle;
    this.getElement('persistent-failure-detail').textContent = failureDetail;
    const failureSequence = this.getElement('challenge-failure-sequence');
    const showingFailure = state.mode === 'challenge-failure';
    failureSequence.classList.toggle('is-hidden', !showingFailure);
    failureSequence.classList.toggle('is-level-1', showingFailure && level === 1);
    failureSequence.classList.toggle('is-level-2', showingFailure && level === 2);
    failureSequence.classList.toggle('is-level-3', showingFailure && level === 3 && !arrivedEarly);
    failureSequence.classList.toggle('is-arrived-early', showingFailure && arrivedEarly);
    if (showingFailure) {
      this.getElement('failure-sequence-kicker').textContent = failureKicker;
      this.getElement('failure-sequence-title').textContent = failureTitle;
      this.getElement('failure-sequence-detail').textContent = level === 1
        ? (LANGUAGE === 'en' ? 'Watch the collision play out…' : '先看清这次碰撞……')
        : failureDetail;
    }
    const victorySequence = this.getElement('challenge-victory-sequence');
    const showingVictory = state.mode === 'challenge-victory';
    victorySequence.classList.toggle('is-hidden', !showingVictory);
    if (showingVictory) {
      this.getElement('victory-sequence-kicker').textContent = victoryKicker;
      this.getElement('victory-sequence-title').textContent = victoryTitle;
      this.getElement('victory-sequence-detail').textContent = victoryDetail;
    }
    this.root.querySelectorAll<HTMLButtonElement>('[data-challenge-axis="speed"]').forEach((button) => {
      button.classList.toggle('is-latched', Number(button.dataset.challengeValue) === challenge.speedInput);
    });
    const speedGear = this.getElement('challenge-speed-gear');
    speedGear.classList.toggle('is-hidden', state.mode !== 'challenge');
    if (state.mode === 'challenge' && playerScreen.visible) this.positionChallengeGear(speedGear, playerScreen);
    speedGear.classList.toggle('is-braking', challenge.speedInput < 0);
    speedGear.classList.toggle('is-accelerating', challenge.speedInput > 0);
    this.getElement('challenge-gear-state').textContent = challenge.speedInput < 0
      ? (LANGUAGE === 'en' ? 'BRAKE' : '减速')
      : challenge.speedInput > 0 ? (LANGUAGE === 'en' ? 'ACCEL' : '加速') : (LANGUAGE === 'en' ? 'NEUTRAL' : '空档');
    this.getElement('challenge-touch-controls').classList.toggle('is-hidden', state.mode !== 'challenge');
    const progress = level === 2
      ? challenge.distance / Math.max(1, challenge.finishDistance)
      : challenge.time / challenge.timeLimit;
    (this.getElement('challenge-progress-fill') as HTMLElement).style.width = `${Math.min(100, progress * 100)}%`;
    const moodMeter = this.getElement('mood-meter');
    moodMeter.classList.toggle('is-hidden', level !== 3);
    if (level === 3) {
      this.getElement('mood-value').textContent = `${Math.ceil(challenge.mood)} / ${challenge.maxMood}`;
      (this.getElement('mood-fill') as HTMLElement).style.width = `${Math.max(0, challenge.mood / challenge.maxMood) * 100}%`;
    }
    const rearThreat = level === 3 && state.mode === 'challenge' && state.npcs.some((npc) => {
      const rearDistance = npc.z - state.player.z;
      return rearDistance > 0 && rearDistance < 13 && Math.abs(npc.x - state.player.x) < 1.35;
    });
    this.getElement('rear-warning').classList.toggle('is-hidden', !rearThreat);
    const activeChallengeScene = state.mode === 'challenge' || state.mode === 'challenge-failure';
    const showImpact = activeChallengeScene && state.impactTime > 0;
    const showImpactText = activeChallengeScene && state.impactTextTime > 0 && Boolean(state.impactLabel);
    this.impactFlash.classList.toggle('is-hidden', !showImpact);
    this.impactFlash.classList.toggle('is-strong', showImpact);
    this.challengeImpactText.classList.toggle('is-hidden', !showImpactText);
    this.challengeImpactText.classList.toggle('is-strong', showImpactText);
    this.challengeImpactText.textContent = state.impactLabel;
  }

  private updateEndingGallery(state: GameState): void {
    const latest = state.meta.latestFourthEnding && state.meta.fourthEndings[state.meta.latestFourthEnding]
      ? state.meta.latestFourthEnding
      : null;
    const unlockedCount = FOURTH_ENDING_IDS.filter((endingId) => state.meta.fourthEndings[endingId]).length;
    this.getElement('ending-unlocked-count').textContent = String(unlockedCount);
    const galleryKey = `${FOURTH_ENDING_IDS.map((endingId) => state.meta.fourthEndings[endingId] ? '1' : '0').join('')}:${latest ?? ''}`;
    FOURTH_ENDING_IDS.forEach((endingId) => {
      const card = this.getElement(`ending-card-${endingId}`);
      const unlocked = state.meta.fourthEndings[endingId];
      const isLatest = latest === endingId;
      const copy = getFourthEndingCopy(endingId);
      card.classList.toggle('is-locked', !unlocked);
      card.classList.toggle('is-unlocked', unlocked);
      card.classList.toggle('is-latest', isLatest);
      card.setAttribute('aria-label', unlocked
        ? `${copy.responseCopy.endingTitle}${isLatest ? (LANGUAGE === 'en' ? ', latest ending' : '，最新结局') : ''}`
        : (LANGUAGE === 'en' ? 'Undiscovered ending' : '未发现的结局'));
    });
    this.latestEndingForConnection = latest;
    if (galleryKey !== this.lastEndingGalleryKey) {
      this.lastEndingGalleryKey = galleryKey;
      requestAnimationFrame(() => this.updateEndingConnection());
    }
  }

  private updateEndingConnection(): void {
    const latest = this.latestEndingForConnection;
    const source = this.root.querySelector<HTMLElement>('#level-card-4');
    const target = latest ? this.root.querySelector<HTMLElement>(`#ending-card-${latest}`) : null;
    if (this.lastMode !== 'level-select' || !latest || !source || !target) {
      this.endingConnection.classList.add('is-hidden');
      return;
    }
    const containerRect = this.levelSelectScreen.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(1, this.levelSelectScreen.clientWidth);
    const height = Math.max(this.levelSelectScreen.clientHeight, this.levelSelectScreen.scrollHeight);
    const scrollLeft = this.levelSelectScreen.scrollLeft;
    const scrollTop = this.levelSelectScreen.scrollTop;
    const startX = sourceRect.left - containerRect.left + scrollLeft + sourceRect.width / 2;
    const startY = sourceRect.bottom - containerRect.top + scrollTop - 8;
    const endX = targetRect.left - containerRect.left + scrollLeft + targetRect.width / 2;
    const endY = targetRect.top - containerRect.top + scrollTop + 8;
    const bend = Math.max(44, Math.abs(endY - startY) * 0.36);
    this.endingConnection.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.endingConnection.style.height = `${height}px`;
    this.endingConnectionPath.setAttribute('d', `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${startX.toFixed(1)} ${(startY + bend).toFixed(1)}, ${endX.toFixed(1)} ${(endY - bend).toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`);
    this.endingConnection.classList.remove('is-hidden');
  }

  private updateFourthFlow(state: GameState): void {
    const fourth = state.fourth;
    const balance = getFourthBalance();
    this.getElement('fourth-choice-duration').textContent = String(balance.duration);
    this.getElement('fourth-pace-choices').querySelectorAll<HTMLElement>('[data-fourth-pace]').forEach((button) => {
      const pace = button.dataset.fourthPace as FourthPace;
      const speed = pace === 'fast' ? balance.fastSpeed : pace === 'slow' ? balance.slowSpeed : balance.normalSpeed;
      (button.querySelector('.fourth-pace-value') as HTMLElement).textContent = `${speed.toFixed(1)} m/s`;
    });
    if (!fourth.pace) return;

    const paceCopy = getFourthPaceCopy(fourth.pace);
    const collisionCount = state.minorBumps + state.strongCollisions;
    this.getElement('fourth-walk-pace').textContent = paceCopy.short;
    this.getElement('fourth-walk-time').textContent = Math.max(0, fourth.duration - fourth.time).toFixed(1);
    this.getElement('fourth-walk-speed').textContent = fourth.selectedSpeed.toFixed(1);
    this.getElement('fourth-walk-hits').textContent = String(collisionCount);
    (this.getElement('fourth-walk-progress-fill') as HTMLElement).style.width = `${Math.min(100, fourth.time / Math.max(0.01, fourth.duration) * 100)}%`;

    const showImpact = state.mode === 'level-four-walk' && state.impactTime > 0;
    const showImpactText = state.mode === 'level-four-walk' && state.impactTextTime > 0 && Boolean(state.impactLabel);
    this.impactFlash.classList.toggle('is-hidden', !showImpact);
    this.impactFlash.classList.toggle('is-strong', state.impactStrength > 0.6);
    const fourthImpact = this.getElement('fourth-impact-text');
    fourthImpact.classList.toggle('is-hidden', !showImpactText);
    fourthImpact.classList.toggle('is-strong', state.impactStrength > 0.6);
    fourthImpact.textContent = state.impactLabel;

    this.getElement('fourth-reflection-pace').textContent = paceCopy.short;
    this.getElement('fourth-reflection-stats').textContent = LANGUAGE === 'en'
      ? `${fourth.duration.toFixed(1)}s · ${collisionCount} collisions`
      : `${fourth.duration.toFixed(1)} 秒 · ${collisionCount} 次碰撞`;
    this.getElement('fourth-reflection-text').textContent = paceCopy.reflection;
    if (this.lastFourthReflectionPace !== fourth.pace) {
      this.lastFourthReflectionPace = fourth.pace;
      this.getElement('fourth-response-choices').replaceChildren(...FOURTH_RESPONSE_ORDER.map((response, index) => {
        const copy = getFourthResponseCopy(fourth.pace as FourthPace, response);
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.fourthResponse = response;
        button.className = `is-${response}`;
        button.innerHTML = `<span>0${index + 1}</span><strong>${copy.label}</strong><p>${copy.text}</p><i>→</i>`;
        return button;
      }));
    }

    if (!fourth.endingId) return;
    const ending = getFourthEndingCopy(fourth.endingId);
    const endingPanel = this.getElement('fourth-ending-panel');
    endingPanel.classList.toggle('is-self', ending.response === 'self');
    endingPanel.classList.toggle('is-others', ending.response === 'others');
    endingPanel.classList.toggle('is-accept', ending.response === 'accept');
    this.getElement('fourth-ending-mark').textContent = ending.response === 'self' ? '↓' : ending.response === 'others' ? '×' : '○';
    this.getElement('fourth-ending-title').textContent = ending.responseCopy.endingTitle;
    this.getElement('fourth-ending-body').textContent = ending.responseCopy.endingBody;
    this.getElement('fourth-ending-pace').textContent = ending.paceCopy.short;
    this.getElement('fourth-ending-response').textContent = ending.responseCopy.label;
  }

  private dynamicGoal(level: 1 | 2 | 3, stats: ReturnType<typeof getChallengeStats>): string {
    if (LANGUAGE === 'en') {
      if (level === 1) return `Survive ${stats.timeLimit}s with zero collisions`;
      if (level === 2) return `Reach ${stats.finishDistance}m within ${stats.timeLimit}s`;
      return `Stay short of ${stats.finishDistance}m after ${stats.timeLimit}s`;
    }
    if (level === 1) return `零碰撞生存 ${stats.timeLimit} 秒`;
    if (level === 2) return `${stats.timeLimit} 秒内抵达 ${stats.finishDistance} 米`;
    return `${stats.timeLimit} 秒后仍未走完 ${stats.finishDistance} 米`;
  }

  private dynamicRule(level: 1 | 2 | 3, stats: ReturnType<typeof getChallengeStats>): string {
    if (LANGUAGE === 'en') {
      if (level === 1) return `Control your pace and sidestep for ${stats.timeLimit}s. Any collision ends the run.`;
      if (level === 2) return `Cover ${stats.finishDistance}m in ${stats.timeLimit}s. Collisions cut your speed; power reduces the loss.`;
      return `Stay on the ${stats.finishDistance}m road for ${stats.timeLimit}s without finishing; faster walkers drain your mood.`;
    }
    if (level === 1) return `控制步速与左右移动，坚持 ${stats.timeLimit} 秒。任何碰撞都会立刻结束本轮。`;
    if (level === 2) return `在 ${stats.timeLimit} 秒内跑完 ${stats.finishDistance} 米。碰撞会让你掉速，攻击力越高，损失越小。`;
    return `你要走满 ${stats.timeLimit} 秒仍不到 ${stats.finishDistance} 米；被快人撞会消耗心情。`;
  }

  private updateWalking(state: GameState, playerScreen: { x: number; y: number; visible: boolean }): void {
    if (playerScreen.visible) this.positionNearCharacter(this.speedConsole, playerScreen, 'walking');
    const active = SPEEDS[state.speedLevel];
    const pausedForDialogue = Boolean(state.speech || state.pendingEvaluation);
    const showTaskCompleteArt = state.allTasksComplete && !pausedForDialogue;
    this.taskPanel.classList.toggle('is-hidden', showTaskCompleteArt);
    this.taskCompleteArt.classList.toggle('is-hidden', !showTaskCompleteArt);
    this.walkingHud.classList.toggle('is-speech-paused', pausedForDialogue);
    this.root.querySelectorAll<HTMLButtonElement>('.speed-step-button').forEach((button) => {
      button.disabled = pausedForDialogue;
    });
    this.updateEvaluation(state.pendingEvaluation);
    let completed = 0;
    SPEEDS.forEach((speed) => {
      const task = state.tasks[speed.id];
      if (task.complete) completed += 1;
      const elements = this.taskElements.get(speed.id);
      if (!elements) return;
      elements.row.classList.toggle('is-active', speed.id === active.id && !task.complete);
      elements.row.classList.toggle('is-complete', task.complete);
      elements.fill.style.width = `${(task.progress / TASK_DURATION) * 100}%`;
      elements.time.textContent = task.complete ? '10' : String(Math.floor(task.progress));
      elements.status.textContent = task.complete ? '✓' : speed.id === active.id ? '●' : '✓';
    });
    this.getElement('task-total').textContent = `${completed} / 5`;
    this.speedName.textContent = active.shortLabel;
    this.speedDots.querySelectorAll('span').forEach((dot, index) => {
      dot.classList.toggle('is-on', index <= state.speedLevel);
      dot.classList.toggle('is-current', index === state.speedLevel);
    });

    const showSpeech = Boolean(state.speech && playerScreen.visible);
    this.speechBubble.classList.toggle('is-hidden', !showSpeech);
    const speechReady = Boolean(state.speech && state.speech.elapsed >= SPEECH_CONTINUE_DELAY);
    this.speechCanContinue = speechReady;
    this.speechBubble.classList.toggle('is-ready', speechReady);
    this.speechBubble.setAttribute('aria-disabled', String(!speechReady));
    this.walkingHud.classList.toggle('is-speech-ready', speechReady);
    if (showSpeech && state.speech) {
      this.speechText.textContent = state.speech.text;
      this.speechBubble.style.left = `${playerScreen.x}px`;
      this.speechBubble.style.top = `${playerScreen.y}px`;
    }

    const showImpactFlash = state.impactTime > 0 && !state.speech;
    const showImpactText = state.impactTextTime > 0 && !state.speech;
    this.impactFlash.classList.toggle('is-hidden', !showImpactFlash);
    this.impactFlash.classList.toggle('is-strong', state.impactStrength > 0.6);
    this.impactText.classList.toggle('is-hidden', !showImpactText);
    this.impactText.classList.toggle('is-strong', state.impactStrength > 0.6);
    this.impactText.textContent = state.impactLabel;
    this.completionButton.classList.toggle('is-hidden', !state.allTasksComplete || pausedForDialogue);
  }

  private updateEvaluation(evaluationId: GameState['pendingEvaluation']): void {
    this.evaluationPanel.classList.toggle('is-hidden', !evaluationId);
    if (!evaluationId || evaluationId === this.lastPendingEvaluation) return;
    this.lastPendingEvaluation = evaluationId;
    const speed = SPEEDS.find((definition) => definition.id === evaluationId);
    if (!speed) return;
    this.evaluationSpeed.textContent = speed.label;
    this.evaluationChoices.replaceChildren(...speed.phrases.map((phrase, index) => {
      const button = document.createElement('button');
      button.id = `evaluation-choice-${index}`;
      button.className = 'evaluation-choice';
      button.type = 'button';
      button.dataset.evaluationChoice = String(index);
      button.innerHTML = `<span>0${index + 1}</span><b></b><i>→</i>`;
      (button.querySelector('b') as HTMLElement).textContent = phrase;
      return button;
    }));
  }

  private positionNearCharacter(
    element: HTMLElement,
    anchor: { x: number; y: number },
    kind: 'portrait' | 'walking',
  ): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = viewportWidth <= 760 ? 14 : 24;
    const bottomMargin = kind === 'portrait' && viewportWidth <= 760 ? 76 : margin;
    const width = element.offsetWidth || (kind === 'portrait' ? Math.min(440, viewportWidth - margin * 2) : 235);
    const height = element.offsetHeight || (kind === 'portrait' ? 230 : 150);
    const offsetX = kind === 'portrait' ? (viewportWidth <= 760 ? 44 : 150) : (viewportWidth <= 760 ? 74 : 112);
    const offsetY = kind === 'portrait' ? (viewportWidth <= 760 ? 84 : 78) : (viewportWidth <= 760 ? 112 : 150);
    const left = Math.max(margin, Math.min(viewportWidth - width - margin, anchor.x + offsetX));
    const top = Math.max(margin, Math.min(viewportHeight - height - bottomMargin, anchor.y + offsetY));
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(top)}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }

  private positionChallengeGear(element: HTMLElement, anchor: { x: number; y: number }): void {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const compact = viewportWidth <= 820;
    const margin = compact ? 10 : 18;
    const width = element.offsetWidth || (compact ? 60 : 66);
    const height = element.offsetHeight || (compact ? 188 : 202);
    const characterClearance = compact ? 56 : 86;
    const preferredRight = anchor.x + characterClearance;
    const left = preferredRight + width <= viewportWidth - margin
      ? preferredRight
      : anchor.x - characterClearance - width;
    const top = Math.max(margin, Math.min(viewportHeight - height - margin, anchor.y + (compact ? 18 : 24)));
    element.style.left = `${Math.round(Math.max(margin, Math.min(viewportWidth - width - margin, left)))}px`;
    element.style.top = `${Math.round(top)}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  }

  private updateInteraction(state: GameState): void {
    const isPunch = state.interaction === 'punch';
    this.interactionHint.textContent = isPunch ? COPY.interaction.punchHint : COPY.interaction.petHint;
    this.interactionHint.classList.toggle('is-punch', isPunch);
    this.interactionHint.classList.toggle('is-pet', !isPunch);
    this.cursorGlyph.textContent = isPunch ? '✊' : '🫳';
    this.cursorFollower.classList.toggle('is-punch', isPunch);
    this.cursorFollower.classList.toggle('is-pet', !isPunch);
    const actionsReady = state.interactionCount >= INTERACTION_TARGET;
    this.restartButton.classList.toggle('is-hidden', !actionsReady);
    this.departButton.classList.toggle('is-hidden', !actionsReady);

    if (state.interactionCount > this.lastInteractionCount) {
      const firstNewCount = this.lastInteractionCount + 1;
      this.lastInteractionCount = state.interactionCount;
      this.interactionBurst.classList.toggle('is-heart', !isPunch);
      this.interactionBurst.innerHTML = isPunch ? COPY.interaction.punchEffect : '<span>♥</span><span>♥</span><span>♥</span>';
      this.interactionBurst.classList.remove('is-hidden', 'animate');
      this.cursorFollower.classList.remove('is-acting');
      void this.interactionBurst.offsetWidth;
      this.interactionBurst.classList.add('animate');
      this.cursorFollower.classList.add('is-acting');
      for (let count = firstNewCount; count <= state.interactionCount; count += 1) {
        this.spawnInteractionBalloon(state, count);
      }
    }
  }

  private spawnInteractionBalloon(state: GameState, interactionCount: number): void {
    if (!state.interaction || interactionCount < 1) return;
    const phraseIndex = (interactionCount - 1) % INTERACTION_TARGET;
    const phrase = COPY.interaction.feedback[state.interaction][phraseIndex];
    const balloon = document.createElement('div');
    balloon.className = `interaction-balloon is-${state.interaction} balloon-${phraseIndex}`;
    balloon.textContent = phrase;
    balloon.addEventListener('animationend', () => balloon.remove(), { once: true });
    this.interactionBalloons.append(balloon);
  }
}
