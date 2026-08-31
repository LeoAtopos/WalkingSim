import { INTERACTION_TARGET, SPEEDS, SPEECH_CONTINUE_DELAY, TASK_DURATION, type ChallengeUpgradeKey, type GameState, type InteractionKind, type LevelId } from './types';
import { COPY, LANGUAGE, setLanguagePreference } from './i18n';
import { CHALLENGE_UI, LEVELS, getChallengeStats, getLevel, getUpgradeCopy, getUpgradeLevel, localized } from './challenges';

interface UIActions {
  onStart: () => void;
  onSelectLevel: (level: LevelId) => void;
  onBeginChallenge: () => void;
  onChooseUpgrade: (key: ChallengeUpgradeKey) => void;
  onReturnToLevels: () => void;
  onFinishVictory: () => void;
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

export class GameUI {
  private readonly root: HTMLDivElement;
  private readonly walkingHud: HTMLElement;
  private readonly levelSelectScreen: HTMLElement;
  private readonly briefingScreen: HTMLElement;
  private readonly challengeHud: HTMLElement;
  private readonly upgradeScreen: HTMLElement;
  private readonly victoryScreen: HTMLElement;
  private readonly levelGrid: HTMLElement;
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
  private readonly taskElements = new Map<string, { row: HTMLElement; fill: HTMLElement; status: HTMLElement; time: HTMLElement }>();
  private lastInteractionCount = 0;
  private lastMode: GameState['mode'] | null = null;
  private interactionUnlockAt = 0;
  private speechCanContinue = false;
  private lastPendingEvaluation: GameState['pendingEvaluation'] = null;
  private shareToastTimeout = 0;
  private lastUpgradeRenderKey = '';
  private lastBriefingRenderKey = '';

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
          <p>${CHALLENGE_UI.selectBody}</p>
          <div class="level-clear-count"><span>${CHALLENGE_UI.clearCount}</span><strong id="level-clear-count">0 / 3</strong></div>
        </div>
        <div id="level-grid" class="level-grid"></div>
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
        <div class="challenge-control-hint"><kbd>W</kbd><kbd>S</kbd> ${CHALLENGE_UI.targetSpeed} · <kbd>A</kbd><kbd>D</kbd> ${CHALLENGE_UI.lateral}</div>
        <div class="challenge-touch-controls">
          <button type="button" data-challenge-axis="lateral" data-challenge-value="-1">←<span>${CHALLENGE_UI.left}</span></button>
          <button type="button" data-challenge-axis="speed" data-challenge-value="-1">−<span>${CHALLENGE_UI.slower}</span></button>
          <button type="button" data-challenge-axis="speed" data-challenge-value="1">＋<span>${CHALLENGE_UI.faster}</span></button>
          <button type="button" data-challenge-axis="lateral" data-challenge-value="1">→<span>${CHALLENGE_UI.right}</span></button>
        </div>
        <div id="challenge-impact-text" class="impact-text is-hidden" aria-live="polite"></div>
      </section>

      <section id="upgrade-screen" class="scene-ui run-result-ui is-hidden" aria-label="${CHALLENGE_UI.failKicker}">
        <div class="run-result-card fail-card">
          <span class="eyebrow">${CHALLENGE_UI.failKicker}</span>
          <h2>${CHALLENGE_UI.failTitle}</h2>
          <p id="failure-reason"></p>
          <small>${CHALLENGE_UI.chooseUpgrade}</small>
          <div id="upgrade-choices" class="upgrade-choices"></div>
          <button id="upgrade-back" class="text-button" type="button">← ${CHALLENGE_UI.back}</button>
        </div>
      </section>

      <section id="victory-screen" class="scene-ui run-result-ui is-hidden" aria-label="${CHALLENGE_UI.victoryKicker}">
        <div class="run-result-card victory-card">
          <span class="eyebrow">${CHALLENGE_UI.victoryKicker}</span>
          <h2>${CHALLENGE_UI.victoryTitle}</h2>
          <p id="victory-summary"></p>
          <div id="unlock-notice" class="unlock-notice is-hidden">✦ ${CHALLENGE_UI.allUnlocked}</div>
          <button id="victory-back" class="game-button primary-button" type="button">${CHALLENGE_UI.victoryBack} <span>→</span></button>
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
    this.levelGrid = this.getElement('level-grid');
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

    this.createLevelCards();
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
        <div class="level-card-meta"><span class="level-attempts"></span><b>→</b></div>
      `;
      this.levelGrid.append(card);
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
    this.levelGrid.addEventListener('click', (event) => {
      const card = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-level]');
      if (!card || card.disabled) return;
      this.actions.onSelectLevel(Number(card.dataset.level) as LevelId);
    });
    this.getElement('begin-challenge').addEventListener('click', this.actions.onBeginChallenge);
    this.getElement('briefing-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('upgrade-back').addEventListener('click', this.actions.onReturnToLevels);
    this.getElement('victory-back').addEventListener('click', this.actions.onFinishVictory);
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
      const stop = () => this.actions.onChallengeInput(axis, 0);
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
    if (['level-select', 'level-briefing', 'challenge', 'upgrade', 'victory'].includes(state.mode)) {
      this.updateChallengeFlow(state);
    }
    if (state.mode === 'walking') this.updateWalking(state, playerScreen);
    if (state.mode === 'interaction') this.updateInteraction(state);
  }

  private updateMode(state: GameState): void {
    if (state.mode !== 'walking') this.setExitConfirmation(false);
    if (state.mode === 'intro' || state.mode === 'return') this.lastInteractionCount = 0;
    const screens: Array<[HTMLElement, boolean]> = [
      [this.introScreen, state.mode === 'intro'],
      [this.levelSelectScreen, state.mode === 'level-select'],
      [this.briefingScreen, state.mode === 'level-briefing'],
      [this.challengeHud, state.mode === 'challenge'],
      [this.upgradeScreen, state.mode === 'upgrade'],
      [this.victoryScreen, state.mode === 'victory'],
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
    if (state.mode !== 'walking') {
      this.evaluationPanel.classList.add('is-hidden');
      this.lastPendingEvaluation = null;
      this.impactFlash.classList.add('is-hidden');
      this.impactText.classList.add('is-hidden');
    }
    if (state.mode !== 'interaction') this.interactionBalloons.replaceChildren();
    if (state.mode !== 'upgrade') this.lastUpgradeRenderKey = '';
  }

  private updateChallengeFlow(state: GameState): void {
    const completedCount = ([1, 2, 3] as const).filter((level) => state.meta.completed[level]).length;
    this.getElement('level-clear-count').textContent = `${completedCount} / 3`;
    LEVELS.forEach((level) => {
      const card = this.getElement(`level-card-${level.id}`) as HTMLButtonElement;
      const locked = level.id === 4 && completedCount < 3;
      const cleared = level.id !== 4 && state.meta.completed[level.id];
      card.disabled = locked;
      card.classList.toggle('is-locked', locked);
      card.classList.toggle('is-cleared', cleared);
      (card.querySelector('.level-state') as HTMLElement).textContent = locked
        ? `${CHALLENGE_UI.locked} · ${completedCount}/3`
        : cleared ? CHALLENGE_UI.cleared : CHALLENGE_UI.unlocked;
      (card.querySelector('.level-attempts') as HTMLElement).textContent = level.id === 4
        ? localized(level.objective)
        : `${CHALLENGE_UI.attempt} ${state.meta.attempts[level.id]} ${CHALLENGE_UI.times}`;
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
    const briefingRenderKey = `${level}:${statLines.flat().join(':')}:${challenge.lastUpgrade ?? ''}`;
    if (this.lastBriefingRenderKey !== briefingRenderKey) {
      this.lastBriefingRenderKey = briefingRenderKey;
      this.briefingContent.style.setProperty('--level-accent', definition.accent);
      this.briefingContent.innerHTML = `
        <span class="eyebrow">${CHALLENGE_UI.briefingKicker} / 0${level}</span>
        <h2>${localized(definition.title)}</h2>
        <p>${localized(definition.rule)}</p>
        <div class="briefing-goal"><span>${CHALLENGE_UI.target}</span><strong>${localized(definition.objective)}</strong></div>
        <div class="briefing-stats">${statLines.map(([label, value, statLevel]) => `<div><span>${label}<em>LV.${statLevel}</em></span><strong>${value}</strong></div>`).join('')}</div>
        ${lastUpgrade ? `<div class="last-upgrade">↑ ${lastUpgrade.name} · ${lastUpgrade.effect}</div>` : ''}
        <small>${CHALLENGE_UI.controls}</small>
      `;
    }

    this.getElement('failure-reason').textContent = challenge.resultReason;
    const upgradeRenderKey = `${level}:${definition.upgrades.map((key) => getUpgradeLevel(state.meta, level, key)).join(':')}`;
    if (state.mode === 'upgrade' && this.lastUpgradeRenderKey !== upgradeRenderKey) {
      this.lastUpgradeRenderKey = upgradeRenderKey;
      this.upgradeChoices.replaceChildren(...definition.upgrades.map((key) => {
        const copy = getUpgradeCopy(key);
        const button = document.createElement('button');
        button.type = 'button';
        button.id = `upgrade-${key}`;
        button.dataset.upgrade = key;
        button.innerHTML = `<span>LV.${getUpgradeLevel(state.meta, level, key)}</span><strong>${copy.name}</strong><small>${copy.effect}</small><b>＋</b>`;
        return button;
      }));
    }

    this.getElement('victory-summary').textContent = `${localized(definition.title)} · ${CHALLENGE_UI.attempt} ${state.meta.attempts[level]} ${CHALLENGE_UI.times}`;
    this.getElement('unlock-notice').classList.toggle('is-hidden', completedCount < 3);

    this.getElement('challenge-level-index').textContent = `LEVEL 0${level}`;
    this.getElement('challenge-title').textContent = localized(definition.title);
    this.getElement('challenge-objective').textContent = localized(definition.objective);
    this.getElement('challenge-time').textContent = Math.max(0, challenge.timeLimit - challenge.time).toFixed(1);
    this.getElement('challenge-distance').textContent = challenge.distance.toFixed(0);
    this.getElement('challenge-current-speed').textContent = challenge.currentSpeed.toFixed(1);
    this.getElement('challenge-target-speed').textContent = challenge.targetSpeed.toFixed(1);
    this.getElement('challenge-hits').textContent = String(challenge.hitCount);
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
    const showImpact = state.mode === 'challenge' && state.impactTime > 0;
    const showImpactText = state.mode === 'challenge' && state.impactTextTime > 0 && Boolean(state.impactLabel);
    this.impactFlash.classList.toggle('is-hidden', !showImpact);
    this.impactFlash.classList.toggle('is-strong', showImpact);
    this.challengeImpactText.classList.toggle('is-hidden', !showImpactText);
    this.challengeImpactText.classList.toggle('is-strong', showImpactText);
    this.challengeImpactText.textContent = state.impactLabel;
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
