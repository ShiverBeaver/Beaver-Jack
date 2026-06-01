// Built-in playable level IDs. 
// Level 9 is the only built-in level that still uses the legacy village generator.
export const PLAYABLE_LEVEL_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Level presets used by the generator. 
// Each preset controls map size, source template images, height multipliers, water level and fixed tree count.
export const LEVEL_CONFIGS = {
  0: {
    id: 0,
    name: 'Menu Scene',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 16,
    templatePath: './assets/generation/leveltemplates/testlevel_colored.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [4, 6],
    heightTemplateRange: [3, 3],
    heightOffset: 0,
    waterLevel: 4,
    treeDensity: 0.02
  },
  1: {
    id: 1,
    name: 'Level 1',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 16,
    templatePath: './assets/generation/leveltemplates/empty.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [8, 8],
    heightTemplateRange: [1, 1],
    heightOffset: 3,
    waterLevel: 6,
    treeCount: 12
  },
  2: {
    id: 2,
    name: 'Level 2',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 17,
    templatePath: './assets/generation/leveltemplates/empty.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [11, 11],
    heightTemplateRange: [1, 1],
    heightOffset: 0,
    waterLevel: 4,
    treeCount: 16
  },
  3: {
    id: 3,
    name: 'Level 3',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 30,
    templatePath: './assets/generation/leveltemplates/empty.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [11, 11],
    heightTemplateRange: [1, 1],
    heightOffset: 0,
    waterLevel: 7,
    treeCount: 15
  },
  4: {
    id: 4,
    name: 'Level 4',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 32,
    templatePath: './assets/generation/leveltemplates/empty.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [21, 21],
    heightTemplateRange: [1, 1],
    heightOffset: 0,
    waterLevel: 8,
    treeCount: 25
  },
  5: {
    id: 5,
    name: 'Level 5',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 30,
    templatePath: './assets/generation/leveltemplates/level5.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [4, 4],
    heightTemplateRange: [3, 3],
    heightOffset: 0,
    waterLevel: 3,
    treeCount: 30
  },
  6: {
    id: 6,
    name: 'Level 6',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 52,
    templatePath: './assets/generation/leveltemplates/level6.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [3, 3],
    heightTemplateRange: [5, 5],
    heightOffset: 0,
    waterLevel: 4,
    treeCount: 40
  },
  7: {
    id: 7,
    name: 'Level 7',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 52,
    templatePath: './assets/generation/leveltemplates/level7.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [3, 3],
    heightTemplateRange: [5, 5],
    heightOffset: 0,
    waterLevel: 4,
    treeCount: 40
  },
  8: {
    id: 8,
    name: 'Level 8',
    generateVillage: false,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 52,
    templatePath: './assets/generation/leveltemplates/level8.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [4, 4],
    heightTemplateRange: [5, 5],
    heightOffset: 0,
    waterLevel: 4,
    treeCount: 40
  },
  9: {
    id: 9,
    name: 'Level 9',
    generateVillage: true,
    villageRadius: 8,
    housesRange: [4, 4],
    levelSize: 128,
    templatePath: './assets/generation/leveltemplates/testlevel_colored.png',
    noisePath: './assets/generation/noise/perlin_scale18_detail3.png',
    heightNoiseRange: [6, 6],
    heightTemplateRange: [8, 9],
    heightOffset: 0,
    waterLevel: 4,
    treeCount: 500
  }
};

// Returns a built-in level config, falling back to level 1 for invalid IDs.
export function getLevelConfig(levelId) {
  return LEVEL_CONFIGS[levelId] ?? LEVEL_CONFIGS[1];
}
