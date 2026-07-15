/**
 * GameJuice - A highly-polished Canvas-based Game Component
 * Features: 16:9 ratio, interactive HTML split-modal, headshot assets,
 * static hover styling, and custom screen-shake physics.
 */
class GameJuice {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`GameJuice: Container Id "${containerId}" not found.`);
    }

    // 16:9 Virtual resolution
    this.width = 1280;
    this.height = 720;

    // Connect to custom HTML modal DOM elements
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalHeadshot = document.getElementById('modal-headshot');
    this.modalFallback = document.getElementById('modal-headshot-fallback');
    this.modalPleadText = document.getElementById('modal-plead-text');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBtnConfirm = document.getElementById('modal-btn-confirm');
    this.modalBtnCancel = document.getElementById('modal-btn-cancel');

    this.initCanvas();
    this.initCharacters();
    this.initEventListeners();
    this.initModalEvents(); 
    this.reset();

    // Run render loop
    this.time = 0;
    this.loop = this.loop.bind(this);
    this.loop();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';

    this.container.appendChild(this.canvas);
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
      
      const imgBody = new Image();
      imgBody.src = `images/char-${id}.png`;

      // Load Headshots for modal
      const imgHeadshot = new Image();
      imgHeadshot.src = `images/headshot-${id}.png`;

      this.characters.push({
        id: id,
        image: imgBody,
        headshot: imgHeadshot, 
        baseX: spacing * i + spacing / 2,
        baseY: this.height * 0.72,
        x: spacing * i + spacing / 2,
        y: this.height * 0.72,
        vx: 0,
        vy: 0,
        angle: 0,
        va: 0,
        scale: 1,
        opacity: 1,
        alive: true,
        isDying: false,
        dialogues: dialoguePools[i],
        dialogueIndex: 0,
        hovered: false 
      });
    }
  }

  initEventListeners() {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
  }

  initModalEvents() {
    this.modalBtnConfirm.addEventListener('click', () => this.confirmExplosion());
    this.modalBtnCancel.addEventListener('click', () => this.hideModal());
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.width,
      y: ((e.clientY - rect.top) / rect.height) * this.height
    };
  }

  getCharacterAtCoords(coords) {
    const w = 170;
    const h = 230;

    for (const char of this.characters) {
      if (!char.alive) continue;
      
      const minX = char.x - w / 2;
      const maxX = char.x + w / 2;
      const minY = char.y - h;
      const maxY = char.y;

      if (coords.x >= minX && coords.x <= maxX && coords.y >= minY && coords.y <= maxY) {
        return char;
      }
    }
    return null;
  }

  handleCanvasClick(e) {
    if (this.isLocked() || this.isWinning || this.isModalOpen) return;

    const coords = this.getCanvasCoords(e);
    const target = this.getCharacterAtCoords(coords);

    if (target) {
      this.showModal(target);
    }
  }

  handleCanvasMouseMove(e) {
    if (this.isLocked() || this.isWinning || this.isModalOpen) {
      this.canvas.style.cursor = 'default';
      this.characters.forEach(c => c.hovered = false);
      return;
    }

    const coords = this.getCanvasCoords(e);
    const hoveredChar = this.getCharacterAtCoords(coords);

    this.canvas.style.cursor = hoveredChar ? 'pointer' : 'default';

    this.characters.forEach(char => {
      char.hovered = (char === hoveredChar);
    });
  }

  // --- Modal Logic ---

  showModal(character) {
    this.isModalOpen = true;
    this.pendingTarget = character; 

    // Visual headshot rendering checks
    if (character.headshot.complete && character.headshot.naturalWidth !== 0) {
      this.modalHeadshot.src = character.headshot.src;
      this.modalHeadshot.style.display = 'block';
      this.modalFallback.style.display = 'none';
    } else {
      // Procedural telemetry warning screen inside portrait box if file doesn't exist
      this.modalHeadshot.style.display = 'none';
      this.modalFallback.style.display = 'block';
      this.modalFallback.innerHTML = `HOLO-STAGE<br>TARGET: 0${character.id}<br><br><span style="color:#656585;">[ NO SIGNAL ]</span>`;
    }

    this.modalTitle.textContent = `TARGET ACQUIRED: HERO 0${character.id}`;

    // Cycle pleading dialogues
    const plead = character.dialogues[character.dialogueIndex];
    character.dialogueIndex = (character.dialogueIndex + 1) % character.dialogues.length;
    this.modalPleadText.textContent = `"${plead}"`;

    this.modalOverlay.classList.add('open');
  }

  hideModal() {
    this.isModalOpen = false;
    this.pendingTarget = null;
    this.modalOverlay.classList.remove('open');
  }

  confirmExplosion() {
    if (this.pendingTarget) {
      this.explodeCharacter(this.pendingTarget);
    }
    this.hideModal();
  }

  isLocked() {
    return this.locked;
  }

  next() {
    const aliveCount = this.characters.filter(c => c.alive).length;
    if (aliveCount === 0 || this.isWinning || this.isModalOpen) return;

    this.locked = false;
  }

  explodeCharacter(target) {
    target.alive = false;
    target.isDying = true;
    target.hovered = false;

    // Apply physics simulation throw vectors
    const direction = Math.random() > 0.5 ? 1 : -1;
    target.vx = direction * (Math.random() * 8 + 12);  
    target.vy = -Math.random() * 15 - 20;             
    target.va = direction * (Math.random() * 0.2 + 0.15); 
    target.scale = 1.0;

    this.spawnExplosion(target.x, target.y - 100);
    this.shakeIntensity = 18; 

    this.locked = true;
    this.canvas.style.cursor = 'default';
  }

  reset() {
    this.particles = [];
    this.shakeIntensity = 0;
    this.isWinning = false;
    this.isUltimateWin = false;
    this.winTimer = 0;
    this.winDuration = 300; 
    this.locked = true; 
    this.isModalOpen = false;
    this.pendingTarget = null;

    this.container.classList.remove('ultimate-shake');
    
    if (this.modalOverlay) this.modalOverlay.classList.remove('open');

    this.characters.forEach(char => {
      char.x = char.baseX;
      char.y = char.baseY;
      char.vx = 0;
      char.vy = 0;
      char.angle = 0;
      char.va = 0;
      char.scale = 1;
      char.opacity = 1;
      char.alive = true;
      char.isDying = false;
      char.dialogueIndex = 0;
      char.hovered = false; 
    });
  }

  win() {
    if (this.isModalOpen) return; 

    const aliveCount = this.characters.filter(c => c.alive).length;
    if (aliveCount === 0) return;

    this.isWinning = true;
    this.winTimer = this.winDuration;
    this.locked = true; 

    if (aliveCount === 5) {
      this.isUltimateWin = true;
      this.shakeIntensity = 30;
      this.container.classList.add('ultimate-shake');
    }
  }

  spawnExplosion(x, y) {
    const customPhrases = ["BOOM!", "KABOOM!", "SLAM!", "POW!", "KO!"];
    const phrase = customPhrases[Math.floor(Math.random() * customPhrases.length)];
    
    this.particles.push({ type: 'text', text: phrase, x: x, y: y - 50, vx: (Math.random() - 0.5) * 4, vy: -10, scale: 1, opacity: 1, rotation: (Math.random() - 0.5) * 0.4, life: 50, maxLife: 50 });
    this.particles.push({ type: 'ring', x: x, y: y, radius: 10, maxRadius: 180, opacity: 1, life: 25, maxLife: 25 });

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 6;
      this.particles.push({ type: 'spark', x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: Math.random() * 6 + 4, color: `hsl(${Math.random() * 40 + 15}, 100%, ${Math.random() * 30 + 50}%)`, life: 40 + Math.random() * 30, maxLife: 40 + Math.random() * 30 });
    }
  }

  spawnHeart(x, y) {
    this.particles.push({ type: 'heart', x: x + (Math.random() - 0.5) * 60, y: y, vx: (Math.random() - 0.5) * 2.5, vy: -Math.random() * 4 - 3, scale: Math.random() * 0.4 + 0.8, opacity: 1, driftSpeed: Math.random() * 0.08 + 0.04, driftDistance: Math.random() * 15 + 10, life: 80, maxLife: 80 });
  }

  loop() {
    this.time++;
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }

  update() {
    this.characters.forEach(char => {
      if (char.alive) {
        if (this.isWinning) {
          char.x = char.baseX + Math.sin(this.time * 0.35 + char.id * 1.5) * 14;
          char.y = (char.baseY - 25) + Math.cos(this.time * 0.45 + char.id * 2) * 12; 
        } else {
          char.x = char.baseX;
          char.y = char.baseY + Math.sin(this.time * 0.06 + char.id * 2) * 4;
        }
      } else if (char.isDying) {
        char.x += char.vx;
        char.y += char.vy;
        char.vy += 0.85; 
        char.angle += char.va; 
        char.scale = Math.max(0.2, char.scale - 0.008); 

        if (char.y > this.height + 300) { char.isDying = false; }
      }
    });

    if (this.isWinning) {
      this.winTimer--;
      if (this.winTimer <= 0) {
        this.isWinning = false;
        this.isUltimateWin = false;
        this.container.classList.remove('ultimate-shake');
      } else if (this.winTimer % 8 === 0) {
        this.characters.forEach(char => { if (char.alive) this.spawnHeart(char.x, char.y - 120); });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      const progress = p.life / p.maxLife;
      p.opacity = progress;
      if (p.type === 'spark') { p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.97; } 
      else if (p.type === 'heart') { p.x += p.vx + Math.sin(this.time * p.driftSpeed) * 0.8; p.y += p.vy; p.scale = progress * 1.3; } 
      else if (p.type === 'text') { p.x += p.vx; p.y += p.vy; p.vy *= 0.95; p.scale = 1 + (1 - progress) * 1.6; } 
      else if (p.type === 'ring') { p.radius = p.maxRadius * (1 - progress); }
    }
  }

  draw() {
    this.ctx.save();

    if (this.shakeIntensity > 0.1) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
      this.shakeIntensity = this.isUltimateWin ? Math.max(6, this.shakeIntensity * 0.97) : this.shakeIntensity * 0.90;
    }

    this.drawBackground();
    this.characters.forEach(char => { if (char.alive || char.isDying) this.drawCharacter(char); });
    this.drawParticles();

    if (this.isUltimateWin) { this.drawUltimateWinText(); } 
    else { this.drawInterfaceState(); }

    this.ctx.restore();
  }

  drawBackground() {
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0c0c14');
    bgGrad.addColorStop(1, '#1b1b2f');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = '#2d2d44';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath(); this.ctx.moveTo(0, this.height * 0.75); this.ctx.lineTo(this.width, this.height * 0.75); this.ctx.stroke();

    const perspectiveCount = 13;
    for (let i = 0; i < perspectiveCount; i++) {
      const startX = (i / (perspectiveCount - 1)) * this.width;
      const endX = ((startX - this.width / 2) * 1.6) + this.width / 2;
      this.ctx.beginPath(); this.ctx.moveTo(startX, this.height * 0.75); this.ctx.lineTo(endX, this.height); this.ctx.stroke();
    }

    this.characters.forEach(char => {
      if (char.alive) {
        const glow = this.ctx.createRadialGradient(char.baseX, char.baseY - 40, 5, char.baseX, char.baseY - 40, 140);
        const alphaFactor = this.isModalOpen ? 0.3 : 1;
        if (!this.isLocked() && !this.isWinning && !this.isModalOpen) {
          glow.addColorStop(0, `rgba(255, 78, 80, ${0.2 * alphaFactor})`);
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          glow.addColorStop(0, `rgba(92, 107, 255, ${0.12 * alphaFactor})`);
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        this.ctx.fillStyle = glow;
        this.ctx.beginPath(); this.ctx.arc(char.baseX, char.baseY - 40, 140, 0, Math.PI * 2); this.ctx.fill();
      }
    });
  }

  drawCharacter(char) {
    this.ctx.save();
    this.ctx.translate(char.x, char.y);
    this.ctx.rotate(char.angle);
    this.ctx.scale(char.scale, char.scale);
    
    const baseOpacity = char.isDying ? 1 : (this.isModalOpen ? 0.2 : 1);
    this.ctx.globalAlpha = char.opacity * baseOpacity;

    const w = 170;
    const h = 230;

    if (char.alive) {
      this.ctx.save(); this.ctx.scale(1, 0.28);
      const shadowGrad = this.ctx.createRadialGradient(0, 0, 5, 0, 0, w / 2);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)'); shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = shadowGrad; this.ctx.beginPath(); this.ctx.arc(0, 20, w / 2, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.restore();
    }

    const drawX = -w / 2;
    const drawY = -h;

    // Hover design modifications
    if (!this.isLocked() && char.alive && !this.isWinning && !this.isModalOpen) {
      if (char.hovered) {
        // High static yellow spotlight frame on hover
        this.ctx.strokeStyle = '#f9d423';
        this.ctx.lineWidth = 8;
        this.ctx.shadowColor = '#f9d423';
        this.ctx.shadowBlur = 20;
      } else {
        // Solid thin red perimeter layout
        this.ctx.strokeStyle = 'rgba(255, 78, 80, 0.6)';
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 0;
      }
      this.drawRoundedRect(this.ctx, drawX - 2, drawY - 2, w + 4, h + 4, 16);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; 
    }

    if (char.image.complete && char.image.naturalWidth !== 0) {
      this.ctx.drawImage(char.image, drawX, drawY, w, h);
    } else {
      // Fallback procedural layout card
      this.ctx.fillStyle = '#1e1e2d'; this.ctx.strokeStyle = '#3d3d5c'; this.ctx.lineWidth = 4;
      this.drawRoundedRect(this.ctx, drawX, drawY, w, h, 14); this.ctx.fill(); this.ctx.stroke();
      this.ctx.fillStyle = `hsl(${char.id * 72}, 70%, 55%)`; this.drawRoundedRect(this.ctx, drawX + 10, drawY + 10, w - 20, 36, 8); this.ctx.fill();
      this.ctx.fillStyle = '#0f0f18'; this.ctx.fillRect(drawX + 10, drawY + 54, w - 20, 114);
      this.ctx.fillStyle = '#fff'; this.ctx.font = 'bold 38px sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText(`C${char.id}`, 0, drawY + 110);
      this.ctx.fillStyle = '#ffffff'; this.ctx.font = '900 15px monospace'; this.ctx.fillText(`HERO 0${char.id}`, 0, drawY + 28);
      this.ctx.fillStyle = '#656585'; this.ctx.font = '11px sans-serif'; this.ctx.fillText(`STABLE READY`, 0, drawY + 200);
    }

    this.ctx.restore();
  }

  drawInterfaceState() {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    if (this.isModalOpen) { this.ctx.restore(); return; }

    if (this.isLocked()) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText('STAGE SECURED / CLICK next() TO INITIATE', this.width / 2, 24);
    } else {
      this.ctx.fillStyle = '#ff4e50';
      this.ctx.shadowColor = '#ff4e50'; this.ctx.shadowBlur = 8;
      this.ctx.font = '900 18px monospace';
      this.ctx.fillText('⚠️ DETONATION UNLOCKED: CHOOSE A TARGET HERO ⚠️', this.width / 2, 24);
    }
    this.ctx.restore();
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save(); this.ctx.globalAlpha = p.opacity;
      if (p.type === 'spark') { this.ctx.fillStyle = p.color; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); this.ctx.fill(); } 
      else if (p.type === 'heart') { this.ctx.font = `${p.scale * 36}px sans-serif`; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.fillText('❤️', p.x, p.y); } 
      else if (p.type === 'text') { this.ctx.translate(p.x, p.y); this.ctx.rotate(p.rotation); this.ctx.scale(p.scale, p.scale); this.ctx.strokeStyle = '#000000'; this.ctx.lineWidth = 10; this.ctx.font = '900 48px Arial, sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle'; this.ctx.strokeText(p.text, 0, 0); const textGrad = this.ctx.createLinearGradient(-40, -15, 40, 15); textGrad.addColorStop(0, '#ff3b30'); textGrad.addColorStop(0.5, '#ffcc00'); textGrad.addColorStop(1, '#ffeb3b'); this.ctx.fillStyle = textGrad; this.ctx.fillText(p.text, 0, 0); } 
      else if (p.type === 'ring') { this.ctx.strokeStyle = `rgba(255, 90, 0, ${p.opacity})`; this.ctx.lineWidth = 8 * p.opacity; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.stroke(); }
      this.ctx.restore();
    });
  }

  drawUltimateWinText() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'; this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.translate(this.width / 2, this.height * 0.35);
    const bounce = 1 + Math.sin(this.time * 0.12) * 0.05; this.ctx.scale(bounce, bounce);
    this.ctx.font = '900 84px "Impact", "Arial Black", sans-serif'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
    this.ctx.strokeStyle = '#000000'; this.ctx.lineWidth = 16; this.ctx.strokeText('ULTIMATE WINNER!', 0, 0);
    const rotationGrad = this.ctx.createLinearGradient(-250, 0, 250, 0); const colorCycle = (this.time * 4) % 360; rotationGrad.addColorStop(0, `hsl(${colorCycle}, 100%, 55%)`); rotationGrad.addColorStop(0.5, `hsl(${(colorCycle + 120) % 360}, 100%, 65%)`); rotationGrad.addColorStop(1, `hsl(${(colorCycle + 240) % 360}, 100%, 55%)`); this.ctx.fillStyle = rotationGrad; this.ctx.fillText('ULTIMATE WINNER!', 0, 0);
    this.ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius); ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height); ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius); ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();
  }
}