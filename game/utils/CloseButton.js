/**
 * Standalone, modular Neo-Brutalist [ X ] Close Button.
 * Integrates satisfying rotational smooth-slides on hover
 * and immediate 0.6 scale squish impacts on touch.
 */
class CloseButton {
    constructor(config = {}) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.size = config.size || 24;

        // Colors matching the neon brutalist case layout
        this.themeColor = config.themeColor || '#ff007f';
        this.shadowColor = config.shadowColor || '#ff007f';
        this.hoverColor = config.hoverColor || '#ff0055';
        this.lineColor = config.lineColor || '#ffffff';

        // Dual Engine: Linear Decay & Spring Scale Physics[cite: 6, 8]
        this.scale = 1.0;
        this.targetScale = 1.0;
        this.scaleVel = 0;
        this.tension = 320;
        this.friction = 14;

        // Original Rotational Animation States[cite: 8]
        this.rot = 0;
        this.targetRot = 0;

        this.isHovered = false;
        this.isPressed = false;
        this.time = Math.random() * 50;
    }

    /**
     * Re-assign layout coordinates dynamically on scale shifts[cite: 6]
     */
    setPosition(x, y, size, scale = 1.0) {
        this.x = x;
        this.y = y;
        this.size = size || this.size;
        this.currentScaleFactor = scale;
    }

    /**
     * Matrix Intersection Collision Bounds check
     */
    isPointInRect(px, py) {
        const half = this.size / 2;
        return px > this.x - half &&
            px < this.x + half &&
            py > this.y - half &&
            py < this.y + half;
    }

    /**
     * Handles hover states and target rotation targets[cite: 6, 8]
     */
    handleMouseMove(mx, my) {
        this.isHovered = this.isPointInRect(mx, my);
        // Smoothly rotate 90 degrees when hovered[cite: 8]
        this.targetRot = this.isHovered ? Math.PI / 2 : 0;
    }

    /**
     * Handles instant click compression mechanics[cite: 6, 8]
     */
    handleMouseDown(mx, my) {
        if (this.isPointInRect(mx, my)) {
            this.isPressed = true;
            // Instantly snap scale down to 0.6 on down press[cite: 8]
            this.scale = 0.6;
            this.targetScale = 0.6;
            this.scaleVel = 0;
        }
    }

    /**
     * Handles snap release popping triggers[cite: 6]
     */
    handleMouseUp(mx, my, callback) {
        if (this.isPressed) {
            this.isPressed = false;

            if (this.isPointInRect(mx, my)) {
                // Satisfying pop-release overshoot spring[cite: 6]
                this.targetScale = 1.30;
                this.scaleVel = 18;

                if (callback) callback();
            } else {
                this.targetScale = 1.0;
            }
        }
    }

    /**
     * Smoothly updates rotational decay states and spring metrics[cite: 6, 8]
     */
    update(dt) {
        this.time += dt;

        // Smooth Exponential Decay rotation mapping[cite: 8]
        const rotFactor = 1 - Math.exp(-12 * dt);
        this.rot += (this.targetRot - this.rot) * Math.min(1, Math.max(0, rotFactor));

        // Scale updates (spring handles normal postures)[cite: 6]
        if (!this.isPressed) {
            if (!this.isHovered) {
                this.targetScale = 1.0;
            } else {
                this.targetScale = 1.12 + Math.sin(this.time * 15) * 0.02; // Cyber idle hover wiggle[cite: 6]
            }

            const deltaX = this.scale - this.targetScale;
            const springForce = -this.tension * deltaX;
            const dampingForce = -this.friction * this.scaleVel;
            const acceleration = springForce + dampingForce;

            this.scaleVel += acceleration * dt;
            this.scale += this.scaleVel * dt;
        }
    }

    /**
     * Renders button onto canvas[cite: 4, 8]
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot); // Apply smooth rotational translation[cite: 8]
        ctx.scale(this.scale, this.scale); // Apply smooth scale transition[cite: 8]

        const s = this.size;
        const offset = this.isHovered ? 1.5 : 4; // Flat-press offset on active hover

        // 1. FLAT BRUTALIST OFFSET SHADOW
        ctx.fillStyle = this.shadowColor;
        ctx.fillRect(-s / 2 + 4, -s / 2 + 4, s, s);

        // 2. FRONT CASE PLATE
        ctx.fillStyle = this.isHovered ? this.hoverColor : '#121214';
        ctx.strokeStyle = this.isHovered ? '#ffffff' : this.themeColor;
        ctx.lineWidth = 2.5;

        ctx.fillRect(-s / 2 + offset, -s / 2 + offset, s, s);
        ctx.strokeRect(-s / 2 + offset, -s / 2 + offset, s, s);

        // 3. RETRO CROSHAIRS [ X ]
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        const pad = s * 0.22;
        ctx.beginPath();
        ctx.moveTo(-s / 2 + pad + offset, -s / 2 + pad + offset);
        ctx.lineTo(s / 2 - pad + offset, s / 2 - pad + offset);
        ctx.moveTo(s / 2 - pad + offset, -s / 2 + pad + offset);
        ctx.lineTo(-s / 2 + pad + offset, s / 2 - pad + offset);
        ctx.stroke();

        ctx.restore();
    }
}