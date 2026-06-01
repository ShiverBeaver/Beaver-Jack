import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const textureLoader = new THREE.TextureLoader();
const objLoader = new OBJLoader();

// Loads all textures and OBJ models needed by gameplay.
// The game controller caches this Promise so assets are loaded only once.
export async function loadGameAssets() {
  const [
    modelsTexture,
    waterTexture1,
    waterTexture2,
    borderTexture,
    underwaterGrassModel,
    waterlilyModel,
    treeModel,
    pineTreeModel,
    house1Model,
    house2Model,
    house3Model,
    beaverModel,
    logModel,
    bridgeModel
  ] = await Promise.all([
    loadTexture('./assets/textures/texture_models.png'),
    loadTexture('./assets/textures/water1.png', true),
    loadTexture('./assets/textures/water2.png', true),
    loadTexture('./assets/textures/clouds.png'),
    loadObjModel('./assets/models/underwatergrass.obj'),
    loadObjModel('./assets/models/waterlily.obj'),
    loadObjModel('./assets/models/tree1.obj'),
    loadObjModel('./assets/models/tree2.obj'),
    loadObjModel('./assets/models/House1.obj'),
    loadObjModel('./assets/models/House2.obj'),
    loadObjModel('./assets/models/House3.obj'),
    loadObjModel('./assets/models/beaver.obj'),
    loadObjModel('./assets/models/log.obj'),
    loadObjModel('./assets/models/bridge.obj')
  ]);

  modelsTexture.minFilter = THREE.NearestFilter;
  modelsTexture.magFilter = THREE.NearestFilter;

  borderTexture.minFilter = THREE.NearestFilter;
  borderTexture.magFilter = THREE.NearestFilter;

  // Most OBJ models share one pixel-art texture atlas.
  const modelsMaterial = new THREE.MeshLambertMaterial({ map: modelsTexture });

  waterTexture1.minFilter = THREE.NearestFilter;
  waterTexture1.magFilter = THREE.NearestFilter;

  waterTexture2.minFilter = THREE.NearestFilter;
  waterTexture2.magFilter = THREE.NearestFilter;

  const borderMaterial = new THREE.MeshBasicMaterial({
    map: borderTexture,
    transparent: true,
    opacity: 0.5
  });

  applyMaterialToModel(underwaterGrassModel, modelsMaterial);
  applyMaterialToModel(waterlilyModel, modelsMaterial);
  applyMaterialToModel(treeModel, modelsMaterial);
  applyMaterialToModel(pineTreeModel, modelsMaterial);
  applyMaterialToModel(house1Model, modelsMaterial);
  applyMaterialToModel(house2Model, modelsMaterial);
  applyMaterialToModel(house3Model, modelsMaterial);
  applyMaterialToModel(beaverModel, modelsMaterial);
  applyMaterialToModel(logModel, modelsMaterial);
  applyMaterialToModel(bridgeModel, modelsMaterial);

  return {
    modelsTexture,
    modelsMaterial,
    waterTexture1,
    waterTexture2,
    borderTexture,
    borderMaterial,
    underwaterGrassModel,
    waterlilyModel,
    treeModel,
    pineTreeModel,
    houseModels: [house1Model, house2Model, house3Model],
    beaverModel,
    logModel,
    bridgeModel
  };
}

// Promise wrapper around Three.js texture loading.
function loadTexture(path, repeated = false) {
  return new Promise((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        if (repeated) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
        }
        resolve(texture);
      },
      undefined,
      () => reject(new Error(`Failed to load texture: ${path}`))
    );
  });
}

// Promise wrapper around OBJLoader so asset loading can use async/await.
function loadObjModel(path) {
  return new Promise((resolve, reject) => {
    objLoader.load(
      path,
      (model) => resolve(model),
      undefined,
      () => reject(new Error(`Failed to load model: ${path}`))
    );
  });
}

// Applies the shared material to every mesh inside a loaded OBJ model and enables shadows for gameplay objects.
function applyMaterialToModel(model, material) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}