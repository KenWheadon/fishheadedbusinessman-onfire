class MiniGame {
    constructor(config = {}) {
        this.width = config.width || 1280;
        this.height = config.height || 720;
        this.baseScale = this.width / 1280;
        this.time = 0;
        this.reset();
    }

    reset() {
        this.state = 'ACTIVE'; // ACTIVE, GAMEOVER
        this.playerState = 'THROWING'; // THROWING, WORKING
        this.isWorkingHeld = false;

        // Systems & Progression Trackers
        this.score = 0;
        this.stealthAlert = 0; // Suspicion bar: 0 to 100
        this.workDone = 0;     // Work done meter: 0 to 100

        this.cans = [];
        this.particles = [];
        this.screenShake = 0;

        // Pseudo-3D Environmental Perspective Values
        this.focalLength = 450;
        this.horizonX = this.width / 2;
        this.horizonY = this.height * 0.35;

        // Target Trashcan 3D Properties
        this.trashcan = { x: 340, y: 120, z: 700, w: 120, h: 140, depth: 90 };

        // Boss AI Properties
        this.boss = {
            state: 'AWAY',
            timer: 4.0,
            x: -400,
            y: -60,
            z: 550,
            w: 170,
            h: 170,
            targetX: -400
        };

        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };

        this.resize(this.width, this.height);
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.baseScale = this.width / 1280;

        this.horizonX = this.width / 2;
        this.horizonY = this.height * 0.35;

        // Computer Station Hitbox
        this.computerHitbox = {
            x: 50 * this.baseScale,
            y: this.height - 180 * this.baseScale,
            w: 160 * this.baseScale,
            h: 140 * this.baseScale
        };

        // Static Can Launcher Hotspot - Moved UP by an additional 10% of total screen height
        this.canSpawnX = 340 * this.baseScale;
        this.canSpawnY = this.height - 120 * this.baseScale - (this.height * 0.10);
        this.canInteractionRadius = 60 * this.baseScale; // Generous input tolerance window
    }

    // Perspective Projection Utility
    project3D(x, y, z) {
        const scale = this.focalLength / (this.focalLength + z);
        return {
            x: this.horizonX + x * scale * this.baseScale,
            y: this.horizonY + y * scale * this.baseScale,
            scale: scale * this.baseScale
        };
    }

    handleMouseMove(x, y) {
        if (this.state !== 'ACTIVE') return;
        if (this.isDragging) {
            this.dragCurrent = { x, y };
        }
    }

    handleMouseDown(x, y) {
        if (this.state !== 'ACTIVE') return;

        // 1. Core Work Console Interaction Check
        if (x >= this.computerHitbox.x && x <= this.computerHitbox.x + this.computerHitbox.w &&
            y >= this.computerHitbox.y && y <= this.computerHitbox.y + this.computerHitbox.h) {
            this.isWorkingHeld = true;
            this.playerState = 'WORKING';
            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('mouse-click', { volume: 0.3 });
            return;
        }

        // 2. Strict Launcher Check (Must click directly within the bounds of the static can spawn)
        const distToCan = Math.hypot(x - this.canSpawnX, y - this.canSpawnY);
        if (this.playerState === 'THROWING' && distToCan <= this.canInteractionRadius) {
            this.isDragging = true;
            this.dragStart = { x: this.canSpawnX, y: this.canSpawnY };
            this.dragCurrent = { x, y };
        }
    }

    handleMouseUp() {
        if (this.isWorkingHeld) {
            this.isWorkingHeld = false;
            this.playerState = 'THROWING';
        }

        if (this.isDragging) {
            // Slingshot vector offsets
            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y; // Positive when dragging downward

            // High powered physics variables for smooth, effortless targeting
            const launchVx = pullX * 5.2;
            const launchVy = -680 - Math.max(0, pullY * 2.8);
            const launchVz = Math.min(1400, Math.max(450, pullY * 5.5));

            // Dynamically translate 2D space spawn locations to matching 3D space starting vectors
            const start3DX = (this.canSpawnX - this.horizonX) / this.baseScale;
            const start3DY = (this.canSpawnY - this.horizonY) / this.baseScale;

            this.cans.push({
                x: start3DX,
                y: start3DY,
                z: 0,
                vx: launchVx,
                vy: launchVy,
                vz: launchVz,
                rotation: 0,
                vRotation: (Math.random() - 0.5) * 25,
                bounced: false
            });

            this.isDragging = false;
            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('woosh-fast', { volume: 0.7 });

            if (this.boss.state === 'LOOKING') {
                this.triggerBossCatch();
            }
        }
    }

    triggerBossCatch() {
        this.stealthAlert = Math.min(100, this.stealthAlert + 35);
        this.screenShake = 12;
        if (typeof AssetManager !== 'undefined') {
            const randomYell = `yell${Math.floor(Math.random() * 7) + 1}`;
            AssetManager.playAudio(randomYell, { volume: 0.8 });
            AssetManager.playAudio('alert-ding', { volume: 0.8 });
        }
        this.spawnParticle('SPOTTED!', this.width / 2, this.height * 0.25, '#ef4444');

        if (this.stealthAlert >= 100) {
            this.state = 'GAMEOVER';
        }
    }

    spawnParticle(text, x, y, color = '#fbbf24') {
        this.particles.push({ text, x, y, color, vy: -70, opacity: 1.0, life: 1.0 });
    }

    update(dt) {
        this.time += dt;

        if (this.screenShake > 0.1) this.screenShake *= 0.88;

        if (this.state === 'GAMEOVER') {
            if (this.isWorkingHeld) {
                this.reset();
            }
            return;
        }

        // --- Work Progress & Suspicion Lowering Metrics ---
        if (this.playerState === 'WORKING') {
            this.workDone += dt * 45; // Speed filling the work meter
            if (this.workDone >= 100) {
                this.workDone = 0;
                this.stealthAlert = Math.max(0, this.stealthAlert - 25); // Decrease suspicion on completion
                this.spawnParticle('JOB COMPLETE! SUSPICION DECREASED', this.width / 2, this.height * 0.5, '#22c55e');
                if (typeof AssetManager !== 'undefined') AssetManager.playAudio('success-shiny', { volume: 0.5 });
            }
        }

        // --- Boss AI Core Loops ---
        this.boss.timer -= dt;
        if (this.boss.timer <= 0) {
            if (this.boss.state === 'AWAY') {
                this.boss.state = 'WARNING';
                this.boss.timer = 1.2 + Math.random() * 0.8;
                this.boss.targetX = (Math.random() - 0.5) * 160;
                if (typeof AssetManager !== 'undefined') AssetManager.playAudio('card-flip', { volume: 0.4 });
            } else if (this.boss.state === 'WARNING') {
                this.boss.state = 'LOOKING';
                this.boss.timer = 2.0 + Math.random() * 2.0;
            } else if (this.boss.state === 'LOOKING') {
                this.boss.state = 'AWAY';
                this.boss.timer = 4.0 + Math.random() * 3.0;
                this.boss.targetX = -450;
            }
        }

        this.boss.x += (this.boss.targetX - this.boss.x) * 7.5 * dt;

        if (this.boss.state === 'LOOKING' && this.playerState === 'THROWING' && Math.random() < 0.015) {
            this.triggerBossCatch();
        }

        // --- Projectile Physics Engine ---
        for (let i = this.cans.length - 1; i >= 0; i--) {
            const c = this.cans[i];

            c.x += c.vx * dt * this.baseScale;
            c.y += c.vy * dt * this.baseScale;
            c.z += c.vz * dt;
            c.vy += 1350 * dt; // Gravity vector pull
            c.rotation += c.vRotation * dt;

            // Deep visual depth axis target collision check
            if (c.z >= this.trashcan.z) {
                const halfW = this.trashcan.w / 2;
                const hitX = c.x >= this.trashcan.x - halfW && c.x <= this.trashcan.x + halfW;
                const hitY = c.y >= this.trashcan.y - this.trashcan.h && c.y <= this.trashcan.y;

                if (hitX && hitY && !c.bounced) {
                    this.score += 1; // Increment core performance score safely
                    this.spawnParticle('+1 SCORE!', this.width * 0.72, this.height * 0.38, '#22c55e');
                    if (typeof AssetManager !== 'undefined') AssetManager.playAudio('coin-drop', { volume: 0.6 });
                    this.cans.splice(i, 1);
                } else {
                    if (!c.bounced) {
                        c.bounced = true;
                        c.vz = -c.vz * 0.25;
                        c.vy = -280;
                        c.vx *= 0.4;
                    } else if (c.z > 1300 || c.y > this.height) {
                        this.cans.splice(i, 1);
                    }
                }
            }
        }

        // Particles Updates
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.y += p.vy * dt;
            p.life -= dt;
            p.opacity = Math.max(0, p.life / 1.0);
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }

        // 1. Render Environments Base
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.5, '#1e293b');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Ground perspective grids
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= 12; i++) {
            ctx.beginPath();
            ctx.moveTo((this.width / 12) * i, this.height);
            ctx.lineTo(this.horizonX, this.horizonY);
            ctx.stroke();
        }

        // 2. Draw 'boss' Asset Key Component
        if (this.boss.state !== 'AWAY') {
            const bossProj = this.project3D(this.boss.x, this.boss.y, this.boss.z);
            const bW = this.boss.w * bossProj.scale;
            const bH = this.boss.h * bossProj.scale;
            const bossImg = typeof AssetManager !== 'undefined' ? AssetManager.get('boss') : null;

            if (this.boss.state === 'LOOKING') {
                ctx.fillStyle = 'rgba(220, 38, 38, 0.05)';
                ctx.fillRect(0, 0, this.width, this.height);
            }

            if (bossImg && bossImg.complete) {
                ctx.drawImage(bossImg, bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            } else {
                ctx.fillStyle = this.boss.state === 'LOOKING' ? '#dc2626' : '#ea580c';
                ctx.fillRect(bossProj.x - bW / 2, bossProj.y - bH, bW, bH);
            }
        }

        // 3. Draw Target Trash Basket
        const binProj = this.project3D(this.trashcan.x, this.trashcan.y, this.trashcan.z);
        const binW = this.trashcan.w * binProj.scale;
        const binH = this.trashcan.h * binProj.scale;

        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2 * binProj.scale;
        ctx.beginPath();
        ctx.moveTo(binProj.x - binW / 2, binProj.y - binH);
        ctx.lineTo(binProj.x + binW / 2, binProj.y - binH);
        ctx.lineTo(binProj.x + binW * 0.5, binProj.y);
        ctx.lineTo(binProj.x - binW * 0.5, binProj.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.ellipse(binProj.x, binProj.y - binH, binW / 2, 8 * binProj.scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. Draw Mid-air 'can' Flight paths
        this.cans.forEach(c => {
            const canProj = this.project3D(c.x, c.y, c.z);
            const canSize = 42 * canProj.scale;
            const canImg = typeof AssetManager !== 'undefined' ? AssetManager.get('can') : null;

            ctx.save();
            ctx.translate(canProj.x, canProj.y);
            ctx.rotate(c.rotation);
            if (canImg && canImg.complete) {
                ctx.drawImage(canImg, -canSize / 2, -canSize / 2, canSize, canSize);
            } else {
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(-canSize / 2, -canSize / 2, canSize, canSize);
            }
            ctx.restore();
        });

        // 5. Draw Static Base Launcher 'can' hotspot Node
        if (this.playerState === 'THROWING' && !this.isDragging) {
            const spawnCanImg = typeof AssetManager !== 'undefined' ? AssetManager.get('can') : null;
            const sSize = 52 * this.baseScale;

            ctx.save();
            const pulse = 1 + Math.sin(this.time * 5) * 0.06;
            ctx.translate(this.canSpawnX, this.canSpawnY);
            ctx.scale(pulse, pulse);

            if (spawnCanImg && spawnCanImg.complete) {
                ctx.drawImage(spawnCanImg, -sSize / 2, -sSize / 2, sSize, sSize);
            } else {
                ctx.fillStyle = '#f43f5e';
                ctx.fillRect(-sSize / 2, -sSize / 2, sSize, sSize);
            }
            ctx.restore();

            // Constant instructional overlay text context
            ctx.fillStyle = '#f8fafc';
            ctx.font = `bold ${Math.round(13 * this.baseScale)}px sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 6;
            ctx.fillText('CLICK HERE AND DRAG TO THROW', this.canSpawnX, this.canSpawnY - 42 * this.baseScale);
            ctx.shadowBlur = 0;
        }

        // 6. Draw Player Character Avatar Key (`fhbmon`)
        const playerImg = typeof AssetManager !== 'undefined' ? AssetManager.get('fhbmon') : null;
        const pW = 210 * this.baseScale;
        const pH = 260 * this.baseScale;
        const pX = 130 * this.baseScale;
        let pY = this.height - pH + 20 * this.baseScale;
        if (this.playerState === 'WORKING') pY += 12 * this.baseScale;

        if (playerImg && playerImg.complete) {
            ctx.drawImage(playerImg, pX, pY, pW, pH);
        }

        // 7. Draw Work Terminal Console Graphic Key (`computer`)
        const compImg = typeof AssetManager !== 'undefined' ? AssetManager.get('computer') : null;
        if (compImg && compImg.complete) {
            ctx.drawImage(compImg, this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        } else {
            ctx.fillStyle = this.playerState === 'WORKING' ? '#22c55e' : '#0284c7';
            ctx.fillRect(this.computerHitbox.x, this.computerHitbox.y, this.computerHitbox.w, this.computerHitbox.h);
        }

        if (this.playerState === 'WORKING') {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3 * this.baseScale;
            ctx.strokeRect(this.computerHitbox.x - 2, this.computerHitbox.y - 2, this.computerHitbox.w + 4, this.computerHitbox.h + 4);
        }

        // 8. Slingshot Vector Path Visualizer
        if (this.isDragging) {
            ctx.beginPath();
            ctx.setLineDash([4 * this.baseScale, 4 * this.baseScale]);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3 * this.baseScale;
            ctx.moveTo(this.dragStart.x, this.dragStart.y);
            ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Aim visualizer prediction dot
            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y;
            const start3DX = (this.canSpawnX - this.horizonX) / this.baseScale;
            const start3DY = (this.canSpawnY - this.horizonY) / this.baseScale;
            const predProj = this.project3D(start3DX + pullX * 1.1, start3DY - pullY * 0.4, Math.min(700, pullY * 5.5));

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(predProj.x, predProj.y, 6 * this.baseScale, 0, Math.PI * 2);
            ctx.fill();
        }

        // 9. Particles System Layer Rendering
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.font = `900 ${Math.round(18 * this.baseScale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        });

        // 10. Draw UI Layout Panels
        this.drawInterfaceDashboard(ctx);

        ctx.restore();
    }

    drawInterfaceDashboard(ctx) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, this.width, 75 * this.baseScale);

        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(22 * this.baseScale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`SCORE: ${this.score}`, 30 * this.baseScale, 24 * this.baseScale);

        const barW = 200 * this.baseScale;
        const barH = 14 * this.baseScale;
        const edgeSpacing = 30 * this.baseScale;

        // --- Meter 1: Suspicion Matrix Level ---
        const susX = this.width - barW - edgeSpacing;
        const susY = 20 * this.baseScale;

        ctx.fillStyle = '#334155';
        ctx.fillRect(susX, susY, barW, barH);
        ctx.fillStyle = this.stealthAlert > 70 ? '#ef4444' : '#f59e0b';
        ctx.fillRect(susX, susY, barW * (this.stealthAlert / 100), barH);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`SUSPICION: ${Math.round(this.stealthAlert)}%`, susX, susY + 24 * this.baseScale);

        // --- Meter 2: Work Done Meter ---
        const workX = this.width - (barW * 2) - (edgeSpacing * 2);
        const workY = 20 * this.baseScale;

        ctx.fillStyle = '#334155';
        ctx.fillRect(workX, workY, barW, barH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(workX, workY, barW * (this.workDone / 100), barH);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = `bold ${Math.round(11 * this.baseScale)}px monospace`;
        ctx.fillText(`WORK DONE: ${Math.round(this.workDone)}%`, workX, workY + 24 * this.baseScale);

        // Center Alert Trackers State Actions
        ctx.textAlign = 'center';
        if (this.boss.state === 'LOOKING') {
            ctx.fillStyle = '#ef4444';
            ctx.font = `900 ${Math.round(16 * this.baseScale)}px monospace`;
            ctx.fillText('⚠️ BOSS WATCHING! FREEZE OR WORK! ⚠️', this.width / 2, 28 * this.baseScale);
        } else if (this.boss.state === 'WARNING') {
            ctx.fillStyle = '#f59e0b';
            ctx.font = `900 ${Math.round(16 * this.baseScale)}px monospace`;
            ctx.fillText('👣 FOOTSTEPS APPROACHING... 👣', this.width / 2, 28 * this.baseScale);
        } else {
            ctx.fillStyle = '#38bdf8';
            ctx.font = `700 ${Math.round(14 * this.baseScale)}px monospace`;
            ctx.fillText('STATUS: RADAR CLEAR. DISPOSE CANS', this.width / 2, 28 * this.baseScale);
        }

        // Handle GameOver HUD states
        if (this.state === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.fillRect(0, 0, this.width, this.height);

            ctx.fillStyle = '#ef4444';
            ctx.font = `900 ${Math.round(48 * this.baseScale)}px monospace`;
            ctx.fillText('YOU WERE CAUGHT AND TERMINATED!', this.width / 2, this.height * 0.42);

            ctx.fillStyle = '#f8fafc';
            ctx.font = `700 ${Math.round(22 * this.baseScale)}px monospace`;
            ctx.fillText(`TOTAL DISPOSAL SCORE: ${this.score}`, this.width / 2, this.height * 0.52);

            ctx.fillStyle = '#64748b';
            ctx.font = `500 ${Math.round(14 * this.baseScale)}px monospace`;
            ctx.fillText('CLICK/HOLD THE COMPUTER MONITOR TO REBOOT MAIN ENGINE SYSTEM', this.width / 2, this.height * 0.64);
        }
    }
}