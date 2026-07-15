class GamePopup {
    constructor(config = {}) {
        // Configuration
        this.width = config.width || 500;
        this.height = config.height || 250;

        // State variables
        this.isOpen = false;
        this.isTransitioning = false;
        this.message = "";
        this.image = null; // Assumes a preloaded Image/Canvas asset passed externally
        this.callback = null;

        // Animation / Physics state
        this.scale = 0;
        this.targetScale = 0;
        this.velScale = 0;
        this.opacity = 0;
        this.yOffset = 100; // Slide down offset
        this.targetYOffset = 100;

        // Spring constants (Framerate independent updates applied)
        this.springStiffness = 0.15;
        this.springDamping = 0.75;

        // Button state & Animation
        this.btnHovered = false;
        this.btnScale = 1;
        this.btnTargetScale = 1;

        // Bounds for mouse clicks (relative to component-local space)
        this.btnWidth = 100;
        this.btnHeight = 40;
        this.btnX = this.width - this.btnWidth - 30; // Bottom right-ish
        this.btnY = this.height - this.btnHeight - 20;
    }

    /**
     * Activates the component.
     * @param {string} message - Text content to render.
     * @param {HTMLImageElement} preloadedImage - A preloaded, ready-to-draw Image object.
     * @param {Function} [callback] - Invoked once the close animation fully finishes.
     */
    show(message, preloadedImage, callback = null) {
        this.message = message;
        this.image = preloadedImage;
        this.callback = callback;
        this.isOpen = true;
        this.isTransitioning = true;

        // Trigger entrance targets
        this.targetScale = 1;
        this.targetYOffset = 0;
    }

    close() {
        this.isTransitioning = true;
        this.targetScale = 0;
        this.targetYOffset = 80; // Slide down out of view
    }

    /**
     * Framerate-independent state evaluation.
     * @param {number} dt - Delta time in seconds since the last frame (e.g. 0.016).
     */
    update(dt) {
        // Normalize physics updates around ~60 FPS (step multiplier)
        const step = Math.min(dt * 60, 2); // Cap scaling to avoid physics freakouts on massive lag spikes

        // --- Spring physics for the main scale ---
        let force = (this.targetScale - this.scale) * this.springStiffness;
        this.velScale += force * step;
        this.velScale *= Math.pow(this.springDamping, step);
        this.scale += this.velScale * step;

        // Smoothly interpolate Y Offset & Opacity
        this.yOffset += (this.targetYOffset - this.yOffset) * (1 - Math.pow(1 - 0.15, step));
        
        const targetOpacity = (this.isOpen && this.targetScale > 0) ? 1 : 0;
        this.opacity += (targetOpacity - this.opacity) * (1 - Math.pow(1 - 0.2, step));

        // Button Hover squash-and-stretch interpolation
        this.btnTargetScale = this.btnHovered ? 1.1 : 1.0;
        this.btnScale += (this.btnTargetScale - this.btnScale) * (1 - Math.pow(1 - 0.25, step));

        // Handle closure callback cleanly when exit transition is complete
        if (!this.isOpen && this.scale < 0.01 && this.isTransitioning) {
            this.isTransitioning = false;
            if (this.callback) {
                const cb = this.callback;
                this.callback = null; // Prevent double execution
                cb();
            }
        }
    }

    /**
     * Renders the component onto a parent canvas relative to a local offset.
     * @param {CanvasRenderingContext2D} ctx - Target execution layer context.
     * @param {number} x - Parent workspace translation X coordinate.
     * @param {number} y - Parent workspace translation Y coordinate.
     */
    draw(ctx, x, y) {
        // Completely skip execution if the component is asleep/hidden
        if (!this.isOpen && !this.isTransitioning) return;

        ctx.save();

        // Translate and scale relative to component center for dynamic animations
        const centerX = x + this.width / 2;
        const centerY = y + this.height / 2 + this.yOffset;
        
        ctx.translate(centerX, centerY);
        ctx.scale(this.scale, this.scale);
        
        // Translate back to origin point (0, 0) relative to current position matrix
        ctx.translate(-this.width / 2, -this.height / 2);

        // Respect system transitions (fading layer)
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = prevAlpha * this.opacity;

        // 1. Draw Dialog Background (Game UI Box)
        ctx.fillStyle = '#1e1e2e'; // Dark background
        ctx.strokeStyle = '#f5c2e7'; // Juicy pink border
        ctx.lineWidth = 6;
        this.drawRoundedRect(ctx, 3, 3, this.width - 6, this.height - 6, 16, true, true);

        // 2. Draw Left-aligned Square Image (cropped)
        const pad = 20;
        const imgSize = this.height - (pad * 2);
        
        // Draw image frame background
        ctx.fillStyle = '#11111b';
        this.drawRoundedRect(ctx, pad, pad, imgSize, imgSize, 8, true, false);

        if (this.image && (this.image.complete || this.image.width > 0)) {
            ctx.save();
            // Clip image to a rounded square
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(pad, pad, imgSize, imgSize, 8);
            } else {
                ctx.rect(pad, pad, imgSize, imgSize);
            }
            ctx.clip();

            // Center-crop (cover) calculations
            const img = this.image;
            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
            if (img.width > img.height) {
                sx = (img.width - img.height) / 2;
                sWidth = img.height;
            } else {
                sy = (img.height - img.width) / 2;
                sHeight = img.width;
            }

            ctx.drawImage(img, sx, sy, sWidth, sHeight, pad, pad, imgSize, imgSize);
            ctx.restore();
        }

        // Draw an inner frame border over the image
        ctx.strokeStyle = '#45475a';
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, pad, pad, imgSize, imgSize, 8, false, true);

        // 3. Draw Wrapped Text on the Right
        const textX = pad + imgSize + 20;
        const textY = pad + 10;
        const maxTextWidth = this.width - textX - pad;

        ctx.fillStyle = '#cdd6f4'; // Off-white
        ctx.font = 'bold 16px "Segoe UI", Tahoma, sans-serif';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left'; // Strictly control alignment inside modular components
        this.wrapText(ctx, this.message, textX, textY, maxTextWidth, 24);

        // 4. Draw Animated OK Button
        ctx.save();
        // Translate inside layout coordinates to cleanly scale locally
        const btnCenterX = this.btnX + this.btnWidth / 2;
        const btnCenterY = this.btnY + this.btnHeight / 2;
        ctx.translate(btnCenterX, btnCenterY);
        ctx.scale(this.btnScale, this.btnScale);

        // Button background
        ctx.fillStyle = this.btnHovered ? '#a6e3a1' : '#89b4fa'; // Green hover, Blue normal
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        const halfW = this.btnWidth / 2;
        const halfH = this.btnHeight / 2;
        this.drawRoundedRect(ctx, -halfW, -halfH, this.btnWidth, this.btnHeight, 8, true, true);

        // Button text
        ctx.fillStyle = '#11111b';
        ctx.font = 'bold 16px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OK', 0, 0);

        ctx.restore();

        // Restore layer rules
        ctx.globalAlpha = prevAlpha;
        ctx.restore();
    }

    /**
     * Localized Input Listeners: coordinates mapped directly inside component frame bounds.
     */
    handleMouseMove(localX, localY) {
        if (!this.isOpen || this.scale < 0.8) {
            this.btnHovered = false;
            return;
        }

        // Check boundary maps of internal component space
        this.btnHovered = (
            localX >= this.btnX &&
            localX <= this.btnX + this.btnWidth &&
            localY >= this.btnY &&
            localY <= this.btnY + this.btnHeight
        );
    }

    handleMouseClick(localX, localY) {
        if (!this.isOpen || this.scale < 0.8) return;

        if (
            localX >= this.btnX &&
            localX <= this.btnX + this.btnWidth &&
            localY >= this.btnY &&
            localY <= this.btnY + this.btnHeight
        ) {
            this.btnScale = 0.8; // Squash visual confirmation feedback
            this.isOpen = false;
            this.close();
        }
    }

    // Helper: Rounded Rectangle generator
    drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, height, radius);
        } else {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }

    // Helper: Text Wrapping
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}