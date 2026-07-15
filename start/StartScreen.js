class StartScreen {
    constructor(canvasId, callbacks = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.onHelp = callbacks.onHelp || (() => {});
        this.onSettings = callbacks.onSettings || (() => {});
        
        // Component state
        this.state = 'ACTIVE'; // ACTIVE, POPPING_OUT, OFFSCREEN
        this.time = 0;
        
        // Logo setup
        this.logo = {
            img: new Image(),
            loaded: false,
            x: this.canvas.width / 2,
            y: 180,
            width: 300,
            height: 150,
            scale: 1,
            targetScale: 1,
            rotation: 0,
            targetRotation: 0,
            twirlVelocity: 0
        };
        this.logo.img.src = 'images/logo.png';
        this.logo.img.onload = () => { this.logo.loaded = true; };

        // Buttons setup
        const startY = 350;
        const spacing = 70;
        this.buttons = [
            this.createButton('PLAY', startY, '#4CAF50'),
            this.createButton('HELP', startY + spacing, '#2196F3'),
            this.createButton('SETTINGS', startY + spacing * 2, '#FF9800')
        ];

        this.mouseX = 0;
        this.mouseY = 0;

        this.bindEvents();
        this.loop();
    }

    createButton(text, y, color) {
        return {
            text: text,
            x: this.canvas.width / 2,
            y: y,
            width: 200,
            height: 50,
            color: color,
            scale: 1,
            targetScale: 1,
            isHovered: false
        };
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', () => {
            if (this.state !== 'ACTIVE') return;

            // Check Logo Click (Twirl)
            if (this.isPointInRect(this.mouseX, this.mouseY, this.logo)) {
                this.logo.twirlVelocity = Math.PI * 2; // Full spin
                this.logo.targetScale = 1.2;
            }

            // Check Button Clicks
            this.buttons.forEach(btn => {
                if (btn.isHovered) {
                    btn.targetScale = 0.8; // Squish on click
                }
            });
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.state !== 'ACTIVE') return;
            
            this.logo.targetScale = 1;

            this.buttons.forEach(btn => {
                if (btn.isHovered) {
                    if (btn.text === 'PLAY') this.triggerPopOut();
                    if (btn.text === 'HELP') this.onHelp();
                    if (btn.text === 'SETTINGS') this.onSettings();
                }
                btn.targetScale = btn.isHovered ? 1.1 : 1;
            });
        });
    }

    isPointInRect(px, py, rect) {
        return px > rect.x - rect.width / 2 && 
               px < rect.x + rect.width / 2 && 
               py > rect.y - rect.height / 2 && 
               py < rect.y + rect.height / 2;
    }

    triggerPopOut() {
        this.state = 'POPPING_OUT';
        
        // Anticipation phase (swell up before popping)
        this.logo.targetScale = 1.4;
        this.buttons.forEach(btn => btn.targetScale = 1.4);

        // Pop out phase
        setTimeout(() => {
            this.logo.targetScale = 0;
            this.buttons.forEach(btn => btn.targetScale = 0);
        }, 150);
    }

    isoffscreen() {
        return this.state === 'OFFSCREEN';
    }

    // A simple linear interpolation for smooth animations
    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    update() {
        this.time += 0.05;

        // Check completion of pop out
        if (this.state === 'POPPING_OUT' && this.logo.scale < 0.05) {
            this.state = 'OFFSCREEN';
            this.logo.scale = 0;
            this.buttons.forEach(btn => btn.scale = 0);
        }

        if (this.state === 'OFFSCREEN') return;

        // Update Logo Juice
        this.logo.scale = this.lerp(this.logo.scale, this.logo.targetScale, 0.2);
        this.logo.rotation += this.logo.twirlVelocity;
        this.logo.twirlVelocity = this.lerp(this.logo.twirlVelocity, 0, 0.1);
        
        // Idle hover for logo
        const logoIdle = this.state === 'ACTIVE' ? Math.sin(this.time) * 10 : 0;

        // Update Buttons Juice
        this.buttons.forEach((btn, index) => {
            if (this.state === 'ACTIVE') {
                btn.isHovered = this.isPointInRect(this.mouseX, this.mouseY, btn);
                
                if (btn.isHovered) {
                    btn.targetScale = this.lerp(btn.targetScale, 1.1, 0.2);
                    this.canvas.style.cursor = 'pointer';
                } else {
                    // Idle breathing offset based on index
                    const idleScale = 1 + Math.sin(this.time + index) * 0.02;
                    btn.targetScale = this.lerp(btn.targetScale, idleScale, 0.2);
                }
            }
            btn.scale = this.lerp(btn.scale, btn.targetScale, 0.3);
        });

        // Reset cursor if nothing hovered
        if (this.state === 'ACTIVE' && !this.buttons.some(b => b.isHovered) && !this.isPointInRect(this.mouseX, this.mouseY, this.logo)) {
            this.canvas.style.cursor = 'default';
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.state === 'OFFSCREEN') return;

        // Draw Logo
        this.ctx.save();
        const logoIdleY = this.state === 'ACTIVE' ? Math.sin(this.time) * 5 : 0;
        this.ctx.translate(this.logo.x, this.logo.y + logoIdleY);
        this.ctx.rotate(this.logo.rotation);
        this.ctx.scale(this.logo.scale, this.logo.scale);
        
        if (this.logo.loaded) {
            this.ctx.drawImage(this.logo.img, -this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
        } else {
            // Fallback box if logo.png is missing
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(-this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
            this.ctx.fillStyle = '#000';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LOGO MISSING', 0, 10);
        }
        this.ctx.restore();

        // Draw Buttons
        this.buttons.forEach(btn => {
            this.ctx.save();
            this.ctx.translate(btn.x, btn.y);
            this.ctx.scale(btn.scale, btn.scale);

            // Button Shadow
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.roundRect(-btn.width / 2, -btn.height / 2 + 5, btn.width, btn.height, 10);
            this.ctx.fill();

            // Button Body
            this.ctx.fillStyle = btn.color;
            this.ctx.beginPath();
            this.ctx.roundRect(-btn.width / 2, -btn.height / 2, btn.width, btn.height, 10);
            this.ctx.fill();

            // Button Text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(btn.text, 0, 0);

            this.ctx.restore();
        });
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}