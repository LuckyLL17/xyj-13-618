import * as THREE from 'three';
import type { Collider, WallBounds } from '../types';

export class CollisionSystem {
  private colliders: Collider[] = [];
  private wallBounds: WallBounds = {
    minX: -9.5,
    maxX: 9.5,
    minZ: -9.5,
    maxZ: 9.5,
  };
  private characterRadius: number = 0.6;

  constructor() {
    this.initColliders();
  }

  private initColliders(): void {
    this.colliders = [];

    this.colliders.push({
      name: 'kitchen',
      minX: -8 - 2,
      maxX: -8 + 2,
      minZ: -8 - 0.75,
      maxZ: -8 + 0.75,
    });

    this.colliders.push({
      name: 'fridge',
      minX: -8 - 0.75,
      maxX: -8 + 0.75,
      minZ: -6 - 0.5,
      maxZ: -6 + 0.5,
    });

    this.colliders.push({
      name: 'sofa',
      minX: 3 - 2,
      maxX: 3 + 2,
      minZ: 5 - 0.75,
      maxZ: 5 + 0.75,
    });

    this.colliders.push({
      name: 'bed',
      minX: 7 - 1.75,
      maxX: 7 + 1.75,
      minZ: -5 - 2.5,
      maxZ: -5 + 2.5,
    });

    this.colliders.push({
      name: 'desk',
      minX: -7 - 1.25,
      maxX: -7 + 1.25,
      minZ: 5 - 0.6,
      maxZ: 5 + 0.6,
    });

    this.colliders.push({
      name: 'tub',
      minX: -7 - 1,
      maxX: -7 + 1,
      minZ: -4 - 0.6,
      maxZ: -4 + 0.6,
    });

    this.colliders.push({
      name: 'tv',
      minX: 0 - 1.5,
      maxX: 0 + 1.5,
      minZ: -9 - 0.1,
      maxZ: -9 + 0.1,
    });
  }

  checkCollision(position: THREE.Vector3): boolean {
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

  getValidPosition(startPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.Vector3 | null {
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

  tryMove(currentPos: THREE.Vector3, newPos: THREE.Vector3, moveSpeed: number): THREE.Vector3 | null {
    if (!this.checkCollision(newPos)) {
      return newPos;
    }

    const direction = new THREE.Vector3();
    direction.subVectors(newPos, currentPos);
    direction.y = 0;
    direction.normalize();

    const testPosX = new THREE.Vector3(
      currentPos.x + direction.x * moveSpeed * 2,
      0,
      currentPos.z
    );

    const testPosZ = new THREE.Vector3(
      currentPos.x,
      0,
      currentPos.z + direction.z * moveSpeed * 2
    );

    if (!this.checkCollision(testPosX)) {
      return testPosX;
    }
    if (!this.checkCollision(testPosZ)) {
      return testPosZ;
    }

    return null;
  }

  escapeFromCollider(currentPos: THREE.Vector3): THREE.Vector3 | null {
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
            return testPos;
          }
        }
      }
    }

    return null;
  }
}
