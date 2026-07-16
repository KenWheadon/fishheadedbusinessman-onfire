class MainScreen {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.onGameOver = config.onGameOver || (() => {});
        this.onSettings = config.onSettings || (() => {});

        this.settingsBtn = { x: this.width - 120, y: 20, w: 100, h: 40, hovered: false };

        // 1. Sub-component Setup
        this.debt = new DebtComponent({ width: 340, height: 140 });
        this.chars = new Chars({ width: this.width, height: 500 });
        this.carrot = new CarrotCutter({ width: this.width, height: this.height, align: 'left' });
        // adjust to match previous visual position of x:40, y:550, w:360, h:140
        this.carrot.layout.nodeX = 100; // 40 + 60
        this.carrot.layout.nodeY = 630; // 550 + (140 - 60)
        this.carrot.layout.baseX = 40;
        this.carrot.layout.baseY = 600; // 550 + (140 - 90)

        this.carrotRight = new CarrotCutter({ width: this.width, height: this.height, align: 'right' });
        this.carrotRight.layout.nodeX = 100; 
        this.carrotRight.layout.nodeY = 630; 
        this.carrotRight.layout.baseX = 40;
        this.carrotRight.layout.baseY = 600; 
        this.cardGame = new CardGame({ width: 760, height: 360 }); 
        this.popup = new GamePopup({ width: 500, height: 250 });

        // Force Chars components to lock initial inputs until popup is accepted
        this.chars.locked = true;

        // 2. Base Coordinates Layout Reference Map
        this.layout = {
            cardGame: { x: 260, y: 180, w: 760, h: 360, instance: this.cardGame },
            carrot:   { x: 0,   y: 0,   w: this.width, h: this.height, instance: this.carrot },
            carrotRight: { x: 0, y: 0, w: this.width, h: this.height, instance: this.carrotRight },
            debt:     { x: 470, y: 550, w: 340, h: 140, instance: this.debt },
            chars:    { x: 0,   y: 110, w: this.width, h: 500, instance: this.chars }
        };

        // 3. Coordinate Animation Interpolation Engines
        this.charsY = 110;          // Start centered on screen
        this.charsScale = 1.0;      // Start at full center scale
        this.bottomY = 750;         // Offscreen bottom
        this.cardGameScale = 0.0;   // Hidden initially

        // 4. Sequence Timing & Flow State Machine
        // States: 'INTRO_CHARS_CENTER', 'INTRO_MINIMIZE', 'INTRO_CARDS_APPEAR', 'PLAYING', 
        //         'PENALTY_SLIDE_DOWN', 'PENALTY_WAIT_CHOICE', 'PENALTY_RESOLUTION', 'PENALTY_SLIDE_UP', 
        //         'WIN_SEQUENCE', 'WIN_WAIT', 'LOSE_SEQUENCE'
        this.gameState = 'INTRO_CHARS_CENTER';
        this.stateTimer = 2.0;      // Show chars in center for 2 seconds

        this._cardRoundOutcomeHandled = false;
        this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;
        
        this._penaltyTimer = 0;
        this._winTimer = 0;
        this._resetDelayTimer = 0;
    }

    reset() {
        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.reset === 'function') {
                comp.reset();
            }
        }
        this.popup.close();

        this.charsY = 110;
        this.charsScale = 1.0;
        this.bottomY = 750;
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

        // Standard sub-component updates
        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.update === 'function') {
                comp.update(safeDt);
            }
        }
        this.popup.update(safeDt);

        // Core Game Flow Timing & State Updates
        let targetCharsY = 110;
        let targetCharsScale = 1.0;
        let targetBottomY = 750;
        let targetCardGameScale = 0.0;

        switch (this.gameState) {
            case 'INTRO_CHARS_CENTER':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 750;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'INTRO_MINIMIZE';
                    this.stateTimer = 1.5; // wait for transition
                }
                break;

            case 'INTRO_MINIMIZE':
                targetCharsY = -50;       // Minimize up into top header border
                targetCharsScale = 0.5;
                targetBottomY = 550;      // Slide Debt/Carrots up
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'INTRO_CARDS_APPEAR';
                    this.stateTimer = 1.2; // wait for deal scale
                }
                break;

            case 'INTRO_CARDS_APPEAR':
                targetCharsY = -50;
                targetCharsScale = 0.5;
                targetBottomY = 550;
                targetCardGameScale = 1.0; // Scale-up center Cards

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    // Instantly trigger flow popup
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
                targetCharsY = -50;
                targetCharsScale = 0.5;
                targetBottomY = 550;
                targetCardGameScale = 1.0;
                break;

            case 'PLAYING':
                targetCharsY = -50;
                targetCharsScale = 0.5;
                targetBottomY = 550;
                targetCardGameScale = 1.0;

                if (this.cardGame.gameEnd() && !this._cardRoundOutcomeHandled) {
                    this._cardRoundOutcomeHandled = true;
                    
                    if (this.cardGame.didWin()) {
                        this.debt.pay();
                        if (this.debt.debt <= 0) {
                            this.gameState = 'WIN_SEQUENCE';
                            this.stateTimer = 1.2; // Slide characters back down
                        } else {
                            // Give player 1.5 seconds visual feedback on match before clean redeal
                            this._resetDelayTimer = 1.5;
                        }
                    } else {
                        // Skull Uncovered! Proceed with penalty selector slide down
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
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0; // Cards disappear

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    // Unlock Character/Carrot interactions
                    this.chars.locked = false;
                    this.carrot.unlock();
                    this.carrotRight.unlock();

                    this._lastCarrotCount = this.carrot.checkCut() + this.carrotRight.checkCut();
                    this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;

                    this.gameState = 'PENALTY_WAIT_CHOICE';
                }
                break;

            case 'PENALTY_WAIT_CHOICE':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0;

                const curCarrots = this.carrot.checkCut() + this.carrotRight.checkCut();
                const curAlive = this.chars.characters.filter(c => c.alive).length;

                // Monitor inputs until player has exploded a character OR cut off a carrot
                const carrotCut = curCarrots < this._lastCarrotCount;
                const charExploded = curAlive < this._lastAliveCount;

                if (carrotCut || charExploded) {
                    // Instantly relock selections
                    this.chars.locked = true;
                    this.carrot.isLocked = true;
                    this.carrotRight.isLocked = true;

                    this._penaltyTimer = 3.0; // Let animations run for 3 seconds
                    this.gameState = 'PENALTY_RESOLUTION';
                }
                break;

            case 'PENALTY_RESOLUTION':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0;

                this._penaltyTimer -= safeDt;
                if (this._penaltyTimer <= 0) {
                    if (this.carrot.checkCut() + this.carrotRight.checkCut() <= 0) {
                        this.gameState = 'LOSE_SEQUENCE';
                        this.stateTimer = 2.0; // Wait before rendering gameover loss
                    } else {
                        // Redeal clean card array and slide selector back to top
                        this.cardGame.reset();
                        this._cardRoundOutcomeHandled = false;
                        
                        this.gameState = 'PENALTY_SLIDE_UP';
                        this.stateTimer = 1.2;
                    }
                }
                break;

            case 'PENALTY_SLIDE_UP':
                targetCharsY = -50;
                targetCharsScale = 0.5;
                targetBottomY = 550;
                targetCardGameScale = 1.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.gameState = 'PLAYING';
                }
                break;

            case 'WIN_SEQUENCE':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0;

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.chars.win(); // Trigger win system explosion of hearts
                    this._winTimer = 4.0; // wait 4 seconds
                    this.gameState = 'WIN_WAIT';
                }
                break;

            case 'WIN_WAIT':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0;

                this._winTimer -= safeDt;
                if (this._winTimer <= 0) {
                    this.onGameOver(true); // Complete win
                }
                break;

            case 'LOSE_SEQUENCE':
                targetCharsY = 110;
                targetCharsScale = 1.0;
                targetBottomY = 550;
                targetCardGameScale = 0.0;

                this.debt.lost(); // Trigger blood rain / stamp overlay

                this.stateTimer -= safeDt;
                if (this.stateTimer <= 0) {
                    this.onGameOver(false); // Transition to end screen with a loss
                }
                break;
        }

        // Apply smooth visual interpolations
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
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw components according to active state layers
        const drawOrder = ['cardGame', 'chars', 'debt', 'carrot', 'carrotRight'];
        for (const key of drawOrder) {
            const entry = this.layout[key];
            if (!entry) continue;
            const instance = entry.instance;

            ctx.save();
            if (key === 'chars') {
                const charsX = (this.width - this.width * this.charsScale) / 2;
                ctx.translate(charsX, this.charsY);
                ctx.scale(this.charsScale, this.charsScale);
            } else if (key === 'carrot' || key === 'carrotRight') {
                ctx.translate(0, this.bottomY - 550);
            } else if (key === 'debt') {
                ctx.translate(entry.x, this.bottomY);
            } else if (key === 'cardGame') {
                // Scale outward from component matrix center
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

        // Draw Settings Button
        this._drawSettingsButton(ctx);

        // Render Popup modal in standard layout center
        if (this.popup.isOpen || this.popup.isTransitioning) {
            const px = (this.width - this.popup.width) / 2;
            const py = (this.height - this.popup.height) / 2;
            this.popup.draw(ctx, px, py);
        }
    }

    _routeInput(methodName, x, y) {
        // 1. Modal Interception: Route exclusively to popup if open
        if (this.popup.isOpen) {
            const px = (this.width - this.popup.width) / 2;
            const py = (this.height - this.popup.height) / 2;
            if (typeof this.popup[methodName] === 'function') {
                this.popup[methodName](x - px, y - py);
            }
            return;
        }

        // Settings Button Hit Test
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

        // 2. Chars Interception: Stop background inputs if Character Plead modal is active
        if (this.chars.isModalOpen) {
            const scale = this.charsScale;
            const localX = (x - 0) / scale;
            const localY = (y - this.charsY) / scale;
            if (typeof this.chars[methodName] === 'function') {
                this.chars[methodName](localX, localY);
            }
            return;
        }

        // 3. Normal layout hit tests with scaling transforms
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
                bx = (this.width - this.width * this.charsScale) / 2;
                by = this.charsY;
                scaleX = this.charsScale;
                scaleY = this.charsScale;
                bw = this.width * scaleX;
                bh = entry.h * scaleY;
            } else if (key === 'carrot' || key === 'carrotRight') {
                bx = 0;
                by = this.bottomY - 550;
                bw = this.width;
                bh = this.height;
            } else if (key === 'debt') {
                by = this.bottomY;
            } else if (key === 'cardGame') {
                if (this.cardGameScale < 0.1) continue; // Do not route to collapsed card game
                
                scaleX = this.cardGameScale;
                scaleY = this.cardGameScale;
                bw = entry.w * scaleX;
                bh = entry.h * scaleY;
            }

            // Target region hit check
            if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                const localX = (x - bx) / scaleX;
                const localY = (y - by) / scaleY;
                instance[methodName](localX, localY);
            }
        }
    }

    handleMouseDown(x, y) { this._routeInput('handleMouseDown', x, y); }
    handleMouseMove(x, y) { this._routeInput('handleMouseMove', x, y); }
    handleMouseUp(x, y)   { this._routeInput('handleMouseUp', x, y); }
    handleMouseClick(x, y) { this._routeInput('handleMouseClick', x, y); }
}