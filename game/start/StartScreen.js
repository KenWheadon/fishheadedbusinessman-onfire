class StartScreen {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        
        // Setup Callbacks
        this.onSettings = config.onSettings || (() => {});
        this.onPlay = config.onPlay || (() => {});
        
        // Component state
        this.state = 'ACTIVE'; // ACTIVE, POPPING_OUT, OFFSCREEN
        this.time = 0;
        
        // Dynamic positioning based on component dimensions
        this.logo = {
            x: this.width / 2,
            y: this.height * 0.3,
            width: Math.min(this.width * 0.375, 300),
            height: Math.min(this.height * 0.25, 150),
            scale: 1,
            targetScale: 1,
            rotation: 0,
            twirlVelocity: 0
        };

        // Buttons setup (HELP completely removed, coordinates auto-spaced)
        const startY = this.height * 0.58;
        const spacing = Math.min(this.height * 0.13, 80);
        
        this.buttons = [
            this.createButton('PLAY', startY, '#4CAF50'),
            this.createButton('SETTINGS', startY + spacing, '#FF9800')
        ];

        // Decoupled Mouse Local State
        this.mouseX = -9999;
        this.mouseY = -9999;
        
        // State transition trackers (replacing setTimeout)
        this.popOutTimer = 0;
        this.popOutPhase = 0; // 0: Inactive, 1: Anticipation, 2: Shrink
    }

    createButton(text, y, color) {
        return {
            text: text,
            x: this.width / 2,
            y: y,
            width: Math.min(this.width * 0.25, 200),
            height: Math.min(this.height * 0.083, 50),
            color: color,
            scale: 1,
            targetScale: 1,
            isHovered: false
        };
    }

    // Public Reset API (Restores component to pristine starting state)
    reset() {
        this.state = 'ACTIVE';
        this.time = 0;
        
        this.logo.scale = 1;
        this.logo.targetScale = 1;
        this.logo.rotation = 0;
        this.logo.twirlVelocity = 0;

        this.buttons.forEach(btn => {
            btn.scale = 1;
            btn.targetScale = 1;
            btn.isHovered = false;
        });

        this.popOutTimer = 0;
        this.popOutPhase = 0;
    }

    // Localized Input Hooks
    handleMouseMove(localX, localY) {
        this.mouseX = localX;
        this.mouseY = localY;
    }

    handleMouseDown(localX, localY) {
        this.mouseX = localX;
        this.mouseY = localY;

        if (this.state !== 'ACTIVE') return;

        // Check Logo Click (Give it high angular velocity)
        if (this.isPointInRect(this.mouseX, this.mouseY, this.logo)) {
            this.logo.twirlVelocity = 12; // Dynamic spin impulse
            this.logo.targetScale = 1.2;
        }

        // Check Button Clicks (Visual press down feel)
        this.buttons.forEach(btn => {
            if (this.isPointInRect(this.mouseX, this.mouseY, btn)) {
                btn.isHovered = true;
                btn.targetScale = 0.8; 
            }
        });
    }

    handleMouseUp(localX, localY) {
        this.mouseX = localX;
        this.mouseY = localY;

        if (this.state !== 'ACTIVE') return;
        
        this.logo.targetScale = 1;

        this.buttons.forEach(btn => {
            const isHovered = this.isPointInRect(this.mouseX, this.mouseY, btn);
            if (isHovered) {
                if (btn.text === 'PLAY') this.triggerPopOut();
                if (btn.text === 'SETTINGS') this.onSettings();
                btn.targetScale = 1.1;
            } else {
                btn.targetScale = 1.0;
            }
            btn.isHovered = isHovered;
        });
    }

    handleMouseClick(localX, localY) {
        this.handleMouseDown(localX, localY);
        this.handleMouseUp(localX, localY);
    }

    isPointInRect(px, py, rect) {
        return px > rect.x - rect.width / 2 && 
               px < rect.x + rect.width / 2 && 
               py > rect.y - rect.height / 2 && 
               py < rect.y + rect.height / 2;
    }

    triggerPopOut() {
        this.state = 'POPPING_OUT';
        this.popOutTimer = 0.15; // 150ms anticipation phase
        this.popOutPhase = 1; 
        
        this.logo.targetScale = 1.4;
        this.buttons.forEach(btn => btn.targetScale = 1.4);
    }

    isoffscreen() {
        return this.state === 'OFFSCREEN';
    }

    // Mathematical frame-rate independent interpolation
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    update(dt) {
        // Scalar to match original 60fps frame calculations
        const frameMultiplier = dt * 60;
        this.time += dt * 3.0; 

        if (this.state === 'OFFSCREEN') return;

        // Manage Pop Out transition cycles strictly with dt
        if (this.state === 'POPPING_OUT') {
            if (this.popOutPhase === 1) {
                this.popOutTimer -= dt;
                if (this.popOutTimer <= 0) {
                    this.popOutPhase = 2; // Move to shrink phase
                    this.logo.targetScale = 0;
                    this.buttons.forEach(btn => btn.targetScale = 0);
                }
            } else if (this.popOutPhase === 2 && this.logo.scale < 0.05) {
                this.state = 'OFFSCREEN';
                this.logo.scale = 0;
                this.buttons.forEach(btn => btn.scale = 0);
                if (this.onPlay) this.onPlay();
            }
        }

        // Update Logo Scale Juice
        const logoRate = 1 - Math.pow(1 - 0.2, frameMultiplier);
        this.logo.scale = this.lerp(this.logo.scale, this.logo.targetScale, logoRate);
        
        // Update Logo Rotation (Twirl impulse fades and elastic-snaps back to original 0 rotation)
        this.logo.rotation += this.logo.twirlVelocity * frameMultiplier;
        
        const twirlRate = 1 - Math.pow(1 - 0.1, frameMultiplier);
        this.logo.twirlVelocity = this.lerp(this.logo.twirlVelocity, 0, twirlRate);

        const snapBackRate = 1 - Math.pow(1 - 0.12, frameMultiplier);
        this.logo.rotation = this.lerp(this.logo.rotation, 0, snapBackRate);

        // Update Buttons Juice
        this.buttons.forEach((btn, index) => {
            if (this.state === 'ACTIVE') {
                btn.isHovered = this.isPointInRect(this.mouseX, this.mouseY, btn);
                
                if (btn.isHovered) {
                    const hoverRate = 1 - Math.pow(1 - 0.2, frameMultiplier);
                    btn.targetScale = this.lerp(btn.targetScale, 1.1, hoverRate);
                } else {
                    const idleScale = 1 + Math.sin(this.time + index) * 0.02;
                    const idleRate = 1 - Math.pow(1 - 0.2, frameMultiplier);
                    btn.targetScale = this.lerp(btn.targetScale, idleScale, idleRate);
                }
            }
            const btnScaleRate = 1 - Math.pow(1 - 0.3, frameMultiplier);
            btn.scale = this.lerp(btn.scale, btn.targetScale, btnScaleRate);
        });
    }

    draw(ctx, x, y) {
        if (this.state === 'OFFSCREEN') return;

        ctx.save();
        // Translate context relative to offset specified by caller
        ctx.translate(x, y);

        // Clip context bounds to guarantee strict modular layout boundaries
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();

        // Local background card design
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Logo
        ctx.save();
        const logoIdleY = this.state === 'ACTIVE' ? Math.sin(this.time) * 5 : 0;
        ctx.translate(this.logo.x, this.logo.y + logoIdleY);
        ctx.rotate(this.logo.rotation);
        ctx.scale(this.logo.scale, this.logo.scale);
        
        // Safe global asset lookup
        let logoImg = null;
        try {
            logoImg = typeof AssetManager !== 'undefined' ? AssetManager.get('logo') : null;
        } catch (e) {}

        if (logoImg) {
            ctx.drawImage(logoImg, -this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
        } else {
            // Elegant placeholder fallback 
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 4;
            ctx.strokeRect(-this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
            
            ctx.fillStyle = '#000';
            ctx.font = 'bold 22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOGO IMAGE', 0, 0);
        }
        ctx.restore();

        // Draw Buttons
        this.buttons.forEach(btn => {
            ctx.save();
            ctx.translate(btn.x, btn.y);
            ctx.scale(btn.scale, btn.scale);

            // Button Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(-btn.width / 2, -btn.height / 2 + 5, btn.width, btn.height, 10);
            ctx.fill();

            // Button Body
            ctx.fillStyle = btn.color;
            ctx.beginPath();
            ctx.roundRect(-btn.width / 2, -btn.height / 2, btn.width, btn.height, 10);
            ctx.fill();

            // Button Text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.text, 0, 0);

            ctx.restore();
        });

        ctx.restore();
    }
}