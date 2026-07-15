class HelpCarousel {
    constructor() {
        // Create and setup the canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Style for full-screen overlay overlaying the game
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.display = 'none';

        // Carousel State
        this.currentPage = 1;
        this.totalPages = 5;
        this.isVisible = false;
        
        // Asset storage
        this.images = {};
        this.preloadImages();

        // Hitboxes for interaction
        this.hitboxes = {
            close: { x: 0, y: 0, w: 0, h: 0 },
            leftArrow: { x: 0, y: 0, w: 0, h: 0 },
            rightArrow: { x: 0, y: 0, w: 0, h: 0 },
            dots: []
        };

        // Filler content
        this.fillerText = "Welcome to the game manual. This is filler text designed to demonstrate the canvas-based text wrapping capability. Use the left and right arrows, or the dots below, to navigate through the pages. Each page alternates the layout of the text and the accompanying image to keep the design visually engaging.";

        this._bindEvents();
    }

    preloadImages() {
        for (let i = 1; i <= this.totalPages; i++) {
            const img = new Image();
            img.src = `image/page-${i}.png`;
            this.images[i] = img;
            // Redraw if the image finishes loading while viewing its page
            img.onload = () => {
                if (this.isVisible && this.currentPage === i) {
                    this.draw();
                }
            };
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
        this._resize(); // Ensure canvas resolution matches display size before drawing
        this.draw();
    }

    hide() {
        this.isVisible = false;
        this.canvas.style.display = 'none';
    }

    _resize() {
        // Set actual internal canvas resolution to match CSS display size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.isVisible) this.draw();
    }

    _bindEvents() {
        // Handle clicks using hit detection
        this.canvas.addEventListener('click', (e) => {
            if (!this.isVisible) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Close Button
            if (this._isHit(mouseX, mouseY, this.hitboxes.close)) {
                this.hide();
            }
            // Left Arrow
            else if (this._isHit(mouseX, mouseY, this.hitboxes.leftArrow)) {
                this.currentPage = Math.max(1, this.currentPage - 1);
                this.draw();
            }
            // Right Arrow
            else if (this._isHit(mouseX, mouseY, this.hitboxes.rightArrow)) {
                this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
                this.draw();
            }
            // Dots
            else {
                for (let i = 0; i < this.hitboxes.dots.length; i++) {
                    if (this._isHit(mouseX, mouseY, this.hitboxes.dots[i])) {
                        this.currentPage = i + 1;
                        this.draw();
                        break;
                    }
                }
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'Escape') this.hide();
            if (e.key === 'ArrowLeft') {
                this.currentPage = Math.max(1, this.currentPage - 1);
                this.draw();
            }
            if (e.key === 'ArrowRight') {
                this.currentPage = Math.min(this.totalPages, this.currentPage + 1);
                this.draw();
            }
        });
    }

    _isHit(x, y, box) {
        return x >= box.x && x <= box.x + box.w &&
               y >= box.y && y <= box.y + box.h;
    }

    _wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                this.ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        this.ctx.fillText(line, x, currentY);
    }

    draw() {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // 1. Draw Overlay Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, cw, ch);

        // 2. Draw Popup Box
        const boxW = Math.min(800, cw * 0.9);
        const boxH = Math.min(500, ch * 0.9);
        const boxX = (cw - boxW) / 2;
        const boxY = (ch - boxH) / 2;

        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 15);
        ctx.fill();

        // 3. Draw Close Button (X)
        const closeSize = 30;
        const closeX = boxX + boxW - 45;
        const closeY = boxY + 15;
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.roundRect(closeX, closeY, closeSize, closeSize, 5);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('X', closeX + closeSize/2, closeY + closeSize/2 + 2);
        
        this.hitboxes.close = { x: closeX, y: closeY, w: closeSize, h: closeSize };

        // 4. Content Area (Alternating layout based on odd/even page)
        const contentPadding = 40;
        const contentW = (boxW - contentPadding * 3) / 2; // Half width for split layout
        const contentY = boxY + 80;
        
        const isImageLeft = this.currentPage % 2 !== 0;
        const leftX = boxX + contentPadding;
        const rightX = boxX + contentPadding * 2 + contentW;

        // Draw Image
        const img = this.images[this.currentPage];
        const imgX = isImageLeft ? leftX : rightX;
        
        ctx.fillStyle = '#34495e';
        ctx.fillRect(imgX, contentY, contentW, 300); // Image placeholder background
        
        if (img && img.complete && img.naturalWidth !== 0) {
            // Draw actual image scaled to fit
            ctx.drawImage(img, imgX, contentY, contentW, 300);
        } else {
            ctx.fillStyle = '#95a5a6';
            ctx.font = '16px Arial';
            ctx.fillText(`Image: page-${this.currentPage}.png`, imgX + contentW/2, contentY + 150);
        }

        // Draw Text
        const textX = isImageLeft ? rightX : leftX;
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '18px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        this._wrapText(`Page ${this.currentPage} Help:\n\n` + this.fillerText, textX, contentY, contentW, 25);

        // 5. Draw Navigation
        const bottomY = boxY + boxH - 50;

        // Arrows
        ctx.font = '30px Arial';
        ctx.fillStyle = this.currentPage > 1 ? '#ecf0f1' : '#7f8c8d';
        ctx.fillText('◀', boxX + 50, bottomY);
        this.hitboxes.leftArrow = { x: boxX + 30, y: bottomY - 15, w: 40, h: 40 };

        ctx.fillStyle = this.currentPage < this.totalPages ? '#ecf0f1' : '#7f8c8d';
        ctx.fillText('▶', boxX + boxW - 50, bottomY);
        this.hitboxes.rightArrow = { x: boxX + boxW - 70, y: bottomY - 15, w: 40, h: 40 };

        // Dots
        this.hitboxes.dots = [];
        const dotSpacing = 30;
        const startDotX = boxX + boxW / 2 - (dotSpacing * (this.totalPages - 1)) / 2;

        for (let i = 1; i <= this.totalPages; i++) {
            const dx = startDotX + (i - 1) * dotSpacing;
            
            ctx.beginPath();
            ctx.arc(dx, bottomY, 6, 0, Math.PI * 2);
            ctx.fillStyle = i === this.currentPage ? '#3498db' : '#95a5a6';
            ctx.fill();

            // Hitbox for dot (slightly larger than visual dot for easier clicking)
            this.hitboxes.dots.push({ x: dx - 10, y: bottomY - 10, w: 20, h: 20 });
        }
    }
}