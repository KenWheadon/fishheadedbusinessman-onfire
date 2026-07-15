class CarrotCutter {
  constructor(container, width, height) {
    this.container = container;
    this.width = width;
    this.height = height;

    // Create Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    // Node configuration (lower-left corner)
    this.nodeX = 80;
    this.nodeY = this.height - 80;
    
    // Scale size parameters relative to screen size
    this.carrotTotalLength = Math.min(this.width, this.height) * 0.45;
    this.carrotBottomLength = this.carrotTotalLength * 0.45; // where the cut happens
    this.carrotWidth = 26;

    // Physics constants
    this.gravity = 0.35;
    this.bounce = 0.55;
    this.friction = 0.98;

    // Load assets
    this.images = {
      hub: this.loadImage('images/image1.png'),
      bottom: this.loadImage('images/carrot-bottom.png'),
      top: this.loadImage('images/carrot-top.png')
    };

    // Instantiate 5 carrots fanned between -15deg and -75deg
    this.carrots = [];
    const minAngle = -15 * Math.PI / 180;
    const maxAngle = -75 * Math.PI / 180;
    for (let i = 0; i < 5; i++) {
      const angle = minAngle + (maxAngle - minAngle) * (i / 4);
      this.carrots.push({
        angle: angle,
        isCut: false
      });
    }

    this.flyingTops = [];
    this.particles = [];

    // Start Game Loop
    this.active = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // Robust Image loader with callback state check
  loadImage(src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    img.onerror = () => { img.loaded = false; };
    return img;
  }

  // Returns number of uncut carrots
  checkCut() {
    return this.carrots.filter(c => !c.isCut).length;
  }

  // Cuts the next available carrot (starting from bottom/rightmost up)
  cut() {
    const targetIdx = this.carrots.findIndex(c => !c.isCut);
    if (targetIdx === -1) return; // All carrots are already cut!

    const carrot = this.carrots[targetIdx];
    carrot.isCut = true;

    // Midpoint where the cut occurs
    const midX = this.nodeX + Math.cos(carrot.angle) * this.carrotBottomLength;
    const midY = this.nodeY + Math.sin(carrot.angle) * this.carrotBottomLength;

    // Spawn point of the flying slice (midway through the top piece)
    const topPartLength = this.carrotTotalLength - this.carrotBottomLength;
    const spawnDist = this.carrotBottomLength + topPartLength / 2;
    const spawnX = this.nodeX + Math.cos(carrot.angle) * spawnDist;
    const spawnY = this.nodeY + Math.sin(carrot.angle) * spawnDist;

    // Launch Physics: Fling upwards and slightly rightwards
    const outSpeed = 5 + Math.random() * 3;
    const lateralSpeed = -3 - Math.random() * 4;
    
    const vx = Math.cos(carrot.angle) * outSpeed - Math.sin(carrot.angle) * lateralSpeed;
    const vy = Math.sin(carrot.angle) * outSpeed + Math.cos(carrot.angle) * lateralSpeed - 2; // Extra upwards push

    this.flyingTops.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      angle: carrot.angle,
      va: (Math.random() - 0.5) * 0.25, // Spin
      r: topPartLength / 2, // Physical bounding radius
      length: topPartLength
    });

    // Spawn orange juice and chunk particles
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const pAngle = carrot.angle + (Math.random() - 0.5) * 1.8;
      const pSpeed = 4 + Math.random() * 7;
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 2,
        vy: Math.sin(pAngle) * pSpeed - (2 + Math.random() * 4),
        size: 3 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3,
        color: `hsl(${18 + Math.random() * 14}, 100%, ${50 + Math.random() * 12}%)`,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.015
      });
    }
  }

  // Restore everything to starting state
  reset() {
    this.carrots.forEach(c => c.isCut = false);
    this.flyingTops = [];
    this.particles = [];
  }

  // Clean-up loop and elements
  destroy() {
    this.active = false;
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  // Screen/Dimension bounds updater
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.nodeX = 80;
    this.nodeY = this.height - 80;
    this.carrotTotalLength = Math.min(this.width, this.height) * 0.45;
    this.carrotBottomLength = this.carrotTotalLength * 0.45;
  }

  // Custom 2D Line-Circle Collision Engine
  checkSegmentCollision(top, A, B) {
    const abX = B.x - A.x;
    const abY = B.y - A.y;
    const apX = top.x - A.x;
    const apY = top.y - A.y;

    const abLenSq = abX * abX + abY * abY;
    if (abLenSq === 0) return;

    // Project AP onto AB, clamped between A and B
    let t = (apX * abX + apY * abY) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    // Closest point C on the segment
    const cx = A.x + t * abX;
    const cy = A.y + t * abY;

    const distX = top.x - cx;
    const distY = top.y - cy;
    const distSq = distX * distX + distY * distY;

    // Collision threshold
    const buffer = this.carrotWidth * 0.5;
    const minDist = top.r + buffer;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      
      // Calculate normal direction vector
      let nx = 0, ny = -1;
      if (dist > 0) {
        nx = distX / dist;
        ny = distY / dist;
      }

      // Move out of penetration immediately
      const overlap = minDist - dist;
      top.x += nx * overlap;
      top.y += ny * overlap;

      // Reflect Velocity
      const dot = top.vx * nx + top.vy * ny;
      if (dot < 0) { // Moving towards the carrot segment
        top.vx = (top.vx - 2 * dot * nx) * this.bounce;
        top.vy = (top.vy - 2 * dot * ny) * this.bounce;
        top.va += (top.vx * ny - top.vy * nx) * 0.02; // Impart drag rotational spin
      }
    }
  }

  // Update physics frame
  update() {
    // 1. Update Flying Tops
    for (let top of this.flyingTops) {
      top.vy += this.gravity;
      top.x += top.vx;
      top.y += top.vy;
      top.angle += top.va;

      // Floor collision (comes to a roll/rest)
      if (top.y > this.height - top.r) {
        top.y = this.height - top.r;
        top.vy = -top.vy * this.bounce;
        top.vx *= this.friction;
        top.va *= 0.9; // Friction dampens rotation

        if (Math.abs(top.vy) < 0.4) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
      }

      // Walls
      if (top.x < top.r) {
        top.x = top.r;
        top.vx = -top.vx * this.bounce;
      }
      if (top.x > this.width - top.r) {
        top.x = this.width - top.r;
        top.vx = -top.vx * this.bounce;
      }

      // Collide with carrots & nubs
      this.carrots.forEach((carrot) => {
        const length = carrot.isCut ? this.carrotBottomLength : this.carrotTotalLength;
        const A = { x: this.nodeX, y: this.nodeY };
        const B = {
          x: this.nodeX + Math.cos(carrot.angle) * length,
          y: this.nodeY + Math.sin(carrot.angle) * length
        };
        this.checkSegmentCollision(top, A, B);
      });
    }

    // 2. Update Juice Chunks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.6; // slightly floating physics
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      // Floor bounce for chunks
      if (p.y > this.height - p.size) {
        p.y = this.height - p.size;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.7;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Render everything onto canvas
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Draw Carrots
    this.carrots.forEach((carrot) => {
      this.ctx.save();
      this.ctx.translate(this.nodeX, this.nodeY);
      this.ctx.rotate(carrot.angle);

      // Draw bottom half
      if (this.images.bottom.loaded) {
        this.ctx.drawImage(this.images.bottom, 0, -this.carrotWidth / 2, this.carrotBottomLength, this.carrotWidth);
      } else {
        // Fallback custom vector carrot base
        this.ctx.fillStyle = '#ff6b00';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.carrotWidth / 2);
        this.ctx.lineTo(this.carrotBottomLength, -this.carrotWidth * 0.35);
        this.ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.35);
        this.ctx.lineTo(0, this.carrotWidth / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Horizontal textures
        this.ctx.strokeStyle = '#d35400';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.carrotBottomLength * 0.4, -this.carrotWidth * 0.3);
        this.ctx.lineTo(this.carrotBottomLength * 0.4, this.carrotWidth * 0.3);
        this.ctx.moveTo(this.carrotBottomLength * 0.7, -this.carrotWidth * 0.2);
        this.ctx.lineTo(this.carrotBottomLength * 0.7, this.carrotWidth * 0.2);
        this.ctx.stroke();
      }

      // Draw top half (only if uncut)
      if (!carrot.isCut) {
        const topLength = this.carrotTotalLength - this.carrotBottomLength;
        if (this.images.top.loaded) {
          this.ctx.drawImage(this.images.top, this.carrotBottomLength, -this.carrotWidth / 2, topLength, this.carrotWidth);
        } else {
          // Fallback custom vector carrot tip + leaves
          this.ctx.fillStyle = '#ff7a18';
          this.ctx.beginPath();
          this.ctx.moveTo(this.carrotBottomLength, -this.carrotWidth * 0.35);
          this.ctx.lineTo(this.carrotTotalLength - 10, -this.carrotWidth * 0.15);
          this.ctx.lineTo(this.carrotTotalLength, 0);
          this.ctx.lineTo(this.carrotTotalLength - 10, this.carrotWidth * 0.15);
          this.ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.35);
          this.ctx.closePath();
          this.ctx.fill();

          // Leafy greens
          this.ctx.fillStyle = '#2ecc71';
          this.ctx.beginPath();
          this.ctx.arc(this.carrotTotalLength + 4, -4, 6, 0, Math.PI * 2);
          this.ctx.arc(this.carrotTotalLength + 6, 4, 5, 0, Math.PI * 2);
          this.ctx.arc(this.carrotTotalLength, 0, 4, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      this.ctx.restore();
    });

    // 2. Draw Bouncing Cut Slices
    this.flyingTops.forEach((top) => {
      this.ctx.save();
      this.ctx.translate(top.x, top.y);
      this.ctx.rotate(top.angle);

      const drawX = -top.length / 2;
      const drawY = -this.carrotWidth / 2;

      if (this.images.top.loaded) {
        this.ctx.drawImage(this.images.top, drawX, drawY, top.length, this.carrotWidth);
      } else {
        // Falling fallback tip
        this.ctx.fillStyle = '#ff7a18';
        this.ctx.beginPath();
        this.ctx.moveTo(drawX, -this.carrotWidth * 0.35);
        this.ctx.lineTo(top.length / 2 - 10, -this.carrotWidth * 0.15);
        this.ctx.lineTo(top.length / 2, 0);
        this.ctx.lineTo(top.length / 2 - 10, this.carrotWidth * 0.15);
        this.ctx.lineTo(drawX, this.carrotWidth * 0.35);
        this.ctx.closePath();
        this.ctx.fill();

        // Foliage
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.arc(top.length / 2 + 4, -4, 6, 0, Math.PI * 2);
        this.ctx.arc(top.length / 2 + 6, 4, 5, 0, Math.PI * 2);
        this.ctx.arc(top.length / 2, 0, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 3. Draw Particles (Chunks and Drops)
    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      // Rectangular carrot "chunks"
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    });
    this.ctx.globalAlpha = 1.0; // Reset globalAlpha

    // 4. Draw Central Node Anchor
    this.ctx.save();
    if (this.images.hub.loaded) {
      this.ctx.drawImage(this.images.hub, this.nodeX - 40, this.nodeY - 40, 80, 80);
    } else {
      // Fallback custom vector rustic steel clamp plate
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.beginPath();
      this.ctx.arc(this.nodeX, this.nodeY, 34, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#7f8c8d';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      this.ctx.fillStyle = '#95a5a6';
      this.ctx.beginPath();
      this.ctx.arc(this.nodeX, this.nodeY, 15, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // System animation execution
  animate() {
    if (!this.active) return;
    this.update();
    this.render();
    requestAnimationFrame(this.animate);
  }
}