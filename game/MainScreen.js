/**
 * MainScreen
 * * A composite game screen that orchestrates sub-components.
 * It receives isolated bounds and dt from GameManager, and translates 
 * the context/inputs further down to its child components.
 */
class MainScreen {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.onGameOver = config.onGameOver || (() => {});

        // 1. Initialize Sub-components
        // Pass configurations so they know their local bounding boxes
        this.debt = new DebtComponent({ width: 1280, height: 160 });
        this.chars = new Chars({ width: this.width, height: 200 });
        this.carrot = new CarrotCutter({ width: 440, height: 150 });
        this.cardGame = new CardGame({ width: 760, height: 360 }); 

        // 2. Define Sub-component Layout (Local to MainScreen)
        // This makes routing localized draw offsets and inputs much cleaner
        this.layout = {
            cardGame: { x: 260, y: 200, w: 760, h: 360, instance: this.cardGame },
            carrot:   { x: 40,  y: 580, w: 360, h: 140, instance: this.carrot },
            debt:     { x: 470, y: 580, w: 340, h: 140, instance: this.debt },
            chars:    { x: 0,   y: 0,   w: this.width, h: 200, instance: this.chars }
        };

        this._waitingPenaltyResolution = false;
        this._cardRoundOutcomeHandled = false;
        this._postWinPause = 0;
        this._pendingWinAfterPenalty = false;
        this._lastCarrotCount = this.carrot.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;
    }

    reset() {
        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.reset === 'function') {
                comp.reset();
            }
        }
        this._waitingPenaltyResolution = false;
        this._cardRoundOutcomeHandled = false;
        this._postWinPause = 0;
        this._pendingWinAfterPenalty = false;
        this._lastCarrotCount = this.carrot.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;
    }

    /** Standard lifecycle step piped from GameManager */
    update(dt) {
        // Step all sub-components that have an update method
        for (const key in this.layout) {
            const comp = this.layout[key].instance;
            if (typeof comp.update === 'function') {
                comp.update(dt);
            }
        }

        if (this._postWinPause > 0) {
            this._postWinPause -= dt;
            if (this._postWinPause <= 0) {
                this.onGameOver();
            }
            return;
        }

        if (this._waitingPenaltyResolution) {
            this._checkPenaltyResolution();
        }

        if (this._cardRoundOutcomeHandled) {
            return;
        }

        if (this.cardGame && typeof this.cardGame.gameEnd === 'function' && this.cardGame.gameEnd()) {
            this._handleCardOutcome();
        }
    }

    /** Render step piped from GameManager */
    draw(ctx) {
        // Optional: Draw a base background for this screen
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, this.width, this.height);

        const drawOrder = ['cardGame', 'carrot', 'debt', 'chars'];
        for (const key of drawOrder) {
            const layoutEntry = this.layout[key];
            if (!layoutEntry) continue;
            const { x, y, instance } = layoutEntry;
            if (typeof instance.draw === 'function') {
                ctx.save();
                ctx.translate(x, y);
                instance.draw(ctx);
                ctx.restore();
            }
        }
    }

    /** * Input Routing 
     * Matches GameManager's hit-testing but pushes coordinates down one more level 
     */
    _handleCardOutcome() {
        if (this._cardRoundOutcomeHandled || !this.cardGame.gameEnd()) {
            return;
        }

        this._cardRoundOutcomeHandled = true;

        if (this.cardGame.didWin()) {
            this.debt.pay();
            if (this.debt.debt <= 0) {
                if (this._pendingWinAfterPenalty) {
                    this.chars.win();
                    this._postWinPause = 2;
                } else {
                    this.onGameOver();
                }
                return;
            }

            if (this._pendingWinAfterPenalty) {
                this.chars.win();
                this._postWinPause = 2;
                return;
            }

            this.cardGame.reset();
            this._cardRoundOutcomeHandled = false;
            return;
        }

        // Losing a round triggers penalty resolution instead of immediate end.
        this._waitingPenaltyResolution = true;
        this._pendingWinAfterPenalty = true;
        this.carrot.unlock();
        this.chars.next();
        this._lastCarrotCount = this.carrot.checkCut();
        this._lastAliveCount = this.chars.characters.filter(c => c.alive).length;
    }

    _checkPenaltyResolution() {
        const currentCarrotCount = this.carrot.checkCut();
        const currentAliveCount = this.chars.characters.filter(c => c.alive).length;

        const carrotCut = currentCarrotCount < this._lastCarrotCount;
        const friendLost = currentAliveCount < this._lastAliveCount;

        if (!carrotCut && !friendLost) {
            return;
        }

        this._waitingPenaltyResolution = false;

        if (currentCarrotCount > 0) {
            this.cardGame.reset();
            this._cardRoundOutcomeHandled = false;
            this._pendingWinAfterPenalty = true;
            this._lastCarrotCount = currentCarrotCount;
            this._lastAliveCount = currentAliveCount;
            return;
        }

        this.onGameOver();
    }

    _routeInput(methodName, x, y) {
        for (const key in this.layout) {
            const { x: bx, y: by, w: bw, h: bh, instance } = this.layout[key];
            
            if (typeof instance[methodName] !== 'function') continue;

            // Simple AABB hit test for the sub-component's region
            if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
                // Pass the event down, localized to the component's (0,0) origin
                instance[methodName](x - bx, y - by);
            }
        }
    }

    handleMouseDown(x, y) { this._routeInput('handleMouseDown', x, y); }
    handleMouseMove(x, y) { this._routeInput('handleMouseMove', x, y); }
    handleMouseUp(x, y)   { this._routeInput('handleMouseUp', x, y); }
    handleMouseClick(x, y) { this._routeInput('handleMouseClick', x, y); }
}