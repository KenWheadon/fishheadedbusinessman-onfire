class ThrowingSystem {
    constructor(manager) {
        this.mgr = manager;
        this.cans = [];
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.generateNextCanVariance();
    }

    generateNextCanVariance() {
        const item = this.mgr.equippedItem;
        const level = this.mgr.itemLevels[item] || 1;
        const prof = MiniGameData.items.profiles[item] || MiniGameData.items.profiles.can;

        const stabilityFactor = Math.max(0.1, 1.3 - (level * 0.4));

        this.nextCanVariance = {
            vxModifier: (Math.random() - 0.5) * prof.vxRange * (item !== 'can' ? stabilityFactor : 1),
            vyModifier: (Math.random() - 0.5) * prof.vyRange * (item !== 'can' ? stabilityFactor : 1),
            vzModifier: (Math.random() - 0.5) * prof.vzRange * (item !== 'can' ? stabilityFactor : 1)
        };
    }

    handleMouseDown(x, y) {
        const distToCan = Math.hypot(x - this.mgr.canSpawnX, y - this.mgr.canSpawnY);
        if (this.mgr.playerState === 'THROWING' && distToCan <= this.mgr.canInteractionRadius) {
            this.isDragging = true;
            this.dragStart = { x: this.mgr.canSpawnX, y: this.mgr.canSpawnY };
            this.dragCurrent = { x, y };
            return true;
        }
        return false;
    }

    handleMouseMove(x, y) {
        if (this.isDragging) {
            this.dragCurrent = { x, y };
        }
    }

    handleMouseUp() {
        if (this.isDragging) {
            const dragSettings = MiniGameData.items.dragSettings;
            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y;
            const pullDist = Math.hypot(pullX, pullY);
            const maxPull = dragSettings.maxPullDistance * this.mgr.baseScale;
            const power = Math.min(1, pullDist / maxPull);

            if (pullDist < dragSettings.deadzone) {
                this.isDragging = false;
                return;
            }

            const item = this.mgr.equippedItem;
            const prof = MiniGameData.items.profiles[item] || MiniGameData.items.profiles.can;

            let baseVx = pullX * prof.baseVxMulti;
            let baseVy = prof.baseVyOffset - (pullY * prof.baseVyMulti);
            let baseVz = prof.baseVzOffset + (power * prof.vzPowerMulti);

            if (item === 'fish') {
                baseVx += Math.sin(this.mgr.time * prof.waveFreq) * prof.waveAmp;
            }

            const launchVx = baseVx + (this.nextCanVariance.vxModifier * power);
            const launchVy = baseVy + (this.nextCanVariance.vyModifier * power);
            const launchVz = baseVz + (this.nextCanVariance.vzModifier * power);

            const start3DX = (this.mgr.canSpawnX - this.mgr.horizonX) / this.mgr.baseScale;
            const start3DY = (this.mgr.canSpawnY - this.mgr.horizonY) / this.mgr.baseScale;

            this.cans.push({
                type: item,
                x: start3DX,
                y: start3DY,
                z: 0,
                vx: launchVx * this.mgr.modifiers.throwVelocity,
                vy: launchVy,
                vz: launchVz,
                rotation: 0,
                vRotation: prof.fixedRotation ? prof.fixedRotation : (Math.random() - 0.5) * prof.vRotationMinMax,
                bounced: false
            });

            this.isDragging = false;

            this.mgr.fun = Math.min(100, this.mgr.fun + prof.throwFun);
            this.mgr.spawnParticle(`+${prof.throwFun} FUN`, this.mgr.canSpawnX, this.mgr.canSpawnY - 20, '#ec4899');

            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('woosh-fast', { volume: 0.7 });

            this.generateNextCanVariance();

            if (this.mgr.boss.state === 'LOOKING') {
                this.mgr.triggerBossCatch();
            }
        }
    }

    update(dt) {
        const bounce = MiniGameData.items.bounceSettings;
        for (let i = this.cans.length - 1; i >= 0; i--) {
            const c = this.cans[i];
            const prof = MiniGameData.items.profiles[c.type] || MiniGameData.items.profiles.can;

            c.x += c.vx * dt * this.mgr.baseScale;
            c.y += c.vy * dt * this.mgr.baseScale;
            c.z += c.vz * dt;
            c.vy += prof.gravity * dt;
            c.rotation += c.vRotation * dt;

            if (c.y > this.mgr.height + 50) {
                this.cans.splice(i, 1);
                continue;
            }

            if (c.z >= this.mgr.trashcan.z) {
                const halfW = this.mgr.trashcan.w / 2;
                const hitX = c.x >= this.mgr.trashcan.x - halfW && c.x <= this.mgr.trashcan.x + halfW;
                const hitY = c.y >= this.mgr.trashcan.y - this.mgr.trashcan.h && c.y <= this.mgr.trashcan.y;

                if (hitX && hitY && !c.bounced) {
                    this.mgr.score += 1;

                    this.mgr.fun = Math.min(100, this.mgr.fun + prof.catchFun);
                    this.mgr.spawnParticle(`+${prof.catchFun} GREAT FUN!`, this.mgr.width * 0.72, this.mgr.height * 0.38, '#ec4899');
                    if (typeof AssetManager !== 'undefined') AssetManager.playAudio('coin-drop', { volume: 0.6 });
                    this.cans.splice(i, 1);
                } else {
                    if (!c.bounced) {
                        c.bounced = true;
                        c.vz = c.vz * bounce.vzDampening;
                        c.vy = bounce.vyBounceVelocity;
                        c.vx *= bounce.vxDampening;
                    } else if (c.z > bounce.maxZDistance || c.y > this.mgr.height) {
                        this.cans.splice(i, 1);
                    }
                }
            }
        }
    }

    draw(ctx) {
        this.cans.forEach(c => {
            const proj = this.mgr.project3D(c.x, c.y, c.z);
            const size = 44 * proj.scale;

            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.rotate(c.rotation);

            const imgAsset = typeof AssetManager !== 'undefined' ? AssetManager.get(c.type) : null;
            if (imgAsset && imgAsset.complete) {
                ctx.drawImage(imgAsset, -size / 2, -size / 2, size, size);
            } else {
                if (c.type === 'fish') {
                    ctx.fillStyle = '#38bdf8';
                    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.6, size * 0.3, 0, 0, Math.PI * 2); ctx.fill();
                } else if (c.type === 'knife') {
                    ctx.fillStyle = '#cbd5e1';
                    ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.1); ctx.lineTo(size * 0.5, -size * 0.1); ctx.lineTo(size * 0.3, size * 0.2); ctx.closePath(); ctx.fill();
                } else {
                    ctx.fillStyle = '#f43f5e'; ctx.fillRect(-size / 2, -size / 2, size, size);
                }
            }
            ctx.restore();
        });

        if (this.isDragging) {
            ctx.beginPath();
            ctx.setLineDash([4 * this.mgr.baseScale, 4 * this.mgr.baseScale]);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 3 * this.mgr.baseScale;
            ctx.moveTo(this.dragStart.x, this.dragStart.y);
            ctx.lineTo(this.dragCurrent.x, this.dragCurrent.y);
            ctx.stroke();
            ctx.setLineDash([]);

            const dragSettings = MiniGameData.items.dragSettings;
            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y;
            const pullDist = Math.hypot(pullX, pullY);
            const maxPull = dragSettings.maxPullDistance * this.mgr.baseScale;
            const power = Math.min(1, pullDist / maxPull);

            const item = this.mgr.equippedItem;
            const prof = MiniGameData.items.profiles[item] || MiniGameData.items.profiles.can;

            let baseVx = pullX * prof.baseVxMulti;
            let baseVy = prof.baseVyOffset - (pullY * prof.baseVyMulti);
            let baseVz = prof.baseVzOffset + (power * prof.vzPowerMulti);

            if (item === 'fish') {
                baseVx += Math.sin(this.mgr.time * prof.waveFreq) * prof.waveAmp;
            }

            const launchVx = baseVx + (this.nextCanVariance.vxModifier * power);
            const launchVy = baseVy + (this.nextCanVariance.vyModifier * power);
            const launchVz = baseVz + (this.nextCanVariance.vzModifier * power);

            let simX = (this.mgr.canSpawnX - this.mgr.horizonX) / this.mgr.baseScale;
            let simY = (this.mgr.canSpawnY - this.mgr.horizonY) / this.mgr.baseScale;
            let simZ = 0;
            let simVx = launchVx;
            let simVy = launchVy;
            let simVz = launchVz;
            const simDt = 0.015;
            let safetyCounter = 0;

            while (simZ < this.mgr.trashcan.z && safetyCounter < 200) {
                simX += simVx * simDt * this.mgr.baseScale;
                simY += simVy * simDt * this.mgr.baseScale;
                simZ += simVz * simDt;
                simVy += prof.gravity * simDt;
                if (simZ > 5 && simY >= ((this.mgr.canSpawnY - this.mgr.horizonY) / this.mgr.baseScale)) break;
                safetyCounter++;
            }

            const landProj = this.mgr.project3D(simX, simY, simZ);
            const dotX = this.mgr.canSpawnX + (landProj.x - this.mgr.canSpawnX) * power;
            const dotY = this.mgr.canSpawnY + (landProj.y - this.mgr.canSpawnY) * power;

            const margin = 24 * this.mgr.baseScale;
            const clampedX = Math.max(margin, Math.min(this.mgr.width - margin, dotX));
            const clampedY = Math.max(95 * this.mgr.baseScale, Math.min(this.mgr.height - margin, dotY));

            const offScreenDist = Math.hypot(dotX - clampedX, dotY - clampedY);
            const distanceScale = Math.max(0.25, 1 - (offScreenDist / 450));

            ctx.save();
            ctx.translate(clampedX, clampedY);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 5;
            ctx.strokeStyle = item === 'knife' ? '#cbd5e1' : (item === 'fish' ? '#38bdf8' : '#facc15');
            ctx.lineWidth = 3.5 * this.mgr.baseScale * distanceScale;

            ctx.beginPath(); ctx.arc(0, 0, 15 * this.mgr.baseScale * distanceScale, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath(); ctx.arc(0, 0, 5 * this.mgr.baseScale * distanceScale, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
}