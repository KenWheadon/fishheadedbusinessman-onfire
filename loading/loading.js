/**
 * Highly polished, modular HTML5 Canvas Loading Screen Component.
 * Self-contained, lightweight, and layout-agnostic.
 */
class GameLoader {
  constructor(config = {}) {
    // Structural Dimensions
    this.width = config.width || 600;
    this.height = config.height || 400;

    // Progress Tracking State
    this.targetProgress = 0;
    this.currentProgress = 0;

    // Animation States & Flags
    this.isStarted = false;
    this.onScreen = true;
    this.hasExited = false;

    // Timers (Frame-rate independent)
    this.pulseTimer = 0;
    this.shimmerTimer = 0;
    this.exitTimer = 0;

    // Configuration Adjustments
    this.autoFillSpeed = 0.02; // Passive creep rate scaled per second
    this.easeRate = 4.8;       // Linear interpolation convergence speed

    // Local Interaction & FX Space
    this.mouseLocalX = 0;
    this.mouseLocalY = 0;
    this.particles = [];
  }

  /**
   * Triggers the loader initialization sequences
   */
  start() {
    if (this.isStarted) return;

    this.isStarted = true;
    this.onScreen = true;
    this.hasExited = false;
    this.exitTimer = 0;
    this.pulseTimer = 0;
    this.shimmerTimer = 0;
  }

  /**
   * Safely updates target loader percentages
   */
  setProgress(percent) {
    this.targetProgress = Math.min(Math.max(percent, 0), 100);

    // Dynamic recovery fallback if rolled backwards
    if (this.targetProgress < 100 && this.hasExited) {
      this.hasExited = false;
      this.onScreen = true;
      this.exitTimer = 0;
    }
  }

  /**
   * Returns current visibility status to the runner context
   */
  isOnScreen() {
    return this.onScreen;
  }

  /**
   * Resets the loader components immediately back to static standby
   */
  reset() {
    this.isStarted = false;
    this.onScreen = true;
    this.hasExited = false;
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.exitTimer = 0;
    this.pulseTimer = 0;
    this.particles = [];
  }

  /**
   * Standardized Localized Input Interfaces
   */
  handleMouseMove(localX, localY) {
    this.mouseLocalX = localX;
    this.mouseLocalY = localY;
  }

  handleMouseClick(localX, localY) {
    if (!this.isStarted || this.hasExited) return;
    
    // Spawn interactive juicy spark particles inside components boundaries
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: localX,
        y: localY,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        radius: Math.random() * 3 + 2,
        color: '#e5c158',
        alpha: 1,
        life: 0.5 + Math.random() * 0.3
      });
    }
  }

  /**
   * Isolated Physics & Timeline Calculation Step
   * @param {number} dt Delta time string in seconds passed from global framework loop
   */
  update(dt) {
    if (!this.isStarted || !this.onScreen) return;

    // 1. Advance Internal Cycle Clocks
    this.pulseTimer += dt;
    this.shimmerTimer += dt;

    // 2. Passive Loading Creep
    if (this.targetProgress < 99.5) {
      this.targetProgress += this.autoFillSpeed * dt * 60;
    }

    // 3. Smooth Delta-Aware Progress Interp
    const diff = this.targetProgress - this.currentProgress;
    this.currentProgress += diff * this.easeRate * dt;

    if (Math.abs(diff) < 0.02) {
      this.currentProgress = this.targetProgress;
    }

    // 4. Evaluate Exit Sequence Milestones
    if (this.currentProgress >= 100) {
      if (!this.hasExited) {
        this.hasExited = true;
        // Celebration particle burst
        for (let i = 0; i < 40; i++) {
          this.particles.push({
            x: this.width / 2 + (Math.random() - 0.5) * 200,
            y: this.height / 2 + 20,
            vx: (Math.random() - 0.5) * 200,
            vy: -Math.random() * 150 - 50,
            radius: Math.random() * 4 + 2,
            color: Math.random() > 0.5 ? '#e5c158' : '#fff1aa',
            alpha: 1,
            life: 1.0 + Math.random() * 0.5
          });
        }
      }

      this.exitTimer += dt;
      if (this.exitTimer >= 1.3) {
        this.onScreen = false;
      }
    }

    // 5. Component Particle Simulation Space
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  /**
   * Context-Independent Offset Canvas Renderer
   */
  draw(ctx, x, y) {
    if (!this.onScreen) return;

    ctx.save();
    // Anchor to targeted global flex viewport box
    ctx.translate(x, y);

    // Enforce Canvas Component Scissor Bounds
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();

    // 1. Draw Deep Base Panel Wallpaper Background
    ctx.fillStyle = '#0e0e12';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Resolve Original CSS Keyframes Transformations via Javascript Equations
    let logoScale = 1;
    let logoYOffset = 0;
    let logoAlpha = 1;
    let barScaleX = 1;
    let barScaleY = 1;
    let barYOffset = 0;
    let barAlpha = 1;
    let textAlpha = 1;
    let textScale = 1;
    let glowStrength = 0;

    if (this.isStarted && !this.hasExited) {
      // Natural Logo Pulse Transition (2 Second Cycle Loop Frequency)
      logoScale = 1 + Math.sin(this.pulseTimer * Math.PI) * 0.025;
    }

    if (this.hasExited) {
      const progress = Math.min(this.exitTimer / 1.3, 1);

      // Reconstructed CSS 'logoPopAndExit' Keyframe Curve Mechanics
      if (progress <= 0.15) {
        const p = progress / 0.15;
        logoScale = 1 + 0.3 * p;
        glowStrength = p;
      } else if (progress <= 0.35) {
        const p = (progress - 0.15) / 0.20;
        logoScale = 1.3 - 0.35 * p;
        glowStrength = 1 - p;
      } else if (progress <= 0.45) {
        const p = (progress - 0.35) / 0.10;
        logoScale = 0.95 + 0.05 * p;
      } else {
        const p = (progress - 0.45) / 0.55;
        logoScale = 1;
        logoYOffset = -this.height * 1.2 * p; // Rockets Upwards
        logoAlpha = 1 - p;
      }

      // Reconstructed CSS 'barPopAndExit' Keyframe Curve Mechanics
      if (progress <= 0.15) {
        const p = progress / 0.15;
        barScaleX = 1 + 0.15 * p;
        barScaleY = 1 + 0.40 * p;
      } else if (progress <= 0.35) {
        const p = (progress - 0.15) / 0.20;
        barScaleX = 1.15 - 0.17 * p;
        barScaleY = 1.4 - 0.50 * p;
      } else if (progress <= 0.45) {
        const p = (progress - 0.35) / 0.10;
        barScaleX = 0.98 + 0.02 * p;
        barScaleY = 0.9 + 0.10 * p;
      } else {
        const p = (progress - 0.45) / 0.55;
        barScaleX = 1;
        barScaleY = 1;
        barYOffset = this.height * 1.2 * p; // Drops Downwards
        barAlpha = 1 - p;
      }

      // Text Fade Properties
      if (this.exitTimer <= 0.6) {
        const p = this.exitTimer / 0.6;
        textAlpha = 1 - p;
        textScale = 1 - 0.2 * p;
      } else {
        textAlpha = 0;
      }
    }

    // 3. Render Logo Segment
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2 - 50 + logoYOffset);
    ctx.scale(logoScale, logoScale);
    ctx.globalAlpha = logoAlpha;

    if (glowStrength > 0) {
      ctx.shadowColor = '#e5c158';
      ctx.shadowBlur = glowStrength * 25;
    }

    // Abstract Asset Management Decoupling Check
    const logoImg = typeof AssetManager !== 'undefined' ? AssetManager.get('logo') : null;
    if (logoImg) {
      ctx.drawImage(logoImg, -100, -60, 200, 120);
    } else {
      // Elegant High-Fidelity Retro Canvas Emoji Fallback Layout
      ctx.font = '72px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.isStarted ? '#ffffff' : 'rgba(255, 255, 255, 0.2)';
      ctx.fillText('🎮', 0, 0);
    }
    ctx.restore();

    // 4. Render Loading Progress Bar Frame Elements
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2 + 40 + barYOffset);
    ctx.scale(barScaleX, barScaleY);
    ctx.globalAlpha = barAlpha;

    const bWidth = Math.min(this.width * 0.8, 450);
    const bHeight = 20;
    const bx = -bWidth / 2;
    const by = -bHeight / 2;

    // Base Bar Track Canvas Path
    ctx.beginPath();
    ctx.roundRect(bx, by, bWidth, bHeight, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.isStarted ? '#e5c158' : '#2a2a35';
    if (this.isStarted && !this.hasExited) {
      ctx.shadowColor = 'rgba(229, 193, 88, 0.15)';
      ctx.shadowBlur = 15;
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Clear immediately

    // Render Filled State Bar Segment
    if (this.currentProgress > 0) {
      const fillW = (bWidth - 6) * (this.currentProgress / 100);
      if (fillW > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx + 3, by + 3, bWidth - 6, bHeight - 6, 6);
        ctx.clip();

        // Active Color Scheme Gradient Profiles
        let barGrad = ctx.createLinearGradient(bx + 3, 0, bx + 3 + fillW, 0);
        if (this.isStarted) {
          barGrad.addColorStop(0, '#e5c158');
          barGrad.addColorStop(1, '#fff1aa');
        } else {
          barGrad.addColorStop(0, '#444444');
          barGrad.addColorStop(1, '#666666');
        }

        ctx.fillStyle = barGrad;
        ctx.fillRect(bx + 3, by + 3, fillW, bHeight - 6);

        // Animated Shimmer Overlay Calculations
        if (this.isStarted && !this.hasExited) {
          const shimmerLength = 150;
          const shimmerSpeed = 250; 
          const totalLoopTrack = bWidth + shimmerLength;
          let shimX = bx + 3 - shimmerLength + (this.shimmerTimer * shimmerSpeed) % totalLoopTrack;

          let shimGrad = ctx.createLinearGradient(shimX, 0, shimX + shimmerLength, 0);
          shimGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          shimGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
          shimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = shimGrad;
          ctx.fillRect(shimX, by + 3, shimmerLength, bHeight - 6);
        }
        ctx.restore();
      }
    }
    ctx.restore();

    // 5. Status Messaging Subtext Layer
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2 + 85);
    ctx.scale(textScale, textScale);
    ctx.globalAlpha = textAlpha;

    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillStyle = this.isStarted ? '#e5c158' : '#555555';

    let displayMsg = 'STANDBY';
    if (this.isStarted) {
      displayMsg = this.currentProgress >= 99.9 ? 'READY TO PLAY!' : `LOADING... ${Math.round(this.currentProgress)}%`;
    }
    ctx.fillText(displayMsg.toUpperCase(), 0, 0);
    ctx.restore();

    // 6. Draw Localized Internal Canvas Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}