import * as THREE from 'three';
import { createGrids } from './objects/grids.js';
import { createParticles } from './objects/particles.js';
import { createLights } from './objects/lights.js';

export function initScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    antialias: true,
    powerPreference: "high-performance",
    precision: "mediump"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  camera.position.setZ(30);

  // Add lights
  createLights(scene);

  // Add grids
  createGrids(scene);

  // Add particles
  createParticles(scene);

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }, false);

  return { scene, camera, renderer };
}
