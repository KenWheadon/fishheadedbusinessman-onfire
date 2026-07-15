/**
 * CarrotCutter - Highly Polished, Modular HTML5 Canvas Game Component
 * 
 * Designed to act as a self-contained layout "block" rendered relative to parent-provided offsets.
 * Strictly decoupled from DOM creation, timers, event listeners, and direct image loaders.
 */
class CarrotCutter {
  /**
   * @param {Object} config - Component layout configuration
   * @param {number} config.width - Bounding width of this component block
   * @param {number} config.height - Bounding height of this component block
   */
  constructor({ width = 800, height = 600 } = {}) {
    this.width = width;
    this.height = height;

    // Component Local coordinates (tucked in the bottom-left relative corner)
    this.nodeX = 60;
    this.nodeY = this.height - 60;
    
    // Stubby and "Nubby" carrot dimensions
    this.carrotTotalLength = 110;  
    this.carrotWidth = 36;         
    this.carrotBottomLength = 50;  
    this.hubRadius = 26;           

    // Physics constants
    this.gravity = 0.55;           // Standard gravity (scaled relative to normalized dt)
    this.bounce = 0.65;            // Bounciness off relative walls/floor
    this.friction = 0.98;          // Floor rolling friction

    // Juice Effects State
    this.screenShake = 0;
    this.shockwaves = [];
    this.flyingTops = [];
    this.particles = [];
    this.isHubHovered = false;

    // Instantiate 5 carrots fanned from left-most (-80 deg) to right-most (-10 deg)
    this.carrots = [];
    const leftMostAngle = -80 * Math.PI / 180;
    const rightMostAngle = -10 * Math.PI / 180;
    
    for (let i = 0; i < 5; i++) {
      const angle = leftMostAngle + (rightMostAngle - leftMostAngle) * (i / 4);
      this.carrots.push({ angle: angle, isCut: false });
    }
  }

  /**
   * Safely retrieves preloaded assets from a decoupled global AssetManager.
   * Falls back gracefully to beautiful procedural graphics if assets are missing.
   * @param {string} key - The asset identifier
   */
  getAsset(key) {
    if (typeof AssetManager !== 'undefined' && typeof AssetManager.get === 'function') {
      const asset = AssetManager.get(key);
      if (asset && asset.complete) {
        return asset;
      }
    }
    return null;
  }

  /**
   * Returns the number of uncut carrots
   */
  checkCut() {
    return this.carrots.filter(c => !c.isCut).length;
  }

  /**
   * Cut the next available carrot (starting from the left-most)
   */
  cut() {
    const targetIdx = this.carrots.findIndex(c => !c.isCut);
    if (targetIdx === -1) return; 

    const carrot = this.carrots[targetIdx];
    carrot.isCut = true;

    // Trigger local vertical screen shake
    this.screenShake = 16;

    // Local coordinates cut point
    const midX = this.nodeX + Math.cos(carrot.angle) * this.carrotBottomLength;
    const midY = this.nodeY + Math.sin(carrot.angle) * this.carrotBottomLength;

    // Spawn shockwave ring
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

    // Upward pop velocities
    const vx = 1.5 + Math.random() * 4.5;
    const vy = -18 - Math.random() * 7;

    this.flyingTops.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      angle: carrot.angle,
      va: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3),
      r: this.carrotWidth / 2, 
      length: topPartLength
    });

    // Upward fountain particles
    const particleCount = 40; 
    for (let i = 0; i < particleCount; i++) {
      const pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0; 
      const pSpeed = 7 + Math.random() * 12;      
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 2,
        vy: Math.sin(pAngle) * pSpeed - (4 + Math.random() * 5),
        size: 4 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.6,
        color: `hsl(${14 + Math.random() * 14}, 100%, ${46 + Math.random() * 14}%)`,
        alpha: 1.0,
        decay: 0.01 + Math.random() * 0.01
      });
    }
  }

  /**
   * Resets the game state
   */
  reset() {
    this.carrots.forEach(c => c.isCut = false);
    this.flyingTops = [];
    this.particles = [];
    this.shockwaves = [];
    this.screenShake = 0;
  }

  /**
   * Adjust internal dimensions dynamically without resetting active gameplay properties
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.nodeX = 60;
    this.nodeY = this.height - 60;
  }

  /**
   * Localized Event Handler: Track pointer position mapping
   * @param {number} localX - X coordinate relative to the component's top-left corner
   * @param {number} localY - Y coordinate relative to the component's top-left corner
   */
  handleMouseMove(localX, localY) {
    // Add polished interactive feedback by tracking hover states over the anchor hub
    const dx = localX - this.nodeX;
    const dy = localY - this.nodeY;
    const distance = Math.hypot(dx, dy);
    this.isHubHovered = distance <= this.hubRadius;
  }

  /**
   * Localized Event Handler: Click interactions scaled to local component space
   * @param {number} localX - X coordinate relative to the component's top-left corner
   * @param {number} localY - Y coordinate relative to the component's top-left corner
   */
  handleMouseClick(localX, localY) {
    // Click within the component boundary checks out
    if (localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height) {
      const dx = localX - this.nodeX;
      const dy = localY - this.nodeY;
      const clickedHub = Math.hypot(dx, dy) <= this.hubRadius;
      
      // Cut next carrot if clicking the component area or the central anchor hub
      if (clickedHub || localY < this.height) {
        this.cut();
      }
    }
  }

  /**
   * Update all physics, spring simulations, and particle lifetimes using dt
   * @param {number} dt - Delta time multiplier (normalized where 1 unit = 16.67ms)
   */
  update(dt = 1) {
    // 1. Decay Screen Shake
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.86, dt);
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * (1 - Math.pow(1 - 0.18, dt));
      s.alpha -= 0.05 * dt;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Flying Tops (Constrained perfectly inside relative bounds)
    for (let top of this.flyingTops) {
      top.vy += this.gravity * dt;
      top.x += top.vx * dt;
      top.y += top.vy * dt;
      top.angle += top.va * dt;

      // Top Ceiling Bounce
      if (top.y < top.r) {
        top.y = top.r;
        top.vy = -top.vy * this.bounce;
        top.va *= -0.8; 
      }

      // Floor Bounce & Roll relative to configured height
      if (top.y > this.height - top.r) {
        top.y = this.height - top.r;
        top.vy = -top.vy * this.bounce;
        top.vx *= Math.pow(this.friction, dt);
        top.va *= Math.pow(0.88, dt);

        if (Math.abs(top.vy) < 0.3) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
      }

      // Left Wall Bounce
      if (top.x < top.r) {
        top.x = top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }
      // Right Wall Bounce relative to configured width
      if (top.x > this.width - top.r) {
        top.x = this.width - top.r;
        top.vx = -top.vx * this.bounce;
        top.va = -top.va * this.bounce;
      }
    }

    // 4. Update Splash Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
      p.alpha -= p.decay * dt;

      // Particles bounce off floor
      if (p.y > this.height - p.size) {
        p.y = this.height - p.size;
        p.vy = -p.vy * 0.3;
        p.vx *= Math.pow(0.7, dt);
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Render component offset relative to (x, y) coordinates on provided canvas context.
   * @param {CanvasRenderingContext2D} ctx - Target canvas rendering context
   * @param {number} x - Drawing offset X
   * @param {number} y - Drawing offset Y
   */
  draw(ctx, x, y) {
    ctx.save();
    
    // Translate coordinates to position the component block
    ctx.translate(x, y);

    // Strictly enforce layout clipping bounds
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    // Fetch Preloaded Assets
    const imgHub = this.getAsset('hub');
    const imgBottom = this.getAsset('bottom');
    const imgTop = this.getAsset('top');

    // Localized Screen Shake translation (confined within clipping mask)
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * (this.screenShake * 0.4);
      const dy = (Math.random() - 0.5) * this.screenShake; 
      ctx.translate(dx, dy);
    }

    // 1. Draw Shockwaves
    this.shockwaves.forEach((s) => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw Static Carrots
    this.carrots.forEach((carrot) => {
      ctx.save();
      ctx.translate(this.nodeX, this.nodeY);
      ctx.rotate(carrot.angle);

      // Bottom Nub
      if (imgBottom) {
        ctx.drawImage(imgBottom, 0, -this.carrotWidth / 2, this.carrotBottomLength, this.carrotWidth);
      } else {
        // Procedural Fallback
        ctx.fillStyle = '#ff6b00';
        ctx.beginPath();
        ctx.moveTo(0, -this.carrotWidth / 2);
        ctx.lineTo(this.carrotBottomLength, -this.carrotWidth * 0.45);
        ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.45);
        ctx.lineTo(0, this.carrotWidth / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#e65c00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.carrotBottomLength * 0.4, -this.carrotWidth * 0.4);
        ctx.lineTo(this.carrotBottomLength * 0.4, this.carrotWidth * 0.4);
        ctx.stroke();
      }

      // Top Nub (only drawn if uncut)
      if (!carrot.isCut) {
        const topLength = this.carrotTotalLength - this.carrotBottomLength;
        if (imgTop) {
          ctx.drawImage(imgTop, this.carrotBottomLength, -this.carrotWidth / 2, topLength, this.carrotWidth);
        } else {
          // Procedural Fallback
          ctx.fillStyle = '#ff7a18';
          ctx.beginPath();
          ctx.moveTo(this.carrotBottomLength, -this.carrotWidth * 0.45);
          ctx.lineTo(this.carrotTotalLength - 12, -this.carrotWidth * 0.25);
          ctx.lineTo(this.carrotTotalLength, 0);
          ctx.lineTo(this.carrotTotalLength - 12, this.carrotWidth * 0.25);
          ctx.lineTo(this.carrotBottomLength, this.carrotWidth * 0.45);
          ctx.closePath();
          ctx.fill();

          // Green Leaves
          ctx.fillStyle = '#27ae60';
          ctx.beginPath();
          ctx.arc(this.carrotTotalLength + 3, -5, 7, 0, Math.PI * 2);
          ctx.arc(this.carrotTotalLength + 5, 5, 6, 0, Math.PI * 2);
          ctx.arc(this.carrotTotalLength, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });

    // 3. Draw Flying Tops
    this.flyingTops.forEach((top) => {
      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(top.angle);

      const drawX = -top.length / 2;
      const drawY = -this.carrotWidth / 2;

      if (imgTop) {
        ctx.drawImage(imgTop, drawX, drawY, top.length, this.carrotWidth);
      } else {
        // Procedural Fallback
        ctx.fillStyle = '#ff7a18';
        ctx.beginPath();
        ctx.moveTo(drawX, -this.carrotWidth * 0.45);
        ctx.lineTo(top.length / 2 - 12, -this.carrotWidth * 0.25);
        ctx.lineTo(top.length / 2, 0);
        ctx.lineTo(top.length / 2 - 12, this.carrotWidth * 0.25);
        ctx.lineTo(drawX, this.carrotWidth * 0.45);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(top.length / 2 + 3, -5, 7, 0, Math.PI * 2);
        ctx.arc(top.length / 2 + 5, 5, 6, 0, Math.PI * 2);
        ctx.arc(top.length / 2, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 4. Draw Splash Particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // 5. Draw Central Anchor Hub
    ctx.save();
    if (imgHub) {
      // Glow and visual feedback on hover state
      if (this.isHubHovered) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#e67e22';
      }
      ctx.drawImage(imgHub, this.nodeX - this.hubRadius, this.nodeY - this.hubRadius, this.hubRadius * 2, this.hubRadius * 2);
    } else {
      // Procedural Fallback
      ctx.fillStyle = this.isHubHovered ? '#34495e' : '#2c3e50';
      ctx.beginPath();
      ctx.arc(this.nodeX, this.nodeY, this.hubRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.isHubHovered ? '#f39c12' : '#bdc3c7';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // Restore context back to global state
  }
}