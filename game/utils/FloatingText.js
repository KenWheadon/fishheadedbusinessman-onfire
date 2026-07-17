class FloatingText {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.text = '';
        this.color = '';
        this.vy = 0;
        this.alpha = 1.0;
        this.life = 0;
        this.scale = 1.0;
        this.active = false;
    }

    /**
     * Re-initializes properties for active rendering
     */
    reset(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = -90; // Upward float velocity
        this.alpha = 1.0;
        this.life = 0.8;
        this.scale = 1.0;
        this.active = true;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
        this.alpha = Math.max(0, this.life / 0.8);
        this.scale = 1.0 + (1.0 - this.life) * 0.5; // Expands outward as it fades
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();
    }
}