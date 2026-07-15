/**
 * GameJuice - A highly-polished Canvas-based Game Component
 * Features: 16:9 fixed ratio logic, interactive click targeting,
 * cyclic pleading dialogs, and screen-shake physics.
 */
class GameJuice {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`GameJuice: Container with ID "${containerId}" was not found.`);
    }

    // 16:9 Virtual resolution
    this.width = 1280;
    this.height = 720;

    this.initCanvas();
    this.initCharacters();
    this.initEventListeners();
    this.reset();

    // Run render loop
    this.time = 0;
    this.loop = this.loop.bind(this);
    this.loop();
  }

  /**
   * Appends Canvas with native aspect ratio constraints
   */
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

  /**
   * Setup initial structures for the 5 characters and their pleading scripts
   */
  initCharacters() {
    this.characters = [];
    const spacing = this.width / 5;

    // Cyclic dialogues for each character
    const dialoguePools = [
      [
        "Wait, don't do this! I have a virtual family!", 
        "Are you seriously targeting me again?!", 
        "Please, I'm the main character of this component!"
      ],
      [
        "Why me? Pick number 3, they look suspicious!", 
        "I'm too beautiful to explode!", 
        "My code is fragile, please don't click me!"
      ],
      [
        "Stop! I'll give you double points if you spare me!", 
        "I survived the last reset, don't ruin my streak!", 
        "Nooooo! Not the big boom!"
      ],
      [
        "I was coded on a Friday, I can't take an explosion!", 
        "There are better options. Look left!", 
        "I beg of you, click Reset instead!"
      ],
      [
        "Is this because of my card design? I can change!", 
        "Warning: Blowing me up may cause severe juice!", 
        "Please, I've got so much rendering left to do!"
      ]
    ];

    for (let i = 0; i < 5; i++) {
      const id = i + 1;
      const img = new Image();
      img.src = `images/char-${id}.png`;

      this.characters.push({
        id: id,
        image: img,
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
        // Dialog system properties
        dialogues: dialoguePools[i],
        dialogueIndex: 0
      });
    }
  }

  /**
   * Mouse listener setups to track and resolve screen/canvas clicks
   */
  initEventListeners() {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
  }

  /**
   * Translates client coordinates to virtual 1280x720 space
   */
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.width,
      y: ((e.clientY - rect.top) / rect.height) * this.height
    };
  }

  /**
   * Standard AABB check against the bounding card shapes (170x230 px)
   */
  getCharacterAtCoords(coords) {
    const w = 170;
    const h = 230;

    for (const char of this.characters) {
      if (!char.alive) continue;
      
      // Since card translation origin is bottom-middle:
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

  /**
   * Handles interactive mouse clicks
   */
  handleCanvasClick(e) {
    if (this.isLocked() || this.isWinning) return;

    const coords = this.getCanvasCoords(e);
    const target = this.getCharacterAtCoords(coords);

    if (target) {
      // Get pleading dialogue and increment the cycle index safely
      const plead = target.dialogues[target.dialogueIndex];
      target.dialogueIndex = (target.dialogueIndex + 1) % target.dialogues.length;

      // Browser confirm popup
      const confirmed = confirm(`Hero 0${target.id} pleads:\n\n"${plead}"\n\nAre you absolutely sure you want to blow them up?`);
      
      if (confirmed) {
        this.explodeCharacter(target);
      }
    }
  }

  /**
   * Changes pointer style on hover to indicate interactive targets when unlocked
   */
  handleCanvasMouseMove(e) {
    if (this.isLocked() || this.isWinning) {
      this.canvas.style.cursor = 'default';
      return;
    }

    const coords = this.getCanvasCoords(e);
    const hoveredChar = this.getCharacterAtCoords(coords);

    this.canvas.style.cursor = hoveredChar ? 'pointer' : 'default';
  }

  /**
   * Evaluates if interactions are currently locked
   */
  isLocked() {
    return this.locked;
  }

  /**
   * Unlocks the board to let the player click a character
   */
  next() {
    const aliveCount = this.characters.filter(c => c.alive).length;
    if (aliveCount === 0 || this.isWinning) return;

    this.locked = false;
  }

  /**
   * Triggers physical explosion kinematics for the chosen target
   */
  explodeCharacter(target) {
    target.alive = false;
    target.isDying = true;

    // Apply juicy physical explosion throw vector
    const direction = Math.random() > 0.5 ? 1 : -1;
    target.vx = direction * (Math.random() * 8 + 12);  
    target.vy = -Math.random() * 15 - 20;             
    target.va = direction * (Math.random() * 0.2 + 0.15); 
    target.scale = 1.0;

    this.spawnExplosion(target.x, target.y - 100);
    this.shakeIntensity = 18; 

    // Relock board after execution
    this.locked = true;
    this.canvas.style.cursor = 'default';
  }

  /**
   * Resets entire state to baseline
   */
  reset() {
    this.particles = [];
    this.shakeIntensity = 0;
    this.isWinning = false;
    this.isUltimateWin = false;
    this.winTimer = 0;
    this.winDuration = 300; 
    this.locked = true; // Board starts locked by default

    this.container.classList.remove('ultimate-shake');

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
      char.dialogueIndex = 0; // Reset pleading order
    });
  }

  /**
   * Triggers the win phase. Remaining characters wiggle and emit hearts.
   * If all 5 characters are left, sparks Ultimate Win with a massive screen shake.
   */
  win() {
    const aliveCount = this.characters.filter(c => c.alive).length;
    if (aliveCount === 0) return;

    this.isWinning = true;
    this.winTimer = this.winDuration;
    this.locked = true; // Lock interactions during win celebration

    if (aliveCount === 5) {
      this.isUltimateWin = true;
      this.shakeIntensity = 30;
      this.container.classList.add('ultimate-shake');
    }
  }

  /**
   * Spawns particle and text mechanics for explosions
   */
  spawnExplosion(x, y) {
    const customPhrases = ["BOOM!", "KABOOM!", "SLAM!", "POW!", "KO!"];
    const phrase = customPhrases[Math.floor(Math.random() * customPhrases.length)];
    
    this.particles.push({
      type: 'text',
      text: phrase,
      x: x,
      y: y - 50,
      vx: (Math.random() - 0.5) * 4,
      vy: -10,
      scale: 1,
      opacity: 1,
      rotation: (Math.random() - 0.5) * 0.4,
      life: 50,
      maxLife: 50
    });

    this.particles.push({
      type: 'ring',
      x: x,
      y: y,
      radius: 10,
      maxRadius: 180,
      opacity: 1,
      life: 25,
      maxLife: 25
    });

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 6;
      this.particles.push({
        type: 'spark',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 6 + 4,
        color: `hsl(${Math.random() * 40 + 15}, 100%, ${Math.random() * 30 + 50}%)`,
        life: 40 + Math.random() * 30,
        maxLife: 40 + Math.random() * 30
      });
    }
  }

  /**
   * Spawns standard floating heart particles
   */
  spawnHeart(x, y) {
    this.particles.push({
      type: 'heart',
      x: x + (Math.random() - 0.5) * 60,
      y: y,
      vx: (Math.random() - 0.5) * 2.5,
      vy: -Math.random() * 4 - 3,
      scale: Math.random() * 0.4 + 0.8,
      opacity: 1,
      driftSpeed: Math.random() * 0.08 + 0.04,
      driftDistance: Math.random() * 15 + 10,
      life: 80,
      maxLife: 80
    });
  }

  /**
   * Internal Loop: Update state and render
   */
  loop() {
    this.time++;
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }

  /**
   * Mathematical state and physics updates
   */
  update() {
    this.characters.forEach(char => {
      if (char.alive) {
        if (this.isWinning) {
          char.x = char.baseX + Math.sin(this.time * 0.35 + char.id * 1.5) * 14;
          char.y = (char.baseY - 25) + Math.cos(this.time * 0.45 + char.id * 2) * 12; 
        } else {
          // Standard idle breathing
          char.x = char.baseX;
          char.y = char.baseY + Math.sin(this.time * 0.06 + char.id * 2) * 4;
        }
      } else if (char.isDying) {
        char.x += char.vx;
        char.y += char.vy;
        char.vy += 0.85; 
        char.angle += char.va; 
        char.scale = Math.max(0.2, char.scale - 0.008); 

        if (char.y > this.height + 300) {
          char.isDying = false; 
        }
      }
    });

    if (this.isWinning) {
      this.winTimer--;
      if (this.winTimer <= 0) {
        this.isWinning = false;
        this.isUltimateWin = false;
        this.container.classList.remove('ultimate-shake');
      } else if (this.winTimer % 8 === 0) {
        this.characters.forEach(char => {
          if (char.alive) {
            this.spawnHeart(char.x, char.y - 120);
          }
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const progress = p.life / p.maxLife;
      p.opacity = progress;

      if (p.type === 'spark') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; 
        p.vx *= 0.97; 
      } else if (p.type === 'heart') {
        p.x += p.vx + Math.sin(this.time * p.driftSpeed) * 0.8;
        p.y += p.vy;
        p.scale = progress * 1.3;
      } else if (p.type === 'text') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy *= 0.95;
        p.scale = 1 + (1 - progress) * 1.6;
      } else if (p.type === 'ring') {
        p.radius = p.maxRadius * (1 - progress);
      }
    }
  }

  /**
   * Draw routine
   */
  draw() {
    this.ctx.save();

    if (this.shakeIntensity > 0.1) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);

      if (this.isUltimateWin) {
        this.shakeIntensity = Math.max(6, this.shakeIntensity * 0.97);
      } else {
        this.shakeIntensity *= 0.90;
      }
    }

    this.drawBackground();

    this.characters.forEach(char => {
      if (char.alive || char.isDying) {
        this.drawCharacter(char);
      }
    });

    this.drawParticles();

    if (this.isUltimateWin) {
      this.drawUltimateWinText();
    } else {
      this.drawInterfaceState();
    }

    this.ctx.restore();
  }

  /**
   * Environment and stage lighting render
   */
  drawBackground() {
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0c0c14');
    bgGrad.addColorStop(1, '#1b1b2f');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = '#2d2d44';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height * 0.75);
    this.ctx.lineTo(this.width, this.height * 0.75);
    this.ctx.stroke();

    const perspectiveCount = 13;
    for (let i = 0; i < perspectiveCount; i++) {
      const startX = (i / (perspectiveCount - 1)) * this.width;
      const endX = ((startX - this.width / 2) * 1.6) + this.width / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(startX, this.height * 0.75);
      this.ctx.lineTo(endX, this.height);
      this.ctx.stroke();
    }

    this.characters.forEach(char => {
      if (char.alive) {
        const glow = this.ctx.createRadialGradient(char.baseX, char.baseY - 40, 5, char.baseX, char.baseY - 40, 140);
        
        // Change spotlight flavor when characters are unlocked to click
        if (!this.isLocked() && !this.isWinning) {
          glow.addColorStop(0, 'rgba(255, 78, 80, 0.2)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          glow.addColorStop(0, 'rgba(92, 107, 255, 0.12)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(char.baseX, char.baseY - 40, 140, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  /**
   * Card graphics and fallback styling
   */
  drawCharacter(char) {
    this.ctx.save();
    this.ctx.translate(char.x, char.y);
    this.ctx.rotate(char.angle);
    this.ctx.scale(char.scale, char.scale);
    this.ctx.globalAlpha = char.opacity;

    const w = 170;
    const h = 230;

    if (char.alive) {
      this.ctx.save();
      this.ctx.scale(1, 0.28);
      const shadowGrad = this.ctx.createRadialGradient(0, 0, 5, 0, 0, w / 2);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = shadowGrad;
      this.ctx.beginPath();
      this.ctx.arc(0, 20, w / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    const drawX = -w / 2;
    const drawY = -h;

    // Glowing border highlight when ready to target
    if (!this.isLocked() && char.alive && !this.isWinning) {
      this.ctx.strokeStyle = `rgba(255, 78, 80, ${0.5 + Math.sin(this.time * 0.15) * 0.3})`;
      this.ctx.lineWidth = 10;
      this.ctx.shadowColor = '#ff4e50';
      this.ctx.shadowBlur = 15;
      this.drawRoundedRect(this.ctx, drawX - 4, drawY - 4, w + 8, h + 8, 18);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0; // reset shadow
    }

    if (char.image.complete && char.image.naturalWidth !== 0) {
      this.ctx.drawImage(char.image, drawX, drawY, w, h);
    } else {
      // High-Fidelity Placeholder Card
      this.ctx.fillStyle = '#1e1e2d';
      this.ctx.strokeStyle = '#3d3d5c';
      this.ctx.lineWidth = 4;
      this.drawRoundedRect(this.ctx, drawX, drawY, w, h, 14);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = `hsl(${char.id * 72}, 70%, 55%)`;
      this.drawRoundedRect(this.ctx, drawX + 10, drawY + 10, w - 20, 36, 8);
      this.ctx.fill();

      this.ctx.fillStyle = '#0f0f18';
      this.ctx.fillRect(drawX + 10, drawY + 54, w - 20, 114);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 38px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`C${char.id}`, 0, drawY + 110);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '900 15px monospace';
      this.ctx.fillText(`HERO 0${char.id}`, 0, drawY + 28);

      this.ctx.fillStyle = '#656585';
      this.ctx.font = '11px sans-serif';
      this.ctx.fillText(`STABLE READY`, 0, drawY + 200);
    }

    this.ctx.restore();
  }

  /**
   * In-game lock state overlay and visual prompts
   */
  drawInterfaceState() {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';

    if (this.isLocked()) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.font = 'bold 16px monospace';
      this.ctx.fillText('STAGE STATUS: SECURED / CLICK next() TO INITIATE TARGETING', this.width / 2, 24);
    } else {
      this.ctx.fillStyle = '#ff4e50';
      this.ctx.shadowColor = '#ff4e50';
      this.ctx.shadowBlur = 8;
      this.ctx.font = '900 18px monospace';
      this.ctx.fillText('⚠️ DETONATION PROTOCOL UNLOCKED: CHOOSE A HERO TO DESTROY ⚠️', this.width / 2, 24);
    }
    this.ctx.restore();
  }

  /**
   * Dynamic particle rendering engine
   */
  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;

      if (p.type === 'spark') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'heart') {
        this.ctx.font = `${p.scale * 36}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('❤️', p.x, p.y);
      } else if (p.type === 'text') {
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.scale(p.scale, p.scale);

        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 10;
        this.ctx.font = '900 48px Arial, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.strokeText(p.text, 0, 0);

        const textGrad = this.ctx.createLinearGradient(-40, -15, 40, 15);
        textGrad.addColorStop(0, '#ff3b30');
        textGrad.addColorStop(0.5, '#ffcc00');
        textGrad.addColorStop(1, '#ffeb3b');
        this.ctx.fillStyle = textGrad;
        this.ctx.fillText(p.text, 0, 0);
      } else if (p.type === 'ring') {
        this.ctx.strokeStyle = `rgba(255, 90, 0, ${p.opacity})`;
        this.ctx.lineWidth = 8 * p.opacity;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  /**
   * Massive Ultimate Win banner
   */
  drawUltimateWinText() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.translate(this.width / 2, this.height * 0.35);

    const bounce = 1 + Math.sin(this.time * 0.12) * 0.05;
    this.ctx.scale(bounce, bounce);

    this.ctx.font = '900 84px "Impact", "Arial Black", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 16;
    this.ctx.strokeText('ULTIMATE WINNER!', 0, 0);

    const rotationGrad = this.ctx.createLinearGradient(-250, 0, 250, 0);
    const colorCycle = (this.time * 4) % 360;
    rotationGrad.addColorStop(0, `hsl(${colorCycle}, 100%, 55%)`);
    rotationGrad.addColorStop(0.5, `hsl(${(colorCycle + 120) % 360}, 100%, 65%)`);
    rotationGrad.addColorStop(1, `hsl(${(colorCycle + 240) % 360}, 100%, 55%)`);

    this.ctx.fillStyle = rotationGrad;
    this.ctx.fillText('ULTIMATE WINNER!', 0, 0);

    this.ctx.restore();
  }

  /**
   * Helper Utility: Rounded Rectangle
   */
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}