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
 * Bounded, modular UI component completely rendered via Canvas with fluid responsiveness.
 */
class AchievementSystem {
  constructor(config = {}) {
    // Core layout dimensions passed from game loop
    this.width = config.width || 800;
    this.height = config.height || 600;
    this.scaleFactor = 1.0;

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

    // --- STATE PROPERTIES (With legacy backward compatibility variables) ---
    this.isVisible = false;
    this.isOpen = false;                 // GameManager relies on this to route events
    this.catalogTransition = 0;          // GameManager transition check
    this.modalTransition = 0;            // Modal tracking state
    this.selectedAchievement = null;

    this.dims = { w: 0, h: 0 };
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.hitboxes = { cards: [] };
    this.cursor = 'default';

    // Dragging & Swipe-Scroll States
    this.draggingScrollbar = false;
    this.draggingList = false;
    this.dragStartY = 0;
    this.dragStartScrollY = 0;
    this.scrollbarHovered = false;

    // Dynamic event listener reference to enable self-cleaning wheel hooks
    this._boundWheelHandler = null;

    // Physics & Animation State
    this.anim = {
      alpha: 0, targetAlpha: 0,
      scale: 0, targetScale: 0, scaleVel: 0,

      // Scroll Physics
      scrollY: 0, targetScrollY: 0, maxScroll: 0,

      // Interaction Hover Lerps for cards
      cardHovers: []
    };

    // Modal Spring Scaling State
    this.modalAnim = {
      scale: 0, targetScale: 0, scaleVel: 0
    };

    // 1. INSTANTIATE MODULAR BUTTONS
    this.backButton = new ArcadeButton({
      text: 'BACK TO MENU',
      themeColor: '#ff007f', // Hot Pink
      glowColor: '#ff00ff'
    });

    this.closeModalButton = new ArcadeButton({
      text: 'CLOSE DETAILS',
      themeColor: '#00f0ff', // Cyber Cyan
      glowColor: '#39ff14'  // Neon Green
    });

    this.closeButton = new CloseButton({ size: 24 });
    this.buttons = [this.backButton];

    this.cardSize = 110;
    this.cardGap = 20;

    this.initAchievements();
    this.loadState();
    this.resize(this.width, this.height);
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
        seen: false
      };
    });

    this.anim.cardHovers = Array(this.achievements.length).fill(0);
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
    this.toastTimer = 4.0;
    this.toastYOffset = 100;
  }

  // --- TRANSITION CONTROLS (With legacy open/close alias mapping) ---

  show() {
    this.isVisible = true;
    this.isOpen = true; // Sync for GameManager routing
    this.anim.targetAlpha = 1;
    this.anim.targetScale = 1;

    this._boundWheelHandler = this._onWindowWheel.bind(this);
    window.addEventListener('wheel', this._boundWheelHandler, { passive: false });

    // Clean celebrate trigger when entering the catalog
    setTimeout(() => this.celebrateNewUnlocks(), 200);
  }

  hide() {
    this.isVisible = false;
    this.isOpen = false; // Sync for GameManager routing
    this.anim.targetAlpha = 0;
    this.anim.targetScale = 0;
    this.draggingScrollbar = false;
    this.draggingList = false;
    this.selectedAchievement = null;
    this.modalAnim.targetScale = 0;

    if (this._boundWheelHandler) {
      window.removeEventListener('wheel', this._boundWheelHandler);
      this._boundWheelHandler = null;
    }
  }

  openCatalog() {
    this.show();
  }

  closeCatalog() {
    this.hide();
  }

  celebrateNewUnlocks() {
    let triggeredAny = false;
    this.achievements.forEach(ach => {
      if (ach.unlocked && !ach.seen) {
        // Explode celebration particles from the center of the popups space
        this.spawnParticles(0, 0, ach.emoji, 25);
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
    this.modalAnim.targetScale = 0;
  }

  /**
   * Adaptive Breakpoint Resize Engine
   */
  resize(width, height) {
    this.width = width;
    this.height = height;

    const baseScale = Math.min(width / 800, height / 600);
    this.scaleFactor = Math.min(Math.max(baseScale, 0.7), 1.2);

    if (width < 480) {
      // Mobile Layout (Compact cards, tighter grid gaps)
      this.dims.w = Math.min(width * 0.94, 340);
      this.dims.h = Math.min(height * 0.94, 520);
      this.cardSize = 85;
      this.cardGap = 12;
      this.isMobile = true;
    } else if (width < 768) {
      // Tablet Layout
      this.dims.w = 460 * this.scaleFactor;
      this.dims.h = 520 * this.scaleFactor;
      this.cardSize = 100;
      this.cardGap = 16;
      this.isMobile = false;
    } else {
      // Desktop Layout (Generous grid allocations)
      this.dims.w = 540 * this.scaleFactor;
      this.dims.h = 580 * this.scaleFactor;
      this.cardSize = 110;
      this.cardGap = 20;
      this.isMobile = false;
    }

    this.dims.w = Math.max(300, Math.min(680, this.dims.w));
    this.dims.h = Math.max(440, Math.min(720, this.dims.h));

    this.recalculateScrollBounds();
  }

  recalculateScrollBounds() {
    const bw = this.dims.w;
    const bh = this.dims.h;

    // Viewport layout divisions (room for header & bottom actions)
    this.contentY = -bh / 2 + 105;
    this.clipHeight = bh - 215;
    this.listWidth = bw - 44;
    this.listX = -this.listWidth / 2;

    // Fluid Columns Grid Calculation
    this.cols = Math.max(2, Math.floor((this.listWidth + this.cardGap) / (this.cardSize + this.cardGap)));
    const gridWidth = this.cols * this.cardSize + (this.cols - 1) * this.cardGap;
    this.gridStartX = -gridWidth / 2;

    const rows = Math.ceil(this.achievements.length / this.cols);
    const contentHeight = rows * this.cardSize + (rows - 1) * this.cardGap;

    this.anim.maxScroll = Math.max(0, contentHeight - this.clipHeight + 10);
    this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));

    // Dynamic Back button positioning
    const btnW = bw * 0.82;
    const btnH = this.isMobile ? 36 : 42 * this.scaleFactor;
    const btnY = bh / 2 - btnH - 12;
    this.backButton.setPosition(0, btnY, btnW, btnH, this.scaleFactor);

    // Dynamic Close button positioning
    this.closeButton.setPosition(bw / 2 - 22, -bh / 2 + 22, 24, this.scaleFactor);

    // Detail Modal Close Button sizing
    const mw = Math.min(bw * 0.85, 400);
    const mH = 220;
    this.closeModalButton.setPosition(0, mH / 2 - 32, mw * 0.7, this.isMobile ? 32 : 36 * this.scaleFactor, this.scaleFactor);
  }

  _onWindowWheel(e) {
    if (!this.isVisible || this.anim.scale < 0.9 || this.selectedAchievement) return;

    const tx = this.mouse.tx;
    const ty = this.mouse.ty;
    const bw = this.dims.w;
    const bh = this.dims.h;

    if (tx >= -bw / 2 && tx <= bw / 2 && ty >= -bh / 2 && ty <= bh / 2) {
      e.preventDefault();
      this.handleMouseWheel(e.deltaY);
    }
  }

  update(dt = 1 / 60) {
    // 1. Particle physics ticks
    this.particles.forEach(p => p.update(dt));
    this.particles = this.particles.filter(p => p.alpha > 0);

    // 2. Framerate-independent exponential decay lerp loops
    const lerpdt = (current, target, speed) => {
      const factor = 1 - Math.exp(-speed * dt * 60);
      return current + (target - current) * Math.min(1, Math.max(0, factor));
    };

    this.anim.alpha = lerpdt(this.anim.alpha, this.anim.targetAlpha, 0.15);
    this.anim.scrollY = lerpdt(this.anim.scrollY, this.anim.targetScrollY, 0.15);

    // Update legacy transition values continuously for GameManager checks
    this.catalogTransition = this.anim.scale;
    this.modalTransition = this.modalAnim.scale;

    // 3. Dynamic Dialog Spring scaling simulation
    const stiffness = 0.2 * 60;
    const friction = Math.pow(0.7, dt * 60);

    this.anim.scaleVel += (this.anim.targetScale - this.anim.scale) * stiffness * dt;
    this.anim.scaleVel *= friction;
    this.anim.scale += this.anim.scaleVel * dt * 60;

    // Details Modal Spring scaling
    this.modalAnim.scaleVel += (this.modalAnim.targetScale - this.modalAnim.scale) * stiffness * dt;
    this.modalAnim.scaleVel *= friction;
    this.modalAnim.scale += this.modalAnim.scaleVel * dt * 60;

    this._processHover(lerpdt);

    this.closeButton.update(dt);
    this.closeModalButton.update(dt);
    this.buttons.forEach(btn => btn.update(dt));
  }

  _processHover(lerpdt) {
    if (!this.isVisible || this.anim.scale < 0.9) return;

    this.cursor = 'default';
    const tx = this.mouse.tx;
    const ty = this.mouse.ty;
    const bw = this.dims.w;

    if (this.selectedAchievement) {
      // Route mouse interactions directly to Modal elements
      this.closeModalButton.handleMouseMove(tx, ty);
      if (this.closeModalButton.scale > 1.01 || this.closeModalButton.targetScale > 1.0) {
        this.cursor = 'pointer';
      }
      return;
    }

    this.closeButton.handleMouseMove(tx, ty);
    if (this.closeButton.isHovered) {
      this.cursor = 'pointer';
    }

    // Scrollbar Hover boundaries
    const trackX = bw / 2 - 14;
    const trackY = this.contentY;
    const trackH = this.clipHeight;
    this.scrollbarHovered = this.draggingScrollbar || (this.anim.maxScroll > 0 && tx >= trackX - 12 && tx <= trackX + 12 && ty >= trackY && ty <= trackY + trackH);

    if (this.scrollbarHovered) {
      this.cursor = 'pointer';
    }

    // Process Achievement Grid Cards Hovers
    this.hitboxes.cards.forEach((box, i) => {
      let targetHover = 0;
      if (this._isHit(tx, ty, box)) {
        targetHover = 1;
        this.cursor = 'pointer';
      }
      this.anim.cardHovers[i] = lerpdt(this.anim.cardHovers[i], targetHover, 0.2);
    });

    // Process main Back Button hover
    const isButtonHovered = this.buttons.some(btn => btn.scale > 1.01 || btn.targetScale > 1.0);
    if (isButtonHovered) {
      this.cursor = 'pointer';
    }
  }

  _isHit(x, y, box) {
    if (!box) return false;
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  }

  // --- INPUT PIPELINE (Supports modern click & legacy mouse routes) ---

  handleMouseMove(localX, localY) {
    this.mouse.x = localX;
    this.mouse.y = localY;

    this.mouse.tx = (localX - this.width / 2) / Math.max(0.001, this.anim.scale);
    this.mouse.ty = (localY - this.height / 2) / Math.max(0.001, this.anim.scale);

    const tx = this.mouse.tx;
    const ty = this.mouse.ty;

    if (this.selectedAchievement) {
      this.closeModalButton.handleMouseMove(tx, ty);
      return;
    }

    if (this.draggingScrollbar) {
      const trackY = this.contentY;
      const trackH = this.clipHeight;
      const clickFraction = (ty - trackY) / trackH;
      this.anim.targetScrollY = clickFraction * this.anim.maxScroll;
      this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    } else if (this.draggingList) {
      const deltaY = ty - this.dragStartY;
      this.anim.targetScrollY = this.dragStartScrollY - deltaY;
      this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    }

    this.closeButton.handleMouseMove(tx, ty);
    this.buttons.forEach(btn => btn.handleMouseMove(tx, ty));
  }

  handleMouseDown(localX, localY) {
    this.handleMouseMove(localX, localY);
    if (!this.isVisible || this.anim.scale < 0.9) return;

    const tx = this.mouse.tx;
    const ty = this.mouse.ty;
    const bw = this.dims.w;

    if (this.selectedAchievement) {
      this.closeModalButton.handleMouseDown(tx, ty);
      return;
    }

    this.closeButton.handleMouseDown(tx, ty);

    if (this.backButton.isPointInRect(tx, ty)) {
      this.backButton.handleMouseDown(tx, ty);
      return;
    }

    // Scrollbar Hit Testing
    const trackW = 16;
    const trackX = bw / 2 - 14;
    const trackY = this.contentY;
    const trackH = this.clipHeight;

    if (this.anim.maxScroll > 0 && tx >= trackX - trackW / 2 && tx <= trackX + trackW / 2 && ty >= trackY && ty <= trackY + trackH) {
      this.draggingScrollbar = true;
      const clickFraction = (ty - trackY) / trackH;
      this.anim.targetScrollY = clickFraction * this.anim.maxScroll;
      this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    }
    // Direct List Swipe Dragging
    else if (this.anim.maxScroll > 0 && tx >= -bw / 2 && tx <= bw / 2 && ty >= trackY && ty <= trackY + trackH) {
      this.draggingList = true;
      this.dragStartY = ty;
      this.dragStartScrollY = this.anim.targetScrollY;
    }
  }

  handleMouseUp(localX, localY) {
    this.handleMouseMove(localX, localY);

    this.draggingScrollbar = false;
    this.draggingList = false;

    if (!this.isVisible || this.anim.scale < 0.9) return;

    const tx = this.mouse.tx;
    const ty = this.mouse.ty;

    if (this.selectedAchievement) {
      this.closeModalButton.handleMouseUp(tx, ty, () => {
        this.modalAnim.targetScale = 0;
        setTimeout(() => { this.selectedAchievement = null; }, 150); // Delay clears logic once collapsed
      });
      return;
    }

    this.closeButton.handleMouseUp(tx, ty, () => {
      this.hide();
    });

    this.backButton.handleMouseUp(tx, ty, () => {
      this.hide();
    });

    // Check hit intersections on grid cards
    this.hitboxes.cards.forEach((box, i) => {
      if (this._isHit(tx, ty, box)) {
        const ach = this.achievements[i];
        this.selectedAchievement = ach;
        this.modalAnim.targetScale = 1.0;
        // Spawn localized juicy card-burst particles
        this.spawnParticles(box.x + box.w / 2, box.y + box.h / 2, ach.emoji, 15);
      }
    });
  }

  /**
   * GameManager Legacy Event compatibility bridge
   */
  handleMouseClick(localX, localY) {
    this.handleMouseUp(localX, localY);
  }

  /**
   * GameManager Legacy Cursor request layout
   */
  getCursorStyle() {
    return this.cursor || 'default';
  }

  handleMouseWheel(deltaY) {
    if (!this.isVisible || this.selectedAchievement) return;
    this.anim.targetScrollY += deltaY * 0.8;
    this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
  }

  handleKeyDown(key) {
    if (!this.isVisible) return;
    if (key === 'Escape') {
      if (this.selectedAchievement) {
        this.modalAnim.targetScale = 0;
        setTimeout(() => { this.selectedAchievement = null; }, 150);
      } else {
        this.hide();
      }
    }
  }

  /**
   * Unified Retro Canvas Draw Pipeline
   */
  draw(ctx, x, y) {
    const bw = this.dims.w;
    const bh = this.dims.h;

    ctx.save();

    // Canvas clipping security boundary
    ctx.beginPath();
    ctx.rect(x, y, this.width, this.height);
    ctx.clip();

    // Full screen overlay backdrop
    ctx.fillStyle = `rgba(10, 10, 14, ${this.anim.alpha * 0.7})`;
    ctx.fillRect(x, y, this.width, this.height);

    if (this.anim.scale <= 0.01) {
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(x + this.width / 2, y + this.height / 2);
    ctx.scale(this.anim.scale, this.anim.scale);

    // 1. NEO-BRUTALIST OFFSET DIALOG SHADOW
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(-bw / 2 + 8, -bh / 2 + 8, bw, bh);

    // 2. MAIN DIALOG BODY PANEL
    ctx.fillStyle = '#0a0a0c';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

    // 3. CRT SCREEN RASTER SCANLINES
    ctx.save();
    ctx.beginPath();
    ctx.rect(-bw / 2, -bh / 2, bw, bh);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let sy = -bh / 2; sy < bh / 2; sy += 3) {
      ctx.beginPath();
      ctx.moveTo(-bw / 2, sy);
      ctx.lineTo(bw / 2, sy);
      ctx.stroke();
    }
    ctx.restore();

    // 4. CORNER TECH BRACKETS
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 8, 2);
    ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 2, 8);
    ctx.fillRect(bw / 2 - 18, -bh / 2 + 10, 8, 2);
    ctx.fillRect(bw / 2 - 12, -bh / 2 + 10, 2, 8);

    // 5. HEADER TYPOGRAPHY
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(24 * this.scaleFactor)}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACHIEVEMENTS', 0, -bh / 2 + 35);

    // Divider Line
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.42, -bh / 2 + 58);
    ctx.lineTo(bw * 0.42, -bh / 2 + 58);
    ctx.stroke();

    // 6. DRAW PROGRESS METER BAR
    const unlockedCount = this.achievements.filter(a => a.unlocked).length;
    const progressPercent = Math.round((unlockedCount / this.achievements.length) * 100);

    ctx.fillStyle = '#ffe600';
    ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`// SYSTEM STATUS: ${unlockedCount}/${this.achievements.length} UNLOCKED [${progressPercent}%]`, 0, -bh / 2 + 75);

    const barW = bw * 0.8;
    const barH = 10;
    const barX = -barW / 2;
    const barY = -bh / 2 + 88;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(barX, barY, barW, barH);

    if (unlockedCount > 0) {
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(barX, barY, barW * (unlockedCount / this.achievements.length), barH);
    }

    // Close Button
    this.closeButton.draw(ctx);

    // 7. GRID CONTENT SCROLL RENDER
    const contentY = this.contentY;
    const clipHeight = this.clipHeight;
    const listWidth = this.listWidth;
    const listX = this.listX;

    ctx.save();
    ctx.beginPath();
    ctx.rect(listX - 10, contentY, listWidth + 20, clipHeight);
    ctx.clip(); // Restrict grid rendering inside mask bounds

    this.hitboxes.cards = [];

    this.achievements.forEach((ach, i) => {
      const r = Math.floor(i / this.cols);
      const c = i % this.cols;

      const cardX = this.gridStartX + c * (this.cardSize + this.cardGap);
      const cardY = contentY + r * (this.cardSize + this.cardGap) - this.anim.scrollY;

      // Frustum Culling limits check
      if (cardY > contentY + clipHeight || cardY + this.cardSize < contentY) {
        return; // Skip rendering out of screen frames
      }

      const hoverAmt = this.anim.cardHovers[i] || 0;

      ctx.save();
      ctx.translate(cardX + this.cardSize / 2, cardY + this.cardSize / 2);
      ctx.scale(1 + hoverAmt * 0.05, 1 + hoverAmt * 0.05);
      ctx.translate(-(cardX + this.cardSize / 2), -(cardY + this.cardSize / 2));

      // Base card frame
      ctx.fillStyle = '#121215';
      ctx.strokeStyle = ach.unlocked ? (hoverAmt > 0.01 ? '#00f0ff' : '#222228') : '#1e1e24';
      ctx.lineWidth = 3;

      // Visual opacity for locked states
      ctx.save();
      if (!ach.unlocked) ctx.globalAlpha = 0.45;

      ctx.fillRect(cardX, cardY, this.cardSize, this.cardSize);
      ctx.strokeRect(cardX, cardY, this.cardSize, this.cardSize);

      // Card elements
      if (ach.unlocked) {
        let img = (typeof AssetManager !== 'undefined') ? AssetManager.get(ach.imageName) : null;
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, cardX + 16, cardY + 12, this.cardSize - 32, this.cardSize - 44);
        } else {
          ctx.font = `${Math.round(36 * this.scaleFactor)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ach.emoji, cardX + this.cardSize / 2, cardY + this.cardSize / 2 - 8);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        let label = ach.title.toUpperCase();
        if (ctx.measureText(label).width > this.cardSize - 12) {
          label = label.substring(0, 8) + '...';
        }
        ctx.fillText(label, cardX + this.cardSize / 2, cardY + this.cardSize - 16);
      } else {
        ctx.fillStyle = '#474754';
        ctx.font = `bold ${Math.round(28 * this.scaleFactor)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❓', cardX + this.cardSize / 2, cardY + this.cardSize / 2 - 8);

        ctx.fillStyle = '#474754';
        ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('LOCKED', cardX + this.cardSize / 2, cardY + this.cardSize - 16);
      }

      ctx.restore(); // Restore locked global alpha modifier
      ctx.restore();

      // Push relative centers for inputs
      this.hitboxes.cards[i] = { x: cardX, y: cardY, w: this.cardSize, h: this.cardSize };
    });

    ctx.restore(); // Restore scrolling viewport clip mask

    // 8. SCROLLBAR SLIDER
    if (this.anim.maxScroll > 0) {
      const trackW = 6;
      const trackH = clipHeight;
      const trackX = bw / 2 - 14;
      const trackY = contentY;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(trackX, trackY, trackW, trackH);

      const thumbH = Math.max(30, (clipHeight / (clipHeight + this.anim.maxScroll)) * trackH);
      const thumbY = trackY + (this.anim.scrollY / this.anim.maxScroll) * (trackH - thumbH);

      ctx.fillStyle = this.scrollbarHovered ? '#ff007f' : '#00f0ff';
      ctx.fillRect(trackX - 1, thumbY, trackW + 2, thumbH);
    }

    // 9. BACK BUTTON
    this.backButton.draw(ctx);

    // 10. ACTIVE PARTICLE CELEBRATIONS
    this.particles.forEach(p => p.draw(ctx));

    // 11. MODAL DETAIL OVERLAY
    if (this.selectedAchievement && this.modalAnim.scale > 0.01) {
      this.drawModalOverlay(ctx);
    }

    ctx.restore(); // Restore centered transformations scale factor
    ctx.restore(); // Restore canvas boundary limits clipping path
  }

  /**
   * Detail Modal Rendering Channel
   */
  drawModalOverlay(ctx) {
    const ach = this.selectedAchievement;
    const bw = this.dims.w;
    const bh = this.dims.h;

    // Dark terminal tint mask
    ctx.fillStyle = `rgba(10, 10, 12, ${this.modalAnim.scale * 0.9})`;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);

    ctx.save();
    ctx.scale(this.modalAnim.scale, this.modalAnim.scale);

    const mw = Math.min(bw * 0.85, 400);
    const mH = 220;
    const mX = -mw / 2;
    const mY = -mH / 2;

    // Neon detail box outline
    ctx.fillStyle = '#121215';
    ctx.strokeStyle = '#ffe600'; // Warn Gold Frame
    ctx.lineWidth = 3;
    ctx.fillRect(mX, mY, mw, mH);
    ctx.strokeRect(mX, mY, mw, mH);

    // Dynamic decorative technical corners
    ctx.fillStyle = 'rgba(255, 230, 0, 0.2)';
    ctx.fillRect(mX + 6, mY + 6, 6, 2);
    ctx.fillRect(mX + 6, mY + 6, 2, 6);
    ctx.fillRect(-mX - 12, mY + 6, 6, 2);
    ctx.fillRect(-mX - 8, mY + 6, 2, 6);

    // Big Emoji display
    ctx.font = `bold ${Math.round(48 * this.scaleFactor)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ach.emoji, mX + 55, mY + 65);

    // Texts details metadata
    ctx.fillStyle = '#ffe600';
    ctx.font = `bold ${Math.round(18 * this.scaleFactor)}px "Courier New", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(ach.title.toUpperCase(), mX + 110, mY + 36);

    ctx.fillStyle = '#8a8a9a';
    ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", monospace`;
    ctx.fillText('// OBJECTIVE RESOLVED', mX + 110, mY + 58);

    // Wrapped descriptions block text
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
    this._wrapText(ctx, `"${ach.desc}"`, mX + 24, mY + 105, mw - 48, 14);

    // Render close details button inside dialog
    this.closeModalButton.draw(ctx);

    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
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