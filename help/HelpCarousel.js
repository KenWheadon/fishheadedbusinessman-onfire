class HelpCarousel {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Full-screen overlay styling
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.display = 'none';
        this.canvas.style.pointerEvents = 'none'; // Only capture clicks when open

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

        // Mouse Tracking
        this.mouse = { x: -1000, y: -1000, isDown: false };

        this.images = {};
        this.preloadImages();

        this.hitboxes = {
            close: { x: 0, y: 0, w: 0, h: 0 },
            leftArrow: { x: 0, y: 0, w: 0, h: 0 },
            rightArrow: { x: 0, y: 0, w: 0, h: 0 },
            dots: []
        };

        this.fillerText = "Welcome to the game manual. This is filler text designed to demonstrate the canvas-based text wrapping capability. Use the left and right arrows, or the dots below, to navigate through the pages. Each page alternates the layout of the text and the accompanying image to keep the design visually engaging.";

        this._bindEvents();
        this._loop = this._loop.bind(this);
        this.isRunning = false;
    }

    preloadImages() {
        for (let i = 1; i <= this.totalPages; i++) {
            const img = new Image();
            img.src = `image/page-${i}.png`;
            this.images[i] = img;
        }
    }

    mount(parentElementId) {
        const parent = document.getElementById(parentElementId) || document.body;
        parent.appendChild(this.canvas);
        this._resize();
        window.addEventListener('resize', () => this._resize());
    }

    show() {
        this.isVisible = true;
        this.canvas.style.display = 'block';
        this.canvas.style.pointerEvents = 'auto';
        this.anim.targetScale = 1;
        this._resize();
        if (!this.isRunning) {
            this.isRunning = true;
            this._loop();
        }
    }

    hide() {
        this.isVisible = false;
        this.canvas.style.pointerEvents = 'none';
        this.anim.targetScale = 0;
        // The loop will automatically stop when scale hits 0
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    _bindEvents() {
        // Track mouse for hover juiciness
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouse.x = -1000;
            this.mouse.y = -1000;
        });

        // Handle clicks
        this.canvas.addEventListener('click', () => {
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
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'Escape') this.hide();
            if (e.key === 'ArrowLeft') this.currentPage = Math.max(1, this.currentPage - 1);
            if (e.key === 'ArrowRight') this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
        });
    }

    _getUnscaledMouse() {
        // Because the popup scales from the center, we need to adjust mouse coordinates 
        // to check hitboxes accurately against the base coordinate system.
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        const mx = (this.mouse.x - cx) / this.anim.scale + cx;
        const my = (this.mouse.y - cy) / this.anim.scale + cy;
        return { x: mx, y: my };
    }

    _isHit(x, y, box) {
        return x >= box.x && x <= box.x + box.w &&
               y >= box.y && y <= box.y + box.h;
    }

    // --- PHYSICS & ANIMATION UPDATE ---
    _updatePhysics() {
        // 1. Spring physics for "Pop" open/close
        const tension = 0.2;
        const friction = 0.7;
        const force = (this.anim.targetScale - this.anim.scale) * tension;
        this.anim.scaleVel = (this.anim.scaleVel + force) * friction;
        this.anim.scale += this.anim.scaleVel;

        // 2. Overlay fade
        const targetAlpha = this.isVisible ? 0.8 : 0;
        this.anim.overlayAlpha += (targetAlpha - this.anim.overlayAlpha) * 0.15;

        // 3. Lerp for Carousel "Swish"
        this.anim.currentPage += (this.currentPage - this.anim.currentPage) * 0.12;

        // 4. Hover states (lerp towards 1 if hovered, 0 if not)
        const mouse = this._getUnscaledMouse();
        
        const updateHover = (key, box) => {
            const isHovered = this.isVisible && this._isHit(mouse.x, mouse.y, box);
            this.anim.hover[key] += ((isHovered ? 1 : 0) - this.anim.hover[key]) * 0.2;
        };

        updateHover('close', this.hitboxes.close);
        updateHover('leftArrow', this.hitboxes.leftArrow);
        updateHover('rightArrow', this.hitboxes.rightArrow);
        
        for (let i = 0; i < this.totalPages; i++) {
            const isHovered = this.isVisible && this.hitboxes.dots[i] && this._isHit(mouse.x, mouse.y, this.hitboxes.dots[i]);
            this.anim.hover.dots[i] += ((isHovered ? 1 : 0) - this.anim.hover.dots[i]) * 0.2;
        }

        // Stop loop if completely hidden to save CPU
        if (!this.isVisible && this.anim.scale < 0.01 && this.anim.overlayAlpha < 0.01) {
            this.isRunning = false;
            this.canvas.style.display = 'none';
        }
    }

    _wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                this.ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, currentY);
    }

    // --- MAIN RENDER LOOP ---
    _loop() {
        if (!this.isRunning) return;
        
        this._updatePhysics();
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        // Draw Overlay background
        ctx.fillStyle = `rgba(15, 20, 25, ${this.anim.overlayAlpha})`;
        ctx.fillRect(0, 0, cw, ch);

        // If heavily scaled down, don't bother rendering the heavy box contents
        if (this.anim.scale > 0.01) {
            ctx.save();
            
            // Transform matrix for the POP effect (scales from center of screen)
            ctx.translate(cw / 2, ch / 2);
            ctx.scale(this.anim.scale, this.anim.scale);
            ctx.translate(-cw / 2, -ch / 2);

            const boxW = Math.min(850, cw * 0.9);
            const boxH = Math.min(550, ch * 0.9);
            const boxX = (cw - boxW) / 2;
            const boxY = (ch - boxH) / 2;

            // Box Shadow (Juice)
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 15;

            // Box Background
            ctx.fillStyle = '#1e272e';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxW, boxH, 20);
            ctx.fill();
            
            // Reset shadow for children
            ctx.shadowColor = 'transparent';

            // --- Draw UI Elements ---
            this._drawCloseButton(ctx, boxX, boxY, boxW);
            this._drawNavigation(ctx, boxX, boxY, boxW, boxH);

            // --- Draw Sliding Content (With Clipping) ---
            ctx.save();
            // Clip to the inner content area so pages don't bleed when swishing
            ctx.beginPath();
            ctx.roundRect(boxX + 20, boxY + 60, boxW - 40, boxH - 140, 10);
            ctx.clip();

            // Render pages. Calculate offset based on animCurrentPage
            for (let i = 1; i <= this.totalPages; i++) {
                // Determine horizontal pixel shift for this page
                const xOffset = (i - this.anim.currentPage) * boxW;
                
                // Only draw if it's visible within the bounds
                if (Math.abs(xOffset) < boxW) {
                    this._drawPageContent(ctx, i, boxX + xOffset, boxY, boxW, boxH);
                }
            }
            ctx.restore(); // Remove clipping mask
            ctx.restore(); // Remove scale transform
        }

        requestAnimationFrame(this._loop);
    }

    _drawCloseButton(ctx, boxX, boxY, boxW) {
        const closeSize = 36;
        const closeX = boxX + boxW - 50;
        const closeY = boxY + 15;
        this.hitboxes.close = { x: closeX, y: closeY, w: closeSize, h: closeSize };

        const hoverPop = this.anim.hover.close * 0.2; // scales up 20% on hover
        const s = 1 + hoverPop;

        ctx.save();
        ctx.translate(closeX + closeSize/2, closeY + closeSize/2);
        ctx.scale(s, s);
        
        ctx.fillStyle = this.anim.hover.close > 0.5 ? '#ff4757' : '#ff6b81';
        ctx.beginPath();
        ctx.roundRect(-closeSize/2, -closeSize/2, closeSize, closeSize, 8);
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
            const hoverPop = this.anim.hover.dots[i-1] * 3; // radius expansion
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

        // Arrow Hitbox (static, ignoring hover shift for stability)
        this.hitboxes[hitboxKey] = { x: x - 25, y: y - 25, w: 50, h: 50 };
    }

    _drawPageContent(ctx, pageNum, offsetX, boxY, boxW, boxH) {
        const contentPadding = 40;
        const contentW = (boxW - contentPadding * 3) / 2;
        const contentY = boxY + 80;
        
        const isImageLeft = pageNum % 2 !== 0;
        const leftX = offsetX + contentPadding;
        const rightX = offsetX + contentPadding * 2 + contentW;

        // Draw Image
        const img = this.images[pageNum];
        const imgX = isImageLeft ? leftX : rightX;
        
        ctx.fillStyle = '#2f3640';
        ctx.beginPath();
        ctx.roundRect(imgX, contentY, contentW, 320, 10);
        ctx.fill();
        
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.save();
            ctx.clip(); // Clip image to the rounded rect
            ctx.drawImage(img, imgX, contentY, contentW, 320);
            ctx.restore();
        } else {
            ctx.fillStyle = '#718093';
            ctx.font = 'italic 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Image: page-${pageNum}.png`, imgX + contentW/2, contentY + 160);
        }

        // Draw Text
        const textX = isImageLeft ? rightX : leftX;
        ctx.fillStyle = '#d2dae2';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#00d8d6';
        ctx.fillText(`Page ${pageNum} Instructions`, textX, contentY);

        ctx.font = '18px Arial';
        ctx.fillStyle = '#d2dae2';
        this._wrapText(this.fillerText, textX, contentY + 40, contentW, 28);
    }
}