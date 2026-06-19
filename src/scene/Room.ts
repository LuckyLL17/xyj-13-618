import * as THREE from 'three';

/**
 * 创建房间：地板、墙壁、地毯。
 * 返回地板 mesh，便于交互模块加入可点击对象。
 */
export function createRoom(scene: THREE.Scene): THREE.Mesh {
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.8,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5deb3,
    roughness: 0.9,
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial);
  backWall.position.set(0, 4, -10);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 8), wallMaterial);
  leftWall.position.set(-10, 4, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  const rugGeometry = new THREE.PlaneGeometry(8, 6);
  const rugMaterial = new THREE.MeshStandardMaterial({
    color: 0xcd853f,
    roughness: 0.9,
  });
  const rug = new THREE.Mesh(rugGeometry, rugMaterial);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.01, 2);
  scene.add(rug);

  return floor;
}
