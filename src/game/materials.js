import * as THREE from 'three';

// Creates the terrain material from the block texture atlas.
export function createTerrainMaterial(texturePath) {
  const textureLoader = new THREE.TextureLoader();
  const texture = textureLoader.load(texturePath);

  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const material = new THREE.MeshLambertMaterial({
    map: texture
  });

  return {
    texture,
    material
  };
}