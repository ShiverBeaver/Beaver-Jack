// Converts level configuration into raw game data:
// - heightMap[z][x] stores the surface height
// - map[z][x][y] stores terrain blocks (such as Dirt, Grass and Road)
// - entities[z][x][y] stores interactive objects (such as trees, logs and houses)
//
// This module only creates data arrays, it does not do any rendering.

import { Block, Entity } from './enums.js';
import { getRandomInt } from './random.js';
import {
  loadImageChannelToArray,
  mapRange,
  crop2DArray
} from './image-sampler.js';



// Main terrain generation part.
// It mixes a hand-painted template image with a pre-generated noise image.
// This gives predictable level shapes while still making each run look procedural.
export async function generateTerrainData(config) {
  const {
    levelSize,
    noisePath,
    templatePath,
    heightNoiseRange,
    heightTemplateRange,
    waterLevel,
    treeDensity,
    treeCount,
    heightOffset = 0,
    generateVillage,
    ignoreVillageTemplate = false,
    villageRadius,
    housesRange
  } = config;
  // The noise image adds random-looking height variation. (only green chanel is used)
  const rawNoise = await loadImageChannelToArray(noisePath, 1);
  const noiseMapped = mapRange(
    rawNoise,
    getRandomInt(heightNoiseRange[0], heightNoiseRange[1] + 1)
  );
  // The template image gives art-directed terrain structure. (green chanel = base height)
  const rawTemplateHeight = await loadImageChannelToArray(templatePath, 1);
  const templateHeightMapped = mapRange(
    rawTemplateHeight,
    getRandomInt(heightTemplateRange[0], heightTemplateRange[1] + 1)
  );


  // A random crop is taken from both source images. (for the variation)
  const maxNoiseOffsetY = noiseMapped.length - levelSize;
  const maxNoiseOffsetX = noiseMapped[0].length - levelSize;

  const noiseOffsetY = getRandomInt(0, maxNoiseOffsetY + 1);
  const noiseOffsetX = getRandomInt(0, maxNoiseOffsetX + 1);

  const levelHeightNoise = crop2DArray(
    noiseMapped,
    noiseOffsetY,
    noiseOffsetX,
    levelSize
  );

  const maxTemplateOffsetY = templateHeightMapped.length - levelSize;
  const maxTemplateOffsetX = templateHeightMapped[0].length - levelSize;

  const templateOffsetY = getRandomInt(0, maxTemplateOffsetY + 1);
  const templateOffsetX = getRandomInt(0, maxTemplateOffsetX + 1);

  const levelHeightTemplate = crop2DArray(
    templateHeightMapped,
    templateOffsetY,
    templateOffsetX,
    levelSize
  );

  // Red channel is used as a village mask.
  // Custom levels ignore it because
  //  (village generation is intentionally disabled outside the built-in village level.)
  const villageLevelTemplate = ignoreVillageTemplate
    ? createEmptyTemplate(levelSize)
    : crop2DArray(
        mapRange(await loadImageChannelToArray(templatePath, 0), 100),
        templateOffsetY,
        templateOffsetX,
        levelSize
      );

  const villageData = resolveVillageSpawn({
    villageLevelTemplate,
    levelSize
  });

  const heightMap = buildHeightMap({
    levelSize,
    villageLevelTemplate,
    levelHeightTemplate,
    levelHeightNoise,
    heightOffset
  });

  const map = buildBlockMap({
    levelSize,
    heightMap
  });

  const entitiesData = buildEntities({
    levelSize,
    heightMap,
    villageLevelTemplate,
    waterLevel,
    treeDensity,
    treeCount
  });

  const villageResult = generateVillage
    ? applyVillageGeneration({
        map,
        entities: entitiesData.entities,
        heightMap,
        villageLevelTemplate,
        villagePointX: villageData.villagePointX,
        villagePointZ: villageData.villagePointZ,
        villageRadius,
        housesRange
      })
    : {
        villageHouses: []
      };

  return {
    heightMap,
    map,
    entities: entitiesData.entities,
    treesLeft: entitiesData.treesLeft,
    villageHouses: villageResult.villageHouses,
    waterLevel
  };
}

// Creates a zero-filled village mask.
// Used when a custom level should completely ignore village/template red-channel data.
function createEmptyTemplate(levelSize) {
  const template = [];

  for (let z = 0; z < levelSize; z++) {
    template[z] = [];

    for (let x = 0; x < levelSize; x++) {
      template[z][x] = 0;
    }
  }

  return template;
}
// Chooses the village center from pixels where the red-channel village mask is strongest.
// If no suitable pixel exists, the center of the map is used as a safe fallback.
function resolveVillageSpawn({ villageLevelTemplate, levelSize }) {
  let villageSpawnPoints = 0;

  for (let z = 0; z < levelSize; z++) {
    for (let x = 0; x < levelSize; x++) {
      if (villageLevelTemplate[z][x] > 98) {
        villageSpawnPoints++;
      }
    }
  }

  if (villageSpawnPoints === 0) {
    return {
      villagePointX: Math.floor(levelSize / 2),
      villagePointZ: Math.floor(levelSize / 2)
    };
  }

  const spawnPointIndex = getRandomInt(0, villageSpawnPoints);
  let currentPoint = 0;

  for (let z = 0; z < levelSize; z++) {
    for (let x = 0; x < levelSize; x++) {
      if (villageLevelTemplate[z][x] > 98) {
        if (currentPoint === spawnPointIndex) {
          return {
            villagePointX: x,
            villagePointZ: z
          };
        }

        currentPoint++;
      }
    }
  }

  return {
    villagePointX: Math.floor(levelSize / 2),
    villagePointZ: Math.floor(levelSize / 2)
  };
}

  // Final height is created by combining template height, noise height and optional heightOffset.
  // Village-marked areas are flattened more strongly (so there would be actual flat space to place the houses on)
function buildHeightMap({
  levelSize,
  villageLevelTemplate,
  levelHeightTemplate,
  levelHeightNoise,
  heightOffset = 0
}) {
  const heightMap = [];

  for (let z = 0; z < levelSize; z++) {
    heightMap[z] = [];

    for (let x = 0; x < levelSize; x++) {
      if (villageLevelTemplate[z][x] > 0) {
        heightMap[z][x] = levelHeightTemplate[z][x] + 2 + heightOffset;
      } else {
        heightMap[z][x] = levelHeightTemplate[z][x] + levelHeightNoise[z][x] + heightOffset;
      }
    }
  }

  return heightMap;
}
// Expands the 2D height map into a 3D block map.
// Everything below the surface is Dirt, and the top block is Grass.
function buildBlockMap({ levelSize, heightMap }) {
  const map = [];

  for (let z = 0; z < levelSize; z++) {
    map[z] = [];

    for (let x = 0; x < levelSize; x++) {
      map[z][x] = [];

      for (let y = 0; y < 100; y++) {
        map[z][x][y] = Block.Air;
      }

      for (let y = 0; y < heightMap[z][x]; y++) {
        map[z][x][y] = Block.Dirt;
      }

      map[z][x][heightMap[z][x]] = Block.Grass;
    }
  }

  return map;
}

// Entity placement happens after terrain height exists
// because trees and water plants need to know if a tile is above or below water.
function buildEntities({
  levelSize,
  heightMap,
  villageLevelTemplate,
  waterLevel,
  treeDensity,
  treeCount
}) {
  const entities = [];
  const treeCandidates = [];

  for (let z = 0; z < levelSize; z++) {
    entities[z] = [];

    for (let x = 0; x < levelSize; x++) {
      entities[z][x] = [];

      for (let y = 0; y < 100; y++) {
        entities[z][x][y] = Entity.Empty;
      }

      if (Math.random() < 0.09 && heightMap[z][x] === waterLevel - 1) {
        entities[z][x][waterLevel] = Entity.UnderwaterGrass;
      }

      if (Math.random() < 0.009 && heightMap[z][x] < waterLevel) {
        entities[z][x][waterLevel] = Entity.Waterlily;
      }

      if (isValidTreeTile({ heightMap, villageLevelTemplate, x, z, waterLevel })) {
        treeCandidates.push({ x, z, y: heightMap[z][x] });
      }
    }
  }

  const targetTreeCount = Number.isFinite(treeCount)
    ? treeCount
    : Math.round(treeCandidates.length * (treeDensity ?? 0));

  const selectedTrees = selectEvenlySpacedTreeTiles({
    candidates: treeCandidates,
    targetCount: targetTreeCount,
    levelSize
  });

  for (const tree of selectedTrees) {
    entities[tree.z][tree.x][tree.y] = Math.random() > 0.5 ? Entity.Tree : Entity.PineTree;
  }

  return {
    entities,
    treesLeft: selectedTrees.length
  };
}

function isValidTreeTile({ heightMap, villageLevelTemplate, x, z, waterLevel }) {
  return heightMap[z][x] >= waterLevel && villageLevelTemplate[z][x] < 40;
}

function selectEvenlySpacedTreeTiles({ candidates, targetCount, levelSize }) {
  if (targetCount <= 0 || candidates.length === 0) {
    return [];
  }

  if (candidates.length <= targetCount) {
    return shuffleArray(candidates.slice());
  }

  const cellsPerAxis = Math.max(1, Math.ceil(Math.sqrt(targetCount)));
  const cellSize = Math.max(1, levelSize / cellsPerAxis);
  const cells = new Map();

  for (const candidate of candidates) {
    const cellX = Math.min(cellsPerAxis - 1, Math.floor(candidate.x / cellSize));
    const cellZ = Math.min(cellsPerAxis - 1, Math.floor(candidate.z / cellSize));
    const key = `${cellZ}:${cellX}`;

    if (!cells.has(key)) {
      cells.set(key, []);
    }

    cells.get(key).push(candidate);
  }

  const buckets = shuffleArray([...cells.values()]).map((bucket) => shuffleArray(bucket));
  const selected = [];
  let bucketIndex = 0;

  while (selected.length < targetCount && buckets.length > 0) {
    if (bucketIndex >= buckets.length) {
      bucketIndex = 0;
    }

    const bucket = buckets[bucketIndex];
    const candidate = bucket.pop();

    if (candidate) {
      selected.push(candidate);
    }

    if (bucket.length === 0) {
      buckets.splice(bucketIndex, 1);
    } else {
      bucketIndex++;
    }
  }

  return selected;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
  // Village generation is legacy and currently only used by level 9.
  // (i spent too much time drawing those pretty houses to remove them completely).
  // The custom level editor does not expose it because this logic depends on
  // fragile model sizes, road spacing, keeping enough flat space on the map and magic numbers.
function applyVillageGeneration({
  map,
  entities,
  heightMap,
  villagePointX,
  villagePointZ,
  villageRadius,
  housesRange
}) {
  const villageHouses = [];
  const levelSize = map.length;

  if (!isInside2D(villagePointX, villagePointZ, levelSize)) {
    return { villageHouses };
  }

  const y = heightMap[villagePointZ][villagePointX];

  // central horizontal road
  let roadZ = villagePointZ;
  for (let x = villagePointX - villageRadius; x < villagePointX + villageRadius; x++) {
    if (!isInside2D(x, roadZ, levelSize)) continue;

    if (map[roadZ][x][y] === Block.Grass) {
      const offset = Math.round((Math.random() - 0.5) * 1.29);
      map[roadZ][x][y] = Block.Road;

      roadZ += offset;

      if (isInside2D(x, roadZ, levelSize)) {
        map[roadZ][x][y] = Block.Road;
      }
    }
  }

  // central vertical road
  let roadX = villagePointX;
  for (let z = villagePointZ - villageRadius; z < villagePointZ + villageRadius; z++) {
    if (!isInside2D(roadX, z, levelSize)) continue;

    if (map[z][roadX][y] === Block.Grass) {
      const offset = Math.round((Math.random() - 0.5) * 1.29);
      map[z][roadX][y] = Block.Road;

      roadX += offset;

      if (isInside2D(roadX, z, levelSize)) {
        map[z][roadX][y] = Block.Road;
      }
    }
  }

  const housesNum = getRandomInt(housesRange[0], housesRange[1] + 1);
  const maxAttempts = housesNum * 120;
  let placed = 0;
  let attempts = 0;

  while (placed < housesNum && attempts < maxAttempts) {
    attempts++;

    let x = getRandomInt(villagePointX - villageRadius, villagePointX + villageRadius + 1);
    let z = getRandomInt(villagePointZ - villageRadius, villagePointZ + villageRadius + 1);

    if (!isInside2D(x, z, levelSize)) {
      continue;
    }

    if (
      checkRadius(map, x, z, y, 2, Block.Grass) &&
      checkRadius(entities, x, z, y, 2, Entity.Empty)
    ) {
      // reserve 5x5 temporary area
      for (let zz = z - 2; zz <= z + 2; zz++) {
        for (let xx = x - 2; xx <= x + 2; xx++) {
          if (isInside2D(xx, zz, levelSize)) {
            entities[zz][xx][y] = Entity.NotPlaceable;
          }
        }
      }

      entities[z][x][y] = Entity.House;
      placed++;

      const way = [0, 0];
      let steps = 0;

      for (let step = 0; step < villageRadius; step++) {
        if (getBlock(map, x - step, z, y) === Block.Road) {
          way[0] = -1;
          steps = step;
          break;
        }
        if (getBlock(map, x + step, z, y) === Block.Road) {
          way[0] = 1;
          steps = step;
          break;
        }
        if (getBlock(map, x, z - step, y) === Block.Road) {
          way[1] = -1;
          steps = step;
          break;
        }
        if (getBlock(map, x, z + step, y) === Block.Road) {
          way[1] = 1;
          steps = step;
          break;
        }
      }

      villageHouses.push({ x, z, y, way });

      let roadCarveX = x;
      let roadCarveZ = z;

      for (let step = 0; step < steps + 2; step++) {
        const carveX = roadCarveX + way[0] * step;
        const carveZ = roadCarveZ + way[1] * step;

        if (isInside2D(carveX, carveZ, levelSize)) {
          map[carveZ][carveX][y] = Block.Road;
        }

        const offset = Math.round((Math.random() - 0.5) * 1.30);

        if (way[0] === 0) {
          roadCarveX += offset;
        }
        if (way[1] === 0) {
          roadCarveZ += offset;
        }

        const carveX2 = roadCarveX + way[0] * step;
        const carveZ2 = roadCarveZ + way[1] * step;

        if (isInside2D(carveX2, carveZ2, levelSize)) {
          map[carveZ2][carveX2][y] = Block.Road;
        }
      }
    }
  }
  // refine house collision and orientation based on actual nearby road
  const refinedVillageHouses = [];

  for (let i = 0; i < villageHouses.length; i++) {
    const house = villageHouses[i];
    const x = house.x;
    const z = house.z;

    // clear the temporary 5x5 reserve first
    for (let zz = z - 2; zz <= z + 2; zz++) {
      for (let xx = x - 2; xx <= x + 2; xx++) {
        if (isInside2D(xx, zz, levelSize)) {
          entities[zz][xx][y] = Entity.Empty;
        }
      }
    }

    let hasAdjacentRoad = false;

    if (getBlock(map, x - 1, z, y) === Block.Road) {
      house.way = [-1, 0];
      hasAdjacentRoad = true;

      for (let xx = x; xx <= x + 2; xx++) {
        for (let zz = z - 1; zz <= z + 1; zz++) {
          if (isInside2D(xx, zz, levelSize)) {
            entities[zz][xx][y] = Entity.NotPlaceable;
          }
        }
      }
    } else if (getBlock(map, x + 1, z, y) === Block.Road) {
      house.way = [1, 0];
      hasAdjacentRoad = true;

      for (let xx = x - 2; xx <= x; xx++) {
        for (let zz = z - 1; zz <= z + 1; zz++) {
          if (isInside2D(xx, zz, levelSize)) {
            entities[zz][xx][y] = Entity.NotPlaceable;
          }
        }
      }
    } else if (getBlock(map, x, z - 1, y) === Block.Road) {
      house.way = [0, -1];
      hasAdjacentRoad = true;

      for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let zz = z; zz <= z + 2; zz++) {
          if (isInside2D(xx, zz, levelSize)) {
            entities[zz][xx][y] = Entity.NotPlaceable;
          }
        }
      }
    } else if (getBlock(map, x, z + 1, y) === Block.Road) {
      house.way = [0, 1];
      hasAdjacentRoad = true;

      for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let zz = z - 2; zz <= z; zz++) {
          if (isInside2D(xx, zz, levelSize)) {
            entities[zz][xx][y] = Entity.NotPlaceable;
          }
        }
      }
    }

    if (hasAdjacentRoad) {
      entities[z][x][y] = Entity.House;
      refinedVillageHouses.push(house);
    }
  }

  return { villageHouses: refinedVillageHouses };
}
// Legacy helper kept for possible future village refactoring.
// It is not currently used by the active generator.
function findNearestRoadDirection(map, x, z, y, maxDistance) {
  for (let step = 1; step <= maxDistance; step++) {
    if (getBlock(map, x - step, z, y) === Block.Road) return [-1, 0];
    if (getBlock(map, x + step, z, y) === Block.Road) return [1, 0];
    if (getBlock(map, x, z - step, y) === Block.Road) return [0, -1];
    if (getBlock(map, x, z + step, y) === Block.Road) return [0, 1];
  }

  return [0, 1];
}

// Legacy helper kept for possible future village refactoring.
// It creates a short road segment from a house entrance direction.
function carveRoadToHouse(map, x, z, y, way, levelSize) {
  const [dx, dz] = way;

  // carve from house entrance outward
  for (let step = 1; step <= 3; step++) {
    const rx = x + dx * step;
    const rz = z + dz * step;

    if (!isInside2D(rx, rz, levelSize)) break;
    map[rz][rx][y] = Block.Road;
  }
}
// Legacy helper kept for possible future village refactoring.
// It marks the front side of a house as blocked for collision.
function markHouseFrontCollision(entities, x, z, y, way, levelSize) {
  const [dx, dz] = way;

  if (dx === -1) {
    for (let zz = z - 1; zz <= z + 1; zz++) {
      if (isInside2D(x + 1, zz, levelSize)) entities[zz][x + 1][y] = Entity.NotPlaceable;
    }
  } else if (dx === 1) {
    for (let zz = z - 1; zz <= z + 1; zz++) {
      if (isInside2D(x - 1, zz, levelSize)) entities[zz][x - 1][y] = Entity.NotPlaceable;
    }
  } else if (dz === -1) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      if (isInside2D(xx, z + 1, levelSize)) entities[z + 1][xx][y] = Entity.NotPlaceable;
    }
  } else if (dz === 1) {
    for (let xx = x - 1; xx <= x + 1; xx++) {
      if (isInside2D(xx, z - 1, levelSize)) entities[z - 1][xx][y] = Entity.NotPlaceable;
    }
  }
}
// Checks whether a square area around a position contains only one expected value.
// Used by village placement to find flat/empty space for houses.
function checkRadius(array3d, centerX, centerZ, y, radius, expectedValue) {
  const levelSize = array3d.length;

  for (let z = centerZ - radius; z <= centerZ + radius; z++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if (!isInside2D(x, z, levelSize)) {
        return false;
      }

      if (array3d[z][x][y] !== expectedValue) {
        return false;
      }
    }
  }

  return true;
}
// Safe block lookup. Returns null outside the map instead of throwing.
function getBlock(map, x, z, y) {
  if (z < 0 || z >= map.length) return null;
  if (x < 0 || x >= map[z].length) return null;
  if (y < 0 || y >= map[z][x].length) return null;
  return map[z][x][y];
}
// Boundary check 
function isInside2D(x, z, levelSize) {
  return x >= 0 && z >= 0 && x < levelSize && z < levelSize;
}
