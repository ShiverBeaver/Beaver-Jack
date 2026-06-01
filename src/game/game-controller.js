import { createSceneSetup } from './scene-setup.js';
import { getLevelConfig } from './level-config.js';
import { isProbablyMobile } from '../utils/device.js';
import { generateTerrainData } from '../generation/terrain-generator.js';
import { buildTerrainMesh } from './terrain-mesh.js';
import { createTerrainMaterial } from './materials.js';
import { loadGameAssets } from './asset-loader.js';
import { buildEntityGroup, buildWaterMeshes } from './entity-meshes.js';
import { buildSkyEffects } from './sky-effects.js';
import { createRuntimeGameState } from './game-state.js';
import { renderGameHud, updateGameHud, showWinOverlay } from '../ui/hud.js';
import { saveBestTimeForLevel } from '../core/storage.js';
import { createHeroController } from './hero-controller.js';
import { enableSwipeControls } from '../ui/mobile-controls.js';

// The loading screen shows for a hardcoded second (usually enough to load three.js)
const MINIMUM_LOADING_MS = 1000;
const DEFAULT_TEMPLATE_PATH = './assets/generation/leveltemplates/empty.png';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// Converts the custom level form data into the same config shape used by
// built-in levels. Villages are always disabled here because the legacy
// village generator is fragile and only supported in the level 9.
function normalizeCustomLevelConfig(config) {
  return {
    ...config,
    templatePath: config.templateImageDataUrl || DEFAULT_TEMPLATE_PATH,
    noisePath: config.noisePath || './assets/generation/noise/perlin_scale18_detail3.png',
    generateVillage: false,
    ignoreVillageTemplate: true,
    villageRadius: 0,
    housesRange: [0, 0]
  };
}

// Main runtime controller for a playable level.
// It owns the Three.js scene, terrain generation, HUD, controls, animations,
// win handling and cleanup when leaving/restarting the level.
export function createGameController({ hudRoot, audioController }) {
  let animationFrameId = null;
  let cleanupResize = null;
  let currentSession = null;
  let cachedAssetsPromise = null;
  let heroController = null;
  let waterAnimationInterval = null;
  let waterfallAnimationInterval = null;
  let hudTimerInterval = null;
  let cleanupSwipeControls = null;
  let startSequenceId = 0;

  async function start({ root, level, customConfig = null, state, onExit, onEditCustomLevel }) {
    // Starting a level always stops the previous session first.
    // This prevents old render loops, keyboard listeners or swipe handlers
    // from surviving after the player changes screens.
    stop();
    const sessionId = ++startSequenceId;
    // Level generation and the loading delay.
    // Slow levels stay on the loading screen until ready; fast levels still show the animation for a consistent amount of time.
    const minimumLoadingPromise = delay(MINIMUM_LOADING_MS);

    const runtimeState = createRuntimeGameState();
    const config = customConfig ? normalizeCustomLevelConfig(customConfig) : getLevelConfig(level);
    runtimeState.levelConfig = config;

    root.innerHTML = `
      <section class="game-shell">
        <div class="game-topbar">
          <div class="game-topbar__actions">
            <button class="pixel-button pixel-button--small" data-action="exit">Menu</button>
            ${config.isCustom ? '<button class="pixel-button pixel-button--small" data-action="edit-custom-level">Edit</button>' : ''}
          </div>
          <div class="game-level-label">${config.name}</div>
        </div>

        <div class="game-canvas-wrap">
          <div id="game-canvas-container" class="game-canvas-container"></div>
        </div>

        <div class="loading-overlay" data-loading-overlay aria-live="polite">
          <div class="grass-loader" aria-hidden="true">
            <span class="grass-loader__face grass-loader__face--top"></span>
            <span class="grass-loader__face grass-loader__face--front"></span>
            <span class="grass-loader__face grass-loader__face--back"></span>
            <span class="grass-loader__face grass-loader__face--right"></span>
            <span class="grass-loader__face grass-loader__face--left"></span>
          </div>
          <p class="loading-overlay__text">Loading level...</p>
        </div>
      </section>
    `;

    const exitButton = root.querySelector('[data-action="exit"]');
    const canvasContainer = root.querySelector('#game-canvas-container');
    const loadingOverlay = root.querySelector('[data-loading-overlay]');
    exitButton.addEventListener('click', () => {
      onExit();
    });

    root.querySelector('[data-action="edit-custom-level"]')?.addEventListener('click', () => {
      onEditCustomLevel?.();
    });

    const sceneSetup = createSceneSetup(canvasContainer);
    const { scene, camera, renderer, composer, resize, setLightAnchor } = sceneSetup;
    if (isProbablyMobile()) {
      renderer.setPixelRatio(1.25);
    }

    currentSession = {
      root,
      renderer,
      scene,
      terrainData: null,
      runtimeState,
      skyEffects: null
    };

    if (!cachedAssetsPromise) {
      cachedAssetsPromise = loadGameAssets();
    }

    // Terrain data and assets are loaded before visible meshes are created.
    // Assets are cached after the first level so switching levels is faster.
    const [terrainData, assets] = await Promise.all([
      generateTerrainData(config),
      cachedAssetsPromise
    ]);
    await minimumLoadingPromise;

    // If the player leaves the screen while async loading is still running,
    // this check prevents the old level from appearing after it finishes.
    if (sessionId !== startSequenceId) {
      renderer.dispose();
      return;
    }

    loadingOverlay?.remove();

    runtimeState.terrainData = terrainData;
    runtimeState.treesLeft = terrainData.treesLeft;
    runtimeState.startTimestamp = Date.now();
    runtimeState.elapsedTimeSeconds = 0;

    const { material: terrainMaterial } = createTerrainMaterial('./assets/textures/texture.png');

    // Generated block data is converted into one optimized terrain mesh.
    const terrainMesh = buildTerrainMesh({
      map: terrainData.map,
      levelSize: config.levelSize,
      waterLevel: terrainData.waterLevel
    });
    terrainMesh.material = terrainMaterial;
    scene.add(terrainMesh);

    const entityGroup = buildEntityGroup({
      entities: terrainData.entities,
      levelSize: config.levelSize,
      assets,
      villageHouses: terrainData.villageHouses,
      runtimeState
    });
    scene.add(entityGroup);

    const { waterMesh1, waterMesh2 } = buildWaterMeshes({
      levelSize: config.levelSize,
      waterLevel: terrainData.waterLevel,
      waterTexture1: assets.waterTexture1.clone(),
      waterTexture2: assets.waterTexture2.clone()
    });
    scene.add(waterMesh1);
    scene.add(waterMesh2);

    const skyEffects = buildSkyEffects({
      map: terrainData.map,
      levelSize: config.levelSize,
      waterLevel: terrainData.waterLevel,
      borderMaterial: assets.borderMaterial
    });
    scene.add(skyEffects.group);

    // The hero controller handles tile movement and gameplay actions.
    // The game controller only reacts to high-level events such as winning.
    heroController = createHeroController({
      scene,
      camera,
      runtimeState,
      terrainData,
      assets,
      onWin: () => {
        audioController?.playWinMelody();
        runtimeState.elapsedTimeSeconds = Math.floor((Date.now() - runtimeState.startTimestamp) / 1000);
        updateGameHud({ runtimeState });

        stopHudTimer();
        const isCustomLevel = level === 'custom' || config.isCustom;
        const isNewBest = isCustomLevel
          ? false
          : saveBestTimeForLevel(level, {
              name: state.settings.playerName || 'Anonymous',
              time: runtimeState.elapsedTimeSeconds
            });

        showWinOverlay({
          hudRoot,
          elapsedTimeSeconds: runtimeState.elapsedTimeSeconds,
          isNewBest,
          onBackToMenu: () => onExit()
        });
      },
      setLightAnchor,
      audioController
    });

    await heroController.spawnHero(config.levelSize);
    heroController.enableKeyboard();
    cleanupSwipeControls = enableSwipeControls({
      element: canvasContainer,
      heroController
    });

    // The HUD is rendered after the hero exists so its bridge button can call
    // the same prepareBridge() logic as the keyboard E shortcut.
    renderGameHud({
      hudRoot,
      runtimeState,
      level,
      onPrepareBridge: () => heroController?.prepareBridge()
    });

    startHudTimer(runtimeState);
    startWaterStepAnimation(waterMesh1, waterMesh2);
    startWaterfallAnimation(skyEffects.waterfallLayers, terrainData.waterLevel);

    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      composer.render();
    }

    function handleResize() {
      resize();
      heroController?.syncCamera();
    }

    window.addEventListener('resize', handleResize);
    cleanupResize = () => window.removeEventListener('resize', handleResize);

    animate();

    currentSession = {
      root,
      renderer,
      scene,
      terrainData,
      runtimeState,
      skyEffects
    };
  }

  // Cleans up the whole active level session: render loop, timers, controls, Three.js objects and HUD.
  function stop() {
    startSequenceId++;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    stopWaterAnimation();
    stopWaterfallAnimation();
    stopHudTimer();

    if (cleanupSwipeControls) {
      cleanupSwipeControls();
      cleanupSwipeControls = null;
    }

    heroController?.disableKeyboard();
    heroController = null;

    if (cleanupResize) {
      cleanupResize();
      cleanupResize = null;
    }

    if (currentSession?.renderer) {
      currentSession.renderer.dispose();
    }

    if (hudRoot) {
      hudRoot.innerHTML = '';
    }

    if (currentSession?.root) {
      currentSession.root.innerHTML = '';
    }

    currentSession = null;
  }

  function startWaterStepAnimation(waterMesh1, waterMesh2) {
    stopWaterAnimation();

    waterAnimationInterval = setInterval(() => {
      waterMesh1.rotation.y += Math.PI / 2;
      waterMesh2.rotation.y += Math.PI / 2;
    }, 400);
  }

  function stopWaterAnimation() {
    if (waterAnimationInterval) {
      clearInterval(waterAnimationInterval);
      waterAnimationInterval = null;
    }
  }

  function startWaterfallAnimation(waterfallLayers, waterLevel) {
    stopWaterfallAnimation();

    waterfallAnimationInterval = setInterval(() => {
      for (let i = 0; i < waterfallLayers.length; i++) {
        const layer = waterfallLayers[i];
        if (!layer) continue;

        layer.position.y -= 1;

        if (layer.position.y < waterLevel - 3) {
          layer.position.y += 4;
        }
      }
    }, 400);
  }

  function stopWaterfallAnimation() {
    if (waterfallAnimationInterval) {
      clearInterval(waterfallAnimationInterval);
      waterfallAnimationInterval = null;
    }
  }

  function startHudTimer(runtimeState) {
    stopHudTimer();

    hudTimerInterval = setInterval(() => {
      if (runtimeState.isWon) return;

      runtimeState.elapsedTimeSeconds = Math.floor((Date.now() - runtimeState.startTimestamp) / 1000);
      updateGameHud({ runtimeState });
    }, 250);
  }

  function stopHudTimer() {
    if (hudTimerInterval) {
      clearInterval(hudTimerInterval);
      hudTimerInterval = null;
    }
  }

  return {
    start,
    stop
  };
}