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

    // Node configuration (tucked in the bottom-left corner)
    this.nodeX = 60;
    this.nodeY = this.height - 60;
    
    // Stubby and "Nubby" carrot dimensions
    this.carrotTotalLength = 110;  
    this.carrotWidth = 36;         
    this.carrotBottomLength = 50;  
    this.hubRadius = 26;           

    // Physics constants
    this.gravity = 0.55;           // Decent gravity to pull them back down after high launches
    this.bounce = 0.65;            // Bounciness off walls/floor
    this.friction = 0.98;          // Floor rolling friction

    // Juice Effects State
    this.screenShake = 0;
    this.shockwaves = [];

    // Load assets (with fallback support)
    this.images = {
      hub: this.loadImage('images/image1.png'),
      bottom: this.loadImage('images/carrot-bottom.png'),
      top: this.loadImage('images/carrot-top.png')
    };

    // Instantiate 5 carrots fanned from left-most (-80 deg) to right-most (-10 deg)
    this.carrots = [];
    const leftMostAngle = -80 * Math.PI / 180;
    const rightMostAngle = -10 * Math.PI / 180;
    
    for (let i = 0; i < 5; i++) {
      // Linear interpolation from left (-80) to right (-10)
      const angle = leftMostAngle + (rightMostAngle - leftMostAngle) * (i / 4);
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

  // Returns number of uncut carrots
  checkCut() {
    return this.carrots.filter(c => !c.isCut).length;
  }

  // Cut the next carrot (starting from the left-most)
  cut() {
    // Finds the first uncut carrot (index 0 is the left-most)
    const targetIdx = this.carrots.findIndex(c => !c.isCut);
    if (targetIdx === -1) return; 

    const carrot = this.carrots[targetIdx];
    carrot.isCut = true;

    // Trigger vertical screen shake
    this.screenShake = 16;

    // Find the exact cut point
    const midX = this.nodeX + Math.cos(carrot.angle) * this.carrotBottomLength;
    const midY = this.nodeY + Math.sin(carrot.angle) * this.carrotBottomLength;

    // Spawn expanding shockwave ring
    this.shockwaves.push({
      x: midX,
      y: midY,
      radius: 4,
      maxRadius: 80,
      alpha: 1.0
    });

    // Calculate spawn position for the flying tip
    const topPartLength = this.carrotTotalLength - this.carrotBottomLength;
    const spawnDist = this.carrotBottomLength + topPartLength / 2;
    const spawnX = this.nodeX + Math.cos(carrot.angle) * spawnDist;
    const spawnY = this.nodeY + Math.sin(carrot.angle) * spawnDist;

    // --- EXPLOSIVE DIRECT UPWARD POP ---
    // We completely bypass the carrot's angle for the velocity to prevent rightward shooting.
    // Instead, we force a massive negative Y velocity (UP) and a gentle positive X velocity (RIGHT).
    const vx = 1.5 + Math.random() * 4.5;            // Gentle drift to the right
    const vy = -18 - Math.random() * 7;              // Massive upward launch rocket

    this.flyingTops.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      angle: carrot.angle,
      va: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3), // Fast spin
      r: this.carrotWidth / 2, 
      length: topPartLength
    });

    // --- UPWARD FOUNTAIN PARTICLES ---
    const particleCount = 40; 
    for (let i = 0; i < particleCount; i++) {
      // Spray angle biased heavily upwards (-Math.PI / 2) with a slight spread
      const pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0; 
      const pSpeed = 7 + Math.random() * 12;      
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 2,
        vy: Math.sin(pAngle) * pSpeed - (4 + Math.random() * 5), // Heavy upward push
        size: 4 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.6,
        color: `hsl(${14 + Math.random() * 14}, 100%, ${46 + Math.random() * 14}%)`,
        alpha: 1.0,
        decay: 0.01 + Math.random() * 0.01
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

  update() {
    // 1. Decay Screen Shake
    if (this.screenShake > 0) {
      this.screenShake *= 0.86;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.18;
      s.alpha -= 0.05;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Flying Tops (Clean physics, no static carrot collisions)
    for (let top of this.flyingTops) {
      top.vy += this.gravity;
      top.x += top.vx;
      top.y += top.vy;
      top.angle += top.va;

      // Screen Ceiling Bounce
      if (top.y < top.r) {
        top.y = top.r;
        top.vy = -top.vy * this.bounce;
        top.va *= -0.8; 
      }

      // Screen Floor Bounce & Roll
      if (top.y > this.height - top.r) {
        top.y = this.height - top.r;
        top.vy = -top.vy * this.bounce;
        top.vx *= this.friction;
        top.va *= 0.88;

        if (Math.abs(top.vy) < 0.3) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
      }

      // Left Wall Bounce
      if (top.x < top.r) {
        top.x = top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }
      // Right Wall Bounce
      if (top.x > this.width - top.r) {
        top.x = this.width - top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }
    }

    // 4. Update Juice Chunks
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.55;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      // Particles bounce off floor
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

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    
    // Apply Screen Shake (Heavy vertical bias)
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * (this.screenShake * 0.4);
      const dy = (Math.random() - 0.5) * this.screenShake; 
      this.ctx.translate(dx, dy);
    }

    // 1. Draw Shockwaves
    this.shockwaves.forEach((s) => {
      this.ctx.save();
      this.ctx.globalAlpha = s.alpha;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    });

    // 2. Draw Static Carrots
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
        
        // Ring details
        this.ctx.strokeStyle = '#e65c00';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(this.carrotBottomLength * 0.4, -this.carrotWidth * 0.4);
        this.ctx.lineTo(this.carrotBottomLength * 0.4, this.carrotWidth * 0.4);
        this.ctx.stroke();
      }

      // Top Nub (only draw if uncut)
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

          // Green Leaves
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

    // 3. Draw Flying Tops
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

    this.ctx.restore(); // Restore shake
  }

  animate() {
    if (!this.active) return;
    this.update();
    this.render();
    requestAnimationFrame(this.animate);
  }
}