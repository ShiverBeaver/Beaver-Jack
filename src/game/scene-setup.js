import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Creates the Three.js scene, camera, renderer, postprocessing and lights for one active level session.
export function createSceneSetup(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x338ba8);

  const camera = new THREE.PerspectiveCamera(
    75,
    container.clientWidth / container.clientHeight,
    0.1,
    300
  );

  camera.position.set(12, 12, 12);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;

  container.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    1.5,
    0.4,
    0.85
  );
  bloomPass.threshold = 0;
  bloomPass.strength = 0.2;
  bloomPass.radius = 0;
  composer.addPass(bloomPass);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 256;

  const lightRadius = 32;
  directionalLight.shadow.camera.left = -lightRadius;
  directionalLight.shadow.camera.right = lightRadius;
  directionalLight.shadow.camera.top = lightRadius;
  directionalLight.shadow.camera.bottom = -lightRadius;

  directionalLight.target = new THREE.Object3D();
  scene.add(directionalLight.target);
  scene.add(directionalLight);

  // Keeps the directional light near the camera so shadows remain visible
  // while the player moves around the map.
  function setLightAnchor(anchorX, anchorY, anchorZ) {
    directionalLight.position.set(
      anchorX + 20,
      anchorY + 10,
      anchorZ - 20
    );

    directionalLight.target.position.set(
      anchorX - 10,
      anchorY,
      anchorZ + 10
    );
  }

  setLightAnchor(0, 0, 0);

  // Updates camera and renderer dimensions when the browser window changes.
  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
  }

  return {
    scene,
    camera,
    renderer,
    composer,
    ambientLight,
    directionalLight,
    setLightAnchor,
    resize
  };
}