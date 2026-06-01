import { PLAYABLE_LEVEL_IDS } from '../game/level-config.js';

// Formats seconds into mm:ss for HUD and highscore displays.
function formatTime(seconds) {
  if (seconds == null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Renders best times for built-in levels. 
// Custom levels are excluded because their layout can change every time the editor is used.
export function renderHighscoresScreen({ root, state, onNavigate }) {
  const items = PLAYABLE_LEVEL_IDS.map((level) => {
    const score = state.highscores[level];

    const name = score?.name ?? '---';
    const time = score?.time ?? null;

    return `
      <div class="score-item">
        <span>Level ${level}</span>
        <span>${name}</span>
        <span>${formatTime(time)}</span>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <section class="screen highscores-screen">
      <div class="pixel-panel highscores-screen__panel">
        <h2 class="panel-title">Highscores</h2>
        <div class="score-list">${items}</div>
        <div class="highscores-screen__actions">
          <button class="pixel-button" data-action="back">Back</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector('[data-action="back"]').addEventListener('click', () => {
    onNavigate('menu');
  });
}