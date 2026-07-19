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

        // Stabilizing dampener modifier derived from object upgrade rank
        const stabilityFactor = Math.max(0.1, 1.3 - (level * 0.4));

        let vxRange = 180;
        let vyRange = 90;
        let vzRange = 120;

        if (item === 'fish') {
            vxRange = 460 * stabilityFactor; // Wide erratic horizontal wobble
            vyRange = 140 * stabilityFactor;
        } else if (item === 'knife') {
            vxRange = 90 * stabilityFactor;
            vyRange = 250 * stabilityFactor; // Erratic sharp vertical drop-offs
        }

        this.nextCanVariance = {
            vxModifier: (Math.random() - 0.5) * vxRange,
            vyModifier: (Math.random() - 0.5) * vyRange,
            vzModifier: (Math.random() - 0.5) * vzRange
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
            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y;
            const pullDist = Math.hypot(pullX, pullY);
            const maxPull = 160 * this.mgr.baseScale;
            const power = Math.min(1, pullDist / maxPull);

            if (pullDist < 8) {
                this.isDragging = false;
                return;
            }

            const item = this.mgr.equippedItem;
            let baseVx = pullX * 2.2;
            let baseVy = -450 - (pullY * 1.2);
            let baseVz = 400 + (power * 800);

            // Injected Weapon Attributes Configurations
            if (item === 'fish') {
                baseVx += Math.sin(this.mgr.time * 25) * 60;
                baseVy -= 40;
            } else if (item === 'knife') {
                baseVy += 60;
                baseVz += 250;
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
                vRotation: item === 'knife' ? 45 : (Math.random() - 0.5) * 25,
                bounced: false
            });

            this.isDragging = false;

            let throwFun = 8;
            if (item === 'fish') throwFun = 15;
            if (item === 'knife') throwFun = 25;

            this.mgr.fun = Math.min(100, this.mgr.fun + throwFun);
            this.mgr.spawnParticle(`+${throwFun} FUN`, this.mgr.canSpawnX, this.mgr.canSpawnY - 20, '#ec4899');

            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('woosh-fast', { volume: 0.7 });

            this.generateNextCanVariance();

            if (this.mgr.boss.state === 'LOOKING') {
                this.mgr.triggerBossCatch();
            }
        }
    }

    update(dt) {
        for (let i = this.cans.length - 1; i >= 0; i--) {
            const c = this.cans[i];

            let gravity = 1350;
            if (c.type === 'knife') gravity = 2100;
            if (c.type === 'fish') gravity = 1050;

            c.x += c.vx * dt * this.mgr.baseScale;
            c.y += c.vy * dt * this.mgr.baseScale;
            c.z += c.vz * dt;
            c.vy += gravity * dt;
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

                    let catchFun = 30;
                    if (c.type === 'fish') catchFun = 65;
                    if (c.type === 'knife') catchFun = 95;

                    this.mgr.fun = Math.min(100, this.mgr.fun + catchFun);
                    this.mgr.spawnParticle(`+${catchFun} GREAT FUN!`, this.mgr.width * 0.72, this.mgr.height * 0.38, '#ec4899');
                    if (typeof AssetManager !== 'undefined') AssetManager.playAudio('coin-drop', { volume: 0.6 });
                    this.cans.splice(i, 1);
                } else {
                    if (!c.bounced) {
                        c.bounced = true;
                        c.vz = -c.vz * 0.20;
                        c.vy = -240;
                        c.vx *= 0.3;
                    } else if (c.z > 1300 || c.y > this.mgr.height) {
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

            if (c.type === 'fish') {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.6, size * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (c.type === 'knife') {
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(-size * 0.5, -size * 0.1);
                ctx.lineTo(size * 0.5, -size * 0.1);
                ctx.lineTo(size * 0.3, size * 0.2);
                ctx.closePath();
                ctx.fill();
            } else {
                const canImg = typeof AssetManager !== 'undefined' ? AssetManager.get('can') : null;
                if (canImg && canImg.complete) {
                    ctx.drawImage(canImg, -size / 2, -size / 2, size, size);
                } else {
                    ctx.fillStyle = '#f43f5e';
                    ctx.fillRect(-size / 2, -size / 2, size, size);
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

            const pullX = this.dragStart.x - this.dragCurrent.x;
            const pullY = this.dragCurrent.y - this.dragStart.y;
            const pullDist = Math.hypot(pullX, pullY);
            const maxPull = 160 * this.mgr.baseScale;
            const power = Math.min(1, pullDist / maxPull);

            const item = this.mgr.equippedItem;
            let baseVx = pullX * 2.2;
            let baseVy = -450 - (pullY * 1.2);
            let baseVz = 400 + (power * 800);

            if (item === 'fish') {
                baseVx += Math.sin(this.mgr.time * 25) * 60;
                baseVy -= 40;
            } else if (item === 'knife') {
                baseVy += 60;
                baseVz += 250;
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

            let gravity = 1350;
            if (item === 'knife') gravity = 2100;
            if (item === 'fish') gravity = 1050;

            while (simZ < this.mgr.trashcan.z && safetyCounter < 200) {
                simX += simVx * simDt * this.mgr.baseScale;
                simY += simVy * simDt * this.mgr.baseScale;
                simZ += simVz * simDt;
                simVy += gravity * simDt;
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

            ctx.beginPath();
            ctx.arc(0, 0, 15 * this.mgr.baseScale * distanceScale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = ctx.strokeStyle;
            ctx.beginPath();
            ctx.arc(0, 0, 5 * this.mgr.baseScale * distanceScale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}