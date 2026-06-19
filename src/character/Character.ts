import * as THREE from 'three';

/**
 * 角色：负责构建角色 mesh 与坐/躺/站等姿态切换。
 */
export class Character {
  readonly group: THREE.Group;
  isSitting = false;
  isSleeping = false;

  constructor() {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2f4f4f });

    const group = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1, 16), bodyMaterial);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), skinMaterial);
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      hairMaterial
    );
    hair.position.y = 1.7;
    hair.castShadow = true;
    group.add(hair);

    const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0.3, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0.3, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    group.position.set(0, 0, 0);
    group.name = 'character';

    this.group = group;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
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
}
