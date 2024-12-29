import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

class Game3D {
  constructor() {
    // Marketing tips from original game
    this.allMarketingTips = [
      "Placing clear, action-driven CTAs above the fold can increase conversion rates by up to 48%",
      "Simplifying website navigation can boost conversions by up to 20%",
      "Improving page load speed to under 3 seconds can reduce bounce rates by up to 40%",
      "Using sticky navigation bars can improve page engagement by up to 22%",
      "Designing a mobile-responsive website can boost mobile conversions by up to 53%",
      "Adding breadcrumb navigation can improve user flow and conversions by up to 20%",
      "Using a clear, minimalist design can improve conversion rates by up to 30%",
      "Implementing hero sections with high-contrast CTAs can increase engagement by up to 28%"
    ];
    this.marketingTips = [...this.allMarketingTips];
    this.currentTipIndex = 0;
    this.shuffleTips();

    // Initialize animation mixer
    this.mixer = new THREE.AnimationMixer(this);

    // Initialize ball trail
    this.ballTrail = [];
    this.maxTrailLength = 20;

    // Load font first, then initialize game
    const fontLoader = new FontLoader();
    fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      this.font = font;
      this.init();
      this.setupGame();
      this.animate();
      this.initAudio();
    });
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.005);
    
    // Check if mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Calculate viewport dimensions and aspect ratio
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const aspect = viewportWidth / viewportHeight;
    
    // Make game area much larger
    this.gameWidth = 100;
    this.gameHeight = this.gameWidth / aspect;
    
    // Ensure minimum height for gameplay
    const minHeight = 80;
    if (this.gameHeight < minHeight) {
      this.gameHeight = minHeight;
      this.gameWidth = this.gameHeight * aspect;
    }
    
    // Set gameplay boundaries
    this.boundaries = {
      left: -this.gameWidth / 2,
      right: this.gameWidth / 2,
      top: this.gameHeight / 2,
      bottom: -this.gameHeight / 2
    };
    
    // Camera setup with adjusted FOV for larger play area
    const fov = 45;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      aspect,
      0.1,
      1000
    );
    
    // Adjust camera position for larger play area
    this.camera.position.z = 100;
    this.camera.position.y = 0;
    this.camera.lookAt(0, 0, 0);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById('gameCanvas'),
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: "high-performance"
    });
    
    this.renderer.setPixelRatio(this.isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    
    // Add stronger lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 4);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffff, 400);
    pointLight.position.set(0, 10, 20);
    this.scene.add(pointLight);

    // Create fullscreen button
    this.createFullscreenButton();

    // Handle window resize and fullscreen changes
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

    // Game state initialization
    this.gameState = 'start';
    this.score = 0;
    this.lives = 7;
    this.combo = 0;

    // Input handling setup
    this.keys = { left: false, right: false };
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    // Mobile touch handling
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  createFullscreenButton() {
    const button = document.createElement('button');
    button.id = 'fullscreenButton';
    button.innerHTML = '⛶'; // Unicode fullscreen symbol
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      color: white;
      font-size: 24px;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.3s;
      padding: 0;
    `;

    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    });

    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    });

    button.addEventListener('click', () => this.toggleFullscreen());
    document.body.appendChild(button);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement &&
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
      // Enter fullscreen
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  handleFullscreenChange() {
    const button = document.getElementById('fullscreenButton');
    if (document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement) {
      button.innerHTML = '⛶';
    } else {
      button.innerHTML = '⛶';
    }
    this.handleResize();
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    
    // Update game boundaries based on new aspect ratio
    const aspect = width / height;
    this.gameWidth = 100;
    this.gameHeight = this.gameWidth / aspect;
    
    if (this.gameHeight < 80) {
      this.gameHeight = 80;
      this.gameWidth = this.gameHeight * aspect;
    }
    
    this.boundaries = {
      left: -this.gameWidth / 2,
      right: this.gameWidth / 2,
      top: this.gameHeight / 2,
      bottom: -this.gameHeight / 2
    };
  }

  calculateFOV(aspect) {
    // Base FOV for landscape
    let fov = 75;
    
    // Adjust FOV for portrait mode
    if (aspect < 1) {
      fov = 100; // Wider FOV for portrait
    }
    
    // Adjust for mobile
    if (this.isMobile) {
      fov *= 1.1; // Slightly wider FOV on mobile
    }
    
    return fov;
  }

  calculateCameraZ(fov, height) {
    // Calculate camera distance needed to fit game height
    const vFOV = fov * Math.PI / 180; // Convert to radians
    const cameraZ = (height / 2) / Math.tan(vFOV / 2);
    
    // Add padding
    return cameraZ * 1.2;
  }

  createMarketingTip() {
    if (!this.font || this.gameState !== 'playing' || this.ballLaunched) return;

    // Remove any existing tips first
    this.removeExistingTips();

    const tip = this.marketingTips[this.currentTipIndex];

    // Create HTML element for the tip
    const tipElement = document.createElement('div');
    tipElement.className = 'marketing-tip';
    tipElement.textContent = tip;
    document.body.appendChild(tipElement);

    // Store reference to current tip
    this.currentTipElement = tipElement;

    // Schedule removal of HTML element
    this.tipTimeout = setTimeout(() => {
      this.removeExistingTips();
    }, 6000);
  }

  removeExistingTips() {
    // Clear any existing timeout
    if (this.tipTimeout) {
      clearTimeout(this.tipTimeout);
      this.tipTimeout = null;
    }

    // Remove any existing tip element
    if (this.currentTipElement && this.currentTipElement.parentNode) {
      this.currentTipElement.remove();
      this.currentTipElement = null;
    }

    // Remove any existing 3D mesh
    if (this.tipMesh) {
      this.scene.remove(this.tipMesh);
      this.tipMesh = null;
    }
  }

  shuffleTips() {
    for (let i = this.marketingTips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.marketingTips[i], this.marketingTips[j]] = [this.marketingTips[j], this.marketingTips[i]];
    }
    this.currentTipIndex = 0;
  }

  showNextTip() {
    this.currentTipIndex = (this.currentTipIndex + 1) % this.marketingTips.length;
    if (this.currentTipIndex === 0) {
      this.shuffleTips();
    }
    this.createMarketingTip();
  }

  setupGame() {
    // Create larger paddle
    const paddleShape = new THREE.Shape();
    paddleShape.moveTo(-6, 0);
    paddleShape.lineTo(-5.6, -0.4);
    paddleShape.lineTo(5.6, -0.4);
    paddleShape.lineTo(6, 0);
    paddleShape.lineTo(5.6, 0.4);
    paddleShape.lineTo(-5.6, 0.4);
    paddleShape.lineTo(-6, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.8,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.2,
      bevelSegments: 3
    };

    const paddleGeometry = new THREE.ExtrudeGeometry(paddleShape, extrudeSettings);
    const paddleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1
    });
    this.paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
    this.paddle.position.y = this.boundaries.bottom + 5; // Position paddle 5 units from bottom
    
    // Add glow effect to paddle
    const paddleGlow = new THREE.Mesh(
      paddleGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide
      })
    );
    paddleGlow.scale.multiplyScalar(1.1);
    this.paddle.add(paddleGlow);
    this.scene.add(this.paddle);

    // Create larger ball
    const ballGroup = new THREE.Group();
    
    // Core sphere (increased size)
    const coreGeometry = new THREE.IcosahedronGeometry(1.0, 2);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1,
      metalness: 1,
      roughness: 0,
      transparent: true,
      opacity: 0.9,
      wireframe: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    ballGroup.add(core);

    // Inner dodecahedron (increased size)
    const innerGeometry = new THREE.DodecahedronGeometry(0.8, 0);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1,
      metalness: 1,
      roughness: 0,
      transparent: true,
      opacity: 0.7,
      wireframe: true
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.rotation.z = Math.PI / 5;
    ballGroup.add(inner);

    // Middle octahedron (increased size)
    const middleGeometry = new THREE.OctahedronGeometry(1.2, 0);
    const middleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      metalness: 1,
      roughness: 0,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    const middle = new THREE.Mesh(middleGeometry, middleMaterial);
    middle.rotation.x = Math.PI / 4;
    ballGroup.add(middle);

    // Outer tetrahedron (increased size)
    const outerGeometry = new THREE.TetrahedronGeometry(1.4, 0);
    const outerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      metalness: 1,
      roughness: 0,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const outer = new THREE.Mesh(outerGeometry, outerMaterial);
    outer.rotation.y = Math.PI / 3;
    ballGroup.add(outer);

    // Add glow sphere (increased size)
    const glowGeometry = new THREE.SphereGeometry(1.6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    ballGroup.add(glow);

    // Store references for animation
    ballGroup.userData = {
      core: core,
      inner: inner,
      middle: middle,
      outer: outer,
      glow: glow
    };

    this.ball = ballGroup;
    this.resetBall();
    this.scene.add(this.ball);

    // Add rotation animation to updateGame
    const updateBallRotation = () => {
      if (this.ball.userData) {
        this.ball.userData.core.rotation.x += 0.02;
        this.ball.userData.core.rotation.y += 0.01;
        
        this.ball.userData.inner.rotation.x -= 0.015;
        this.ball.userData.inner.rotation.z += 0.01;
        
        this.ball.userData.middle.rotation.y += 0.01;
        this.ball.userData.middle.rotation.z -= 0.01;
        
        this.ball.userData.outer.rotation.x += 0.005;
        this.ball.userData.outer.rotation.y -= 0.01;
      }
    };

    // Add to animation loop
    const originalUpdateGame = this.updateGame.bind(this);
    this.updateGame = () => {
      originalUpdateGame();
      updateBallRotation();
    };

    // Create bricks and background
    this.createBricks();
    this.createStarfield();
    this.createGrid();
  }

  createBricks() {
    // Create brick group if it doesn't exist
    if (!this.bricks) {
      this.bricks = new THREE.Group();
      this.scene.add(this.bricks);
    } else {
      // Clear existing bricks
      while(this.bricks.children.length > 0) {
        this.bricks.remove(this.bricks.children[0]);
      }
    }

    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    
    // Adjusted brick layout with bigger bricks
    const brickScale = 4.8;
    const rowCount = 5;
    const colCount = 8;
    const spacing = 10;
    
    // Calculate total height of brick arrangement
    const totalHeight = (rowCount - 1) * 6;
    // Start position near top of screen with padding
    const startY = this.boundaries.top - 10;
    
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const geometry = this.getBrickGeometry(brickScale);
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 1.0,
          metalness: 0.9,
          roughness: 0.2,
          wireframe: Math.random() > 0.8
        });
        
        const brick = new THREE.Mesh(geometry, material);
        
        // Position bricks in a grid
        const xPos = (col - (colCount - 1) / 2) * spacing;
        const yPos = startY - row * 6;
        const zPos = -5;
        
        brick.position.set(xPos, yPos, zPos);
        brick.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        brick.userData.health = 1;
        brick.userData.rotationSpeed = {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        };
        
        // Add glow effect to brick
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.5,
          side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(geometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.2);
        brick.add(glowMesh);
        
        this.bricks.add(brick);
      }
    }
  }

  getBrickGeometry(scale) {
    const shapes = [
      new THREE.OctahedronGeometry(0.7 * scale, 0),
      new THREE.TetrahedronGeometry(0.8 * scale, 0),
      new THREE.DodecahedronGeometry(0.7 * scale, 0),
      new THREE.IcosahedronGeometry(0.7 * scale, 0)
    ];
    return shapes[Math.floor(Math.random() * shapes.length)];
  }

  createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: this.isMobile ? 0.15 : 0.1,
      transparent: true,
      opacity: 0.8
    });

    const starCount = this.isMobile ? 500 : 1000;
    const starVertices = [];
    
    for (let i = 0; i < starCount; i++) {
      // Generate random position
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
  }

  createGrid() {
    this.grids = [];
    const gridCount = 24;
    
    // Create mandala at the end of the tunnel
    this.createMandala();
    
    for (let i = 0; i < gridCount; i++) {
      const radius = 25;
      const segments = 32;
      const rings = 32;
      
      const vertices = [];
      const colors = [];
      const indices = [];
      
      for (let r = 0; r <= rings; r++) {
        const v = r / rings;
        const radiusOffset = radius * (0.7 + Math.pow(v, 3) * 0.3);
        
        for (let s = 0; s <= segments; s++) {
          const u = s / segments;
          const theta = u * Math.PI * 2;
          
          const spiralFactor = v * 4;
          const x = Math.cos(theta + spiralFactor) * radiusOffset;
          const y = Math.sin(theta + spiralFactor) * radiusOffset;
          const z = v * 20 - 10;
          
          vertices.push(x, y, z);
          
          const color = new THREE.Color();
          // Use purple to magenta gradient instead of cyan
          const hue = (0.8 + v * 0.1 + i * 0.02) % 1;
          const saturation = 0.9;
          const lightness = 0.5 - v * 0.3;
          color.setHSL(hue, saturation, lightness);
          colors.push(color.r, color.g, color.b);
        }
      }
      
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < segments; s++) {
          const first = r * (segments + 1) + s;
          const second = first + segments + 1;
          
          // Only create grid lines in the tunnel area, not HUD overlays
          if (r > 0 && r < rings - 1) {
            indices.push(first, first + 1);
            if (r % 2 === 0 && s % 2 === 0) {
              indices.push(first, second + 1);
            }
          }
        }
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const grid = new THREE.LineSegments(geometry, material);
      grid.position.z = -150 + (i * 15);
      grid.userData = {
        baseZ: grid.position.z,
        rotationSpeed: 0.0002 * (1 + i * 0.1),
        pulseSpeed: 0.0003 * (1 + i * 0.1),
        tunnelSpeed: 0.4,
        twistFactor: Math.random() * 0.02 - 0.01,
        pulsePhase: i * (Math.PI * 2 / gridCount)
      };
      
      this.scene.add(grid);
      this.grids.push(grid);
    }
  }

  createMandala() {
    const mandalaGroup = new THREE.Group();
    
    // Create multiple layers of sacred geometry
    const layers = 12; // Increased layers
    const baseRadius = 45; // Increased size
    
    // Add fractal background pattern
    const fractalLayers = 5;
    for (let f = 0; f < fractalLayers; f++) {
      const fractalGeometry = new THREE.BufferGeometry();
      const vertices = [];
      const colors = [];
      
      // Create fractal star pattern
      const points = 12;
      const innerRadius = baseRadius * (0.3 + f * 0.15);
      const outerRadius = baseRadius * (0.4 + f * 0.15);
      
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI * 2) / (points * 2);
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        vertices.push(x, y, -f * 4);
        
        const color = new THREE.Color();
        color.setHSL(0.8 + f * 0.05, 1, 0.6);
        colors.push(color.r, color.g, color.b);
      }
      
      fractalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      fractalGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const fractalMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      
      const fractalLine = new THREE.LineLoop(fractalGeometry, fractalMaterial);
      fractalLine.userData.rotationSpeed = 0.001 * (f + 1);
      fractalLine.userData.pulseSpeed = 0.002 * (f + 1);
      mandalaGroup.add(fractalLine);
    }
    
    // Create Flower of Life layers with increased complexity
    for (let layer = 0; layer < layers; layer++) {
      const petals = 18 + layer * 2; // More petals per layer
      const radius = baseRadius * (1 - layer * 0.08);
      
      // Add rotating rings with fractal details
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        // Create more complex torus with added detail
        const geometry = new THREE.TorusKnotGeometry(
          radius * 0.2, // radius
          0.2, // tube radius
          64, // tubular segments
          8, // radial segments
          2, // p
          3  // q
        );
        
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 1,
          metalness: 1,
          roughness: 0,
          transparent: true,
          opacity: 0.5,
          wireframe: true
        });
        
        const ring = new THREE.Mesh(geometry, material);
        ring.position.x = Math.cos(angle) * radius;
        ring.position.y = Math.sin(angle) * radius;
        ring.position.z = -layer * 3;
        ring.rotation.z = angle;
        
        ring.userData.baseAngle = angle;
        ring.userData.radius = radius;
        ring.userData.layer = layer;
        ring.userData.rotationSpeed = {
          x: 0.02 * (layer + 1),
          y: 0.015 * (layer + 1),
          z: 0.01 * (layer + 1)
        };
        
        mandalaGroup.add(ring);
      }
      
      // Add connecting spiral arms
      const spiralGeometry = new THREE.BufferGeometry();
      const spiralVertices = [];
      const spiralColors = [];
      const turns = 8; // Increased spiral complexity
      const pointsPerTurn = 36;
      
      for (let i = 0; i < turns * pointsPerTurn; i++) {
        const angle = (i / pointsPerTurn) * Math.PI * 2;
        const radiusOffset = radius * (1 - (i / (turns * pointsPerTurn)));
        const x = Math.cos(angle * turns) * radiusOffset;
        const y = Math.sin(angle * turns) * radiusOffset;
        spiralVertices.push(x, y, -layer * 3);
        
        const color = new THREE.Color();
        color.setHSL(0.8 + layer * 0.05, 1, 0.6 - (i / (turns * pointsPerTurn)) * 0.3);
        spiralColors.push(color.r, color.g, color.b);
      }
      
      spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spiralVertices, 3));
      spiralGeometry.setAttribute('color', new THREE.Float32BufferAttribute(spiralColors, 3));
      
      const spiralMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      
      const spiral = new THREE.Line(spiralGeometry, spiralMaterial);
      spiral.userData.rotationSpeed = 0.002 * (layer + 1);
      mandalaGroup.add(spiral);
    }
    
    // Add central merkaba with enhanced complexity
    const merkaba = this.createEnhancedMerkaba(8);
    mandalaGroup.add(merkaba);
    
    // Position mandala at the end of the tunnel
    mandalaGroup.position.z = -200;
    this.mandala = mandalaGroup;
    this.scene.add(mandalaGroup);
  }

  createEnhancedMerkaba(size) {
    const merkaba = new THREE.Group();
    
    // Create multiple nested sacred geometry shapes
    const shapes = [
      new THREE.TetrahedronGeometry(size, 0),
      new THREE.OctahedronGeometry(size * 0.8, 0),
      new THREE.IcosahedronGeometry(size * 0.6, 0),
      new THREE.DodecahedronGeometry(size * 0.4, 0)
    ];
    
    shapes.forEach((geometry, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1 - index * 0.2,
        metalness: 1,
        roughness: 0,
        transparent: true,
        opacity: 0.6 - index * 0.1,
        wireframe: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.rotationSpeed = {
        x: 0.005 * (index + 1),
        y: 0.007 * (index + 1),
        z: 0.003 * (index + 1)
      };
      merkaba.add(mesh);
    });
    
    return merkaba;
  }

  updateMandala() {
    if (!this.mandala) return;
    
    const time = Date.now() * 0.001;
    
    // Enhanced rotation of entire mandala
    this.mandala.rotation.z += 0.001;
    this.mandala.rotation.y = Math.sin(time * 0.1) * 0.1;
    
    // Animate individual elements with more complex movements
    this.mandala.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TorusKnotGeometry) {
        const layer = child.userData.layer;
        const baseAngle = child.userData.baseAngle;
        const radius = child.userData.radius;
        
        // Complex rotation on all axes
        child.rotation.x += child.userData.rotationSpeed.x * Math.sin(time * 0.2);
        child.rotation.y += child.userData.rotationSpeed.y * Math.cos(time * 0.3);
        child.rotation.z += child.userData.rotationSpeed.z;
        
        // Breathing and pulsing effect
        const breathe = Math.sin(time * 0.5 + layer) * 0.2 + Math.cos(time * 0.3) * 0.1;
        child.scale.set(1 + breathe, 1 + breathe, 1 + breathe);
        
        // Spiral movement with varying radius
        const spiralSpeed = time * 0.3;
        const radiusOffset = radius + Math.sin(time + layer) * 2;
        child.position.x = Math.cos(baseAngle + spiralSpeed) * radiusOffset;
        child.position.y = Math.sin(baseAngle + spiralSpeed) * radiusOffset;
        
        // Dynamic opacity and emission
        child.material.opacity = 0.5 + Math.sin(time * 2 + layer) * 0.3;
        child.material.emissiveIntensity = 0.8 + Math.sin(time * 1.5 + layer) * 0.4;
      }
      
      // Animate fractal background
      if (child instanceof THREE.LineLoop) {
        child.rotation.z += child.userData.rotationSpeed;
        const scale = 1 + Math.sin(time * child.userData.pulseSpeed) * 0.1;
        child.scale.set(scale, scale, 1);
      }
      
      // Animate spiral arms
      if (child instanceof THREE.Line) {
        child.rotation.z += child.userData.rotationSpeed;
        child.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
      }
      
      // Animate merkaba shapes
      if (child instanceof THREE.Group) {
        child.children.forEach((shape, index) => {
          shape.rotation.x += shape.userData.rotationSpeed.x;
          shape.rotation.y += shape.userData.rotationSpeed.y;
          shape.rotation.z += shape.userData.rotationSpeed.z;
          
          // Pulse size and opacity
          const pulse = 1 + Math.sin(time * (1 - index * 0.2)) * 0.2;
          shape.scale.set(pulse, pulse, pulse);
          shape.material.opacity = 0.6 - index * 0.1 + Math.sin(time * 2) * 0.2;
          shape.material.emissiveIntensity = 1 - index * 0.2 + Math.sin(time * 1.5) * 0.3;
        });
      }
    });
  }

  updateGrids() {
    if (!this.grids) return;
    
    const time = Date.now() * 0.001;
    
    this.grids.forEach((grid, index) => {
      // Enhanced rotation with wave effect
      grid.rotation.z += grid.userData.rotationSpeed * Math.sin(time * 0.5);
      
      // Smooth tunnel movement with varying speed
      const speedVariation = Math.sin(time * 0.2 + index * 0.1) * 0.1;
      grid.position.z += grid.userData.tunnelSpeed * (1 + speedVariation);
      
      // Reset position with offset for seamless loop
      if (grid.position.z > 50) {
        grid.position.z = -200;
      }
      
      // Enhanced breathing effect
      const breathePhase = time * 0.5 + grid.userData.pulsePhase;
      const scaleBase = 1 + Math.sin(breathePhase) * 0.05;
      const scalePulse = Math.sin(time * grid.userData.pulseSpeed) * 0.02;
      
      // Apply non-uniform scaling for more dynamic effect
      grid.scale.set(
        scaleBase + scalePulse,
        scaleBase - scalePulse,
        1
      );
      
      // Dynamic opacity based on position and time
      const distanceOpacity = Math.min(1, Math.max(0.1, 1 - (grid.position.z / 100)));
      const pulseOpacity = 0.3 + Math.sin(time * grid.userData.pulseSpeed * 2) * 0.05;
      grid.material.opacity = distanceOpacity * pulseOpacity;
      
      // Enhanced twist effect
      const twistAmount = grid.userData.twistFactor;
      grid.rotation.x = Math.sin(time * 0.3 + index * 0.1) * twistAmount;
      grid.rotation.y = Math.cos(time * 0.2 + index * 0.1) * twistAmount;
      
      // Add subtle wobble
      grid.position.x = Math.sin(time * 0.5 + index * 0.2) * 0.5;
      grid.position.y = Math.cos(time * 0.4 + index * 0.2) * 0.5;
    });
  }

  resetBall() {
    if (!this.paddle) return;
    this.ball.position.copy(this.paddle.position);
    this.ball.position.y = this.paddle.position.y + 2; // Keep ball 2 units above paddle
    this.ballVelocity = new THREE.Vector3(0, 0, 0);
    this.ballLaunched = false;
    
    // Only show tip when resetting after losing a life, not on first ball
    if (this.gameStarted) {
      this.showNextTip();
    }
  }

  launchBall() {
    this.ballLaunched = true;
    this.gameStarted = true;
    
    // Remove any existing tips when ball is launched
    this.removeExistingTips();
    
    // More predictable initial launch angle
    const angle = (Math.random() * 0.5 + 0.25) * Math.PI; // Launch between 45 and 135 degrees
    const speed = 1.2; // Doubled initial speed
    
    this.ballVelocity = new THREE.Vector3(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      0
    );
  }

  startGame() {
    this.gameState = 'playing';
    this.gameStarted = false; // Add flag to track if it's the first ball
    this.score = 0;
    this.lives = 7;
    this.combo = 0;
    this.resetBall();

    // Reset UI
    document.getElementById('score').textContent = '0';
    document.getElementById('lives').textContent = '7';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');

    // Reset bricks
    this.bricks.children.forEach(brick => {
      brick.visible = true;
      brick.userData.health = 1;
    });
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'Left') {
      this.keys.left = true;
    } else if (e.key === 'ArrowRight' || e.key === 'Right') {
      this.keys.right = true;
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (this.gameState === 'start' || this.gameState === 'gameover') {
        this.startGame();
      } else if (!this.ballLaunched) {
        this.launchBall();
      }
    }
  }

  handleKeyUp(e) {
    if (e.key === 'ArrowLeft' || e.key === 'Left') {
      this.keys.left = false;
    } else if (e.key === 'ArrowRight' || e.key === 'Right') {
      this.keys.right = false;
    }
  }

  handleMouseMove(e) {
    if (this.gameState === 'playing') {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      
      // Convert to world coordinates with faster movement
      const targetX = x * (this.gameWidth / 2 * 0.95);
      this.paddle.position.x += (targetX - this.paddle.position.x) * 0.3;
      
      // Clamp paddle position with same boundaries as keyboard controls
      this.paddle.position.x = Math.max(
        this.boundaries.left + 6,
        Math.min(this.boundaries.right - 6, this.paddle.position.x)
      );

      if (!this.ballLaunched) {
        this.ball.position.x = this.paddle.position.x;
      }
    }
  }

  updateGame() {
    if (this.gameState !== 'playing') return;

    // Update paddle position with faster movement
    if (this.keys.left) {
      const targetX = this.paddle.position.x - 2.4;
      this.paddle.position.x += (targetX - this.paddle.position.x) * 0.3;
    }
    if (this.keys.right) {
      const targetX = this.paddle.position.x + 2.4;
      this.paddle.position.x += (targetX - this.paddle.position.x) * 0.3;
    }

    // Check for level completion
    if (this.bricks) {
      let visibleBricks = 0;
      this.bricks.children.forEach(brick => {
        if (brick.visible) visibleBricks++;
      });
      if (visibleBricks === 0) {
        this.gameWon();
        return;
      }
    }

    // Clamp paddle position to boundaries with just enough space to stay visible
    this.paddle.position.x = Math.max(
      this.boundaries.left + 6,
      Math.min(this.boundaries.right - 6, this.paddle.position.x)
    );

    // Keep paddle at fixed Y position
    this.paddle.position.y = this.boundaries.bottom + 5;

    if (this.ballLaunched) {
      // Update ball position
      this.ball.position.add(this.ballVelocity);

      // Wall collisions
      if (this.ball.position.x <= this.boundaries.left || 
          this.ball.position.x >= this.boundaries.right) {
        this.ballVelocity.x *= -1;
        this.createCollisionEffect(this.ball.position.clone());
        this.playSound('wallHit', this.ball.position);
      }
      if (this.ball.position.y >= this.boundaries.top) {
        this.ballVelocity.y *= -1;
        this.createCollisionEffect(this.ball.position.clone());
        this.playSound('wallHit', this.ball.position);
      }

      // Ball lost
      if (this.ball.position.y < this.boundaries.bottom - 2) {
        this.lives--;
        document.getElementById('lives').textContent = this.lives;
        if (this.lives <= 0) {
          this.gameOver();
        } else {
          this.resetBall();
          this.showNextTip();
        }
        return;
      }

      // Paddle collision
      const paddleBox = new THREE.Box3().setFromObject(this.paddle);
      const ballBox = new THREE.Box3().setFromObject(this.ball);
      
      if (ballBox.intersectsBox(paddleBox)) {
        // Calculate hit position relative to paddle center (-1 to 1)
        const hitPoint = (this.ball.position.x - this.paddle.position.x) / 12;
        
        // Calculate new angle based on hit position
        const baseAngle = Math.PI / 2; // 90 degrees (straight up)
        const maxAngleOffset = Math.PI / 3; // 60 degrees max deflection
        const angle = baseAngle + (hitPoint * maxAngleOffset);
        
        // Set new velocity with consistent speed
        const speed = 1.2;
        this.ballVelocity.x = Math.cos(angle) * speed;
        this.ballVelocity.y = Math.abs(Math.sin(angle) * speed);
        
        this.createCollisionEffect(this.ball.position.clone());
        this.combo = 0;
        this.playSound('paddleHit', this.ball.position);
      }

      // Brick collisions
      if (this.bricks) {
        this.bricks.children.forEach((brick, index) => {
          if (!brick.visible) return;

          const brickBounds = new THREE.Box3().setFromObject(brick);
          const ballBounds = new THREE.Box3().setFromObject(this.ball);

          if (ballBounds.intersectsBox(brickBounds)) {
            // Handle brick collision
            brick.visible = false;
            this.score += 10 * (this.combo + 1);
            this.combo++;
            document.getElementById('score').textContent = this.score;

            // Create explosion effect
            this.createBrickExplosion(brick.position.clone(), brick.material.color);

            // Calculate collision normal
            const ballCenter = ballBounds.getCenter(new THREE.Vector3());
            const brickCenter = brickBounds.getCenter(new THREE.Vector3());
            const normal = ballCenter.sub(brickCenter).normalize();

            // Reflect ball velocity based on hit direction
            if (Math.abs(normal.x) > Math.abs(normal.y)) {
              this.ballVelocity.x *= -1;
            } else {
              this.ballVelocity.y *= -1;
            }

            // Add some randomization to prevent straight-line bounces
            this.ballVelocity.x += (Math.random() - 0.5) * 0.04;
            this.ballVelocity.y += (Math.random() - 0.5) * 0.04;

            // Normalize velocity to maintain consistent speed
            this.ballVelocity.normalize().multiplyScalar(1.2);

            this.playSound('brickBreak', brick.position);
          }
        });
      }
    } else {
      // Update ball position when not launched
      this.ball.position.x = this.paddle.position.x;
      this.ball.position.y = this.paddle.position.y + 2;
    }
  }

  createCollisionEffect(position) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 1
    });

    const particles = [];
    for (let i = 0; i < 8; i++) {
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      particle.life = 1.0;
      this.scene.add(particle);
      particles.push(particle);
    }

    const animate = () => {
      particles.forEach((particle, index) => {
        particle.position.add(particle.velocity);
        particle.life -= 0.02;
        particle.material.opacity = particle.life;
        particle.scale.multiplyScalar(0.95);

        if (particle.life <= 0) {
          this.scene.remove(particle);
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  createBrickExplosion(position, color) {
    const geometries = [
      new THREE.TetrahedronGeometry(0.8),
      new THREE.OctahedronGeometry(0.8),
      new THREE.IcosahedronGeometry(0.8),
      new THREE.DodecahedronGeometry(0.8)
    ];

    const particles = [];
    const particleCount = 40; // Increased particle count
    
    // Create main explosion particles
    for (let i = 0; i < particleCount; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 4,
        metalness: 1,
        roughness: 0,
        wireframe: Math.random() > 0.5,
        transparent: true,
        opacity: 1
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0
      );
      particle.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      particle.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      );
      particle.life = 1.0;
      particle.scale.multiplyScalar(Math.random() * 1.5 + 0.5);
      this.scene.add(particle);
      particles.push(particle);
    }

    // Add energy ring effect
    const ringGeometry = new THREE.RingGeometry(0.4, 1.6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(position);
    ring.scale.set(0.1, 0.1, 0.1);
    ring.life = 1.0;
    this.scene.add(ring);
    particles.push(ring);

    // Add glow sphere
    const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);
    glow.life = 1.0;
    this.scene.add(glow);
    particles.push(glow);

    const animate = () => {
      particles.forEach((particle, index) => {
        if (particle.geometry instanceof THREE.RingGeometry) {
          // Ring animation
          particle.scale.multiplyScalar(1.3);
          particle.material.opacity *= 0.92;
        } else if (particle.geometry instanceof THREE.SphereGeometry) {
          // Glow animation
          particle.scale.multiplyScalar(1.2);
          particle.material.opacity *= 0.92;
        } else {
          // Regular particle animation
          particle.position.add(particle.velocity);
          particle.rotation.x += particle.rotationSpeed.x;
          particle.rotation.y += particle.rotationSpeed.y;
          particle.rotation.z += particle.rotationSpeed.z;
          particle.velocity.y -= 0.05;
          particle.material.opacity = particle.life;
        }

        particle.life -= 0.02;
        
        if (particle.life <= 0) {
          this.scene.remove(particle);
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  gameOver() {
    console.log('Game Over triggered');
    this.gameState = 'gameover';
    
    // Show final marketing tip
    this.createMarketingTip();
    
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (gameOverScreen) {
      gameOverScreen.classList.remove('hidden');
      gameOverScreen.style.pointerEvents = 'auto';
      gameOverScreen.style.zIndex = '1000';
    }
    this.playSound('gameOver');
  }

  gameWon() {
    // Create victory explosion effects
    const explosionColors = [0xffff00, 0x00ffff, 0xff00ff, 0xff0000, 0x00ff00];
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const position = new THREE.Vector3(
          (Math.random() - 0.5) * this.gameWidth,
          (Math.random() - 0.5) * this.gameHeight,
          -5
        );
        const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
        this.createBrickExplosion(position, color);
      }, i * 200);
    }

    // Create victory text with glow effect
    if (this.font) {
      const levelText = "LEVEL COMPLETE!";
      const geometry = new TextGeometry(levelText, {
        font: this.font,
        size: 4,
        height: 0.8,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.2,
        bevelSegments: 5
      });
      
      geometry.computeBoundingBox();
      const centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
      
      // Create glowing text material
      const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1,
        metalness: 0.8,
        roughness: 0.2
      });
      
      const textMesh = new THREE.Mesh(geometry, textMaterial);
      textMesh.position.set(centerOffset, 0, -20);
      this.scene.add(textMesh);
      
      // Add glow effect
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
      });
      
      const glowMesh = new THREE.Mesh(geometry, glowMaterial);
      glowMesh.scale.multiplyScalar(1.1);
      glowMesh.position.copy(textMesh.position);
      this.scene.add(glowMesh);

      // Animate text
      const animateText = () => {
        textMesh.rotation.y += 0.02;
        glowMesh.rotation.y += 0.02;
        textMesh.position.y = Math.sin(Date.now() * 0.002) * 2;
        glowMesh.position.y = textMesh.position.y;
        textMaterial.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
        glowMaterial.opacity = 0.3 + Math.sin(Date.now() * 0.004) * 0.2;
      };

      // Add animation to render loop
      const originalAnimate = this.animate.bind(this);
      this.animate = () => {
        originalAnimate();
        if (textMesh.parent === this.scene) {
          animateText();
        }
      };
      
      // Remove text and generate new level after animation
      setTimeout(() => {
        this.scene.remove(textMesh);
        this.scene.remove(glowMesh);
        
        // Generate new level
        this.generateRandomLevel();
        
        // Add bonus points
        this.score += 1000;
        document.getElementById('score').textContent = this.score;
        
        // Reset ball with momentum
        this.resetBall();
        this.ballLaunched = true;
        
        // Remove any existing tip
        if (this.tipMesh) {
          this.scene.remove(this.tipMesh);
          this.tipMesh = null;
        }
      }, 3000);
    }
    
    this.playSound('levelComplete');
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Update animation mixer
    const delta = this.clock ? this.clock.getDelta() : 0;
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Game animations
    if (this.gameState === 'playing') {
      this.updateGame();
    }
    
    if (this.grids) {
      this.updateGrids();
    }
    
    this.updateMandala();
    
    if (this.bricks) {
      this.bricks.children.forEach(brick => {
        if (brick.userData.rotationSpeed) {
          brick.rotation.x += brick.userData.rotationSpeed.x;
          brick.rotation.y += brick.userData.rotationSpeed.y;
          brick.rotation.z += brick.userData.rotationSpeed.z;
        }
      });
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  // Add touch handlers
  handleTouchStart(e) {
    e.preventDefault();
    if (this.gameState === 'start' || this.gameState === 'gameover') {
      this.startGame();
    } else if (!this.ballLaunched) {
      this.launchBall();
    }
    this.lastTouchX = e.touches[0].clientX;
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (this.gameState === 'playing') {
      const touch = e.touches[0];
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      
      // Convert to world coordinates with smoother movement
      const targetX = x * (this.gameWidth / 2 * 0.95);
      this.paddle.position.x += (targetX - this.paddle.position.x) * 0.2;
      
      // Clamp paddle position with same boundaries
      this.paddle.position.x = Math.max(
        this.boundaries.left + 6,
        Math.min(this.boundaries.right - 6, this.paddle.position.x)
      );

      if (!this.ballLaunched) {
        this.ball.position.x = this.paddle.position.x;
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
  }

  spawnPowerUp(position) {
    if (!this.powerUps) this.powerUps = [];

    const powerTypes = [
      'extraLife',
      'widePaddle',
      'fastBall',
      'multiball',
      'laserPaddle'
    ];

    const powerType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({
      color: this.getPowerUpColor(powerType),
      emissive: this.getPowerUpColor(powerType),
      emissiveIntensity: 0.5,
      metalness: 1,
      roughness: 0,
      wireframe: true
    });

    const powerUp = new THREE.Mesh(geometry, material);
    powerUp.position.copy(position);
    powerUp.powerType = powerType;
    powerUp.active = true;

    this.scene.add(powerUp);
    this.powerUps.push(powerUp);
  }

  getPowerUpColor(type) {
    const colors = {
      extraLife: 0xff0000,    // Red
      widePaddle: 0x00ff00,   // Green
      fastBall: 0xffff00,     // Yellow
      multiball: 0xff00ff,    // Magenta
      laserPaddle: 0x00ffff   // Cyan
    };
    return colors[type];
  }

  activatePowerUp(type) {
    switch(type) {
      case 'extraLife':
        this.lives++;
        document.getElementById('lives').textContent = this.lives;
        break;

      case 'widePaddle':
        const originalScale = this.paddle.scale.x;
        this.paddle.scale.x = 1.5;
        setTimeout(() => {
          this.paddle.scale.x = originalScale;
        }, 10000);
        break;

      case 'fastBall':
        const currentSpeed = this.ballVelocity.length();
        this.ballVelocity.multiplyScalar(1.5);
        setTimeout(() => {
          this.ballVelocity.normalize().multiplyScalar(currentSpeed);
        }, 8000);
        break;

      case 'multiball':
        for (let i = 0; i < 2; i++) {
          const newBall = this.ball.clone();
          newBall.position.copy(this.ball.position);
          const angle = (Math.random() - 0.5) * Math.PI * 0.5;
          const velocity = this.ballVelocity.clone().multiplyScalar(1);
          velocity.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
          newBall.velocity = velocity;
          this.scene.add(newBall);
          if (!this.extraBalls) this.extraBalls = [];
          this.extraBalls.push(newBall);
        }
        break;

      case 'laserPaddle':
        this.laserActive = true;
        const originalColor = this.paddle.material.color.getHex();
        this.paddle.material.color.setHex(0xff0000);
        this.paddle.material.emissive.setHex(0xff0000);
        
        const shootLaser = () => {
          if (!this.laserActive) return;
          
          const laserGeometry = new THREE.BoxGeometry(0.1, 2, 0.1);
          const laserMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1
          });
          
          const laser = new THREE.Mesh(laserGeometry, laserMaterial);
          laser.position.copy(this.paddle.position);
          laser.position.y += 1;
          
          this.scene.add(laser);
          
          const animateLaser = () => {
            laser.position.y += 0.5;
            
            // Check for brick collisions
            this.bricks.children.forEach((brick) => {
              if (brick.visible) {
                const laserBox = new THREE.Box3().setFromObject(laser);
                const brickBox = new THREE.Box3().setFromObject(brick);
                
                if (laserBox.intersectsBox(brickBox)) {
                  brick.visible = false;
                  this.score += 5;
                  document.getElementById('score').textContent = this.score;
                  this.createBrickExplosion(brick.position.clone(), brick.material.color);
                  this.scene.remove(laser);
                  return;
                }
              }
            });
            
            if (laser.position.y > 15) {
              this.scene.remove(laser);
              return;
            }
            
            requestAnimationFrame(animateLaser);
          };
          
          animateLaser();
        };
        
        const laserInterval = setInterval(shootLaser, 500);
        
        setTimeout(() => {
          this.laserActive = false;
          clearInterval(laserInterval);
          this.paddle.material.color.setHex(originalColor);
          this.paddle.material.emissive.setHex(0x666666);
        }, 15000);
        break;
    }
    this.playSound('powerUp', this.paddle.position);
  }

  // Enhanced random level generator
  generateRandomLevel() {
    // Clear existing bricks
    while(this.bricks.children.length > 0) {
      this.bricks.remove(this.bricks.children[0]);
    }

    const patterns = [
      this.createDiamondPattern.bind(this),
      this.createSpiralPattern.bind(this),
      this.createRandomPattern.bind(this),
      this.createWavePattern.bind(this),
      this.createPyramidPattern.bind(this),
      this.createMazePattern.bind(this),
      this.createDoubleHelixPattern.bind(this),
      this.createCrossPattern.bind(this)
    ];

    // Randomly select a pattern
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    selectedPattern();

    // Increase difficulty
    this.ballVelocity.multiplyScalar(1.2); // 20% faster
  }

  createDiamondPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const size = 7; // Diamond size
    
    for (let i = 0; i < size * 2 - 1; i++) {
      const rowSize = i < size ? i + 1 : size * 2 - i - 1;
      const offset = Math.abs(size - 1 - i);
      
      for (let j = 0; j < rowSize; j++) {
        this.createBrick(
          (j - rowSize / 2 + 0.5) * 3,
          10 - i * 1.2,
          colors[Math.floor(Math.random() * colors.length)]
        );
      }
    }
  }

  createSpiralPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const turns = 2; // Number of spiral turns
    const bricksPerTurn = 16;
    
    for (let i = 0; i < turns * bricksPerTurn; i++) {
      const angle = (i / bricksPerTurn) * Math.PI * 2;
      const radius = 3 + (i / (turns * bricksPerTurn)) * 5;
      
      this.createBrick(
        Math.cos(angle) * radius,
        10 + Math.sin(angle) * radius / 2,
        colors[Math.floor(Math.random() * colors.length)]
      );
    }
  }

  createRandomPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const brickCount = 40;
    
    for (let i = 0; i < brickCount; i++) {
      this.createBrick(
        (Math.random() - 0.5) * 20,
        Math.random() * 10 + 5,
        colors[Math.floor(Math.random() * colors.length)]
      );
    }
  }

  createWavePattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const rows = 5;
    const cols = 8;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col - cols/2 + 0.5) * 3;
        const waveOffset = Math.sin(col * 0.5) * 1.5;
        this.createBrick(
          x,
          12 - row * 1.5 + waveOffset,
          colors[Math.floor(Math.random() * colors.length)]
        );
      }
    }
  }

  createPyramidPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const rows = 6;
    
    for (let row = 0; row < rows; row++) {
      const bricksInRow = rows - row;
      for (let col = 0; col < bricksInRow; col++) {
        const x = (col - bricksInRow/2 + 0.5) * 3;
        this.createBrick(
          x,
          12 - row * 1.5,
          colors[Math.floor(Math.random() * colors.length)]
        );
      }
    }
  }

  createMazePattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const rows = 8;
    const cols = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Create maze-like gaps
        if ((row + col) % 2 === 0 || Math.random() > 0.7) {
          const x = (col - cols/2 + 0.5) * 2.5;
          const y = 12 - row * 1.5;
          // Add some randomization to z position for 3D effect
          const z = (Math.random() - 0.5) * 2;
          this.createBrick(
            x,
            y,
            colors[Math.floor(Math.random() * colors.length)],
            z
          );
        }
      }
    }
  }

  createDoubleHelixPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const turns = 3;
    const bricksPerTurn = 12;
    const radius = 6;
    
    for (let i = 0; i < turns * bricksPerTurn; i++) {
      const angle = (i / bricksPerTurn) * Math.PI * 2;
      const y = 12 - (i / (turns * bricksPerTurn)) * 15;
      
      // Create two helixes
      for (let helix = 0; helix < 2; helix++) {
        const offset = helix * Math.PI; // Offset second helix by 180 degrees
        this.createBrick(
          Math.cos(angle + offset) * radius,
          y,
          colors[Math.floor(Math.random() * colors.length)],
          Math.sin(angle + offset) * 2 // Add depth
        );
        
        // Add connecting bridges between helixes occasionally
        if (i % 4 === 0) {
          this.createBrick(
            Math.cos(angle + offset + Math.PI/2) * radius * 0.7,
            y,
            colors[Math.floor(Math.random() * colors.length)],
            0
          );
        }
      }
    }
  }

  createCrossPattern() {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff0000];
    const size = 12;
    const centerGap = 2;
    
    // Create horizontal bar
    for (let x = -size/2; x <= size/2; x++) {
      if (Math.abs(x) > centerGap/2) {
        this.createBrick(
          x * 2,
          8,
          colors[Math.floor(Math.random() * colors.length)],
          Math.sin(x * 0.5) * 2 // Wavy depth
        );
      }
    }
    
    // Create vertical bar
    for (let y = 0; y <= size; y++) {
      if (Math.abs(y - size/2) > centerGap/2) {
        this.createBrick(
          0,
          y + 2,
          colors[Math.floor(Math.random() * colors.length)],
          Math.cos(y * 0.5) * 2 // Wavy depth
        );
        
        // Add side extensions
        if (y % 3 === 0) {
          for (let x = 1; x <= 3; x++) {
            this.createBrick(
              x * 2,
              y + 2,
              colors[Math.floor(Math.random() * colors.length)],
              0
            );
            this.createBrick(
              -x * 2,
              y + 2,
              colors[Math.floor(Math.random() * colors.length)],
              0
            );
          }
        }
      }
    }
  }

  initAudio() {
    // Create audio listener
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    // Create sound objects
    this.sounds = {
      paddleHit: new THREE.PositionalAudio(this.listener),
      brickBreak: new THREE.PositionalAudio(this.listener),
      wallHit: new THREE.PositionalAudio(this.listener),
      powerUp: new THREE.PositionalAudio(this.listener),
      gameOver: new THREE.PositionalAudio(this.listener),
      levelComplete: new THREE.PositionalAudio(this.listener)
    };

    // Load audio files
    const audioLoader = new THREE.AudioLoader();

    // Paddle hit sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/ping.mp3', (buffer) => {
      this.sounds.paddleHit.setBuffer(buffer);
      this.sounds.paddleHit.setVolume(0.3);
    });

    // Brick break sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/break.mp3', (buffer) => {
      this.sounds.brickBreak.setBuffer(buffer);
      this.sounds.brickBreak.setVolume(0.2);
    });

    // Wall hit sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/hit.mp3', (buffer) => {
      this.sounds.wallHit.setBuffer(buffer);
      this.sounds.wallHit.setVolume(0.2);
    });

    // Power-up sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/powerup.mp3', (buffer) => {
      this.sounds.powerUp.setBuffer(buffer);
      this.sounds.powerUp.setVolume(0.4);
    });

    // Game over sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/gameover.mp3', (buffer) => {
      this.sounds.gameOver.setBuffer(buffer);
      this.sounds.gameOver.setVolume(0.5);
    });

    // Level complete sound
    audioLoader.load('https://raw.githubusercontent.com/positlabs/sound-assets/master/sounds/win.mp3', (buffer) => {
      this.sounds.levelComplete.setBuffer(buffer);
      this.sounds.levelComplete.setVolume(0.4);
    });

    // Add error handling for audio loading
    audioLoader.manager.onError = (url) => {
      console.error('Error loading audio:', url);
    };

    // Add success handling
    audioLoader.manager.onLoad = () => {
      console.log('All audio loaded successfully');
    };

    // Initialize Web Audio context on user interaction
    const startAudio = () => {
      if (this.listener.context.state === 'suspended') {
        this.listener.context.resume();
      }
      document.removeEventListener('click', startAudio);
      document.removeEventListener('touchstart', startAudio);
    };

    document.addEventListener('click', startAudio);
    document.addEventListener('touchstart', startAudio);
  }

  playSound(soundName, position = null) {
    if (this.sounds[soundName] && this.sounds[soundName].buffer) {
      if (position) {
        this.sounds[soundName].position.copy(position);
      }
      if (this.sounds[soundName].isPlaying) {
        this.sounds[soundName].stop();
      }
      this.sounds[soundName].play();
    }
  }
} // End of Game3D class

// Start the game
new Game3D();