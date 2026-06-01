// Initial in-memory UI state. 
// Saved settings/highscores are merged in later from localStorage when the app starts.
export function createInitialState() {
  return {
    route: 'menu',
    selectedLevel: null,
    settings: {
      playerName: '',
      soundEnabled: true,
      soundVolume: 0.7
    },
    highscores: {},
    game: {
      running: false
    }
  };
}