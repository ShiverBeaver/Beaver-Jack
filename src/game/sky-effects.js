import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Block } from '../generation/enums.js';
import { getRandomFloat, getRandomInt } from '../generation/random.js';
import { setUVCoordinates } from '../generation/uv-utils.js';

// Builds decorative environment effects around the level: waterfalls at open water edges
//  and billboard-style clouds around the map border.
export function buildSkyEffects({
  map,
  levelSize,
  waterLevel,
  borderMaterial
}) {
  const group = new THREE.Group();

  const waterfallLayers = buildWaterfallLayers({
    map,
    levelSize,
    waterLevel,
    borderMaterial
  });

  waterfallLayers.forEach((layer) => {
    if (layer) {
      group.add(layer);
    }
  });

  const cloudMesh = buildCloudMesh({
    levelSize,
    cloudsAmount: levelSize * 5,
    borderMaterial
  });

  if (cloudMesh) {
    group.add(cloudMesh);
  }

  return {
    group,
    waterfallLayers,
    cloudMesh
  };
}

// Creates four stacked waterfall frame layers where water reaches the map edge.
// The game controller moves these layers vertically to create a looping effect.
function buildWaterfallLayers({
  map,
  levelSize,
  waterLevel,
  borderMaterial
}) {
  // One geometry list per animation frame.
  const waterfallGeometries = [[], [], [], []];

  for (let x = 0; x < levelSize; x++) {
    if (getBlock(map, x, levelSize - 1, waterLevel) === Block.Air) {
      for (let layer = 0; layer < 4; layer++) {
        const geometry = new THREE.PlaneGeometry();
        geometry.rotateY(0);
        geometry.translate(x, -0.2, levelSize - 0.499);

        const uvArray = geometry.getAttribute('uv').array;
        setUVCoordinates(getRandomInt(0, 3), 3 - layer, uvArray);

        waterfallGeometries[layer].push(geometry);
      }
    }

    if (getBlock(map, x, 0, waterLevel) === Block.Air) {
      for (let layer = 0; layer < 4; layer++) {
        const geometry = new THREE.PlaneGeometry();
        geometry.rotateY(Math.PI);
        geometry.translate(x, -0.2, -0.501);

        const uvArray = geometry.getAttribute('uv').array;
        setUVCoordinates(getRandomInt(0, 3), 3 - layer, uvArray);

        waterfallGeometries[layer].push(geometry);
      }
    }
  }

  for (let z = 0; z < levelSize; z++) {
    if (getBlock(map, levelSize - 1, z, waterLevel) === Block.Air) {
      for (let layer = 0; layer < 4; layer++) {
        const geometry = new THREE.PlaneGeometry();
        geometry.rotateY(Math.PI / 2);
        geometry.translate(levelSize - 0.499, -0.2, z);

        const uvArray = geometry.getAttribute('uv').array;
        setUVCoordinates(getRandomInt(0, 3), 3 - layer, uvArray);

        waterfallGeometries[layer].push(geometry);
      }
    }

    if (getBlock(map, 0, z, waterLevel) === Block.Air) {
      for (let layer = 0; layer < 4; layer++) {
        const geometry = new THREE.PlaneGeometry();
        geometry.rotateY(-Math.PI / 2);
        geometry.translate(-0.501, -0.2, z);

        const uvArray = geometry.getAttribute('uv').array;
        setUVCoordinates(getRandomInt(0, 3), 3 - layer, uvArray);

        waterfallGeometries[layer].push(geometry);
      }
    }
  }

  const waterfallLayers = [];

  for (let layer = 0; layer < 4; layer++) {
    if (waterfallGeometries[layer].length > 0) {
      const merged = BufferGeometryUtils.mergeBufferGeometries(waterfallGeometries[layer]);
      const mesh = new THREE.Mesh(merged, borderMaterial);
      mesh.position.y = waterLevel - layer;
      waterfallLayers[layer] = mesh;
    } else {
      waterfallLayers[layer] = null;
    }
  }

  return waterfallLayers;
}

// Creates many cloud planes outside the playable map and merges them into one mesh.
function buildCloudMesh({
  levelSize,
  cloudsAmount,
  borderMaterial
}) {
  const cloudGeometries = [];

  for (let c = 0; c < cloudsAmount; c++) {
    const geometry = new THREE.PlaneGeometry();
    const radius = 11;

    let offsetX = getRandomFloat(-radius, levelSize + radius);
    let offsetZ = getRandomFloat(-radius, levelSize + radius);

    // Force each cloud to spawn outside the playable square on at least one axis.
    if (Math.random() > 0.5) {
      while (offsetX > -1 && offsetX < levelSize + 1) {
        offsetX = getRandomFloat(-radius, levelSize + radius);
      }
    } else {
      while (offsetZ > -1 && offsetZ < levelSize + 1) {
        offsetZ = getRandomFloat(-radius, levelSize + radius);
      }
    }

    const cloudType = getRandomInt(0, 6);
    const uvArray = geometry.getAttribute('uv').array;

    geometry.scale(2, 2, 2);
    applyCloudUV(cloudType, uvArray, geometry);

    geometry.rotateX(-Math.PI / 3.5);
    geometry.translate(offsetX, (c / cloudsAmount) * 10 - 5, offsetZ);

    cloudGeometries.push(geometry);
  }

  if (cloudGeometries.length === 0) {
    return null;
  }

  const merged = BufferGeometryUtils.mergeBufferGeometries(cloudGeometries);
  const cloudMesh = new THREE.Mesh(merged, borderMaterial);
  cloudMesh.position.y = 0;

  return cloudMesh;
}

// Selects one cloud sprite from the clouds texture atlas.
// The hard-coded UV coordinates are to adjust to the hand drawn atlas.
function applyCloudUV(cloudType, uvArray, geometry) {
  switch (cloudType) {
    case 0:
      uvArray[0] = 0;        uvArray[1] = 1;
      uvArray[2] = 0.375;    uvArray[3] = 1;
      uvArray[4] = 0;        uvArray[5] = 0.75;
      uvArray[6] = 0.375;    uvArray[7] = 0.75;
      geometry.scale(1.5, 1, 1);
      break;

    case 1:
      uvArray[0] = 0;        uvArray[1] = 0.75;
      uvArray[2] = 0.375;    uvArray[3] = 0.75;
      uvArray[4] = 0;        uvArray[5] = 0.5;
      uvArray[6] = 0.375;    uvArray[7] = 0.5;
      geometry.scale(1.5, 1, 1);
      break;

    case 2:
      uvArray[0] = 0.375;    uvArray[1] = 1;
      uvArray[2] = 0.625;    uvArray[3] = 1;
      uvArray[4] = 0.375;    uvArray[5] = 0.75;
      uvArray[6] = 0.625;    uvArray[7] = 0.75;
      break;

    case 3:
      uvArray[0] = 0.375;    uvArray[1] = 0.75;
      uvArray[2] = 0.625;    uvArray[3] = 0.75;
      uvArray[4] = 0.375;    uvArray[5] = 0.5;
      uvArray[6] = 0.625;    uvArray[7] = 0.5;
      break;

    case 4:
      uvArray[0] = 0.625;    uvArray[1] = 1;
      uvArray[2] = 1;        uvArray[3] = 1;
      uvArray[4] = 0.625;    uvArray[5] = 0.75;
      uvArray[6] = 1;        uvArray[7] = 0.75;
      geometry.scale(1.5, 1, 1);
      break;

    case 5:
    default:
      uvArray[0] = 0.625;    uvArray[1] = 0.75;
      uvArray[2] = 1;        uvArray[3] = 0.75;
      uvArray[4] = 0.625;    uvArray[5] = 0.5;
      uvArray[6] = 1;        uvArray[7] = 0.5;
      geometry.scale(1.5, 1, 1);
      break;
  }
}

// Safe terrain lookup used when checking if map edges should have waterfalls.
function getBlock(map, x, z, y) {
  if (z < 0 || z >= map.length) return null;
  if (x < 0 || x >= map[z].length) return null;
  if (y < 0 || y >= map[z][x].length) return null;
  return map[z][x][y];
}