import * as THREE from 'three';
import { CHARACTER_RADIUS, MOVE_SPEED, WALL_BOUNDS } from '@/config/constants';
import type { AABBCollider } from '@/types';
import type { Character } from './Character';

/**
 * 移动与碰撞模块：基于 AABB 与圆形角色做软碰撞 + 滑行。
 */
export class MovementController {
  private targetPosition: THREE.Vector3 | null = null;
  private isMoving = false;
  private afterMoveCallback: (() => void) | null = null;

  constructor(
    private readonly character: Character,
    private readonly colliders: AABBCollider[]
  ) {}

  get moving(): boolean {
    return this.isMoving;
  }

  setColliders(colliders: AABBCollider[]): void {
    this.colliders.length = 0;
    this.colliders.push(...colliders);
  }

  cancel(): void {
    this.targetPosition = null;
    this.isMoving = false;
    this.afterMoveCallback = null;
  }

  moveTo(x: number, z: number, onArrive?: () => void): boolean {
    const clampedX = Math.max(-9, Math.min(9, x));
    const clampedZ = Math.max(-9, Math.min(9, z));
    const target = new THREE.Vector3(clampedX, 0, clampedZ);
    const valid = this.getValidPosition(this.character.position.clone(), target);

    if (!valid) return false;

    this.targetPosition = valid;
    this.isMoving = true;
    this.afterMoveCallback = onArrive ?? null;
    return true;
  }

  /**
   * 移动到一个原始坐标（不做合法性 clamp），用于精确定位到家具上的交互位置。
   */
  moveToTarget(target: THREE.Vector3, onArrive?: () => void): boolean {
    const valid = this.getValidPosition(this.character.position.clone(), target);
    if (!valid) return false;
    this.targetPosition = valid;
    this.isMoving = true;
    this.afterMoveCallback = onArrive ?? null;
    return true;
  }

  setAfterMoveCallback(cb: (() => void) | null): void {
    this.afterMoveCallback = cb;
  }

  update(deltaTime: number): void {
    if (!this.isMoving || !this.targetPosition) return;

    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.character.position);
    direction.y = 0;

    const distance = direction.length();
    if (distance < 0.1) {
      this.isMoving = false;
      this.targetPosition = null;
      const cb = this.afterMoveCallback;
      this.afterMoveCallback = null;
      cb?.();
      return;
    }

    direction.normalize();
    const moveAmount = MOVE_SPEED * deltaTime * 60;
    const newPos = new THREE.Vector3(
      this.character.position.x + direction.x * moveAmount,
      0,
      this.character.position.z + direction.z * moveAmount
    );

    if (!this.checkCollision(newPos)) {
      this.character.position.x = newPos.x;
      this.character.position.z = newPos.z;
    } else {
      const slide = this.tryMove(newPos);
      if (slide) {
        this.character.position.x = slide.x;
        this.character.position.z = slide.z;
      } else {
        this.isMoving = false;
        this.targetPosition = null;
        return;
      }
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.character.group.rotation.y = angle;

    const walkCycle = Math.sin(Date.now() * 0.01) * 0.1;
    this.character.position.y = Math.abs(walkCycle) * 0.2;
  }

  checkCollision(position: THREE.Vector3): boolean {
    if (
      position.x - CHARACTER_RADIUS < WALL_BOUNDS.minX ||
      position.x + CHARACTER_RADIUS > WALL_BOUNDS.maxX ||
      position.z - CHARACTER_RADIUS < WALL_BOUNDS.minZ ||
      position.z + CHARACTER_RADIUS > WALL_BOUNDS.maxZ
    ) {
      return true;
    }
    for (const c of this.colliders) {
      if (this.checkCircleAABBCollision(position, c)) return true;
    }
    return false;
  }

  private checkCircleAABBCollision(circlePos: THREE.Vector3, aabb: AABBCollider): boolean {
    const closestX = Math.max(aabb.minX, Math.min(circlePos.x, aabb.maxX));
    const closestZ = Math.max(aabb.minZ, Math.min(circlePos.z, aabb.maxZ));
    const dx = circlePos.x - closestX;
    const dz = circlePos.z - closestZ;
    return dx * dx + dz * dz < CHARACTER_RADIUS * CHARACTER_RADIUS;
  }

  private getValidPosition(start: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 | null {
    const testPos = new THREE.Vector3(target.x, 0, target.z);
    if (!this.checkCollision(testPos)) return testPos;

    const direction = new THREE.Vector3().subVectors(target, start);
    direction.y = 0;
    direction.normalize();

    const maxDistance = start.distanceTo(target);
    let bestDistance = 0;
    for (let d = 0; d <= maxDistance; d += 0.1) {
      const tx = start.x + direction.x * d;
      const tz = start.z + direction.z * d;
      const tp = new THREE.Vector3(tx, 0, tz);
      if (!this.checkCollision(tp)) {
        bestDistance = d;
      } else {
        break;
      }
    }
    if (bestDistance > 0.1) {
      return new THREE.Vector3(
        start.x + direction.x * bestDistance,
        0,
        start.z + direction.z * bestDistance
      );
    }
    return null;
  }

  private tryMove(newPos: THREE.Vector3): THREE.Vector3 | null {
    if (!this.checkCollision(newPos)) return newPos;
    const cur = this.character.position.clone();
    const dir = new THREE.Vector3().subVectors(newPos, cur);
    dir.y = 0;
    dir.normalize();

    const testX = new THREE.Vector3(cur.x + dir.x * MOVE_SPEED * 2, 0, cur.z);
    const testZ = new THREE.Vector3(cur.x, 0, cur.z + dir.z * MOVE_SPEED * 2);
    if (!this.checkCollision(testX)) return testX;
    if (!this.checkCollision(testZ)) return testZ;
    return null;
  }

  /**
   * 当角色被卡进碰撞体时，向 8 个方向逐步搜索逃离的位置。
   */
  escapeFromCollider(): void {
    const cur = this.character.position.clone();
    const step = 0.2;
    const maxSteps = 50;
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(1, 0, -1),
      new THREE.Vector3(-1, 0, 1),
      new THREE.Vector3(-1, 0, -1),
    ];
    for (let i = 1; i <= maxSteps; i++) {
      for (const dir of directions) {
        const tp = new THREE.Vector3(cur.x + dir.x * step * i, 0, cur.z + dir.z * step * i);
        if (tp.x >= -9 && tp.x <= 9 && tp.z >= -9 && tp.z <= 9 && !this.checkCollision(tp)) {
          this.character.setPosition(tp.x, 0, tp.z);
          return;
        }
      }
    }
  }
}
