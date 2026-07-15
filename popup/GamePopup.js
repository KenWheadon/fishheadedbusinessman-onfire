class GamePopup {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configuration
        this.width = 500;
        this.height = 250;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Apply default styling to the overlay canvas
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) scale(0)',
            pointerEvents: 'none',
            zIndex: '9999',
            display: 'none',
            imageRendering: 'pixelated' // Great for retro style games
        });

        document.body.appendChild(this.canvas);

        // State variables
        this.isOpen = false;
        this.isTransitioning = false;
        this.message = "";
        this.image = null;
        this.callback = null;

        // Animation / Physics state
        this.scale = 0;
        this.targetScale = 0;
        this.velScale = 0;
        this.opacity = 0;
        this.yOffset = 100; // Slide down offset
        this.targetYOffset = 100;

        // Spring constants (Tweak these for different feels!)
        this.springStiffness = 0.15;
        this.springDamping = 0.75;

        // Button state & Animation
        this.btnHovered = false;
        this.btnScale = 1;
        this.btnTargetScale = 1;

        // Bounds for mouse clicks (relative to canvas local space)
        this.btnWidth = 100;
        this.btnHeight = 40;
        this.btnX = this.width - this.btnWidth - 30; // Bottom right-ish
        this.btnY = this.height - this.btnHeight - 20;

        // Bind events
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('click', (e) => this.handleMouseClick(e));

        // Start local animation loop
        this.lastTime = performance.now();
        this.loop();
    }

    show(message, imgSrc, callback = null) {
        this.message = message;
        this.callback = callback;
        this.isOpen = true;
        this.isTransitioning = true;
        this.canvas.style.display = 'block';
        this.canvas.style.pointerEvents = 'auto';

        // Load image if provided
        if (imgSrc) {
            this.image = new Image();
            this.image.src = imgSrc;
            this.image.onload = () => { /* Image loaded, canvas redraw handles it */ };
        } else {
            this.image = null;
        }

        // Trigger entrance targets
        this.targetScale = 1;
        this.targetYOffset = 0;
    }

    close() {
        this.isTransitioning = true;
        this.targetScale = 0;
        this.targetYOffset = 80; // Slide down out of view
        this.canvas.style.pointerEvents = 'none';
    }

    update(dt) {
        // --- Spring physics for the main scale ---
        let force = (this.targetScale - this.scale) * this.springStiffness;
        this.velScale += force;
        this.velScale *= this.springDamping;
        this.scale += this.velScale;

        // Smoothly interpolate Y Offset & Opacity
        this.yOffset += (this.targetYOffset - this.yOffset) * 0.15;
        this.opacity += ((this.isOpen && this.targetScale > 0 ? 1 : 0) - this.opacity) * 0.2;

        // Button Hover squash-and-stretch interpolation
        this.btnTargetScale = this.btnHovered ? 1.1 : 1.0;
        this.btnScale += (this.btnTargetScale - this.btnScale) * 0.25;

        // Update DOM transform and opacity properties for smooth window positioning
        this.canvas.style.transform = `translate(-50%, calc(-50% + ${this.yOffset}px)) scale(${this.scale})`;
        this.canvas.style.opacity = this.opacity;

        // Fully shut down if we shrunk to nothing during close transition
        if (!this.isOpen && this.scale < 0.01 && this.isTransitioning) {
            this.canvas.style.display = 'none';
            this.isTransitioning = false;
            if (this.callback) {
                const cb = this.callback;
                this.callback = null; // Prevent double firing
                cb();
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Dialog Background (Game UI Box)
        ctx.fillStyle = '#1e1e2e'; // Dark background
        ctx.strokeStyle = '#f5c2e7'; // Juicy pink border
        ctx.lineWidth = 6;
        
        this.drawRoundedRect(ctx, 3, 3, this.width - 6, this.height - 6, 16, true, true);

        // 2. Draw Left-aligned Square Image (cropped)
        const pad = 20;
        const imgSize = this.height - (pad * 2);
        
        // Draw image frame
        ctx.fillStyle = '#11111b';
        this.drawRoundedRect(ctx, pad, pad, imgSize, imgSize, 8, true, false);

        if (this.image && this.image.complete) {
            ctx.save();
            // Clip image to a rounded square
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(pad, pad, imgSize, imgSize, 8) : ctx.rect(pad, pad, imgSize, imgSize);
            ctx.clip();

            // Center-crop (cover) calculation
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
        this.wrapText(ctx, this.message, textX, textY, maxTextWidth, 24);

        // 4. Draw Animated OK Button
        ctx.save();
        // Translate to the center of the button for accurate scaling rotation
        const btnCenterX = this.btnX + this.btnWidth / 2;
        const btnCenterY = this.btnY + this.btnHeight / 2;
        ctx.translate(btnCenterX, btnCenterY);
        ctx.scale(this.btnScale, this.btnScale);

        // Button background
        ctx.fillStyle = this.btnHovered ? '#a6e3a1' : '#89b4fa'; // Green on hover, Blue normal
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        // Draw relative to translated coordinates
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
    }

    // Helper: Rounded Rectangle generator
    drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, width, height, radius);
        } else {
            // Fallback for older environments
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

    // Helper: Mouse hit test
    getCanvasLocalCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Map viewport click cleanly to internal Canvas system coordinates
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    handleMouseMove(e) {
        if (!this.isOpen || this.scale < 0.8) return;
        const coords = this.getCanvasLocalCoords(e);
        
        // Check if cursor bounds are inside the OK button rect
        this.btnHovered = (
            coords.x >= this.btnX &&
            coords.x <= this.btnX + this.btnWidth &&
            coords.y >= this.btnY &&
            coords.y <= this.btnY + this.btnHeight
        );
    }

    handleMouseClick(e) {
        if (!this.isOpen || this.scale < 0.8) return;
        const coords = this.getCanvasLocalCoords(e);

        if (
            coords.x >= this.btnX &&
            coords.x <= this.btnX + this.btnWidth &&
            coords.y >= this.btnY &&
            coords.y <= this.btnY + this.btnHeight
        ) {
            // Juice: Click scale squish
            this.btnScale = 0.8;
            this.isOpen = false;
            this.close();
        }
    }

    loop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(dt);
        this.draw();

        requestAnimationFrame(() => this.loop());
    }
}