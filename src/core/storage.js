// LocalStorage keys used by the app.
// Settings/highscores are small JSON objects; the custom level may also contain
// one uploaded template image stored as a data URL.
const SETTINGS_KEY = 'beaverjack_settings';
const HIGHSCORES_KEY = 'beaverjack_highscores';
const CUSTOM_LEVEL_KEY = 'beaverjack_custom_level';

// Reads saved player/audio settings. Invalid stored JSON is ignored safely.
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Highscores are stored per built-in level number. Custom levels are not saved
// here because their configuration is temporary/user-defined.
export function loadHighscores() {
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to load highscores:', error);
    return {};
  }
}

export function saveHighscores(highscores) {
  try {
    localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(highscores));
  } catch (error) {
    console.error('Failed to save highscores:', error);
  }
}

// Saves a best time only when the new result beats the previous one.
export function saveBestTimeForLevel(level, entry) {
  try {
    const highscores = loadHighscores();
    const previous = highscores[level];

    if (previous == null || entry.time < previous.time) {
      highscores[level] = entry;
      saveHighscores(highscores);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to save best time:', error);
    return false;
  }
}

// Loads the last custom level form result. Only one custom level is persisted
// to keep localStorage usage predictable.
export function loadCustomLevelConfig() {
  try {
    const raw = localStorage.getItem(CUSTOM_LEVEL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to load custom level:', error);
    return null;
  }
}

export function saveCustomLevelConfig(config) {
  try {
    localStorage.setItem(CUSTOM_LEVEL_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('Failed to save custom level:', error);
    throw error;
  }
}
