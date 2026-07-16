class CreditsPopup {
    /**
     * @param {Object} config - Configuration settings
     * @param {number} config.width - Allocated rendering block width
     * @param {number} config.height - Allocated rendering block height
     */
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;

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
                roles: ["QA, Brainstorming"],
                flavor: "I fuel the game by looking, playing and giving feedback."
            },
            {
                name: "AI",
                image: "terminal",
                title: "Assistant",
                roles: ["Code, Assets, Backend"],
                flavor: "01001000 01100101 01101100 01110000"
            }
        ];

        this.isVisible = false;
        this.dims = { w: 0, h: 0 };
        this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        this.hitboxes = { close: null, cards: [] };
        this.cursor = 'default'; // Exposed to pass cursor state back to the parent frame

        // Physics & Animation State
        this.anim = {
            alpha: 0, targetAlpha: 0,
            scale: 0, targetScale: 0, scaleVel: 0,

            // Scroll Physics
            scrollY: 0, targetScrollY: 0, maxScroll: 0,

            // Interaction
            closeRot: 0, targetCloseRot: 0, closeScale: 1,
            cardHovers: Array(this.credits.length).fill(0)
        };

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
        this.recalculateScrollBounds();
    }

    recalculateScrollBounds() {
        this.dims.w = Math.min(800, this.width * 0.9);
        this.dims.h = Math.min(600, this.height * 0.9);

        const contentHeight = this.credits.length * (this.cardHeight + this.cardGap);
        const visibleHeight = this.dims.h - 140;
        this.anim.maxScroll = Math.max(0, contentHeight - visibleHeight);
        this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    }

    show() {
        this.isVisible = true;
        this.anim.targetAlpha = 1;
        this.anim.targetScale = 1;
    }

    hide() {
        this.isVisible = false;
        this.anim.targetAlpha = 0;
        this.anim.targetScale = 0;
    }

    /**
     * Framerate-independent state physics update loop.
     * @param {number} dt - Time delta in seconds (e.g. ~0.016 for 60 FPS)
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

        this.anim.closeRot = lerpdt(this.anim.closeRot, this.anim.targetCloseRot, 0.2);
        this.anim.closeScale = lerpdt(this.anim.closeScale, 1, 0.2);

        this._processHover(lerpdt);
    }

    _processHover(lerpdt) {
        if (!this.isVisible || this.anim.scale < 0.9) return;

        this.cursor = 'default';
        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.anim.targetCloseRot = 0;

        if (this._isHit(tx, ty, this.hitboxes.close)) {
            this.cursor = 'pointer';
            this.anim.targetCloseRot = Math.PI / 2;
        }

        for (let i = 0; i < this.credits.length; i++) {
            let targetHover = 0;
            if (this._isHit(tx, ty, this.hitboxes.cards[i])) {
                targetHover = 1;
            }
            this.anim.cardHovers[i] = lerpdt(this.anim.cardHovers[i], targetHover, 0.2);
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
    }

    handleMouseClick(localX, localY) {
        this.handleMouseMove(localX, localY);

        if (!this.isVisible || this.anim.scale < 0.9) return false;

        if (this._isHit(this.mouse.tx, this.mouse.ty, this.hitboxes.close)) {
            this.anim.closeScale = 0.6;
            this.hide();
            return true; // Click event successfully intercepted
        }
        return false;
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

        // Strict boundary containment: clips drawing operations to protect external layout space
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();

        // Screen Dim Tint
        ctx.fillStyle = `rgba(0, 0, 0, ${this.anim.alpha * 0.7})`;
        ctx.fillRect(x, y, this.width, this.height);

        if (this.anim.scale <= 0.01) {
            ctx.restore();
            return;
        }

        // Draw centered and scaled
        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.anim.scale, this.anim.scale);

        // Frame panel background
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 15);
        ctx.fill();

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CREDITS', 0, -bh / 2 + 40);

        // Exit Button Configuration
        const closeSize = 30;
        const closeX = bw / 2 - 45;
        const closeY = -bh / 2 + 15;

        ctx.save();
        ctx.translate(closeX + closeSize / 2, closeY + closeSize / 2);
        ctx.rotate(this.anim.closeRot);
        ctx.scale(this.anim.closeScale, this.anim.closeScale);

        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.roundRect(-closeSize / 2, -closeSize / 2, closeSize, closeSize, 5);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('+', 0, 2);
        ctx.restore();

        this.hitboxes.close = { x: closeX, y: closeY, w: closeSize, h: closeSize };

        const contentY = -bh / 2 + 80;
        const clipHeight = bh - 100;
        const listWidth = bw - 80;
        const listX = -listWidth / 2;

        // Dynamic Scrolled Masking viewport
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(listX - 10, contentY, listWidth + 20, clipHeight, 10);
        ctx.clip();

        this.hitboxes.cards = [];

        for (let i = 0; i < this.credits.length; i++) {
            const cardY = contentY + (i * (this.cardHeight + this.cardGap)) - this.anim.scrollY;

            // Render Frustum Culling
            if (cardY > contentY + clipHeight || cardY + this.cardHeight < contentY) {
                this.hitboxes.cards[i] = null;
                continue;
            }

            const data = this.credits[i];
            const hoverAmt = this.anim.cardHovers[i];

            ctx.save();
            ctx.translate(0, -hoverAmt * 5);

            ctx.fillStyle = `rgba(${52 + hoverAmt * 10}, ${73 + hoverAmt * 10}, ${94 + hoverAmt * 15}, 1)`;
            ctx.beginPath();
            ctx.roundRect(listX, cardY, listWidth, this.cardHeight, 10);
            ctx.fill();

            if (hoverAmt > 0.01) {
                ctx.strokeStyle = `rgba(52, 152, 219, ${hoverAmt})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            this.hitboxes.cards[i] = { x: listX, y: cardY, w: listWidth, h: this.cardHeight };

            const imgSize = 120;
            const imgX = listX + 20;
            const imgY = cardY + 20;

            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgSize, imgSize, 8);
            ctx.fill();
            ctx.clip();

            // SAFE ASSET FALLBACK: Discovers preloaded assets securely without running afoul of file:// security origins
            const img = (typeof AssetManager !== 'undefined') ? AssetManager.get(data.image) : null;
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            } else {
                const colors = ['#f1c40f', '#9b59b6', '#2ecc71'];
                ctx.fillStyle = colors[i % colors.length];
                ctx.fillRect(imgX, imgY, imgSize, imgSize);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(data.name.charAt(0), imgX + imgSize / 2, imgY + imgSize / 2);
            }
            ctx.restore();

            // --- TEXT CONFIGURATION (Clean structural tracking preventing overlap blocks) ---
            const textX = listX + 160;
            let textY = cardY + 22 - (hoverAmt * 5);

            // 1. Name Profile
            ctx.fillStyle = '#ecf0f1';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(data.name, textX, textY);

            // 2. Job Title
            textY += 28;
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 15px Arial';
            ctx.fillText(data.title, textX, textY);

            // 3. Developer Roles (Isolate completely on separate grid row layer)
            textY += 20;
            ctx.fillStyle = '#bdc3c7';
            ctx.font = '13px Arial';
            ctx.fillText(data.roles.join('  •  '), textX, textY);

            // 4. Flavor Wrapped Quote
            textY += 26;
            ctx.fillStyle = '#95a5a6';
            ctx.font = 'italic 14px Arial';
            const maxTextWidth = listWidth - 180;
            this._wrapText(ctx, `"${data.flavor}"`, textX, textY, maxTextWidth, 18, false);
        }

        ctx.restore(); // Restore inner scrolled clipping viewport
        ctx.restore(); // Restore centered transformation scaling matrix
        ctx.restore(); // Restore outer safety viewport mask boundary protection
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight, isItalic = false) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        const currentFont = ctx.font;
        if (isItalic) ctx.font = 'italic ' + currentFont;

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

        if (isItalic) ctx.font = currentFont;
    }
}