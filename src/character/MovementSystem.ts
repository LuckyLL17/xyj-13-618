import * as THREE from 'three';
import type { Collider, WallBounds, FurnitureType, MovementCallbacks } from '../types';
import { Character } from './Character';

export class MovementSystem {
  private character: Character;
  private moveSpeed = 0.1;
  private characterRadius = 0.6;
  private wallBounds: WallBounds = {
    minX: -9.5,
    maxX: 9.5,
    minZ: -9.5,
    maxZ: 9.5,
  };
  private colliders: Collider[] = [];
  private targetPosition: THREE.Vector3 | null = null;
  private isMoving = false;
  private afterMoveCallback: (() => void) | null = null;
  private callbacks: MovementCallbacks;

  constructor(character: Character, callbacks: MovementCallbacks) {
    this.character = character;
    this.callbacks = callbacks;
    this.initColliders();
  }

  private initColliders(): void {
    this.colliders = [
      { name: 'kitchen', minX: -8 - 2, maxX: -8 + 2, minZ: -8 - 0.75, maxZ: -8 + 0.75 },
      { name: 'fridge', minX: -8 - 0.75, maxX: -8 + 0.75, minZ: -6 - 0.5, maxZ: -6 + 0.5 },
      { name: 'sofa', minX: 3 - 2, maxX: 3 + 2, minZ: 5 - 0.75, maxZ: 5 + 0.75 },
      { name: 'bed', minX: 7 - 1.75, maxX: 7 + 1.75, minZ: -5 - 2.5, maxZ: -5 + 2.5 },
      { name: 'desk', minX: -7 - 1.25, maxX: -7 + 1.25, minZ: 5 - 0.6, maxZ: 5 + 0.6 },
      { name: 'tub', minX: -7 - 1, maxX: -7 + 1, minZ: -4 - 0.6, maxZ: -4 + 0.6 },
      { name: 'tv', minX: 0 - 1.5, maxX: 0 + 1.5, minZ: -9 - 0.1, maxZ: -9 + 0.1 },
    ];
  }

  get IsMoving(): boolean {
    return this.isMoving;
  }

  private checkCollision(position: THREE.Vector3): boolean {
    if (
      position.x - this.characterRadius < this.wallBounds.minX ||
      position.x + this.characterRadius > this.wallBounds.maxX ||
      position.z - this.characterRadius < this.wallBounds.minZ ||
      position.z + this.characterRadius > this.wallBounds.maxZ
    ) {
      return true;
    }

    for (const collider of this.colliders) {
      if (this.checkCircleAABBCollision(position, collider)) {
        return true;
      }
    }

    return false;
  }

  private checkCircleAABBCollision(circlePos: THREE.Vector3, aabb: Collider): boolean {
    const closestX = Math.max(aabb.minX, Math.min(circlePos.x, aabb.maxX));
    const closestZ = Math.max(aabb.minZ, Math.min(circlePos.z, aabb.maxZ));

    const distanceX = circlePos.x - closestX;
    const distanceZ = circlePos.z - closestZ;

    return distanceX * distanceX + distanceZ * distanceZ < this.characterRadius * this.characterRadius;
  }

  private getValidPosition(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 | null {
    const testPos = new THREE.Vector3(targetPos.x, 0, targetPos.z);

    if (!this.checkCollision(testPos)) {
      return testPos;
    }

    const direction = new THREE.Vector3();
    direction.subVectors(targetPos, startPos);
    direction.y = 0;
    direction.normalize();

    const maxDistance = startPos.distanceTo(targetPos);
    let bestDistance = 0;

    for (let d = 0; d <= maxDistance; d += 0.1) {
      const testX = startPos.x + direction.x * d;
      const testZ = startPos.z + direction.z * d;
      const testPosition = new THREE.Vector3(testX, 0, testZ);

      if (!this.checkCollision(testPosition)) {
        bestDistance = d;
      } else {
        break;
      }
    }

    if (bestDistance > 0.1) {
      return new THREE.Vector3(
        startPos.x + direction.x * bestDistance,
        0,
        startPos.z + direction.z * bestDistance
      );
    }

    return null;
  }

  private tryMove(newPos: THREE.Vector3): THREE.Vector3 | null {
    if (!this.checkCollision(newPos)) {
      return newPos;
    }

    const currentPos = this.character.position.clone();
    const direction = new THREE.Vector3();
    direction.subVectors(newPos, currentPos);
    direction.y = 0;
    direction.normalize();

    const testPosX = new THREE.Vector3(
      currentPos.x + direction.x * this.moveSpeed * 2,
      0,
      currentPos.z
    );

    const testPosZ = new THREE.Vector3(
      currentPos.x,
      0,
      currentPos.z + direction.z * this.moveSpeed * 2
    );

    if (!this.checkCollision(testPosX)) {
      return testPosX;
    }
    if (!this.checkCollision(testPosZ)) {
      return testPosZ;
    }

    return null;
  }

  escapeFromCollider(): void {
    const currentPos = this.character.position.clone();
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
        const testPos = new THREE.Vector3(
          currentPos.x + dir.x * step * i,
          0,
          currentPos.z + dir.z * step * i
        );

        if (
          testPos.x >= -9 &&
          testPos.x <= 9 &&
          testPos.z >= -9 &&
          testPos.z <= 9
        ) {
          if (!this.checkCollision(testPos)) {
            this.character.setPosition(testPos.x, 0, testPos.z);
            return;
          }
        }
      }
    }
  }

  moveTo(x: number, z: number): void {
    x = Math.max(-9, Math.min(9, x));
    z = Math.max(-9, Math.min(9, z));

    const targetPos = new THREE.Vector3(x, 0, z);
    const currentPos = this.character.position.clone();

    const validPos = this.getValidPosition(currentPos, targetPos);

    if (validPos) {
      this.character.standUp();
      this.targetPosition = validPos;
      this.isMoving = true;
    }
  }

  moveToFurniture(
    furniture: THREE.Mesh,
    callback: () => void
  ): void {
    const pos = furniture.position;
    let targetX = pos.x;
    let targetZ = pos.z;
    let isInteractionPosition = false;
    const furnitureType = furniture.userData.type as FurnitureType;

    if (furnitureType === 'sofa') {
      targetX = pos.x;
      targetZ = pos.z + 0.2;
      isInteractionPosition = true;
    } else if (furnitureType === 'bed') {
      targetX = pos.x;
      targetZ = pos.z - 0.5;
      isInteractionPosition = true;
    } else if (furnitureType === 'kitchen') {
      targetZ = pos.z + 1.5;
    } else if (furnitureType === 'desk') {
      targetZ = pos.z + 1.5;
    } else if (furnitureType === 'shower') {
      targetZ = pos.z + 1.5;
    }

    if (isInteractionPosition) {
      this.moveToInteraction(targetX, targetZ, furnitureType, callback);
    } else {
      const targetPos = new THREE.Vector3(targetX, 0, targetZ);
      const currentPos = this.character.position.clone();
      const validPos = this.getValidPosition(currentPos, targetPos);

      if (validPos) {
        this.targetPosition = validPos;
        this.isMoving = true;
        this.character.standUp();
        this.afterMoveCallback = callback;
      } else {
        this.callbacks.onShowMessage('无法到达该位置！');
      }
    }
  }

  private moveToInteraction(
    targetX: number,
    targetZ: number,
    furnitureType: FurnitureType,
    callback: () => void
  ): void {
    const currentPos = this.character.position.clone();

    let approachTarget: THREE.Vector3;

    if (furnitureType === 'sofa') {
      approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1.5);
    } else if (furnitureType === 'bed') {
      approachTarget = new THREE.Vector3(targetX + 2, 0, targetZ);
    } else {
      approachTarget = new THREE.Vector3(targetX, 0, targetZ - 1);
    }

    const validPos = this.getValidPosition(currentPos, approachTarget);

    if (validPos) {
      this.targetPosition = validPos;
      this.isMoving = true;
      this.character.standUp();
      this.afterMoveCallback = () => {
        this.character.setPosition(targetX, 0, targetZ);
        this.targetPosition = null;
        this.isMoving = false;
        callback();
      };
    } else {
      this.character.setPosition(targetX, 0, targetZ);
      callback();
    }
  }

  moveToTV(callback: () => void): void {
    this.moveTo(3, 2);
    this.afterMoveCallback = callback;
  }

  update(deltaTime: number): boolean {
    if (!this.isMoving || !this.targetPosition) {
      return false;
    }

    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.character.position);
    direction.y = 0;

    const distance = direction.length();

    if (distance < 0.1) {
      this.isMoving = false;
      this.targetPosition = null;
      this.character.position.y = 0;

      if (this.afterMoveCallback) {
        const cb = this.afterMoveCallback;
        this.afterMoveCallback = null;
        cb();
      }
      return false;
    }

    direction.normalize();
    const moveAmount = this.moveSpeed * deltaTime * 60;

    const newPos = new THREE.Vector3(
      this.character.position.x + direction.x * moveAmount,
      0,
      this.character.position.z + direction.z * moveAmount
    );

    if (!this.checkCollision(newPos)) {
      this.character.position.x = newPos.x;
      this.character.position.z = newPos.z;
    } else {
      const slidePos = this.tryMove(newPos);
      if (slidePos) {
        this.character.position.x = slidePos.x;
        this.character.position.z = slidePos.z;
      } else {
        this.isMoving = false;
        this.targetPosition = null;
        return false;
      }
    }

    const angle = Math.atan2(direction.x, direction.z);
    this.character.group.rotation.y = angle;

    const walkCycle = Math.sin(Date.now() * 0.01) * 0.1;
    this.character.position.y = Math.abs(walkCycle) * 0.2;

    return true;
  }

  cancelMovement(): void {
    this.isMoving = false;
    this.targetPosition = null;
    this.afterMoveCallback = null;
  }

  isInCollision(): boolean {
    return this.checkCollision(this.character.position);
  }
}
