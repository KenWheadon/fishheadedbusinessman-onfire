// ==========================================
// CONFETTI PHYSICS ENGINE
// ==========================================
class ConfettiParticle {
  constructor(startX, startY) {
    this.x = startX;
    this.y = startY;

    // Radial explosion vector physics
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 3;

    this.width = Math.random() * 6 + 6;
    this.height = Math.random() * 10 + 8;

    const colorPalettes = ['#fbbf24', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6'];
    this.color = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() * 0.2 - 0.1);
    this.gravity = 0.18;
    this.drag = 0.98;
    this.opacity = 1.0;
    this.life = Math.random() * 60 + 80;
  }

  update() {
    this.vx *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;
    this.life--;

    // Smooth opacity fading
    if (this.life < 30) {
      this.opacity = this.life / 30;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }
}

// ==========================================
// VANILLA JS ES6 COMPONENT CLASS
// ==========================================
class CardGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Target internal drawing resolution representing 16:9 ratio
    this.baseWidth = 800;
    this.baseHeight = 450;
    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;

    // Configuration
    this.cardWidth = 100;
    this.cardHeight = 150;
    this.cardY = 150;
    this.slotsX = [90, 220, 350, 480, 610];

    // State Engines
    this.cards = [];
    this.particles = [];
    this.isGameOver = false;
    this.hasWon = false;
    
    this.state = 'playing'; 
    this.resetPhase = 'idle';

    this.shakeTimer = 0;
    this.shakeIntensity = 8;

    this.confettiTimer = 0;
    this.winningSourcePoints = [];

    this.bgDust = [];
    this.initBgDust();

    this.init();
    
    this.boundClick = this.handleClick.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.canvas.addEventListener('mousedown', this.boundClick);
    this.canvas.addEventListener('mousemove', this.boundMouseMove);

    this.destroyed = false;
    this.loop();
  }

  initBgDust() {
    for (let i = 0; i < 20; i++) {
      this.bgDust.push({
        x: Math.random() * this.baseWidth,
        y: Math.random() * this.baseHeight,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.1 + 0.05
      });
    }
  }

  init() {
    const deckPool = ['skull', 'star', 'star', 'heart', 'heart'];
    this.shuffle(deckPool);

    this.cards = [];
    for (let i = 0; i < 5; i++) {
      this.cards.push({
        id: i,
        currentX: 350 - i * 2,
        currentY: 150 - i * 2,
        targetX: this.slotsX[i],
        targetY: this.cardY,
        width: this.cardWidth,
        height: this.cardHeight,
        faceValue: deckPool[i],
        flipProgress: 0,
        flipTarget: 0,
        wasChecked: false,
        isHovered: false,
        hoverOffset: 0
      });
    }
    
    this.state = 'resetting';
    this.resetPhase = 'dealing';
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  gameEnd() {
    return this.isGameOver;
  }

  didWin() {
    return this.isGameOver && this.hasWon;
  }

  reset() {
    if (this.state === 'resetting') return;

    this.state = 'resetting';
    this.resetPhase = 'flipping_down';
    this.isGameOver = false;
    this.hasWon = false;
    this.particles = [];

    this.cards.forEach(card => {
      card.flipTarget = 0;
      card.wasChecked = false;
      card.isHovered = false;
    });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.baseWidth / rect.width;
    const scaleY = this.baseHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  handleMouseMove(e) {
    if (this.state !== 'playing') {
      this.canvas.style.cursor = 'default';
      return;
    }

    const mouse = this.getMousePos(e);
    let anyHovered = false;

    this.cards.forEach(card => {
      const cardYOffset = card.currentY - card.hoverOffset;
      const inside = mouse.x >= card.currentX && 
                     mouse.x <= card.currentX + card.width &&
                     mouse.y >= cardYOffset && 
                     mouse.y <= cardYOffset + card.height;

      if (inside && card.flipTarget === 0) {
        card.isHovered = true;
        anyHovered = true;
      } else {
        card.isHovered = false;
      }
    });

    this.canvas.style.cursor = anyHovered ? 'pointer' : 'default';
  }

  handleClick(e) {
    if (this.state !== 'playing') return;

    const mouse = this.getMousePos(e);

    this.cards.forEach(card => {
      const cardYOffset = card.currentY - card.hoverOffset;
      const inside = mouse.x >= card.currentX && 
                     mouse.x <= card.currentX + card.width &&
                     mouse.y >= cardYOffset && 
                     mouse.y <= cardYOffset + card.height;

      if (inside && card.flipTarget === 0) {
        card.flipTarget = 1;
        card.isHovered = false;
      }
    });
  }

  update() {
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
    }

    this.bgDust.forEach(dust => {
      dust.y -= dust.speed;
      if (dust.y < -5) {
        dust.y = this.baseHeight + 5;
        dust.x = Math.random() * this.baseWidth;
      }
    });

    this.cards.forEach(card => {
      card.currentX += (card.targetX - card.currentX) * 0.12;
      card.currentY += (card.targetY - card.currentY) * 0.12;

      if (card.flipProgress !== card.flipTarget) {
        const step = 0.07;
        if (card.flipProgress < card.flipTarget) {
          card.flipProgress = Math.min(card.flipTarget, card.flipProgress + step);
        } else {
          card.flipProgress = Math.max(card.flipTarget, card.flipProgress - step);
        }
      }

      const targetHover = card.isHovered ? 12 : 0;
      card.hoverOffset += (targetHover - card.hoverOffset) * 0.15;

      if (card.flipTarget === 1 && card.flipProgress === 1 && !card.wasChecked) {
        card.wasChecked = true;
        this.evaluateBoard(card);
      }
    });

    if (this.state === 'resetting') {
      if (this.resetPhase === 'flipping_down') {
        const allFaceDown = this.cards.every(c => c.flipProgress === 0);
        if (allFaceDown) {
          this.resetPhase = 'gathering';
          this.cards.forEach((card, i) => {
            card.targetX = 350 - i * 2;
            card.targetY = 150 - i * 2;
          });
        }
      } 
      else if (this.resetPhase === 'gathering') {
        const allGathered = this.cards.every(c => 
          Math.abs(c.currentX - c.targetX) < 1 && 
          Math.abs(c.currentY - c.targetY) < 1
        );
        if (allGathered) {
          const deckPool = ['skull', 'star', 'star', 'heart', 'heart'];
          this.shuffle(deckPool);
          this.cards.forEach((card, i) => {
            card.faceValue = deckPool[i];
            card.targetX = this.slotsX[i];
            card.targetY = this.cardY;
          });
          this.resetPhase = 'dealing';
        }
      } 
      else if (this.resetPhase === 'dealing') {
        const allDealt = this.cards.every(c => 
          Math.abs(c.currentX - c.targetX) < 0.5 && 
          Math.abs(c.currentY - c.targetY) < 0.5
        );
        if (allDealt) {
          this.cards.forEach(card => {
            card.currentX = card.targetX;
            card.currentY = card.targetY;
          });
          this.state = 'playing';
          this.resetPhase = 'idle';
        }
      }
    }

    if (this.state === 'won' && this.confettiTimer > 0) {
      this.confettiTimer--;
      if (this.confettiTimer > 30) {
        for (let i = 0; i < 3; i++) {
          const src = this.winningSourcePoints[Math.floor(Math.random() * this.winningSourcePoints.length)];
          this.particles.push(new ConfettiParticle(src.x, src.y));
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0 || p.y > this.baseHeight + 15) {
        this.particles.splice(i, 1);
      }
    }
  }

  evaluateBoard(newlyFlippedCard) {
    if (newlyFlippedCard.faceValue === 'skull') {
      this.isGameOver = true;
      this.hasWon = false;
      this.state = 'lost';
      this.shakeTimer = 35;
      return;
    }

    const matchingCard = this.cards.find(c => 
      c !== newlyFlippedCard && 
      c.flipTarget === 1 && 
      c.faceValue === newlyFlippedCard.faceValue
    );

    if (matchingCard) {
      this.isGameOver = true;
      this.hasWon = true;
      this.state = 'won';
      this.confettiTimer = 180;

      this.winningSourcePoints = [
        { x: newlyFlippedCard.currentX + this.cardWidth / 2, y: newlyFlippedCard.currentY + this.cardHeight / 2 },
        { x: matchingCard.currentX + this.cardWidth / 2, y: matchingCard.currentY + this.cardHeight / 2 }
      ];

      for (let i = 0; i < 80; i++) {
        const src = this.winningSourcePoints[i % 2];
        this.particles.push(new ConfettiParticle(src.x, src.y));
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.baseWidth, this.baseHeight);
    this.ctx.save();

    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    const grad = this.ctx.createRadialGradient(
      this.baseWidth/2, this.baseHeight/2, 50, 
      this.baseWidth/2, this.baseHeight/2, this.baseWidth
    );
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#090d16');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    this.ctx.fillStyle = '#f8fafc';
    this.bgDust.forEach(dust => {
      this.ctx.globalAlpha = dust.alpha;
      this.ctx.beginPath();
      this.ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.baseWidth; i += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.baseHeight);
      this.ctx.stroke();
    }

    this.cards.forEach(card => {
      this.drawCard(card);
    });

    if (this.isGameOver) {
      this.drawStatusOverlay();
    }

    this.particles.forEach(p => p.draw(this.ctx));

    this.ctx.restore();
  }

  drawCard(card) {
    this.ctx.save();

    const cardYOffset = card.currentY - card.hoverOffset;
    this.ctx.translate(card.currentX + card.width / 2, cardYOffset + card.height / 2);

    const scaleX = Math.abs(Math.cos(card.flipProgress * Math.PI));
    this.ctx.scale(scaleX, 1);

    if (card.isHovered) {
      this.ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      this.ctx.shadowBlur = 18;
    }

    if (card.flipProgress < 0.5) {
      this.drawCardBack(-card.width / 2, -card.height / 2, card.width, card.height);
    } else {
      this.drawCardFront(-card.width / 2, -card.height / 2, card.width, card.height, card.faceValue);
    }

    this.ctx.restore();
  }

  drawCardBack(x, y, w, h) {
    this.ctx.fillStyle = '#111827';
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 8);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    this.ctx.beginPath();
    this.ctx.arc(x + w / 2, y + h / 2, 22, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + w / 2 - 28, y + h / 2);
    this.ctx.lineTo(x + w / 2 + 28, y + h / 2);
    this.ctx.moveTo(x + w / 2, y + h / 2 - 28);
    this.ctx.lineTo(x + w / 2, y + h / 2 + 28);
    this.ctx.stroke();
  }

  drawCardFront(x, y, w, h, val) {
    this.ctx.fillStyle = '#f8fafc';
    this.ctx.strokeStyle = '#334155';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, 12);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 8);
    this.ctx.stroke();

    this.drawVectorIcon(x + w / 2, y + h / 2, val);
  }

  drawVectorIcon(cx, cy, value) {
    this.ctx.save();
    this.ctx.translate(cx, cy);

    if (value === 'star') {
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.strokeStyle = '#b45309';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      const spikes = 5;
      const outerR = 26;
      const innerR = 11;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      this.ctx.moveTo(0, -outerR);
      for (let i = 0; i < spikes; i++) {
        this.ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR);
        rot += step;
        this.ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR);
        rot += step;
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } 
    else if (value === 'heart') {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.strokeStyle = '#b91c1c';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -8);
      this.ctx.bezierCurveTo(-15, -24, -30, -5, 0, 22);
      this.ctx.bezierCurveTo(30, -5, 15, -24, 0, -8);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } 
    else if (value === 'skull') {
      this.ctx.fillStyle = '#334155';
      this.ctx.strokeStyle = '#0f172a';
      this.ctx.lineWidth = 2;

      this.ctx.beginPath();
      this.ctx.arc(0, -6, 18, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.roundRect(-10, 5, 20, 14, 4);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#334155';
      this.ctx.beginPath();
      this.ctx.rect(-9, 0, 18, 10);
      this.ctx.fill();

      this.ctx.fillStyle = '#f8fafc';
      this.ctx.beginPath();
      this.ctx.arc(-6, -5, 5, 0, Math.PI * 2);
      this.ctx.arc(6, -5, 5, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#0f172a';
      this.ctx.beginPath();
      this.ctx.moveTo(0, 2);
      this.ctx.lineTo(-3, 6);
      this.ctx.lineTo(3, 6);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = '#f8fafc';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(-4, 11); this.ctx.lineTo(-4, 16);
      this.ctx.moveTo(0, 11);  this.ctx.lineTo(0, 16);
      this.ctx.moveTo(4, 11);  this.ctx.lineTo(4, 16);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawStatusOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(11, 15, 25, 0.4)';
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);

    this.ctx.font = '900 36px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.hasWon) {
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText('MATCH COMPLETED!', this.baseWidth / 2, 50);
    } else {
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillText('SKULL UNCOVERED!', this.baseWidth / 2, 50);
    }
    this.ctx.restore();
  }

  loop() {
    if (this.destroyed) return;
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrameId);
    this.canvas.removeEventListener('mousedown', this.boundClick);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
  }
}
