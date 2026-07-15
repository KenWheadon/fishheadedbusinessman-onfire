class DebtComponent {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id "${canvasId}" not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        
        // Base internal resolution maintaining 16:9 aspect ratio
        this.canvas.width = 800;
        this.canvas.height = 450;

        // Core State variables
        this.initialDebt = 300000;
        this.debt = this.initialDebt;
        this.visualDebt = this.initialDebt; // Track the animated display value separately
        this.state = 'active'; // 'active', 'won', 'lost'
        
        // Particle & Animation tracking
        this.particles = [];
        this.confettiTimer = 0;
        this.lastTime = 0;

        // Start the animation loop
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    pay() {
        if (this.state !== 'active') return;

        this.debt -= 25000;
        if (this.debt <= 0) {
            this.debt = 0;
            this.triggerWin();
        }
    }

    lost() {
        if (this.state === 'won') return;
        this.state = 'lost';
        this.particles = []; // Clear any existing particles
    }

    reset() {
        this.debt = this.initialDebt;
        this.visualDebt = this.initialDebt; // Snaps instantly back on reset
        this.state = 'active';
        this.particles = [];
        this.confettiTimer = 0;
    }

    triggerWin() {
        this.state = 'won';
        this.confettiTimer = 180; // Roughly 3 seconds at 60fps to spray new particles
    }

    // Spawn falling blood/red drops from the top
    spawnRedParticle() {
        this.particles.push({
            x: Math.random() * this.canvas.width,
            y: -10,
            speed: 2 + Math.random() * 4,
            length: 10 + Math.random() * 20,
            width: 1.5 + Math.random() * 2,
            opacity: 0.3 + Math.random() * 0.7
        });
    }

    // Spawn confetti exploding from the bottom corners
    spawnConfetti() {
        const colors = ['#FFC107', '#FF5722', '#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50'];
        // Left side blast
        this.particles.push(this.createConfettiPiece(0, this.canvas.height, 45, colors));
        // Right side blast
        this.particles.push(this.createConfettiPiece(this.canvas.width, this.canvas.height, 135, colors));
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

    update() {
        // Smoothly animate the visible debt value down to meet the target debt
        if (this.visualDebt > this.debt) {
            const difference = this.visualDebt - this.debt;
            // Snappy decay speed factor (0.12). Math.ceil guarantees we end up at exactly 0.
            const step = Math.ceil(difference * 0.12);
            this.visualDebt -= step;
        }

        // Handle Lost State logic
        if (this.state === 'lost') {
            if (this.particles.length < 100 && Math.random() < 0.4) {
                this.spawnRedParticle();
            }
            this.particles.forEach((p, index) => {
                p.y += p.speed;
                if (p.y > this.canvas.height) this.particles.splice(index, 1);
            });
        }

        // Handle Won State logic
        if (this.state === 'won') {
            if (this.confettiTimer > 0) {
                this.spawnConfetti();
                this.confettiTimer--;
            }
            this.particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;
                if (this.confettiTimer <= 0) p.opacity -= 0.01; // Fade out when spray ends

                if (p.y > this.canvas.height || p.opacity <= 0) {
                    this.particles.splice(index, 1);
                }
            });
        }
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear Background
        ctx.fillStyle = '#11141a';
        ctx.fillRect(0, 0, w, h);

        // Draw UI elements based on state
        if (this.state === 'lost') {
            this.drawLightSkull(w / 2, h / 2 - 20);
        }

        // Standard Debt Rendering (Using the visualDebt tracker)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#64748b';
        ctx.font = '20px "Courier New", Courier, monospace';
        ctx.fillText("CURRENT OUTSTANDING DEBT", w / 2, h / 2 - 50);

        ctx.fillStyle = this.visualDebt > 0 ? '#ef4444' : '#22c55e';
        ctx.font = 'bold 56px Arial, sans-serif';
        ctx.fillText(`$${Math.round(this.visualDebt).toLocaleString()}`, w / 2, h / 2 + 10);

        // Overlays & Particles
        if (this.state === 'lost') {
            // Draw Falling Blood Drops
            this.particles.forEach(p => {
                ctx.strokeStyle = `rgba(185, 28, 28, ${p.opacity})`;
                ctx.lineWidth = p.width;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x, p.y + p.length);
                ctx.stroke();
            });

            // Draw "COLLECTED" Banner Stamp over top
            ctx.save();
            ctx.translate(w / 2, h / 2 + 10);
            ctx.rotate(-0.1);
            ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
            ctx.font = 'bold 72px "Impact", sans-serif';
            ctx.strokeStyle = '#11141a';
            ctx.lineWidth = 8;
            ctx.strokeText("COLLECTED", 0, 0);
            ctx.fillText("COLLECTED", 0, 0);
            ctx.restore();
        }

        if (this.state === 'won') {
            // Render Winner Screen Over Text
            ctx.fillStyle = 'rgba(17, 20, 26, 0.85)';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = '#eab308';
            ctx.font = 'bold 84px "Impact", Arial, sans-serif';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 20;
            ctx.fillText("WINNER", w / 2, h / 2);
            ctx.shadowBlur = 0; // reset

            // Draw Confetti
            this.particles.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.opacity);
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });
            ctx.globalAlpha = 1.0; // reset
        }
    }

    drawLightSkull(x, y) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 4;

        // Main Head structure
        ctx.beginPath();
        ctx.arc(x, y, 70, 0, Math.PI, true);
        ctx.lineTo(x - 40, y + 80);
        ctx.lineTo(x + 40, y + 80);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye Sockets
        ctx.fillStyle = '#11141a';
        ctx.beginPath();
        ctx.arc(x - 25, y + 15, 16, 0, Math.PI * 2);
        ctx.arc(x + 25, y + 15, 16, 0, Math.PI * 2);
        ctx.fill();

        // Nose cavity
        ctx.beginPath();
        ctx.moveTo(x, y + 35);
        ctx.lineTo(x - 8, y + 50);
        ctx.lineTo(x + 8, y + 50);
        ctx.closePath();
        ctx.fill();

        // Teeth lines
        ctx.strokeStyle = '#11141a';
        ctx.lineWidth = 3;
        for (let i = -20; i <= 20; i += 10) {
            ctx.beginPath();
            ctx.moveTo(x + i, y + 65);
            ctx.lineTo(x + i, y + 80);
            ctx.stroke();
        }
        ctx.restore();
    }

    loop(timestamp) {
        this.update();
        this.draw();
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }
}