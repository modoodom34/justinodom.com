import * as THREE from 'three';

export function createGrids(scene) {
  const createGrid = (size, divisions, color, y, opacity) => {
    const grid = new THREE.GridHelper(size, divisions, color, color);
    grid.material.transparent = true;
    grid.material.opacity = opacity;
    grid.material.depthWrite = false;
    grid.material.blending = THREE.AdditiveBlending;
    grid.position.y = y;
    grid.rotation.x = Math.PI * 0.25;
    return grid;
  };

  const grids = [
    createGrid(400, 50, 0xff0000, -10, 0.2),
    createGrid(300, 40, 0x00f3ff, -20, 0.15),
    createGrid(200, 30, 0xff00ff, -30, 0.1)
  ];

  grids.forEach(grid => {
    grid.frustumCulled = true;
    scene.add(grid);
  });
  
  return grids;
}
