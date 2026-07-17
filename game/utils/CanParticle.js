class CanParticle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.size = 0;
        this.color = '';
        this.alpha = 1.0;
        this.life = 0;
        this.active = false;
    }

    /**
     * Resets state variables for clean object pool recycling
     */
    reset(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;

        // Dynamic circular burst vector
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 180;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 60; // Slanted upward bias

        this.size = 3 + Math.random() * 5;
        this.alpha = 1.0;
        this.life = 0.5 + Math.random() * 0.5; // Lifespan in seconds
        this.active = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 450 * dt; // Soft downward gravity pull

        this.life -= dt;
        this.alpha = Math.max(0, this.life / 0.8);
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.restore();
    }
}