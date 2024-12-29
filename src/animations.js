import { gsap } from 'gsap';

export function initAnimations(scene, camera, renderer) {
  let frame = 0;
  let lastTime = 0;
  const FPS_LIMIT = 60;
  const frameTime = 1000 / FPS_LIMIT;

  function animate(currentTime) {
    requestAnimationFrame(animate);

    // Throttle frame rate
    const delta = currentTime - lastTime;
    if (delta < frameTime) return;
    
    lastTime = currentTime - (delta % frameTime);
    frame += 0.01;

    // Cache calculations
    const sinFrame = Math.sin(frame);
    const cosFrame = Math.cos(frame);

    // Optimize scene traversal
    scene.children.forEach((child, index) => {
      if (!child.visible) return;

      if (child.isPoints) {
        // Reduce rotation calculations
        child.rotation.y += 0.0005 * (index + 1);
        child.rotation.x = sinFrame * 0.3;
        child.position.y = cosFrame * 3;
      }
      if (child.isGridHelper) {
        child.rotation.y += 0.001 * (index + 1);
        child.position.y = sinFrame * 5 - 10 - (index * 10);
      }
    });

    // Smoother camera movement
    camera.position.y = sinFrame * 0.1 * 2;
    camera.rotation.z = sinFrame * 0.05 * 0.03;

    renderer.render(scene, camera);
  }

  // Start animation loop
  animate(0);

  // Optimized mouse interaction with debounce
  let mouseTimeout;
  document.addEventListener('mousemove', (event) => {
    if (mouseTimeout) return;
    
    mouseTimeout = setTimeout(() => {
      const mouseX = (event.clientX - window.innerWidth / 2) / 200;
      const mouseY = (event.clientY - window.innerHeight / 2) / 200;

      gsap.to(camera.rotation, {
        x: -mouseY * 0.2,
        y: -mouseX * 0.2,
        duration: 1,
        ease: "power2.out"
      });
      
      mouseTimeout = null;
    }, 16); // ~60fps
  });
}
