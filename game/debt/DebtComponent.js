class DebtComponent {
    constructor(config = {}) {
        this.width = config.width || 840;
        this.height = config.height || 360;
        this.initialDebt = 1000000;
        this.debt = this.initialDebt;
        this.visualDebt = this.initialDebt;
        this.state = 'active';
        this.particles = [];
        this.confettiTimer = 0;
        this.textScale = 1.0;
        this.textScaleTarget = 1.0;
        this.textScaleVelocity = 0.0;
        this.springK = 220;
        this.springDamping = 10;
        this.floatingTexts = [];
        this.isHoveringButton = false;
    }

    /**
     * Updates block alignment limits dynamically.
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    pay(amount = 25000) {
        if (this.state !== 'active') return;
        this.debt -= amount;
        this.textScale = 0.75;
        this.textScaleVelocity = 0;

        this.floatingTexts.push({
            text: `-$${amount.toLocaleString()}`,
            x: this.width / 2 + (Math.random() * 80 - 40),
            y: this.height / 2 + 15,
            vy: -110,
            opacity: 1.0,
            color: '#ffffff' // Changed to white
        });

        if (this.debt <= 0) {
            this.debt = 0;
            this.triggerWin();
        }
    }

    lost() {
        if (this.state === 'won') return;
        this.state = 'lost';
        this.particles = [];
    }

    reset() {
        this.debt = this.initialDebt; this.visualDebt = this.initialDebt;
        this.state = 'active'; this.particles = []; this.floatingTexts = [];
        this.confettiTimer = 0; this.textScale = 1.0; this.textScaleVelocity = 0.0;
    }

    triggerWin() {
        this.state = 'won';
        this.confettiTimer = 180;
    }

    spawnRedParticle() {
        this.particles.push({
            x: Math.random() * this.width, y: -10, speed: 2 + Math.random() * 4,
            length: 10 + Math.random() * 20, width: 1.5 + Math.random() * 2, opacity: 0.3 + Math.random() * 0.7
        });
    }

    spawnConfetti() {
        const colors = ['#FFC107', '#FF5722', '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50'];
        this.particles.push(this.createConfettiPiece(0, this.height, 45, colors));
        this.particles.push(this.createConfettiPiece(this.width, this.height, 135, colors));
    }

    createConfettiPiece(x, y, baseAngle, colors) {
        const angle = (baseAngle + (Math.random() * 40 - 20)) * Math.PI / 180;
        return {
            type: 'confetti', x: x, y: y, vx: Math.cos(angle) * (8 + Math.random() * 12), vy: -Math.sin(angle) * (8 + Math.random() * 12),
            size: 6 + Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2, rotationSpeed: Math.random() * 0.2 - 0.1, gravity: 0.3, opacity: 1
        };
    }

    handleMouseMove(localX, localY) {
        const dx = localX - this.width / 2, dy = localY - (this.height / 2 + 15);
        this.isHoveringButton = (dx * dx + dy * dy) < 16900;
    }

    handleMouseClick(localX, localY) {
        if (this.state !== 'active') return;
        const dx = localX - this.width / 2, dy = localY - (this.height / 2 + 15);
        if (dx * dx + dy * dy < 16900) this.pay();
    }

    update(dt) {
        const safeDt = Math.min(dt, 0.1), ticks = safeDt * 60;
        if (this.visualDebt > this.debt) {
            const step = (this.visualDebt - this.debt) * (1 - Math.pow(1 - 0.12, ticks));
            if (this.visualDebt - this.debt < 1) this.visualDebt = this.debt;
            else this.visualDebt -= Math.max(1, Math.ceil(step));
        }

        this.textScaleVelocity += (this.textScaleTarget - this.textScale) * this.springK * safeDt;
        this.textScaleVelocity *= Math.exp(-this.springDamping * safeDt);
        this.textScale += this.textScaleVelocity * safeDt;

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i]; ft.y += ft.vy * safeDt; ft.opacity -= 1.3 * safeDt;
            if (ft.opacity <= 0) this.floatingTexts.splice(i, 1);
        }

        if (this.state === 'lost') {
            if (this.particles.length < 100 && Math.random() < (1 - Math.pow(1 - 0.4, ticks))) this.spawnRedParticle();
            for (let i = this.particles.length - 1; i >= 0; i--) {
                this.particles[i].y += this.particles[i].speed * ticks;
                if (this.particles[i].y > this.height) this.particles.splice(i, 1);
            }
        }

        if (this.state === 'won') {
            if (this.confettiTimer > 0) {
                this.confettiTimer -= ticks;
                let spawns = Math.floor(ticks);
                if (Math.random() < (ticks % 1)) spawns++;
                for (let i = 0; i < spawns; i++) this.spawnConfetti();
            }
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i]; p.x += p.vx * ticks; p.y += p.vy * ticks; p.vy += p.gravity * ticks; p.rotation += p.rotationSpeed * ticks;
                if (this.confettiTimer <= 0) p.opacity -= 0.015 * ticks;
                if (p.y > this.height || p.opacity <= 0) this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx, x, y) {
        ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, this.width, this.height); ctx.clip();

        if (this.state === 'lost') this.drawLightSkull(ctx, this.width / 2, this.height / 2 - 15);

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; ctx.font = '16px "Courier New", Courier, monospace'; // Changed to white

        // Added: Slight dark border for the layout header text
        ctx.strokeStyle = '#11141a'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeText("CURRENT OUTSTANDING DEBT", this.width / 2, this.height / 2 - 35);
        ctx.fillText("CURRENT OUTSTANDING DEBT", this.width / 2, this.height / 2 - 35);

        ctx.save(); ctx.translate(this.width / 2, this.height / 2 + 15); ctx.scale(this.textScale, this.textScale);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 48px Arial, sans-serif'; // Changed to white

        // Added: Slight dark border for the primary debt value text
        ctx.strokeStyle = '#11141a'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
        ctx.strokeText(`$${Math.round(this.visualDebt).toLocaleString()}`, 0, 0);
        ctx.fillText(`$${Math.round(this.visualDebt).toLocaleString()}`, 0, 0); ctx.restore();

        this.floatingTexts.forEach(ft => {
            ctx.save(); ctx.fillStyle = ft.color; ctx.globalAlpha = Math.max(0, ft.opacity);
            ctx.font = 'bold 22px Arial, sans-serif';

            // Added: Slight dark border for floating cash text
            ctx.strokeStyle = '#11141a'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
        });

        if (this.state === 'lost') {
            this.particles.forEach(p => {
                ctx.strokeStyle = `rgba(185, 28, 28, ${p.opacity})`; ctx.lineWidth = p.width;
                ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + p.length); ctx.stroke();
            });
            ctx.save(); ctx.translate(this.width / 2, this.height / 2 + 15); ctx.rotate(-0.08);
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px "Impact", sans-serif'; // Changed to white
            ctx.strokeStyle = '#11141a'; ctx.lineWidth = 8; ctx.strokeText("COLLECTED", 0, 0); ctx.fillText("COLLECTED", 0, 0); ctx.restore();
        }

        if (this.state === 'won') {
            // Changed: Removed opaque background layer fill to preserve total transparency during win sequence
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 72px "Impact", Arial, sans-serif'; // Changed to white
            ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 20;

            // Added: Slight dark border for "WINNER" text layout
            ctx.strokeStyle = '#11141a'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
            ctx.strokeText("WINNER", this.width / 2, this.height / 2);
            ctx.fillText("WINNER", this.width / 2, this.height / 2); ctx.shadowBlur = 0;

            this.particles.forEach(p => {
                ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation); ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
            });
        }
        ctx.restore();
    }

    drawLightSkull(ctx, x, y) {
        ctx.save(); ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI, true); ctx.lineTo(x - 30, y + 60); ctx.lineTo(x + 30, y + 60); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#11141a'; ctx.beginPath(); ctx.arc(x - 18, y + 10, 12, 0, Math.PI * 2); ctx.arc(x + 18, y + 10, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, y + 25); ctx.lineTo(x - 6, y + 38); ctx.lineTo(x + 6, y + 38); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#11141a'; ctx.lineWidth = 3;
        for (let i = -15; i <= 15; i += 7.5) { ctx.beginPath(); ctx.moveTo(x + i, y + 48); ctx.lineTo(x + i, y + 60); ctx.stroke(); }
        ctx.restore();
    }
}