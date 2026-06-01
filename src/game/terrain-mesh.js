import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Block } from '../generation/enums.js';
import { setUVCoordinates } from '../generation/uv-utils.js';
import { getRandomInt } from '../generation/random.js';

// Builds the visible terrain mesh from the generated 3D block map.
// Only exposed block faces are created; hidden faces inside the terrain are skipped.
// All generated planes are merged into one mesh for better performance.
export function buildTerrainMesh({ map, levelSize, waterLevel }) {
  const geometries = [];
  // Small random visual variation for dirt side textures.
  const stoneChance = 0.1;

  for (let z = 0; z < levelSize; z++) {
    for (let x = 0; x < levelSize; x++) {
      for (let y = 0; y < 100; y++) {
        const block = map[z][x][y];

        if (!block || block === Block.Air) {
          continue;
        }

        // Top face is needed only if nothing solid is above this block.
        const blockAbove = getBlock(map, x, z, y + 1);
        if (blockAbove === Block.Air || blockAbove == null) {
          const topGeometry = createTopFace(x, y, z);
          const uvArray = topGeometry.getAttribute('uv').array;

          switch (block) {
            case Block.Grass: {
              const offset = y < waterLevel ? 0 : (Math.random() > 0.5 ? 0 : getRandomInt(1, 4));
              setUVCoordinates(4 + offset, 6, uvArray);
              break;
            }

            case Block.Road:
              applyRoadTopUV(map, x, z, y, uvArray);
              break;

            case Block.Dirt:
              setUVCoordinates(1, 7, uvArray);
              break;
          }

          geometries.push(topGeometry);
        }

        // Side faces are generated only where the neighboring block is empty or outside the map.
        const blockSouth = getBlock(map, x, z + 1, y);
        if (blockSouth === Block.Air || blockSouth == null) {
          const geometry = createSouthFace(x, y, z);
          applySideUV(block, geometry, stoneChance);
          geometries.push(geometry);
        }

        const blockNorth = getBlock(map, x, z - 1, y);
        if (blockNorth === Block.Air || blockNorth == null) {
          const geometry = createNorthFace(x, y, z);
          applySideUV(block, geometry, stoneChance);
          geometries.push(geometry);
        }

        const blockEast = getBlock(map, x + 1, z, y);
        if (blockEast === Block.Air || blockEast == null) {
          const geometry = createEastFace(x, y, z);
          applySideUV(block, geometry, stoneChance);
          geometries.push(geometry);
        }

        const blockWest = getBlock(map, x - 1, z, y);
        if (blockWest === Block.Air || blockWest == null) {
          const geometry = createWestFace(x, y, z);
          applySideUV(block, geometry, stoneChance);
          geometries.push(geometry);
        }
      }
    }
  }

  // Merging thousands of small planes into one geometry reduces draw calls.
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
  const mesh = new THREE.Mesh(mergedGeometry);

  mesh.receiveShadow = true;
  mesh.castShadow = true;

  return mesh;
}

// Safe block lookup. Returns null outside the map instead of throwing.
function getBlock(map, x, z, y) {
  if (z < 0 || z >= map.length) return null;
  if (x < 0 || x >= map[z].length) return null;
  if (y < 0 || y >= map[z][x].length) return null;
  return map[z][x][y];
}

// Creates one plane positioned as the top face of a block.
function createTopFace(x, y, z) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, y + 0.5, z);
  return geometry;
}

// These helpers create correctly rotated side faces for one block.
function createSouthFace(x, y, z) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(x, y, z + 0.5);
  return geometry;
}

function createNorthFace(x, y, z) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateY(Math.PI);
  geometry.translate(x, y, z - 0.5);
  return geometry;
}

function createEastFace(x, y, z) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateY(Math.PI / 2);
  geometry.translate(x + 0.5, y, z);
  return geometry;
}

function createWestFace(x, y, z) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(x - 0.5, y, z);
  return geometry;
}

// Chooses texture-atlas coordinates for block side faces.
function applySideUV(block, geometry, stoneChance) {
  const uvArray = geometry.getAttribute('uv').array;

  switch (block) {
    case Block.Grass:
      setUVCoordinates(0, 7, uvArray);
      break;

    case Block.Dirt:
      setUVCoordinates(1, 7, uvArray);
      if (Math.random() < stoneChance) {
        setUVCoordinates(2, 7, uvArray);
      }
      break;

    case Block.Road:
      setUVCoordinates(1, 7, uvArray);
      break;
  }
}

// Road tiles use different atlas sprites depending on neighboring road tiles.
// This long branch table is intentionally explicit because each road shape
// has its own texture in the atlas.
function applyRoadTopUV(map, x, z, y, uvArray) {
  const down = getBlock(map, x, z + 1, y) === Block.Road;
  const up = getBlock(map, x, z - 1, y) === Block.Road;
  const right = getBlock(map, x + 1, z, y) === Block.Road;
  const left = getBlock(map, x - 1, z, y) === Block.Road;

  if (down && up && right && left) {
    setUVCoordinates(2, 5, uvArray);
    return;
  }

  if (up && right && left) {
    setUVCoordinates(5, 4, uvArray);
    return;
  }

  if (down && right && left) {
    setUVCoordinates(4, 4, uvArray);
    return;
  }

  if (down && up && left) {
    setUVCoordinates(6, 4, uvArray);
    return;
  }

  if (down && up && right) {
    setUVCoordinates(7, 4, uvArray);
    return;
  }

  if (down && right) {
    setUVCoordinates(2, 4, uvArray);
    return;
  }

  if (down && left) {
    setUVCoordinates(3, 4, uvArray);
    return;
  }

  if (up && right) {
    setUVCoordinates(0, 4, uvArray);
    return;
  }

  if (up && left) {
    setUVCoordinates(1, 4, uvArray);
    return;
  }

  if (down && up) {
    setUVCoordinates(0, 5, uvArray);
    return;
  }

  if (right && left) {
    setUVCoordinates(1, 5, uvArray);
    return;
  }

  if (down) {
    setUVCoordinates(6, 5, uvArray);
    return;
  }

  if (up) {
    setUVCoordinates(4, 5, uvArray);
    return;
  }

  if (right) {
    setUVCoordinates(5, 5, uvArray);
    return;
  }

  if (left) {
    setUVCoordinates(7, 5, uvArray);
    return;
  }

  setUVCoordinates(3, 5, uvArray);
}