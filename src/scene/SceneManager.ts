import * as THREE from 'three';
import { createLights } from './Lights';
import { createRoom } from './Room';
import { createFurniture, type FurnitureBuildResult } from './Furniture';

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  floor: THREE.Mesh;
  furniture: FurnitureBuildResult;
}

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly floor: THREE.Mesh;
  readonly furniture: FurnitureBuildResult;

  /** 可被点击拾取的物体列表（地板 + 家具）*/
  readonly clickableObjects: THREE.Object3D[];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    createLights(this.scene);
    this.floor = createRoom(this.scene);
    this.furniture = createFurniture(this.scene);

    this.clickableObjects = [this.floor, ...this.furniture.interactive];

    this.bindResize();
  }

  private bindResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
