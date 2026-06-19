import * as THREE from 'three';
import type { Collider, WallBounds, FurnitureType } from '@/types';

type ClickCallback = (type: FurnitureType | 'floor', point: THREE.Vector3, object?: THREE.Mesh) => void;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private furniture: THREE.Mesh[] = [];
  private clickableObjects: THREE.Object3D[] = [];
  private colliders: Collider[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private characterRadius: number = 0.6;
  private wallBounds: WallBounds = {
    minX: -9.5,
    maxX: 9.5,
    minZ: -9.5,
    maxZ: 9.5,
  };

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.addLights();
    this.createRoom();
    this.createFurniture();
    this.initColliders();
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getFurniture(): THREE.Mesh[] {
    return this.furniture;
  }

  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupClickHandler(onClick: ClickCallback): void {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onMouseClick(event, onClick);
    });
  }

  private onMouseClick(event: MouseEvent, onClick: ClickCallback): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      const point = intersects[0].point;

      if (clickedObject.userData && clickedObject.userData.type) {
        onClick(clickedObject.userData.type as FurnitureType, point, clickedObject);
      } else if (clickedObject.name === 'floor') {
        onClick('floor', point);
      }
    }
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    const roomLight = new THREE.PointLight(0xffeedd, 0.5, 20);
    roomLight.position.set(0, 5, 0);
    this.scene.add(roomLight);
  }

  private createRoom(): void {
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = 'floor';
    this.scene.add(floor);
    this.clickableObjects.push(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5deb3,
      roughness: 0.9,
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial);
    backWall.position.set(0, 4, -10);
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rugGeometry = new THREE.PlaneGeometry(8, 6);
    const rugMaterial = new THREE.MeshStandardMaterial({
      color: 0xcd853f,
      roughness: 0.9,
    });
    const rug = new THREE.Mesh(rugGeometry, rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.01, 2);
    this.scene.add(rug);
  }

  private createFurniture(): void {
    this.createKitchen();
    this.createSofa();
    this.createBed();
    this.createDesk();
    this.createBathroom();
    this.createTV();
  }

  private createKitchen(): void {
    const counterMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c });

    const counterGeometry = new THREE.BoxGeometry(4, 1, 1.5);
    const counter = new THREE.Mesh(counterGeometry, counterMaterial);
    counter.position.set(-8, 0.5, -8);
    counter.castShadow = true;
    counter.receiveShadow = true;
    counter.name = 'kitchen';
    counter.userData = { type: 'kitchen', action: 'cook' };
    this.scene.add(counter);
    this.furniture.push(counter);
    this.clickableObjects.push(counter);

    const topGeometry = new THREE.BoxGeometry(4.2, 0.1, 1.7);
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.set(-8, 1.05, -8);
    top.castShadow = true;
    this.scene.add(top);

    const fridgeGeometry = new THREE.BoxGeometry(1.5, 2.5, 1);
    const fridgeMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0 });
    const fridge = new THREE.Mesh(fridgeGeometry, fridgeMaterial);
    fridge.position.set(-8, 1.25, -6);
    fridge.castShadow = true;
    fridge.receiveShadow = true;
    fridge.name = 'fridge';
    this.scene.add(fridge);
  }

  private createSofa(): void {
    const sofaMaterial = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    const cushionMaterial = new THREE.MeshStandardMaterial({ color: 0xb22222 });

    const baseGeometry = new THREE.BoxGeometry(4, 0.8, 1.5);
    const base = new THREE.Mesh(baseGeometry, sofaMaterial);
    base.position.set(3, 0.4, 5);
    base.castShadow = true;
    base.receiveShadow = true;
    base.name = 'sofa';
    base.userData = { type: 'sofa', action: 'sit' };
    this.scene.add(base);
    this.furniture.push(base);
    this.clickableObjects.push(base);

    const backGeometry = new THREE.BoxGeometry(4, 1.2, 0.3);
    const back = new THREE.Mesh(backGeometry, sofaMaterial);
    back.position.set(3, 1.4, 5.6);
    back.castShadow = true;
    this.scene.add(back);

    for (let i = 0; i < 3; i++) {
      const cushionGeometry = new THREE.BoxGeometry(1.2, 0.3, 1.2);
      const cushion = new THREE.Mesh(cushionGeometry, cushionMaterial);
      cushion.position.set(1.5 + i * 1.25, 0.95, 5);
      cushion.castShadow = true;
      this.scene.add(cushion);
    }
  }

  private createBed(): void {
    const bedMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const mattressMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pillowMaterial = new THREE.MeshStandardMaterial({ color: 0xfffacd });

    const frameGeometry = new THREE.BoxGeometry(3.5, 0.5, 5);
    const frame = new THREE.Mesh(frameGeometry, bedMaterial);
    frame.position.set(7, 0.25, -5);
    frame.castShadow = true;
    frame.receiveShadow = true;
    frame.name = 'bed';
    frame.userData = { type: 'bed', action: 'sleep' };
    this.scene.add(frame);
    this.furniture.push(frame);
    this.clickableObjects.push(frame);

    const mattressGeometry = new THREE.BoxGeometry(3.2, 0.4, 4.7);
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(7, 0.7, -5);
    mattress.castShadow = true;
    this.scene.add(mattress);

    const pillowGeometry = new THREE.BoxGeometry(2.5, 0.2, 1);
    const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
    pillow.position.set(7, 1, -6.8);
    pillow.castShadow = true;
    this.scene.add(pillow);
  }

  private createDesk(): void {
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });

    const topGeometry = new THREE.BoxGeometry(2.5, 0.1, 1.2);
    const top = new THREE.Mesh(topGeometry, deskMaterial);
    top.position.set(-7, 1.5, 5);
    top.castShadow = true;
    top.receiveShadow = true;
    top.name = 'desk';
    top.userData = { type: 'desk', action: 'work' };
    this.scene.add(top);
    this.furniture.push(top);
    this.clickableObjects.push(top);

    const legGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
    const positions = [
      [-8.1, 0.75, 5.5],
      [-5.9, 0.75, 5.5],
      [-8.1, 0.75, 4.5],
      [-5.9, 0.75, 4.5],
    ];

    positions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeometry, deskMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.scene.add(leg);
    });

    const computerGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
    const computerMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const computer = new THREE.Mesh(computerGeometry, computerMaterial);
    computer.position.set(-7, 2, 4.5);
    this.scene.add(computer);
  }

  private createBathroom(): void {
    const showerMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
    const tubMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const tubGeometry = new THREE.BoxGeometry(2, 0.8, 1.2);
    const tub = new THREE.Mesh(tubGeometry, tubMaterial);
    tub.position.set(-7, 0.4, -4);
    tub.castShadow = true;
    tub.receiveShadow = true;
    tub.name = 'shower';
    tub.userData = { type: 'shower', action: 'shower' };
    this.scene.add(tub);
    this.furniture.push(tub);
    this.clickableObjects.push(tub);

    const showerHeadGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.3, 16);
    const showerHead = new THREE.Mesh(showerHeadGeometry, showerMaterial);
    showerHead.position.set(-7, 2.5, -4);
    this.scene.add(showerHead);
  }

  private createTV(): void {
    const tvMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x3333ff, emissive: 0x2222aa });

    const frameGeometry = new THREE.BoxGeometry(3, 2, 0.2);
    const frame = new THREE.Mesh(frameGeometry, tvMaterial);
    frame.position.set(0, 1.8, -9);
    frame.castShadow = true;
    frame.name = 'tv';
    frame.userData = { type: 'tv', action: 'watch' };
    this.scene.add(frame);
    this.furniture.push(frame);
    this.clickableObjects.push(frame);

    const screenGeometry = new THREE.BoxGeometry(2.8, 1.8, 0.05);
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 1.8, -8.9);
    this.scene.add(screen);
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

        if (testPos.x >= -9 && testPos.x <= 9 && testPos.z >= -9 && testPos.z <= 9) {
          if (!this.checkCollision(testPos)) {
            return testPos;
          }
        }
      }
    }

    return null;
  }

  getFurnitureInteractionPosition(furniture: THREE.Mesh): { x: number; z: number; isInteraction: boolean } {
    const pos = furniture.position;
    let targetX = pos.x;
    let targetZ = pos.z;
    let isInteractionPosition = false;
    const type = furniture.userData.type as FurnitureType;

    if (type === 'sofa') {
      targetX = pos.x;
      targetZ = pos.z + 0.2;
      isInteractionPosition = true;
    } else if (type === 'bed') {
      targetX = pos.x;
      targetZ = pos.z - 0.5;
      isInteractionPosition = true;
    } else if (type === 'kitchen') {
      targetZ = pos.z + 1.5;
    } else if (type === 'desk') {
      targetZ = pos.z + 1.5;
    } else if (type === 'shower') {
      targetZ = pos.z + 1.5;
    }

    return { x: targetX, z: targetZ, isInteraction: isInteractionPosition };
  }

  getApproachPosition(furnitureType: FurnitureType, targetX: number, targetZ: number, currentPos: THREE.Vector3): THREE.Vector3 {
    if (furnitureType === 'sofa') {
      return new THREE.Vector3(targetX, 0, targetZ - 1.5);
    } else if (furnitureType === 'bed') {
      return new THREE.Vector3(targetX + 2, 0, targetZ);
    } else {
      return new THREE.Vector3(targetX, 0, targetZ - 1);
    }
  }
}
