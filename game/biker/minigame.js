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
        this.particles = [];

        // Engine State Tree Machine: 'ROUND_START' | 'ACTIVE' | 'BETWEEN_ROUNDS' | 'SHOP' | 'GAMEOVER_DRUNK' | 'GAMEOVER_WIN'
        this.state = 'ROUND_START';

        this.resetRound();
    }

    resetRound() {
        this.roundPrizeMoney = MiniGameData.gameplay.startPrizeMoney;
        this.knifeSystem.reset();

        // Dynamically scale Mahjong tiles to increase difficulty each round (starts at 3)
        const tileCount = Math.min(7, 2 + this.currentRound);
        this.tileSystem.generateTiles(tileCount);
    }

    spawnParticle(text, x, y, color = '#f59e0b') {
        this.particles.push({
            text, x, y, color,
            vy: -65, opacity: 1.0, life: 1.2
        });
    }

    triggerRoundFail(reason) {
        this.drunkMeter += MiniGameData.gameplay.drinkPenalty;
        this.spawnParticle(`FAILED: ${reason.toUpperCase()}`, this.width / 2, this.height * 0.4, '#ef4444');
        this.spawnParticle(`+${MiniGameData.gameplay.drinkPenalty}% DRUNK PENALTY`, this.width / 2, this.height * 0.45, '#f43f5e');

        if (this.drunkMeter >= 100) {
            this.state = 'GAMEOVER_DRUNK';
        } else {
            this.state = 'BETWEEN_ROUNDS';
        }
    }

    triggerRoundSuccess() {
        this.totalCashEarned += this.roundPrizeMoney;
        this.spawnParticle(`ROUND WIN! COCKTAIL DELAYED`, this.width / 2, this.height * 0.4, '#22c55e');
        this.spawnParticle(`+$${this.roundPrizeMoney} SAVED`, this.width / 2, this.height * 0.45, '#4ade80');

        if (this.totalCashEarned >= MiniGameData.gameplay.winMoneyTarget) {
            this.state = 'GAMEOVER_WIN';
        } else {
            this.currentRound++;
            this.state = 'BETWEEN_ROUNDS';
        }
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.baseScale = this.width / MiniGameData.config.defaultWidth;
    }

    handleMouseMove(x, y) { }

    handleMouseDown(x, y) {
        const scale = this.baseScale;

        if (this.state === 'ROUND_START') {
            this.state = 'ACTIVE';
            this.resetRound();
            return;
        }

        if (this.state === 'BETWEEN_ROUNDS') {
            const btnY = this.height / 2 + 60 * scale;
            const btnW = 180 * scale;
            const btnH = 50 * scale;

            // Target Next Round Check Area
            const nrx = this.width / 2 - 200 * scale;
            if (x >= nrx && x <= nrx + btnW && y >= btnY && y <= btnY + btnH) {
                this.state = 'ACTIVE';
                this.resetRound();
                return;
            }

            // Target Shop Call Box Area
            const sx = this.width / 2 + 20 * scale;
            if (x >= sx && x <= sx + btnW && y >= btnY && y <= btnY + btnH) {
                this.state = 'SHOP';
                return;
            }
            return;
        }

        if (this.state === 'SHOP') {
            this.shopSystem.handleMouseDown(x, y);
            return;
        }

        if (this.state === 'ACTIVE') {
            // Check Knife clicks before processing Mahjong grid selections
            if (this.knifeSystem.handleClick(x, y)) return;
            this.tileSystem.handleClick(x, y);
            return;
        }

        if (this.state === 'GAMEOVER_DRUNK' || this.state === 'GAMEOVER_WIN') {
            this.totalCashEarned = 0;
            this.drunkMeter = MiniGameData.gameplay.initialDrunk;
            this.currentRound = 1;
            this.state = 'ROUND_START';
            return;
        }
    }

    handleMouseUp(x, y) { }

    update(dt) {
        // Particle Engine Processing
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.vy * dt;
            p.life -= dt;
            p.opacity = Math.max(0, p.life / 1.2);
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        if (this.state === 'ACTIVE') {
            // Handle slow natural sobering decay over time
            this.drunkMeter = Math.max(0, this.drunkMeter - MiniGameData.gameplay.drunkDrainRate * dt);
            this.knifeSystem.update(dt);

            // Prize money acts as the round timer
            if (this.roundPrizeMoney <= 0) {
                this.triggerRoundFail("Ran out of round funds!");
            }
        }
    }

    draw(ctx) {
        const scale = this.baseScale;

        // Gritty Biker Bar Canvas Background Textures
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Bar Counter Board Styling Elements
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, this.width, 65 * scale);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, this.height - 35 * scale, this.width, 35 * scale);

        if (this.state === 'ACTIVE') {
            this.knifeSystem.draw(ctx);
            this.tileSystem.draw(ctx);
        }

        // Render Dashboard Metrics Row UI
        this.drawDashboard(ctx);

        // State Machine Text Overlay Renderer
        if (this.state === 'ROUND_START') {
            this.drawFullScreenOverlay(ctx, `ROUND ${this.currentRound}`, 'CLICK ANYWHERE TO JUGGLE KNIVES & SORT TILES');
        } else if (this.state === 'BETWEEN_ROUNDS') {
            this.drawBetweenRoundsMenu(ctx);
        } else if (this.state === 'SHOP') {
            this.shopSystem.draw(ctx);
        } else if (this.state === 'GAMEOVER_DRUNK') {
            this.drawFullScreenOverlay(ctx, 'WASTED!', 'YOU PASSED OUT ON THE BAR COUCH. CLICK TO RESET.', '#ef4444');
        } else if (this.state === 'GAMEOVER_WIN') {
            this.drawFullScreenOverlay(ctx, 'BAR LEGEND!', `YOU RETIRED WITH $${this.totalCashEarned}! CLICK TO REPLAY.`, '#22c55e');
        }

        // Render Active Flying Particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.font = `900 ${Math.round(20 * scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        });
    }

    drawDashboard(ctx) {
        const scale = this.baseScale;

        // Render Bank balances info
        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(18 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(`TOTAL CASH: $${this.totalCashEarned} / $1000`, 20 * scale, 38 * scale);

        if (this.state === 'ACTIVE') {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`ROUND POT: $${this.roundPrizeMoney}`, 360 * scale, 38 * scale);
            ctx.fillStyle = '#94a3b8';
            ctx.font = `700 ${Math.round(12 * scale)}px monospace`;
            ctx.fillText('(LOSE $1 PER FLIP CLICK)', 540 * scale, 36 * scale);
        }

        // Drunk Status Indicator Rendering Box Layouts
        const barW = 220 * scale;
        const barH = 18 * scale;
        const bx = this.width - barW - 20 * scale;
        const by = 24 * scale;

        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(bx, by, barW, barH);

        const fillPct = this.drunkMeter / 100;
        ctx.fillStyle = (this.drunkMeter > 75) ? '#dc2626' : (this.drunkMeter > 45 ? '#f59e0b' : '#22c55e');
        ctx.fillRect(bx, by, barW * fillPct, barH);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(bx, by, barW, barH);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(12 * scale)}px monospace`;
        ctx.textAlign = 'right';
        ctx.fillText(`DRUNKENNESS: ${Math.round(this.drunkMeter)}%`, bx - 12 * scale, 37 * scale);
    }

    drawFullScreenOverlay(ctx, headerText, subText, color = '#f59e0b') {
        const scale = this.baseScale;
        ctx.save();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = color;
        ctx.font = `900 ${Math.round(52 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(headerText, this.width / 2, this.height / 2 - 15 * scale);

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.round(16 * scale)}px monospace`;
        ctx.fillText(subText, this.width / 2, this.height / 2 + 35 * scale);
        ctx.restore();
    }

    drawBetweenRoundsMenu(ctx) {
        const scale = this.baseScale;
        ctx.save();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = '#f59e0b';
        ctx.font = `900 ${Math.round(38 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('ROUND SUMMARY INTERMISSION', this.width / 2, this.height / 2 - 50 * scale);

        const btnY = this.height / 2 + 60 * scale;
        const btnW = 180 * scale;
        const btnH = 50 * scale;

        // Draw Next Round Prompt Option
        const nrx = this.width / 2 - 200 * scale;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(nrx, btnY, btnW, btnH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(15 * scale)}px monospace`;
        ctx.fillText('START NEXT ROUND', nrx + btnW / 2, btnY + 30 * scale);

        // Draw Buy Snack Depot Option
        const sx = this.width / 2 + 20 * scale;
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(sx, btnY, btnW, btnH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('BUY BAR SNACKS', sx + btnW / 2, btnY + 30 * scale);
        ctx.restore();
    }
}