class MiniGame {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.baseScale = this.width / 1280;
        this.time = 0;

        this.modifiers = {
            workRate: 1.0,
            suspicionScale: 1.0,
            funDrainScale: 1.0,
            throwVelocity: 1.0
        };

        this.equippedItem = 'can';
        this.itemLevels = { can: 1, fish: 0, knife: 0 };

        this.throwingSystem = new ThrowingSystem(this);
        this.shopSystem = new ShopSystem(this);

        this.openShopButton = new ArcadeButton({
            text: 'SHOP',
            themeColor: '#a855f7',
            glowColor: '#c084fc'
        });

        this.reset();
    }

    reset() {
        this.state = 'ACTIVE';
        this.playerState = 'THROWING';
        this.isWorkingHeld = false;

        this.score = 0;
        this.money = 0;
        this.fun = 100;
        this.stealthAlert = 0;
        this.workDone = 0;

        this.throwingSystem.cans = [];
        this.particles = [];
        this.screenShake = 0;

        this.focalLength = 450;
        this.horizonX = this.width / 2;
        this.horizonY = this.height * 0.35;

        this.trashcan = { x: 340, y: 120, z: 700, w: 120, h: 140, depth: 90 };

        this.boss = {
            state: 'AWAY',
            timer: 4.0,
            x: -400,
            y: -60,
            z: 550,
            w: 170,
            h: 170,
            targetX: -400
        };

        this.resize(this.width, this.height);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.baseScale = this.width / 1280;

        this.horizonX = this.width / 2;
        this.horizonY = this.height * 0.35;

        this.computerHitbox = {
            x: 50 * this.baseScale,
            y: this.height - 180 * this.baseScale,
            w: 160 * this.baseScale,
            h: 140 * this.baseScale
        };

        this.canSpawnX = 340 * this.baseScale;
        this.canSpawnY = this.height - 120 * this.baseScale - (this.height * 0.10);
        this.canInteractionRadius = 60 * this.baseScale;

        this.openShopButton.setPosition(180 * this.baseScale, 38 * this.baseScale, 100 * this.baseScale, 36 * this.baseScale, this.baseScale);
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
        this.stealthAlert = Math.min(100, this.stealthAlert + (15 * this.modifiers.suspicionScale));
        this.screenShake = 12;
        this.spawnParticle('SPOTTED!', this.width / 2, this.height * 0.25, '#ef4444');
        if (this.stealthAlert >= 100) this.state = 'GAMEOVER';
    }

    spawnParticle(text, x, y, color = '#fbbf24') {
        this.particles.push({ text, x, y, color, vy: -70, opacity: 1.0, life: 1.0 });
    }

    update(dt) {
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
                this.workDone += dt * 45 * this.modifiers.workRate;
                this.money += dt * 15 * this.modifiers.workRate;
                this.fun = Math.max(0, this.fun - dt * 20 * this.modifiers.funDrainScale);

                if (this.workDone >= 100) {
                    this.workDone = 0;
                    this.stealthAlert = Math.max(0, this.stealthAlert - 25);
                    this.money += 50;
                    this.spawnParticle('JOB COMPLETE! +$50', this.width / 2, this.height * 0.5, '#22c55e');
                }
            } else {
                if (this.boss.state === 'LOOKING') {
                    this.stealthAlert = Math.min(100, this.stealthAlert + dt * 10 * this.modifiers.suspicionScale);
                    if (this.stealthAlert >= 100) this.state = 'GAMEOVER';
                }
            }
        }

        this.boss.timer -= dt;
        if (this.boss.timer <= 0) {
            if (this.boss.state === 'AWAY') {
                this.boss.state = 'WARNING';
                this.boss.timer = 1.2 + Math.random() * 0.8;
                this.boss.targetX = (Math.random() - 0.5) * 160;
            } else if (this.boss.state === 'WARNING') {
                this.boss.state = 'LOOKING';
                this.boss.timer = 2.0 + Math.random() * 2.0;
            } else if (this.boss.state === 'LOOKING') {
                this.boss.state = 'AWAY';
                this.boss.timer = 4.0 + Math.random() * 3.0;
                this.boss.targetX = -450;
            }
        }
        this.boss.x += (this.boss.targetX - this.boss.x) * 7.5 * dt;

        if (this.boss.state === 'LOOKING' && this.playerState === 'THROWING' && Math.random() < 0.007) {
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

        // Scene Base Grid Layout
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.5, '#1e293b');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= 12; i++) {
            ctx.beginPath();
            ctx.moveTo((this.width / 12) * i, this.height);
            ctx.lineTo(this.horizonX, this.horizonY);
            ctx.stroke();
        }

        // Draw Boss Agent
        if (this.boss.state !== 'AWAY') {
            const bossProj = this.project3D(this.boss.x, this.boss.y, this.boss.z);
            const bW = this.boss.w * bossProj.scale;
            const bH = this.boss.h * bossProj.scale;
            const bossImg = typeof AssetManager !== 'undefined' ? AssetManager.get('boss') : null;

            if (this.boss.state === 'LOOKING') {
                ctx.fillStyle = 'rgba(220, 38, 38, 0.05)';
                ctx.fillRect(0, 0, this.width, this.height);
            }
            if (bossImg && bossImg.complete) {
                ctx.drawImage(bossImg, bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            } else {
                ctx.fillStyle = this.boss.state === 'LOOKING' ? '#dc2626' : '#ea580c';
                ctx.fillRect(bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            }
        }

        // Draw Target Trash Basket
        const binProj = this.project3D(this.trashcan.x, this.trashcan.y, this.trashcan.z);
        const binW = this.trashcan.w * binProj.scale;
        const binH = this.trashcan.h * binProj.scale;
        const basketImg = typeof AssetManager !== 'undefined' ? AssetManager.get('basket') : null;

        if (basketImg && basketImg.complete) {
            ctx.drawImage(basketImg, binProj.x - binW / 2, binProj.y - binH, binW, binH);
        } else {
            ctx.fillStyle = '#475569';
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2 * binProj.scale;
            ctx.beginPath();
            ctx.moveTo(binProj.x - binW / 2, binProj.y - binH);
            ctx.lineTo(binProj.x + binW / 2, binProj.y - binH);
            ctx.lineTo(binProj.x + binW * 0.5, binProj.y);
            ctx.lineTo(binProj.x - binW * 0.5, binProj.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.ellipse(binProj.x, binProj.y - binH, binW / 2, 8 * binProj.scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        this.throwingSystem.draw(ctx);

        // Draw Current Weapon Item Node
        if (this.playerState === 'THROWING') {
            const sSize = 52 * this.baseScale;
            ctx.save();
            const pulse = 1 + (this.throwingSystem.isDragging ? 0 : Math.sin(this.time * 5) * 0.06);
            ctx.translate(this.canSpawnX, this.canSpawnY);
            ctx.scale(pulse, pulse);

            if (this.equippedItem === 'fish') {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.ellipse(0, 0, sSize * 0.5, sSize * 0.25, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.equippedItem === 'knife') {
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.rect(-sSize * 0.15, -sSize * 0.4, sSize * 0.3, sSize * 0.8);
                ctx.fill();
            } else {
                const canImg = typeof AssetManager !== 'undefined' ? AssetManager.get('can') : null;
                if (canImg && canImg.complete) {
                    ctx.drawImage(canImg, -sSize / 2, -sSize / 2, sSize, sSize);
                } else {
                    ctx.fillStyle = '#f43f5e';
                    ctx.fillRect(-sSize / 2, -sSize / 2, sSize, sSize);
                }
            }
            ctx.restore();
        }

        // Draw Player Character Avatar Layout
        const playerImg = typeof AssetManager !== 'undefined' ? AssetManager.get('fhbmon') : null;
        const pW = 210 * this.baseScale;
        const pH = 260 * this.baseScale;
        const pX = 130 * this.baseScale;
        let pY = this.height - pH + 20 * this.baseScale;
        if (this.playerState === 'WORKING') pY += 12 * this.baseScale;

        if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, pX, pY, pW, pH);
        }

        // Draw Computer Desk Console Monitor
        const compImg = typeof AssetManager !== 'undefined' ? AssetManager.get('computer') : null;
        if (compImg && compImg.complete) {
            ctx.drawImage(compImg, this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        } else {
            ctx.fillStyle = this.playerState === 'WORKING' ? '#22c55e' : '#0284c7';
            ctx.fillRect(this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        }

        if (this.playerState === 'WORKING') {
            ctx.strokeStyle = this.fun > 0 ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 3 * this.baseScale;
            ctx.strokeRect(this.computerHitbox.x - 2, this.computerHitbox.y - 2, this.computerHitbox.w + 4, this.computerHitbox.h + 4);
        }

        this.drawInterfaceDashboard(ctx);

        if (this.state === 'ACTIVE') this.openShopButton.draw(ctx);

        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.font = `900 ${Math.round(18 * this.baseScale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        });

        if (this.state === 'SHOP') this.shopSystem.draw(ctx);
        ctx.restore();
    }

    drawInterfaceDashboard(ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, this.width, 75 * this.baseScale);

        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(20 * this.baseScale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`SCORE: ${this.score}`, 30 * this.baseScale, 15 * this.baseScale);

        ctx.fillStyle = '#22c55e';
        ctx.fillText(`CASH: $${Math.floor(this.money)}`, 30 * this.baseScale, 42 * this.baseScale);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`WEAPON: ${this.equippedItem.toUpperCase()} (LVL ${this.itemLevels[this.equippedItem]})`, 30 * this.baseScale, 60 * this.baseScale);

        const barW = 160 * this.baseScale;
        const barH = 14 * this.baseScale;
        const edgeSpacing = 20 * this.baseScale;

        // --- Restored Meter 1: Suspicion Matrix Bar ---
        const susX = this.width - barW - edgeSpacing;
        const susY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(susX, susY, barW, barH);
        ctx.fillStyle = this.stealthAlert > 70 ? '#ef4444' : '#f59e0b';
        ctx.fillRect(susX, susY, barW * (this.stealthAlert / 100), barH);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`SUSPICION: ${Math.round(this.stealthAlert)}%`, susX, susY + 24 * this.baseScale);

        // --- Restored Meter 2: Assignment Work Completed Bar ---
        const workX = susX - barW - edgeSpacing;
        const workY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(workX, workY, barW, barH);
        ctx.fillStyle = '#22c55e'; ctx.fillRect(workX, workY, barW * (this.workDone / 100), barH);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`WORK DONE: ${Math.round(this.workDone)}%`, workX, workY + 24 * this.baseScale);

        // --- Restored Meter 3: Sanity Fun Level Bar ---
        const funX = workX - barW - edgeSpacing;
        const funY = 20 * this.baseScale;
        ctx.fillStyle = '#334155'; ctx.fillRect(funX, funY, barW, barH);
        ctx.fillStyle = '#ec4899'; ctx.fillRect(funX, funY, barW * (this.fun / 100), barH);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`FUN METER: ${Math.round(this.fun)}%`, funX, funY + 24 * this.baseScale);

        ctx.textAlign = 'center';
        if (this.state !== 'SHOP') {
            if (this.boss.state === 'LOOKING') {
                ctx.fillStyle = '#ef4444'; ctx.font = `900 ${Math.round(15 * this.baseScale)}px monospace`;
                ctx.fillText('⚠️ BOSS WATCHING! FREEZE OR WORK! ⚠️', this.width / 2, 28 * this.baseScale);
            } else {
                ctx.fillStyle = '#38bdf8'; ctx.font = `700 ${Math.round(13 * this.baseScale)}px monospace`;
                ctx.fillText(this.fun <= 0 ? '❌ OUT OF FUN! DISPOSE EXTRA ITEMS!' : 'STATUS: RADAR CLEAR.', this.width / 2, 28 * this.baseScale);
            }
        }

        if (this.state === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#ef4444'; ctx.font = `900 ${Math.round(48 * this.baseScale)}px monospace`;
            ctx.fillText('YOU WERE CAUGHT AND TERMINATED!', this.width / 2, this.height * 0.42);
        }
    }
}