class DebtComponent {
    constructor(config = {}) {
        this.width = config.width || 840;
        this.height = config.height || 360;

        // Core State variables
        this.initialDebt = 1000000;
        this.debt = this.initialDebt;
        this.visualDebt = this.initialDebt; 
        this.state = 'active'; // 'active', 'won', 'lost'
        
        // Particle & Animation tracking
        this.particles = [];
        this.confettiTimer = 0;

        // "Juice" Upgrades: Spring Animation & Floating Combat Text
        this.textScale = 1.0;
        this.textScaleTarget = 1.0;
        this.textScaleVelocity = 0.0;
        this.springK = 220;      // Spring Stiffness
        this.springDamping = 10; // Dampening factor
        this.floatingTexts = []; // Array of floating payment indicators

        // Mouse Hover Tracking (Local space)
        this.isHoveringButton = false;
    }

    pay(amount = 25000) {
        if (this.state !== 'active') return;

        this.debt -= amount;
        
        // Trigger visual "impact" bounce by compressing the scale
        this.textScale = 0.75;
        this.textScaleVelocity = 0;

        // Spawn floating indicator near the payment region
        this.floatingTexts.push({
            text: `-$${amount.toLocaleString()}`,
            x: this.width / 2 + (Math.random() * 80 - 40),
            y: this.height / 2 + 15,
            vy: -110, // speed going upwards (pixels/sec)
            opacity: 1.0,
            color: '#22c55e'
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
        this.debt = this.initialDebt;
        this.visualDebt = this.initialDebt; 
        this.state = 'active';
        this.particles = [];
        this.floatingTexts = [];
        this.confettiTimer = 0;
        this.textScale = 1.0;
        this.textScaleVelocity = 0.0;
    }

    triggerWin() {
        this.state = 'won';
        this.confettiTimer = 180; // Total duration ticks for generating confetti
    }

    // Spawn falling blood/red drops from the top
    spawnRedParticle() {
        this.particles.push({
            x: Math.random() * this.width,
            y: -10,
            speed: 2 + Math.random() * 4, // Multiplied by ticks in update()
            length: 10 + Math.random() * 20,
            width: 1.5 + Math.random() * 2,
            opacity: 0.3 + Math.random() * 0.7
        });
    }

    // Spawn confetti exploding from bottom corners
    spawnConfetti() {
        const colors = ['#FFC107', '#FF5722', '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50'];
        this.particles.push(this.createConfettiPiece(0, this.height, 45, colors));
        this.particles.push(this.createConfettiPiece(this.width, this.height, 135, colors));
    }

    createConfettiPiece(x, y, baseAngle, colors) {
        const angle = (baseAngle + (Math.random() * 40 - 20)) * Math.PI / 180;
        const speed = 8 + Math.random() * 12;
        return {
            type: 'confetti',
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: -Math.sin(angle) * speed,
            size: 6 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: Math.random() * 0.2 - 0.1,
            gravity: 0.3,
            opacity: 1
        };
    }

    // Standard local input handlers
    handleMouseMove(localX, localY) {
        const centerX = this.width / 2;
        const centerY = this.height / 2 + 15;
        const hoverRadius = 130;
        
        const dx = localX - centerX;
        const dy = localY - centerY;
        this.isHoveringButton = (dx * dx + dy * dy) < hoverRadius * hoverRadius;
    }

    handleMouseClick(localX, localY) {
        if (this.state !== 'active') return;

        const centerX = this.width / 2;
        const centerY = this.height / 2 + 15;
        const hoverRadius = 130;
        
        const dx = localX - centerX;
        const dy = localY - centerY;
        
        if (dx * dx + dy * dy < hoverRadius * hoverRadius) {
            this.pay();
        }
    }

    update(dt) {
        const safeDt = Math.min(dt, 0.1);
        const ticks = safeDt * 60;

        if (this.visualDebt > this.debt) {
            const difference = this.visualDebt - this.debt;
            const step = difference * (1 - Math.pow(1 - 0.12, ticks));
            if (difference < 1) {
                this.visualDebt = this.debt;
            } else {
                this.visualDebt -= Math.max(1, Math.ceil(step));
            }
        }

        const scaleDiff = this.textScaleTarget - this.textScale;
        const springForce = scaleDiff * this.springK;
        this.textScaleVelocity += springForce * safeDt;
        this.textScaleVelocity *= Math.exp(-this.springDamping * safeDt);
        this.textScale += this.textScaleVelocity * safeDt;

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy * safeDt;
            ft.opacity -= 1.3 * safeDt;
            if (ft.opacity <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        if (this.state === 'lost') {
            const spawnRate = 1 - Math.pow(1 - 0.4, ticks);
            if (this.particles.length < 100 && Math.random() < spawnRate) {
                this.spawnRedParticle();
            }
            
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.y += p.speed * ticks;
                if (p.y > this.height) {
                    this.particles.splice(i, 1);
                }
            }
        }

        if (this.state === 'won') {
            if (this.confettiTimer > 0) {
                this.confettiTimer -= ticks;
                let spawnCount = Math.floor(ticks);
                if (Math.random() < (ticks % 1)) spawnCount++;
                for (let i = 0; i < spawnCount; i++) {
                    this.spawnConfetti();
                }
            }
            
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx * ticks;
                p.y += p.vy * ticks;
                p.vy += p.gravity * ticks;
                p.rotation += p.rotationSpeed * ticks;
                
                if (this.confettiTimer <= 0) {
                    p.opacity -= 0.015 * ticks; 
                }

                if (p.y > this.height || p.opacity <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    draw(ctx, x, y) {
        const w = this.width;
        const h = this.height;

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        ctx.clip();

        ctx.fillStyle = '#11141a';
        ctx.fillRect(0, 0, w, h);

        if (this.state === 'lost') {
            this.drawLightSkull(ctx, w / 2, h / 2 - 15);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#64748b';
        ctx.font = '16px "Courier New", Courier, monospace';
        ctx.fillText("CURRENT OUTSTANDING DEBT", w / 2, h / 2 - 35);

        ctx.save();
        ctx.translate(w / 2, h / 2 + 15);
        ctx.scale(this.textScale, this.textScale);

        ctx.fillStyle = this.visualDebt > 0 ? '#ef4444' : '#22c55e';
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.fillText(`$${Math.round(this.visualDebt).toLocaleString()}`, 0, 0);
        ctx.restore();

        this.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.opacity);
            ctx.font = 'bold 22px Arial, sans-serif';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        });

        if (this.state === 'lost') {
            this.particles.forEach(p => {
                ctx.strokeStyle = `rgba(185, 28, 28, ${p.opacity})`;
                ctx.lineWidth = p.width;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + p.length);
                ctx.stroke();
            });

            ctx.save();
            ctx.translate(w / 2, h / 2 + 15);
            ctx.rotate(-0.08);
            ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
            ctx.font = 'bold 64px "Impact", sans-serif';
            ctx.strokeStyle = '#11141a';
            ctx.lineWidth = 8;
            ctx.strokeText("COLLECTED", 0, 0);
            ctx.fillText("COLLECTED", 0, 0);
            ctx.restore();
        }

        if (this.state === 'won') {
            ctx.fillStyle = 'rgba(17, 20, 26, 0.85)';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#eab308';
            ctx.font = 'bold 72px "Impact", Arial, sans-serif';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 20;
            ctx.fillText("WINNER", w / 2, h / 2);
            ctx.shadowBlur = 0; 

            this.particles.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });
        }

        ctx.restore();
    }

    drawLightSkull(ctx, x, y) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 4;

        const r = 50; 

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI, true);
        ctx.lineTo(x - 30, y + 60);
        ctx.lineTo(x + 30, y + 60);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#11141a';
        ctx.beginPath();
        ctx.arc(x - 18, y + 10, 12, 0, Math.PI * 2);
        ctx.arc(x + 18, y + 10, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y + 25);
        ctx.lineTo(x - 6, y + 38);
        ctx.lineTo(x + 6, y + 38);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#11141a';
        ctx.lineWidth = 3;
        for (let i = -15; i <= 15; i += 7.5) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + 48);
            ctx.lineTo(x + i, y + 60);
            ctx.stroke();
        }
        ctx.restore();
    }
}