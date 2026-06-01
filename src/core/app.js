import { createInitialState } from './state.js';
import { createRouter } from './router.js';
import {
  loadSettings,
  loadHighscores,
  saveSettings,
  loadCustomLevelConfig
} from './storage.js';
import { renderView } from '../ui/views.js';
import { createGameController } from '../game/game-controller.js';
import { createAudioController } from '../ui/audio-ui.js';

// Creates the single-page application controller.
// It connects persistent state, routing, UI rendering, audio and the game runtime.
export function createApp() {
  const state = createInitialState();

  const viewRoot = document.getElementById('view-root');
  const hudRoot = document.getElementById('hud-root');

  const audioController = createAudioController({
    getSettings: () => state.settings
  });

  const gameController = createGameController({ hudRoot, audioController });

  const router = createRouter({
    onRouteChange: handleRouteChange
  });

  // Loads saved browser data and renders the initial route.
  function init() {
    document.addEventListener('click', handleGlobalButtonClick);

    const savedSettings = loadSettings();
    const savedHighscores = loadHighscores();

    if (savedSettings) {
      state.settings = { ...state.settings, ...savedSettings };
    }

    state.highscores = savedHighscores;

    const { route, level } = router.parseCurrentRoute();
    handleRouteChange(route, { level });
  }

  function refreshHighscores() {
    state.highscores = loadHighscores();
  }

  // Central route handler for the SPA. Every route change stops any active
  // game session before rendering the next screen into the same page.
  function handleRouteChange(route, { level = null } = {}) {
    gameController.stop();

    state.route = route;
    state.selectedLevel = level === 'custom' ? 'custom' : level ? Number(level) : null;
    state.game.running = route === 'game';

    if (route === 'highscores' || route === 'menu' || route === 'levels') {
      refreshHighscores();
    }

    renderView({
      route,
      state,
      root: viewRoot,
      hudRoot,
      onNavigate: (nextRoute, options) => router.goTo(nextRoute, options),
      audioController,
      onSettingsChange: (nextSettings) => {
        state.settings = { ...state.settings, ...nextSettings };
        saveSettings(state.settings);
      },
      // Game route callback. Custom levels are loaded from localStorage because
      // uploaded image data cannot be read again from the file input after reload.
      onStartGame: ({ root, level }) => {
        const customConfig = level === 'custom' ? loadCustomLevelConfig() : null;

        if (level === 'custom' && !customConfig) {
          router.goTo('level-editor', { push: false });
          return;
        }

        gameController.start({
          root,
          level,
          customConfig,
          state,
          onExit: () => router.goTo('menu'),
          onEditCustomLevel: () => router.goTo('level-editor')
        });
      }
    });
  }



  // Shared UI click sound for normal buttons. 
  // Gameplay-specific sounds are handled by the game/hero controllers.
  function handleGlobalButtonClick(event) {
    const button = event.target.closest?.('button');

    if (!button || button.disabled) {
      return;
    }

    audioController.playClick();
  }

  return {
    init
  };
}