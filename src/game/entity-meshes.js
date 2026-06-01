import * as THREE from 'three';
import { Entity } from '../generation/enums.js';
import { getRandomInt } from '../generation/random.js';

// Converts generated entity data into visible Three.js objects.
// The entity grid remains the source of gameplay truth,
// this function only creates the corresponding meshes.
export function buildEntityGroup({
  entities,
  levelSize,
  assets,
  villageHouses,
  runtimeState
}) {
  const group = new THREE.Group();
  // Mesh references are stored in the same z/x/y layout as entity data 
  // so the hero controller can remove or replace objects later.
  initializeEntityMeshGrid(runtimeState, levelSize);

  for (let z = 0; z < levelSize; z++) {
    for (let x = 0; x < levelSize; x++) {
      for (let y = 0; y < 100; y++) {
        const entity = entities[z][x][y];
        let objectRoot = null;

        switch (entity) {
          case Entity.UnderwaterGrass: {
            objectRoot = assets.underwaterGrassModel.clone(true);
            objectRoot.scale.set(0.5, 0.5, 0.5);
            objectRoot.position.set(x, y + 0.5, z);
            break;
          }

          case Entity.Waterlily: {
            objectRoot = assets.waterlilyModel.clone(true);
            objectRoot.scale.set(0.5, 0.5, 0.5);
            objectRoot.position.set(x, y + 0.5, z);
            objectRoot.rotation.y = (Math.PI / 2) * getRandomInt(0, 4);
            break;
          }

          case Entity.Tree: {
            objectRoot = assets.treeModel.clone(true);
            objectRoot.scale.set(1.6, 1.6, 1.6);
            objectRoot.position.set(x, y + 1, z);
            objectRoot.rotation.y = (Math.PI / 2) * getRandomInt(0, 4);
            break;
          }

          case Entity.PineTree: {
            objectRoot = assets.pineTreeModel.clone(true);
            objectRoot.scale.set(1.6, 1.6, 1.6);
            objectRoot.position.set(x, y + 1, z);
            objectRoot.rotation.y = (Math.PI / 2) * getRandomInt(0, 4);
            break;
          }

          case Entity.Bridge: {
            objectRoot = assets.bridgeModel.clone(true);
            objectRoot.position.set(x, y, z);
            objectRoot.rotation.y = (Math.PI / 2) * getRandomInt(0, 4);
            break;
          }

          case Entity.Log: {
            objectRoot = assets.logModel.clone(true);
            objectRoot.position.set(x, y + 0.65, z);
            objectRoot.rotation.y = (Math.PI / 2) * getRandomInt(0, 4);
            break;
          }
        }

        if (objectRoot) {
          group.add(objectRoot);
          runtimeState.entityMeshes[z][x][y] = objectRoot;
        }
      }
    }
  }

  // Houses are added from separate village metadata because their orientation
  // depends on the road direction found by the village generator (legacy).
  for (const houseData of villageHouses) {
    const objectRoot =
      assets.houseModels[getRandomInt(0, assets.houseModels.length)].clone(true);

    objectRoot.scale.set(0.5, 0.5, 0.5);
    objectRoot.position.set(houseData.x, houseData.y + 0.5, houseData.z);

    const [dx, dz] = houseData.way ?? [0, 1];

    if (dx === -1) objectRoot.rotation.y = 0;
    else if (dx === 1) objectRoot.rotation.y = Math.PI;
    else if (dz === -1) objectRoot.rotation.y = -Math.PI / 2;
    else if (dz === 1) objectRoot.rotation.y = Math.PI / 2;

    group.add(objectRoot);
  }

  runtimeState.entityGroup = group;

  return group;
}

// Creates two transparent water planes with different textures.
export function buildWaterMeshes({
  levelSize,
  waterLevel,
  waterTexture1,
  waterTexture2
}) {
  waterTexture1.repeat.set(levelSize / 2, levelSize / 2);
  waterTexture2.repeat.set(levelSize / 2, levelSize / 2);

  const waterMaterial1 = new THREE.MeshBasicMaterial({
    map: waterTexture1,
    transparent: true,
    opacity: 0.5
  });

  const waterMaterial2 = new THREE.MeshBasicMaterial({
    map: waterTexture2,
    transparent: true,
    opacity: 0.55
  });

  const geometry1 = new THREE.PlaneGeometry(1, 1);
  geometry1.scale(levelSize, levelSize, levelSize);
  geometry1.rotateX(-Math.PI / 2);

  const geometry2 = new THREE.PlaneGeometry(1, 1);
  geometry2.scale(levelSize, levelSize, levelSize);
  geometry2.rotateX(-Math.PI / 2);

  const waterMesh1 = new THREE.Mesh(geometry1, waterMaterial1);
  const waterMesh2 = new THREE.Mesh(geometry2, waterMaterial2);

  waterMesh1.position.set(levelSize / 2 - 0.5, waterLevel + 0.3, levelSize / 2 - 0.5);
  waterMesh2.position.set(levelSize / 2 - 0.5, waterLevel - 1 + 0.3, levelSize / 2 - 0.5);

  waterMesh1.receiveShadow = true;
  waterMesh1.castShadow = true;
  waterMesh2.receiveShadow = true;
  waterMesh2.castShadow = true;

  return {
    waterMesh1,
    waterMesh2
  };
}

// Creates an empty 3D array for mesh references, matching the entity grid.
function initializeEntityMeshGrid(runtimeState, levelSize) {
  runtimeState.entityMeshes = [];

  for (let z = 0; z < levelSize; z++) {
    runtimeState.entityMeshes[z] = [];

    for (let x = 0; x < levelSize; x++) {
      runtimeState.entityMeshes[z][x] = [];

      for (let y = 0; y < 100; y++) {
        runtimeState.entityMeshes[z][x][y] = null;
      }
    }
  }
}