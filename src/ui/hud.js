// Registers the <bridge-action-button> Web Component used by the gameplay HUD.
import './components/bridge-action-button.js';

// Creates the in-game overlay: counters, timer and mobile-friendly bridge button.
export function renderGameHud({ hudRoot, runtimeState, level, onPrepareBridge }) {
  hudRoot.innerHTML = `
    <div class="game-hud">
      <div class="game-hud__panel">
        <div>Level: <span id="hud-level">${level}</span></div>
        <div>Trees left: <span id="hud-trees">${runtimeState.treesLeft}</span></div>
        <div>Logs: <span id="hud-logs">${runtimeState.logsInInventory}</span></div>
        <div>Bridge: <span id="hud-bridge">${runtimeState.nextIsBridge ? 'READY' : 'NO'}</span></div>
        <div>Time: <span id="hud-time">${formatTime(runtimeState.elapsedTimeSeconds ?? 0)}</span></div>
      </div>
      <bridge-action-button id="hud-bridge-action" aria-label="Prepare bridge"></bridge-action-button>
    </div>
  `;

  document.getElementById('hud-bridge-action')?.addEventListener('prepare-bridge', () => {
    onPrepareBridge?.();
  });

  updateGameHud({ runtimeState });
}

// Synchronizes HUD text and bridge-button availability with runtime game state.
export function updateGameHud({ runtimeState }) {
  const trees = document.getElementById('hud-trees');
  const logs = document.getElementById('hud-logs');
  const bridge = document.getElementById('hud-bridge');
  const time = document.getElementById('hud-time');
  const bridgeAction = document.getElementById('hud-bridge-action');

  if (trees) trees.textContent = String(runtimeState.treesLeft);
  if (logs) logs.textContent = String(runtimeState.logsInInventory);
  if (bridge) bridge.textContent = runtimeState.nextIsBridge ? 'READY' : 'NO';
  if (time) time.textContent = formatTime(runtimeState.elapsedTimeSeconds ?? 0);

  if (bridgeAction) {
    // The bridge action is available only before winning, with 3+ logs, and
    // when another bridge placement is not already queued.
    const canPrepareBridge =
      runtimeState.logsInInventory >= 3 &&
      !runtimeState.nextIsBridge &&
      !runtimeState.isWon;

    bridgeAction.disabled = !canPrepareBridge;
    bridgeAction.classList.toggle('is-disabled', !canPrepareBridge);
    bridgeAction.setAttribute(
      'aria-label',
      canPrepareBridge ? 'Prepare bridge with three logs' : 'Bridge action unavailable'
    );
  }
}

// Displays the final result overlay after all trees are chopped.
export function showWinOverlay({
  hudRoot,
  elapsedTimeSeconds,
  isNewBest,
  onBackToMenu
}) {
  const overlay = document.createElement('div');
  overlay.className = 'win-overlay';
  overlay.innerHTML = `
    <div class="win-overlay__panel">
      <h2 class="win-overlay__title">You win!</h2>
      <div class="win-overlay__time">Time: ${formatTime(elapsedTimeSeconds)}</div>
      <div class="win-overlay__best">${isNewBest ? 'New best time!' : 'Level cleared.'}</div>
      <button class="pixel-button" data-action="menu">Back to Menu</button>
    </div>
  `;

  overlay.querySelector('[data-action="menu"]').addEventListener('click', () => {
    onBackToMenu();
  });

  hudRoot.appendChild(overlay);
}

// Formats elapsed play time as mm:ss.
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
