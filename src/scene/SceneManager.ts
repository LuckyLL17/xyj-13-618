import * as THREE from 'three';
import type { SceneClickCallbacks, FurnitureType } from '../types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;
  public floor: THREE.Mesh | null = null;
  public furniture: THREE.Mesh[] = [];
  public clickableObjects: THREE.Object3D[] = [];

  private clickCallbacks: SceneClickCallbacks | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init(container: HTMLElement, callbacks: SceneClickCallbacks): void {
    this.clickCallbacks = callbacks;

    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.addLights();
    this.createRoom();
    this.createFurniture();
    this.setupClickHandler();
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
    this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.floor.name = 'floor';
    this.scene.add(this.floor);
    this.clickableObjects.push(this.floor);

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
    counter.userData = { type: 'kitchen' as FurnitureType, action: 'cook' };
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
    base.userData = { type: 'sofa' as FurnitureType, action: 'sit' };
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
    frame.userData = { type: 'bed' as FurnitureType, action: 'sleep' };
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
    top.userData = { type: 'desk' as FurnitureType, action: 'work' };
    this.scene.add(top);
    this.furniture.push(top);
    this.clickableObjects.push(top);

    const legGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
    const positions: [number, number, number][] = [
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
    tub.userData = { type: 'shower' as FurnitureType, action: 'shower' };
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
    frame.userData = { type: 'tv' as FurnitureType, action: 'watch' };
    this.scene.add(frame);
    this.furniture.push(frame);
    this.clickableObjects.push(frame);

    const screenGeometry = new THREE.BoxGeometry(2.8, 1.8, 0.05);
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 1.8, -8.9);
    this.scene.add(screen);
  }

  private setupClickHandler(): void {
    this.renderer.domElement.addEventListener('click', (event) => {
      this.onMouseClick(event);
    });
  }

  private onMouseClick(event: MouseEvent): void {
    if (!this.clickCallbacks) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object as THREE.Mesh;
      const point = intersects[0].point;

      if (clickedObject.userData && clickedObject.userData.type) {
        this.clickCallbacks.onFurnitureClick(clickedObject);
      } else if (clickedObject.name === 'floor') {
        this.clickCallbacks.onFloorClick(point.x, point.z);
      }
    }
  }

  addCharacter(character: THREE.Group): void {
    this.scene.add(character);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getFurnitureByName(name: string): THREE.Mesh | undefined {
    return this.furniture.find((f) => f.name === name);
  }
}
