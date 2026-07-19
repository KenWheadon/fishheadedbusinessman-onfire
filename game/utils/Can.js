class Can {
    constructor(config = {}) {
        this.width = config.width || 50;
        this.height = config.height || 90;
        this.x = config.x || 0;
        this.y = config.y || -this.height;
        this.scaleFactor = config.scaleFactor || 1.0;

        // Choose asset profiles based on unlocking flags
        const allowCan2 = config.can2Unlocked || false;
        const allowCan3 = config.can3Unlocked || false;
        const allowCan4 = config.can4Unlocked || false;
        const allowCan5 = config.can5Unlocked || false;

        let availableTypes = ['can1'];
        if (allowCan2) availableTypes.push('can2');
        if (allowCan3) availableTypes.push('can3');
        if (allowCan4) availableTypes.push('can4');
        if (allowCan5) availableTypes.push('can5');

        // Pick a random unlocked can type
        this.type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        this.isCrumpled = false;

        // Base Fall State Properties
        this.speed = (120 + Math.random() * 80) * this.scaleFactor;
        this.swaySpeed = 2 + Math.random() * 3;
        this.swayAmount = (15 + Math.random() * 20) * this.scaleFactor;
        this.swayOffset = Math.random() * Math.PI * 2;

        // Continuous organic tumbling/angle wobble as it falls
        this.angle = (Math.random() - 0.5) * 0.5;
        this.spinSpeed = (Math.random() - 0.5) * 1.5; // Continuous rads/sec drift

        this.baseX = this.x;

        // Click Physics trajectory
        this.vx = 0;
        this.vy = 0;
        this.gravity = 1200 * this.scaleFactor;
        this.angularVelocity = 0;
        this.alpha = 1.0;

        this.time = 0;
        this.isActive = true;

        // Juicy scale states
        this.isHovered = false;
        this.hoverScale = 1.0;
    }

    checkClick(mx, my) {
        if (this.isCrumpled || !this.isActive) return false;

        const halfW = (this.width * this.scaleFactor * this.hoverScale) / 2;
        const halfH = (this.height * this.scaleFactor * this.hoverScale) / 2;

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
        const clickOffsetRatio = (this.x - clickX) / ((this.width * this.scaleFactor) / 2);
        this.vx = (clickOffsetRatio * 350 + (Math.random() - 0.5) * 150) * this.scaleFactor;
        this.vy = -(500 + Math.random() * 300) * this.scaleFactor;
        this.angularVelocity = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 15);
    }

    update(dt) {
        this.time += dt;

        // Interpolate hover scale smoothly
        const targetHover = this.isHovered ? 1.2 : 1.0;
        this.hoverScale += (targetHover - this.hoverScale) * 15 * dt;

        if (!this.isCrumpled) {
            // Uncrumpled falling behavior
            this.y += this.speed * dt;
            this.x = this.baseX + Math.sin(this.time * this.swaySpeed + this.swayOffset) * this.swayAmount;

            // Continuous rotational tumbling down
            this.angle += this.spinSpeed * dt;
        } else {
            // Exploded/Crumpled physical response
            this.vy += this.gravity * dt;
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.angle += this.angularVelocity * dt;

            // Fade crumpled cans out gracefully
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
        ctx.scale(this.hoverScale, this.hoverScale); // Dynamic hover transform scale
        ctx.globalAlpha = this.alpha;

        const w = this.width * this.scaleFactor;
        const h = this.height * this.scaleFactor;

        // Dynamic asset lookup
        const imgKey = this.isCrumpled ? `${this.type}-crumple` : this.type;
        let img = null;
        try {
            img = typeof AssetManager !== 'undefined' ? AssetManager.get(imgKey) : null;
        } catch (e) { }

        if (img) {
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
            // ==========================================
            // HIGH QUALITY VECTOR FALLBACK ENGINE
            // ==========================================
            let baseColor = '#ff007f';
            let accentColor = '#ff00ff';

            if (this.type === 'can2') {
                baseColor = '#00f0ff';
                accentColor = '#00ffff';
            } else if (this.type === 'can3') {
                baseColor = '#bd00ff';
                accentColor = '#d600ff';
            } else if (this.type === 'can4') {
                baseColor = '#ffaa00';
                accentColor = '#ffcc00';
            } else if (this.type === 'can5') {
                baseColor = '#39ff14';
                accentColor = '#00ff66';
            }

            // Active Hover Neon Glow Plate
            if (this.isHovered && !this.isCrumpled) {
                ctx.save();
                ctx.shadowColor = baseColor;
                ctx.shadowBlur = 15;
                ctx.fillStyle = baseColor;
                ctx.globalAlpha = 0.25;
                ctx.beginPath();
                ctx.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8);
                ctx.fill();
                ctx.restore();
            }

            if (!this.isCrumpled) {
                // 1. Clean Retro Can Vector Shape  
                ctx.fillStyle = '#1e293b';
                ctx.strokeStyle = baseColor;
                ctx.lineWidth = 3;

                ctx.beginPath();
                ctx.roundRect(-w / 2, -h / 2, w, h, 6);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = accentColor;
                ctx.fillRect(-w / 2 + 3, -h / 4, w - 6, h / 2);

                ctx.fillStyle = '#64748b';
                ctx.fillRect(-w * 0.35, -h / 2 - 2, w * 0.7, 4);
                ctx.fillRect(-w * 0.35, h / 2 - 2, w * 0.7, 4);
            } else {
                // 2. Distressed Crumpled Can Jagged Shape
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 2.5;

                ctx.beginPath();
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