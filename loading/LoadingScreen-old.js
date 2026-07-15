class LoadingScreen {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Core State
        this.progress = 0;          // The actual target progress (0.0 to 1.0)
        this.currentProgress = 0;   // The smoothed visual progress
        this.isActive = false;
        this._isLoaded = false;
        this._isOffScreen = false;

        // Animation & Visual State
        this.yOffset = 0;           // Controls the exit animation
        this.time = 0;              // Drives the visual flourish (pulsing/stripes)
        this.autoFillSpeed = 0.0005;// The rate at which the bar slowly fills automatically
        this.animationFrame = null;
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.loop();
    }

    update(val) {
        // Clamp the updated value between current auto-progress and 1.0
        this.progress = Math.max(this.progress, Math.min(val, 1.0));
    }

    loaded() {
        this._isLoaded = true;
        this.progress = 1.0;
    }

    isoffscreen() {
        return this._isOffScreen;
    }

    reset() {
        this.progress = 0;
        this.currentProgress = 0;
        this.isActive = false;
        this._isLoaded = false;
        this._isOffScreen = false;
        this.yOffset = 0;
        this.time = 0;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Wipe the canvas clean
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    loop() {
        if (!this.isActive) return;

        this.updateLogic();
        this.draw();

        // Continue the animation loop until it has fully exited the screen
        if (!this._isOffScreen) {
            this.animationFrame = requestAnimationFrame(() => this.loop());
        }
    }

    updateLogic() {
        this.time += 0.05;

        // 1. Slowly auto-fill up to 90% if the game hasn't called loaded() yet
        if (!this._isLoaded && this.progress < 0.9) {
            this.progress += this.autoFillSpeed;
        }

        // 2. Smoothly ease the visual progress bar towards the target progress
        this.currentProgress += (this.progress - this.currentProgress) * 0.1;

        // 3. Handle the off-screen exit animation
        if (this._isLoaded && this.currentProgress >= 0.99) {
            this.yOffset += 15; // Slide everything upward
            
            // Once the offset exceeds the canvas height, shut it down
            if (this.yOffset > this.height) {
                this._isOffScreen = true;
                this.isActive = false;
            }
        }
    }

    draw() {
        const { ctx, width, height } = this;

        // Clear previous frame
        ctx.clearRect(0, 0, width, height);

        if (this._isOffScreen) return;

        ctx.save();
        
        // Apply the translation for the exit animation
        ctx.translate(0, -this.yOffset);

        // Draw background (extend height slightly to prevent tearing during slide)
        ctx.fillStyle = '#111111'; 
        ctx.fillRect(0, 0, width, height + this.yOffset); 

        // Center coordinates
        const centerX = width / 2;
        const centerY = height / 2;

        this.drawLogo(centerX, centerY - 60);
        this.drawBar(centerX - 200, centerY + 40, 400, 30);

        ctx.restore();
    }

    drawLogo(x, y) {
        const { ctx, time } = this;
        ctx.save();
        ctx.translate(x, y);

        // Pulsing scale effect 
        const scale = 1 + Math.sin(time * 2) * 0.03;
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Cyan glow effect
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10 + Math.sin(time * 4) * 5;

        ctx.fillText('ENGINE', 0, 0); 
        ctx.restore();
    }

    drawBar(x, y, w, h) {
        const { ctx, time } = this;

        // Outer container border
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        const padding = 4;
        const fillWidth = (w - padding * 2) * this.currentProgress;
        const fillHeight = h - padding * 2;

        if (fillWidth > 0) {
            ctx.save();
            
            // Clip to the current fill area to contain the moving stripes
            ctx.beginPath();
            ctx.rect(x + padding, y + padding, fillWidth, fillHeight);
            ctx.clip();

            // Bar base color
            ctx.fillStyle = '#00f3ff';
            ctx.fillRect(x + padding, y + padding, fillWidth, fillHeight);

            // Moving diagonal stripe overlay
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            const stripeWidth = 20;
            const offset = (time * 25) % (stripeWidth * 2);

            for (let i = -stripeWidth * 2; i < w; i += stripeWidth * 2) {
                ctx.beginPath();
                ctx.moveTo(x + padding + i + offset, y + padding);
                ctx.lineTo(x + padding + i + offset + stripeWidth, y + padding);
                ctx.lineTo(x + padding + i + offset + stripeWidth - 10, y + padding + fillHeight);
                ctx.lineTo(x + padding + i + offset - 10, y + padding + fillHeight);
                ctx.fill();
            }

            ctx.restore();
        }
    }
}