class CanManager {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        this.cans = [];
        this.delayedSpawns = []; // Queue for future staggered spawns

        // Game Configuration
        this.maxCans = 12;
        this.score = 0;
        this.multiplier = 1;

        // Periodic Falling Timers (20-30 seconds random window)
        this.spawnTimer = this.getRandomSpawnInterval();

        // Neon Typography Components
        this.scoreText = new NeonTextComponent({
            text: "SCORE: 00",
            fontSize: 28,
            coreColor: '#ffffff',
            glowColor: '#39ff14', // Cyber green
            autoStart: false
        });

        this.multText = new NeonTextComponent({
            text: "1X MULTIPLIER!",
            fontSize: 24,
            coreColor: '#ffffff',
            glowColor: '#ff007f', // Cyber pink
            autoStart: false
        });

        this.resize(this.width, this.height);
    }

    getRandomSpawnInterval() {
        return 20 + Math.random() * 10; // 20-30 seconds
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.75), 1.25);

        // Reposition score / multipliers nicely in layout
        this.scoreText.setPosition(130 * this.scaleFactor, 50 * this.scaleFactor);
        this.multText.setPosition(this.width - 160 * this.scaleFactor, 50 * this.scaleFactor);
    }

    spawnCan(customX = null) {
        if (this.cans.length >= this.maxCans) return;

        // Safely bounds spawn margins away from screen margins
        const margin = 60 * this.scaleFactor;
        const spawnX = customX !== null ? customX : margin + Math.random() * (this.width - margin * 2);

        this.cans.push(new Can({
            x: spawnX,
            y: -100,
            width: 48,
            height: 84,
            scaleFactor: this.scaleFactor
        }));
    }

    queueStaggeredSpawns() {
        const margin = 60 * this.scaleFactor;
        
        // Setup two distinct delayed spawn events
        for (let i = 0; i < 2; i++) {
            const delay = 0.1 + Math.random() * 0.2; // 0.1 - 0.3s delay
            const targetX = margin + Math.random() * (this.width - margin * 2);

            this.delayedSpawns.push({
                timer: delay,
                x: targetX
            });
        }
    }

    handleMouseClick(mx, my) {
        let clickedAny = false;

        for (let i = this.cans.length - 1; i >= 0; i--) {
            const can = this.cans[i];
            if (can.checkClick(mx, my)) {
                clickedAny = true;

                // Update Scoring and multiplier
                this.score += 1 * this.multiplier;
                this.multiplier++;

                // Spark Neon Text Components
                if (this.scoreText.state === 'HIDDEN') {
                    this.scoreText.animateIn();
                }
                this.scoreText.setText(`SCORE: ${this.score}`);

                if (this.multiplier > 1) {
                    if (this.multText.state === 'HIDDEN') {
                        this.multText.animateIn();
                    }
                    this.multText.setText(`${this.multiplier}X MULTIPLIER!`);
                    
                    // Dynamically scale multiplier text size upward as it grows!
                    this.multText.fontSize = Math.min(48, 20 + this.multiplier * 2.5);
                }

                // Instantly spawn staggered offspring wave
                this.queueStaggeredSpawns();
                break; // Break execution to only destroy one can per click
            }
        }
        return clickedAny;
    }

    update(dt) {
        // 1. Process regular periodic spawns (20-30s cycle)
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnCan();
            this.spawnTimer = this.getRandomSpawnInterval();
        }

        // 2. Process staggered queued offspring spawns
        for (let i = this.delayedSpawns.length - 1; i >= 0; i--) {
            const spawn = this.delayedSpawns[i];
            spawn.timer -= dt;
            if (spawn.timer <= 0) {
                this.spawnCan(spawn.x);
                this.delayedSpawns.splice(i, 1);
            }
        }

        // 3. Process can physical motion and lifecycle boundary limits
        for (let i = this.cans.length - 1; i >= 0; i--) {
            const can = this.cans[i];
            can.update(dt);

            // Check if active uncrumpled can escapes out the screen bottom
            if (!can.isCrumpled && can.y - (can.height * this.scaleFactor) / 2 > this.height) {
                // Punishment: Break streak, reset multiplier to baseline
                this.multiplier = 1;
                this.multText.setText(`1X MULTIPLIER!`);
                this.multText.fontSize = 24;
                this.multText.animateOut(); // Clear display overlay
                
                this.cans.splice(i, 1);
                continue;
            }

            // Purge fully dissolved physical debris
            if (!can.isActive) {
                this.cans.splice(i, 1);
            }
        }

        // 4. Tick Text Display Modules
        this.scoreText.update(dt);
        this.multText.update(dt);
    }

    draw(ctx) {
        // Draw Cans
        this.cans.forEach(can => can.draw(ctx));

        // Draw HUD overlay text
        this.scoreText.draw(ctx);
        this.multText.draw(ctx);
    }
}