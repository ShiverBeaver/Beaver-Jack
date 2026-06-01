// Shared symbolic values for generated terrain and entities.
// The generator stores these strings in 3D arrays, and later mesh code
// reads the same values to build visible objects and collision rules.
export const Block = Object.freeze({
  Air: 'Air',
  Grass: 'Grass',
  Dirt: 'Dirt',
  Road: 'Road'
});

export const Entity = Object.freeze({
  Empty: 'Empty',
  NotPlaceable: 'NotPlaceable',
  House: 'House',
  Waterlily: 'Waterlily',
  VerticalFence: 'VerticalFence',
  HorizontalFence: 'HorizontalFence',
  UnderwaterGrass: 'UnderwaterGrass',
  Tree: 'Tree',
  PineTree: 'PineTree',
  Log: 'Log',
  Bridge: 'Bridge'
});