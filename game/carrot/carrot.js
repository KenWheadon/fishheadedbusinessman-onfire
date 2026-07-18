class CarrotCutter {
  constructor({ width = 800, height = 600, align = 'left' } = {}) {
    this.width = width;
    this.height = height;
    this.align = align;

    this.layout = {
      nodeX: 60,
      nodeY: this.height - 60,
      baseX: 0,
      baseY: this.height - 90,
      baseWidth: 100,
      baseHeight: 90,
      topLength: 60,
      tops: [
        { angleDeg: 20.0, pivotOffset: -37, offsetY: -30, scale: 0.5 },
        { angleDeg: 0, pivotOffset: 11, offsetY: -48, scale: 1.0 },
        { angleDeg: -12.0, pivotOffset: 23, offsetY: -20, scale: 1.35 },
        { angleDeg: -12.5, pivotOffset: 32, offsetY: 1, scale: 1.2 },
        { angleDeg: -12.5, pivotOffset: 26, offsetY: 22, scale: 1.15 }
      ],
      hubRadius: 26
    };

    this.gravity = 0.55; this.bounce = 0.65; this.friction = 0.98;
    this.screenShake = 0; this.shockwaves = []; this.flyingTops = []; this.particles = [];
    this.isHubHovered = false; this.isLocked = true; this.hoveredCarrotIndex = -1;

    this.carrots = [];
    for (let i = 0; i < 5; i++) {
      const config = this.layout.tops[i];
      this.carrots.push({
        angle: (config.angleDeg * Math.PI) / 180,
        isCut: false,
        topAsset: `top${i + 1}`,
        index: i
      });
    }
  }

  /**
   * Safe size sync engine that prevents scaling accumulations[cite: 8].
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  getAsset(key) {
    if (typeof AssetManager !== 'undefined' && typeof AssetManager.get === 'function') {
      const asset = AssetManager.get(key);
      if (asset && asset.complete) return asset;
    }
    return null;
  }

  checkCut() { return this.carrots.filter(c => !c.isCut).length; }
  unlock() { this.isLocked = false; }

  cut(targetIdx) {
    if (this.isLocked) return;
    if (targetIdx === undefined || targetIdx < 0 || targetIdx >= this.carrots.length) return;

    const carrot = this.carrots[targetIdx];
    if (carrot.isCut) return;

    carrot.isCut = true;
    this.isLocked = true;
    this.hoveredCarrotIndex = -1;
    this.screenShake = 16;

    const config = this.layout.tops[carrot.index];
    const angle = (config.angleDeg * Math.PI) / 180;
    const imgTop = this.getAsset(carrot.topAsset);
    let aspect = 1.667;
    if (imgTop && imgTop.naturalWidth) aspect = imgTop.naturalWidth / imgTop.naturalHeight;

    const length = this.layout.topLength * config.scale;
    const width = length / aspect;
    const midX = this.layout.nodeX + Math.cos(angle) * config.pivotOffset;
    const midY = this.layout.nodeY + Math.sin(angle) * config.pivotOffset;

    this.shockwaves.push({ x: midX, y: midY, radius: 4, maxRadius: 80, alpha: 1.0 });

    const spawnDist = config.pivotOffset + length / 2;
    const spawnX = this.layout.nodeX + Math.cos(angle) * spawnDist;
    const spawnY = this.layout.nodeY + Math.sin(angle) * spawnDist;

    this.flyingTops.push({
      x: spawnX, y: spawnY, vx: 1.5 + Math.random() * 4.5, vy: -18 - Math.random() * 7,
      angle: angle, va: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3),
      r: width / 2, length: length, width: width, offsetY: config.offsetY,
      topAsset: carrot.topAsset, index: carrot.index, age: 0, scaleX: 1.0, scaleY: 1.0,
      isSettled: false, settleSlideX: 0
    });

    for (let i = 0; i < 40; i++) {
      const pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.0;
      const pSpeed = 7 + Math.random() * 12;
      this.particles.push({
        x: midX, y: midY, vx: Math.cos(pAngle) * pSpeed + (Math.random() - 0.5) * 2,
        vy: Math.sin(pAngle) * pSpeed - (4 + Math.random() * 5), size: 4 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2, vRot: (Math.random() - 0.5) * 0.6,
        color: `hsl(${14 + Math.random() * 14}, 100%, ${46 + Math.random() * 14}%)`,
        alpha: 1.0, decay: 0.01 + Math.random() * 0.01
      });
    }
  }

  reset() {
    this.carrots.forEach(c => c.isCut = false);
    this.flyingTops = []; this.particles = []; this.shockwaves = [];
    this.screenShake = 0; this.isLocked = true; this.hoveredCarrotIndex = -1;
  }

  handleMouseMove(localX, localY) {
    if (this.align === 'right') localX = this.width - localX;
    if (this.isLocked) {
      this.isHubHovered = false; this.hoveredCarrotIndex = -1;
      return;
    }

    const dx = localX - this.layout.nodeX;
    const dy = localY - this.layout.nodeY;
    this.isHubHovered = Math.hypot(dx, dy) <= this.layout.hubRadius;
    this.hoveredCarrotIndex = -1;

    for (let i = 0; i < this.carrots.length; i++) {
      const carrot = this.carrots[i];
      if (carrot.isCut) continue;

      const config = this.layout.tops[carrot.index];
      const angle = (config.angleDeg * Math.PI) / 2;
      const cosVal = Math.cos(-angle), sinVal = Math.sin(-angle);
      const rx = dx * cosVal - dy * sinVal, ry = dx * sinVal + dy * cosVal;

      const imgTop = this.getAsset(carrot.topAsset);
      let aspect = 1.667;
      if (imgTop && imgTop.naturalWidth) aspect = imgTop.naturalWidth / imgTop.naturalHeight;
      const length = this.layout.topLength * config.scale, width = length / aspect;

      if (rx >= config.pivotOffset && rx <= config.pivotOffset + length &&
        ry >= -width / 2 + config.offsetY && ry <= width / 2 + config.offsetY) {
        this.hoveredCarrotIndex = i;
        break;
      }
    }
  }

  handleMouseClick(localX, localY) {
    if (this.align === 'right') localX = this.width - localX;
    if (this.isLocked) return;

    if (localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height) {
      for (let i = 0; i < this.carrots.length; i++) {
        const carrot = this.carrots[i];
        if (carrot.isCut) continue;

        const config = this.layout.tops[carrot.index];
        const angle = (config.angleDeg * Math.PI) / 180;
        const dx = localX - this.layout.nodeX, dy = localY - this.layout.nodeY;
        const cosVal = Math.cos(-angle), sinVal = Math.sin(-angle);
        const rx = dx * cosVal - dy * sinVal, ry = dx * sinVal + dy * cosVal;

        const imgTop = this.getAsset(carrot.topAsset);
        let aspect = 1.667;
        if (imgTop && imgTop.naturalWidth) aspect = imgTop.naturalWidth / imgTop.naturalHeight;
        const length = this.layout.topLength * config.scale, width = length / aspect;

        if (rx >= config.pivotOffset && rx <= config.pivotOffset + length &&
          ry >= -width / 2 + config.offsetY && ry <= width / 2 + config.offsetY) {
          this.cut(i);
          break;
        }
      }
    }
  }

  update(dt = 1) {
    if (dt < 0.5) dt *= 60;
    if (this.screenShake > 0) {
      this.screenShake *= Math.pow(0.86, dt);
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * (1 - Math.pow(1 - 0.18, dt));
      s.alpha -= 0.05 * dt;
      if (s.alpha <= 0) this.shockwaves.splice(i, 1);
    }

    for (let top of this.flyingTops) {
      top.age += dt;
      top.scaleX += (1.0 - top.scaleX) * (1 - Math.pow(0.82, dt));
      top.scaleY += (1.0 - top.scaleY) * (1 - Math.pow(0.82, dt));

      if (top.age > 30) top.offsetY += (0 - top.offsetY) * (1 - Math.pow(0.88, dt));

      if (top.isSettled) {
        const targetAngle = Math.round(top.angle / Math.PI) * Math.PI;
        top.angle += (targetAngle - top.angle) * (1 - Math.pow(0.82, dt));
        top.offsetY += (0 - top.offsetY) * (1 - Math.pow(0.80, dt));

        if (top.settleSlideX !== 0) {
          top.x += top.settleSlideX * dt; top.settleSlideX *= Math.pow(0.85, dt);
          if (Math.abs(top.settleSlideX) < 0.05) top.settleSlideX = 0;
        }

        const targetY = this.height - (top.width / 2) * top.scaleY;
        top.y += (targetY - top.y) * (1 - Math.pow(0.80, dt));

        if (top.x < top.r) top.x = top.r;
        if (top.x > this.width - top.r) top.x = this.width - top.r;
        continue;
      }

      if (top.age > 60) {
        const dragFactor = Math.pow(0.92, dt);
        top.vx *= dragFactor; top.vy *= dragFactor; top.va *= dragFactor;

        if (top.y > this.height - top.r - 8 && Math.abs(top.vy) < 1.8 && Math.abs(top.vx) < 1.8) {
          top.isSettled = true; top.settleSlideX = top.vx * 0.8;
          top.vy = 0; top.vx = 0; top.va = 0;
          continue;
        }
      }

      top.vy += this.gravity * dt; top.x += top.vx * dt; top.y += top.vy * dt; top.angle += top.va * dt;

      if (top.y < top.r) {
        const impactY = Math.abs(top.vy); top.y = top.r; top.vy = -top.vy * this.bounce; top.va *= -0.8;
        if (impactY > 1) {
          const intensity = Math.min(0.4, impactY * 0.025); top.scaleY = 1.0 - intensity; top.scaleX = 1.0 + intensity;
        }
      }
      if (top.y > this.height - top.r) {
        const impactY = Math.abs(top.vy); top.y = this.height - top.r; top.vy = -top.vy * this.bounce;
        top.vx *= Math.pow(this.friction, dt); top.va *= Math.pow(0.88, dt);
        if (Math.abs(top.vy) < 0.3) top.vy = 0;
        if (Math.abs(top.vx) < 0.1) top.vx = 0;
        if (impactY > 1) {
          const intensity = Math.min(0.4, impactY * 0.025); top.scaleY = 1.0 - intensity; top.scaleX = 1.0 + intensity;
        }
      }
      if (top.x < top.r) {
        const impactX = Math.abs(top.vx); top.x = top.r; top.vx = -top.vx * this.bounce; top.va = -top.va * this.bounce;
        if (impactX > 1) {
          const intensity = Math.min(0.4, impactX * 0.025); top.scaleX = 1.0 - intensity; top.scaleY = 1.0 + intensity;
        }
      }
      if (top.x > this.width - top.r) {
        const impactX = Math.abs(top.vx); top.x = this.width - top.r; top.vx = -top.vx * this.bounce; top.va = -top.va * this.bounce;
        if (impactX > 1) {
          const intensity = Math.min(0.4, impactX * 0.025); top.scaleX = 1.0 - intensity; top.scaleY = 1.0 + intensity;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity * 0.55 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rotation += p.vRot * dt; p.alpha -= p.decay * dt;
      if (p.y > this.height - p.size) { p.y = this.height - p.size; p.vy = -p.vy * 0.3; p.vx *= Math.pow(0.7, dt); }
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    if (this.align === 'right') { ctx.translate(this.width, 0); ctx.scale(-1, 1); }

    const imgBase = this.getAsset('base');
    if (this.screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * (this.screenShake * 0.4), (Math.random() - 0.5) * this.screenShake);
    }

    this.shockwaves.forEach((s) => {
      ctx.save(); ctx.globalAlpha = s.alpha; ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    });

    if (imgBase) {
      ctx.drawImage(imgBase, this.layout.baseX, this.layout.baseY, this.layout.baseWidth, this.layout.baseHeight);
    } else {
      this.carrots.forEach((carrot) => {
        ctx.save(); ctx.translate(this.layout.nodeX, this.layout.nodeY);
        const config = this.layout.tops[carrot.index];
        ctx.rotate((config.angleDeg * Math.PI) / 180);
        const aspect = 1.667, length = this.layout.topLength * config.scale, width = length / aspect;

        ctx.fillStyle = '#ff6b00'; ctx.beginPath(); ctx.moveTo(0, -width / 2);
        ctx.lineTo(config.pivotOffset, -width * 0.45); ctx.lineTo(config.pivotOffset, width * 0.45);
        ctx.lineTo(0, width / 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#e65c00'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(config.pivotOffset * 0.4, -width * 0.4); ctx.lineTo(config.pivotOffset * 0.4, width * 0.4); ctx.stroke();
        ctx.restore();
      });

      ctx.save(); ctx.fillStyle = this.isHubHovered ? '#34495e' : '#2c3e50';
      ctx.beginPath(); ctx.arc(this.layout.nodeX, this.layout.nodeY, this.layout.hubRadius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = this.isHubHovered ? '#f39c12' : '#bdc3c7'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    }

    this.carrots.forEach((carrot) => {
      if (!carrot.isCut) {
        ctx.save(); ctx.translate(this.layout.nodeX, this.layout.nodeY);
        const config = this.layout.tops[carrot.index];
        ctx.rotate((config.angleDeg * Math.PI) / 180);
        const imgTop = this.getAsset(carrot.topAsset);
        let aspect = 1.667;
        if (imgTop && imgTop.naturalWidth) aspect = imgTop.naturalWidth / imgTop.naturalHeight;
        const length = this.layout.topLength * config.scale, width = length / aspect;

        if (this.hoveredCarrotIndex === carrot.index) { ctx.shadowColor = 'rgba(46, 204, 113, 0.95)'; ctx.shadowBlur = 18; }

        if (imgTop) {
          ctx.drawImage(imgTop, config.pivotOffset, -width / 2 + config.offsetY, length, width);
        } else {
          ctx.fillStyle = `hsl(${14 + carrot.index * 3}, 100%, 48%)`; ctx.beginPath();
          ctx.moveTo(config.pivotOffset, -width * 0.45); ctx.lineTo(config.pivotOffset + length - 12, -width * 0.25);
          ctx.lineTo(config.pivotOffset + length, 0); ctx.lineTo(config.pivotOffset + length - 12, width * 0.25);
          ctx.lineTo(config.pivotOffset, width * 0.45); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#27ae60'; ctx.beginPath();
          ctx.arc(config.pivotOffset + length + 3, -5, 7, 0, Math.PI * 2);
          ctx.arc(config.pivotOffset + length + 5, 5, 6, 0, Math.PI * 2);
          ctx.arc(config.pivotOffset + length, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    });

    this.flyingTops.forEach((top) => {
      ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(top.angle); ctx.scale(top.scaleX, top.scaleY);
      const drawX = -top.length / 2, drawY = -top.width / 2 + top.offsetY, imgTop = this.getAsset(top.topAsset);
      if (imgTop) {
        ctx.drawImage(imgTop, drawX, drawY, top.length, top.width);
      } else {
        ctx.fillStyle = `hsl(${14 + top.index * 3}, 100%, 48%)`; ctx.beginPath();
        ctx.moveTo(drawX, -top.width * 0.45); ctx.lineTo(top.length / 2 - 12, -top.width * 0.25);
        ctx.lineTo(top.length / 2, 0); ctx.lineTo(top.length / 2 - 12, top.width * 0.25);
        ctx.lineTo(drawX, top.width * 0.45); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#27ae60'; ctx.beginPath();
        ctx.arc(top.length / 2 + 3, -5, 7, 0, Math.PI * 2); ctx.arc(top.length / 2 + 5, 5, 6, 0, Math.PI * 2);
        ctx.arc(top.length / 2, 0, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    });

    this.particles.forEach((p) => {
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
    });

    if (this.isHubHovered) {
      ctx.save(); ctx.strokeStyle = 'rgba(230, 126, 34, 0.6)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(this.layout.nodeX, this.layout.nodeY, this.layout.hubRadius + 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
}