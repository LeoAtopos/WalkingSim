import RAPIER from '@dimforge/rapier3d-compat';
import { SPEEDS, STRONG_COLLISION_SPEED_GAP, type CollisionSide, type GameState, type WalkerState } from './types';
import { randomStreetX, type WalkingSimulation } from './simulation';

interface PhysicsWalker {
  id: string;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
}

export class CrowdPhysics {
  private world: RAPIER.World;
  private eventQueue: RAPIER.EventQueue;
  private walkers = new Map<string, PhysicsWalker>();
  private colliderOwners = new Map<number, string>();
  private playerContacts = new Set<string>();
  private contactAges = new Map<string, number>();
  private strongContacts = new Set<string>();
  private longestContact = 0;
  private lastSpeedLevel = 2;
  private rearSpawnCooldown = 0;

  private constructor(private readonly simulation: WalkingSimulation) {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.createBodies(simulation.state);
  }

  static async create(simulation: WalkingSimulation): Promise<CrowdPhysics> {
    await RAPIER.init();
    return new CrowdPhysics(simulation);
  }

  private createBodies(state: GameState): void {
    [state.player, ...state.npcs].forEach((walker) => {
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(walker.x, 1.02, walker.z)
        .setLinearDamping(1.5)
        .setAngularDamping(12)
        .lockRotations()
        .setCcdEnabled(true);
      const body = this.world.createRigidBody(bodyDesc);
      const colliderDesc = RAPIER.ColliderDesc.capsule(0.47 * walker.scale, 0.53 * walker.scale)
        .setRestitution(0.05)
        .setFriction(0.18)
        .setDensity(1.25)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
      const collider = this.world.createCollider(colliderDesc, body);
      const entry = { id: walker.id, body, collider };
      this.walkers.set(walker.id, entry);
      this.colliderOwners.set(collider.handle, walker.id);
    });
  }

  reset(state: GameState): void {
    this.playerContacts.clear();
    this.contactAges.clear();
    this.strongContacts.clear();
    this.longestContact = 0;
    this.lastSpeedLevel = state.speedLevel;
    this.rearSpawnCooldown = 0;
    [state.player, ...state.npcs].forEach((walker) => {
      const entry = this.walkers.get(walker.id);
      if (!entry) return;
      entry.body.setTranslation({ x: walker.x, y: 1.02, z: walker.z }, true);
      entry.body.setLinvel({ x: 0, y: 0, z: -walker.speed }, true);
    });
  }

  update(dt: number): void {
    const state = this.simulation.state;
    if (state.mode !== 'walking' || state.speech || state.pendingEvaluation) return;

    this.playerContacts.forEach((id) => {
      const age = (this.contactAges.get(id) ?? 0) + dt;
      this.contactAges.set(id, age);
      this.longestContact = Math.max(this.longestContact, age);
    });

    this.rearSpawnCooldown = Math.max(0, this.rearSpawnCooldown - dt);
    if (state.speedLevel === 0) {
      const nearbyBehind = state.npcs.filter((npc) => npc.z > state.player.z + 3 && npc.z < state.player.z + 30).length;
      if (this.lastSpeedLevel !== 0 || (nearbyBehind === 0 && this.rearSpawnCooldown === 0)) {
        this.seedRearTraffic(state);
        this.rearSpawnCooldown = 3.4;
      }
    } else {
      this.rearSpawnCooldown = 0;
    }
    this.lastSpeedLevel = state.speedLevel;

    const allWalkers = [state.player, ...state.npcs];
    allWalkers.forEach((walker) => this.driveWalker(walker, dt, state));
    this.world.timestep = dt;
    this.world.step(this.eventQueue);

    this.eventQueue.drainCollisionEvents((handleA, handleB, started) => {
      const idA = this.colliderOwners.get(handleA);
      const idB = this.colliderOwners.get(handleB);
      if (!idA || !idB || (idA !== 'player' && idB !== 'player')) return;
      const otherId = idA === 'player' ? idB : idA;
      if (!started) {
        this.playerContacts.delete(otherId);
        this.contactAges.delete(otherId);
        this.strongContacts.delete(otherId);
        return;
      }
      this.playerContacts.add(otherId);
      this.contactAges.set(otherId, 0);
      const other = state.npcs.find((npc) => npc.id === otherId);
      if (!other) return;
      const relativeSpeed = Math.abs(SPEEDS[state.speedLevel].value - other.speed);
      this.simulation.registerCollision(relativeSpeed, otherId, this.getCollisionSide(otherId));
      this.pushNpcAside(otherId, relativeSpeed);
      if (relativeSpeed >= STRONG_COLLISION_SPEED_GAP) this.strongContacts.add(otherId);
    });

    // A walker can accelerate while already touching somebody. Upgrade that
    // sustained contact once when its current speed gap becomes dangerous.
    this.playerContacts.forEach((otherId) => {
      if (this.strongContacts.has(otherId)) return;
      const other = state.npcs.find((npc) => npc.id === otherId);
      if (!other) return;
      const relativeSpeed = Math.abs(SPEEDS[state.speedLevel].value - other.speed);
      if (relativeSpeed < STRONG_COLLISION_SPEED_GAP) return;
      this.simulation.registerCollision(relativeSpeed, otherId, this.getCollisionSide(otherId));
      this.pushNpcAside(otherId, relativeSpeed);
      this.strongContacts.add(otherId);
    });

    allWalkers.forEach((walker) => {
      const body = this.walkers.get(walker.id)?.body;
      if (!body) return;
      const position = body.translation();
      walker.x = position.x;
      walker.z = position.z;
    });

    this.recenterPlayer(state, dt);

    this.recycleCrowd(state);
  }

  private recenterPlayer(state: GameState, dt: number): void {
    const body = this.walkers.get('player')?.body;
    if (!body) return;
    const position = body.translation();
    if (Math.abs(position.x) < 0.002) return;

    // Pull collision displacement back to the street centre in well under
    // half a second, while leaving forward velocity and collision response intact.
    const correctedX = position.x * Math.exp(-14 * dt);
    const snappedX = Math.abs(correctedX) < 0.012 ? 0 : correctedX;
    const velocity = body.linvel();
    body.setTranslation({ x: snappedX, y: 1.02, z: position.z }, true);
    body.setLinvel({ x: 0, y: 0, z: velocity.z }, true);
    state.player.x = snappedX;
  }

  private driveWalker(walker: WalkerState, dt: number, state: GameState): void {
    const entry = this.walkers.get(walker.id);
    if (!entry) return;
    const body = entry.body;
    const position = body.translation();
    const velocity = body.linvel();
    const isPlayer = walker.id === 'player';
    const targetSpeed = isPlayer ? SPEEDS[state.speedLevel].value : walker.speed;
    const isAvoiding = !isPlayer && walker.avoidanceTime > 0;
    const response = isPlayer ? 12 : isAvoiding ? 8.2 : 2.35;
    const amount = Math.min(1, dt * response);
    const lateralLimit = isPlayer ? 12 : isAvoiding ? 6.2 : 1.15;
    const lateralPull = (walker.targetX - position.x) * (isPlayer ? 14 : isAvoiding ? 4.8 : 1.65);
    const targetXVelocity = Math.max(-lateralLimit, Math.min(lateralLimit, lateralPull));
    const nextX = velocity.x + (targetXVelocity - velocity.x) * amount;
    const nextZ = velocity.z + (-targetSpeed - velocity.z) * amount;

    body.setLinvel({ x: nextX, y: 0, z: nextZ }, true);
    if (Math.abs(position.y - 1.02) > 0.01) {
      body.setTranslation({ x: position.x, y: 1.02, z: position.z }, true);
    }
  }

  private getCollisionSide(otherId: string): CollisionSide {
    const state = this.simulation.state;
    const otherSpeed = state.npcs.find((npc) => npc.id === otherId)?.speed ?? SPEEDS[state.speedLevel].value;
    return SPEEDS[state.speedLevel].value >= otherSpeed ? 'ahead' : 'behind';
  }

  private pushNpcAside(otherId: string, relativeSpeed: number): void {
    const npc = this.simulation.state.npcs.find((walker) => walker.id === otherId);
    const body = this.walkers.get(otherId)?.body;
    if (!npc || !body) return;
    const position = body.translation();
    const velocity = body.linvel();
    let direction = Math.sign(npc.targetX - position.x);
    if (direction === 0) direction = Number(otherId.split('-')[1]) % 2 === 0 ? -1 : 1;
    const strong = relativeSpeed >= STRONG_COLLISION_SPEED_GAP;
    const shift = strong ? 1.15 : 0.82;
    let nextX = Math.max(-4.15, Math.min(4.15, position.x + direction * shift));
    if (Math.abs(nextX - position.x) < shift * 0.45) {
      direction *= -1;
      nextX = Math.max(-4.15, Math.min(4.15, position.x + direction * shift));
      npc.targetX = Math.max(-4.15, Math.min(4.15, position.x + direction * (strong ? 3.05 : 2.15)));
    }
    body.setTranslation({ x: nextX, y: 1.02, z: position.z }, true);
    body.setLinvel({ x: direction * (strong ? 6.4 : 4.4), y: 0, z: velocity.z }, true);
    npc.x = nextX;
  }

  private recycleCrowd(state: GameState): void {
    state.npcs.forEach((npc, index) => {
      let nextZ: number | null = null;
      if (npc.z > state.player.z + 34) {
        nextZ = state.player.z - 72 - index * 5.4;
      } else if (npc.z < state.player.z - (state.speedLevel <= 1 ? 65 : 185)) {
        nextZ = state.player.z + 22 + (index % 4) * 5;
      }
      if (nextZ === null) return;

      npc.recycles += 1;
      npc.targetX = randomStreetX(index * 7.93 + npc.recycles * 19.17);
      npc.x = npc.targetX;
      npc.z = nextZ + ((index * 31 + npc.recycles * 17) % 11) - 5;
      npc.avoidanceTime = 0;
      this.playerContacts.delete(npc.id);
      this.contactAges.delete(npc.id);
      this.strongContacts.delete(npc.id);
      const body = this.walkers.get(npc.id)?.body;
      if (!body) return;
      body.setTranslation({ x: npc.x, y: 1.02, z: npc.z }, true);
      body.setLinvel({ x: 0, y: 0, z: -npc.speed }, true);
    });
  }

  private seedRearTraffic(state: GameState): void {
    const candidates = [...state.npcs]
      .filter((npc) => Math.abs(npc.z - state.player.z) > 18 && !this.playerContacts.has(npc.id))
      .sort((a, b) => a.z - b.z)
      .slice(0, 2);

    candidates.forEach((npc, index) => {
      npc.targetX = state.player.x + (index === 0 ? 0.2 : -0.24);
      npc.x = npc.targetX;
      npc.z = state.player.z + 9 + index * 9;
      npc.avoidanceTime = 0;
      const body = this.walkers.get(npc.id)?.body;
      if (!body) return;
      body.setTranslation({ x: npc.x, y: 1.02, z: npc.z }, true);
      body.setLinvel({ x: 0, y: 0, z: -npc.speed }, true);
      this.playerContacts.delete(npc.id);
      this.contactAges.delete(npc.id);
      this.strongContacts.delete(npc.id);
    });
  }

  getContactDebugState(): { active: number; maxActiveSeconds: number; longestSeconds: number } {
    const ages = [...this.contactAges.values()];
    return {
      active: this.playerContacts.size,
      maxActiveSeconds: Number((ages.length ? Math.max(...ages) : 0).toFixed(3)),
      longestSeconds: Number(this.longestContact.toFixed(3)),
    };
  }
}
