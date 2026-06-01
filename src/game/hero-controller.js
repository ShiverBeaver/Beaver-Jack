import { Entity } from '../generation/enums.js';
import { updateGameHud } from '../ui/hud.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Controls the beaver character and all tile-based gameplay actions:
// movement, chopping trees, picking logs, preparing bridges and win detection.
export function createHeroController({
  scene,
  camera,
  runtimeState,
  terrainData,
  assets,
  onWin,
  setLightAnchor,
  audioController
}) {
  let keyDownHandler = null;
  let keyUpHandler = null;
  let movementLoopInterval = null;
  let activeDirection = null;

  // Places the beaver near the center of the generated map and aligns the
  // camera/light to him before the player starts moving.
  async function spawnHero(levelSize) {
    const hero = assets.beaverModel.clone(true);
    hero.scale.set(0.5, 0.5, 0.5);

    const center = Math.floor(levelSize / 2);
    const groundY = terrainData.heightMap[center][center] + 1;
    const startY = groundY <= terrainData.waterLevel ? terrainData.waterLevel : groundY;

    hero.position.set(center, startY, center);
    hero.castShadow = true;
    hero.receiveShadow = true;

    runtimeState.hero = hero;
    runtimeState.heroGridPosition = { x: center, z: center };
    runtimeState.isSwimming = startY <= terrainData.waterLevel;

    scene.add(hero);
    syncCamera();
  }

  // Keyboard controls are enabled only while a level is active.
  // They are removed again when leaving the level to avoid duplicate listeners.
  function enableKeyboard() {
    keyDownHandler = (event) => {
      if (runtimeState.isWon) return;

      const key = event.key.toLowerCase();

      if (key === 'e') {
        if (!event.repeat) {
          prepareBridge();
        }
        return;
      }

      const direction = keyToDirection(key);
      if (!direction) return;

      activeDirection = direction;
      startMovementLoop();
    };

    keyUpHandler = (event) => {
      const key = event.key.toLowerCase();
      const direction = keyToDirection(key);
      if (!direction) return;

      if (
        activeDirection &&
        activeDirection.dx === direction.dx &&
        activeDirection.dz === direction.dz
      ) {
        activeDirection = null;
      }

      if (!activeDirection) {
        stopMovementLoop();
      }
    };

    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
  }

  function disableKeyboard() {
    stopMovementLoop();

    if (keyDownHandler) {
      document.removeEventListener('keydown', keyDownHandler);
      keyDownHandler = null;
    }

    if (keyUpHandler) {
      document.removeEventListener('keyup', keyUpHandler);
      keyUpHandler = null;
    }

    activeDirection = null;
  }

  // Holding a movement key repeatedly attempts tile movement.
  // The actual move function still blocks overlapping movement animations.
  function startMovementLoop() {
    if (movementLoopInterval) return;

    movementLoopInterval = setInterval(async () => {
      if (!activeDirection || runtimeState.heroMoving || runtimeState.isWon) {
        return;
      }

      await tryMove(activeDirection.dx, activeDirection.dz);
    }, 35);
  }

  function stopMovementLoop() {
    if (movementLoopInterval) {
      clearInterval(movementLoopInterval);
      movementLoopInterval = null;
    }
  }

  // Prepares bridge placement. Spending 3 logs does not place the bridge
  // immediately; the next valid movement target becomes the bridge tile.
  function prepareBridge() {
    if (runtimeState.logsInInventory >= 3 && !runtimeState.nextIsBridge && !runtimeState.isWon) {
      runtimeState.logsInInventory -= 3;
      runtimeState.nextIsBridge = true;
      updateGameHud({ runtimeState });
    }
  }

  // Attempts one tile-based move. The function also handles interaction with
  // the destination tile: chopping trees, collecting logs, swimming and
  // placing a prepared bridge.
  async function tryMove(dx, dz) {
    // Prevents multiple movement animations or interactions from running at
    // the same time.
    if (runtimeState.heroMoving || !runtimeState.hero || runtimeState.isWon) {
      return;
    }

    runtimeState.heroMoving = true;

    const hero = runtimeState.hero;
    const fromX = runtimeState.heroGridPosition.x;
    const fromZ = runtimeState.heroGridPosition.z;
    const toX = fromX + dx;
    const toZ = fromZ + dz;
    const levelSize = terrainData.heightMap.length;

    orientHero(dx, dz);

    // Do not allow the player to leave the generated map.
    if (toX < 0 || toZ < 0 || toX >= levelSize || toZ >= levelSize) {
      runtimeState.heroMoving = false;
      return;
    }

    // The hero always stands one block above the terrain surface.
    let destinationY = terrainData.heightMap[toZ][toX] + 1;

    if (destinationY <= terrainData.waterLevel) {
      destinationY = terrainData.waterLevel;
      runtimeState.isSwimming = true;
    } else {
      runtimeState.isSwimming = false;
    }

    const jumpHeight = destinationY - hero.position.y;
    // The beaver cannot climb or fall more than one block at once.
    if (Math.abs(jumpHeight) > 1 && !runtimeState.nextIsBridge) {
      runtimeState.heroMoving = false;
      return;
    }

    const targetEntity = terrainData.entities[toZ][toX][destinationY - 1];

    // If bridge placement was prepared, the next empty target tile becomes a
    // bridge instead of a normal movement destination.
    if (runtimeState.nextIsBridge && targetEntity === Entity.Empty) {
      const groundTopY = terrainData.heightMap[toZ][toX];
      const bridgeBaseY = Math.max(groundTopY, terrainData.waterLevel - 1);

      placeBridge(toX, toZ, bridgeBaseY);
      runtimeState.nextIsBridge = false;
      updateGameHud({ runtimeState });
      runtimeState.heroMoving = false;
      return;
    }

    if (targetEntity === Entity.NotPlaceable) {
      runtimeState.heroMoving = false;
      return;
    }

    // Moving into a tree does not move the player; it attempts to chop the tree.
    if (targetEntity === Entity.Tree || targetEntity === Entity.PineTree) {
      await chopTree(toX, toZ, destinationY - 1);
      runtimeState.heroMoving = false;
      return;
    }

    // Logs are collected after stepping onto their tile.
    if (targetEntity === Entity.Log) {
      setTimeout(() => {
        const logMesh = runtimeState.entityMeshes[toZ][toX][destinationY - 1];
        if (logMesh) {
          removeEntityMesh(logMesh);
        }

        runtimeState.entityMeshes[toZ][toX][destinationY - 1] = null;
        terrainData.entities[toZ][toX][destinationY - 1] = Entity.Empty;
        runtimeState.logsInInventory += 1;
        audioController?.playPickupLog();
        updateGameHud({ runtimeState });
      }, 250);
    }

    const start = {
      x: hero.position.x,
      y: hero.position.y,
      z: hero.position.z
    };

    const end = {
      x: toX,
      y: destinationY,
      z: toZ
    };

    let t = 0;
    let yOffset = 0;

    // Smooth visual interpolation between two tile positions.
    // Gameplay is still grid-based; this only animates the movement.
    while (t < 1) {
      t += 0.02;

      if (!runtimeState.isSwimming) {
        if (t <= 0.5) {
          yOffset += 0.013;
        } else {
          yOffset -= 0.013;
        }
      }

      const heroX = lerp(start.x, end.x, t);
      const heroY = lerp(start.y, end.y, t);
      const heroZ = lerp(start.z, end.z, t);

      hero.position.set(heroX, heroY + yOffset, heroZ);

      const cameraT = -(t - 1) * (t - 1) + 1;
      const cameraX = lerp(start.x, end.x, cameraT);
      const cameraY = lerp(start.y, end.y, cameraT);
      const cameraZ = lerp(start.z, end.z, cameraT);

      setCameraFromAnchor(cameraX, cameraY, cameraZ);

      await delay(1);
    }

    hero.position.set(end.x, end.y, end.z);
    runtimeState.heroGridPosition = { x: toX, z: toZ };
    syncCamera();
    runtimeState.heroMoving = false;
  }

  // Plays a short shake animation on the tree and replaces a chopped tree
  // with a log entity that the player can collect.
  async function chopTree(x, z, y) {
    const targetModel = runtimeState.entityMeshes[z][x][y];
    if (!targetModel) return;

    audioController?.playChop();

    let t = 0;

    while (t < 10) {
      const value = Math.sin(0.5 * (t * t) + 9) * Math.sqrt(-t + 10);
      targetModel.position.x = x + value * 0.04;
      t += 0.15;
      await delay(1);
    }

    removeEntityMesh(targetModel);
    runtimeState.entityMeshes[z][x][y] = null;
    terrainData.entities[z][x][y] = Entity.Empty;

    const logDropChance = 1.0;

    if (Math.random() < logDropChance) {
      const logMesh = assets.logModel.clone(true);
      logMesh.position.set(x, y + 0.65, z);
      logMesh.rotation.y = (Math.PI / 2) * Math.floor(Math.random() * 4);

      scene.add(logMesh);

      runtimeState.entityMeshes[z][x][y] = logMesh;
      terrainData.entities[z][x][y] = Entity.Log;
    }

    runtimeState.treesLeft -= 1;
    updateGameHud({ runtimeState });

    // Winning condition: all generated trees have been chopped down.
    if (runtimeState.treesLeft <= 0 && !runtimeState.isWon) {
      runtimeState.isWon = true;
      disableKeyboard();
      onWin?.();
    }
  }

  function placeBridge(x, z, y) {
    const groundTopY = terrainData.heightMap[z][x];
    const isOnGround = groundTopY >= terrainData.waterLevel;

    const bridgeTop = assets.bridgeModel.clone(true);
    bridgeTop.position.set(x, y + 1, z);
    bridgeTop.rotation.y = (Math.PI / 2) * Math.floor(Math.random() * 4);
    scene.add(bridgeTop);

    if (isOnGround) {
      const bridgeBottom = assets.bridgeModel.clone(true);
      bridgeBottom.position.set(x, y + 0.5, z);
      bridgeBottom.rotation.y = bridgeTop.rotation.y;
      scene.add(bridgeBottom);
    }

    runtimeState.entityMeshes[z][x][y] = bridgeTop;
    terrainData.entities[z][x][y] = Entity.Bridge;
    terrainData.heightMap[z][x] = y + 1;
    audioController?.playBridge();
  }

  function removeEntityMesh(mesh) {
    if (runtimeState.entityGroup && runtimeState.entityGroup.children.includes(mesh)) {
      runtimeState.entityGroup.remove(mesh);
    } else {
      scene.remove(mesh);
    }
  }

  function orientHero(dx, dz) {
    if (!runtimeState.hero) return;

    if (dx === 1) runtimeState.hero.rotation.y = 0;
    if (dx === -1) runtimeState.hero.rotation.y = Math.PI;
    if (dz === 1) runtimeState.hero.rotation.y = Math.PI * 1.5;
    if (dz === -1) runtimeState.hero.rotation.y = Math.PI * 0.5;
  }

  function moveOnce(direction) {
    if (!direction || runtimeState.isWon) return;
    tryMove(direction.dx, direction.dz);
  }

  function startDirectionHold(direction) {
    if (!direction || runtimeState.isWon) return;
    activeDirection = direction;
    startMovementLoop();
  }

  function stopDirectionHold(direction = null) {
    if (
      direction &&
      activeDirection &&
      (activeDirection.dx !== direction.dx || activeDirection.dz !== direction.dz)
    ) {
      return;
    }

    activeDirection = null;
    stopMovementLoop();
  }

  function syncCamera() {
    if (!runtimeState.hero) return;

    setCameraFromAnchor(
      runtimeState.hero.position.x,
      runtimeState.hero.position.y,
      runtimeState.hero.position.z
    );
  }

  function setCameraFromAnchor(anchorX, anchorY, anchorZ) {
    const offset = runtimeState.cameraOffset;

    camera.position.set(
      anchorX + offset.x,
      anchorY + offset.y,
      anchorZ + offset.z
    );

    camera.lookAt(anchorX, anchorY, anchorZ);

    if (setLightAnchor) {
      setLightAnchor(anchorX, anchorY, anchorZ);
    }
  }

  return {
    spawnHero,
    enableKeyboard,
    disableKeyboard,
    prepareBridge,
    moveOnce,
    startDirectionHold,
    stopDirectionHold,
    syncCamera
  };
}

// Maps WASD keyboard input to grid movement directions.
function keyToDirection(key) {
  if (key === 'a') return { dx: -1, dz: 0 };
  if (key === 'd') return { dx: 1, dz: 0 };
  if (key === 'w') return { dx: 0, dz: -1 };
  if (key === 's') return { dx: 0, dz: 1 };
  return null;
}

// Linear interpolation helper for movement and camera animation.
function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}