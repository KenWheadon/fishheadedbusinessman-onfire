/**
 * HelpCarousel - A highly polished, decoupled modular UI Component.
 * Fully self-contained. Coordinates are completely relative to local space.
 */
class HelpCarousel {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;

        // Carousel State
        this.currentPage = 1;
        this.totalPages = 5;
        this.isVisible = false;
        
        // Animation & Physics State
        this.anim = {
            scale: 0,
            scaleVel: 0,
            targetScale: 0,
            overlayAlpha: 0,
            currentPage: 1, // Interpolates to this.currentPage for the "swish"
            hover: {
                close: 0,
                leftArrow: 0,
                rightArrow: 0,
                dots: Array(this.totalPages).fill(0)
            }
        };

        // Mouse Tracking (expected in localized coordinates relative to component top-left)
        this.mouse = { x: -1000, y: -1000 };

        this.hitboxes = {
            close: { x: 0, y: 0, w: 0, h: 0 },
            leftArrow: { x: 0, y: 0, w: 0, h: 0 },
            rightArrow: { x: 0, y: 0, w: 0, h: 0 },
            dots: []
        };

        // Dynamic 5-Page Basic Instructions Mapping
        this.pageTitles = [
            "The Objective",
            "The Cards",
            "Paying Debt",
            "The Penalty",
            "Win or Lose"
        ];

        this.pageInstructions = [
            "Your main objective is to completely pay off your outstanding debt before you run out of carrots.",
            "Point at the face-down cards to hover over them, and click to reveal their hidden symbols.",
            "Successfully finding a matching pair will immediately pay down a portion of your total debt.",
            "If you uncover a skull, you must choose to either sacrifice a character or cut off a precious carrot to keep playing.",
            "Clearing the entire debt guarantees a win, while losing your last carrot results in instant defeat."
        ];
    }

    /**
     * Resizes the internal viewport boundary safely without affecting DOM.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    /**
     * Triggers the spring expansion opening animation.
     */
    show() {
        this.isVisible = true;
        this.anim.targetScale = 1;
    }

    /**
     * Triggers the spring contraction closing animation.
     */
    hide() {
        this.isVisible = false;
        this.anim.targetScale = 0;
    }

    // ==========================================
    // LOCALIZED INPUT DELEGATION
    // ==========================================

    handleMouseMove(localX, localY) {
        this.mouse.x = localX;
        this.mouse.y = localY;
    }

    handleMouseClick(localX, localY) {
        this.mouse.x = localX;
        this.mouse.y = localY;

        if (!this.isVisible || this.anim.scale < 0.8) return;
        
        // Map mouse through the inverse scale transform to check hitboxes
        const mappedMouse = this._getUnscaledMouse();

        if (this._isHit(mappedMouse.x, mappedMouse.y, this.hitboxes.close)) {
            this.hide();
        } else if (this._isHit(mappedMouse.x, mappedMouse.y, this.hitboxes.leftArrow)) {
            this.currentPage = Math.max(1, this.currentPage - 1);
        } else if (this._isHit(mappedMouse.x, mappedMouse.y, this.hitboxes.rightArrow)) {
            this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
        } else {
            for (let i = 0; i < this.hitboxes.dots.length; i++) {
                if (this._isHit(mappedMouse.x, mappedMouse.y, this.hitboxes.dots[i])) {
                    this.currentPage = i + 1;
                    break;
                }
            }
        }
    }

    handleKeyDown(key) {
        if (!this.isVisible) return;
        if (key === 'Escape') this.hide();
        if (key === 'ArrowLeft') this.currentPage = Math.max(1, this.currentPage - 1);
        if (key === 'ArrowRight') this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
    }

    // ==========================================
    // PHYSICS & ANIMATION TICK
    // ==========================================

    update(dt) {
        // Normalize delta time relative to 60fps (~0.016s per frame) for consistency
        const dtFactor = Math.min(dt * 60, 4);

        // 1. Spring physics for "Pop" open/close
        const tension = 0.2;
        const friction = 0.7;
        const force = (this.anim.targetScale - this.anim.scale) * tension;
        this.anim.scaleVel = (this.anim.scaleVel + force * dtFactor) * Math.pow(friction, dtFactor);
        this.anim.scale += this.anim.scaleVel * dtFactor;

        // 2. Overlay fade
        const targetAlpha = this.isVisible ? 0.8 : 0;
        this.anim.overlayAlpha += (targetAlpha - this.anim.overlayAlpha) * (1 - Math.pow(1 - 0.15, dtFactor));

        // 3. Lerp for Carousel "Swish"
        this.anim.currentPage += (this.currentPage - this.anim.currentPage) * (1 - Math.pow(1 - 0.12, dtFactor));

        // 4. Hover states (lerped)
        const mouse = this._getUnscaledMouse();
        
        const updateHover = (key, box) => {
            const isHovered = this.isVisible && this._isHit(mouse.x, mouse.y, box);
            const target = isHovered ? 1 : 0;
            this.anim.hover[key] += (target - this.anim.hover[key]) * (1 - Math.pow(1 - 0.2, dtFactor));
        };

        updateHover('close', this.hitboxes.close);
        updateHover('leftArrow', this.hitboxes.leftArrow);
        updateHover('rightArrow', this.hitboxes.rightArrow);
        
        for (let i = 0; i < this.totalPages; i++) {
            const isHovered = this.isVisible && this.hitboxes.dots[i] && this._isHit(mouse.x, mouse.y, this.hitboxes.dots[i]);
            const target = isHovered ? 1 : 0;
            this.anim.hover.dots[i] += (target - this.anim.hover.dots[i]) * (1 - Math.pow(1 - 0.2, dtFactor));
        }
    }

    // ==========================================
    // RENDERING PIPELINE
    // ==========================================

    draw(ctx, x, y) {
        // Early escape if completely hidden to conserve CPU
        if (this.anim.overlayAlpha < 0.01 && this.anim.scale < 0.01) return;

        ctx.save();
        ctx.translate(x, y);

        // Enforce component-level container clipping boundaries
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();

        // Render Overlay Background relative to component bounds
        ctx.fillStyle = `rgba(15, 20, 25, ${this.anim.overlayAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Render scaled box contents
        if (this.anim.scale > 0.01) {
            ctx.save();
            
            // Transform matrix for the POP effect (scales from center of container space)
            const cx = this.width / 2;
            const cy = this.height / 2;
            ctx.translate(cx, cy);
            ctx.scale(this.anim.scale, this.anim.scale);
            ctx.translate(-cx, -cy);

            const boxW = Math.min(850, this.width * 0.9);
            const boxH = Math.min(550, this.height * 0.9);
            const boxX = (this.width - boxW) / 2;
            const boxY = (this.height - boxH) / 2;

            // Box Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 15;

            // Box Background
            ctx.fillStyle = '#1e272e';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 20);
            ctx.fill();
            
            ctx.shadowColor = 'transparent'; // Reset for children

            // Draw UI Elements
            this._drawCloseButton(ctx, boxX, boxY, boxW);
            this._drawNavigation(ctx, boxX, boxY, boxW, boxH);

            // Draw Sliding Content (clipped to inner modal context area)
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(boxX + 20, boxY + 60, boxW - 40, boxH - 140, 10);
            ctx.clip();

            // Render pages with "swish" horizontal shifts
            for (let i = 1; i <= this.totalPages; i++) {
                const xOffset = (i - this.anim.currentPage) * boxW;
                if (Math.abs(xOffset) < boxW) {
                    this._drawPageContent(ctx, i, boxX + xOffset, boxY, boxW, boxH);
                }
            }
            ctx.restore(); // End clipping
            ctx.restore(); // End scaling
        }

        ctx.restore(); // End translations
    }

    _drawCloseButton(ctx, boxX, boxY, boxW) {
        const closeSize = 36;
        const closeX = boxX + boxW - 50;
        const closeY = boxY + 15;
        this.hitboxes.close = { x: closeX, y: closeY, w: closeSize, h: closeSize };

        const hoverPop = this.anim.hover.close * 0.2;
        const s = 1 + hoverPop;

        ctx.save();
        ctx.translate(closeX + closeSize / 2, closeY + closeSize / 2);
        ctx.scale(s, s);
        
        ctx.fillStyle = this.anim.hover.close > 0.5 ? '#ff4757' : '#ff6b81';
        ctx.beginPath();
        ctx.roundRect(-closeSize / 2, -closeSize / 2, closeSize, closeSize, 8);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', 0, 2);
        ctx.restore();
    }

    _drawNavigation(ctx, boxX, boxY, boxW, boxH) {
        const bottomY = boxY + boxH - 45;

        // Arrows
        this._drawArrow(ctx, '◀', boxX + 60, bottomY, 'leftArrow', this.currentPage > 1);
        this._drawArrow(ctx, '▶', boxX + boxW - 60, bottomY, 'rightArrow', this.currentPage < this.totalPages);

        // Dots
        this.hitboxes.dots = [];
        const dotSpacing = 35;
        const startDotX = boxX + boxW / 2 - (dotSpacing * (this.totalPages - 1)) / 2;

        for (let i = 1; i <= this.totalPages; i++) {
            const dx = startDotX + (i - 1) * dotSpacing;
            this.hitboxes.dots.push({ x: dx - 15, y: bottomY - 15, w: 30, h: 30 });
            
            const isCurrent = i === this.currentPage;
            const hoverPop = this.anim.hover.dots[i - 1] * 3;
            const radius = (isCurrent ? 7 : 5) + hoverPop;

            ctx.beginPath();
            ctx.arc(dx, bottomY, radius, 0, Math.PI * 2);
            ctx.fillStyle = isCurrent ? '#00d8d6' : '#808e9b';
            ctx.fill();
        }
    }

    _drawArrow(ctx, text, x, y, hitboxKey, isActive) {
        ctx.save();
        const hoverShift = this.anim.hover[hitboxKey] * (hitboxKey === 'leftArrow' ? -5 : 5);
        ctx.translate(x + hoverShift, y);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = isActive ? (this.anim.hover[hitboxKey] > 0.5 ? '#00d8d6' : '#d2dae2') : '#485460';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        
        ctx.restore();

        this.hitboxes[hitboxKey] = { x: x - 25, y: y - 25, w: 50, h: 50 };
    }

    _drawPageContent(ctx, pageNum, offsetX, boxY, boxW, boxH) {
        const contentPadding = 40;
        const contentW = (boxW - contentPadding * 3) / 2;
        const contentY = boxY + 80;
        
        const isImageLeft = pageNum % 2 !== 0;
        const leftX = offsetX + contentPadding;
        const rightX = offsetX + contentPadding * 2 + contentW;

        // Render Image Frame
        const imgX = isImageLeft ? leftX : rightX;
        const imgH = Math.max(120, boxH - 220); // Responsive image frame height
        
        ctx.fillStyle = '#2f3640';
        ctx.beginPath();
        ctx.roundRect(imgX, contentY, contentW, imgH, 10);
        ctx.fill();
        
        // Decoupled global asset load with native safety checks
        let img = null;
        if (typeof AssetManager !== 'undefined' && typeof AssetManager.get === 'function') {
            img = AssetManager.get(`page-${pageNum}`);
        }

        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(imgX, contentY, contentW, imgH, 10);
            ctx.clip();
            ctx.drawImage(img, imgX, contentY, contentW, imgH);
            ctx.restore();
        } else {
            ctx.fillStyle = '#718093';
            ctx.font = 'italic 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Image: page-${pageNum}.png`, imgX + contentW / 2, contentY + imgH / 2);
        }

        // Render Text Content
        const textX = isImageLeft ? rightX : leftX;
        ctx.fillStyle = '#d2dae2';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Dynamically pull title based on active page
        const pageTitle = this.pageTitles[pageNum - 1] || `Page ${pageNum}`;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00d8d6';
        ctx.fillText(pageTitle, textX, contentY);

        // Dynamically pull 1-sentence basic instruction
        const pageText = this.pageInstructions[pageNum - 1] || "";
        ctx.font = '16px Arial';
        ctx.fillStyle = '#d2dae2';
        this._wrapText(ctx, pageText, textX, contentY + 45, contentW, 22);
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

    _getUnscaledMouse() {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const scale = Math.max(0.001, this.anim.scale); // Guard division by 0
        const mx = (this.mouse.x - cx) / scale + cx;
        const my = (this.mouse.y - cy) / scale + cy;
        return { x: mx, y: my };
    }

    _isHit(x, y, box) {
        if (!box) return false;
        return x >= box.x && x <= box.x + box.w &&
               y >= box.y && y <= box.y + box.h;
    }
}