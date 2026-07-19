class KnifeSystem {
    constructor(manager) {
        this.mgr = manager;
        this.reset();
    }

    reset() {
        this.x = this.mgr.width / 2;
        this.y = this.mgr.height * 0.25;
        this.vx = 90;
        this.vy = -180;
        this.gravity = 340;
        this.radius = 25;
        this.rotation = 0;
        this.vRotation = 2.5;
    }

    update(dt) {
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.rotation += this.vRotation * dt;

        // Sidewall Bouncing logic
        if (this.x < this.radius) {
            this.x = this.radius;
            this.vx *= -1;
            this.vRotation *= -1;
        }
        if (this.x > this.mgr.width - this.radius) {
            this.x = this.mgr.width - this.radius;
            this.vx *= -1;
            this.vRotation *= -1;
        }

        // Loss condition flag checking
        if (this.y > this.mgr.height) {
            this.mgr.triggerRoundFail("Dropped the knife!");
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;

        // Render Top Tracking Pointer if item is hidden off screen
        if (this.y < 0) {
            ctx.save();
            ctx.fillStyle = '#ef4444';
            ctx.font = `900 ${Math.round(14 * scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('▼ KNIFE POSITION ▼', this.x, 28 * scale);
            ctx.beginPath();
            ctx.arc(this.x, 42 * scale, 6 * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Main Knife Renderer
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Blade Construction
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-5 * scale, -30 * scale, 10 * scale, 35 * scale);
        ctx.beginPath();
        ctx.moveTo(-5 * scale, -30 * scale);
        ctx.lineTo(0, -45 * scale);
        ctx.lineTo(5 * scale, -30 * scale);
        ctx.fill();

        // Crossguard & Handle
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-12 * scale, 5 * scale, 24 * scale, 5 * scale);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7 * scale, 10 * scale, 14 * scale, 22 * scale);

        ctx.restore();
    }

    handleClick(mx, my) {
        const dist = Math.hypot(mx - this.x, my - this.y);
        // Generous tracking hitbox checking (ensures responsive interactions)
        if (dist < 65 * this.mgr.baseScale && this.y > 0) {
            this.vy = -430;
            this.vx = (Math.random() - 0.5) * 220; // Generate safe chaotic horizontal wander
            this.vRotation = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5);

            // Deduct click tax configuration
            this.mgr.roundPrizeMoney = Math.max(0, this.mgr.roundPrizeMoney - 1);
            this.mgr.spawnParticle('-$1', this.x, this.y - 20, '#ef4444');
            return true;
        }
        return false;
    }
}