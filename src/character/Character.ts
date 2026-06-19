import * as THREE from 'three';

export class Character {
  private group: THREE.Group;
  private isSitting: boolean = false;
  private isSleeping: boolean = false;

  constructor(scene: THREE.Scene) {
    this.group = this.createCharacterMesh();
    scene.add(this.group);
  }

  getMesh(): THREE.Group {
    return this.group;
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  setRotationY(angle: number): void {
    this.group.rotation.y = angle;
  }

  sitOnSofa(): void {
    this.isSitting = true;
    this.group.scale.y = 0.6;
    this.group.position.y = 0.9;
    this.group.rotation.y = Math.PI;
  }

  lieOnBed(): void {
    this.isSleeping = true;
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 1.0;
    this.group.scale.set(1, 1, 0.6);
  }

  standUp(): void {
    this.group.rotation.x = 0;
    this.group.rotation.y = 0;
    this.group.scale.set(1, 1, 1);
    this.group.position.y = 0;
    this.isSitting = false;
    this.isSleeping = false;
  }

  isInSittingState(): boolean {
    return this.isSitting;
  }

  isInSleepingState(): boolean {
    return this.isSleeping;
  }

  updateWalkAnimation(): void {
    const walkCycle = Math.sin(Date.now() * 0.01) * 0.1;
    this.group.position.y = Math.abs(walkCycle) * 0.2;
  }

  private createCharacterMesh(): THREE.Group {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });

    const characterGroup = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1, 16);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    characterGroup.add(body);

    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const head = new THREE.Mesh(headGeometry, skinMaterial);
    head.position.y = 1.7;
    head.castShadow = true;
    characterGroup.add(head);

    const hairGeometry = new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.7;
    hair.castShadow = true;
    characterGroup.add(hair);

    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2f4f4f });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.3, 0);
    leftLeg.castShadow = true;
    characterGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.3, 0);
    rightLeg.castShadow = true;
    characterGroup.add(rightLeg);

    characterGroup.position.set(0, 0, 0);
    characterGroup.name = 'character';

    return characterGroup;
  }
}
