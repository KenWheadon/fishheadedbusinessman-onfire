class CarrotLoss {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.particles = [];
        this.tvLineOffset = 0;
        
        this.shakeX = 0;
        this.shakeY = 0;
        this.intensity = 0;
    }

    update(dt, cutCarrots) {
        if (cutCarrots <= 0) {
            this.shakeX = 0;
            this.shakeY = 0;
            this.particles = [];
            this.intensity = 0;
            return;
        }

        let intensity = 0;
        let particleSpawnRate = 0; // chance per frame approx
        let shakeMultiplier = 0;
        
        if (cutCarrots >= 1 && cutCarrots <= 4) {
            intensity = 0.1 + (cutCarrots / 4) * 0.2; // 0.125 to 0.3
            particleSpawnRate = 1 * cutCarrots;
            shakeMultiplier = 2;
        } else if (cutCarrots >= 5 && cutCarrots <= 7) {
            intensity = 0.5 + ((cutCarrots-4) / 3) * 0.3; // 0.6 to 0.8
            particleSpawnRate = 10 * (cutCarrots - 3);
            shakeMultiplier = 8;
        } else if (cutCarrots >= 8) {
            intensity = 1.0;
            particleSpawnRate = 40;
            shakeMultiplier = 20;
        }

        this.intensity = intensity;

        // 1. Shake
        if (Math.random() < intensity) {
            const shakeMax = shakeMultiplier;
            this.shakeX = (Math.random() * 2 - 1) * shakeMax;
            this.shakeY = (Math.random() * 2 - 1) * shakeMax;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // 2. Particles
        const spawnCountFloat = particleSpawnRate * 60 * dt;
        let spawns = Math.floor(spawnCountFloat);
        if (Math.random() < spawnCountFloat % 1) spawns++;

        for (let i = 0; i < spawns; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: -10,
                vx: (Math.random() * 2 - 1) * 50 * intensity,
                vy: 300 + Math.random() * 300 * intensity,
                size: 2 + Math.random() * 6 * intensity,
                alpha: 0.6 + Math.random() * 0.4
            });
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.y > this.height + 20) {
                this.particles.splice(i, 1);
            }
        }

        // 3. TV Lines
        this.tvLineOffset += 150 * intensity * dt;
        if (this.tvLineOffset > 10) {
            this.tvLineOffset -= 10;
        }
    }

    draw(ctx) {
        if (!this.intensity || this.intensity === 0) return;

        // Draw TV lines
        ctx.fillStyle = `rgba(0, 0, 0, ${0.15 * this.intensity})`;
        for (let y = this.tvLineOffset; y < this.height; y += 10) {
            ctx.fillRect(0, y, this.width, 2 + this.intensity);
        }

        // Draw static
        if (Math.random() < 0.5 * this.intensity) {
            const staticAlpha = 0.05 + 0.15 * this.intensity;
            ctx.fillStyle = `rgba(255, 255, 255, ${staticAlpha})`;
            const rects = 30 * this.intensity;
            for (let i = 0; i < rects; i++) {
                ctx.fillRect(
                    Math.random() * this.width, 
                    Math.random() * this.height, 
                    10 + Math.random() * 100, 
                    2 + Math.random() * 8
                );
            }
        }

        // Draw particles
        for (const p of this.particles) {
            ctx.fillStyle = `rgba(200, 0, 0, ${p.alpha})`;
            ctx.fillRect(p.x, p.y, p.size, p.size * 2);
        }
    }
}
