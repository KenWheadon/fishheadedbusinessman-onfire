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

        // --- PROGRESSIVE UPGRADES STATE (PER CAN TYPE) ---
        this.can1Level = 1;            // Can Mk.I starts at Level 1 (Value: 1 PT)[cite: 2]
        this.can2Level = 1;            // Can Mk.II starts at Level 1 (Value: 2 PTS) once unlocked[cite: 2]
        this.upgradesUnlocked = false; // Hidden until first score is earned
        this.tealBgAlpha = 0.0;        // Fading multiplier backdrop

        // --- SHOP SCROLLING STATE SYSTEM ---
        this.shopScrollY = 0;
        this.shopTargetScrollY = 0;
        this.shopMaxScroll = 0;
        this._boundWheelHandler = null; // Automatically self-cleans on close[cite: 5]

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

        // Item Buy Buttons (Only displays point totals)[cite: 3]
        this.buyMk1Button = new ArcadeButton({
            text: '5 PTS',
            themeColor: '#39ff14',
            glowColor: '#00ff66'
        });

        this.buyMk2Button = new ArcadeButton({
            text: '50 PTS',
            themeColor: '#ff007f',
            glowColor: '#ff00ff'
        });

        this.resize(this.width, this.height);
    }

    getRandomSpawnInterval() {
        return 20 + Math.random() * 10;
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

    resize(width, height) {
        this.width = width;
        this.height = height;

        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.5), 1.1);

        // Position core HUD elements
        this.scoreText.setPosition(this.width / 2, 50 * this.scaleFactor);
        this.multText.setPosition(160 * this.scaleFactor, 50 * this.scaleFactor);

        const btnW = 140 * this.scaleFactor;
        const btnH = 38 * this.scaleFactor;
        const margin = 20 * this.scaleFactor;
        this.shopButton.setPosition(this.width - (btnW / 2) - margin, 50 * this.scaleFactor, btnW, btnH, this.scaleFactor);

        // Adjust close button placement on the Shop window layout
        const sw = 450 * this.scaleFactor;
        const sh = 360 * this.scaleFactor;
        this.shopCloseButton.setPosition(sw / 2 - 20, -sh / 2 + 20, 24, this.scaleFactor);
    }

    updateButtonsShopPositions() {
        const sw = 450 * this.scaleFactor;
        const sh = 360 * this.scaleFactor;
        const cardW = sw * 0.92;
        const cardH = 80 * this.scaleFactor;
        const cardGap = 10 * this.scaleFactor;
        const viewY = -sh / 2 + 90 * this.scaleFactor;

        // Centers of cards relative to the translated center coordinates (0, 0)
        const mk1Y = viewY + 0 * (cardH + cardGap) + cardH / 2 - this.shopScrollY;
        const mk2Y = viewY + 1 * (cardH + cardGap) + cardH / 2 - this.shopScrollY;

        const actionBtnW = 100 * this.scaleFactor;
        const actionBtnH = 32 * this.scaleFactor;
        const btnX = cardW / 2 - actionBtnW / 2 - 12 * this.scaleFactor;

        this.buyMk1Button.setPosition(btnX, mk1Y, actionBtnW, actionBtnH, this.scaleFactor);
        this.buyMk2Button.setPosition(btnX, mk2Y, actionBtnW, actionBtnH, this.scaleFactor);
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
            this.updateButtonsShopPositions();
            this.shopCloseButton.handleMouseMove(tx, ty);

            // Restrict coordinates checks unless buttons reside inside the shop viewport
            const sw = 450 * this.scaleFactor;
            const sh = 360 * this.scaleFactor;
            const viewYMin = -sh / 2 + 90 * this.scaleFactor;
            const viewYMax = sh / 2 - 20 * this.scaleFactor;

            if (this.buyMk1Button.y >= viewYMin && this.buyMk1Button.y <= viewYMax) {
                this.buyMk1Button.handleMouseMove(tx, ty);
            } else {
                this.buyMk1Button.isHovered = false;
            }

            if (this.buyMk2Button.y >= viewYMin && this.buyMk2Button.y <= viewYMax) {
                this.buyMk2Button.handleMouseMove(tx, ty);
            } else {
                this.buyMk2Button.isHovered = false;
            }
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
            this.updateButtonsShopPositions();
            this.shopCloseButton.handleMouseDown(tx, ty);

            const sw = 450 * this.scaleFactor;
            const sh = 360 * this.scaleFactor;
            const viewYMin = -sh / 2 + 90 * this.scaleFactor;
            const viewYMax = sh / 2 - 20 * this.scaleFactor;

            if (this.buyMk1Button.y >= viewYMin && this.buyMk1Button.y <= viewYMax) {
                this.buyMk1Button.handleMouseDown(tx, ty);
            }
            if (this.buyMk2Button.y >= viewYMin && this.buyMk2Button.y <= viewYMax) {
                this.buyMk2Button.handleMouseDown(tx, ty);
            }
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
            this.updateButtonsShopPositions();
            let consumed = false;

            // Close Button
            this.shopCloseButton.handleMouseUp(tx, ty, () => {
                this.shopTargetScale = 0.0;
                setTimeout(() => {
                    this.shopOpen = false;
                    // Unbind mouse wheel on container closure
                    if (this._boundWheelHandler) {
                        window.removeEventListener('wheel', this._boundWheelHandler);
                        this._boundWheelHandler = null;
                    }
                }, 200);
                consumed = true;
            });
            if (consumed) return true;

            const sw = 450 * this.scaleFactor;
            const sh = 360 * this.scaleFactor;
            const viewYMin = -sh / 2 + 90 * this.scaleFactor;
            const viewYMax = sh / 2 - 20 * this.scaleFactor;

            // Progressive Mk.I Can Value Upgrade[cite: 2]
            if (this.buyMk1Button.y >= viewYMin && this.buyMk1Button.y <= viewYMax) {
                const upgradeMk1Cost = 5 * this.can1Level;
                this.buyMk1Button.handleMouseUp(tx, ty, () => {
                    if (this.score >= upgradeMk1Cost) {
                        this.score -= upgradeMk1Cost;
                        this.can1Level++;
                        this.scoreText.setText(`SCORE: ${this.score}`);

                        // Set the next progressive upgrade cost total[cite: 3]
                        this.buyMk1Button.text = `${5 * this.can1Level} PTS`;

                        this.screenShake = 15;
                        this.spawnParticles(0, 0, '#39ff14', 25);
                        this.spawnFloatingText(0, 0, `MK.I VALUE +1!`, '#39ff14');
                    } else {
                        this.screenShake = 20;
                        this.spawnFloatingText(0, 0, "NOT ENOUGH SCORE!", '#ff0055');
                        this.spawnParticles(0, 0, '#ff0055', 10);
                    }
                    consumed = true;
                });
                if (consumed) return true;
            }

            // Progressive Mk.II Can Unlock & Value Upgrade tree
            if (this.buyMk2Button.y >= viewYMin && this.buyMk2Button.y <= viewYMax) {
                const upgradeMk2Cost = !this.can2Unlocked ? 50 : (5 * this.can2Level);
                this.buyMk2Button.handleMouseUp(tx, ty, () => {
                    if (this.score >= upgradeMk2Cost) {
                        this.score -= upgradeMk2Cost;
                        this.screenShake = 15;

                        if (!this.can2Unlocked) {
                            this.can2Unlocked = true;
                            this.buyMk2Button.text = `${5 * this.can2Level} PTS`;
                            this.buyMk2Button.themeColor = '#39ff14';
                            this.buyMk2Button.glowColor = '#00ff66';

                            this.spawnParticles(0, 0, '#ffe600', 30);
                            this.spawnParticles(0, 0, '#00f0ff', 30);
                            this.spawnFloatingText(0, 0, "CYBER CAN Mk.II UNLOCKED!", '#00f0ff');
                        } else {
                            this.can2Level++;
                            this.buyMk2Button.text = `${5 * this.can2Level} PTS`;

                            this.spawnParticles(0, 0, '#39ff14', 25);
                            this.spawnFloatingText(0, 0, `MK.II VALUE +1!`, '#39ff14');
                        }
                        this.scoreText.setText(`SCORE: ${this.score}`);
                    } else {
                        this.screenShake = 20;
                        this.spawnFloatingText(0, 0, "NOT ENOUGH SCORE!", '#ff0055');
                        this.spawnParticles(0, 0, '#ff0055', 10);
                    }
                    consumed = true;
                });
                if (consumed) return true;
            }

            return consumed;
        } else {
            let shopClicked = false;

            if (this.upgradesUnlocked) {
                this.shopButton.handleMouseUp(mx, my, () => {
                    this.shopOpen = true;
                    this.shopTargetScale = 1.0;
                    this.shopScrollY = 0;
                    this.shopTargetScrollY = 0;
                    shopClicked = true;

                    // Bind wheel controls dynamically for scroll processing[cite: 5]
                    if (!this._boundWheelHandler) {
                        this._boundWheelHandler = this._onWindowWheel.bind(this);
                        window.addEventListener('wheel', this._boundWheelHandler, { passive: false });
                    }
                });
            }

            if (shopClicked) {
                return true;
            }

            return this.handleCanClicks(mx, my);
        }
    }

    handleMouseClick(mx, my) {
        this.handleMouseDown(mx, my);
        return this.handleMouseUp(mx, my);
    }

    /**
     * Custom Window Wheel Interface to smooth scrolling transitions[cite: 5]
     */
    _onWindowWheel(e) {
        if (!this.shopOpen || this.shopScale < 0.9) return;
        e.preventDefault();

        const scrollStep = 45;
        this.shopTargetScrollY += e.deltaY > 0 ? scrollStep : -scrollStep;
        this.shopTargetScrollY = Math.max(0, Math.min(this.shopTargetScrollY, this.shopMaxScroll));
    }

    handleCanClicks(mx, my) {
        let clickedAny = false;

        for (let i = this.cans.length - 1; i >= 0; i--) {
            const can = this.cans[i];
            if (can.checkClick(mx, my)) {
                clickedAny = true;

                // Base scoring levels + progressive upgrades[cite: 2]
                const baseScore = (can.type === 'can2') ? (1 + this.can2Level) : this.can1Level;
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

        // Smooth vertical scroll updates
        const factor = 1 - Math.exp(-12 * dt);
        this.shopScrollY += (this.shopTargetScrollY - this.shopScrollY) * Math.min(1, Math.max(0, factor));

        if (this.upgradesUnlocked) {
            this.shopButton.update(dt);
        }

        if (this.shopOpen) {
            this.updateButtonsShopPositions();
            this.shopCloseButton.update(dt);
            this.buyMk1Button.update(dt);
            this.buyMk2Button.update(dt);
        }

        // Particle garbage recycling
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

        // --- RETRO UPGRADE SHOP MODAL LAYOUT ---
        if (this.shopOpen && this.shopScale > 0.01) {
            ctx.fillStyle = `rgba(10, 10, 14, ${this.shopScale * 0.7})`;
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.save();
            ctx.translate(this.width / 2, this.height / 2);
            ctx.scale(this.shopScale, this.shopScale);

            const sw = 450 * this.scaleFactor;
            const sh = 360 * this.scaleFactor;

            // Flat brutalist shadow backdrop offset
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(-sw / 2 + 8, -sh / 2 + 8, sw, sh);

            // Front panel casing
            ctx.fillStyle = '#0a0a0c';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 4;
            ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
            ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);

            // CRT scanlines masked inside the container box
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

            // --- VIEWPORT SCROLL CLIPPING BOX ---
            const clipX = -sw / 2;
            const clipY = -sh / 2 + 90 * this.scaleFactor;
            const clipW = sw;
            const clipH = sh - 115 * this.scaleFactor;

            ctx.save();
            ctx.beginPath();
            ctx.rect(clipX, clipY, clipW, clipH);
            ctx.clip(); // Mask scrolling content cards cleanly within viewport bounds

            const cardW = sw * 0.92;
            const cardH = 80 * this.scaleFactor;
            const cardGap = 10 * this.scaleFactor;
            const viewY = -sh / 2 + 90 * this.scaleFactor;

            // --- CRITICAL FIX: Properly declare cardX inside the scoped draw stack ---
            const cardX = -cardW / 2;

            // Compute vertical scrolling boundaries
            const totalCards = 5;
            const totalContentHeight = totalCards * (cardH + cardGap) - cardGap;
            this.shopMaxScroll = Math.max(0, totalContentHeight - clipH);

            // Card 1 Coordinates
            const c1Y = viewY + 0 * (cardH + cardGap) - this.shopScrollY;
            // Card 2 Coordinates
            const c2Y = viewY + 1 * (cardH + cardGap) - this.shopScrollY;
            // Teaser Coordinates (Cards 3 to 5)
            const c3Y = viewY + 2 * (cardH + cardGap) - this.shopScrollY;
            const c4Y = viewY + 3 * (cardH + cardGap) - this.shopScrollY;
            const c5Y = viewY + 4 * (cardH + cardGap) - this.shopScrollY;

            // --- CARD 1: CAN MK.I VALUE UPGRADE[cite: 2] ---
            ctx.fillStyle = '#121215';
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, c1Y, cardW, cardH);
            ctx.strokeRect(cardX, c1Y, cardW, cardH);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CAN MK.I VALUE UPGRADE', cardX + 16, c1Y + 22 * this.scaleFactor);

            ctx.fillStyle = '#8a8a9a';
            ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.fillText('increases click value by +1 point', cardX + 16, c1Y + 42 * this.scaleFactor);

            ctx.fillStyle = '#39ff14';
            ctx.fillText(`[LEVEL: ${this.can1Level} | +${this.can1Level - 1} PTS]`, cardX + 16, c1Y + 62 * this.scaleFactor);

            this.buyMk1Button.draw(ctx);

            // --- CARD 2: CYBER CAN MK.II UNLOCK & VALUE TREE ---
            ctx.fillStyle = '#121215';
            ctx.strokeStyle = this.can2Unlocked ? '#00f0ff' : '#ff007f';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, c2Y, cardW, cardH);
            ctx.strokeRect(cardX, c2Y, cardW, cardH);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CYBER CAN MK.II', cardX + 16, c2Y + 22 * this.scaleFactor);

            ctx.fillStyle = '#8a8a9a';
            ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.fillText(this.can2Unlocked ? 'increases click value by +1 point' : 'spawns randomly | worth 2x points', cardX + 16, c2Y + 42 * this.scaleFactor);

            ctx.fillStyle = this.can2Unlocked ? '#00f0ff' : '#ff007f';
            ctx.fillText(this.can2Unlocked ? `[LEVEL: ${this.can2Level} | +${this.can2Level - 1} PTS]` : '[STATUS: LOCKED]', cardX + 16, c2Y + 62 * this.scaleFactor);

            this.buyMk2Button.draw(ctx);

            // --- TEASER CARD 3: CAN MK.III ---
            ctx.fillStyle = '#0a0a0c';
            ctx.strokeStyle = '#474754';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, c3Y, cardW, cardH);
            ctx.strokeRect(cardX, c3Y, cardW, cardH);

            ctx.fillStyle = '#474754';
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CYBER CAN MK.III', cardX + 16, c3Y + 22 * this.scaleFactor);
            ctx.fillText('worth 3x base points', cardX + 16, c3Y + 42 * this.scaleFactor);
            ctx.fillText('[STATUS: COMING SOON]', cardX + 16, c3Y + 62 * this.scaleFactor);

            // Disabled button display
            ctx.strokeRect(cardW / 2 - 112 * this.scaleFactor, c3Y + 24 * this.scaleFactor, 100 * this.scaleFactor, 32 * this.scaleFactor);
            ctx.font = `bold ${Math.round(12 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('???', cardW / 2 - 62 * this.scaleFactor, c3Y + 40 * this.scaleFactor);

            // --- TEASER CARD 4: CAN MK.IV ---
            ctx.fillStyle = '#0a0a0c';
            ctx.strokeStyle = '#474754';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, c4Y, cardW, cardH);
            ctx.strokeRect(cardX, c4Y, cardW, cardH);

            ctx.fillStyle = '#474754';
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CYBER CAN MK.IV', cardX + 16, c4Y + 22 * this.scaleFactor);
            ctx.fillText('worth 4x base points', cardX + 16, c4Y + 42 * this.scaleFactor);
            ctx.fillText('[STATUS: COMING SOON]', cardX + 16, c4Y + 62 * this.scaleFactor);

            ctx.strokeRect(cardW / 2 - 112 * this.scaleFactor, c4Y + 24 * this.scaleFactor, 100 * this.scaleFactor, 32 * this.scaleFactor);
            ctx.fillText('???', cardW / 2 - 62 * this.scaleFactor, c4Y + 40 * this.scaleFactor);

            // --- TEASER CARD 5: CAN MK.V ---
            ctx.fillStyle = '#0a0a0c';
            ctx.strokeStyle = '#474754';
            ctx.lineWidth = 2;
            ctx.fillRect(cardX, c5Y, cardW, cardH);
            ctx.strokeRect(cardX, c5Y, cardW, cardH);

            ctx.fillStyle = '#474754';
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", monospace`;
            ctx.textAlign = 'left';
            ctx.fillText('CYBER CAN MK.V', cardX + 16, c5Y + 22 * this.scaleFactor);
            ctx.fillText('worth 5x base points', cardX + 16, c5Y + 42 * this.scaleFactor);
            ctx.fillText('[STATUS: COMING SOON]', cardX + 16, c5Y + 62 * this.scaleFactor);

            ctx.strokeRect(cardW / 2 - 112 * this.scaleFactor, c5Y + 24 * this.scaleFactor, 100 * this.scaleFactor, 32 * this.scaleFactor);
            ctx.fillText('???', cardW / 2 - 62 * this.scaleFactor, c5Y + 40 * this.scaleFactor);

            ctx.restore(); // Restore clipping viewport mask

            // --- MINI SCROLLBAR TRACK SLIDER[cite: 5] ---
            if (this.shopMaxScroll > 0) {
                const trackW = 4 * this.scaleFactor;
                const trackH = clipH;
                const trackX = sw / 2 - 12 * this.scaleFactor;
                const trackY = clipY;

                ctx.fillStyle = '#0f172a';
                ctx.fillRect(trackX, trackY, trackW, trackH);

                const thumbH = Math.max(20 * this.scaleFactor, (clipH / totalContentHeight) * trackH);
                const thumbY = trackY + (this.shopScrollY / this.shopMaxScroll) * (trackH - thumbH);

                ctx.fillStyle = '#00f0ff';
                ctx.fillRect(trackX - 1, thumbY, trackW + 2, thumbH);
            }

            this.shopCloseButton.draw(ctx);

            ctx.restore();
        }
    }
}