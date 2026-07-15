class CreditsPopup {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';
        this.canvas.style.zIndex = '9999';
        this.canvas.style.display = 'none';
        this.canvas.style.pointerEvents = 'none';

        // --- BAKED IN CREDITS DATA ---
        this.credits = [
            {
                name: "Ken Wheadon",
                image: "images/kenwheadon.png",
                title: "Founder",
                roles: ["Dev", "PM", "UI/UX", "Graphics", "QA"],
                flavor: "Nothing quite like a game about fingers and exploding dudes to get you going!"
            },
            {
                name: "Jane Doe",
                image: "images/janedoe.png",
                title: "Audio Director",
                roles: ["SFX", "Composer"],
                flavor: "I made the exploding dudes sound appropriately squishy."
            },
            {
                name: "System Terminal",
                image: "images/terminal.png",
                title: "Server Admin",
                roles: ["DevOps", "Backend"],
                flavor: "01001000 01100101 01101100 01110000"
            }
        ];

        this.images = {};
        this.preloadImages();

        this.isVisible = false;
        this.dims = { w: 0, h: 0 };
        this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        this.hitboxes = { close: null, cards: [] };

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

        this._bindEvents();
    }

    preloadImages() {
        this.credits.forEach((credit, index) => {
            const img = new Image();
            img.src = credit.image;
            this.images[index] = img;
        });
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
        
        this.anim.targetAlpha = 1;
        this.anim.targetScale = 1;
        
        this._resize();
        if (!this.loopId) this._loop();
    }

    hide() {
        this.isVisible = false;
        this.canvas.style.pointerEvents = 'none';
        this.anim.targetAlpha = 0;
        this.anim.targetScale = 0;
    }

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        this.dims.w = Math.min(800, this.canvas.width * 0.9);
        this.dims.h = Math.min(600, this.canvas.height * 0.9);

        const contentHeight = this.credits.length * (this.cardHeight + this.cardGap);
        const visibleHeight = this.dims.h - 140; 
        this.anim.maxScroll = Math.max(0, contentHeight - visibleHeight);
        
        this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
    }

    _loop() {
        const lerp = (a, b, n) => (1 - n) * a + n * b;
        
        this.anim.alpha = lerp(this.anim.alpha, this.anim.targetAlpha, 0.15);
        this.anim.scrollY = lerp(this.anim.scrollY, this.anim.targetScrollY, 0.15);
        
        const stiffness = 0.2;
        const friction = 0.7;
        this.anim.scaleVel += (this.anim.targetScale - this.anim.scale) * stiffness;
        this.anim.scaleVel *= friction;
        this.anim.scale += this.anim.scaleVel;

        this.anim.closeRot = lerp(this.anim.closeRot, this.anim.targetCloseRot, 0.2);
        this.anim.closeScale = lerp(this.anim.closeScale, 1, 0.2);
        
        this._processHover(lerp);
        this._draw();

        if (!this.isVisible && this.anim.alpha < 0.01) {
            this.canvas.style.display = 'none';
            this.loopId = null;
            return;
        }

        this.loopId = requestAnimationFrame(() => this._loop());
    }

    _processHover(lerp) {
        if (!this.isVisible || this.anim.scale < 0.9) return;
        
        let cursor = 'default';
        const tx = this.mouse.tx;
        const ty = this.mouse.ty;

        this.anim.targetCloseRot = 0;
        
        if (this._isHit(tx, ty, this.hitboxes.close)) {
            cursor = 'pointer';
            this.anim.targetCloseRot = Math.PI / 2;
        }

        for (let i = 0; i < this.credits.length; i++) {
            let targetHover = 0;
            if (this._isHit(tx, ty, this.hitboxes.cards[i])) {
                targetHover = 1;
            }
            this.anim.cardHovers[i] = lerp(this.anim.cardHovers[i], targetHover, 0.2);
        }

        this.canvas.style.cursor = cursor;
    }

    _isHit(x, y, box) {
        if (!box) return false;
        return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    }

    _bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.tx = ((e.clientX - rect.left) - this.canvas.width/2) / this.anim.scale;
            this.mouse.ty = ((e.clientY - rect.top) - this.canvas.height/2) / this.anim.scale;
        });

        this.canvas.addEventListener('mouseup', () => {
            if (!this.isVisible || this.anim.scale < 0.9) return;
            if (this._isHit(this.mouse.tx, this.mouse.ty, this.hitboxes.close)) {
                this.anim.closeScale = 0.6;
                this.hide();
            }
        });

        this.canvas.addEventListener('wheel', (e) => {
            if (!this.isVisible) return;
            this.anim.targetScrollY += e.deltaY * 0.8; 
            this.anim.targetScrollY = Math.max(0, Math.min(this.anim.targetScrollY, this.anim.maxScroll));
        }, { passive: true });

        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            if (e.key === 'Escape') this.hide();
            if (e.key === 'ArrowUp') {
                this.anim.targetScrollY = Math.max(0, this.anim.targetScrollY - 100);
            }
            if (e.key === 'ArrowDown') {
                this.anim.targetScrollY = Math.min(this.anim.maxScroll, this.anim.targetScrollY + 100);
            }
        });
    }

    _wrapText(text, x, y, maxWidth, lineHeight, isItalic = false) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        const currentFont = this.ctx.font;
        if (isItalic) this.ctx.font = 'italic ' + currentFont;

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
        
        if (isItalic) this.ctx.font = currentFont;
    }

    _draw() {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const bw = this.dims.w;
        const bh = this.dims.h;

        ctx.clearRect(0, 0, cw, ch);

        ctx.fillStyle = `rgba(0, 0, 0, ${this.anim.alpha * 0.7})`;
        ctx.fillRect(0, 0, cw, ch);

        if (this.anim.scale <= 0.01) return;

        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.scale(this.anim.scale, this.anim.scale);

        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.roundRect(-bw/2, -bh/2, bw, bh, 15);
        ctx.fill();

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CREDITS', 0, -bh/2 + 40);

        const closeSize = 30;
        const closeX = bw/2 - 45;
        const closeY = -bh/2 + 15;
        
        ctx.save();
        ctx.translate(closeX + closeSize/2, closeY + closeSize/2);
        ctx.rotate(this.anim.closeRot);
        ctx.scale(this.anim.closeScale, this.anim.closeScale);
        
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.roundRect(-closeSize/2, -closeSize/2, closeSize, closeSize, 5);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('+', 0, 2);
        ctx.restore();
        
        this.hitboxes.close = { x: closeX, y: closeY, w: closeSize, h: closeSize };

        const contentY = -bh/2 + 80;
        const clipHeight = bh - 100;
        const listWidth = bw - 80;
        const listX = -listWidth / 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(listX - 10, contentY, listWidth + 20, clipHeight, 10);
        ctx.clip();

        this.hitboxes.cards = []; 

        for (let i = 0; i < this.credits.length; i++) {
            const cardY = contentY + (i * (this.cardHeight + this.cardGap)) - this.anim.scrollY;

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

            const img = this.images[i];
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
            } else {
                ctx.fillStyle = '#7f8c8d';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('No Img', imgX + imgSize/2, imgY + imgSize/2);
            }
            ctx.restore(); 

            const textX = listX + 160;
            let textY = cardY + 25 - (hoverAmt * 5); 

            ctx.fillStyle = '#ecf0f1';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(data.name, textX, textY);

            textY += 30;
            ctx.fillStyle = '#3498db'; 
            ctx.font = 'bold 16px Arial';
            ctx.fillText(data.title, textX, textY);
            
            ctx.fillStyle = '#bdc3c7';
            ctx.font = '14px Arial';
            ctx.fillText(` • ${data.roles.join(', ')}`, textX + ctx.measureText(data.title).width, textY + 1);

            textY += 35;
            ctx.fillStyle = '#95a5a6';
            ctx.font = '16px Arial'; 
            const maxTextWidth = listWidth - 180;
            this._wrapText(`"${data.flavor}"`, textX, textY, maxTextWidth, 22, true);
        }

        ctx.restore(); 
        ctx.restore(); 
    }
}