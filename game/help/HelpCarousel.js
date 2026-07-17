/**
 * HelpCarousel - A highly polished, responsive tutorial component.
 * Integrates CRT scanlines, neon glowing shadows, spring scale physics, 
 * pagination, and interactive page "swish" transitions.
 */
class HelpCarousel {
    /**
     * @param {Object} config - Configuration settings
     * @param {number} config.width - Allocated rendering block width
     * @param {number} config.height - Allocated rendering block height
     */
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        // --- CAROUSEL PAGINATION DATA ---
        this.currentPage = 1;
        this.totalPages = 5;
        this.isVisible = false;
        this.isMobile = false;

        this.dims = { w: 0, h: 0 };
        this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        this.hitboxes = {
            leftArrow: null,
            rightArrow: null,
            dots: []
        };
        this.cursor = 'default';

        // Dynamic event listener reference to enable self-cleaning wheel hooks
        this._boundWheelHandler = null;

        // Physics & Animation State
        this.anim = {
            alpha: 0, targetAlpha: 0,
            scale: 0, targetScale: 0, scaleVel: 0,
            currentPage: 1, // Interpolates to this.currentPage for the "swish" transition
            hover: {
                leftArrow: 0,
                rightArrow: 0,
                dots: Array(this.totalPages).fill(0)
            }
        };

        // Static Tutorial Page Copy
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

        // 1. INSTANTIATE RETRO CLOSE/BACK BUTTON
        this.backButton = new ArcadeButton({
            text: 'BACK TO MENU',
            themeColor: '#ff007f', // Hot Pink
            glowColor: '#ff00ff'
        });

        // 2. INSTANTIATE EXTRACTED CORNER CLOSE BUTTON
        this.closeButton = new CloseButton({ size: 24 });

        this.buttons = [this.backButton];

        this.resize(this.width, this.height);
    }

    /**
     * Updates block dimensions and recalculates responsive breakpoint metrics.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Calculate dynamic scale ratios
        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.7), 1.2);

        // Fluid responsive viewport layouts
        if (width < 480) {
            // Mobile Breakpoint
            this.dims.w = Math.min(width * 0.94, 340);
            this.dims.h = Math.min(height * 0.94, 520);
            this.isMobile = true;
        } else if (width < 768) {
            // Tablet Breakpoint
            this.dims.w = 480 * this.scaleFactor;
            this.dims.h = 520 * this.scaleFactor;
            this.isMobile = false;
        } else {
            // Desktop Viewport
            this.dims.w = 560 * this.scaleFactor;
            this.dims.h = 560 * this.scaleFactor;
            this.isMobile = false;
        }

        // Clamp boundaries to prevent dialog cropping
        this.dims.w = Math.max(300, Math.min(680, this.dims.w));
        this.dims.h = Math.max(440, Math.min(680, this.dims.h));

        this.recalculateLayout();
    }

    /**
     * Re-allocates coordinate spaces relative to localized center matrices.
     */
    recalculateLayout() {
        const bw = this.dims.w;
        const bh = this.dims.h;

        // Establish safe bottom boundaries
        const btnW = bw * 0.82;
        const btnH = this.isMobile ? 32 : 40 * this.scaleFactor;

        // Position back button perfectly at the bottom of the layout
        const btnY = bh / 2 - btnH / 2 - 12;
        this.backButton.setPosition(0, btnY, btnW, btnH, this.scaleFactor);

        // Position navigation controls (arrows/dots) safely above the Back Button
        const arrowY = btnY - btnH / 2 - 18 * this.scaleFactor;

        // Setup the sliding viewport clip mask boundaries to stop above the navigation elements
        this.clipY = -bh / 2 + 65; // Header spacing buffer
        const clipBottom = arrowY - 15 * this.scaleFactor;
        this.clipHeight = clipBottom - this.clipY;
        this.clipWidth = bw - 44;
        this.clipX = -this.clipWidth / 2;

        // Position Corner Close Button
        this.closeButton.setPosition(bw / 2 - 22, -bh / 2 + 22, 24, this.scaleFactor);

        // Map Left/Right Navigation Arrow zones relative to dialog center
        const leftArrowX = -bw * 0.38;
        const rightArrowX = bw * 0.38;

        this.hitboxes.leftArrow = { x: leftArrowX - 20, y: arrowY - 20, w: 40, h: 40 };
        this.hitboxes.rightArrow = { x: rightArrowX - 20, y: arrowY - 20, w: 40, h: 40 };

        // Map Pagination Dots zones relative to dialog center
        this.hitboxes.dots = [];
        const dotSpacing = 22 * this.scaleFactor;
        const startDotX = -((this.totalPages - 1) * dotSpacing) / 2;

        for (let i = 0; i < this.totalPages; i++) {
            const dx = startDotX + i * dotSpacing;
            this.hitboxes.dots.push({ x: dx - 10, y: arrowY - 10, w: 20, h: 20 });
        }
    }

    show() {
        this.isVisible = true;
        this.anim.targetAlpha = 1;
        this.anim.targetScale = 1;

        // Bind and register window scroll interception hooks
        this._boundWheelHandler = this._onWindowWheel.bind(this);
        window.addEventListener('wheel', this._boundWheelHandler, { passive: false });
    }

    hide() {
        this.isVisible = false;
        this.anim.targetAlpha = 0;
        this.anim.targetScale = 0;

        // Destroy dynamic listeners when popup goes off-screen
        if (this._boundWheelHandler) {
            window.removeEventListener('wheel', this._boundWheelHandler);
            this._boundWheelHandler = null;
        }
    }

    /**
     * Mouse Wheel interceptor. Prevents scroll leakage onto lower canvas scenes.
     */
    _onWindowWheel(e) {
        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;
        const bw = this.dims.w;
        const bh = this.dims.h;

        // Process scrolling ONLY if mouse is over popup real-estate
        if (tx >= -bw / 2 && tx <= bw / 2 && ty >= -bh / 2 && ty <= bh / 2) {
            e.preventDefault();
            this.handleMouseWheel(e.deltaY);
        }
    }

    /**
     * Framerate-independent state physics updates.
     */
    update(dt = 1 / 60) {
        const lerpdt = (current, target, speed) => {
            const factor = 1 - Math.exp(-speed * dt * 60);
            return current + (target - current) * Math.min(1, Math.max(0, factor));
        };

        this.anim.alpha = lerpdt(this.anim.alpha, this.anim.targetAlpha, 0.15);
        this.anim.currentPage = lerpdt(this.anim.currentPage, this.currentPage, 0.15);

        // Spring scaling simulation
        const stiffness = 0.2 * 60;
        const friction = Math.pow(0.7, dt * 60);
        this.anim.scaleVel += (this.anim.targetScale - this.anim.scale) * stiffness * dt;
        this.anim.scaleVel *= friction;
        this.anim.scale += this.anim.scaleVel * dt * 60;

        this._processHover(lerpdt);

        this.closeButton.update(dt);
        this.buttons.forEach(btn => btn.update(dt));
    }

    _processHover(lerpdt) {
        if (!this.isVisible || this.anim.scale < 0.9) return;

        this.cursor = 'default';
        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.closeButton.handleMouseMove(tx, ty);
        if (this.closeButton.isHovered) {
            this.cursor = 'pointer';
        }

        // Arrow hover states
        const leftHover = this._isHit(tx, ty, this.hitboxes.leftArrow) && this.currentPage > 1 ? 1 : 0;
        const rightHover = this._isHit(tx, ty, this.hitboxes.rightArrow) && this.currentPage < this.totalPages ? 1 : 0;
        this.anim.hover.leftArrow = lerpdt(this.anim.hover.leftArrow, leftHover, 0.2);
        this.anim.hover.rightArrow = lerpdt(this.anim.hover.rightArrow, rightHover, 0.2);

        if (leftHover || rightHover) {
            this.cursor = 'pointer';
        }

        // Dot hover states
        for (let i = 0; i < this.totalPages; i++) {
            const dotHover = this._isHit(tx, ty, this.hitboxes.dots[i]) ? 1 : 0;
            this.anim.hover.dots[i] = lerpdt(this.anim.hover.dots[i], dotHover, 0.2);
            if (dotHover) {
                this.cursor = 'pointer';
            }
        }

        // ArcadeButton hover check
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

        // Map relative to center translations & scales
        this.mouse.tx = (localX - this.width / 2) / Math.max(0.001, this.anim.scale);
        this.mouse.ty = (localY - this.height / 2) / Math.max(0.001, this.anim.scale);

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.closeButton.handleMouseMove(tx, ty);
        this.buttons.forEach(btn => btn.handleMouseMove(tx, ty));
    }

    handleMouseDown(localX, localY) {
        this.handleMouseMove(localX, localY);
        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.closeButton.handleMouseDown(tx, ty);
        if (this.backButton.isPointInRect(tx, ty)) {
            this.backButton.handleMouseDown(tx, ty);
        }
    }

    handleMouseUp(localX, localY) {
        this.handleMouseMove(localX, localY);
        if (!this.isVisible || this.anim.scale < 0.9) return;

        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.closeButton.handleMouseUp(tx, ty, () => {
            this.hide();
        });

        this.backButton.handleMouseUp(tx, ty, () => {
            this.hide();
        });

        // Resolve Navigation Hits
        if (this._isHit(tx, ty, this.hitboxes.leftArrow) && this.currentPage > 1) {
            this.currentPage = Math.max(1, this.currentPage - 1);
        } else if (this._isHit(tx, ty, this.hitboxes.rightArrow) && this.currentPage < this.totalPages) {
            this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
        } else {
            for (let i = 0; i < this.hitboxes.dots.length; i++) {
                if (this._isHit(tx, ty, this.hitboxes.dots[i])) {
                    this.currentPage = i + 1;
                    break;
                }
            }
        }
    }

    handleMouseClick(localX, localY) {
        // Redundant click hook omitted to avoid double-firing bugs on click routing[cite: 1]
    }

    getCursorStyle() {
        return this.cursor || 'default';
    }

    handleMouseWheel(deltaY) {
        if (!this.isVisible) return;
        if (deltaY > 5) {
            this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
        } else if (deltaY < -5) {
            this.currentPage = Math.max(1, this.currentPage - 1);
        }
    }

    handleKeyDown(key) {
        if (!this.isVisible) return;
        if (key === 'Escape') this.hide();
        if (key === 'ArrowLeft') this.currentPage = Math.max(1, this.currentPage - 1);
        if (key === 'ArrowRight') this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
    }

    // --- DECOUPLED DRAW PIPELINE ---

    draw(ctx, x, y) {
        const bw = this.dims.w;
        const bh = this.dims.h;

        ctx.save();

        // Safety clipping limits to prevent visual leakages
        ctx.beginPath();
        ctx.rect(x, y, this.width, this.height);
        ctx.clip();

        // Screen Dim Backdrop Tint (70% Opacity)
        ctx.fillStyle = `rgba(10, 10, 14, ${this.anim.alpha * 0.7})`;
        ctx.fillRect(x, y, this.width, this.height);

        if (this.anim.scale <= 0.01) {
            ctx.restore();
            return;
        }

        // Draw centered and scaled
        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.anim.scale, this.anim.scale);

        // 1. NEO-BRUTALIST OFFSET DIALOG SHADOW
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-bw / 2 + 8, -bh / 2 + 8, bw, bh);

        // 2. MAIN DIALOG BODY PANEL
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

        // 4. TECH CORNER DECO BRACKETS
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 8, 2);
        ctx.fillRect(-bw / 2 + 10, -bh / 2 + 10, 2, 8);
        ctx.fillRect(bw / 2 - 18, -bh / 2 + 10, 8, 2);
        ctx.fillRect(bw / 2 - 12, -bh / 2 + 10, 2, 8);

        // 5. HEADER TYPOGRAPHY
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(24 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOW TO PLAY', 0, -bh / 2 + 35);

        // Neo Divider line
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bw * 0.42, -bh / 2 + 58);
        ctx.lineTo(bw * 0.42, -bh / 2 + 58);
        ctx.stroke();

        // 6. DRAW CLOSE WINDOW CORNER BOX
        this.closeButton.draw(ctx);

        // 7. CAROUSEL CONTENT SLIDING VIEWPORT
        const clipW = this.clipWidth;
        const clipH = this.clipHeight;
        const clipX = this.clipX;
        const clipY = this.clipY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip(); // Mask content boundary limits

        for (let i = 1; i <= this.totalPages; i++) {
            const xOffset = (i - this.anim.currentPage) * clipW;
            if (Math.abs(xOffset) < clipW) {
                this._drawPageContent(ctx, i, clipX + xOffset, clipY, clipW, clipH);
            }
        }
        ctx.restore();

        // 8. HIGH-CONTRAST NEON PAGINATION CONTROLS (Dots & Arrows)
        this._drawNavigation(ctx);

        // 9. DRAW BOTTOM ARCADE BUTTON
        this.backButton.draw(ctx);

        ctx.restore(); // Restore center scale transformations
        ctx.restore(); // Restore root canvas security clips
    }

    /**
     * Alternates layout styles based on viewport size metrics.
     */
    _drawPageContent(ctx, pageNum, offsetX, clipY, clipW, clipH) {
        const padding = 15 * this.scaleFactor;
        const title = this.pageTitles[pageNum - 1] || "";
        const text = this.pageInstructions[pageNum - 1] || "";

        if (this.isMobile) {
            // --- MOBILE LAYOUT: STACKED VERTICALLY ---
            const imgW = clipW - padding * 2;
            const imgH = clipH * 0.46;
            const imgX = offsetX + padding;
            const imgY = clipY + padding;

            // Thumbnail container
            ctx.save();
            ctx.fillStyle = '#121215';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgW, imgH, 6);
            ctx.fill();
            ctx.stroke();

            // Load Asset
            let img = (typeof AssetManager !== 'undefined') ? AssetManager.get(`page-${pageNum}`) : null;
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgW, imgH, 6);
                ctx.clip();
                ctx.drawImage(img, imgX, imgY, imgW, imgH);
                ctx.restore();
            } else {
                ctx.fillStyle = '#1e1e24';
                ctx.fillRect(imgX + 2, imgY + 2, imgW - 4, imgH - 4);

                // Fallback Pixel-Art Emoji Emitter
                ctx.fillStyle = '#ffe600';
                ctx.font = 'bold 36px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const iconMap = ['🎯', '🃏', '💰', '💀', '🏆'];
                ctx.fillText(iconMap[(pageNum - 1) % iconMap.length], imgX + imgW / 2, imgY + imgH / 2);
            }
            ctx.restore();

            // Copy Stack Description
            const textY = imgY + imgH + 15;
            ctx.fillStyle = '#ffe600'; // Cyberpunk warning yellow
            ctx.font = `bold ${Math.round(14 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`// STEP 0${pageNum}: ${title.toUpperCase()}`, offsetX + clipW / 2, textY);

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            const maxTextW = clipW - padding * 2;
            this._wrapText(ctx, text, offsetX + padding, textY + 24, maxTextW, 14, 'center');

        } else {
            // --- TABLET & DESKTOP LAYOUT: SPLIT HORIZONTALLY ---
            const isImageLeft = pageNum % 2 !== 0; // Alternate layout balance
            const imgW = clipW * 0.48;
            const imgH = clipH - padding * 2;
            const imgX = isImageLeft ? (offsetX + padding) : (offsetX + clipW - padding - imgW);
            const imgY = clipY + padding;

            // Thumbnail Container
            ctx.save();
            ctx.fillStyle = '#121215';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(imgX, imgY, imgW, imgH, 6);
            ctx.fill();
            ctx.stroke();

            let img = (typeof AssetManager !== 'undefined') ? AssetManager.get(`page-${pageNum}`) : null;
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(imgX, imgY, imgW, imgH, 6);
                ctx.clip();
                ctx.drawImage(img, imgX, imgY, imgW, imgH);
                ctx.restore();
            } else {
                ctx.fillStyle = '#1e1e24';
                ctx.fillRect(imgX + 3, imgY + 3, imgW - 6, imgH - 6);

                ctx.fillStyle = '#ffe600';
                ctx.font = 'bold 48px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const iconMap = ['🎯', '🃏', '💰', '💀', '🏆'];
                ctx.fillText(iconMap[(pageNum - 1) % iconMap.length], imgX + imgW / 2, imgY + imgH / 2);
            }
            ctx.restore();

            // Copy Stack Details
            const textX = isImageLeft ? (offsetX + padding * 2 + imgW) : (offsetX + padding);
            let currentTextY = imgY + 16;

            ctx.fillStyle = '#ff007f';
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`// STATUS PROTOCOL: PAGE 0${pageNum}/0${this.totalPages}`, textX, currentTextY);

            currentTextY += 20;
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(20 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.fillText(title.toUpperCase(), textX, currentTextY);

            // Brutalist sub-line
            currentTextY += 30;
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(textX, currentTextY);
            ctx.lineTo(textX + imgW - padding, currentTextY);
            ctx.stroke();

            currentTextY += 15;
            ctx.fillStyle = '#ffe600';
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.fillText('SECURITY STATUS: ENCRYPTED', textX, currentTextY);

            currentTextY += 18;
            ctx.fillStyle = '#8a8a9a';
            ctx.font = `italic ${Math.round(12 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            const maxTextW = imgW - padding * 2;
            this._wrapText(ctx, `"${text}"`, textX, currentTextY, maxTextW, 16, 'left');
        }
    }

    /**
     * Renders pagination controls (arrows & dots) with original colors and animations.
     */
    _drawNavigation(ctx) {
        const bw = this.dims.w;
        const bh = this.dims.h;

        // Match calculation heights cleanly from recalculateLayout
        const btnH = this.isMobile ? 32 : 40 * this.scaleFactor;
        const btnY = bh / 2 - btnH / 2 - 12;
        const arrowY = btnY - btnH / 2 - 18 * this.scaleFactor;

        // 1. Left Navigation Arrow (◀)
        const isLeftActive = this.currentPage > 1;
        const leftHoverShift = this.anim.hover.leftArrow * -5; // Responsive slide pop

        ctx.save();
        ctx.translate(-bw * 0.38 + leftHoverShift, arrowY);
        ctx.font = `bold ${Math.round(26 * this.scaleFactor)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Exact original color scheme states
        ctx.fillStyle = isLeftActive
            ? (this.anim.hover.leftArrow > 0.5 ? '#00d8d6' : '#d2dae2')
            : '#485460';
        ctx.fillText('◀', 0, 0);
        ctx.restore();

        // 2. Right Navigation Arrow (▶)
        const isRightActive = this.currentPage < this.totalPages;
        const rightHoverShift = this.anim.hover.rightArrow * 5;

        ctx.save();
        ctx.translate(bw * 0.38 + rightHoverShift, arrowY);
        ctx.font = `bold ${Math.round(26 * this.scaleFactor)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Exact original color scheme states
        ctx.fillStyle = isRightActive
            ? (this.anim.hover.rightArrow > 0.5 ? '#00d8d6' : '#d2dae2')
            : '#485460';
        ctx.fillText('▶', 0, 0);
        ctx.restore();

        // 3. Pagination Dots (with dynamic sizes and colors matching original code)
        const dotSpacing = 22 * this.scaleFactor;
        const startDotX = -((this.totalPages - 1) * dotSpacing) / 2;

        for (let i = 0; i < this.totalPages; i++) {
            const dx = startDotX + i * dotSpacing;
            const isCurrent = (i + 1) === this.currentPage;

            // Hover pop scaling formulas exactly like original code
            const hoverPop = this.anim.hover.dots[i] * 3;
            const radius = ((isCurrent ? 7 : 5) + hoverPop) * this.scaleFactor;

            ctx.beginPath();
            ctx.arc(dx, arrowY, radius, 0, Math.PI * 2);

            // Exact colors from the original design spec
            ctx.fillStyle = isCurrent
                ? '#00d8d6'
                : (this.anim.hover.dots[i] > 0.5 ? '#00d8d6' : '#808e9b');
            ctx.fill();
        }
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight, align = 'left') {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        ctx.textAlign = align;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                const drawX = align === 'center' ? x + maxWidth / 2 : x;
                ctx.fillText(line, drawX, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        const drawX = align === 'center' ? x + maxWidth / 2 : x;
        ctx.fillText(line, drawX, currentY);
    }
}