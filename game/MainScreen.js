class MainScreen {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.onGameOver = config.onGameOver || (() => { });
        this.onSettings = config.onSettings || (() => { });

        // Dynamic scaling factor tracking
        this.scaleFactor = 1.0;
        this.isMobile = false;
        this.isTablet = false;

        this.settingsBtn = { x: 0, y: 0, w: 100, h: 40, hovered: false };

        // 1. Sub-component Setup[cite: 1]
        this.debt = new DebtComponent({ width: 340, height: 140 });
        this.chars = new Chars({ width: this.width, height: 500 });
        this.carrot = new CarrotCutter({ width: this.width, height: this.height, align: 'left' });
        this.carrotRight = new CarrotCutter({ width: this.width, height: this.height, align: 'right' });
        this.cardGame = new CardGame({ width: 760, height: 360 });
        this.popup = new GamePopup({ width: 500, height: 250 });
        this.carrotLoss = new CarrotLoss({ width: this.width, height: this.height });

        // Force Chars components to lock initial inputs until popup is accepted[cite: 1]
        this.chars.locked = true;

        // 2. Reference Map (Populated dynamically inside resize)[cite: 1]
        this.layout = {
            cardGame: { x: 0, y: 0, w: 0, h: 0, instance: this.cardGame },
            carrot: { x: 0, y: 0, w: this.width, h: this.height, instance: this.carrot },
            carrotRight: { x: 0, y: 0, w: this.width, h: this.height, instance: this.carrotRight },
            debt: { x: 0, y: 0, w: 0, h: 0, instance: this.debt },
            chars: { x: 0, y: 0, w: 0, h: 0, instance: this.chars }
        };

        // 3. Animation Interpolation Config Targets[cite: 1]
        this.yPositions = {
            charsCenter: 0,
            charsMinimized: 0,
            bottomOffscreen: 0,
            bottomOnscreen: 0
        };

        // Runtime Interpolation Engine States[cite: 1]
        this.charsY = 0;
        this.charsScale = 1.0;
        this.bottomY = 0;
        this.cardGameScale = 0.0;

        // 4. Sequence Timing & Flow State Machine[cite: 1]
        this.gameState = 'INTRO_CHARS_CENTER';
        this.stateTimer = 2.0;

        this._cardRoundOutcomeHandled = false;
        this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;

        this._penaltyTimer = 0;
        this._winTimer = 0;
        this._resetDelayTimer = 0;

        // Initial layout execution[cite: 1]
        this.resize(this.width, this.height);
    }

    /**
     * Responsive sizing grid driven strictly by viewport height.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Establish 9:16 Aspect-Ratio Geometry Boundaries[cite: 1]
        const targetRatio = 9 / 16;
        const bgWidth = height * targetRatio;
        const bgX = (width - bgWidth) / 2;

        // Linear scale factor mapped off native design tool height baseline (960px)
        this.scaleFactor = height / 960;

        // Scale and align settings button to the top-right of the 9:16 frame container[cite: 1]
        this.settingsBtn.w = 100 * this.scaleFactor;
        this.settingsBtn.h = 40 * this.scaleFactor;
        this.settingsBtn.x = bgX + bgWidth - this.settingsBtn.w - 20 * this.scaleFactor;
        this.settingsBtn.y = 20 * this.scaleFactor;

        // ─────────────────────────────────────────────────────────
        // UNIFIED HEIGHT-SCALE COLUMN GRID SYSTEM[cite: 1, 2]
        // ─────────────────────────────────────────────────────────

        // Character Row Layout Configuration[cite: 1, 2]
        // Multiplied by 2 so that when scaled down to 0.5 during play, it matches bgWidth exactly.[cite: 1, 2]
        this.layout.chars = {
            x: bgX,
            y: 0,
            w: bgWidth * 2,
            h: 496 * this.scaleFactor,
            instance: this.chars
        };

        // Card Game Component Layout Configuration[cite: 1, 2]
        this.layout.cardGame = {
            x: bgX,
            y: 378 * this.scaleFactor,
            w: bgWidth,
            h: 255 * this.scaleFactor,
            instance: this.cardGame
        };

        // Debt Counter Component Layout Configuration[cite: 1, 2]
        this.layout.debt = {
            x: bgX,
            y: 4 * this.scaleFactor,
            w: bgWidth,
            h: 129 * this.scaleFactor,
            instance: this.debt
        };

        // Full screen interaction layer tracking for inputs[cite: 1]
        this.layout.carrot = { x: 0, y: 0, w: width, h: height, instance: this.carrot };
        this.layout.carrotRight = { x: 0, y: 0, w: width, h: height, instance: this.carrotRight };

        // Anchor carrot platform nodes relative to the bottom edge of the viewport screen[cite: 2]
        this.carrot.layout.baseX = bgX + 20 * this.scaleFactor;
        this.carrot.layout.baseY = height - 79 * this.scaleFactor;
        this.carrot.layout.nodeX = bgX + 82 * this.scaleFactor;
        this.carrot.layout.nodeY = height - 50 * this.scaleFactor;

        this.carrotRight.layout.baseX = bgX + 19 * this.scaleFactor;
        this.carrotRight.layout.baseY = height - 80 * this.scaleFactor;
        this.carrotRight.layout.nodeX = bgX + 82 * this.scaleFactor;
        this.carrotRight.layout.nodeY = height - 50 * this.scaleFactor;

        // Dynamic Animation Interpolation Target Paths[cite: 1, 2]
        this.yPositions = {
            charsCenter: 171 * this.scaleFactor,
            charsMinimized: 129 * this.scaleFactor,
            bottomOffscreen: height + 300 * this.scaleFactor,
            bottomOnscreen: 0
        };

        // Standalone popup scaling configurations
        if (this.popup) {
            this.popup.width = Math.min(bgWidth * 0.9, 500 * this.scaleFactor);
            this.popup.height = this.popup.width * (250 / 500);
        }

        if (this.carrotLoss && typeof this.carrotLoss.resize === 'function') {
            this.carrotLoss.resize(width, height);
        }

        for (const key in this.layout) {
            const entry = this.layout[key];
            if (entry.instance && typeof entry.instance.resize === 'function') {
                entry.instance.resize(entry.w, entry.h);
            }
        }
    }

    reset() {
        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.reset === 'function') {
                comp.reset();
            }
        }
        this.popup.close();

        this.charsY = this.yPositions.charsCenter;
        this.charsScale = 1.0;
        this.bottomY = this.yPositions.bottomOffscreen;
        this.cardGameScale = 0.0;

        this.gameState = 'INTRO_CHARS_CENTER';
        this.stateTimer = 2.0;

        this._cardRoundOutcomeHandled = false;
        this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;

        this._penaltyTimer = 0;
        this._winTimer = 0;
        this._resetDelayTimer = 0;
    }

    update(dt) {
        const safeDt = Math.min(dt, 0.1);
        const lerpFactor = 1 - Math.pow(1 - 0.12, safeDt * 60);

        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.update === 'function') {
                comp.update(safeDt);
            }
        }
        this.popup.update(safeDt);
        const cutCarrots = 10 - (this.carrot.checkCut() + this.carrotRight.checkCut());
        this.carrotLoss.update(safeDt, cutCarrots);

        let targetCharsY = this.yPositions.charsCenter;
        let targetCharsScale = 1.0;
        let targetBottomY = this.yPositions.bottomOffscreen;
        let targetCardGameScale = 0.0;

        switch (this.gameState) {
            case 'INTRO_CHARS_CENTER':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOffscreen;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'INTRO_MINIMIZE';
                    this.stateTimer = 1.5;
                }
                break;

            case 'INTRO_MINIMIZE':
                targetCharsY = this.yPositions.charsMinimized;
                targetCharsScale = 0.5;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'INTRO_CARDS_APPEAR';
                    this.stateTimer = 1.2;
                }
                break;

            case 'INTRO_CARDS_APPEAR':
                targetCharsY = this.yPositions.charsMinimized;
                targetCharsScale = 0.5;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 1.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    const msg = 'last chance. Point at a card to flip it. Find a pair to pay down your debt. Hit the skull and give something up';
                    this.popup.show(msg, null, () => {
                        this.gameState = 'PLAYING';
                        this.cardGame.reset();
                        this._cardRoundOutcomeHandled = false;
                    });
                    this.gameState = 'INTRO_POPUP_WAIT';
                }
                break;

            case 'INTRO_POPUP_WAIT':
                targetCharsY = this.yPositions.charsMinimized;
                targetCharsScale = 0.5;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 1.0;
                break;

            case 'PLAYING':
                targetCharsY = this.yPositions.charsMinimized;
                targetCharsScale = 0.5;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 1.0;

                if (this.cardGame.gameEnd() && !this._cardRoundOutcomeHandled) {
                    this._cardRoundOutcomeHandled = true;

                    if (this.cardGame.didWin()) {
                        const totalChars = this.chars.characters.length;
                        const aliveChars = this.chars.characters.filter(c => c.alive).length;
                        const deadCount = totalChars - aliveChars;

                        let payoffAmount = 10000;
                        if (deadCount === 1) payoffAmount = 15000;
                        else if (deadCount === 2) payoffAmount = 25000;
                        else if (deadCount === 3) payoffAmount = 40000;
                        else if (deadCount === 4) payoffAmount = 60000;
                        else if (deadCount >= 5) payoffAmount = 80000;

                        this.debt.pay(payoffAmount);
                        if (this.debt.debt <= 0) {
                            this.gameState = 'WIN_SEQUENCE';
                            this.stateTimer = 1.2;
                        } else {
                            this._resetDelayTimer = 1.5;
                        }
                    } else {
                        this.gameState = 'PENALTY_SLIDE_DOWN';
                        this.stateTimer = 1.2;
                    }
                }

                if (this._cardRoundOutcomeHandled && this._resetDelayTimer > 0) {
                    this._resetDelayTimer -= safeDt;
                    if (this._resetDelayTimer <= 0) {
                        this.cardGame.reset();
                        this._cardRoundOutcomeHandled = false;
                    }
                }
                break;

            case 'PENALTY_SLIDE_DOWN':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.chars.locked = false;
                    this.carrot.unlock();
                    this.carrotRight.unlock();

                    this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
                    this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;

                    this.gameState = 'PENALTY_WAIT_CHOICE';
                }
                break;

            case 'PENALTY_WAIT_CHOICE':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                const curCarrots = this.carrot.checkCut() + this.carrotRight.checkCut();
                const curAlive = this.chars.characters.filter(c => c.alive).length;

                const carrotCut = curCarrots < this._lastCarrotCount;
                const charExploded = curAlive < this._lastAliveCount;

                if (carrotCut || charExploded) {
                    this.chars.locked = true;
                    this.carrot.isLocked = true;
                    this.carrotRight.isLocked = true;

                    this._penaltyTimer = 3.0;
                    this.gameState = 'PENALTY_RESOLUTION';
                }
                break;

            case 'PENALTY_RESOLUTION':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this._penaltyTimer -= safeDt;
                if (this._penaltyTimer <= 0) {
                    if (this.carrot.checkCut() + this.carrotRight.checkCut() <= 0) {
                        this.gameState = 'LOSE_SEQUENCE';
                        this.stateTimer = 2.0;
                    } else {
                        this.cardGame.reset();
                        this._cardRoundOutcomeHandled = false;

                        this.gameState = 'PENALTY_SLIDE_UP';
                        this.stateTimer = 1.2;
                    }
                }
                break;

            case 'PENALTY_SLIDE_UP':
                targetCharsY = this.yPositions.charsMinimized;
                targetCharsScale = 0.5;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 1.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'PLAYING';
                }
                break;

            case 'WIN_SEQUENCE':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.chars.win();
                    this._winTimer = 4.0;
                    this.gameState = 'WIN_WAIT';
                }
                break;

            case 'WIN_WAIT':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this._winTimer -= safeDt;
                if (this._winTimer <= 0) {
                    this.onGameOver(true);
                }
                break;

            case 'LOSE_SEQUENCE':
                targetCharsY = this.yPositions.charsCenter;
                targetCharsScale = 1.0;
                targetBottomY = this.yPositions.bottomOnscreen;
                targetCardGameScale = 0.0;

                this.debt.lost();

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.onGameOver(false);
                }
                break;
        }

        this.charsY += (targetCharsY - this.charsY) * lerpFactor;
        this.charsScale += (targetCharsScale - this.charsScale) * lerpFactor;
        this.bottomY += (targetBottomY - this.bottomY) * lerpFactor;
        this.cardGameScale += (targetCardGameScale - this.cardGameScale) * lerpFactor;
    }

    _drawSettingsButton(ctx) {
        ctx.save();
        ctx.translate(this.settingsBtn.x, this.settingsBtn.y);

        ctx.fillStyle = this.settingsBtn.hovered ? '#334155' : '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2 * this.scaleFactor;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, this.settingsBtn.w, this.settingsBtn.h, 8 * this.scaleFactor);
        } else {
            ctx.rect(0, 0, this.settingsBtn.w, this.settingsBtn.h);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.max(11, 16 * this.scaleFactor)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SETTINGS', this.settingsBtn.w / 2, this.settingsBtn.h / 2);

        ctx.restore();
    }

    draw(ctx) {
        ctx.save();
        if (this.carrotLoss && (this.carrotLoss.shakeX !== 0 || this.carrotLoss.shakeY !== 0)) {
            ctx.translate(this.carrotLoss.shakeX, this.carrotLoss.shakeY);
        }

        // 1. Render Outer Solid Backdrop Fill[cite: 1]
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(-50, -50, this.width + 100, this.height + 100);

        // 2. Render Centered 9:16 Core Canvas Wallpaper Frame[cite: 1]
        let bgImg = null;
        try {
            bgImg = typeof AssetManager !== 'undefined' ? AssetManager.get('bg-main') : null;
        } catch (e) { }

        const imgHeight = this.height;
        const imgWidth = imgHeight * (9 / 16);
        const imgX = (this.width - imgWidth) / 2;

        if (bgImg) {
            ctx.drawImage(bgImg, imgX, 0, imgWidth, imgHeight);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(imgX, 0, imgWidth, imgHeight);
        }

        // ─────────────────────────────────────────────────────────
        // AMBIENT TOP PINK GRADIENT OVERLAY
        // ─────────────────────────────────────────────────────────
        // Vertical gradient spanning down to 40% height. Solid pink down to a 50% opacity checkpoint at the 70% mark.
        const gradientHeight = imgHeight * 0.40;
        const topGradient = ctx.createLinearGradient(imgX, 0, imgX, gradientHeight);
        topGradient.addColorStop(0, 'rgba(244, 63, 94, 1.0)');   // Solid pink at the absolute top edge
        topGradient.addColorStop(0.7, 'rgba(244, 63, 94, 0.5)'); // Hits 50% opacity at 70% of the gradient boundary
        topGradient.addColorStop(1, 'rgba(244, 63, 94, 0)');     // Completely transparent at the 40% height mark

        ctx.fillStyle = topGradient;
        ctx.fillRect(imgX, 0, imgWidth, gradientHeight);

        // 3. Render Stacked Subcomponents aligned with the viewport pipeline[cite: 1]
        const drawOrder = ['cardGame', 'chars', 'debt', 'carrot', 'carrotRight'];
        for (const key of drawOrder) {
            const entry = this.layout[key];
            if (!entry) continue;
            const instance = entry.instance;

            ctx.save();
            if (key === 'chars') {
                const charsX = (this.width - entry.w * this.charsScale) / 2;
                ctx.translate(charsX, this.charsY);
                ctx.scale(this.charsScale, this.charsScale);
            } else if (key === 'carrot' || key === 'carrotRight') {
                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                ctx.translate(0, slideOffsetY);
            } else if (key === 'debt') {
                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                ctx.translate(entry.x, entry.y + slideOffsetY);
            } else if (key === 'cardGame') {
                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                const cx = entry.x + entry.w / 2;
                const cy = entry.y + entry.h / 2 + slideOffsetY;
                ctx.translate(cx, cy);
                ctx.scale(this.cardGameScale, this.cardGameScale);
                ctx.translate(-entry.w / 2, -entry.h / 2);
            }

            if (typeof instance.draw === 'function') {
                instance.draw(ctx, 0, 0);
            }
            ctx.restore();
        }

        this._drawSettingsButton(ctx);

        if (this.popup.isOpen || this.popup.isTransitioning) {
            const px = (this.width - this.popup.width) / 2;
            const py = (this.height - this.popup.height) / 2;
            this.popup.draw(ctx, px, py);
        }

        if (this.carrotLoss) {
            this.carrotLoss.draw(ctx);
        }

        ctx.restore();
    }

    _routeInput(methodName, x, y) {
        if (this.popup.isOpen) {
            const px = (this.width - this.popup.width) / 2;
            const py = (this.height - this.popup.height) / 2;
            if (typeof this.popup[methodName] === 'function') {
                this.popup[methodName](x - px, y - py);
            }
            return;
        }

        const isSettingsHit = (x >= this.settingsBtn.x && x <= this.settingsBtn.x + this.settingsBtn.w &&
            y >= this.settingsBtn.y && y <= this.settingsBtn.y + this.settingsBtn.h);
        if (methodName === 'handleMouseMove') {
            this.settingsBtn.hovered = isSettingsHit;
        } else if ((methodName === 'handleMouseUp' || methodName === 'handleMouseClick' || methodName === 'handleMouseDown') && isSettingsHit) {
            if (methodName === 'handleMouseClick' || methodName === 'handleMouseUp') {
                this.onSettings();
            }
            return;
        }

        if (this.chars.isModalOpen) {
            const scale = this.charsScale;
            const charsX = (this.width - this.layout.chars.w * scale) / 2;
            const localX = (x - charsX) / scale;
            const localY = (y - this.charsY) / scale;
            if (typeof this.chars[methodName] === 'function') {
                this.chars[methodName](localX, localY);
            }
            return;
        }

        for (const key in this.layout) {
            const entry = this.layout[key];
            const instance = entry.instance;
            if (typeof instance[methodName] !== 'function') continue;

            let bx = entry.x;
            let by = entry.y;
            let bw = entry.w;
            let bh = entry.h;
            let scaleX = 1;
            let scaleY = 1;

            if (key === 'chars') {
                bx = (this.width - entry.w * this.charsScale) / 2;
                by = this.charsY;
                scaleX = this.charsScale;
                scaleY = this.charsScale;
                bw = entry.w * scaleX;
                bh = entry.h * scaleY;
            } else if (key === 'carrot' || key === 'carrotRight') {
                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                bx = 0;
                by = slideOffsetY;
                bw = this.width;
                bh = this.height;
            } else if (key === 'debt') {
                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                bx = entry.x;
                by = entry.y + slideOffsetY;
            } else if (key === 'cardGame') {
                if (this.cardGameScale < 0.1) continue;

                const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                scaleX = this.cardGameScale;
                scaleY = this.cardGameScale;
                bx = entry.x + (entry.w - entry.w * scaleX) / 2;
                by = (entry.y + slideOffsetY) + (entry.h - entry.h * scaleY) / 2;
                bw = entry.w * scaleX;
                bh = entry.h * scaleY;
            }

            if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                const localX = (x - bx) / scaleX;
                const localY = (y - by) / scaleY;
                instance[methodName](localX, localY);
            }
        }
    }

    handleMouseDown(x, y) { this._routeInput('handleMouseDown', x, y); }
    handleMouseMove(x, y) { this._routeInput('handleMouseMove', x, y); }
    handleMouseUp(x, y) { this._routeInput('handleMouseUp', x, y); }
    handleMouseClick(x, y) { this._routeInput('handleMouseClick', x, y); }
}