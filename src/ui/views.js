import { PLAYABLE_LEVEL_IDS } from '../game/level-config.js';
import { renderSettingsScreen } from './settings.js';
import { renderHighscoresScreen } from './highscores.js';
import { renderCustomLevelScreen } from './custom-level.js';

// Player name validation for the HTML form on the menu screen.
const PLAYER_NAME_REGEX = /^[A-Za-z0-9 _-]{2,16}$/;

// Top-level UI renderer for all SPA screens except the gameplay internals.
// Route-specific screens are rendered into the same root element.
export function renderView({
  route,
  state,
  root,
  hudRoot,
  onNavigate,
  onSettingsChange,
  onStartGame,
  audioController
}) {
  hudRoot.innerHTML = '';
  root.innerHTML = '';

  // Menu screen contains the validated player-name form.
  if (route === 'menu') {
    root.innerHTML = `
      <section class="screen menu-screen">
        <div class="pixel-panel menu-screen__panel">
          <h2 class="panel-title">Beaver-Jack</h2>

          <form id="menu-form" novalidate>
            <div class="form-row">
              <label for="playerName">Your name</label>
              <input
                id="playerName"
                name="playerName"
                type="text"
                class="menu-text-input"
                placeholder="BeaverMaster"
                maxlength="16"
                minlength="2"
                pattern="[A-Za-z0-9 _-]{2,16}"
                value="${escapeHtml(state.settings.playerName ?? '')}"
                required
                autofocus
              >
            </div>

            <div class="menu-screen__actions">
              <button type="submit" class="pixel-button" data-action="play">Play</button>
              <button type="button" class="pixel-button" data-action="settings">Settings</button>
              <button type="button" class="pixel-button" data-action="highscores">Highscores</button>
            </div>
          </form>
        </div>
      </section>
    `;

    const form = root.querySelector('#menu-form');
    const input = root.querySelector('#playerName');

    input.addEventListener('input', () => {
      validatePlayerNameInput(input);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const isValid = validatePlayerNameInput(input);

      if (!isValid) {
        input.reportValidity();
        input.focus();
        return;
      }

      onSettingsChange({
        playerName: input.value.trim()
      });

      onNavigate('levels');
    });

    root.querySelector('[data-action="settings"]').addEventListener('click', () => {
      onNavigate('settings');
    });

    root.querySelector('[data-action="highscores"]').addEventListener('click', () => {
      onNavigate('highscores');
    });

    return;
  }

  // Level selection screen. The desktop-only editor button is hidden on mobile.
  if (route === 'levels') {
    root.innerHTML = `
      <section class="screen levels-screen">
        <div class="pixel-panel levels-screen__panel">
          <h2 class="panel-title">Choose Level</h2>
          <div class="level-grid">
            ${PLAYABLE_LEVEL_IDS.map((level) => {
              return `<button class="level-button" data-level="${level}">${level}</button>`;
            }).join('')}
          </div>
          <div class="menu-screen__actions levels-screen__actions" style="margin-top: 1rem;">
            <button class="pixel-button desktop-only" data-action="level-editor">Level Editor</button>
            <button class="pixel-button" data-action="back">Back</button>
          </div>
        </div>
      </section>
    `;

    root.querySelectorAll('[data-level]').forEach((button) => {
      button.addEventListener('click', () => {
        const level = Number(button.dataset.level);
        onNavigate('game', { level });
      });
    });

    root.querySelector('[data-action="level-editor"]')?.addEventListener('click', () => {
      onNavigate('level-editor');
    });

    root.querySelector('[data-action="back"]').addEventListener('click', () => {
      onNavigate('menu');
    });

    return;
  }

  if (route === 'settings') {
    renderSettingsScreen({ root, state, onNavigate, onSettingsChange, audioController });
    return;
  }

  if (route === 'highscores') {
    renderHighscoresScreen({ root, state, onNavigate });
    return;
  }

  if (route === 'level-editor') {
    renderCustomLevelScreen({ root, onNavigate });
    return;
  }

  // The game route delegates actual Three.js setup to the game controller.
  if (route === 'game') {
    onStartGame({
      root,
      level: state.selectedLevel ?? 1
    });
    return;
  }

  onNavigate('menu', { push: false });
}

// Does the custom player-name rules.
function validatePlayerNameInput(input) {
  const value = input.value.trim();

  if (!value) {
    input.setCustomValidity('Please enter your name.');
    return false;
  }

  if (value.length < 2 || value.length > 16) {
    input.setCustomValidity('Name must be 2 to 16 characters long.');
    return false;
  }

  if (!PLAYER_NAME_REGEX.test(value)) {
    input.setCustomValidity('Use only letters, numbers, spaces, underscore, or dash.');
    return false;
  }

  input.setCustomValidity('');
  return true;
}

// Escapes user-provided name before injecting it into template strings.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}