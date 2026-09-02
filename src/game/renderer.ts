import * as THREE from 'three';
import { COPY } from './i18n';
import type { GameState, WalkerState } from './types';

interface CharacterRig {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
}

interface StreetSegment {
  group: THREE.Group;
  logicalIndex: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
}

interface Burst {
  age: number;
  particles: BurstParticle[];
}

interface SpeedFeedback {
  age: number;
  direction: -1 | 1;
  particles: BurstParticle[];
}

const SEGMENT_LENGTH = 30;
const BUILDING_COLORS = [0xe79073, 0xe7bf66, 0x69a99f, 0x7889ad, 0xc98ca0, 0xaab17b];

const seeded = (seed: number): number => {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
};

function standardMaterial(color: number, roughness = 0.82, metalness = 0.02): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function shadowed(mesh: THREE.Mesh): THREE.Mesh {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeCapsuleLike(radius: number, length: number, material: THREE.Material): THREE.Mesh {
  return shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 10), material));
}

function createCharacter(color: number, scale = 1): CharacterRig {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  const skin = standardMaterial(0xf2b89f, 0.9);
  const cloth = standardMaterial(color, 0.76);
  const dark = standardMaterial(0x17313a, 0.9);
  const shoe = standardMaterial(0x14242c, 0.7);

  const torso = makeCapsuleLike(0.34, 0.63, cloth);
  torso.scale.set(1.08, 1, 0.74);
  torso.position.y = 1.28;
  root.add(torso);

  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.24, 10), skin));
  neck.position.y = 1.86;
  root.add(neck);

  const head = new THREE.Group();
  head.position.y = 2.14;
  const skull = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 14), skin));
  skull.scale.set(0.92, 1.08, 0.92);
  head.add(skull);
  const hair = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.305, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), dark));
  hair.position.y = 0.055;
  hair.scale.set(0.95, 1, 0.96);
  head.add(hair);
  root.add(head);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.43, 1.58, 0);
  rightArm.position.set(0.43, 1.58, 0);
  const armGeometry = new THREE.CapsuleGeometry(0.105, 0.56, 4, 8);
  const leftArmMesh = shadowed(new THREE.Mesh(armGeometry, cloth));
  const rightArmMesh = shadowed(new THREE.Mesh(armGeometry, cloth));
  leftArmMesh.position.y = -0.34;
  rightArmMesh.position.y = -0.34;
  leftArm.add(leftArmMesh);
  rightArm.add(rightArmMesh);
  root.add(leftArm, rightArm);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.19, 0.91, 0);
  rightLeg.position.set(0.19, 0.91, 0);
  const legGeometry = new THREE.CapsuleGeometry(0.13, 0.62, 4, 8);
  const leftLegMesh = shadowed(new THREE.Mesh(legGeometry, dark));
  const rightLegMesh = shadowed(new THREE.Mesh(legGeometry, dark));
  leftLegMesh.position.y = -0.39;
  rightLegMesh.position.y = -0.39;
  leftLeg.add(leftLegMesh);
  rightLeg.add(rightLegMesh);

  const leftShoe = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.43), shoe));
  const rightShoe = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.43), shoe));
  leftShoe.position.set(0, -0.79, -0.07);
  rightShoe.position.set(0, -0.79, -0.07);
  leftLeg.add(leftShoe);
  rightLeg.add(rightShoe);
  root.add(leftLeg, rightLeg);

  return { root, leftArm, rightArm, leftLeg, rightLeg, head };
}

function createLiBust(): { group: THREE.Group; head: THREE.Group; faceMaterial: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const jacket = standardMaterial(0x1e5260, 0.66);
  const shirt = standardMaterial(0xf4e8cc, 0.9);
  const skin = standardMaterial(0xeeb296, 0.86);
  const hairMaterial = standardMaterial(0x17292e, 0.72);
  const gold = standardMaterial(0xe2ad43, 0.4, 0.45);

  const torso = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.72, 1.12, 8, 20), jacket));
  torso.position.y = 0.76;
  torso.scale.set(1.18, 1, 0.58);
  group.add(torso);

  const shirtPanel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.9, 0.08), shirt));
  shirtPanel.position.set(0, 1.04, 0.46);
  shirtPanel.rotation.x = -0.12;
  group.add(shirtPanel);

  const collarLeft = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.54, 3), jacket));
  const collarRight = collarLeft.clone();
  collarLeft.position.set(-0.3, 1.35, 0.53);
  collarRight.position.set(0.3, 1.35, 0.53);
  collarLeft.rotation.z = -0.3;
  collarRight.rotation.z = 0.3;
  group.add(collarLeft, collarRight);

  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.44, 16), skin));
  neck.position.y = 1.73;
  group.add(neck);

  const head = new THREE.Group();
  head.position.y = 2.35;
  const face = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.59, 32, 24), skin));
  face.scale.set(0.88, 1.04, 0.83);
  head.add(face);

  const earGeometry = new THREE.SphereGeometry(0.13, 12, 10);
  const leftEar = shadowed(new THREE.Mesh(earGeometry, skin));
  const rightEar = shadowed(new THREE.Mesh(earGeometry, skin));
  leftEar.position.x = -0.55;
  rightEar.position.x = 0.55;
  head.add(leftEar, rightEar);

  const hair = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMaterial));
  hair.position.y = 0.08;
  hair.scale.set(0.9, 1.02, 0.87);
  head.add(hair);
  const fringe = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.24), hairMaterial));
  fringe.position.set(0.04, 0.43, 0.42);
  fringe.rotation.z = -0.12;
  head.add(fringe);

  const frameMaterial = standardMaterial(0x183b43, 0.35, 0.35);
  const lensGeometry = new THREE.TorusGeometry(0.19, 0.025, 8, 24);
  const leftLens = shadowed(new THREE.Mesh(lensGeometry, frameMaterial));
  const rightLens = shadowed(new THREE.Mesh(lensGeometry, frameMaterial));
  leftLens.position.set(-0.22, 0.05, 0.52);
  rightLens.position.set(0.22, 0.05, 0.52);
  const bridge = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.035), frameMaterial));
  bridge.position.set(0, 0.05, 0.52);
  head.add(leftLens, rightLens, bridge);

  const nose = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.23, 10), skin));
  nose.position.set(0, -0.05, 0.58);
  nose.rotation.x = Math.PI / 2;
  head.add(nose);
  const mouth = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.035), hairMaterial));
  mouth.position.set(0, -0.28, 0.52);
  head.add(mouth);
  group.add(head);

  const pin = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 16), gold));
  pin.position.set(0.47, 1.25, 0.54);
  pin.rotation.x = Math.PI / 2;
  group.add(pin);

  return { group, head, faceMaterial: skin };
}

export class GameRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);
  private readonly worldGroup = new THREE.Group();
  private readonly portraitGroup = new THREE.Group();
  private readonly streetSegments: StreetSegment[] = [];
  private readonly characterRigs = new Map<string, CharacterRig>();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly portraitCameraPosition = new THREE.Vector3(0, 2.65, 7.1);
  private readonly projected = new THREE.Vector3();
  private readonly clockDirection = new THREE.Vector3();
  private readonly bursts: Burst[] = [];
  private readonly speedFeedbacks: SpeedFeedback[] = [];
  private readonly finishGate: THREE.Group;
  private readonly liHead: THREE.Group;
  private readonly liFaceMaterial: THREE.MeshStandardMaterial;
  private lastImpactTime = 0;
  private lastInteractionCount = 0;
  private currentSegmentCenter = Number.NaN;
  private elapsed = 0;
  private speedFeedbackCooldown = 0;
  private lastSpeedFeedbackDirection: -1 | 0 | 1 = 0;

  constructor(container: HTMLElement, state: GameState) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game-canvas';
    this.canvas.setAttribute('aria-label', COPY.canvasLabel);
    container.prepend(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x9ed7df);
    this.scene.fog = new THREE.Fog(0xaedbe1, 50, 155);
    this.scene.add(this.worldGroup, this.portraitGroup);
    this.setupLights();
    this.createStreet();
    this.finishGate = this.createFinishGate();
    this.worldGroup.add(this.finishGate);
    this.createCrowd(state);
    const bust = createLiBust();
    this.liHead = bust.head;
    this.liFaceMaterial = bust.faceMaterial;
    this.createPortraitSet(bust.group);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => event.preventDefault());
  }

  private setupLights(): void {
    const hemi = new THREE.HemisphereLight(0xe6fbff, 0x69745f, 2.25);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff3d4, 3.25);
    sun.position.set(18, 28, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 85;
    this.scene.add(sun);
  }

  private createStreet(): void {
    for (let index = 0; index < 14; index += 1) {
      const group = this.buildStreetSegment(index);
      this.worldGroup.add(group);
      this.streetSegments.push({ group, logicalIndex: 0 });
    }
  }

  private createFinishGate(): THREE.Group {
    const group = new THREE.Group();
    group.position.z = -360;
    const yellow = standardMaterial(0xf5c84f, 0.62);
    const ink = standardMaterial(0x17313a, 0.7);
    // The third level starts far from the exit. Keep the gate readable through
    // the atmospheric fog so it can act as a fixed visual goal from frame one.
    yellow.fog = false;
    ink.fog = false;

    [-4.45, 4.45].forEach((x) => {
      const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.38, 5.6, 0.42), yellow));
      post.position.set(x, 2.75, 0);
      group.add(post);
      for (let index = 0; index < 5; index += 1) {
        const band = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.28, 0.46), ink));
        band.position.set(x, 0.8 + index * 1.05, 0);
        group.add(band);
      }
    });

    const crossbar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.5, 0.48), yellow));
    crossbar.position.y = 5.35;
    group.add(crossbar);
    for (let index = 0; index < 12; index += 1) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 0.52), index % 2 === 0 ? ink : yellow);
      tile.position.set(-4.29 + index * 0.78, 5.36, 0);
      group.add(tile);
    }

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const context = labelCanvas.getContext('2d');
    if (context) {
      context.fillStyle = '#17313a';
      context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
      context.fillStyle = '#fff3d7';
      context.font = '900 66px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('FINISH', 256, 68);
    }
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 1.18),
      new THREE.MeshBasicMaterial({ map: labelTexture, side: THREE.DoubleSide, fog: false }),
    );
    label.position.set(0, 4.55, 0.27);
    group.add(label);

    for (let index = 0; index < 12; index += 1) {
      const lineTile = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.035, 1.15),
        index % 2 === 0 ? ink : yellow,
      );
      lineTile.position.set(-4.18 + index * 0.76, 0.025, 0);
      lineTile.receiveShadow = true;
      group.add(lineTile);
    }
    group.visible = false;
    return group;
  }

  private buildStreetSegment(seed: number): THREE.Group {
    const group = new THREE.Group();
    const roadMaterial = standardMaterial(seed % 2 === 0 ? 0x51656a : 0x4b6065, 0.96);
    const sidewalkMaterial = standardMaterial(0xd9cfb7, 0.93);
    const curbMaterial = standardMaterial(0xf4e7c8, 0.9);

    const road = shadowed(new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, SEGMENT_LENGTH + 0.15), roadMaterial));
    road.position.y = -0.11;
    group.add(road);

    [-7.4, 7.4].forEach((x) => {
      const sidewalk = shadowed(new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.34, SEGMENT_LENGTH + 0.1), sidewalkMaterial));
      sidewalk.position.set(x, 0.02, 0);
      group.add(sidewalk);
      const curb = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.38, SEGMENT_LENGTH + 0.1), curbMaterial));
      curb.position.set(Math.sign(x) * 5.58, 0.06, 0);
      group.add(curb);
    });

    [-1.28, 1.28].forEach((x) => {
      for (let z = -11; z <= 11; z += 7.5) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 3.3), standardMaterial(0xc8d2ca, 0.8));
        marker.position.set(x, 0.005, z);
        group.add(marker);
      }
    });

    [-1, 1].forEach((side, sideIndex) => {
      for (let slot = 0; slot < 2; slot += 1) {
        const localSeed = seed * 11 + sideIndex * 5 + slot;
        const width = 5.2 + seeded(localSeed) * 2.7;
        const height = 7.5 + seeded(localSeed + 1) * 11;
        const depth = 10.5 + seeded(localSeed + 2) * 3;
        const building = shadowed(new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          standardMaterial(BUILDING_COLORS[(seed + slot + sideIndex * 2) % BUILDING_COLORS.length], 0.88),
        ));
        building.position.set(side * (11.6 + width * 0.15), height / 2, -7.3 + slot * 14.5);
        group.add(building);

        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x315b66, emissive: 0x173039, emissiveIntensity: 0.18, roughness: 0.42 });
        for (let row = 0; row < Math.min(4, Math.floor(height / 3)); row += 1) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(width * 0.64, 0.75, 0.08), windowMaterial);
          strip.position.set(side * (11.6 + width * 0.15 - side * (depth / 2 + 0.045)), 2.1 + row * 2.4, building.position.z);
          strip.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          group.add(strip);
        }

        const awning = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 2.2), standardMaterial(0xf1cf66, 0.74)));
        awning.position.set(side * 9.65, 2.25, building.position.z + (slot === 0 ? 1.8 : -1.8));
        group.add(awning);
      }

      const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.5, 8), standardMaterial(0x26434a, 0.6, 0.18)));
      pole.position.set(side * 5.95, 1.78, seed % 2 === 0 ? -10 : 9);
      group.add(pole);
      const lamp = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8), standardMaterial(0xffe8a4, 0.28, 0.1)));
      lamp.position.set(pole.position.x, 3.46, pole.position.z);
      group.add(lamp);

      const trunk = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.5, 7), standardMaterial(0x80583d, 0.96)));
      trunk.position.set(side * 7.1, 0.9, seed % 2 === 0 ? 8 : -8);
      group.add(trunk);
      const crown = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 1), standardMaterial(0x5f9c6e, 0.94)));
      crown.position.set(trunk.position.x, 2.1, trunk.position.z);
      crown.scale.set(0.92, 1.25, 0.92);
      group.add(crown);
    });

    return group;
  }

  private createCrowd(state: GameState): void {
    [state.player, ...state.npcs].forEach((walker) => {
      const rig = createCharacter(walker.color, walker.scale);
      rig.root.position.set(walker.x, 0, walker.z);
      this.characterRigs.set(walker.id, rig);
      this.worldGroup.add(rig.root);
    });
  }

  private createPortraitSet(bust: THREE.Group): void {
    this.portraitGroup.add(bust);
    const backdrop = shadowed(new THREE.Mesh(new THREE.BoxGeometry(13, 8, 0.4), standardMaterial(0x173a43, 0.82)));
    backdrop.position.set(0, 2.5, -1.5);
    this.portraitGroup.add(backdrop);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.055, 10, 64),
      new THREE.MeshBasicMaterial({ color: 0xf2c451 }),
    );
    halo.position.set(0, 2.15, -0.82);
    this.portraitGroup.add(halo);

    const platform = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.65, 0.55, 32), standardMaterial(0x316773, 0.65)));
    platform.position.y = -0.34;
    this.portraitGroup.add(platform);

    for (let index = 0; index < 18; index += 1) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), new THREE.MeshBasicMaterial({ color: 0x6ec9c4 }));
      const angle = (index / 18) * Math.PI * 2;
      dash.position.set(Math.cos(angle) * 2.7, 2.15 + Math.sin(angle) * 2.7, -0.78);
      dash.rotation.z = angle;
      this.portraitGroup.add(dash);
    }
  }

  update(state: GameState, dt: number): void {
    const worldMode = ['level-briefing', 'challenge', 'challenge-failure', 'challenge-victory', 'upgrade', 'victory', 'level-four-choice', 'level-four-walk', 'level-four-summary', 'level-four-reflection', 'level-four-ending', 'walking'].includes(state.mode);
    const worldRunning = state.mode === 'challenge' || state.mode === 'challenge-failure' || state.mode === 'challenge-victory' || state.mode === 'level-four-walk' || (state.mode === 'walking' && !state.speech && !state.pendingEvaluation);
    const sceneDt = worldRunning ? dt : 0;
    this.elapsed += sceneDt;
    this.worldGroup.visible = worldMode;
    this.portraitGroup.visible = !worldMode;
    const hasFinishGate = state.challenge.level === 2 || state.challenge.level === 3;
    this.finishGate.visible = worldMode && hasFinishGate;
    if (hasFinishGate) this.finishGate.position.z = -state.challenge.finishDistance;

    if (worldMode) {
      this.updateStreet(state.player.z);
      this.updateCharacters(state, sceneDt);
      this.updateFollowCamera(state, sceneDt);
      this.updateBursts(state, sceneDt);
      this.updateSpeedFeedback(state, sceneDt);
    } else {
      this.updatePortrait(state, dt);
    }
    this.lastImpactTime = state.impactTime;
    this.renderer.render(this.scene, this.camera);
  }

  private updateStreet(playerZ: number): void {
    const center = Math.floor(playerZ / SEGMENT_LENGTH);
    if (center === this.currentSegmentCenter) return;
    this.currentSegmentCenter = center;
    const segmentCount = this.streetSegments.length;
    for (let offset = 0; offset < segmentCount; offset += 1) {
      const logicalIndex = center + offset - 10;
      const physicalIndex = ((logicalIndex % segmentCount) + segmentCount) % segmentCount;
      const segment = this.streetSegments[physicalIndex];
      segment.logicalIndex = logicalIndex;
      segment.group.position.z = logicalIndex * SEGMENT_LENGTH;
    }
  }

  getStreetDebugState(): { center: number | null; logicalIndices: number[] } {
    return {
      center: Number.isFinite(this.currentSegmentCenter) ? this.currentSegmentCenter : null,
      logicalIndices: this.streetSegments.map((segment) => segment.logicalIndex),
    };
  }

  private updateCharacters(state: GameState, dt: number): void {
    [state.player, ...state.npcs].forEach((walker) => {
      const rig = this.characterRigs.get(walker.id);
      if (!rig) return;
      rig.root.position.set(walker.x, 0, walker.z);
      const strideSpeed = walker.id === 'player' ? state.player.speed : walker.speed;
      walker.phase += dt * (2.2 + strideSpeed * 1.5);
      const intensity = Math.min(1, strideSpeed / 4.3);
      const swing = Math.sin(walker.phase) * 0.62 * intensity;
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.72;
      rig.rightArm.rotation.x = swing * 0.72;
      rig.leftArm.rotation.z *= Math.pow(0.01, dt);
      rig.rightArm.rotation.z *= Math.pow(0.01, dt);
      rig.root.position.y = strideSpeed > 0 ? Math.abs(Math.sin(walker.phase * 2)) * 0.035 * intensity : 0;
      if (walker.id === 'player') {
        rig.root.rotation.z *= Math.pow(0.01, dt);
      } else {
        const sidestepLean = Math.max(-0.16, Math.min(0.16, (walker.targetX - walker.x) * -0.14));
        rig.root.rotation.z += (sidestepLean - rig.root.rotation.z) * (1 - Math.exp(-dt * 10));
      }
    });

    const playerRig = this.characterRigs.get('player');
    if (playerRig) {
      playerRig.root.rotation.x *= Math.pow(0.02, dt);
      if (state.impactTime > 0) {
        playerRig.root.rotation.z = Math.sin(state.impactTime * 25) * 0.18 * state.impactStrength;
        playerRig.root.rotation.x = -0.18 * state.impactStrength;
      } else if (state.mode === 'challenge-failure' && state.challenge.failureKind === 'cried') {
        const sob = Math.sin(state.challenge.failureElapsed * 10);
        playerRig.root.rotation.x = 0.22 + sob * 0.035;
        playerRig.root.rotation.z = sob * 0.045;
        playerRig.head.rotation.x = -0.38 + sob * 0.06;
        playerRig.leftArm.rotation.x = -0.35 + sob * 0.08;
        playerRig.rightArm.rotation.x = -0.35 - sob * 0.08;
        playerRig.leftArm.rotation.z = 2.28 + sob * 0.08;
        playerRig.rightArm.rotation.z = -2.28 - sob * 0.08;
      } else if (state.mode === 'challenge-victory') {
        const cheer = Math.sin(state.challenge.victoryElapsed * 8);
        playerRig.root.position.y = 0.08 + Math.max(0, cheer) * 0.09;
        playerRig.root.rotation.z = cheer * 0.025;
        playerRig.head.rotation.x = -0.12 + cheer * 0.025;
        playerRig.leftArm.rotation.z = -2.32 - cheer * 0.08;
        playerRig.rightArm.rotation.z = 2.32 + cheer * 0.08;
      } else {
        playerRig.head.rotation.x *= Math.pow(0.02, dt);
      }
    }
  }

  private updateFollowCamera(state: GameState, dt: number): void {
    const shake = dt > 0 && state.impactTime > 0 ? state.impactStrength * Math.min(1, state.impactTime * 3) : 0;
    const desired = new THREE.Vector3(state.player.x, 4.15, state.player.z + 7.8);
    // A deterministic test step can advance many seconds without intermediate
    // renders. Snap once if the paused camera is still far behind the player.
    const follow = dt === 0 && this.camera.position.distanceTo(desired) > 15
      ? 1
      : 1 - Math.exp(-dt * 7.5);
    this.camera.position.lerp(desired, follow);
    if (shake > 0) {
      this.camera.position.x += (seeded(this.elapsed * 91) - 0.5) * shake * 0.55;
      this.camera.position.y += (seeded(this.elapsed * 47) - 0.5) * shake * 0.36;
    }
    this.cameraTarget.set(state.player.x, 1.28, state.player.z - 5.8);
    this.camera.lookAt(this.cameraTarget);
  }

  private updatePortrait(state: GameState, dt: number): void {
    const target = new THREE.Vector3(0, 2.2, 0);
    this.camera.position.lerp(this.portraitCameraPosition, 1 - Math.exp(-dt * 5));
    this.camera.lookAt(target);
    this.liHead.rotation.y = Math.sin(this.elapsed * 0.72) * 0.035;
    this.liHead.rotation.z *= Math.pow(0.02, dt);
    this.liHead.position.x *= Math.pow(0.02, dt);
    this.liHead.position.y += (2.35 - this.liHead.position.y) * (1 - Math.exp(-dt * 9));
    this.liFaceMaterial.emissive.setHex(0x000000);

    if (state.mode === 'interaction' && state.interactionCount > this.lastInteractionCount) {
      this.lastInteractionCount = state.interactionCount;
    }
    if (state.mode === 'interaction' && state.impactTime > 0) {
      if (state.interaction === 'punch') {
        const force = Math.sin((0.5 - state.impactTime) * 24) * state.impactStrength;
        this.liHead.position.x = force * 0.28;
        this.liHead.rotation.z = -force * 0.18;
        this.liFaceMaterial.emissive.setHex(0x5c120d);
        this.liFaceMaterial.emissiveIntensity = 0.6;
      } else {
        this.liHead.rotation.z = -0.12 * Math.sin(state.impactTime * 8);
        this.liHead.position.y = 2.31;
        this.liFaceMaterial.emissive.setHex(0x49251f);
        this.liFaceMaterial.emissiveIntensity = 0.18;
      }
    }
  }

  isPortraitCameraReady(): boolean {
    return this.camera.position.distanceTo(this.portraitCameraPosition) < 0.18;
  }

  private updateBursts(state: GameState, dt: number): void {
    if (state.impactTime > this.lastImpactTime + 0.3 && state.impactStrength > 0.6) {
      const particles: BurstParticle[] = [];
      for (let index = 0; index < 16; index += 1) {
        const color = index % 2 === 0 ? 0xf5cf51 : 0xf36c50;
        const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.08 + (index % 3) * 0.025), new THREE.MeshBasicMaterial({ color }));
        mesh.position.set(state.player.x, 1.25, state.player.z - 0.15);
        this.worldGroup.add(mesh);
        const angle = (index / 16) * Math.PI * 2;
        particles.push({ mesh, velocity: new THREE.Vector3(Math.cos(angle) * 3.4, 1.8 + (index % 4) * 0.5, Math.sin(angle) * 2.4) });
      }
      this.bursts.push({ age: 0, particles });
    }

    for (let burstIndex = this.bursts.length - 1; burstIndex >= 0; burstIndex -= 1) {
      const burst = this.bursts[burstIndex];
      burst.age += dt;
      burst.particles.forEach((particle) => {
        particle.velocity.y -= 5.8 * dt;
        particle.mesh.position.addScaledVector(particle.velocity, dt);
        particle.mesh.rotation.x += dt * 8;
        particle.mesh.rotation.z += dt * 11;
        particle.mesh.scale.setScalar(Math.max(0, 1 - burst.age / 0.8));
      });
      if (burst.age > 0.8) {
        burst.particles.forEach((particle) => {
          this.worldGroup.remove(particle.mesh);
          particle.mesh.geometry.dispose();
          (particle.mesh.material as THREE.Material).dispose();
        });
        this.bursts.splice(burstIndex, 1);
      }
    }
  }

  private updateSpeedFeedback(state: GameState, dt: number): void {
    if (state.mode !== 'challenge') {
      this.clearSpeedFeedback();
      return;
    }

    this.speedFeedbackCooldown = Math.max(0, this.speedFeedbackCooldown - dt);
    const direction = state.challenge.speedInput;
    if (direction !== 0 && dt > 0 && this.speedFeedbackCooldown === 0) {
      this.speedFeedbackCooldown = 0.16;
      this.lastSpeedFeedbackDirection = direction;
      const particles: BurstParticle[] = [];
      for (let index = 0; index < 14; index += 1) {
        const angle = (index / 14) * Math.PI * 2;
        const primary = direction > 0 ? 0xf5c84f : 0xed715b;
        const secondary = direction > 0 ? 0x6dc7bd : 0x9d78df;
        const material = new THREE.MeshBasicMaterial({
          color: index % 2 === 0 ? primary : secondary,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.11 + (index % 3) * 0.025), material);
        mesh.position.set(
          state.player.x + Math.cos(angle) * 0.72,
          0.45 + (index % 4) * 0.34,
          state.player.z + Math.sin(angle) * 0.5,
        );
        this.worldGroup.add(mesh);
        const longitudinal = direction > 0 ? 2.4 : -1.7;
        particles.push({
          mesh,
          velocity: new THREE.Vector3(Math.cos(angle) * 0.85, 0.35 + (index % 3) * 0.22, longitudinal + Math.sin(angle) * 0.45),
        });
      }
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: direction > 0 ? 0x6dc7bd : 0xed715b,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.75, 32), ringMaterial);
      ring.position.set(state.player.x, 0.12, state.player.z);
      ring.rotation.x = -Math.PI / 2;
      this.worldGroup.add(ring);
      particles.push({ mesh: ring, velocity: new THREE.Vector3(0, 0.18, direction > 0 ? 1.25 : -0.8) });
      this.speedFeedbacks.push({ age: 0, direction, particles });
    }

    for (let burstIndex = this.speedFeedbacks.length - 1; burstIndex >= 0; burstIndex -= 1) {
      const feedback = this.speedFeedbacks[burstIndex];
      feedback.age += dt;
      const life = Math.max(0, 1 - feedback.age / 0.9);
      feedback.particles.forEach((particle) => {
        particle.mesh.position.addScaledVector(particle.velocity, dt);
        particle.mesh.rotation.x += dt * 12;
        particle.mesh.rotation.y += dt * 9;
        particle.mesh.scale.setScalar(0.72 + (1 - life) * 1.15);
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = life * 0.92;
      });
      if (feedback.age >= 0.9) {
        this.disposeParticles(feedback.particles);
        this.speedFeedbacks.splice(burstIndex, 1);
      }
    }
  }

  private clearSpeedFeedback(): void {
    this.speedFeedbacks.forEach((feedback) => this.disposeParticles(feedback.particles));
    this.speedFeedbacks.length = 0;
    this.speedFeedbackCooldown = 0;
    this.lastSpeedFeedbackDirection = 0;
  }

  private disposeParticles(particles: BurstParticle[]): void {
    particles.forEach((particle) => {
      this.worldGroup.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
  }

  getChallengeVisualDebugState(state: GameState): {
    finishGateVisible: boolean;
    finishGateDistanceAhead: number | null;
    speedFeedbackBursts: number;
    speedFeedbackDirection: -1 | 0 | 1;
  } {
    return {
      finishGateVisible: this.finishGate.visible,
      finishGateDistanceAhead: this.finishGate.visible ? Number((state.player.z - this.finishGate.position.z).toFixed(2)) : null,
      speedFeedbackBursts: this.speedFeedbacks.length,
      speedFeedbackDirection: this.lastSpeedFeedbackDirection,
    };
  }

  getPlayerScreenPosition(state: GameState): { x: number; y: number; visible: boolean } {
    this.projected.set(state.player.x, 2.75, state.player.z).project(this.camera);
    return {
      x: (this.projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.projected.y * 0.5 + 0.5) * window.innerHeight,
      visible: this.projected.z > -1 && this.projected.z < 1,
    };
  }

  getPortraitScreenPosition(): { x: number; y: number; visible: boolean } {
    this.liHead.getWorldPosition(this.projected).project(this.camera);
    return {
      x: (this.projected.x * 0.5 + 0.5) * window.innerWidth,
      y: (-this.projected.y * 0.5 + 0.5) * window.innerHeight,
      visible: this.projected.z > -1 && this.projected.z < 1,
    };
  }

  resize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
