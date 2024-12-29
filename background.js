class DynamicBackground {
  constructor() {
    this.canvas = document.getElementById('bgCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.gridPoints = [];
    this.mouseX = 0;
    this.mouseY = 0;

    this.init();
    this.animate();
    this.setupEventListeners();
  }

  init() {
    this.resizeCanvas();
    this.createParticles();
    this.createGrid();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    const numParticles = 200;
    for (let i = 0; i < numParticles; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 1000,
        radius: Math.random() * 2 + 1,
        color: this.getRandomColor(),
        speed: Math.random() * 2 + 1
      });
    }
  }

  createGrid() {
    const spacing = 50;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      for (let y = 0; y < this.canvas.height; y += spacing) {
        this.gridPoints.push({
          x: x,
          y: y,
          baseX: x,
          baseY: y,
          z: Math.random() * 1000
        });
      }
    }
  }

  getRandomColor() {
    const colors = ['#00f3ff', '#ff00ff', '#39ff14'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  drawParticles() {
    this.particles.forEach(particle => {
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();

      // Update particle position
      particle.y += particle.speed;
      if (particle.y > this.canvas.height) {
        particle.y = 0;
      }

      // Add mouse interaction
      const dx = this.mouseX - particle.x;
      const dy = this.mouseY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        particle.x += dx * 0.02;
        particle.y += dy * 0.02;
      }
    });
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    this.ctx.lineWidth = 1;

    this.gridPoints.forEach((point, i) => {
      // Add wave effect
      point.y = point.baseY + Math.sin((Date.now() * 0.001) + point.x * 0.01) * 20;
      
      // Draw vertical lines
      if (i % 2 === 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineTo(point.x, point.y + 50);
        this.ctx.stroke();
      }

      // Draw horizontal lines
      if (i % 2 === 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineTo(point.x + 50, point.y);
        this.ctx.stroke();
      }

      // Add mouse interaction
      const dx = this.mouseX - point.x;
      const dy = this.mouseY - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        point.x += dx * 0.01;
        point.y += dy * 0.01;
      } else {
        point.x += (point.baseX - point.x) * 0.1;
        point.y += (point.baseY - point.y) * 0.1;
      }
    });
  }

  animate() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawParticles();

    // Add perspective effect
    const time = Date.now() * 0.001;
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(Math.sin(time * 0.1) * 0.02);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
    this.ctx.restore();

    requestAnimationFrame(() => this.animate());
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.resizeCanvas());
    
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    // Add touch support
    window.addEventListener('touchmove', (e) => {
      this.mouseX = e.touches[0].clientX;
      this.mouseY = e.touches[0].clientY;
    });
  }
}

// Initialize the background
window.addEventListener('DOMContentLoaded', () => {
  new DynamicBackground();
});
