import { initScene } from './scene.js';
import { initAnimations } from './animations.js';

export function createApp() {
  // Initialize Three.js scene
  const { scene, camera, renderer } = initScene();
  
  // Initialize animations
  initAnimations(scene, camera, renderer);
}
