import * as THREE from 'three';

export function createParticles(scene) {
  const createParticleSystem = (count, color, size, spread) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    
    for(let i = 0; i < positions.length; i += 3) {
      positions[i] = (Math.random() - 0.5) * spread;
      positions[i + 1] = (Math.random() - 0.5) * spread;
      positions[i + 2] = (Math.random() - 0.5) * spread;
      scales[i / 3] = Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    
    const material = new THREE.PointsMaterial({
      size,
      color,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
    
    return new THREE.Points(geometry, material);
  };

  const particles = [
    createParticleSystem(5000, 0xff0000, 0.3, 400),
    createParticleSystem(4000, 0x00f3ff, 0.25, 350),
    createParticleSystem(3000, 0xff00ff, 0.35, 300),
    createParticleSystem(2000, 0x39ff14, 0.4, 250)
  ];

  particles.forEach(system => {
    system.frustumCulled = true;
    scene.add(system);
  });
  
  return particles;
}
