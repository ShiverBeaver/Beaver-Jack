// Mutable state for one active level run. 
// It is recreated every time a new level starts, unlike saved settings/highscores in localStorage.
export function createRuntimeGameState() {
  return {
    levelConfig: null,
    terrainData: null,
    hero: null,
    heroGridPosition: null,
    heroMoving: false,
    isSwimming: false,
    nextIsBridge: false,
    logsInInventory: 0,
    treesLeft: 0,
    entityMeshes: [],
    entityGroup: null,
    cameraOffset: { x: 0, y: 5, z: 4.5 },
    startTimestamp: null,
    elapsedTimeSeconds: 0,
    isWon: false
  };
}