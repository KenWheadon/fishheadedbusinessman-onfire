class MainScreen {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.onGameOver = config.onGameOver || (() => { });
        this.onSettings = config.onSettings || (() => { });

        // Dynamic properties to track breakpoints and scaling factor
        this.scaleFactor = 1.0;
        this.isMobile = false;
        this.isTablet = false;

        this.settingsBtn = { x: this.width - 120, y: 20, w: 100, h: 40, hovered: false };

        // 1. Sub-component Setup
        this.debt = new DebtComponent({ width: 340, height: 140 });
        this.chars = new Chars({ width: this.width, height: 500 });
        this.carrot = new CarrotCutter({ width: this.width, height: this.height, align: 'left' });
        this.carrotRight = new CarrotCutter({ width: this.width, height: this.height, align: 'right' });
        this.cardGame = new CardGame({ width: 760, height: 360 });
        this.popup = new GamePopup({ width: 500, height: 250 });
        this.carrotLoss = new CarrotLoss({ width: this.width, height: this.height });

        // Force Chars components to lock initial inputs until popup is accepted
        this.chars.locked = true;

        // 2. Dynamic Reference Map (Populated dynamically inside resize)
        this.layout = {
            cardGame: { x: 260, y: 180, w: 760, h: 360, instance: this.cardGame },
            carrot: { x: 0, y: 0, w: this.width, h: this.height, instance: this.carrot },
            carrotRight: { x: 0, y: 0, w: this.width, h: this.height, instance: this.carrotRight },
            debt: { x: 470, y: 550, w: 340, h: 140, instance: this.debt },
            chars: { x: 0, y: 110, w: this.width, h: 500, instance: this.chars }
        };

        // 3. Coordinate Animation Interpolation Targets (Assigned in resize)
        this.yPositions = {
            charsCenter: 110,
            charsMinimized: -50,
            bottomOffscreen: 750,
            bottomOnscreen: 550
        };

        // Runtime Interpolation Engine States
        this.charsY = 110;
        this.charsScale = 1.0;
        this.bottomY = 750;
        this.cardGameScale = 0.0;

        // 4. Sequence Timing & Flow State Machine
        this.gameState = 'INTRO_CHARS_CENTER';
        this.stateTimer = 2.0;

        this._cardRoundOutcomeHandled = false;
        this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;

        this._penaltyTimer = 0;
        this._winTimer = 0;
        this._resetDelayTimer = 0;

        // Initial layout trigger execution
        this.resize(this.width, this.height);
    }

    /**
     * Seamlessly re-calculates placement, scales sub-components, 
     * and maps layout nodes based on current sizing context.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Establish uniform base scale metrics relative to our reference coordinate map
        const baseScale = Math.min(width / 1280, height / 720);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.5), 1.4);

        // Standard upper right header anchors for menu overlay calls
        this.settingsBtn.x = width - 120;
        this.settingsBtn.y = 20;

        // Define Fluid Layout States & Breakpoint Matrices
        if (width < 600) {
            // ─────────────────────────────────────────────────────────
            // A. MOBILE LAYOUT
            // ─────────────────────────────────────────────────────────
            this.isMobile = true;
            this.isTablet = false;

            const cardW = Math.min(width * 0.92, 420);
            const cardH = cardW * (360 / 760); // Retain structural aspect-ratio configurations
            const debtW = 260;
            const debtH = 100;

            this.layout.chars = { x: 0, y: 0, w: width, h: height * 0.35, instance: this.chars };
            this.layout.cardGame = { x: (width - cardW) / 2, y: height * 0.28, w: cardW, h: cardH, instance: this.cardGame };
            this.layout.debt = { x: (width - debtW) / 2, y: height * 0.78, w: debtW, h: debtH, instance: this.debt };

            // Stack carrot controllers safely down to mobile interface margins
            this.layout.carrot = { x: 10, y: height * 0.78, w: 80, h: 90, instance: this.carrot };
            this.layout.carrotRight = { x: width - 90, y: height * 0.78, w: 80, h: 90, instance: this.carrotRight };

            this.carrot.layout = { nodeX: 40, nodeY: 50, baseX: 10, baseY: 30 };
            this.carrotRight.layout = { nodeX: 40, nodeY: 50, baseX: 10, baseY: 30 };

            // Dynamically assign context positions for the flow animation interpolator
            this.yPositions = {
                charsCenter: height * 0.22,
                charsMinimized: -height * 0.08,
                bottomOffscreen: height + 250,
                bottomOnscreen: height * 0.76
            };

        } else if (width < 1024) {
            // ─────────────────────────────────────────────────────────
            // B. TABLET LAYOUT
            // ─────────────────────────────────────────────────────────
            this.isMobile = false;
            this.isTablet = true;

            const cardW = width * 0.82;
            const cardH = cardW * (360 / 760);
            const debtW = 320;
            const debtH = 130;

            this.layout.chars = { x: 0, y: 0, w: width, h: height * 0.45, instance: this.chars };
            this.layout.cardGame = { x: (width - cardW) / 2, y: height * 0.24, w: cardW, h: cardH, instance: this.cardGame };
            this.layout.debt = { x: (width - debtW) / 2, y: height * 0.75, w: debtW, h: debtH, instance: this.debt };

            this.layout.carrot = { x: 30, y: height * 0.75, w: 140, h: 120, instance: this.carrot };
            this.layout.carrotRight = { x: width - 170, y: height * 0.75, w: 140, h: 120, instance: this.carrotRight };

            this.carrot.layout = { nodeX: 70, nodeY: 80, baseX: 30, baseY: 50 };
            this.carrotRight.layout = { nodeX: 70, nodeY: 80, baseX: 30, baseY: 50 };

            this.yPositions = {
                charsCenter: height * 0.18,
                charsMinimized: -height * 0.12,
                bottomOffscreen: height + 350,
                bottomOnscreen: height * 0.74
            };

        } else {
            // ─────────────────────────────────────────────────────────
            // C. DESKTOP NATIVE LAYOUT
            // ─────────────────────────────────────────────────────────
            this.isMobile = false;
            this.isTablet = false;

            const cardW = 760 * this.scaleFactor;
            const cardH = 360 * this.scaleFactor;
            const debtW = 340 * this.scaleFactor;
            const debtH = 140 * this.scaleFactor;

            this.layout.chars = { x: 0, y: 110, w: width, h: 500 * this.scaleFactor, instance: this.chars };
            this.layout.cardGame = { x: (width - cardW) / 2, y: (height - cardH) / 2 - 20, w: cardW, h: cardH, instance: this.cardGame };
            this.layout.debt = { x: (width - debtW) / 2, y: height - debtH - 30, w: debtW, h: debtH, instance: this.debt };

            // Full-canvas spatial overlays for desktop
            this.layout.carrot = { x: 0, y: 0, w: width, h: height, instance: this.carrot };
            this.layout.carrotRight = { x: 0, y: 0, w: width, h: height, instance: this.carrotRight };

            this.carrot.layout = { nodeX: 100, nodeY: 630, baseX: 40, baseY: 600 };
            this.carrotRight.layout = { nodeX: 100, nodeY: 630, baseX: 40, baseY: 600 };

            this.yPositions = {
                charsCenter: height * 0.15,
                charsMinimized: -50 * this.scaleFactor,
                bottomOffscreen: height + 400,
                bottomOnscreen: height - debtH - 40
            };
        }

        // Propagate updated sizing properties down to inner subcomponents
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

        // Snap animation vectors straight back to state baseline configurations
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

        // Core Game Flow Timing & State Updates (Swapped with modular position keys)
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

        // Apply visual smooth matrix interpolations
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
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, this.settingsBtn.w, this.settingsBtn.h, 8);
        } else {
            ctx.rect(0, 0, this.settingsBtn.w, this.settingsBtn.h);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px sans-serif';
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

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-50, -50, this.width + 100, this.height + 100);

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
                if (this.isMobile || this.isTablet) {
                    // Follow layout mapping anchor offset continuously relative to animated bottom slide container
                    const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                    ctx.translate(entry.x, entry.y + slideOffsetY);
                } else {
                    ctx.translate(0, this.bottomY - this.yPositions.bottomOnscreen);
                }
            } else if (key === 'debt') {
                if (this.isMobile || this.isTablet) {
                    const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                    ctx.translate(entry.x, entry.y + slideOffsetY);
                } else {
                    ctx.translate(entry.x, this.bottomY);
                }
            } else if (key === 'cardGame') {
                const cx = entry.x + entry.w / 2;
                const cy = entry.y + entry.h / 2;
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

        // Loop and perform relative input hit-tests
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
                if (this.isMobile || this.isTablet) {
                    const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                    bx = entry.x;
                    by = entry.y + slideOffsetY;
                } else {
                    bx = 0;
                    by = this.bottomY - this.yPositions.bottomOnscreen;
                    bw = this.width;
                    bh = this.height;
                }
            } else if (key === 'debt') {
                if (this.isMobile || this.isTablet) {
                    const slideOffsetY = this.bottomY - this.yPositions.bottomOnscreen;
                    by = entry.y + slideOffsetY;
                } else {
                    by = this.bottomY;
                }
            } else if (key === 'cardGame') {
                if (this.cardGameScale < 0.1) continue;

                scaleX = this.cardGameScale;
                scaleY = this.cardGameScale;
                bx = entry.x + (entry.w - entry.w * scaleX) / 2;
                by = entry.y + (entry.h - entry.h * scaleY) / 2;
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