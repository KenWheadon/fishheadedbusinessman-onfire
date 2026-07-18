class Chars {
  constructor(config = {}) {
    this.width = config.width || 1280;
    this.height = config.height || 720;

    // Calculate a base scaling factor based on the default target width of 1280
    this.baseScale = this.width / 1280;

    this.container = config.container || document.getElementById('game-stage');
    this.modalOverlay = config.modalOverlay || document.getElementById('modal-overlay');
    this.modalHeadshot = config.modalHeadshot || document.getElementById('modal-headshot');
    this.modalFallback = config.modalFallback || document.getElementById('modal-headshot-fallback');
    this.modalPleadText = config.modalPleadText || document.getElementById('modal-plead-text');
    this.modalTitle = config.modalTitle || document.getElementById('modal-title');
    this.modalBtnConfirm = config.modalBtnConfirm || document.getElementById('modal-btn-confirm');
    this.modalBtnCancel = config.modalBtnCancel || document.getElementById('modal-btn-cancel');

    this.explosionTimeoutId = null;
    this.initCharacters();
    this.initModalEvents();
    this.reset();
    this.time = 0;
  }

  /**
   * Recalculates position intervals and scale dynamically on device layout change.
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.baseScale = this.width / 1280; // Dynamically track scale changes
    const spacing = this.width / 5;

    this.characters.forEach((char, i) => {
      char.baseX = spacing * i + spacing / 2;
      char.baseY = this.height * 0.72;

      // Instantly map living characters to prevent visual jitter
      if (char.alive && !this.isWinning) {
        char.x = char.baseX;
        char.y = char.baseY;
      }
    });
  }

  initCharacters() {
    this.characters = [];
    const spacing = this.width / 5;
    const dialoguePools = [
      ["Wait, don't do this! I have a virtual family!", "Are you seriously targeting me?!", "Please, I'm the main character!"],
      ["Why me? Pick number 3, they look suspicious!", "I'm too beautiful to explode!", "My code is fragile, don't click!"],
      ["Stop! I'll give you double points if you spare me!", "I survived the last reset, don't ruin my streak!", "Nooooo! Not the big boom!"],
      ["I was coded on a Friday, I can't take an explosion!", "There are better options. Look left!", "I beg of you, click Reset instead!"],
      ["Is this because of my card design? I can change!", "Warning: Blowing me up cause severe juice!", "Please, I've got so much rendering left!"]
    ];

    for (let i = 0; i < 5; i++) {
      const id = i + 1;
      const imgBody = (typeof AssetManager !== 'undefined') ? AssetManager.get(`char-${id}`) : null;
      const imgHeadshot = (typeof AssetManager !== 'undefined') ? AssetManager.get(`headshot-${id}`) : null;

      this.characters.push({
        id: id, image: imgBody, headshot: imgHeadshot,
        baseX: spacing * i + spacing / 2, baseY: this.height * 0.72,
        x: spacing * i + spacing / 2, y: this.height * 0.72,
        vx: 0, vy: 0, angle: 0, va: 0, scale: 1, opacity: 1,
        alive: true, isDying: false, dialogues: dialoguePools[i], dialogueIndex: 0,
        hovered: false, isWaitingForBoom: false
      });
    }
  }

  initModalEvents() {
    this._onConfirmBound = () => this.confirmExplosion();
    this._onCancelBound = () => this.hideModal();
    if (this.modalBtnConfirm) this.modalBtnConfirm.addEventListener('click', this._onConfirmBound);
    if (this.modalBtnCancel) this.modalBtnCancel.addEventListener('click', this._onCancelBound);
  }

  getCharacterAtCoords(coords) {
    // Scale the hitbox boundaries so selection registers accurately at smaller sizes
    const w = 170 * this.baseScale, h = 230 * this.baseScale;
    for (const char of this.characters) {
      if (!char.alive) continue;
      if (coords.x >= char.x - w / 2 && coords.x <= char.x + w / 2 && coords.y >= char.y - h && coords.y <= char.y) {
        return char;
      }
    }
    return null;
  }

  handleMouseMove(localX, localY) {
    if (this.isLocked() || this.isWinning || this.isModalOpen) {
      this.characters.forEach(c => c.hovered = false); return 'default';
    }
    const hoveredChar = this.getCharacterAtCoords({ x: localX, y: localY });
    this.characters.forEach(char => char.hovered = (char === hoveredChar));
    return hoveredChar ? 'pointer' : 'default';
  }

  handleMouseClick(localX, localY) {
    if (this.isLocked() || this.isWinning || this.isModalOpen) return;
    const target = this.getCharacterAtCoords({ x: localX, y: localY });
    if (target) this.showModal(target);
  }

  showModal(character) {
    this.isModalOpen = true; this.pendingTarget = character;
    if (this.modalHeadshot && this.modalFallback) {
      if (character.headshot && character.headshot.complete && character.headshot.naturalWidth !== 0) {
        this.modalHeadshot.src = character.headshot.src;
        this.modalHeadshot.style.display = 'block'; this.modalFallback.style.display = 'none';
      } else {
        this.modalHeadshot.style.display = 'none'; this.modalFallback.style.display = 'block';
        this.modalFallback.innerHTML = `HOLO-STAGE<br>TARGET: 0${character.id}<br><br><span style="color:#656585;">[ NO SIGNAL ]</span>`;
      }
    }
    if (this.modalTitle) this.modalTitle.textContent = `TARGET ACQUIRED: HERO 0${character.id}`;
    const plead = character.dialogues[character.dialogueIndex];
    character.dialogueIndex = (character.dialogueIndex + 1) % character.dialogues.length;
    if (this.modalPleadText) this.modalPleadText.textContent = `"${plead}"`;
    if (this.modalOverlay) this.modalOverlay.classList.add('open');
  }

  hideModal() {
    this.isModalOpen = false; this.pendingTarget = null;
    if (this.modalOverlay) this.modalOverlay.classList.remove('open');
  }

  confirmExplosion() {
    if (this.pendingTarget) {
      const target = this.pendingTarget;
      this.locked = true; target.isWaitingForBoom = true;
      this.explosionTimeoutId = setTimeout(() => {
        target.isWaitingForBoom = false; this.explodeCharacter(target);
      }, 500 + Math.random() * 1500);
    }
    this.hideModal();
  }

  isLocked() { return this.locked; }
  next() { if (this.characters.filter(c => c.alive).length === 0 || this.isWinning || this.isModalOpen) return; this.locked = false; }

  explodeCharacter(target) {
    target.alive = false; target.isDying = true; target.hovered = false;
    if (typeof AssetManager !== 'undefined') target.image = AssetManager.get(`char-${target.id}-burnt`) || target.image;
    const dir = Math.random() > 0.5 ? 1 : -1;

    // Scale physics velocity vectors dynamically to keep speed relative to window size
    target.vx = dir * (Math.random() * 3.5 + 4.5) * this.baseScale;
    target.vy = (-Math.random() * 15 - 15) * this.baseScale;
    target.va = dir * (Math.random() * 0.05 + 0.03);

    this.spawnExplosion(target.x, target.y - 100 * this.baseScale);
    this.shakeIntensity = 18 * this.baseScale;
    this.locked = true;
  }

  reset() {
    if (this.explosionTimeoutId) { clearTimeout(this.explosionTimeoutId); this.explosionTimeoutId = null; }
    this.particles = []; this.shakeIntensity = 0; this.isWinning = false; this.isUltimateWin = false;
    this.winTimer = 0; this.winDuration = 300; this.locked = true; this.isModalOpen = false; this.pendingTarget = null;
    if (this.container) this.container.classList.remove('ultimate-shake');
    if (this.modalOverlay) this.modalOverlay.classList.remove('open');

    this.characters.forEach(char => {
      char.x = char.baseX; char.y = char.baseY; char.vx = 0; char.vy = 0; char.angle = 0; char.va = 0; char.scale = 1; char.opacity = 1;
      char.alive = true; char.isDying = false; char.dialogueIndex = 0; char.hovered = false; char.isWaitingForBoom = false;
      if (typeof AssetManager !== 'undefined') char.image = AssetManager.get(`char-${char.id}`) || char.image;
    });
  }

  win() {
    if (this.isModalOpen) return;
    const aliveCount = this.characters.filter(c => c.alive).length;
    if (aliveCount === 0) return;
    this.isWinning = true; this.winTimer = this.winDuration; this.locked = true;
    if (aliveCount === 5) {
      this.isUltimateWin = true; this.shakeIntensity = 30 * this.baseScale;
      if (this.container) this.container.classList.add('ultimate-shake');
    }
  }

  spawnExplosion(x, y) {
    const customPhrases = ["BOOM!", "KABOOM!", "SLAM!", "POW!", "KO!"];
    this.particles.push({
      type: 'text', text: customPhrases[Math.floor(Math.random() * customPhrases.length)], x: x, y: y - 50 * this.baseScale, vx: (Math.random() - 0.5) * 2 * this.baseScale, vy: -5 * this.baseScale,
      scale: 1, opacity: 1, rotation: (Math.random() - 0.5) * 0.3, life: 75, maxLife: 75
    });
    this.particles.push({ type: 'ring', x: x, y: y, radius: 10 * this.baseScale, maxRadius: 200 * this.baseScale, opacity: 1, life: 45, maxLife: 45 });
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2, speed = (Math.random() * 8 + 3) * this.baseScale;
      this.particles.push({
        type: 'spark', x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: (Math.random() * 6 + 4) * this.baseScale,
        color: `hsl(${Math.random() * 40 + 15}, 100%, ${Math.random() * 30 + 50}%)`, life: 50 + Math.random() * 40, maxLife: 50 + Math.random() * 40
      });
    }
  }

  spawnHeart(x, y) {
    this.particles.push({
      type: 'heart', x: x + (Math.random() - 0.5) * 60 * this.baseScale, y: y, vx: (Math.random() - 0.5) * 2.5 * this.baseScale, vy: (-Math.random() * 4 - 3) * this.baseScale,
      scale: Math.random() * 0.4 + 0.8, opacity: 1, driftSpeed: Math.random() * 0.08 + 0.04, driftDistance: Math.random() * 15 + 10, life: 80, maxLife: 80
    });
  }

  update(dt) {
    const frames = dt !== undefined ? dt * 60 : 1;
    this.time += frames;

    this.characters.forEach(char => {
      if (char.alive) {
        if (this.isWinning) {
          char.x = char.baseX + Math.sin(this.time * 0.35 + char.id * 1.5) * 14 * this.baseScale;
          char.y = (char.baseY - 25 * this.baseScale) + Math.cos(this.time * 0.45 + char.id * 2) * 12 * this.baseScale;
        } else {
          char.x = char.baseX; char.y = char.baseY + Math.sin(this.time * 0.06 + char.id * 2) * 4 * this.baseScale;
        }
      } else if (char.isDying) {
        char.x += char.vx * frames; char.y += char.vy * frames;
        char.vy += 0.45 * this.baseScale * frames; // Scale gravity pulling down
        char.angle += char.va * frames;

        const radius = 60 * this.baseScale, floorY = this.height - 80 * this.baseScale;
        if (char.x < radius) { char.x = radius; char.vx *= -0.6; }
        if (char.x > this.width - radius) { char.x = this.width - radius; char.vx *= -0.6; }
        if (char.y > floorY) {
          char.y = floorY;
          if (char.vy > 3 * this.baseScale) { char.vy *= -0.45; char.vx *= 0.8; char.va *= 0.8; }
          else { char.vy = 0; char.vx *= 0.5; char.va *= 0.5; }
        }
      }
    });

    if (this.isWinning) {
      const prevTimer = this.winTimer; this.winTimer -= frames;
      if (this.winTimer <= 0) {
        this.isWinning = false; this.isUltimateWin = false;
        if (this.container) this.container.classList.remove('ultimate-shake');
      } else {
        if (Math.floor(prevTimer / 8) !== Math.floor(this.winTimer / 8)) {
          this.characters.forEach(char => { if (char.alive) this.spawnHeart(char.x, char.y - 120 * this.baseScale); });
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.life -= frames;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const progress = p.life / p.maxLife; p.opacity = progress;

      if (p.type === 'spark') {
        p.x += p.vx * frames; p.y += p.vy * frames; p.vy += 0.12 * this.baseScale * frames; p.vx *= Math.pow(0.98, frames);
      } else if (p.type === 'heart') {
        p.x += (p.vx + Math.sin(this.time * p.driftSpeed) * 0.8) * frames; p.y += p.vy * frames; p.scale = progress * 1.3;
      } else if (p.type === 'text') {
        p.x += p.vx * frames; p.y += p.vy * frames; p.vy *= Math.pow(0.96, frames); p.scale = 1 + (1 - progress) * 1.2;
      } else if (p.type === 'ring') {
        p.radius = p.maxRadius * (1 - progress);
      }
    }
  }

  draw(ctx, x = 0, y = 0) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, this.width, this.height); ctx.clip();

    if (this.shakeIntensity > 0.1) {
      ctx.translate((Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity);
      this.shakeIntensity = this.isUltimateWin ? Math.max(6 * this.baseScale, this.shakeIntensity * 0.97) : this.shakeIntensity * 0.90;
    }

    this.drawBackground(ctx);
    this.characters.forEach(char => { if (char.alive || char.isDying) this.drawCharacter(ctx, char); });
    this.drawParticles(ctx);

    if (this.isUltimateWin) this.drawUltimateWinText(ctx);
    else this.drawInterfaceState(ctx);
    ctx.restore();
  }

  drawBackground(ctx) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0c0c14'); bgGrad.addColorStop(1, '#1b1b2f');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = '#2d2d44'; ctx.lineWidth = 2 * this.baseScale;
    ctx.beginPath(); ctx.moveTo(0, this.height * 0.75); ctx.lineTo(this.width, this.height * 0.75); ctx.stroke();

    const perspectiveCount = 13;
    for (let i = 0; i < perspectiveCount; i++) {
      const startX = (i / (perspectiveCount - 1)) * this.width;
      ctx.beginPath(); ctx.moveTo(startX, this.height * 0.75); ctx.lineTo(((startX - this.width / 2) * 1.6) + this.width / 2, this.height); ctx.stroke();
    }

    this.characters.forEach(char => {
      if (char.alive) {
        const radius = 140 * this.baseScale;
        const glow = ctx.createRadialGradient(char.baseX, char.baseY - 40 * this.baseScale, 5 * this.baseScale, char.baseX, char.baseY - 40 * this.baseScale, radius);
        const alpha = this.isModalOpen ? 0.3 : 1;
        if (!this.isLocked() && !this.isWinning && !this.isModalOpen) glow.addColorStop(0, `rgba(255, 78, 80, ${0.2 * alpha})`);
        else glow.addColorStop(0, `rgba(92, 107, 255, ${0.12 * alpha})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(char.baseX, char.baseY - 40 * this.baseScale, radius, 0, Math.PI * 2); ctx.fill();
      }
    });
  }

  drawCharacter(ctx, char) {
    ctx.save();
    let jitterX = 0, jitterY = 0;
    if (char.isWaitingForBoom) { jitterX = (Math.random() - 0.5) * 12 * this.baseScale; jitterY = (Math.random() - 0.5) * 12 * this.baseScale; }
    ctx.translate(char.x + jitterX, char.y + jitterY); ctx.rotate(char.angle);

    // Inject global baseScale into the transformation matrix alongside local animation scales
    const targetScale = char.scale * this.baseScale;
    ctx.scale(targetScale, targetScale);
    ctx.globalAlpha = char.opacity * (char.isDying ? 1 : (this.isModalOpen ? 0.2 : 1));

    // Leaving internal dimension properties at 170x230 because the canvas transform handles scaling perfectly!
    const w = 170, h = 230;
    if (char.alive) {
      ctx.save(); ctx.scale(1, 0.28);
      const shadow = ctx.createRadialGradient(0, 0, 5, 0, 0, w / 2);
      shadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)'); shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadow; ctx.beginPath(); ctx.arc(0, 20, w / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    const drawX = -w / 2, drawY = -h;
    if (!this.isLocked() && char.alive && !this.isWinning && !this.isModalOpen) {
      if (char.hovered) {
        ctx.strokeStyle = '#f9d423'; ctx.lineWidth = 8; ctx.shadowColor = '#f9d423'; ctx.shadowBlur = 20;
      } else {
        ctx.strokeStyle = 'rgba(255, 78, 80, 0.6)'; ctx.lineWidth = 4; ctx.shadowBlur = 0;
      }
      this.drawRoundedRect(ctx, drawX - 2, drawY - 2, w + 4, h + 4, 16); ctx.stroke(); ctx.shadowBlur = 0;
    }

    if (char.isWaitingForBoom) {
      ctx.strokeStyle = '#ff3b30'; ctx.lineWidth = 10 + Math.sin(this.time * 0.6) * 4; ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 25;
      this.drawRoundedRect(ctx, drawX - 4, drawY - 4, w + 8, h + 8, 18); ctx.stroke(); ctx.shadowBlur = 0;
    }

    if (char.image && char.image.complete && char.image.naturalWidth !== 0) {
      ctx.drawImage(char.image, drawX, drawY, w, h);
    } else {
      ctx.fillStyle = '#1e1e2d'; ctx.strokeStyle = '#3d3d5c'; ctx.lineWidth = 4;
      this.drawRoundedRect(ctx, drawX, drawY, w, h, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = `hsl(${char.id * 72}, 70%, 55%)`; this.drawRoundedRect(ctx, drawX + 10, drawY + 10, w - 20, 36, 8); ctx.fill();
      ctx.fillStyle = '#0f0f18'; ctx.fillRect(drawX + 10, drawY + 54, w - 20, 114);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 38px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`C${char.id}`, 0, drawY + 110);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 15px monospace'; ctx.fillText(`HERO 0${char.id}`, 0, drawY + 28);
      ctx.fillStyle = '#656585'; ctx.font = '11px sans-serif'; ctx.fillText(`STABLE READY`, 0, drawY + 200);
    }
    ctx.restore();
  }

  drawInterfaceState(ctx) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (this.isModalOpen) { ctx.restore(); return; }

    // Responsively scale UI font strings and margins
    const fontSize = Math.max(11, 18 * this.baseScale);
    const yPos = 24 * this.baseScale;

    if (this.characters.some(c => c.isWaitingForBoom)) {
      ctx.fillStyle = '#ff3b30'; ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 12 * this.baseScale; ctx.font = `900 ${fontSize + 2}px monospace`;
      ctx.fillText('⚡ DETONATION INITIATED: STAND CLEAR ⚡', this.width / 2, yPos);
    } else if (this.isLocked()) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.font = `bold ${fontSize - 2}px monospace`;
      ctx.fillText('STAGE SECURED / CLICK next() TO INITIATE', this.width / 2, yPos);
    } else {
      ctx.fillStyle = '#ff4e50'; ctx.shadowColor = '#ff4e50'; ctx.shadowBlur = 8 * this.baseScale; ctx.font = `900 ${fontSize}px monospace`;
      ctx.fillText('⚠️ DETONATION UNLOCKED: CHOOSE A TARGET HERO ⚠️', this.width / 2, yPos);
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.opacity;
      if (p.type === 'spark') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'heart') {
        ctx.font = `${p.scale * 36 * this.baseScale}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❤️', p.x, p.y);
      } else if (p.type === 'text') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
        ctx.scale(p.scale * this.baseScale, p.scale * this.baseScale); // Scale text explosion phrases cleanly
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 10; ctx.font = '900 48px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.strokeText(p.text, 0, 0);
        const grad = ctx.createLinearGradient(-40, -15, 40, 15); grad.addColorStop(0, '#ff3b30'); grad.addColorStop(0.5, '#ffcc00'); grad.addColorStop(1, '#ffeb3b');
        ctx.fillStyle = grad; ctx.fillText(p.text, 0, 0);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = `rgba(255, 90, 0, ${p.opacity})`; ctx.lineWidth = 8 * p.opacity * this.baseScale; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });
  }

  drawUltimateWinText(ctx) {
    ctx.save(); ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; ctx.fillRect(0, 0, this.width, this.height);
    ctx.translate(this.width / 2, this.height * 0.35);
    const bounce = 1 + Math.sin(this.time * 0.12) * 0.05;
    ctx.scale(bounce * this.baseScale, bounce * this.baseScale); // Keep the win banner responsive
    ctx.font = '900 84px "Impact", "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 16; ctx.strokeText('ULTIMATE WINNER!', 0, 0);
    const grad = ctx.createLinearGradient(-250, 0, 250, 0), cycle = (this.time * 4) % 360;
    grad.addColorStop(0, `hsl(${cycle}, 100%, 55%)`); grad.addColorStop(0.5, `hsl(${(cycle + 120) % 360}, 100%, 65%)`); grad.addColorStop(1, `hsl(${(cycle + 240) % 360}, 100%, 55%)`);
    ctx.fillStyle = grad; ctx.fillText('ULTIMATE WINNER!', 0, 0); ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
  }

  destroy() {
    if (this.explosionTimeoutId) clearTimeout(this.explosionTimeoutId);
    if (this.modalBtnConfirm && this._onConfirmBound) this.modalBtnConfirm.removeEventListener('click', this._onConfirmBound);
    if (this.modalBtnCancel && this._onCancelBound) this.modalBtnCancel.removeEventListener('click', this._onCancelBound);
  }
}