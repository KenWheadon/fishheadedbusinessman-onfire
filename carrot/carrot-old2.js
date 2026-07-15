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

    // Dynamic Corner Placement (Tucked tightly into the bottom-left corner)
    this.nodeX = 60;
    this.nodeY = this.height - 60;
    
    // Stubby and "Nubby" Dimensions
    this.carrotTotalLength = 110;  // Shorter length
    this.carrotWidth = 36;         // Fat and stubby
    this.carrotBottomLength = 50;  // Cut close to the node
    this.hubRadius = 26;           // Smaller hub anchor

    // Physics Tuning (Bouncier and faster)
    this.gravity = 0.45;
    this.bounce = 0.65;
    this.friction = 0.985;

    // Juice Effects State
    this.screenShake = 0;
    this.shockwaves = [];

    // Load assets (with fallback support)
    this.images = {
      hub: this.loadImage('images/image1.png'),
      bottom: this.loadImage('images/carrot-bottom.png'),
      top: this.loadImage('images/carrot-top.png')
    };

    // Instantiate 5 carrots fanned tightly (between -10deg and -80deg)
    this.carrots = [];
    const minAngle = -10 * Math.PI / 180;
    const maxAngle = -80 * Math.PI / 180;
    for (let i = 0; i < 5; i++) {
      const angle = minAngle + (maxAngle - minAngle) * (i / 4);
      this.carrots.push({ angle: angle, isCut: false });
    }

    this.flyingTops = [];
    this.particles = [];

    // Run Game Loop
    this.active = true;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  loadImage(src) {
    const img = new Image();
    img.src = src;
    img.loaded = false;
    img.onload = () => { img.loaded = true; };
    img.onerror = () => { img.loaded = false; };
    return img;
  }

  checkCut() {
    return this.carrots.filter(c => !c.isCut).length;
  }

  // Trigger explosive slice
  cut() {
    const targetIdx = this.carrots.findIndex(c => !c.isCut);
    if (targetIdx === -1) return; 

    const carrot = this.carrots[targetIdx];
    carrot.isCut = true;

    // Trigger powerful screen shake
    this.screenShake = 14;

    // Find precise point of cut
    const midX = this.nodeX + Math.cos(carrot.angle) * this.carrotBottomLength;
    const midY = this.nodeY + Math.sin(carrot.angle) * this.carrotBottomLength;

    // Spawn expanding shockwave ring
    this.shockwaves.push({
      x: midX,
      y: midY,
      radius: 4,
      maxRadius: 65,
      alpha: 1.0
    });

    // Calculate details for the flying piece
    const topPartLength = this.carrotTotalLength - this.carrotBottomLength;
    const spawnDist = this.carrotBottomLength + topPartLength / 2;
    const spawnX = this.nodeX + Math.cos(carrot.angle) * spawnDist;
    const spawnY = this.nodeY + Math.sin(carrot.angle) * spawnDist;

    // Explosive velocity boost (Flinging high & wide across the whole screen!)
    const speedPower = 11 + Math.random() * 6;
    const lateralBlast = -6 - Math.random() * 8;
    
    const vx = Math.cos(carrot.angle) * speedPower - Math.sin(carrot.angle) * lateralBlast;
    const vy = Math.sin(carrot.angle) * speedPower + Math.cos(carrot.angle) * lateralBlast - 6;

    this.flyingTops.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      angle: carrot.angle,
      va: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3), // High speed spin
      r: this.carrotWidth / 2, 
      length: topPartLength
    });

    // Spawn dense orange particle explosion
    const particleCount = 35;
    for (let i = 0; i < particleCount; i++) {
      const pAngle = Math.random() * Math.PI * 2; // Full radial burst
      const pSpeed = 5 + Math.random() * 12;      // Explosive range of speeds
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 4,
        vy: Math.sin(pAngle) * pSpeed - (2 + Math.random() * 5),
        size: 4 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.5,
        color: `hsl(${15 + Math.random() * 15}, 100%, ${48 + Math.random() * 15}%)`,
        alpha: 1.0,
        decay: 0.012 + Math.random() * 0.015
      });
    }
  }

  reset() {
    this.carrots.forEach(c => c.isCut = false);
    this.flyingTops = [];
    this.particles = [];
    this.shockwaves = [];
    this.screenShake = 0;
  }

  destroy() {
    this.active = false;
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.nodeX = 60;
    this.nodeY = this.height - 60;
  }

  // 2D Line-Circle Collision Engine
  checkSegmentCollision(top, A, B) {
    const abX = B.x - A.x;
    const abY = B.y - A.y;
    const apX = top.x - A.x;
    const apY = top.y - A.y;

    const abLenSq = abX * abX + abY * abY;
    if (abLenSq === 0) return;

    let t = (apX * abX + apY * abY) / abLenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = A.x + t * abX;
    const cy = A.y + t * abY;

    const distX = top.x - cx;
    const distY = top.y - cy;
    const distSq = distX * distX + distY * distY;

    const buffer = this.carrotWidth * 0.5;
    const minDist = top.r + buffer;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      
      let nx = 0, ny = -1;
      if (dist > 0) {
        nx = distX / dist;
        ny = distY / dist;
      }

      // Resolve penetration instantly
      const overlap = minDist - dist;
      top.x += nx * overlap;
      top.y += ny * overlap;

      // Elastic reflection
      const dot = top.vx * nx + top.vy * ny;
      if (dot < 0) {
        top.vx = (top.vx - 2 * dot * nx) * this.bounce;
        top.vy = (top.vy - 2 * dot * ny) * this.bounce;
        top.va += (top.vx * ny - top.vy * nx) * 0.05; // Extra rotation transfer on impact
      }
    }
  }

  update() {
    // 1. Decay Screen Shake
    if (this.screenShake > 0) {
      this.screenShake *= 0.88;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.15;
      s.alpha -= 0.04;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Flying Tops
    for (let top of this.flyingTops) {
      top.vy += this.gravity;
      top.x += top.vx;
      top.y += top.vy;
      top.angle += top.va;

      // Screen Ceiling
      if (top.y < top.r) {
        top.y = top.r;
        top.vy = -top.vy * this.bounce;
      }

      // Screen Floor bounce/rolling
      if (top.y > this.height - top.r) {
        top.y = this.height - top.r;
        top.vy = -top.vy * this.bounce;
        top.vx *= this.friction;
        top.va *= 0.88;

        if (Math.abs(top.vy) < 0.3) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
      }

      // Screen Walls
      if (top.x < top.r) {
        top.x = top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }
      if (top.x > this.width - top.r) {
        top.x = this.width - top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }

      // Collision with static carrot bases & uncut carrots
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

    // 4. Update Juice Chunks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.55;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      // Bouncing particles on bottom boundary
      if (p.y > this.height - p.size) {
        p.y = this.height - p.size;
        p.vy = -p.vy * 0.4;
        p.vx *= 0.8;
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    
    // Apply Screen Shake transformation globally if active
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    // 1. Draw Shockwaves
    this.shockwaves.forEach((s) => {
      this.ctx.save();
      this.ctx.globalAlpha = s.alpha;
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // 2. Draw Static Carrots (Tucked into corner)
    this.carrots.forEach((carrot) => {
      this.ctx.save();
      this.ctx.translate(this.nodeX, this.nodeY);
      this.ctx.rotate(carrot.angle);

      // Bottom Nub
      if (this.images.bottom.loaded) {
        this.ctx.drawImage(this.images.bottom, 0, -this.carrotWidth / 2, this.carrotBottomLength, this.carrotWidth);
      } else {
        this.ctx.fillStyle = '#ff6b00';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.carrotWidth / 2);
        this.ctx.lineTo(this.carrotBottomLength, -this.carrotWidth * 0.45);
        this.ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.45);
        this.ctx.lineTo(0, this.carrotWidth / 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Lines for detail
        this.ctx.strokeStyle = '#e65c00';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.carrotBottomLength * 0.4, -this.carrotWidth * 0.4);
        this.ctx.lineTo(this.carrotBottomLength * 0.4, this.carrotWidth * 0.4);
        this.ctx.stroke();
      }

      // Top Nub
      if (!carrot.isCut) {
        const topLength = this.carrotTotalLength - this.carrotBottomLength;
        if (this.images.top.loaded) {
          this.ctx.drawImage(this.images.top, this.carrotBottomLength, -this.carrotWidth / 2, topLength, this.carrotWidth);
        } else {
          this.ctx.fillStyle = '#ff7a18';
          this.ctx.beginPath();
          this.ctx.moveTo(this.carrotBottomLength, -this.carrotWidth * 0.45);
          this.ctx.lineTo(this.carrotTotalLength - 12, -this.carrotWidth * 0.25);
          this.ctx.lineTo(this.carrotTotalLength, 0);
          this.ctx.lineTo(this.carrotTotalLength - 12, this.carrotWidth * 0.25);
          this.ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.45);
          this.ctx.closePath();
          this.ctx.fill();

          // Green Foliage
          this.ctx.fillStyle = '#27ae60';
          this.ctx.beginPath();
          this.ctx.arc(this.carrotTotalLength + 3, -5, 7, 0, Math.PI * 2);
          this.ctx.arc(this.carrotTotalLength + 5, 5, 6, 0, Math.PI * 2);
          this.ctx.arc(this.carrotTotalLength, 0, 5, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
      this.ctx.restore();
    });

    // 3. Draw Flying Tops (Bouncing around the whole screen canvas)
    this.flyingTops.forEach((top) => {
      this.ctx.save();
      this.ctx.translate(top.x, top.y);
      this.ctx.rotate(top.angle);

      const drawX = -top.length / 2;
      const drawY = -this.carrotWidth / 2;

      if (this.images.top.loaded) {
        this.ctx.drawImage(this.images.top, drawX, drawY, top.length, this.carrotWidth);
      } else {
        this.ctx.fillStyle = '#ff7a18';
        this.ctx.beginPath();
        this.ctx.moveTo(drawX, -this.carrotWidth * 0.45);
        this.ctx.lineTo(top.length / 2 - 12, -this.carrotWidth * 0.25);
        this.ctx.lineTo(top.length / 2, 0);
        this.ctx.lineTo(top.length / 2 - 12, this.carrotWidth * 0.25);
        this.ctx.lineTo(drawX, this.carrotWidth * 0.45);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#27ae60';
        this.ctx.beginPath();
        this.ctx.arc(top.length / 2 + 3, -5, 7, 0, Math.PI * 2);
        this.ctx.arc(top.length / 2 + 5, 5, 6, 0, Math.PI * 2);
        this.ctx.arc(top.length / 2, 0, 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    // 4. Draw Splash Particles
    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    });

    // 5. Draw Central Anchor Hub
    this.ctx.save();
    if (this.images.hub.loaded) {
      this.ctx.drawImage(this.images.hub, this.nodeX - this.hubRadius, this.nodeY - this.hubRadius, this.hubRadius * 2, this.hubRadius * 2);
    } else {
      this.ctx.fillStyle = '#2c3e50';
      this.ctx.beginPath();
      this.ctx.arc(this.nodeX, this.nodeY, this.hubRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#bdc3c7';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.restore(); // Restore global context translation (ends camera shake)
  }

  animate() {
    if (!this.active) return;
    this.update();
    this.render();
    requestAnimationFrame(this.animate);
  }
}