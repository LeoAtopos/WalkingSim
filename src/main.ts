import './styles.css';
import { GameAudio } from './game/audio';
import { applyDocumentLanguage, COPY, LANGUAGE } from './game/i18n';
import { CrowdPhysics } from './game/physics';
import { GameRenderer } from './game/renderer';
import { CHALLENGE_CROWD_HALF_WIDTH, WalkingSimulation } from './game/simulation';
import { INTERACTION_TARGET, NPC_SPEED_MAX, NPC_SPEED_MIN, SPEEDS, SPEECH_CONTINUE_DELAY, type ChallengeUpgradeKey, type FourthPace, type FourthResponse, type LevelId } from './game/types';
import { GameUI } from './game/ui';

applyDocumentLanguage();

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

class WalkingSimApp {
  private readonly simulation: WalkingSimulation;
  private readonly renderer: GameRenderer;
  private readonly physics: CrowdPhysics;
  private readonly ui: GameUI;
  private readonly audio = new GameAudio();
  private lastFrame = performance.now();
  private running = true;
  private readonly pressedKeys = new Set<string>();
  private activeLateralPointerId: number | null = null;

  private constructor(container: HTMLElement, simulation: WalkingSimulation, renderer: GameRenderer, physics: CrowdPhysics) {
    this.simulation = simulation;
    this.renderer = renderer;
    this.physics = physics;
    this.ui = new GameUI(container, {
      onStart: () => this.startWalking(),
      onSelectLevel: (level) => this.selectLevel(level),
      onBeginChallenge: () => this.beginChallenge(),
      onChooseUpgrade: (key) => this.chooseUpgrade(key),
      onRetryChallenge: () => this.retryChallenge(),
      onReturnToLevels: () => this.returnToLevels(),
      onFinishVictory: () => this.finishVictory(),
      onChooseFourthPace: (pace) => this.chooseFourthPace(pace),
      onFourthLateralInput: (value) => this.simulation.setFourthLateralInput(value),
      onContinueFourthSummary: () => this.continueFourthSummary(),
      onChooseFourthResponse: (response) => this.chooseFourthResponse(response),
      onFinishFourthEnding: () => this.finishFourthEnding(),
      onResetProgress: () => this.resetProgress(),
      onChallengeInput: (axis, value) => this.simulation.setChallengeInput(axis, value),
      onSpeedChange: (delta) => this.changeSpeed(delta),
      onDismissSpeech: () => this.dismissSpeech(),
      onChooseEvaluation: (choiceIndex) => this.chooseEvaluation(choiceIndex),
      onFinishWalk: () => this.finishWalk(),
      onChooseInteraction: (kind) => this.chooseInteraction(kind),
      onContinueAllEndings: () => this.simulation.continueAllEndings(),
      onInteract: () => this.interactWithLi(),
      onDepart: () => this.depart(),
      onRestart: () => this.restart(),
      onExitWalking: () => this.exitWalking(),
      onToggleAudio: () => this.toggleAudio(),
      isAudioMuted: () => this.audio.isMuted(),
    });
    this.bindInput();
    this.installTestHooks();
  }

  static async create(container: HTMLElement): Promise<WalkingSimApp> {
    const simulation = new WalkingSimulation();
    const renderer = new GameRenderer(container, simulation.state);
    const physics = await CrowdPhysics.create(simulation);
    return new WalkingSimApp(container, simulation, renderer, physics);
  }

  start(): void {
    this.frame(performance.now());
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.step(dt, true);
    requestAnimationFrame(this.frame);
  };

  private step(dt: number, renderFrame: boolean): void {
    if (this.ui.isExitConfirmationOpen()) {
      if (renderFrame) this.updateUi();
      return;
    }
    this.simulation.update(dt);
    this.physics.update(dt);
    if (!renderFrame) return;
    this.renderer.update(this.simulation.state, dt);
    this.audio.update(this.simulation.state, dt);
    this.updateUi();
  }

  private startWalking(): void {
    const before = this.simulation.state.mode;
    this.simulation.startWalking();
    if (this.simulation.state.mode === before) return;
    this.audio.playStart();
    this.physics.reset(this.simulation.state);
  }

  private selectLevel(level: LevelId): void {
    const before = this.simulation.state.mode;
    this.simulation.selectLevel(level);
    if (this.simulation.state.mode === before) return;
    this.audio.playStart();
    this.physics.reset(this.simulation.state);
  }

  private beginChallenge(): void {
    this.simulation.beginChallenge();
    this.pressedKeys.clear();
    this.physics.reset(this.simulation.state);
  }

  private chooseUpgrade(key: ChallengeUpgradeKey): void {
    this.simulation.chooseUpgrade(key);
    this.physics.reset(this.simulation.state);
    this.updateUi();
  }

  private retryChallenge(): void {
    this.simulation.retryChallenge();
    this.physics.reset(this.simulation.state);
  }

  private returnToLevels(): void {
    this.pressedKeys.clear();
    this.simulation.returnToLevelSelect();
  }

  private finishVictory(): void {
    this.simulation.finishVictory();
  }

  private chooseFourthPace(pace: FourthPace): void {
    const before = this.simulation.state.mode;
    this.simulation.chooseFourthPace(pace);
    if (this.simulation.state.mode === before) return;
    this.pressedKeys.clear();
    this.physics.reset(this.simulation.state);
    this.audio.playStart();
  }

  private chooseFourthResponse(response: FourthResponse): void {
    const before = this.simulation.state.mode;
    this.simulation.chooseFourthResponse(response);
    if (this.simulation.state.mode !== before) this.audio.playContinue();
  }

  private continueFourthSummary(): void {
    const before = this.simulation.state.mode;
    this.simulation.continueFourthSummary();
    if (this.simulation.state.mode !== before) this.audio.playContinue();
  }

  private finishFourthEnding(): void {
    const before = this.simulation.state.mode;
    this.simulation.finishFourthEnding();
    if (this.simulation.state.mode !== before) this.audio.playContinue();
  }

  private resetProgress(): void {
    this.pressedKeys.clear();
    this.simulation.resetProgress();
    this.physics.reset(this.simulation.state);
    this.audio.playRestart();
    this.audio.resetTracking(this.simulation.state);
    this.updateUi();
  }

  private changeSpeed(delta: number): void {
    const before = this.simulation.state.speedLevel;
    this.simulation.changeSpeed(delta);
    const after = this.simulation.state.speedLevel;
    if (after !== before) this.audio.playSpeedChange(Math.sign(after - before), after);
  }

  private dismissSpeech(): void {
    const before = this.simulation.state.speech;
    this.simulation.dismissSpeech();
    if (before && this.simulation.state.speech !== before) this.audio.playContinue();
  }

  private chooseEvaluation(choiceIndex: number): void {
    const before = this.simulation.state.pendingEvaluation;
    this.simulation.chooseEvaluation(choiceIndex);
    if (before && !this.simulation.state.pendingEvaluation) this.audio.playContinue();
  }

  private finishWalk(): void {
    const before = this.simulation.state.mode;
    this.simulation.finishWalk();
    if (this.simulation.state.mode !== before) this.audio.playFinish();
  }

  private chooseInteraction(kind: 'punch' | 'pet'): void {
    const before = this.simulation.state.mode;
    this.simulation.chooseInteraction(kind);
    if (this.simulation.state.mode !== before) this.audio.playChoice(kind);
  }

  private interactWithLi(): void {
    const before = this.simulation.state.interactionCount;
    this.simulation.interactWithLi();
    if (this.simulation.state.interactionCount > before && this.simulation.state.interaction) {
      this.audio.playInteraction(this.simulation.state.interaction);
    }
  }

  private depart(): void {
    const before = this.simulation.state.mode;
    this.simulation.depart();
    if (this.simulation.state.mode !== before) this.audio.playDepart();
  }

  private toggleAudio(): boolean {
    return this.audio.toggleMuted();
  }

  private restart(): void {
    this.audio.playRestart();
    this.simulation.reset();
    this.physics.reset(this.simulation.state);
    this.audio.resetTracking(this.simulation.state);
    this.renderer.update(this.simulation.state, 1 / 60);
    this.audio.update(this.simulation.state, 1 / 60);
    this.updateUi();
  }

  private exitWalking(): void {
    this.pressedKeys.clear();
    this.simulation.returnToLevelSelect();
  }

  private updateUi(): void {
    this.ui.update(
      this.simulation.state,
      this.renderer.getPlayerScreenPosition(this.simulation.state),
      this.renderer.getPortraitScreenPosition(),
      this.renderer.isPortraitCameraReady(),
    );
  }

  private bindInput(): void {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && (this.simulation.state.mode === 'walking' || this.simulation.state.mode === 'challenge' || this.simulation.state.mode === 'level-four-walk')) {
        event.preventDefault();
        if (!event.repeat) this.ui.toggleExitConfirmation();
        return;
      }
      if (this.ui.isExitConfirmationOpen()) {
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        this.ui.setAudioMuted(this.toggleAudio());
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void this.toggleFullscreen();
        return;
      }
      if (this.simulation.state.mode === 'challenge') {
        const key = event.key.toLowerCase();
        if (['w', 'arrowup'].includes(key)) {
          event.preventDefault();
          if (!event.repeat) this.simulation.setChallengeInput('speed', 1);
        } else if (['s', 'arrowdown'].includes(key)) {
          event.preventDefault();
          if (!event.repeat) this.simulation.setChallengeInput('speed', -1);
        } else if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) {
          event.preventDefault();
          this.pressedKeys.add(key);
          this.syncLateralInput();
        }
        return;
      }
      if (this.simulation.state.mode === 'level-four-walk') {
        const key = event.key.toLowerCase();
        if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) {
          event.preventDefault();
          this.pressedKeys.add(key);
          this.syncLateralInput();
        }
        return;
      }
      if (this.simulation.state.mode !== 'walking' || event.repeat) return;
      if (event.key.toLowerCase() === 'w' || event.key === 'ArrowUp') {
        event.preventDefault();
        this.changeSpeed(1);
      } else if (event.key.toLowerCase() === 's' || event.key === 'ArrowDown') {
        event.preventDefault();
        this.changeSpeed(-1);
      }
    });

    window.addEventListener('keyup', (event) => {
      const key = event.key.toLowerCase();
      if (!this.pressedKeys.delete(key)) return;
      this.syncLateralInput();
    });
    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.isLateralPointerMode()) return;
      if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="dialog"]')) return;
      this.activeLateralPointerId = event.pointerId;
      this.setPointerLateral(event.clientX);
    });
    window.addEventListener('pointermove', (event) => {
      if (event.pointerId === this.activeLateralPointerId) this.setPointerLateral(event.clientX);
    });
    const releaseLateralPointer = (event: PointerEvent) => {
      if (event.pointerId !== this.activeLateralPointerId) return;
      this.activeLateralPointerId = null;
      this.setActiveLateralInput(0);
    };
    window.addEventListener('pointerup', releaseLateralPointer);
    window.addEventListener('pointercancel', releaseLateralPointer);
    window.addEventListener('blur', () => {
      this.activeLateralPointerId = null;
      this.pressedKeys.clear();
      this.syncLateralInput();
    });

    document.addEventListener('fullscreenchange', () => this.renderer.resize());
    document.addEventListener('visibilitychange', () => {
      this.lastFrame = performance.now();
    });
  }

  private syncLateralInput(): void {
    const positiveLateral = this.pressedKeys.has('d') || this.pressedKeys.has('arrowright');
    const negativeLateral = this.pressedKeys.has('a') || this.pressedKeys.has('arrowleft');
    const value = positiveLateral === negativeLateral ? 0 : positiveLateral ? 1 : -1;
    if (this.simulation.state.mode === 'level-four-walk') this.simulation.setFourthLateralInput(value);
    else this.simulation.setChallengeInput('lateral', value);
  }

  private isLateralPointerMode(): boolean {
    return this.simulation.state.mode === 'challenge' || this.simulation.state.mode === 'level-four-walk';
  }

  private setPointerLateral(clientX: number): void {
    this.setActiveLateralInput(clientX < window.innerWidth / 2 ? -1 : 1);
  }

  private setActiveLateralInput(value: -1 | 0 | 1): void {
    if (this.simulation.state.mode === 'level-four-walk') this.simulation.setFourthLateralInput(value);
    else this.simulation.setChallengeInput('lateral', value);
  }

  private async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
    this.renderer.resize();
  }

  private installTestHooks(): void {
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let index = 0; index < steps; index += 1) this.step(1 / 60, false);
      this.renderer.update(this.simulation.state, Math.min(0.05, ms / 1000));
      this.audio.update(this.simulation.state, Math.min(0.05, ms / 1000));
      this.updateUi();
    };

    window.render_game_to_text = () => {
      const state = this.simulation.state;
      const activeSpeed = SPEEDS[state.speedLevel];
      return JSON.stringify({
        language: LANGUAGE,
        coordinateSystem: COPY.debug.coordinateSystem,
        mode: state.mode,
        selectedLevel: state.selectedLevel,
        levelFourUnlocked: this.simulation.isLevelFourUnlocked(),
        metaProgress: state.meta,
        challenge: state.challenge.level ? {
          level: state.challenge.level,
          crowdSeed: state.challenge.crowdSeed,
          timeSeconds: Number(state.challenge.time.toFixed(2)),
          timeRemaining: Number((state.challenge.timeLimit - state.challenge.time).toFixed(2)),
          distanceMeters: Number(state.challenge.distance.toFixed(2)),
          finishDistance: state.challenge.finishDistance,
          speed: Number(state.challenge.currentSpeed.toFixed(2)),
          targetSpeed: Number(state.challenge.targetSpeed.toFixed(2)),
          speedRange: [state.challenge.minSpeed, state.challenge.maxSpeed],
          speedResponse: state.challenge.speedResponse,
          targetAdjustRate: state.challenge.targetAdjustRate,
          lateralSpeed: state.challenge.lateralSpeed,
          input: { speed: state.challenge.speedInput, lateral: state.challenge.lateralInput },
          mood: state.challenge.mood,
          maxMood: state.challenge.maxMood,
          hitDamage: state.challenge.hitDamage,
          hits: state.challenge.hitCount,
          experience: {
            progressAtFailure: Number(state.challenge.failureProgress.toFixed(3)),
            gained: state.challenge.experienceGained,
            before: state.challenge.experienceBefore,
            after: state.challenge.experienceAfter,
            requiredBefore: state.challenge.experienceRequiredBefore,
            requiredAfter: state.challenge.experienceRequiredAfter,
            levelBefore: state.challenge.growthLevelBefore,
            levelAfter: state.challenge.growthLevelAfter,
            availableUpgradePoints: state.meta.upgradePoints[state.challenge.level],
          },
          failureSequence: state.mode === 'challenge-failure' ? {
            elapsed: Number(state.challenge.failureElapsed.toFixed(2)),
            duration: state.challenge.failureDuration,
            remainingMeters: state.challenge.level === 2
              ? Number(Math.max(0, state.challenge.finishDistance - state.challenge.distance).toFixed(2))
              : null,
          } : null,
          victorySequence: state.mode === 'challenge-victory' ? {
            elapsed: Number(state.challenge.victoryElapsed.toFixed(2)),
            duration: state.challenge.victoryDuration,
          } : null,
          resultReason: state.challenge.resultReason || null,
          failureKind: state.challenge.failureKind,
          lastUpgrade: state.challenge.lastUpgrade,
        } : null,
        fourth: state.selectedLevel === 4 || state.mode.startsWith('level-four-') ? {
          pace: state.fourth.pace,
          response: state.fourth.response,
          endingId: state.fourth.endingId,
          timeSeconds: Number(state.fourth.time.toFixed(2)),
          timeRemaining: Number(Math.max(0, state.fourth.duration - state.fourth.time).toFixed(2)),
          duration: state.fourth.duration,
          summaryElapsed: Number(state.fourth.summaryElapsed.toFixed(2)),
          summaryDuration: state.fourth.summaryDuration,
          selectedSpeed: state.fourth.selectedSpeed,
          lateralSpeed: state.fourth.lateralSpeed,
          lateralInput: state.fourth.lateralInput,
          collisions: state.minorBumps + state.strongCollisions,
          unlockedEndings: Object.values(state.meta.fourthEndings).filter(Boolean).length,
          latestEnding: state.meta.latestFourthEnding,
        } : null,
        exitConfirmationOpen: this.ui.isExitConfirmationOpen(),
        availableActions: this.availableActions(),
        player: {
          x: Number(state.player.x.toFixed(2)),
          z: Number(state.player.z.toFixed(2)),
          speedLevel: state.speedLevel,
          speedName: activeSpeed.label,
          speedMetersPerSecond: state.mode === 'level-four-walk' ? state.fourth.selectedSpeed : activeSpeed.value,
          distance: Number(state.distance.toFixed(1)),
        },
        tasks: SPEEDS.map((speed) => ({
          id: speed.id,
          label: speed.label,
          seconds: Number(state.tasks[speed.id].progress.toFixed(2)),
          complete: state.tasks[speed.id].complete,
          active: state.mode === 'walking' && speed.id === activeSpeed.id,
        })),
        speech: state.speech?.text ?? null,
        speechSecondsVisible: state.speech ? Number(state.speech.elapsed.toFixed(2)) : null,
        speechCanContinue: state.speech ? state.speech.elapsed >= SPEECH_CONTINUE_DELAY : null,
        queuedSpeeches: state.speechQueue.length,
        pendingEvaluation: state.pendingEvaluation
          ? {
              speedId: state.pendingEvaluation,
              speedLabel: SPEEDS.find((speed) => speed.id === state.pendingEvaluation)?.label,
              options: SPEEDS.find((speed) => speed.id === state.pendingEvaluation)?.phrases ?? [],
            }
          : null,
        selectedEvaluations: state.selectedEvaluations,
        pausedForSpeech: state.mode === 'walking' && Boolean(state.speech),
        pausedForEvaluation: state.mode === 'walking' && Boolean(state.pendingEvaluation),
        allTasksComplete: state.allTasksComplete,
        nearbyNpcs: state.npcs
          .filter((npc) => Math.abs(npc.z - state.player.z) < 28)
          .slice(0, 8)
          .map((npc) => ({
            id: npc.id,
            randomSeed: npc.randomSeed,
            x: Number(npc.x.toFixed(2)),
            targetX: Number(npc.targetX.toFixed(2)),
            relativeZ: Number((npc.z - state.player.z).toFixed(2)),
            speed: npc.speed,
            avoiding: npc.avoidanceTime > 0,
            avoidanceSeconds: Number(npc.avoidanceTime.toFixed(2)),
          })),
        npcSpeedRange: {
          min: Number(Math.min(...state.npcs.map((npc) => npc.speed)).toFixed(2)),
          max: Number(Math.max(...state.npcs.map((npc) => npc.speed)).toFixed(2)),
          allowedMin: NPC_SPEED_MIN,
          allowedMax: NPC_SPEED_MAX,
        },
        crowdLaneDistribution: {
          center: state.npcs.filter((npc) => Math.abs(npc.targetX) < 1.35).length,
          middle: state.npcs.filter((npc) => Math.abs(npc.targetX) >= 1.35 && Math.abs(npc.targetX) < 2.7).length,
          edges: state.npcs.filter((npc) => Math.abs(npc.targetX) >= 2.7).length,
          uniformSixths: Array.from({ length: 6 }, (_, bin) => state.npcs.filter((npc) => {
            const normalized = (npc.targetX + CHALLENGE_CROWD_HALF_WIDTH) / (CHALLENGE_CROWD_HALF_WIDTH * 2);
            return Math.min(5, Math.max(0, Math.floor(normalized * 6))) === bin;
          }).length),
          outerBands: {
            left: state.npcs.filter((npc) => npc.targetX < -3.6).length,
            right: state.npcs.filter((npc) => npc.targetX > 3.6).length,
          },
        },
        collisions: { minor: state.minorBumps, strong: state.strongCollisions, activeImpact: state.impactTime > 0 },
        crowd: {
          total: state.npcs.length,
          nearbyAhead: state.npcs.filter((npc) => npc.z < state.player.z && npc.z > state.player.z - 35).length,
          nearbyBehind: state.npcs.filter((npc) => npc.z > state.player.z && npc.z < state.player.z + 35).length,
          nearestAhead: Math.min(...state.npcs.filter((npc) => npc.z < state.player.z).map((npc) => state.player.z - npc.z)),
          nearestBehind: Math.min(...state.npcs.filter((npc) => npc.z > state.player.z).map((npc) => npc.z - state.player.z)),
        },
        challengeVisuals: this.renderer.getChallengeVisualDebugState(state),
        collisionContacts: this.physics.getContactDebugState(),
        collisionSpeech: state.impactTextTime > 0
          ? { text: state.impactLabel, secondsRemaining: Number(state.impactTextTime.toFixed(2)) }
          : null,
        street: this.renderer.getStreetDebugState(),
        portraitDialogueReady: state.mode === 'intro' || state.mode === 'return'
          ? this.renderer.isPortraitCameraReady()
          : null,
        audio: this.audio.getDebugState(),
        interaction: state.interaction
          ? {
              kind: state.interaction,
              instruction: state.interaction === 'punch' ? COPY.interaction.punchHint : COPY.interaction.petHint,
              clicks: state.interactionCount,
              targetClicks: INTERACTION_TARGET,
              restartReady: state.interactionCount >= INTERACTION_TARGET,
              feedback: state.interactionCount > 0
                ? COPY.interaction.feedback[state.interaction][(state.interactionCount - 1) % INTERACTION_TARGET]
                : null,
            }
          : null,
      });
    };
  }

  private availableActions(): string[] {
    const state = this.simulation.state;
    if (this.ui.isExitConfirmationOpen()) return [COPY.debug.exitCancel, COPY.debug.exitConfirm];
    if (state.mode === 'intro') return [COPY.debug.start, COPY.debug.share];
    if (state.mode === 'level-select') return ['click #level-card-1..4: select an unlocked level', 'click #balance-editor-open: edit level values', 'click #progress-reset-open: clear progress while keeping edited balance'];
    if (state.mode === 'level-briefing') return ['click #begin-challenge: start run', 'click #briefing-back: level select'];
    if (state.mode === 'challenge') return ['press W/S once or click #challenge-accelerate/#challenge-brake: latch acceleration or braking', 'hold A/D or touch lateral buttons: move laterally', 'Escape: leave run'];
    if (state.mode === 'challenge-failure') return ['wait for the failure sequence to finish'];
    if (state.mode === 'challenge-victory') return ['wait for the victory sequence to finish'];
    if (state.mode === 'upgrade') return state.challenge.level && state.meta.upgradePoints[state.challenge.level] > 0
      ? ['click one #upgrade-* choice', 'click #upgrade-back: level select']
      : ['click #retry-without-upgrade: retry without upgrading', 'click #upgrade-back: level select'];
    if (state.mode === 'victory') return ['click #victory-back: level select'];
    if (state.mode === 'level-four-choice') return ['click [data-fourth-pace]: choose fast, slow, or average pace', 'click #fourth-choice-back: level select'];
    if (state.mode === 'level-four-walk') return ['hold A/D or touch lateral buttons: move laterally', 'wait for the 10-second walk to finish', 'Escape: leave run'];
    if (state.mode === 'level-four-summary') return state.fourth.summaryElapsed >= state.fourth.summaryDuration
      ? ['click #fourth-summary-continue: continue to the reflection choices']
      : ['wait for the continue button to appear'];
    if (state.mode === 'level-four-reflection') return ['click [data-fourth-response]: choose how to interpret the walk'];
    if (state.mode === 'level-four-ending') return ['click #fourth-ending-finish: reveal the latest ending in the map'];
    if (state.mode === 'walking') {
      if (state.pendingEvaluation) return [0, 1, 2].map((index) => COPY.debug.chooseEvaluation(index));
      if (state.speech) return state.speech.elapsed >= SPEECH_CONTINUE_DELAY
        ? [COPY.debug.dismissSpeech]
        : [COPY.debug.waitForSpeech((SPEECH_CONTINUE_DELAY - state.speech.elapsed).toFixed(1))];
      const actions = [COPY.debug.accelerate, COPY.debug.decelerate];
      if (state.allTasksComplete) actions.push(COPY.debug.finish);
      return actions;
    }
    if (state.mode === 'return') return [COPY.debug.punchChoice, COPY.debug.petChoice, COPY.debug.share];
    if (state.mode === 'interaction') return [
      COPY.debug.interact,
      COPY.debug.share,
      ...(state.interactionCount >= INTERACTION_TARGET ? [COPY.debug.depart, COPY.debug.restart] : []),
    ];
    return [COPY.debug.departedRestart];
  }
}

async function bootstrap(): Promise<void> {
  const container = document.querySelector<HTMLElement>('#app');
  if (!container) throw new Error('Missing #app container');
  const loading = document.createElement('div');
  loading.className = 'loading-screen';
  loading.innerHTML = `<span>Walking Sim</span><div><i></i></div><p>${COPY.loading.message}</p>`;
  container.append(loading);

  try {
    const app = await WalkingSimApp.create(container);
    loading.remove();
    app.start();
  } catch (error) {
    console.error(error);
    loading.classList.add('has-error');
    loading.innerHTML = `<strong>${COPY.loading.errorTitle}</strong><p>${error instanceof Error ? error.message : COPY.loading.unknownError}</p><button onclick="location.reload()">${COPY.loading.retry}</button>`;
  }
}

void bootstrap();
