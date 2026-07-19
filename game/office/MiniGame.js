class MiniGame {
    constructor(config = {}) {
        const d = MiniGameData;
        this.width = config.width || d.config.defaultWidth;
        this.height = config.height || d.config.defaultHeight;
        this.baseScale = this.width / d.config.defaultWidth;
        this.time = 0;

        this.modifiers = { ...d.player.modifiers };
        this.equippedItem = d.player.startingItem;
        this.itemLevels = { ...d.player.initialItemLevels };

        this.throwingSystem = new ThrowingSystem(this);
        this.shopSystem = new ShopSystem(this);

        this.openShopButton = new ArcadeButton({
            text: 'UPGRADES',
            themeColor: '#ffe600',
            glowColor: '#ffcc00'
        });

        this.reset();
    }

    reset() {
        const d = MiniGameData;
        this.state = 'ACTIVE';
        this.playerState = 'THROWING';
        this.isWorkingHeld = false;

        this.score = d.player.initialStats.score;
        this.money = d.player.initialStats.money;
        this.fun = d.player.initialStats.fun;
        this.stealthAlert = d.player.initialStats.stealthAlert;
        this.workDone = d.player.initialStats.workDone;

        this.throwingSystem.cans = [];
        this.particles = [];
        this.screenShake = 0;

        this.focalLength = d.config.focalLength;
        this.horizonX = this.width / 2;
        this.horizonY = this.height * d.config.horizonYRatio;

        this.trashcan = { ...d.layout.trashcan };

        this.boss = {
            state: 'AWAY',
            timer: d.boss.initialTimer,
            x: d.boss.positions.startX,
            y: d.boss.positions.y,
            z: d.boss.positions.z,
            w: d.boss.dimensions.w,
            h: d.boss.dimensions.h,
            targetX: d.boss.positions.startX
        };

        this.resize(this.width, this.height);
    }

    resize(w, h) {
        const d = MiniGameData;
        this.width = w;
        this.height = h;
        this.baseScale = this.width / d.config.defaultWidth;

        this.horizonX = this.width / 2;
        this.horizonY = this.height * d.config.horizonYRatio;

        this.computerHitbox = {
            x: d.layout.computer.xOffset * this.baseScale,
            y: this.height - d.layout.computer.yOffset * this.baseScale,
            w: d.layout.computer.w * this.baseScale,
            h: d.layout.computer.h * this.baseScale
        };

        this.canSpawnX = d.layout.spawn.xOffset * this.baseScale;
        this.canSpawnY = this.height - d.layout.spawn.yOffset * this.baseScale - (this.height * d.layout.spawn.heightRatio);
        this.canInteractionRadius = d.layout.spawn.radius * this.baseScale;

        this.openShopButton.setPosition(
            this.computerHitbox.x + this.computerHitbox.w / 2,
            this.height - d.layout.shopButton.yOffset * this.baseScale,
            d.layout.shopButton.w * this.baseScale,
            d.layout.shopButton.h * this.baseScale,
            this.baseScale
        );

        this.shopSystem.resize(w, h);
    }

    project3D(x, y, z) {
        const scale = this.focalLength / (this.focalLength + z);
        return {
            x: this.horizonX + x * scale * this.baseScale,
            y: this.horizonY + y * scale * this.baseScale,
            scale: scale * this.baseScale
        };
    }

    handleMouseMove(x, y) {
        if (this.state === 'SHOP') {
            this.shopSystem.handleMouseMove(x, y);
            return;
        }
        if (this.state !== 'ACTIVE') return;

        this.openShopButton.handleMouseMove(x, y);
        this.throwingSystem.handleMouseMove(x, y);
    }

    handleMouseDown(x, y) {
        if (this.state === 'SHOP') {
            this.shopSystem.handleMouseDown(x, y);
            return;
        }
        if (this.state !== 'ACTIVE') return;

        if (this.openShopButton.isPointInRect(x, y)) {
            this.openShopButton.handleMouseDown(x, y);
            return;
        }

        if (x >= this.computerHitbox.x && x <= this.computerHitbox.x + this.computerHitbox.w &&
            y >= this.computerHitbox.y && y <= this.computerHitbox.y + this.computerHitbox.h) {
            this.isWorkingHeld = true;
            this.playerState = 'WORKING';
            return;
        }

        this.throwingSystem.handleMouseDown(x, y);
    }

    handleMouseUp(x, y) {
        if (this.state === 'SHOP') {
            this.shopSystem.handleMouseUp(x, y);
            return;
        }

        if (this.isWorkingHeld) {
            this.isWorkingHeld = false;
            this.playerState = 'THROWING';
        }

        if (this.state === 'GAMEOVER') {
            if (x >= this.computerHitbox.x && x <= this.computerHitbox.x + this.computerHitbox.w &&
                y >= this.computerHitbox.y && y <= this.computerHitbox.y + this.computerHitbox.h) {
                this.reset();
            }
            return;
        }

        this.openShopButton.handleMouseUp(x, y, () => {
            this.state = 'SHOP';
            this.shopSystem.updateItemButtonTexts();
        });

        this.throwingSystem.handleMouseUp();
    }

    triggerBossCatch() {
        const d = MiniGameData.boss;
        this.stealthAlert = Math.min(100, this.stealthAlert + (d.catchSuspicionPenalty * this.modifiers.suspicionScale));
        this.screenShake = 12;
        this.spawnParticle('SPOTTED!', this.width / 2, this.height * 0.25, '#ef4444');
        if (this.stealthAlert >= 100) this.state = 'GAMEOVER';
    }

    spawnParticle(text, x, y, color = '#fbbf24') {
        this.particles.push({ text, x, y, color, vy: -70, opacity: 1.0, life: 1.0 });
    }

    update(dt) {
        const d = MiniGameData;
        this.time += dt;
        if (this.screenShake > 0.1) this.screenShake *= 0.88;

        if (this.state === 'SHOP') {
            this.shopSystem.update(dt);
            return;
        }

        if (this.state === 'GAMEOVER') return;

        this.openShopButton.update(dt);

        if (this.playerState === 'WORKING') {
            if (this.fun > 0) {
                this.workDone += dt * d.progression.workDoneRate * this.modifiers.workRate;
                this.money += dt * d.progression.workMoneyRate * this.modifiers.workRate;
                this.fun = Math.max(0, this.fun - dt * d.progression.funDrainRate * this.modifiers.funDrainScale);

                if (this.workDone >= 100) {
                    this.workDone = 0;
                    this.stealthAlert = Math.max(0, this.stealthAlert - d.progression.completionAlertReduction);
                    this.money += d.progression.completionReward;
                    this.spawnParticle(`JOB COMPLETE! +${d.progression.completionReward} PTS`, this.width / 2, this.height * 0.5, '#22c55e');
                }
            } else {
                if (this.boss.state === 'LOOKING') {
                    this.stealthAlert = Math.min(100, this.stealthAlert + dt * d.boss.passiveSuspicionRate * this.modifiers.suspicionScale);
                    if (this.stealthAlert >= 100) this.state = 'GAMEOVER';
                }
            }
        }

        this.boss.timer -= dt;
        if (this.boss.timer <= 0) {
            if (this.boss.state === 'AWAY') {
                this.boss.state = 'WARNING';
                this.boss.timer = d.boss.timings.warningMin + Math.random() * d.boss.timings.warningVar;
                this.boss.targetX = (Math.random() - 0.5) * d.boss.positions.varianceWidth;
            } else if (this.boss.state === 'WARNING') {
                this.boss.state = 'LOOKING';
                this.boss.timer = d.boss.timings.lookingMin + Math.random() * d.boss.timings.lookingVar;
            } else if (this.boss.state === 'LOOKING') {
                this.boss.state = 'AWAY';
                this.boss.timer = d.boss.timings.awayMin + Math.random() * d.boss.timings.awayVar;
                this.boss.targetX = d.boss.positions.awayX;
            }
        }
        this.boss.x += (this.boss.targetX - this.boss.x) * 7.5 * dt;

        if (this.boss.state === 'LOOKING' && this.playerState === 'THROWING' && Math.random() < d.boss.catchChance) {
            this.triggerBossCatch();
        }

        this.throwingSystem.update(dt);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.vy * dt;
            p.life -= dt;
            p.opacity = Math.max(0, p.life / 1.0);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }

        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.5, '#1e293b');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= 12; i++) {
            ctx.beginPath(); ctx.moveTo((this.width / 12) * i, this.height); ctx.lineTo(this.horizonX, this.horizonY); ctx.stroke();
        }

        if (this.boss.state !== 'AWAY') {
            const bossProj = this.project3D(this.boss.x, this.boss.y, this.boss.z);
            const bW = this.boss.w * bossProj.scale;
            const bH = this.boss.h * bossProj.scale;
            const bossImg = typeof AssetManager !== 'undefined' ? AssetManager.get('boss') : null;

            if (this.boss.state === 'LOOKING') {
                ctx.fillStyle = 'rgba(220, 38, 38, 0.05)'; ctx.fillRect(0, 0, this.width, this.height);
            }
            if (bossImg && bossImg.complete) {
                ctx.drawImage(bossImg, bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            } else {
                ctx.fillStyle = this.boss.state === 'LOOKING' ? '#dc2626' : '#ea580c';
                ctx.fillRect(bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            }
        }

        const binProj = this.project3D(this.trashcan.x, this.trashcan.y, this.trashcan.z);
        const binW = this.trashcan.w * binProj.scale;
        const binH = this.trashcan.h * binProj.scale;
        const basketImg = typeof AssetManager !== 'undefined' ? AssetManager.get('basket') : null;

        if (basketImg && basketImg.complete) {
            ctx.drawImage(basketImg, binProj.x - binW / 2, binProj.y - binH, binW, binH);
        } else {
            ctx.fillStyle = '#475569'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2 * binProj.scale;
            ctx.beginPath(); ctx.moveTo(binProj.x - binW / 2, binProj.y - binH); ctx.lineTo(binProj.x + binW / 2, binProj.y - binH); ctx.lineTo(binProj.x + binW * 0.5, binProj.y); ctx.lineTo(binProj.x - binW * 0.5, binProj.y); ctx.closePath(); ctx.fill(); ctx.stroke();
        }

        this.throwingSystem.draw(ctx);

        if (this.playerState === 'THROWING' && this.state === 'ACTIVE') {
            const sSize = 52 * this.baseScale;
            ctx.save();
            const pulse = 1 + (this.throwingSystem.isDragging ? 0 : Math.sin(this.time * 5) * 0.06);
            ctx.translate(this.canSpawnX, this.canSpawnY);
            ctx.scale(pulse, pulse);

            const ammoImg = typeof AssetManager !== 'undefined' ? AssetManager.get(this.equippedItem) : null;
            if (ammoImg && ammoImg.complete) {
                ctx.drawImage(ammoImg, -sSize / 2, -sSize / 2, sSize, sSize);
            } else {
                if (this.equippedItem === 'fish') {
                    ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.ellipse(0, 0, sSize * 0.5, sSize * 0.25, 0, 0, Math.PI * 2); ctx.fill();
                } else if (this.equippedItem === 'knife') {
                    ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.rect(-sSize * 0.15, -sSize * 0.4, sSize * 0.3, sSize * 0.8); ctx.fill();
                } else {
                    ctx.fillStyle = '#f43f5e'; ctx.fillRect(-sSize / 2, -sSize / 2, sSize, sSize);
                }
            }
            ctx.restore();
        }

        const playerImg = typeof AssetManager !== 'undefined' ? AssetManager.get('fhbmon') : null;
        const pW = 210 * this.baseScale;
        const pH = 260 * this.baseScale;
        const pX = 130 * this.baseScale;
        let pY = this.height - pH + 20 * this.baseScale;
        if (this.playerState === 'WORKING') pY += 12 * this.baseScale;

        if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, pX, pY, pW, pH);
        }

        const compImg = typeof AssetManager !== 'undefined' ? AssetManager.get('computer') : null;
        if (compImg && compImg.complete) {
            ctx.drawImage(compImg, this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        } else {
            ctx.fillStyle = this.playerState === 'WORKING' ? '#22c55e' : '#0284c7';
            ctx.fillRect(this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        }

        this.drawInterfaceDashboard(ctx);

        if (this.state === 'ACTIVE') this.openShopButton.draw(ctx);

        this.particles.forEach(p => {
            ctx.save(); ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color; ctx.font = `900 ${Math.round(18 * this.baseScale)}px monospace`; ctx.textAlign = 'center'; ctx.fillText(p.text, p.x, p.y); ctx.restore();
        });

        if (this.state === 'SHOP') this.shopSystem.draw(ctx);
        ctx.restore();
    }

    drawInterfaceDashboard(ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, this.width, 75 * this.baseScale);

        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(20 * this.baseScale)}px monospace`;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`SCORE: ${this.score}`, 30 * this.baseScale, 15 * this.baseScale);

        ctx.fillStyle = '#22c55e';
        ctx.fillText(`CASH: $${Math.floor(this.money)}`, 30 * this.baseScale, 42 * this.baseScale);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`ITEM: ${this.equippedItem.toUpperCase()}`, 30 * this.baseScale, 60 * this.baseScale);

        const barW = 160 * this.baseScale;
        const barH = 14 * this.baseScale;
        const edgeSpacing = 20 * this.baseScale;

        const susX = this.width - barW - edgeSpacing;
        const susY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(susX, susY, barW, barH);
        ctx.fillStyle = this.stealthAlert > 70 ? '#ef4444' : '#f59e0b'; ctx.fillRect(susX, susY, barW * (this.stealthAlert / 100), barH);
        ctx.fillStyle = '#cbd5e1'; ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`SUSPICION: ${Math.round(this.stealthAlert)}%`, susX, susY + 24 * this.baseScale);

        const workX = susX - barW - edgeSpacing;
        const workY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(workX, workY, barW, barH);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(workX, workY, barW * (this.workDone / 100), barH);
        ctx.fillStyle = '#cbd5e1'; ctx.fillText(`WORK DONE: ${Math.round(this.workDone)}%`, workX, workY + 24 * this.baseScale);

        const funX = workX - barW - edgeSpacing;
        const funY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(funX, funY, barW, barH);
        ctx.fillStyle = '#ec4899'; ctx.fillRect(funX, funY, barW * (this.fun / 100), barH);
        ctx.fillStyle = '#cbd5e1'; ctx.fillText(`FUN METER: ${Math.round(this.fun)}%`, funX, funY + 24 * this.baseScale);

        ctx.textAlign = 'center';
        if (this.state !== 'SHOP') {
            if (this.boss.state === 'LOOKING') {
                ctx.fillStyle = '#ef4444'; ctx.font = `900 ${Math.round(15 * this.baseScale)}px monospace`;
                ctx.fillText('⚠️ BOSS WATCHING! FREEZE OR WORK! ⚠️', this.width / 2, 28 * this.baseScale);
            }
        }

        if (this.state === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#ef4444'; ctx.font = `900 ${Math.round(48 * this.baseScale)}px monospace`; ctx.fillText('YOU WERE CAUGHT AND TERMINATED!', this.width / 2, this.height * 0.42);
        }
    }
}