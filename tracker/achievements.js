/**
 * Particle class handles canvas-based celebration effects relative to local component space.
 */
class Particle {
  constructor(x, y, emoji) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.size = Math.random() * 15 + 15; 
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 200 + 150; // Pixels per second
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 100; 
    
    this.alpha = 1;
    this.decay = Math.random() * 0.6 + 0.4; // Alpha decay per second
    this.gravity = 400; // Pixels per second squared
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 5;
  }

  update(dt) {
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.alpha -= this.decay * dt;
    this.rotation += this.rotSpeed * dt;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.size}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

/**
 * Game Achievement System Component
 * Bounded, modular UI component completely rendered via Canvas.
 */
class AchievementSystem {
  constructor(config = {}) {
    this.width = config.width || 600;
    this.height = config.height || 450;

    this.rawAchievements = [
      'made it - survive the game - madeit.webp - MUSCLE ARM',
      'friends - all your friends survive - friends.webp - HEART',
      'champion - defeat the final boss without taking damage - champion.png - TROPHY',
      'speedrunner - finish the first act in under 5 minutes - speed.png - FIRE'
    ];

    this.emojiMap = {
      'MUSCLE ARM': '💪',
      'HEART': '❤️',
      'TROPHY': '🏆',
      'FIRE': '🔥',
      'STAR': '⭐'
    };

    this.achievements = [];
    this.particles = [];
    this.isOpen = false;
    this.selectedAchievement = null;
    
    // Interactive Layout State tracking
    this.hitboxes = [];
    this.mouseLocalX = 0;
    this.mouseLocalY = 0;
    
    // Juicy Spring/Lerp Values
    this.catalogTransition = 0; // Toggles catalog open/close view states smoothly
    this.modalTransition = 0;   // Zoom scaling for the modal card view
    this.toastTimer = 0;
    this.activeToast = null;
    this.toastYOffset = 100;    // Slide-up animation tracking

    this.initAchievements();
    this.loadState();
  }

  initAchievements() {
    this.achievements = this.rawAchievements.map(rawStr => {
      const parts = rawStr.split('-').map(item => item.trim());
      const [title, desc, imageName, emojiKey] = parts;
      
      return {
        title: title,
        desc: desc,
        imageName: imageName,
        emoji: this.emojiMap[emojiKey.toUpperCase()] || emojiKey,
        unlocked: false,
        seen: false,
        scale: 1.0 // Individual card spring scale animation tracking
      };
    });
  }

  loadState() {
    const savedData = localStorage.getItem('game_achievements_state');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.achievements.forEach(ach => {
          if (parsed[ach.title]) {
            ach.unlocked = parsed[ach.title].unlocked;
            ach.seen = parsed[ach.title].seen;
          }
        });
      } catch (e) {
        console.error("Failed to parse loaded achievements data", e);
      }
    }
  }

  saveState() {
    const dataToSave = {};
    this.achievements.forEach(ach => {
      dataToSave[ach.title] = { unlocked: ach.unlocked, seen: ach.seen };
    });
    localStorage.setItem('game_achievements_state', JSON.stringify(dataToSave));
  }

  unlockAchievement(title) {
    const ach = this.achievements.find(a => a.title.toLowerCase() === title.toLowerCase());
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.seen = false; 
      this.saveState();
      this.triggerToast(ach);
    }
  }

  triggerToast(ach) {
    this.activeToast = ach;
    this.toastTimer = 4.0; // Show toast for 4 seconds
    this.toastYOffset = 100; // Slide-up starting offset
  }

  openCatalog() {
    this.isOpen = true;
    setTimeout(() => this.celebrateNewUnlocks(), 200);
  }

  closeCatalog() {
    this.isOpen = false;
    this.selectedAchievement = null;
  }

  celebrateNewUnlocks() {
    let triggeredAny = false;
    // Find centers of cards matching unseen unlocks to burst particles locally
    this.achievements.forEach(ach => {
      if (ach.unlocked && !ach.seen) {
        // Center particles roughly inside the viewport bounding box
        this.spawnParticles(this.width / 2, this.height / 2, ach.emoji, 25);
        ach.seen = true;
        triggeredAny = true;
      }
    });
    if (triggeredAny) this.saveState();
  }

  spawnParticles(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, emoji));
    }
  }

  clearProgress() {
    localStorage.removeItem('game_achievements_state');
    this.initAchievements();
    this.selectedAchievement = null;
  }

  /**
   * Component Input Engine Hook (MouseMove Interaction Handler)
   */
  handleMouseMove(localX, localY) {
    this.mouseLocalX = localX;
    this.mouseLocalY = localY;
  }

  /**
   * Component Input Engine Hook (Click Interaction Handler)
   */
  handleMouseClick(localX, localY) {
    // Intercept hitboxes in reverse order (drawn on top down processing)
    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const box = this.hitboxes[i];
      if (
        localX >= box.x && localX <= box.x + box.w &&
        localY >= box.y && localY <= box.y + box.h
      ) {
        box.callback();
        return true; // Click intercepted successfully
      }
    }
    return false;
  }

  /**
   * Decoupled Update Engine Tick Interface handling physics timers, springs, and animations.
   */
  update(dt) {
    // 1. Particle Logic updates
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.alpha > 0);

    // 2. Smooth Linear and Spring UI Transitions
    const targetCatalog = this.isOpen ? 1 : 0;
    this.catalogTransition += (targetCatalog - this.catalogTransition) * 12 * dt;

    const targetModal = this.selectedAchievement ? 1 : 0;
    this.modalTransition += (targetModal - this.modalTransition) * 14 * dt;

    // 3. Toast Notifications Display Lifecycle update handling
    if (this.activeToast) {
      this.toastTimer -= dt;
      if (this.toastTimer > 3.5) {
        // Sliding Up
        this.toastYOffset += (0 - this.toastYOffset) * 15 * dt;
      } else if (this.toastTimer <= 0) {
        this.activeToast = null;
      } else if (this.toastTimer < 0.5) {
        // Sliding Down
        this.toastYOffset += (120 - this.toastYOffset) * 15 * dt;
      }
    }

    // 4. Update Grid Hover Scales
    this.hitboxes.forEach(box => {
      if (box.type === 'card') {
        const ach = this.achievements[box.index];
        const isHovered = (
          this.mouseLocalX >= box.x && this.mouseLocalX <= box.x + box.w &&
          this.mouseLocalY >= box.y && this.mouseLocalY <= box.y + box.h
        );
        const targetScale = isHovered && ach.unlocked ? 1.06 : 1.0;
        ach.scale += (targetScale - ach.scale) * 15 * dt;
      }
    });
  }

  /**
   * Bounded Modular Layout Drawing Strategy
   */
  draw(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Enforce strict canvas boundary clipping constraints
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    // Reset hitboxes layer pass
    this.hitboxes = [];

    if (this.catalogTransition < 0.01) {
      this.drawDashboardView(ctx);
    } else {
      this.drawCatalogOverlayView(ctx);
    }

    // Always overlay system toasts on top layers
    this.drawToastLayer(ctx);

    // Draw active localized explosion particles 
    this.particles.forEach(p => p.draw(ctx));

    ctx.restore();
  }

  /**
   * Renders a dashboard preview inside its localized flex container block
   */
  drawDashboardView(ctx) {
    // Box Layout Background Shell
    ctx.fillStyle = '#252529';
    ctx.strokeStyle = '#4e4e50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width, this.height, 12);
    ctx.fill();
    ctx.stroke();

    // Text Headers
    ctx.fillStyle = '#e5c158';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 Achievements Dashboard', this.width / 2, 50);

    const unlockedCount = this.achievements.filter(a => a.unlocked).length;
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Progress Unlocked: ${unlockedCount} / ${this.achievements.length}`, this.width / 2, 95);

    // Compact dynamic standard completion meter bar
    const barW = this.width * 0.6;
    const barH = 16;
    const barX = (this.width - barW) / 2;
    const barY = 120;

    ctx.fillStyle = '#1c1c1f';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();

    const progressRatio = unlockedCount / this.achievements.length;
    if (progressRatio > 0) {
      ctx.fillStyle = '#e5c158';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progressRatio, barH, 8);
      ctx.fill();
    }

    // View Catalog Action Canvas Button Link Setup
    const btnW = 200;
    const btnH = 45;
    const btnX = (this.width - btnW) / 2;
    const btnY = this.height - 80;

    const isHovered = (this.mouseLocalX >= btnX && this.mouseLocalX <= btnX + btnW && this.mouseLocalY >= btnY && this.mouseLocalY <= btnY + btnH);
    ctx.fillStyle = isHovered ? '#f3d375' : '#e5c158';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('View Achievements', this.width / 2, btnY + 27);

    this.hitboxes.push({
      x: btnX, y: btnY, w: btnW, h: btnH,
      type: 'button',
      callback: () => this.openCatalog()
    });
  }

  /**
   * Renders the interactive catalog grid layout 
   */
  drawCatalogOverlayView(ctx) {
    ctx.fillStyle = 'rgba(15, 15, 18, ' + Math.min(this.catalogTransition, 0.97) + ')';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    // Smooth Scale Window Pop-In Effect
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.catalogTransition, this.catalogTransition);
    ctx.translate(-this.width / 2, -this.height / 2);

    // Render Canvas Catalog Header Area
    ctx.fillStyle = '#e5c158';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Achievements', 30, 45);

    // Compact layout close symbol 'X' icon
    const closeX = this.width - 55;
    const closeY = 25;
    const closeW = 30;
    const closeH = 30;
    const closeHover = (this.mouseLocalX >= closeX && this.mouseLocalX <= closeX + closeW && this.mouseLocalY >= closeY && this.mouseLocalY <= closeY + closeH);
    
    ctx.fillStyle = closeHover ? '#e5c158' : '#888888';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('×', closeX, closeY + 24);
    
    this.hitboxes.push({
      x: closeX, y: closeY, w: closeW, h: closeH,
      type: 'close',
      callback: () => this.closeCatalog()
    });

    // Sub-render grid structure algorithm configurations
    const startGridY = 80;
    const cardW = 110;
    const cardH = 110;
    const gap = 20;
    const cols = Math.floor((this.width - 40) / (cardW + gap));
    const startGridX = (this.width - (cols * cardW + (cols - 1) * gap)) / 2;

    this.achievements.forEach((ach, index) => {
      const r = Math.floor(index / cols);
      const c = index % cols;
      const cardX = startGridX + c * (cardW + gap);
      const cardY = startGridY + r * (cardH + gap);

      ctx.save();
      // Apply juice hover scaling mechanics matrices
      ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
      ctx.scale(ach.scale, ach.scale);
      ctx.translate(-(cardX + cardW / 2), -(cardY + cardH / 2));

      // Draw Base Card Frame Bounds
      ctx.fillStyle = '#252529';
      ctx.strokeStyle = ach.unlocked ? '#4e4e50' : '#323235';
      ctx.lineWidth = 2;
      ctx.globalAlpha = ach.unlocked ? 1.0 : 0.4;
      
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();

      // Inside Card Graphic Center Elements
      if (ach.unlocked) {
        // Fallback Vector Rendering via global dynamic image layout managers
        let img = null;
        try {
          if (typeof AssetManager !== 'undefined') img = AssetManager.get(ach.imageName);
        } catch(e){}

        if (img && img.complete) {
          ctx.drawImage(img, cardX + 25, cardY + 15, 60, 60);
        } else {
          ctx.font = '36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ach.emoji, cardX + cardW / 2, cardY + cardH / 2 - 10);
        }

        // Draw card description title context text lines
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        let displayTitle = ach.title;
        if (ctx.measureText(displayTitle).width > cardW - 10) {
          displayTitle = displayTitle.substring(0, 12) + '...';
        }
        ctx.fillText(displayTitle, cardX + cardW / 2, cardY + cardH - 18);
      } else {
        ctx.fillStyle = '#666666';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❓', cardX + cardW / 2, cardY + cardH / 2 - 8);

        ctx.fillStyle = '#666666';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('???', cardX + cardW / 2, cardY + cardH - 18);
      }

      ctx.restore();

      // Register card bounds layout interactive hitboxes mapping
      this.hitboxes.push({
        x: cardX, y: cardY, w: cardW, h: cardH,
        type: 'card',
        index: index,
        callback: () => {
          if (ach.unlocked) {
            this.selectedAchievement = ach;
            this.spawnParticles(this.width / 2, this.height / 2, ach.emoji, 40);
          }
        }
      });
    });

    // Detail Modal Modal Window Overlays Render Channel pass
    if (this.modalTransition > 0.01) {
      this.drawModalOverlayPass(ctx);
    }

    ctx.restore();
  }

  /**
   * Dynamic Modal Canvas Rendering Window Layer Pass
   */
  drawModalOverlayPass(ctx) {
    if (!this.selectedAchievement) return;
    const ach = this.selectedAchievement;

    ctx.fillStyle = 'rgba(10, 10, 12, ' + (0.95 * this.modalTransition) + ')';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(this.modalTransition, this.modalTransition);
    ctx.translate(-this.width / 2, -this.height / 2);

    const mW = Math.min(this.width * 0.85, 450);
    const mH = 240;
    const mX = (this.width - mW) / 2;
    const mY = (this.height - mH) / 2;

    ctx.fillStyle = '#1c1c1f';
    ctx.strokeStyle = '#e5c158';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, 16);
    ctx.fill();
    ctx.stroke();

    // Large Achievement Graphic Preview Contexts
    ctx.font = '64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ach.emoji, mX + 75, mY + mH / 2 - 20);

    // Text Core Context Metadata Titles Info
    ctx.fillStyle = '#e5c158';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ach.title, mX + 150, mY + 60);

    ctx.fillStyle = '#bbbbbb';
    ctx.font = '14px sans-serif';
    this.wrapText(ctx, ach.desc, mX + 150, mY + 95, mW - 180, 20);

    // Close Details Overlay Dynamic Box Links
    const cbtnW = 140;
    const cbtnH = 36;
    const cbtnX = mX + (mW - cbtnW) / 2;
    const cbtnY = mY + mH - 55;

    const isHover = (this.mouseLocalX >= cbtnX && this.mouseLocalX <= cbtnX + cbtnW && this.mouseLocalY >= cbtnY && this.mouseLocalY <= cbtnY + cbtnH);
    ctx.fillStyle = isHover ? '#f3d375' : '#e5c158';
    ctx.beginPath();
    ctx.roundRect(cbtnX, cbtnY, cbtnW, cbtnH, 8);
    ctx.fill();

    ctx.fillStyle = '#111111';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Close Details', cbtnX + cbtnW / 2, cbtnY + 22);

    this.hitboxes.push({
      x: cbtnX, y: cbtnY, w: cbtnW, h: cbtnH,
      type: 'modal-close',
      callback: () => { this.selectedAchievement = null; }
    });

    ctx.restore();
  }

  /**
   * Context Toast overlay render processing paths
   */
  drawToastLayer(ctx) {
    if (!this.activeToast) return;
    const ach = this.activeToast;

    const tW = 260;
    const tH = 65;
    const tX = this.width - tW - 20;
    const tY = this.height - tH - 20 + this.toastYOffset;

    ctx.fillStyle = '#1c1c1f';
    ctx.strokeStyle = '#e5c158';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tX, tY, tW, tH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ach.emoji, tX + 35, tY + tH / 2);

    ctx.fillStyle = '#e5c158';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ACHIEVEMENT UNLOCKED!', tX + 70, tY + 25);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(ach.title, tX + 70, tY + 45);
  }

  /**
   * Core Helper Utility Routine for Canvas Wrapping Strings Text
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
}