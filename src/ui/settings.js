// Shows sound volume as a readable percentage next to the pixel-art slider.
function formatPercent(value) {
  return `${Math.round(Number(value) * 100)}%`;
}

// Renders sound settings and plays short audio previews for toggle/slider input.
export function renderSettingsScreen({ root, state, onNavigate, onSettingsChange, audioController }) {
  const soundVolume = Number(state.settings.soundVolume ?? 0.7);

  root.innerHTML = `
    <section class="screen settings-screen">
      <div class="pixel-panel settings-screen__panel">
        <h2 class="panel-title">Settings</h2>

        <div class="settings-control settings-control--toggle">
          <label class="pixel-toggle" for="soundEnabled">
            <input
              class="pixel-toggle__input"
              type="checkbox"
              id="soundEnabled"
              ${state.settings.soundEnabled ? 'checked' : ''}
            >
            <span class="pixel-toggle__box" aria-hidden="true"></span>
            <span class="pixel-toggle__label">Sound enabled</span>
          </label>
        </div>

        <div class="settings-control settings-control--slider">
          <label class="settings-control__label" for="soundVolume">Sound volume</label>
          <div class="pixel-slider-row">
            <div class="pixel-slider-shell" aria-hidden="false">
              <span class="pixel-slider-shell__cap pixel-slider-shell__cap--start" aria-hidden="true"></span>
              <span class="pixel-slider-shell__vine pixel-slider-shell__vine--first" aria-hidden="true"></span>
              <span class="pixel-slider-shell__vine pixel-slider-shell__vine--second" aria-hidden="true"></span>
              <span class="pixel-slider-shell__cap pixel-slider-shell__cap--end" aria-hidden="true"></span>
              <input
                class="pixel-slider"
                type="range"
                id="soundVolume"
                min="0"
                max="1"
                step="0.01"
                value="${soundVolume}"
              >
            </div>
            <output class="pixel-slider-value" id="soundVolumeValue" for="soundVolume">${formatPercent(soundVolume)}</output>
          </div>
        </div>

        <div class="settings-screen__actions">
          <button class="pixel-button" data-action="save">Save</button>
          <button class="pixel-button" data-action="back">Back</button>
        </div>
      </div>
    </section>
  `;

  const soundVolumeInput = root.querySelector('#soundVolume');
  const soundVolumeValue = root.querySelector('#soundVolumeValue');
  const soundEnabledInput = root.querySelector('#soundEnabled');

  // Toggle sound is forced so the user receives feedback while enabling sound.
  soundEnabledInput.addEventListener('change', () => {
    audioController?.playToggle();
  });

  soundVolumeInput.addEventListener('pointerdown', () => {
    audioController?.playSliderPreview({
      enabled: soundEnabledInput.checked,
      volume: soundVolumeInput.value
    });
  });

  // The Web Audio preview makes the Media API usage visible in the settings UI.
  soundVolumeInput.addEventListener('input', () => {
    soundVolumeValue.textContent = formatPercent(soundVolumeInput.value);
    audioController?.playSliderPreview({
      enabled: soundEnabledInput.checked,
      volume: soundVolumeInput.value
    });
  });

  root.querySelector('[data-action="save"]').addEventListener('click', () => {
    const nextSettings = {
      soundEnabled: soundEnabledInput.checked,
      soundVolume: Number(soundVolumeInput.value)
    };

    onSettingsChange(nextSettings);
    onNavigate('menu');
  });

  root.querySelector('[data-action="back"]').addEventListener('click', () => {
    onNavigate('menu');
  });
}
