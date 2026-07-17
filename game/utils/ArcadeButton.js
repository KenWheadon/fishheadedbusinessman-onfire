/**
 * Modular, highly juicy Arcade-style Neon Canvas Button.
 * Includes CRT scanlines, neon glowing shadows, spring scale physics, 
 * and secondary click effects (pixel bursts and screen ripples).
 */
class ArcadeButton {
    constructor(config = {}) {
        this.text = config.text || 'START';
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 200;
        this.height = config.height || 50;

        // Color Profiles (Neon Arcade Defaults)
        this.themeColor = config.themeColor || '#ff007f'; // Neon Pink/Magenta
        this.glowColor = config.glowColor || '#ff00ff';  // Vibrant Pink Glow
        this.textColor = config.textColor || '#ffffff';

        // Motion and Scale States (Elastic Spring Physics)
        this.scale = 1.0;
        this.targetScale = 1.0;
        this.velocity = 0;
        this.tension = 280; // High tension for snappy spring pop
        this.friction = 14;  // Dampens spring oscillation

        // Interaction State
        this.isHovered = false;
        this.isPressed = false;

        // CRT and Pulse Timers
        this.time = Math.random() * 100; // Offset idle pulse phase
        this.scanlineOffset = 0;

        // Secondary Click Animation Systems
        this.ripples = [];
        this.particles = [];
    }

    /**
     * Set coordinates on-the-fly during screen resizing
     */
    setPosition(x, y, width, height, scale = 1.0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // Adjusted configurations based on system resolution scale
        this.currentScaleFactor = scale;
    }

    /**
     * Interactive Bound Checks
     */
    isPointInRect(px, py) {
        return px > this.x - this.width / 2 &&
            px < this.x + this.width / 2 &&
            py > this.y - this.height / 2 &&
            py < this.y + this.height / 2;
    }

    /**
     * Mouse Events
     */
    handleMouseMove(mx, my) {
        this.isHovered = this.isPointInRect(mx, my);
    }

    handleMouseDown(mx, my) {
        if (this.isPointInRect(mx, my)) {
            this.isPressed = true;
            this.targetScale = 0.85; // Press down squish

            // Neon spark charge emission
            this.spawnSparks(mx, my, 4);
        }
    }

    handleMouseUp(mx, my, callback) {
        if (this.isPressed) {
            this.isPressed = false;

            if (this.isPointInRect(mx, my)) {
                // Snappy release pop juice
                this.targetScale = 1.25;
                this.velocity = 15;

                // Trigger major secondary click FX
                this.triggerClickFX(mx, my);

                if (callback) callback();
            } else {
                this.targetScale = 1.0;
            }
        }
    }

    /**
     * Spawns expanding vector ripple waves inside the button
     */
    triggerClickFX(clickX, clickY) {
        // Dynamic ripple from mouse interaction point
        this.ripples.push({
            x: clickX - this.x, // Localize coordinates
            y: clickY - this.y,
            radius: 5,
            maxRadius: this.width * 0.9,
            alpha: 1.0,
            speed: 350 // Pixels per second
        });

        // Explode bright retro neon pixels outwards
        this.spawnSparks(clickX, clickY, 15);
    }

    /**
     * Spawns pixel particles matching arcade design
     */
    spawnSparks(globalX, globalY, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 140;
            this.particles.push({
                x: globalX - this.x, // Store localized to follow button scale
                y: globalY - this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.4 ? this.themeColor : '#00f3ff', // Pink & Cyan arcade clash
                alpha: 1.0,
                life: 0.4 + Math.random() * 0.4
            });
        }
    }

    /**
     * Core update loop (dt is delta time in seconds)
     */
    update(dt) {
        this.time += dt;

        // 1. CRT Scanline scrolling speed
        this.scanlineOffset = (this.scanlineOffset + dt * 45) % 12;

        // 2. Idle Scale Wobble (only if mouse isn't interacting)
        if (!this.isHovered && !this.isPressed) {
            const idleWobble = 1.0 + Math.sin(this.time * 4) * 0.015;
            this.targetScale = idleWobble;
        } else if (this.isHovered && !this.isPressed) {
            this.targetScale = 1.1 + Math.sin(this.time * 8) * 0.02; // Overexcited hover pulse
        }

        // 3. Elastic Spring Integration (Produces the juicy popping physics)
        const deltaX = this.scale - this.targetScale;
        const springForce = -this.tension * deltaX;
        const dampingForce = -this.friction * this.velocity;
        const acceleration = springForce + dampingForce;

        this.velocity += acceleration * dt;
        this.scale += this.velocity * dt;

        // 4. Update Click Wave Ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += r.speed * dt;
            r.alpha = 1.0 - (r.radius / r.maxRadius);
            if (r.radius >= r.maxRadius || r.alpha <= 0) {
                this.ripples.splice(i, 1);
            }
        }

        // 5. Update Neon Sparks
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Apply slight friction and gravity
            p.vx *= 1 - (dt * 2);
            p.vy += 120 * dt;

            p.life -= dt;
            p.alpha = Math.max(0, p.life / 0.8);

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Rich Visual Canvas Renderer
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // --- LAYER 1: Neon Drop Shadow Glow ---
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = this.isHovered ? 24 : 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // --- LAYER 2: Main Button Panel Frame ---
        ctx.fillStyle = 'rgba(10, 10, 18, 0.9)'; // Dark retro CRT tint
        ctx.strokeStyle = this.themeColor;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        ctx.fill();
        ctx.stroke();

        // Clear shadow settings immediately for performance on nested elements
        ctx.shadowBlur = 0;

        // --- LAYER 3: CRT Scanline Raster Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        ctx.clip(); // Mask TV lines inside panel shape

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1.5;
        const lineSpacing = 6;
        const startY = -this.height / 2 - this.scanlineOffset;

        for (let y = startY; y < this.height / 2; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, y);
            ctx.lineTo(this.width / 2, y);
            ctx.stroke();
        }
        ctx.restore();

        // --- LAYER 4: Secondary Expanding Click Wave Ripples ---
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
        ctx.clip();

        this.ripples.forEach(r => {
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 243, 255, ${r.alpha})`; // Cyber cyan wave ripple
            ctx.lineWidth = 3;
            ctx.stroke();
        });
        ctx.restore();

        // --- LAYER 5: Interactive Text (With subtle chromatic offset on hover) ---
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 18px "Courier New", monospace'; // Clean retro coding typography

        if (this.isHovered) {
            // Cyan split shadow
            ctx.fillStyle = '#00f3ff';
            ctx.fillText(this.text, -1.5, 0.5);
            // Magenta split shadow
            ctx.fillStyle = '#ff0055';
            ctx.fillText(this.text, 1.5, -0.5);
        }

        // Main white core text
        ctx.fillStyle = this.textColor;
        ctx.fillText(this.text, 0, 0);

        // --- LAYER 6: Neon Click Pixel Sparks ---
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); // Square pixel-art sparks
            ctx.restore();
        });

        ctx.restore();
    }
}