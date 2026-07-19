class MiniGame {
    constructor(config = {}) {
        const d = MiniGameData;
        this.width = config.width || d.config.defaultWidth;
        this.height = config.height || d.config.defaultHeight;
        this.baseScale = this.width / d.config.defaultWidth;

        // Subsystem Instantiations
        this.knifeSystem = new KnifeSystem(this);
        this.tileSystem = new TileSystem(this);
        this.shopSystem = new ShopSystem(this);

        // Master Player Account Tracking Profiles
        this.totalCashEarned = 0;
        this.drunkMeter = d.gameplay.initialDrunk;
        this.currentRound = 1;

        // Juice Effects Engine
        this.particles = [];
        this.screenShake = 0;
        this.fxTimer = 0;
        this.fxTargetState = '';

        // Global Interactive Juicy Buttons
        this.startBtn = new ArcadeButton({ text: 'START ROUND', themeColor: '#39ff14', glowColor: '#00ff66' });
        this.nextRoundBtn = new ArcadeButton({ text: 'NEXT ROUND', themeColor: '#39ff14', glowColor: '#00ff66' });
        this.openShopBtn = new ArcadeButton({ text: 'BUY SNACKS', themeColor: '#00f0ff', glowColor: '#00ffff' });
        this.restartBtn = new ArcadeButton({ text: 'PLAY AGAIN', themeColor: '#ff007f', glowColor: '#ff00ff' });

        this.state = 'ROUND_START';
        this.resize(this.width, this.height);
        this.resetRound();
    }

    resetRound() {
        this.roundPrizeMoney = MiniGameData.gameplay.startPrizeMoney;
        this.knifeSystem.reset();
        const tileCount = Math.min(7, 2 + this.currentRound);
        this.tileSystem.generateTiles(tileCount);
    }

    spawnParticle(text, x, y, color = '#f59e0b') {
        this.particles.push({
            text, x, y, color,
            vy: -75, opacity: 1.0, life: 1.2
        });
    }

    spawnJuiceExplosion(x, y, color, count = 25) {
        for (let i = 0; i < count; i++) {
            const p = new CanParticle();
            p.reset(x, y, color);
            this.particles.push(p);
        }
    }

    triggerRoundFail(reason) {
        this.drunkMeter += MiniGameData.gameplay.drinkPenalty;
        this.screenShake = 24; // Heavy drop impact rumble
        this.fxTimer = 1.2;    // Delay feedback menu screen
        this.state = 'FX_LOSE';

        // Explode failure shards from center stage
        this.spawnJuiceExplosion(this.width / 2, this.height / 2, '#ef4444', 35);
        this.spawnParticle(`CRASH: ${reason.toUpperCase()}`, this.width / 2, this.height * 0.35, '#ef4444');

        if (this.drunkMeter >= 100) {
            this.fxTargetState = 'GAMEOVER_DRUNK';
        } else {
            this.fxTargetState = 'BETWEEN_ROUNDS';
        }
    }

    triggerRoundSuccess() {
        this.totalCashEarned += this.roundPrizeMoney;
        this.screenShake = 12; // Satisfying victory pop rumble
        this.fxTimer = 1.2;
        this.state = 'FX_WIN';

        // Explode golden wealth shards across the layout
        this.spawnJuiceExplosion(this.width / 2, this.height * 0.75, '#39ff14', 40);
        this.spawnParticle('SEQUENCE COMPLETE!', this.width / 2, this.height * 0.35, '#39ff14');

        if (this.totalCashEarned >= MiniGameData.gameplay.winMoneyTarget) {
            this.fxTargetState = 'GAMEOVER_WIN';
        } else {
            this.currentRound++;
            this.fxTargetState = 'BETWEEN_ROUNDS';
        }
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.baseScale = this.width / MiniGameData.config.defaultWidth;
        const scale = this.baseScale;

        // Position full arcade button frames dynamically
        this.startBtn.setPosition(this.width / 2, this.height / 2 + 80 * scale, 220 * scale, 55 * scale, scale);
        this.nextRoundBtn.setPosition(this.width / 2 - 130 * scale, this.height / 2 + 80 * scale, 220 * scale, 55 * scale, scale);
        this.openShopBtn.setPosition(this.width / 2 + 130 * scale, this.height / 2 + 80 * scale, 220 * scale, 55 * scale, scale);
        this.restartBtn.setPosition(this.width / 2, this.height / 2 + 80 * scale, 220 * scale, 55 * scale, scale);

        this.shopSystem.resize(w, h);
    }

    handleMouseMove(mx, my) {
        if (this.state === 'ROUND_START') this.startBtn.handleMouseMove(mx, my);
        if (this.state === 'BETWEEN_ROUNDS') {
            this.nextRoundBtn.handleMouseMove(mx, my);
            this.openShopBtn.handleMouseMove(mx, my);
        }
        if (this.state === 'SHOP') this.shopSystem.handleMouseMove(mx, my);
        if (this.state === 'GAMEOVER_DRUNK' || this.state === 'GAMEOVER_WIN') this.restartBtn.handleMouseMove(mx, my);
    }

    handleMouseDown(mx, my) {
        if (this.state === 'ROUND_START') {
            this.startBtn.handleMouseDown(mx, my);
        } else if (this.state === 'BETWEEN_ROUNDS') {
            this.nextRoundBtn.handleMouseDown(mx, my);
            this.openShopBtn.handleMouseDown(mx, my);
        } else if (this.state === 'SHOP') {
            this.shopSystem.handleMouseDown(mx, my);
        } else if (this.state === 'GAMEOVER_DRUNK' || this.state === 'GAMEOVER_WIN') {
            this.restartBtn.handleMouseDown(mx, my);
        } else if (this.state === 'ACTIVE') {
            if (this.knifeSystem.handleClick(mx, my)) return;
            this.tileSystem.handleClick(mx, my);
        }
    }

    handleMouseUp(mx, my) {
        if (this.state === 'ROUND_START') {
            this.startBtn.handleMouseUp(mx, my, () => {
                this.state = 'ACTIVE';
                this.resetRound();
            });
        } else if (this.state === 'BETWEEN_ROUNDS') {
            this.nextRoundBtn.handleMouseUp(mx, my, () => {
                this.state = 'ACTIVE';
                this.resetRound();
            });
            this.openShopBtn.handleMouseUp(mx, my, () => {
                this.state = 'SHOP';
            });
        } else if (this.state === 'SHOP') {
            this.shopSystem.handleMouseUp(mx, my);
        } else if (this.state === 'GAMEOVER_DRUNK' || this.state === 'GAMEOVER_WIN') {
            this.restartBtn.handleMouseUp(mx, my, () => {
                this.totalCashEarned = 0;
                this.drunkMeter = MiniGameData.gameplay.initialDrunk;
                this.currentRound = 1;
                this.state = 'ROUND_START';
            });
        }
    }

    update(dt) {
        if (this.screenShake > 0.1) this.screenShake *= 0.9;

        // Process Interactive Button Physics
        this.startBtn.update(dt);
        this.nextRoundBtn.update(dt);
        this.openShopBtn.update(dt);
        this.restartBtn.update(dt);

        // Update active custom animation particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p instanceof CanParticle) {
                p.update(dt);
                if (!p.active) this.particles.splice(i, 1);
            } else {
                p.y += p.vy * dt;
                p.life -= dt;
                p.opacity = Math.max(0, p.life / 1.2);
                if (p.life <= 0) this.particles.splice(i, 1);
            }
        }

        // Handle Visual Intermediate Transition Frames
        if (this.state === 'FX_WIN' || this.state === 'FX_LOSE') {
            this.fxTimer -= dt;
            if (this.state === 'FX_LOSE') this.screenShake = Math.max(this.screenShake, 6);
            if (this.fxTimer <= 0) {
                this.state = this.fxTargetState;
            }
            return;
        }

        if (this.state === 'ACTIVE') {
            this.drunkMeter = Math.max(0, this.drunkMeter - MiniGameData.gameplay.drunkDrainRate * dt);
            this.knifeSystem.update(dt);
            if (this.roundPrizeMoney <= 0) {
                this.triggerRoundFail("Cash run dry");
            }
        }
    }

    draw(ctx) {
        const scale = this.baseScale;

        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }

        // Draw Base Atmosphere
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, this.width, 65 * scale);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, this.height - 35 * scale, this.width, 35 * scale);

        if (this.state === 'ACTIVE' || this.state === 'FX_WIN' || this.state === 'FX_LOSE') {
            this.knifeSystem.draw(ctx);
            this.tileSystem.draw(ctx);
        }

        this.drawDashboard(ctx);

        if (this.state === 'FX_WIN') {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
            ctx.fillRect(0, 0, this.width, this.height);
        } else if (this.state === 'FX_LOSE') {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
            ctx.fillRect(0, 0, this.width, this.height);
        }

        if (this.state === 'ROUND_START') {
            this.drawWindowOverlay(ctx, `ROUND ${this.currentRound}`, 'JUGGLE THE BLADE & SORT THE MAHJONG TILES');
            this.startBtn.draw(ctx);
        } else if (this.state === 'BETWEEN_ROUNDS') {
            this.drawWindowOverlay(ctx, 'ROUND OVER', 'REDUCE DRUNKENNESS AT THE SHOP OR PUSH FORWARD');
            this.nextRoundBtn.draw(ctx);
            this.openShopBtn.draw(ctx);
        } else if (this.state === 'SHOP') {
            this.shopSystem.draw(ctx);
        } else if (this.state === 'GAMEOVER_DRUNK') {
            this.drawWindowOverlay(ctx, 'WASTED!', 'YOU PASSED OUT ON THE COUCH', '#ef4444');
            this.restartBtn.draw(ctx);
        } else if (this.state === 'GAMEOVER_WIN') {
            this.drawWindowOverlay(ctx, 'BAR CHAMP!', `RETIRED SAFELY WITH $${this.totalCashEarned}`, '#39ff14');
            this.restartBtn.draw(ctx);
        }

        // Corrected Unified Particle Render Loop
        this.particles.forEach(p => {
            if (p instanceof CanParticle) {
                p.draw(ctx);
            } else {
                ctx.save();
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.font = `900 ${Math.round(20 * scale)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            }
        });

        ctx.restore();
    }

    drawDashboard(ctx) {
        const scale = this.baseScale;
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(18 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`CASH: $${this.totalCashEarned} / $1000`, 20 * scale, 38 * scale);

        if (this.state === 'ACTIVE') {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`ROUND VALUE: $${this.roundPrizeMoney}`, 360 * scale, 38 * scale);
        }

        const barW = 220 * scale;
        const barH = 18 * scale;
        const bx = this.width - barW - 20 * scale;
        const by = 24 * scale;

        ctx.fillStyle = '#27272a';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = (this.drunkMeter > 75) ? '#ef4444' : (this.drunkMeter > 45 ? '#f59e0b' : '#39ff14');
        ctx.fillRect(bx, by, barW * (this.drunkMeter / 100), barH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(bx, by, barW, barH);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(12 * scale)}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`BLOOD ALCOHOL: ${Math.round(this.drunkMeter)}%`, bx - 12 * scale, 37 * scale);
    }

    drawWindowOverlay(ctx, head, sub, color = '#f59e0b') {
        const scale = this.baseScale;
        ctx.fillStyle = 'rgba(9, 9, 11, 0.75)';
        ctx.fillRect(0, 65 * scale, this.width, this.height - 100 * scale);

        ctx.fillStyle = color;
        ctx.font = `900 ${Math.round(48 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(head, this.width / 2, this.height / 2 - 25 * scale);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `700 ${Math.round(14 * scale)}px monospace`;
        ctx.fillText(sub, this.width / 2, this.height / 2 + 25 * scale);
    }
}