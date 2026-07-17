class CanManager {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        this.cans = [];
        this.delayedSpawns = []; // Queue for future staggered spawns[cite: 2]

        // Game Configuration
        this.maxCans = 15; // Cap to prevent clipping fast offspring clicks
        this.score = 0;
        this.multiplier = 1;

        // Upgrade Shop State Variables
        this.can2Unlocked = false;
        this.shopOpen = false;
        this.shopScale = 0.0;
        this.shopTargetScale = 0.0;

        // State Trackers
        this.upgradesUnlocked = false; // Hidden until first score is earned
        this.tealBgAlpha = 0.0;        // Fading multiplier backdrop

        // Recycled Memory Pools
        this.particlePool = [];
        this.activeParticles = [];
        this.floatingTextPool = [];
        this.activeFloatingTexts = [];

        // Screen Shake impact tracker
        this.screenShake = 0;

        // Periodic Falling Timers[cite: 2]
        this.spawnTimer = this.getRandomSpawnInterval();

        // Neon Typography Components[cite: 2]
        this.scoreText = new NeonTextComponent({
            text: "SCORE: 00",
            fontSize: 28,
            coreColor: '#ffffff',
            glowColor: '#39ff14',
            autoStart: false
        });

        this.multText = new NeonTextComponent({
            text: "1X MULTIPLIER!",
            fontSize: 24,
            coreColor: '#ffffff',
            glowColor: '#ff007f',
            autoStart: false
        });

        // Instantiate Shop UI Buttons[cite: 3, 4]
        this.shopButton = new ArcadeButton({
            text: 'UPGRADES',
            themeColor: '#ffe600',
            glowColor: '#ffcc00'
        });

        this.shopCloseButton = new CloseButton({ size: 24 });

        this.buyCan2Button = new ArcadeButton({
            text: 'UNLOCK CAN 2 (50 PTS)',
            themeColor: '#ff007f',
            glowColor: '#ff00ff'
        });

        this.resize(this.width, this.height);
    }

    getRandomSpawnInterval() {
        return 5 + Math.random() * 1;
    }

    // --- MEMORY POOL RECYCLERS ---
    spawnParticles(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            let p = this.particlePool.pop() || new CanParticle();
            p.reset(x, y, color);
            this.activeParticles.push(p);
        }
    }

    spawnFloatingText(x, y, text, color) {
        let ft = this.floatingTextPool.pop() || new FloatingText();
        ft.reset(x, y, text, color);
        this.activeFloatingTexts.push(ft);
    }

    /**
     * Handles layout, scales, and positions dynamically based on canvas viewport
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.5), 1.1);

        // 1. Center the SCORE text in the middle top of the screen
        this.scoreText.setPosition(this.width / 2, 50 * this.scaleFactor);

        // 2. Align MULTIPLIER text on the top-left to balance the shop button on the right
        this.multText.setPosition(160 * this.scaleFactor, 50 * this.scaleFactor);

        // 3. Position UPGRADES button in the top-right corner
        const btnW = 140 * this.scaleFactor;
        const btnH = 38 * this.scaleFactor;
        const margin = 20 * this.scaleFactor;
        // ArcadeButton draws from its center point, so we offset by half its width + margin from the right edge
        this.shopButton.setPosition(this.width - (btnW / 2) - margin, 50 * this.scaleFactor, btnW, btnH, this.scaleFactor);

        // Brutalist panel dimensions
        const sw = 420 * this.scaleFactor;
        const sh = 300 * this.scaleFactor;

        this.shopCloseButton.setPosition(sw / 2 - 20, -sh / 2 + 20, 24, this.scaleFactor);
        this.buyCan2Button.setPosition(0, sh / 2 - 45 * this.scaleFactor, sw * 0.75, 38 * this.scaleFactor, this.scaleFactor);
    }

    spawnCan(customX = null) {
        if (this.cans.length >= this.maxCans) return;

        const margin = 60 * this.scaleFactor;
        const spawnX = customX !== null ? customX : margin + Math.random() * (this.width - margin * 2);

        this.cans.push(new Can({
            x: spawnX,
            y: -20 * this.scaleFactor,
            width: 48,
            height: 84,
            scaleFactor: this.scaleFactor,
            can2Unlocked: this.can2Unlocked
        }));
    }

    queueStaggeredSpawns() {
        const margin = 60 * this.scaleFactor;
        for (let i = 0; i < 2; i++) {
            const delay = 0.1 + Math.random() * 0.2;
            const targetX = margin + Math.random() * (this.width - margin * 2);
            this.delayedSpawns.push({ timer: delay, x: targetX });
        }
    }

    // --- COORD INPUT INTERFACES ---
    handleMouseMove(mx, my) {
        const tx = (mx - this.width / 2) / Math.max(0.001, this.shopScale);
        const ty = (my - this.height / 2) / Math.max(0.001, this.shopScale);

        if (this.shopOpen) {
            this.shopCloseButton.handleMouseMove(tx, ty);
            this.buyCan2Button.handleMouseMove(tx, ty);
        } else {
            if (this.upgradesUnlocked) {
                this.shopButton.handleMouseMove(mx, my);
            }

            this.cans.forEach(can => {
                if (can.isCrumpled || !can.isActive) {
                    can.isHovered = false;
                    return;
                }
                const halfW = (can.width * can.scaleFactor) / 2;
                const halfH = (can.height * can.scaleFactor) / 2;
                can.isHovered = (mx > can.x - halfW && mx < can.x + halfW &&
                    my > can.y - halfH && my < can.y + halfH);
            });
        }
    }

    handleMouseDown(mx, my) {
        const tx = (mx - this.width / 2) / Math.max(0.001, this.shopScale);
        const ty = (my - this.height / 2) / Math.max(0.001, this.shopScale);

        if (this.shopOpen) {
            this.shopCloseButton.handleMouseDown(tx, ty);
            this.buyCan2Button.handleMouseDown(tx, ty);
        } else {
            if (this.upgradesUnlocked) {
                this.shopButton.handleMouseDown(mx, my);
            }
        }
    }

    handleMouseUp(mx, my) {
        const tx = (mx - this.width / 2) / Math.max(0.001, this.shopScale);
        const ty = (my - this.height / 2) / Math.max(0.001, this.shopScale);

        if (this.shopOpen) {
            this.shopCloseButton.handleMouseUp(tx, ty, () => {
                this.shopTargetScale = 0.0;
                setTimeout(() => { this.shopOpen = false; }, 200);
            });

            this.buyCan2Button.handleMouseUp(tx, ty, () => {
                if (this.can2Unlocked) return;

                if (this.score >= 50) {
                    this.score -= 50;
                    this.can2Unlocked = true;
                    this.scoreText.setText(`SCORE: ${this.score}`);

                    this.buyCan2Button.text = "MAXED OUT";
                    this.buyCan2Button.themeColor = '#474754';
                    this.buyCan2Button.glowColor = '#474754';

                    this.screenShake = 15;
                    this.spawnParticles(0, 0, '#ffe600', 30);
                    this.spawnParticles(0, 0, '#39ff14', 30);
                    this.spawnFloatingText(0, 0, "CYBER CAN 2 UNLOCKED!", '#39ff14');
                } else {
                    this.screenShake = 20;
                    this.spawnFloatingText(0, 0, "NOT ENOUGH SCORE!", '#ff0055');
                    this.spawnParticles(0, 0, '#ff0055', 10);
                }
            });
        } else {
            let shopClicked = false;

            if (this.upgradesUnlocked) {
                this.shopButton.handleMouseUp(mx, my, () => {
                    this.shopOpen = true;
                    this.shopTargetScale = 1.0;
                    shopClicked = true;
                });
            }

            if (!shopClicked) {
                this.handleCanClicks(mx, my);
            }
        }
    }

    handleMouseClick(mx, my) {
        this.handleMouseDown(mx, my);
        this.handleMouseUp(mx, my);
    }

    handleCanClicks(mx, my) {
        let clickedAny = false;

        for (let i = this.cans.length - 1; i >= 0; i--) {
            const can = this.cans[i];
            if (can.checkClick(mx, my)) {
                clickedAny = true;

                const baseScore = (can.type === 'can2') ? 2 : 1;
                const earned = baseScore * this.multiplier;

                this.score += earned;
                this.multiplier++;

                if (this.score > 0) {
                    this.upgradesUnlocked = true;
                }

                const colorCode = (can.type === 'can1') ? '#ff007f' : '#00f0ff';
                this.spawnParticles(can.x, can.y, colorCode, 16);
                this.spawnFloatingText(can.x, can.y - 40, `+${earned}`, colorCode);

                this.screenShake = 12;

                if (this.scoreText.state === 'HIDDEN') {
                    this.scoreText.animateIn();
                }
                this.scoreText.setText(`SCORE: ${this.score}`);

                if (this.multiplier > 1) {
                    if (this.multText.state === 'HIDDEN') {
                        this.multText.animateIn();
                    }
                    this.multText.setText(`${this.multiplier}X MULTIPLIER!`);
                    this.multText.fontSize = Math.min(48, 20 + this.multiplier * 2.5);
                }

                this.queueStaggeredSpawns();
                break;
            }
        }
        return clickedAny;
    }

    update(dt) {
        if (this.screenShake > 0) {
            this.screenShake -= dt * 40;
            if (this.screenShake < 0) this.screenShake = 0;
        }

        const targetTealAlpha = this.multiplier > 1 ? 0.45 : 0.0;
        this.tealBgAlpha += (targetTealAlpha - this.tealBgAlpha) * 12 * dt;

        this.shopScale += (this.shopTargetScale - this.shopScale) * (1 - Math.exp(-14 * dt));

        if (this.upgradesUnlocked) {
            this.shopButton.update(dt);
        }

        if (this.shopOpen) {
            this.shopCloseButton.update(dt);
            this.buyCan2Button.update(dt);
        }

        // Recycling loops
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];
            p.update(dt);
            if (!p.active) {
                this.activeParticles.splice(i, 1);
                this.particlePool.push(p);
            }
        }

        for (let i = this.activeFloatingTexts.length - 1; i >= 0; i--) {
            const ft = this.activeFloatingTexts[i];
            ft.update(dt);
            if (!ft.active) {
                this.activeFloatingTexts.splice(i, 1);
                this.floatingTextPool.push(ft);
            }
        }

        if (this.shopOpen) return;

        // 1. Process regular periodic spawns[cite: 2]
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            if (this.cans.length === 0) {
                this.spawnCan();
            }
            this.spawnTimer = this.getRandomSpawnInterval();
        }

        // 2. Process staggered queued offspring spawns[cite: 2]
        for (let i = this.delayedSpawns.length - 1; i >= 0; i--) {
            const spawn = this.delayedSpawns[i];
            spawn.timer -= dt;
            if (spawn.timer <= 0) {
                this.spawnCan(spawn.x);
                this.delayedSpawns.splice(i, 1);
            }
        }

        // 3. Process can motion and bounds cleanup[cite: 2]
        for (let i = this.cans.length - 1; i >= 0; i--) {
            const can = this.cans[i];
            can.update(dt);

            if (!can.isCrumpled && can.y - (can.height * this.scaleFactor) / 2 > this.height) {
                this.multiplier = 1;
                this.multText.setText(`1X MULTIPLIER!`);
                this.multText.fontSize = 24;
                this.multText.animateOut();

                this.cans.splice(i, 1);
                continue;
            }

            if (!can.isActive) {
                this.cans.splice(i, 1);
            }
        }

        this.scoreText.update(dt);
        this.multText.update(dt);
    }

    draw(ctx) {
        ctx.save();

        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        if (this.tealBgAlpha > 0.01) {
            ctx.save();
            ctx.fillStyle = `rgba(13, 148, 136, ${this.tealBgAlpha})`;
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.strokeStyle = `rgba(255, 255, 255, ${this.tealBgAlpha * 0.12})`;
            ctx.lineWidth = 1;
            const gridSize = 30 * this.scaleFactor;
            for (let lx = 0; lx < this.width; lx += gridSize) {
                ctx.beginPath();
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx, this.height);
                ctx.stroke();
            }
            for (let ly = 0; ly < this.height; ly += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, ly);
                ctx.lineTo(this.width, ly);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Render gameplay assets
        this.cans.forEach(can => can.draw(ctx));
        this.scoreText.draw(ctx);
        this.multText.draw(ctx);

        if (this.upgradesUnlocked) {
            this.shopButton.draw(ctx);
        }

        this.activeParticles.forEach(p => p.draw(ctx));
        this.activeFloatingTexts.forEach(ft => ft.draw(ctx));

        ctx.restore();

        // Retro Upgrade Shop Modal Layout
        if (this.shopOpen && this.shopScale > 0.01) {
            ctx.fillStyle = `rgba(10, 10, 14, ${this.shopScale * 0.7})`;
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.save();
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(this.shopScale, this.shopScale);

            const sw = 420 * this.scaleFactor;
            const sh = 300 * this.scaleFactor;

            ctx.fillStyle = '#ff007f';
            ctx.fillRect(-sw / 2 + 8, -sh / 2 + 8, sw, sh);

            ctx.fillStyle = '#0a0a0c';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
            ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);

            ctx.save();
            ctx.beginPath();
            ctx.rect(-sw / 2, -sh / 2, sw, sh);
            ctx.clip();
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
            ctx.lineWidth = 1;
            for (let sy = -sh / 2; sy < sh / 2; sy += 3) {
                ctx.beginPath();
                ctx.moveTo(-sw / 2, sy);
                ctx.lineTo(sw / 2, sy);
                ctx.stroke();
            }
            ctx.restore();

            ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.fillRect(-sw / 2 + 10, -sh / 2 + 10, 8, 2);
            ctx.fillRect(-sw / 2 + 10, -sh / 2 + 10, 2, 8);
            ctx.fillRect(sw / 2 - 18, -sh / 2 + 10, 8, 2);
            ctx.fillRect(sw / 2 - 12, -sh / 2 + 10, 2, 8);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(22 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('UPGRADE SHOP', 0, -sh / 2 + 35);

            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-sw * 0.42, -sh / 2 + 55);
            ctx.lineTo(sw * 0.42, -sh / 2 + 55);
            ctx.stroke();

            ctx.fillStyle = '#ffe600';
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.fillText(`// SYSTEM CORES: ${this.score} PTS`, 0, -sh / 2 + 72);

            const cardW = sw * 0.85;
            const cardH = 80 * this.scaleFactor;
            const cardX = -cardW / 2;
            const cardY = -sh / 2 + 96;

            ctx.fillStyle = '#121215';
            ctx.strokeStyle = this.can2Unlocked ? '#39ff14' : '#ff007f';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, cardY, cardW, cardH);
            ctx.strokeRect(cardX, cardY, cardW, cardH);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(14 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CYBER CAN MK.II', cardX + 16, cardY + 22);

            ctx.fillStyle = '#8a8a9a';
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.fillText('SPAWNS RANDOMLY | WORTH 2X BASE POINTS', cardX + 16, cardY + 42);

            ctx.fillStyle = this.can2Unlocked ? '#39ff14' : '#ff007f';
            ctx.fillText(this.can2Unlocked ? '[STATUS: ACTIVE / MAX UNLOCKED]' : '[STATUS: INACTIVE - 50 PTS]', cardX + 16, cardY + 62);

            this.buyCan2Button.draw(ctx);
            this.shopCloseButton.draw(ctx);

            ctx.restore();
        }
    }
}