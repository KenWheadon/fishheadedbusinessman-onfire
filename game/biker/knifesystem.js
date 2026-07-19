class KnifeSystem {
    constructor(manager) {
        this.mgr = manager;
        this.knives = [];
    }

    reset() {
        this.knives = [];
        // Calculate total knives: starts at 1, every 5th successful round unlocks +1 knife
        const count = 1 + Math.floor((this.mgr.currentRound - 1) / 5);

        for (let i = 0; i < count; i++) {
            this.knives.push({
                x: this.mgr.width / 2 + (i - (count - 1) / 2) * 70,
                y: this.mgr.height * 0.22 - (i * 35), // Stagger heights slightly to disrupt initial clustering
                vx: 90 + (i * 30) * (i % 2 === 0 ? 1 : -1),
                vy: -180,
                gravity: 340,
                radius: 25,
                rotation: Math.random() * Math.PI,
                vRotation: 2.5 + Math.random() * 2
            });
        }
    }

    update(dt) {
        for (let knife of this.knives) {
            knife.vy += knife.gravity * dt;
            knife.x += knife.vx * dt;
            knife.y += knife.vy * dt;
            knife.rotation += knife.vRotation * dt;

            // Sidewall Bouncing logic
            if (knife.x < knife.radius) {
                knife.x = knife.radius;
                knife.vx *= -1;
                knife.vRotation *= -1;
            }
            if (knife.x > this.mgr.width - knife.radius) {
                knife.x = this.mgr.width - knife.radius;
                knife.vx *= -1;
                knife.vRotation *= -1;
            }

            // Knife drop handling strategy
            if (knife.y > this.mgr.height) {
                // Remove money from the pile equal to current round number
                this.mgr.roundPrizeMoney -= this.mgr.currentRound;
                this.mgr.spawnParticle(`-$${this.mgr.currentRound}`, knife.x, this.mgr.height - 50, '#ef4444');
                this.mgr.spawnJuiceExplosion(knife.x, this.mgr.height - 20, '#ef4444', 12);

                if (this.mgr.roundPrizeMoney <= 0) {
                    this.mgr.triggerRoundFail("Cash run dry!");
                    return;
                } else {
                    // Safe Recovery: Launch the fallen blade back up into active circulation
                    knife.y = this.mgr.height * 0.4;
                    knife.vy = -390;
                    knife.vx = (Math.random() - 0.5) * 240;
                }
            }
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;

        for (let knife of this.knives) {
            // Render Top Tracking Pointer if item is hidden off screen
            if (knife.y < 0) {
                ctx.save();
                ctx.fillStyle = '#ef4444';
                ctx.font = `900 ${Math.round(13 * scale)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText('▼ BLADE ▼', knife.x, 28 * scale);
                ctx.beginPath();
                ctx.arc(knife.x, 42 * scale, 5 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Main Knife Renderer
            ctx.save();
            ctx.translate(knife.x, knife.y);
            ctx.rotate(knife.rotation);

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
    }

    handleClick(mx, my) {
        const scale = this.mgr.baseScale;
        for (let knife of this.knives) {
            const dist = Math.hypot(mx - knife.x, my - knife.y);
            if (dist < 65 * scale && knife.y > 0) {
                knife.vy = -430;
                knife.vx = (Math.random() - 0.5) * 220;
                knife.vRotation = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5);

                // Deduct basic click interaction tax
                this.mgr.roundPrizeMoney = Math.max(0, this.mgr.roundPrizeMoney - 1);
                this.mgr.spawnParticle('-$1', knife.x, knife.y - 20, '#ef4444');
                return true;
            }
        }
        return false;
    }
}