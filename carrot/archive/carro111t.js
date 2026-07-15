/**
 * CarrotCutter - Adjusted for customizable base image size and multi-top alignment offsets.
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

    // --- EASY-ADJUST LAYOUT DASHBOARD ---
    this.layout = {
      // 1. ANCHOR NODE (The center pivot point where carrots fan out)
      nodeX: 60,
      nodeY: this.height - 60,

      // 2. BASE IMAGE (carrot-base.png)
      baseX: 0,                  // Local X position
      baseY: this.height - 90,  // Local Y position
      baseWidth: 100,            // Scaled render width
      baseHeight: 90,           // Scaled render height

      // 3. CARROT TOPS (carrot-1.png -> carrot-5.png)
      topLength: 60,             // Render length of the carrot top
      topWidth: 36,              // Render thickness of the carrot top
      topPivotOffset: 50,        // Pixel distance from anchor to where the top graphic starts
      topOffsetY: 0,             // Fine-tune vertical offset along rotation axis

      // 4. INTERACTION DETECTOR
      hubRadius: 26              // Hover and click radius
    };

    // Physics constants
    this.gravity = 0.55;           
    this.bounce = 0.65;            
    this.friction = 0.98;          

    // Juice Effects State
    this.screenShake = 0;
    this.shockwaves = [];
    this.flyingTops = [];
    this.particles = [];
    this.isHubHovered = false;

    // Instantiate 5 carrots fanned from left-most to right-most
    this.carrots = [];
    const leftMostAngle = -80 * Math.PI / 180;
    const rightMostAngle = -10 * Math.PI / 180;
    
    for (let i = 0; i < 5; i++) {
      const angle = leftMostAngle + (rightMostAngle - leftMostAngle) * (i / 4);
      const topAssetKey = `top${i + 1}`;
      
      this.carrots.push({ 
        angle: angle, 
        isCut: false,
        topAsset: topAssetKey,
        index: i
      });
    }
  }

  /**
   * Safely retrieves preloaded assets from a decoupled global AssetManager.
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
   * Cut the next available carrot
   */
  cut() {
    const targetIdx = this.carrots.findIndex(c => !c.isCut);
    if (targetIdx === -1) return; 

    const carrot = this.carrots[targetIdx];
    carrot.isCut = true;

    this.screenShake = 16;

    // Synchronize physics cut point directly to the configured top layout offsets
    const midX = this.layout.nodeX + Math.cos(carrot.angle) * this.layout.topPivotOffset;
    const midY = this.layout.nodeY + Math.sin(carrot.angle) * this.layout.topPivotOffset;

    this.shockwaves.push({
      x: midX,
      y: midY,
      radius: 4,
      maxRadius: 80,
      alpha: 1.0
    });

    const spawnDist = this.layout.topPivotOffset + this.layout.topLength / 2;
    const spawnX = this.layout.nodeX + Math.cos(carrot.angle) * spawnDist;
    const spawnY = this.layout.nodeY + Math.sin(carrot.angle) * spawnDist;

    const vx = 1.5 + Math.random() * 4.5;
    const vy = -18 - Math.random() * 7;

    this.flyingTops.push({
      x: spawnX,
      y: spawnY,
      vx: vx,
      vy: vy,
      angle: carrot.angle,
      va: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3),
      r: this.layout.topWidth / 2, 
      length: this.layout.topLength,
      topAsset: carrot.topAsset, 
      index: carrot.index
    });

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

  reset() {
    this.carrots.forEach(c => c.isCut = false);
    this.flyingTops = [];
    this.particles = [];
    this.shockwaves = [];
    this.screenShake = 0;
  }

  resize(width, height) {
    const deltaY = height - this.height;
    this.width = width;
    this.height = height;
    
    // Smoothly shift vertical positions so user alignments don't break during resizing
    this.layout.nodeY += deltaY;
    this.layout.baseY += deltaY;
  }

  handleMouseMove(localX, localY) {
    const dx = localX - this.layout.nodeX;
    const dy = localY - this.layout.nodeY;
    const distance = Math.hypot(dx, dy);
    this.isHubHovered = distance <= this.layout.hubRadius;
  }

  handleMouseClick(localX, localY) {
    if (localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height) {
      const dx = localX - this.layout.nodeX;
      const dy = localY - this.layout.nodeY;
      const clickedHub = Math.hypot(dx, dy) <= this.layout.hubRadius;
      
      if (clickedHub || localY < this.height) {
        this.cut();
      }
    }
  }

  update(dt = 1) {
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.86, dt);
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * (1 - Math.pow(1 - 0.18, dt));
      s.alpha -= 0.05 * dt;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    for (let top of this.flyingTops) {
      top.vy += this.gravity * dt;
      top.x += top.vx * dt;
      top.y += top.vy * dt;
      top.angle += top.va * dt;

      if (top.y < top.r) {
        top.y = top.r;
        top.vy = -top.vy * this.bounce;
        top.va *= -0.8; 
      }

      if (top.y > this.height - top.r) {
        top.y = this.height - top.r;
        top.vy = -top.vy * this.bounce;
        top.vx *= Math.pow(this.friction, dt);
        top.va *= Math.pow(0.88, dt);

        if (Math.abs(top.vy) < 0.3) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
      }

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
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.55 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
      p.alpha -= p.decay * dt;

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

  draw(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    const imgBase = this.getAsset('base');

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

    // 2. Draw Combined Non-Moving Base Graphic (with custom scale and positioning parameters)
    if (imgBase) {
      ctx.drawImage(imgBase, this.layout.baseX, this.layout.baseY, this.layout.baseWidth, this.layout.baseHeight);
    } else {
      // Procedural Fallback bottom hubs
      this.carrots.forEach((carrot) => {
        ctx.save();
        ctx.translate(this.layout.nodeX, this.layout.nodeY);
        ctx.rotate(carrot.angle);

        ctx.fillStyle = '#ff6b00';
        ctx.beginPath();
        ctx.moveTo(0, -this.layout.topWidth / 2);
        ctx.lineTo(this.layout.topPivotOffset, -this.layout.topWidth * 0.45);
        ctx.lineTo(this.layout.topPivotOffset, this.layout.topWidth * 0.45);
        ctx.lineTo(0, this.layout.topWidth / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#e65c00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.layout.topPivotOffset * 0.4, -this.layout.topWidth * 0.4);
        ctx.lineTo(this.layout.topPivotOffset * 0.4, this.layout.topWidth * 0.4);
        ctx.stroke();
        ctx.restore();
      });

      // Procedural Hub Center Fallback
      ctx.save();
      ctx.fillStyle = this.isHubHovered ? '#34495e' : '#2c3e50';
      ctx.beginPath();
      ctx.arc(this.layout.nodeX, this.layout.nodeY, this.layout.hubRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.isHubHovered ? '#f39c12' : '#bdc3c7';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Static Tops (Aligned dynamically via topPivotOffset and topOffsetY)
    this.carrots.forEach((carrot) => {
      if (!carrot.isCut) {
        ctx.save();
        ctx.translate(this.layout.nodeX, this.layout.nodeY);
        ctx.rotate(carrot.angle);

        const imgTop = this.getAsset(carrot.topAsset);

        if (imgTop) {
          ctx.drawImage(
            imgTop, 
            this.layout.topPivotOffset, 
            -this.layout.topWidth / 2 + this.layout.topOffsetY, 
            this.layout.topLength, 
            this.layout.topWidth
          );
        } else {
          // Procedural Fallback
          ctx.fillStyle = `hsl(${14 + carrot.index * 3}, 100%, 48%)`;
          ctx.beginPath();
          ctx.moveTo(this.layout.topPivotOffset, -this.layout.topWidth * 0.45);
          ctx.lineTo(this.layout.topPivotOffset + this.layout.topLength - 12, -this.layout.topWidth * 0.25);
          ctx.lineTo(this.layout.topPivotOffset + this.layout.topLength, 0);
          ctx.lineTo(this.layout.topPivotOffset + this.layout.topLength - 12, this.layout.topWidth * 0.25);
          ctx.lineTo(this.layout.topPivotOffset, this.layout.topWidth * 0.45);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#27ae60';
          ctx.beginPath();
          ctx.arc(this.layout.topPivotOffset + this.layout.topLength + 3, -5, 7, 0, Math.PI * 2);
          ctx.arc(this.layout.topPivotOffset + this.layout.topLength + 5, 5, 6, 0, Math.PI * 2);
          ctx.arc(this.layout.topPivotOffset + this.layout.topLength, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // 4. Draw Flying Cut Tops (Maintains visual continuity during separation physics)
    this.flyingTops.forEach((top) => {
      ctx.save();
      ctx.translate(top.x, top.y);
      ctx.rotate(top.angle);

      const drawX = -top.length / 2;
      const drawY = -this.layout.topWidth / 2 + this.layout.topOffsetY;
      const imgTop = this.getAsset(top.topAsset);

      if (imgTop) {
        ctx.drawImage(imgTop, drawX, drawY, top.length, this.layout.topWidth);
      } else {
        // Fallback
        ctx.fillStyle = `hsl(${14 + top.index * 3}, 100%, 48%)`;
        ctx.beginPath();
        ctx.moveTo(drawX, -this.layout.topWidth * 0.45);
        ctx.lineTo(top.length / 2 - 12, -this.layout.topWidth * 0.25);
        ctx.lineTo(top.length / 2, 0);
        ctx.lineTo(top.length / 2 - 12, this.layout.topWidth * 0.25);
        ctx.lineTo(drawX, this.layout.topWidth * 0.45);
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

    // 5. Draw Splash Particles
    this.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    // 6. Draw Interactive hover glow ring
    if (this.isHubHovered) {
      ctx.save();
      ctx.strokeStyle = 'rgba(230, 126, 34, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.layout.nodeX, this.layout.nodeY, this.layout.hubRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); 
  }
}