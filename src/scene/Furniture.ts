import * as THREE from 'three';
import type { AABBCollider, FurnitureUserData } from '@/types';

export interface FurnitureBuildResult {
  /** 可被 raycaster 选中的家具主体（带 userData）*/
  interactive: THREE.Mesh[];
  /** 角色不可穿透的 AABB 碰撞体 */
  colliders: AABBCollider[];
}

function tagFurniture(mesh: THREE.Mesh, data: FurnitureUserData, name: string): void {
  mesh.name = name;
  mesh.userData = data;
}

function createKitchen(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const topMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });

  const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.5), counterMaterial);
  counter.position.set(-8, 0.5, -8);
  counter.castShadow = true;
  counter.receiveShadow = true;
  tagFurniture(counter, { type: 'kitchen', action: 'cook' }, 'kitchen');
  scene.add(counter);
  result.interactive.push(counter);

  const top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.7), topMaterial);
  top.position.set(-8, 1.05, -8);
  top.castShadow = true;
  scene.add(top);

  const fridgeMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0 });
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1), fridgeMaterial);
  fridge.position.set(-8, 1.25, -6);
  fridge.castShadow = true;
  fridge.receiveShadow = true;
  fridge.name = 'fridge';
  scene.add(fridge);

  result.colliders.push(
    { name: 'kitchen', minX: -10, maxX: -6, minZ: -8.75, maxZ: -7.25 },
    { name: 'fridge', minX: -8.75, maxX: -7.25, minZ: -6.5, maxZ: -5.5 }
  );
}

function createSofa(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
  const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0xb22222 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 1.5), sofaMaterial);
  base.position.set(3, 0.4, 5);
  base.castShadow = true;
  base.receiveShadow = true;
  tagFurniture(base, { type: 'sofa', action: 'sit' }, 'sofa');
  scene.add(base);
  result.interactive.push(base);

  const back = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.3), sofaMaterial);
  back.position.set(3, 1.4, 5.6);
  back.castShadow = true;
  scene.add(back);

  for (let i = 0; i < 3; i++) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), cushionMaterial);
    cushion.position.set(1.5 + i * 1.25, 0.95, 5);
    cushion.castShadow = true;
    scene.add(cushion);
  }

  result.colliders.push({ name: 'sofa', minX: 1, maxX: 5, minZ: 4.25, maxZ: 5.75 });
}

function createBed(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
  const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xfffacd });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 5), bedMaterial);
  frame.position.set(7, 0.25, -5);
  frame.castShadow = true;
  frame.receiveShadow = true;
  tagFurniture(frame, { type: 'bed', action: 'sleep' }, 'bed');
  scene.add(frame);
  result.interactive.push(frame);

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 4.7), mattressMaterial);
  mattress.position.set(7, 0.7, -5);
  mattress.castShadow = true;
  scene.add(mattress);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.2, 1), pillowMaterial);
  pillow.position.set(7, 1, -6.8);
  pillow.castShadow = true;
  scene.add(pillow);

  result.colliders.push({ name: 'bed', minX: 5.25, maxX: 8.75, minZ: -7.5, maxZ: -2.5 });
}

function createDesk(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 1.2), deskMaterial);
  top.position.set(-7, 1.5, 5);
  top.castShadow = true;
  top.receiveShadow = true;
  tagFurniture(top, { type: 'desk', action: 'work' }, 'desk');
  scene.add(top);
  result.interactive.push(top);

  const legGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
  const legPositions: Array<[number, number, number]> = [
    [-8.1, 0.75, 5.5],
    [-5.9, 0.75, 5.5],
    [-8.1, 0.75, 4.5],
    [-5.9, 0.75, 4.5],
  ];
  legPositions.forEach((pos) => {
    const leg = new THREE.Mesh(legGeometry, deskMaterial);
    leg.position.set(pos[0], pos[1], pos[2]);
    leg.castShadow = true;
    scene.add(leg);
  });

  const computerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const computer = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.1), computerMaterial);
  computer.position.set(-7, 2, 4.5);
  scene.add(computer);

  result.colliders.push({ name: 'desk', minX: -8.25, maxX: -5.75, minZ: 4.4, maxZ: 5.6 });
}

function createBathroom(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const showerMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
  const tubMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const tub = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 1.2), tubMaterial);
  tub.position.set(-7, 0.4, -4);
  tub.castShadow = true;
  tub.receiveShadow = true;
  tagFurniture(tub, { type: 'shower', action: 'shower' }, 'shower');
  scene.add(tub);
  result.interactive.push(tub);

  const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 16), showerMaterial);
  showerHead.position.set(-7, 2.5, -4);
  scene.add(showerHead);

  result.colliders.push({ name: 'tub', minX: -8, maxX: -6, minZ: -4.6, maxZ: -3.4 });
}

function createTV(scene: THREE.Scene, result: FurnitureBuildResult): void {
  const tvMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const screenMaterial = new THREE.MeshStandardMaterial({
    color: 0x3333ff,
    emissive: 0x2222aa,
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), tvMaterial);
  frame.position.set(0, 1.8, -9);
  frame.castShadow = true;
  tagFurniture(frame, { type: 'tv', action: 'watch' }, 'tv');
  scene.add(frame);
  result.interactive.push(frame);

  const screen = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 0.05), screenMaterial);
  screen.position.set(0, 1.8, -8.9);
  scene.add(screen);

  result.colliders.push({ name: 'tv', minX: -1.5, maxX: 1.5, minZ: -9.1, maxZ: -8.9 });
}

export function createFurniture(scene: THREE.Scene): FurnitureBuildResult {
  const result: FurnitureBuildResult = { interactive: [], colliders: [] };
  createKitchen(scene, result);
  createSofa(scene, result);
  createBed(scene, result);
  createDesk(scene, result);
  createBathroom(scene, result);
  createTV(scene, result);
  return result;
}
