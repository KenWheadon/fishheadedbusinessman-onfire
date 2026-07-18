class ConfettiParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = Math.random() * 8 + 4;
    this.h = Math.random() * 6 + 3;
    const colors = ['#ff4e50', '#f9d423', '#00ffff', '#ff007f', '#39ff14', '#bd00ff'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 250 + 100;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 150;
    this.gravity = 500;
    this.drag = 0.98;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 10;
    this.life = 1.5 + Math.random() * 1.5;
    this.maxLife = this.life;
  }

  update(dt) {
    const safeDt = dt !== undefined ? dt : 1 / 60;
    this.vy += this.gravity * safeDt;
    this.vx *= Math.pow(this.drag, safeDt * 60);
    this.vy *= Math.pow(this.drag, safeDt * 60);
    this.x += this.vx * safeDt;
    this.y += this.vy * safeDt;
    this.rotation += this.rotSpeed * safeDt;
    this.life -= safeDt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.restore();
  }
}

class CardGame {
  constructor(config = {}) {
    this.width = config.width || 800;
    this.height = config.height || 450;
    this.baseWidth = 800;
    this.baseHeight = 450;

    // Initial scale values
    this.scaleX = this.width / this.baseWidth;
    this.scaleY = this.height / this.baseHeight;

    this.cardWidth = 100;
    this.cardHeight = 150;
    this.cardY = 150;
    this.slotsX = [90, 220, 350, 480, 610];

    this.cards = [];
    this.particles = [];
    this.isGameOver = true;
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
  }

  /**
   * Adjusts inner matrix transformations to scale fluidly
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.scaleX = this.width / this.baseWidth;
    this.scaleY = this.height / this.baseHeight;
  }

  initBgDust() {
    this.bgDust = [];
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

  gameEnd() { return this.isGameOver; }
  didWin() { return this.isGameOver && this.hasWon; }

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

  handleMouseMove(localX, localY) {
    if (this.state !== 'playing') return false;
    const mouseX = localX / this.scaleX;
    const mouseY = localY / this.scaleY;
    let anyHovered = false;

    this.cards.forEach(card => {
      const cardYOffset = card.currentY - card.hoverOffset;
      const inside = mouseX >= card.currentX &&
        mouseX <= card.currentX + card.width &&
        mouseY >= cardYOffset &&
        mouseY <= cardYOffset + card.height;

      if (inside && card.flipTarget === 0) {
        card.isHovered = true;
        anyHovered = true;
      } else {
        card.isHovered = false;
      }
    });
    return anyHovered;
  }

  handleMouseClick(localX, localY) {
    if (this.state !== 'playing') return;
    const mouseX = localX / this.scaleX;
    const mouseY = localY / this.scaleY;

    this.cards.forEach(card => {
      const cardYOffset = card.currentY - card.hoverOffset;
      const inside = mouseX >= card.currentX &&
        mouseX <= card.currentX + card.width &&
        mouseY >= cardYOffset &&
        mouseY <= cardYOffset + card.height;

      if (inside && card.flipTarget === 0) {
        card.flipTarget = 1;
        card.isHovered = false;
      }
    });
  }

  update(dt) {
    const t = dt !== undefined ? dt * 60 : 1;
    if (this.shakeTimer > 0) this.shakeTimer -= t;

    this.bgDust.forEach(dust => {
      dust.y -= dust.speed * t;
      if (dust.y < -5) {
        dust.y = this.baseHeight + 5;
        dust.x = Math.random() * this.baseWidth;
      }
    });

    this.cards.forEach(card => {
      card.currentX += (card.targetX - card.currentX) * (1 - Math.pow(1 - 0.12, t));
      card.currentY += (card.targetY - card.currentY) * (1 - Math.pow(1 - 0.12, t));

      if (card.flipProgress !== card.flipTarget) {
        const step = 0.07 * t;
        if (card.flipProgress < card.flipTarget) {
          card.flipProgress = Math.min(card.flipTarget, card.flipProgress + step);
        } else {
          card.flipProgress = Math.max(card.flipTarget, card.flipProgress - step);
        }
      }

      const targetHover = card.isHovered ? 12 : 0;
      card.hoverOffset += (targetHover - card.hoverOffset) * (1 - Math.pow(1 - 0.15, t));

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
      } else if (this.resetPhase === 'gathering') {
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
      } else if (this.resetPhase === 'dealing') {
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
      this.confettiTimer -= t;
      if (this.confettiTimer > 30) {
        const count = Math.round(3 * t);
        for (let i = 0; i < count; i++) {
          const src = this.winningSourcePoints[Math.floor(Math.random() * this.winningSourcePoints.length)];
          this.particles.push(new ConfettiParticle(src.x, src.y));
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
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

  draw(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, this.width, this.height);
    ctx.clip();
    ctx.scale(this.scaleX, this.scaleY);

    if (this.shakeTimer > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(dx, dy);
    }

    // Floating background ambient dust
    ctx.fillStyle = '#f8fafc';
    this.bgDust.forEach(dust => {
      ctx.save();
      ctx.globalAlpha = dust.alpha;
      ctx.beginPath();
      ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Subtle background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.baseWidth; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.baseHeight); ctx.stroke();
    }

    // Dynamic prompt instruction layout logic
    if (this.state === 'playing') {
      ctx.save();
      ctx.font = '700 20px system-ui';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text stroke for legibility against dynamic backgrounds
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.strokeText('FLIP 2 MATCH 2', this.baseWidth / 2, 95);

      ctx.fillText('FLIP 2 MATCH 2', this.baseWidth / 2, 95);
      ctx.restore();
    }

    this.cards.forEach(card => this.drawCard(ctx, card));
    if (this.isGameOver) this.drawStatusOverlay(ctx);
    this.particles.forEach(p => p.draw(ctx));
    ctx.restore();
  }

  drawCard(ctx, card) {
    ctx.save();
    const cardYOffset = card.currentY - card.hoverOffset;
    ctx.translate(card.currentX + card.width / 2, cardYOffset + card.height / 2);
    const scaleX = Math.abs(Math.cos(card.flipProgress * Math.PI));
    ctx.scale(scaleX, 1);

    if (card.isHovered) {
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 18;
    }

    if (card.flipProgress < 0.5) {
      this.drawCardBack(ctx, -card.width / 2, -card.height / 2, card.width, card.height);
    } else {
      this.drawCardFront(ctx, -card.width / 2, -card.height / 2, card.width, card.height, card.faceValue);
    }
    ctx.restore();
  }

  drawCardBack(ctx, x, y, w, h) {
    ctx.fillStyle = '#111827'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 28, y + h / 2); ctx.lineTo(x + w / 2 + 28, y + h / 2);
    ctx.moveTo(x + w / 2, y + h / 2 - 28); ctx.lineTo(x + w / 2, y + h / 2 + 28);
    ctx.stroke();
  }

  drawCardFront(ctx, x, y, w, h, val) {
    ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x + 8, y + 8, w - 16, h - 16, 8); ctx.stroke();
    this.drawVectorIcon(ctx, x + w / 2, y + h / 2, val);
  }

  drawVectorIcon(ctx, cx, cy, value) {
    ctx.save(); ctx.translate(cx, cy);
    if (value === 'star') {
      ctx.fillStyle = '#f59e0b'; ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2;
      ctx.beginPath();
      const spikes = 5, outerR = 26, innerR = 11;
      let rot = (Math.PI / 2) * 3, step = Math.PI / spikes;
      ctx.moveTo(0, -outerR);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outerR, Math.sin(rot) * outerR); rot += step;
        ctx.lineTo(Math.cos(rot) * innerR, Math.sin(rot) * innerR); rot += step;
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (value === 'heart') {
      ctx.fillStyle = '#ef4444'; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -8);
      ctx.bezierCurveTo(-15, -24, -30, -5, 0, 22); ctx.bezierCurveTo(30, -5, 15, -24, 0, -8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (value === 'skull') {
      ctx.fillStyle = '#334155'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -6, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-10, 5, 20, 14, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.rect(-9, 0, 18, 10); ctx.fill();
      ctx.fillStyle = '#f8fafc'; ctx.beginPath();
      ctx.arc(-6, -5, 5, 0, Math.PI * 2); ctx.arc(6, -5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a'; ctx.beginPath();
      ctx.moveTo(0, 2); ctx.lineTo(-3, 6); ctx.lineTo(3, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-4, 11); ctx.lineTo(-4, 16);
      ctx.moveTo(0, 11); ctx.lineTo(0, 16); ctx.moveTo(4, 11); ctx.lineTo(4, 16); ctx.stroke();
    }
    ctx.restore();
  }

  drawStatusOverlay(ctx) {
    ctx.save();
    ctx.font = '900 36px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // Add strokes to the game over messages for visibility across transparent frames
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;

    if (this.hasWon) {
      ctx.fillStyle = '#fbbf24';
      ctx.strokeText('MATCH COMPLETED!', this.baseWidth / 2, 50);
      ctx.fillText('MATCH COMPLETED!', this.baseWidth / 2, 50);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.strokeText('SKULL UNCOVERED!', this.baseWidth / 2, 50);
      ctx.fillText('SKULL UNCOVERED!', this.baseWidth / 2, 50);
    }
    ctx.restore();
  }
}