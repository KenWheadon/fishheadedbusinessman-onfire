class CreditsPopup {
    /**
     * @param {Object} config - Configuration settings
     * @param {number} config.width - Allocated rendering block width
     * @param {number} config.height - Allocated rendering block height
     */
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        // --- BAKED IN CREDITS DATA ---
        this.credits = [
            {
                name: "Ken Wheadon",
                image: "kenwheadon",
                title: "Founder",
                roles: ["Dev", "PM", "UI/UX", "Graphics", "QA"],
                flavor: "Nothing quite like a game about fingers and exploding dudes to get you going!"
            },
            {
                name: "Jessy Jean-Kafka",
                image: "jessyjeankafka",
                title: "QA",
                roles: ["QA", "Brainstorming"],
                flavor: "I fuel the game by looking, playing and giving feedback."
            },
            {
                name: "AI",
                image: "terminal",
                title: "Assistant",
                roles: ["Code", "Assets", "Backend"],
                flavor: "01001000 01100101 01101100 01110000"
            }
        ];

        this.isVisible = false;
        this.dims = { w: 0, h: 0 };
        this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        this.hitboxes = { cards: [] };
        this.cursor = 'default'; // Passed to parent frame to determine pointer styles

        // Dragging & Swipe-Scroll States
        this.draggingScrollbar = false;
        this.draggingList = false;
        this.dragStartY = 0;
        this.dragStartScrollY = 0;
        this.scrollbarHovered = false;

        // Dynamic event listener reference to enable self-cleaning wheel hooks //[cite: 1]
        this._boundWheelHandler = null;

        // Physics & Animation State
        this.anim = {
            alpha: 0, targetAlpha: 0,
            scale: 0, targetScale: 0, scaleVel: 0,

            // Scroll Physics
            scrollY: 0, targetScrollY: 0, maxScroll: 0,

            // Interaction
            cardHovers: Array(this.credits.length).fill(0)
        };

        // 1. INSTANTIATE RETRO BACK BUTTON //[cite: 2, 6]
        this.backButton = new ArcadeButton({
            text: 'BACK TO MENU',
            themeColor: '#ff007f', // Hot Pink
            glowColor: '#ff00ff'
        });

        // 2. INSTANTIATE EXTRACTED CLOSE BUTTON
        this.closeButton = new CloseButton({ size: 24 });

        this.buttons = [this.backButton];

        this.cardHeight = 160;
        this.cardGap = 20;

        this.recalculateScrollBounds();
    }

    /**
     * Updates block dimensions and recalculates scroll limits.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Calculate dynamic scaling ratios
        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.7), 1.2);

        // Fluid responsive viewport layouts //[cite: 4]
        if (width < 480) {
            // Mobile Breakpoint //[cite: 4]
            this.dims.w = Math.min(width * 0.94, 340);
            this.dims.h = Math.min(height * 0.94, 520);
            this.cardHeight = 145;
            this.cardGap = 15;
            this.isMobile = true;
        } else if (width < 768) {
            // Tablet Breakpoint
            this.dims.w = 460 * this.scaleFactor;
            this.dims.h = 520 * this.scaleFactor;
            this.cardHeight = 155;
            this.cardGap = 20;
            this.isMobile = false;
        } else {
            // Desktop Viewport
            this.dims.w = 520 * this.scaleFactor;
            this.dims.h = 560 * this.scaleFactor;
            this.cardHeight = 160;
            this.cardGap = 20;
            this.isMobile = false;
        }

        // Clamp to avoid visual box clipping boundaries //[cite: 4]
        this.dims.w = Math.max(290, Math.min(640, this.dims.w));
        this.dims.h = Math.max(440, Math.min(640, this.dims.h));

        this.recalculateScrollBounds();
    }

    recalculateScrollBounds() {
        const bw = this.dims.w;
        const bh = this.dims.h;

        // Set dimensions of the scrolling content viewport
        this.contentY = -bh / 2 + 70;
        this.clipHeight = bh - 180; // Reserves spacing at bottom for the Back button
        this.listWidth = bw - 44;
        this.listX = -this.listWidth / 2;

        const contentHeight = this.credits.length * (this.cardHeight + this.cardGap);
        this.anim.maxScroll = Math.max(0, contentHeight - this.clipHeight + 10);
        this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));

        // Position the Back Button at the base of the frame //[cite: 4]
        const btnW = bw * 0.82;
        const btnH = this.isMobile ? 36 : 42 * this.scaleFactor;
        const btnY = bh / 2 - btnH - 12;
        this.backButton.setPosition(0, btnY, btnW, btnH, this.scaleFactor);

        // Position dynamic close button
        this.closeButton.setPosition(bw / 2 - 22, -bh / 2 + 22, 24, this.scaleFactor);
    }

    show() {
        this.isVisible = true;
        this.anim.targetAlpha = 1;
        this.anim.targetScale = 1;

        // Register window scroll intercept listener //[cite: 1]
        this._boundWheelHandler = this._onWindowWheel.bind(this);
        window.addEventListener('wheel', this._boundWheelHandler, { passive: false });
    }

    hide() {
        this.isVisible = false;
        this.anim.targetAlpha = 0;
        this.anim.targetScale = 0;
        this.draggingScrollbar = false;
        this.draggingList = false;

        // Clean up window hooks when popups exit screen space //[cite: 7]
        if (this._boundWheelHandler) {
            window.removeEventListener('wheel', this._boundWheelHandler);
            this._boundWheelHandler = null;
        }
    }

    /**
     * Mouse Wheel interceptor. Prevents default browser page scrolling 
     * only when the cursor is over the credits window box area. //[cite: 7]
     */
    _onWindowWheel(e) {
        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;
        const bw = this.dims.w;
        const bh = this.dims.h;

        // Capture scroll only if mouse coordinates fall inside popup boundaries //[cite: 7]
        if (tx >= -bw / 2 && tx <= bw / 2 && ty >= -bh / 2 && ty <= bh / 2) {
            e.preventDefault(); // Lock browser scrolling layers
            this.handleMouseWheel(e.deltaY);
        }
    }

    /**
     * Framerate-independent state physics update loop.
     * @param {number} dt - Time delta in seconds
     */
    update(dt = 1 / 60) {
        // Safe exponential decay lerp independent of frame drops
        const lerpdt = (current, target, speed) => {
            const factor = 1 - Math.exp(-speed * dt * 60);
            return current + (target - current) * Math.min(1, Math.max(0, factor));
        };

        this.anim.alpha = lerpdt(this.anim.alpha, this.anim.targetAlpha, 0.15);
        this.anim.scrollY = lerpdt(this.anim.scrollY, this.anim.targetScrollY, 0.15);

        // Dynamic spring simulation scaled to delta time
        const stiffness = 0.2 * 60;
        const friction = Math.pow(0.7, dt * 60);
        this.anim.scaleVel += (this.anim.targetScale - this.anim.scale) * stiffness * dt;
        this.anim.scaleVel *= friction;
        this.anim.scale += this.anim.scaleVel * dt * 60;

        this._processHover(lerpdt);

        this.closeButton.update(dt);
        this.buttons.forEach(btn => btn.update(dt)); //[cite: 2]
    }

    _processHover(lerpdt) {
        if (!this.isVisible || this.anim.scale < 0.9) return;

        this.cursor = 'default';
        const tx = this.mouse.tx;
        const ty = this.mouse.ty;
        const bw = this.dims.w;

        this.closeButton.handleMouseMove(tx, ty);

        // 1. Check window close hover
        if (this.closeButton.isHovered) {
            this.cursor = 'pointer';
        }

        // 2. Check scrollbar hover area
        const trackX = bw / 2 - 14;
        const trackY = this.contentY;
        const trackH = this.clipHeight;
        this.scrollbarHovered = this.draggingScrollbar || (this.anim.maxScroll > 0 && tx >= trackX - 12 && tx <= trackX + 12 && ty >= trackY && ty <= trackY + trackH);

        if (this.scrollbarHovered) {
            this.cursor = 'pointer';
        }

        // 3. Update cards hover state
        for (let i = 0; i < this.credits.length; i++) {
            let targetHover = 0;
            if (this._isHit(tx, ty, this.hitboxes.cards[i])) {
                targetHover = 1;
            }
            this.anim.cardHovers[i] = lerpdt(this.anim.cardHovers[i], targetHover, 0.2);
        }

        // 4. Check bottom Back button hover //[cite: 2]
        const isButtonHovered = this.buttons.some(btn => btn.scale > 1.01 || btn.targetScale > 1.0);
        if (isButtonHovered) {
            this.cursor = 'pointer';
        }
    }

    _isHit(x, y, box) {
        if (!box) return false;
        return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    }

    // --- LOCALIZED INPUT INTERFACES ---

    handleMouseMove(localX, localY) {
        this.mouse.x = localX;
        this.mouse.y = localY;

        // Map local coordinate inputs relative to popup's centered transformation matrix
        this.mouse.tx = (localX - this.width / 2) / Math.max(0.001, this.anim.scale);
        this.mouse.ty = (localY - this.height / 2) / Math.max(0.001, this.anim.scale);

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        // 1. Scrollbar Active Dragging Update Loop
        if (this.draggingScrollbar) {
            const trackY = this.contentY;
            const trackH = this.clipHeight;
            const clickFraction = (ty - trackY) / trackH;
            this.anim.targetScrollY = clickFraction * this.anim.maxScroll;
            this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
        }
        // 2. Direct Content Swiping/Dragging Drag Loop (Great for mobile!) //[cite: 4]
        else if (this.draggingList) {
            const deltaY = ty - this.dragStartY;
            this.anim.targetScrollY = this.dragStartScrollY - deltaY;
            this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
        }

        // Delegate tracking matrices to sub-elements
        this.closeButton.handleMouseMove(tx, ty);
        this.buttons.forEach(btn => btn.handleMouseMove(tx, ty)); //[cite: 2]
    }

    handleMouseDown(localX, localY) {
        this.handleMouseMove(localX, localY);
        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;
        const bw = this.dims.w;

        // Route interactions to Close button
        this.closeButton.handleMouseDown(tx, ty);

        // Forward press triggers to Back button //[cite: 2]
        if (this.backButton.isPointInRect(tx, ty)) {
            this.backButton.handleMouseDown(tx, ty);
            return;
        }

        // Scrollbar Hit Testing
        const trackW = 16;
        const trackX = bw / 2 - 14;
        const trackY = this.contentY;
        const trackH = this.clipHeight;

        if (this.anim.maxScroll > 0 && tx >= trackX - trackW / 2 && tx <= trackX + trackW / 2 && ty >= trackY && ty <= trackY + trackH) {
            this.draggingScrollbar = true;
            const clickFraction = (ty - trackY) / trackH;
            this.anim.targetScrollY = clickFraction * this.anim.maxScroll;
            this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
        }
        // Direct List Swipe Drag Fallback (Touch scrolling feel) //[cite: 4]
        else if (this.anim.maxScroll > 0 && tx >= -bw / 2 && tx <= bw / 2 && ty >= trackY && ty <= trackY + trackH) {
            this.draggingList = true;
            this.dragStartY = ty;
            this.dragStartScrollY = this.anim.targetScrollY;
        }
    }

    handleMouseUp(localX, localY) {
        this.handleMouseMove(localX, localY);

        this.draggingScrollbar = false;
        this.draggingList = false;

        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        // Close button release route
        this.closeButton.handleMouseUp(tx, ty, () => {
            this.hide();
        });

        // Back button release route //[cite: 2]
        this.backButton.handleMouseUp(tx, ty, () => {
            this.hide();
        });
    }

    handleMouseClick(localX, localY) {
        // Redundant click hook omitted to avoid double-firing bugs on click routing //[cite: 1]
    }

    handleMouseWheel(deltaY) {
        if (!this.isVisible) return;
        this.anim.targetScrollY += deltaY * 0.8;
        this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    }

    handleKeyDown(key) {
        if (!this.isVisible) return;
        if (key === 'Escape') this.hide();
        if (key === 'ArrowUp') {
            this.anim.targetScrollY = Math.max(0, this.anim.targetScrollY - 100);
        }
        if (key === 'ArrowDown') {
            this.anim.targetScrollY = Math.min(this.anim.maxScroll, this.anim.targetScrollY + 100);
        }
    }

    // --- DECOUPLED DRAW PIPELINE ---

    /**
     * Renders component UI localized relative to the bounding box offset.
     * @param {CanvasRenderingContext2D} ctx - Main engine context
     * @param {number} x - Left coordinate of containing layout box
     * @param {number} y - Top coordinate of containing layout box
     */
    draw(ctx, x, y) {
        const bw = this.dims.w;
        const bh = this.dims.h;

        ctx.save();

        // Safety clipping limits to prevent overlay leakage outside boundary bounds //[cite: 7]
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();

        // Screen Dim Backdrop Tint (70% Opacity) //[cite: 7]
        ctx.fillStyle = `rgba(10, 10, 14, ${this.anim.alpha * 0.7})`;
        ctx.fillRect(x, y, this.width, this.height);

        if (this.anim.scale <= 0.01) {
            ctx.restore();
            return;
        }

        // Draw centered and scaled //[cite: 7]
        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.anim.scale, this.anim.scale);

        // 1. NEO-BRUTALIST OFFSET DIALOG SHADOW (Vibrant Pink Glow Offset) //[cite: 4]
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-bw / 2 + 8, -bh / 2 + 8, bw, bh);

        // 2. MAIN DIALOG BODY PANEL (Neon Blue Case Trim) //[cite: 4]
        ctx.fillStyle = '#0a0a0c';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
        ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);

        // 3. CRT TV SCREEN RASTER SCANLINES
        ctx.save();
        ctx.beginPath();
        ctx.rect(-bw / 2, -bh / 2, bw, bh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
        ctx.lineWidth = 1;
        for (let sy = -bh / 2; sy < bh / 2; sy += 3) {
            ctx.beginPath();
            ctx.moveTo(-bw / 2, sy);
            ctx.lineTo(bw / 2, sy);
            ctx.stroke();
        }
        ctx.restore();

        // 4. TECH CORNER CORNER DECO //[cite: 4]
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 8, 2);
        ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 2, 8);
        ctx.fillRect(bw / 2 - 18, -bh / 2 + 10, 8, 2);
        ctx.fillRect(bw / 2 - 12, -bh / 2 + 10, 2, 8);

        // 5. HEADER TYPOGRAPHY //[cite: 5, 6]
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(24 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CREDITS', 0, -bh / 2 + 35);

        // Neo divider line //[cite: 4]
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.42, -bh / 2 + 58);
        ctx.lineTo(bw * 0.42, -bh / 2 + 58);
        ctx.stroke();

        // 6. DRAW CLOSE WINDOW CORNER BOX
        this.closeButton.draw(ctx);

        // 7. SCROLL VIEWPORT RENDER //[cite: 7]
        const contentY = this.contentY;
        const clipHeight = this.clipHeight;
        const listWidth = this.listWidth;
        const listX = this.listX;

        ctx.save();
        ctx.beginPath();
        ctx.rect(listX - 10, contentY, listWidth + 20, clipHeight);
        ctx.clip(); // Mask scroll bounds

        this.hitboxes.cards = [];

        for (let i = 0; i < this.credits.length; i++) {
            const cardY = contentY + (i * (this.cardHeight + this.cardGap)) - this.anim.scrollY;

            // Frustum Culling checks //[cite: 7]
            if (cardY > contentY + clipHeight || cardY + this.cardHeight < contentY) {
                this.hitboxes.cards[i] = null;
                continue;
            }

            const data = this.credits[i];
            const hoverAmt = this.anim.cardHovers[i];

            ctx.save();
            ctx.translate(0, -hoverAmt * 4);

            // Brutalist Neon Orange Card Offset Shadows //[cite: 4]
            ctx.fillStyle = '#ff9800';
            ctx.fillRect(listX + 6, cardY + 6, listWidth, this.cardHeight);

            // Card Panel Body //[cite: 4]
            ctx.fillStyle = '#121215';
            ctx.strokeStyle = hoverAmt > 0.01 ? '#00f0ff' : '#222228'; // Cyan border glow on hover
            ctx.lineWidth = 3;
            ctx.fillRect(listX, cardY, listWidth, this.cardHeight);
            ctx.strokeRect(listX, cardY, listWidth, this.cardHeight);

            this.hitboxes.cards[i] = { x: listX, y: cardY, w: listWidth, h: this.cardHeight };

            // Image Avatar Box Placement //[cite: 7]
            const padY = (this.cardHeight - 110) / 2;
            const imgSize = 110;
            const imgX = listX + 16;
            const imgY = cardY + padY;

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgSize, imgSize, 6);
            ctx.clip();

            const img = (typeof AssetManager !== 'undefined') ? AssetManager.get(data.image) : null;
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            } else {
                const colors = ['#f1c40f', '#9b59b6', '#2ecc71'];
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(imgX, imgY, imgSize, imgSize);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(data.name.charAt(0), imgX + imgSize / 2, imgY + imgSize / 2);
            }
            ctx.restore();

            // Avatar Border
            ctx.strokeStyle = hoverAmt > 0.01 ? '#00f0ff' : '#ff007f';
            ctx.lineWidth = 2;
            ctx.strokeRect(imgX, imgY, imgSize, imgSize);

            // --- DETAILS PANEL DETAILS (Responsive formatting offsets) --- //[cite: 7]
            const textX = listX + 142;
            let textY = cardY + 16;

            // 1. Name Profile Title
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(18 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(data.name.toUpperCase(), textX, textY);

            // 2. Cyber Role/Title Row
            textY += 24;
            ctx.fillStyle = '#ffe600'; // Cyber warning yellow
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.fillText(`// STATUS: ${data.title.toUpperCase()}`, textX, textY);

            // 3. Technical Tags Row
            textY += 18;
            ctx.fillStyle = '#00f0ff';
            ctx.font = `bold ${Math.round(10 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.fillText(`ROLES: [${data.roles.join(', ').toUpperCase()}]`, textX, textY);

            // 4. Wrapped Flavor Code Block
            textY += 18;
            ctx.fillStyle = '#8a8a9a';
            ctx.font = `italic ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            const maxTextWidth = listWidth - 160;
            this._wrapText(ctx, `"${data.flavor}"`, textX, textY, maxTextWidth, 14);

            ctx.restore();
        }
        ctx.restore(); // Restore internal scrolling viewport clip

        // 8. HIGH-CONTRAST NEON SCROLLBAR TRACK //[cite: 7]
        if (this.anim.maxScroll > 0) {
            const trackW = 6;
            const trackH = clipHeight;
            const trackX = bw / 2 - 14;
            const trackY = contentY;

            // Render Backing Scroll Line
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(trackX, trackY, trackW, trackH);

            // Compute slider positions
            const thumbH = Math.max(30, (clipHeight / (clipHeight + this.anim.maxScroll)) * trackH);
            const thumbY = trackY + (this.anim.scrollY / this.anim.maxScroll) * (trackH - thumbH);

            // Active neon cyan thumb slider (Glows Magenta on hover/drag!)
            ctx.fillStyle = this.scrollbarHovered ? '#ff007f' : '#00f0ff';
            ctx.fillRect(trackX - 1, thumbY, trackW + 2, thumbH);
        }

        // 9. DRAW BOTTOM ARCADEBUTTON //[cite: 2]
        this.backButton.draw(ctx);

        ctx.restore(); // Restore center scaled frame translate matrix
        ctx.restore(); // Restore outer security boundary limits
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
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