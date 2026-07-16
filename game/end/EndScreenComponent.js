class EndScreenComponent {
    constructor({ width, height, onMainMenu, onSettings, onCredits }) {
        // Core Layout Boundaries
        this.width = width;
        this.height = height;

        // Callbacks
        this.callbacks = { onMainMenu, onSettings, onCredits };
        
        // Internal State & Juice
        this.introProgress = 0; // Animates from 0 to 1
        this.isWin = true; // Added state for win/loss
        this.buttons = [];
        
        this._buildLayout();
    }

    setWinState(isWin) {
        this.isWin = isWin;
    }

    _buildLayout() {
        const centerX = this.width / 2;
        const startY = this.height / 2;
        const btnWidth = 240;
        const btnHeight = 60;
        const gap = 20;

        this.buttons = [
            { text: "Main Menu", x: centerX - btnWidth/2, y: startY, w: btnWidth, h: btnHeight, action: this.callbacks.onMainMenu, hover: false, scale: 1 },
            { text: "Settings", x: centerX - btnWidth/2, y: startY + btnHeight + gap, w: btnWidth, h: btnHeight, action: this.callbacks.onSettings, hover: false, scale: 1 },
            { text: "Credits", x: centerX - btnWidth/2, y: startY + (btnHeight + gap) * 2, w: btnWidth, h: btnHeight, action: this.callbacks.onCredits, hover: false, scale: 1 }
        ];
    }

    // 1. UPDATE: Handles all internal physics, timers, and spring math
    update(dt) {
        // Intro animation lerp
        if (this.introProgress < 1) {
            this.introProgress += dt * 1.5; // dt is in seconds, multiplier of 1.5 means it takes 0.66s
            if (this.introProgress > 1) this.introProgress = 1;
        }

        // Button hover spring physics (Juice)
        const springStiffness = 0.015;
        this.buttons.forEach(btn => {
            const targetScale = btn.hover ? 1.08 : 1.0;
            // Simple ease towards target
            btn.scale += (targetScale - btn.scale) * (dt * springStiffness);
        });
    }

    // 2. DRAW: Renders relative to x/y, strictly within its width/height bounds
    draw(ctx, x, y) {
        ctx.save();
        
        // Translate to the requested layout block position
        ctx.translate(x, y);

        // Enforce component boundaries (acts like overflow: hidden)
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();

        // Background Overlay (Fades in based on introProgress)
        ctx.fillStyle = `rgba(15, 20, 25, ${0.9 * this.introProgress})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Title (Slides down slightly based on introProgress)
        const titleY = (this.height / 2 - 100) - (20 * (1 - this.introProgress));
        
        // Dynamically style and text for Win vs Loss
        ctx.fillStyle = this.isWin 
            ? `rgba(255, 255, 255, ${this.introProgress})` 
            : `rgba(231, 76, 60, ${this.introProgress})`;
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const titleText = this.isWin ? 'STAGE CLEARED' : 'GAME OVER';
        ctx.fillText(titleText, this.width / 2, titleY);

        // Draw Buttons
        ctx.font = '20px sans-serif';
        this.buttons.forEach((btn, index) => {
            // Stagger button alpha based on index for a cascading fade-in
            const btnAlphaProgress = Math.max(0, Math.min(1, (this.introProgress - (index * 0.1)) * 2));
            
            ctx.save();
            // Translate to button center for scaling
            ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
            ctx.scale(btn.scale, btn.scale);

            // Button Fill
            ctx.fillStyle = btn.hover ? `rgba(231, 76, 60, ${btnAlphaProgress})` : `rgba(44, 62, 80, ${btnAlphaProgress})`;
            ctx.fillRect(-btn.w / 2, -btn.h / 2, btn.w, btn.h);

            // Button Border
            ctx.strokeStyle = `rgba(236, 240, 241, ${btnAlphaProgress})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(-btn.w / 2, -btn.h / 2, btn.w, btn.h);

            // Button Text
            ctx.fillStyle = `rgba(255, 255, 255, ${btnAlphaProgress})`;
            ctx.fillText(btn.text, 0, 0);

            ctx.restore();
        });

        ctx.restore();
    }

    // 3. INPUT: Purely local coordinates (0 to this.width, 0 to this.height)
    handleMouseMove(localX, localY) {
        let isHoveringAny = false;
        this.buttons.forEach(btn => {
            btn.hover = (localX >= btn.x && localX <= btn.x + btn.w &&
                         localY >= btn.y && localY <= btn.y + btn.h);
            if (btn.hover) isHoveringAny = true;
        });
        
        // Return boolean so the parent orchestrator knows if it should set cursor: pointer
        return isHoveringAny; 
    }

    handleMouseClick(localX, localY) {
        this.buttons.forEach(btn => {
            if (localX >= btn.x && localX <= btn.x + btn.w &&
                localY >= btn.y && localY <= btn.y + btn.h) {
                if (btn.action) btn.action();
            }
        });
    }
}