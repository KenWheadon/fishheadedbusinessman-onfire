class Can {
    constructor(config = {}) {
        this.width = config.width || 50;
        this.height = config.height || 90;
        this.x = config.x || 0;
        this.y = config.y || -this.height;
        this.scaleFactor = config.scaleFactor || 1.0;

        // Choose random asset profile
        this.type = Math.random() < 0.5 ? 'can1' : 'can2';
        this.isCrumpled = false;

        // Base Fall State Properties
        this.speed = (120 + Math.random() * 80) * this.scaleFactor; // Fall velocity (px/sec)
        this.swaySpeed = 2 + Math.random() * 3;
        this.swayAmount = (15 + Math.random() * 20) * this.scaleFactor;
        this.swayOffset = Math.random() * Math.PI * 2;
        this.angle = (Math.random() - 0.5) * 0.3; // Slight default rotation
        this.baseX = this.x;

        // Click Physics trajectory
        this.vx = 0;
        this.vy = 0;
        this.gravity = 1200 * this.scaleFactor; // Pixel gravity pulling flying cans down
        this.angularVelocity = 0;
        this.alpha = 1.0;

        this.time = 0;
        this.isActive = true;
    }

    // Handles clicking, returns true if clicked
    checkClick(mx, my) {
        if (this.isCrumpled || !this.isActive) return false;

        // Simple aligned boundary check
        const halfW = (this.width * this.scaleFactor) / 2;
        const halfH = (this.height * this.scaleFactor) / 2;

        if (mx > this.x - halfW && mx < this.x + halfW &&
            my > this.y - halfH && my < this.y + halfH) {
            
            this.crumple(mx);
            return true;
        }
        return false;
    }

    crumple(clickX) {
        this.isCrumpled = true;

        // Physics reaction: Launch the can dynamically upwards and away
        // Push velocity depends slightly on click orientation relative to its center
        const clickOffsetRatio = (this.x - clickX) / ((this.width * this.scaleFactor) / 2);
        
        this.vx = (clickOffsetRatio * 350 + (Math.random() - 0.5) * 150) * this.scaleFactor;
        this.vy = -(500 + Math.random() * 300) * this.scaleFactor; // Strong kick upwards
        this.angularVelocity = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 15);
    }

    update(dt) {
        this.time += dt;

        if (!this.isCrumpled) {
            // Uncrumpled falling behavior
            this.y += this.speed * dt;
            // Add a gentle horizontal wind sway
            this.x = this.baseX + Math.sin(this.time * this.swaySpeed + this.swayOffset) * this.swayAmount;
        } else {
            // Exploded/Crumpled physical response
            this.vy += this.gravity * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.angle += this.angularVelocity * dt;

            // Fade crumpled cans out gracefully as they fall/fly away
            this.alpha -= dt * 1.5;
            if (this.alpha <= 0) {
                this.isActive = false;
            }
        }
    }

    draw(ctx) {
        if (!this.isActive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.globalAlpha = this.alpha;

        const w = this.width * this.scaleFactor;
        const h = this.height * this.scaleFactor;

        // Dynamic asset lookup
        const imgKey = this.isCrumpled ? `${this.type}-crumple` : this.type;
        let img = null;
        try {
            img = typeof AssetManager !== 'undefined' ? AssetManager.get(imgKey) : null;
        } catch (e) {}

        if (img) {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
            // ==========================================
            // HIGH QUALITY VECTOR FALLBACK ENGINE
            // ==========================================
            const isPink = this.type === 'can1';
            const baseColor = isPink ? '#ff007f' : '#00f0ff';
            const accentColor = isPink ? '#ff00ff' : '#00ffff';

            if (!this.isCrumpled) {
                // 1. Clean Retro Can Vector Shape
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 3;

                // Metallic Can Body
                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 6);
                ctx.fill();
                ctx.stroke();

                // Decorative Center Graphic band
                ctx.fillStyle = accentColor;
                ctx.fillRect(-w / 2 + 3, -h / 4, w - 6, h / 2);

                // Aluminum Tab top/bottom caps
                ctx.fillStyle = '#64748b';
                ctx.fillRect(-w * 0.35, -h / 2 - 2, w * 0.7, 4);
                ctx.fillRect(-w * 0.35, h / 2 - 2, w * 0.7, 4);
            } else {
                // 2. Distressed Crumpled Can Jagged Shape
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 2.5;

                ctx.beginPath();
                // Generate crumpled outline path
                ctx.moveTo(-w * 0.35, -h * 0.4);
                ctx.lineTo(w * 0.25, -h * 0.45);
                ctx.lineTo(w * 0.4, -h * 0.1);
                ctx.lineTo(w * 0.15, h * 0.1);
                ctx.lineTo(w * 0.35, h * 0.45);
                ctx.lineTo(-w * 0.3, h * 0.35);
                ctx.lineTo(-w * 0.45, h * 0.05);
                ctx.lineTo(-w * 0.2, -h * 0.15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Internal stress lines for crushed mechanical detail
                ctx.strokeStyle = '#ff007f';
                ctx.beginPath();
                ctx.moveTo(-w * 0.2, -h * 0.1);
                ctx.lineTo(w * 0.2, h * 0.05);
                ctx.moveTo(-w * 0.1, h * 0.15);
                ctx.lineTo(w * 0.1, h * 0.25);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}