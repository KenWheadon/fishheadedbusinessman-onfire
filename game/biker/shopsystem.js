class ShopSystem {
    constructor(manager) {
        this.mgr = manager;
        this.packButtons = [];

        MiniGameData.packs.forEach((pack) => {
            this.packButtons.push(new ArcadeButton({
                text: pack.isUpgrade ? `UNLOCK [$${pack.cost}]` : `BUY [$${pack.cost}]`,
                themeColor: pack.isUpgrade ? '#00f0ff' : '#ff007f',
                glowColor: pack.isUpgrade ? '#00ffff' : '#ff00ff'
            }));
        });

        this.closeBtn = new CloseButton({
            size: 32,
            themeColor: '#ff007f',
            shadowColor: '#9d174d',
            hoverColor: '#ff0055',
            lineColor: '#ffffff'
        });
    }

    resize(w, h) {
        const scale = this.mgr.baseScale;
        const panelW = 820 * scale; // Expanded structural frame horizontally to clean fit 4 card columns
        const panelH = 420 * scale;
        const px = (w - panelW) / 2;
        const py = (h - panelH) / 2;

        this.closeBtn.setPosition(px + panelW - 24 * scale, py + 24 * scale, 32 * scale, scale);

        const cardW = 165 * scale;
        const cardH = 240 * scale;
        const startX = px + 40 * scale;
        const startY = py + 100 * scale;
        const gap = 20 * scale;

        this.packButtons.forEach((btn, i) => {
            const cx = startX + i * (cardW + gap);
            const cy = startY;
            btn.setPosition(cx + cardW / 2, cy + cardH - 35 * scale, cardW - 24 * scale, 40 * scale, scale);
        });
    }

    handleMouseMove(mx, my) {
        this.closeBtn.handleMouseMove(mx, my);
        this.packButtons.forEach(btn => btn.handleMouseMove(mx, my));
    }

    handleMouseDown(mx, my) {
        this.closeBtn.handleMouseDown(mx, my);
        this.packButtons.forEach(btn => btn.handleMouseDown(mx, my));
    }

    handleMouseUp(mx, my) {
        this.closeBtn.handleMouseUp(mx, my, () => {
            this.mgr.state = 'BETWEEN_ROUNDS';
        });

        this.packButtons.forEach((btn, i) => {
            btn.handleMouseUp(mx, my, () => {
                this.executePurchase(MiniGameData.packs[i]);
            });
        });
    }

    executePurchase(pack) {
        if (pack.isUpgrade) {
            if (this.mgr.drunkDrainUnlocked) {
                this.mgr.spawnParticle('ALREADY OWNED!', this.mgr.width / 2, this.mgr.height * 0.45, '#ff007f');
                return;
            }
            if (this.mgr.totalCashEarned >= pack.cost) {
                this.mgr.totalCashEarned -= pack.cost;
                this.mgr.drunkDrainUnlocked = true;
                this.mgr.spawnJuiceExplosion(this.mgr.width / 2, this.mgr.height / 2, '#39ff14', 25);
                this.mgr.spawnParticle('FOCUS UNLOCKED: ALCOHOL DRAINS OVER TIME!', this.mgr.width / 2, this.mgr.height * 0.45, '#39ff14');
            } else {
                this.mgr.spawnParticle('INSUFFICIENT UPGRADE FUNDS!', this.mgr.width / 2, this.mgr.height * 0.45, '#ff007f');
            }
            return;
        }

        // Standard snack logic tracking branch
        if (this.mgr.totalCashEarned >= pack.cost) {
            this.mgr.totalCashEarned -= pack.cost;
            const roll = Math.random();
            let accumulatedChance = 0;
            let reduction = 0;

            for (let option of pack.odds) {
                accumulatedChance += option.chance;
                if (roll <= accumulatedChance) {
                    reduction = option.reduction;
                    break;
                }
            }

            if (reduction > 0) {
                this.mgr.drunkMeter = Math.max(0, this.mgr.drunkMeter - reduction);
                this.mgr.spawnJuiceExplosion(this.mgr.width / 2, this.mgr.height / 2, '#39ff14', 15);
                this.mgr.spawnParticle(`SOBERED UP -${reduction}%`, this.mgr.width / 2, this.mgr.height * 0.45, '#39ff14');
            } else {
                this.mgr.spawnJuiceExplosion(this.mgr.width / 2, this.mgr.height / 2, '#ef4444', 8);
                this.mgr.spawnParticle('PACK HAD NO EFFECT!', this.mgr.width / 2, this.mgr.height * 0.45, '#ef4444');
            }
        } else {
            this.mgr.spawnParticle('INSUFFICIENT BAR FUNDS!', this.mgr.width / 2, this.mgr.height * 0.45, '#ff007f');
        }
    }

    update(dt) {
        this.closeBtn.update(dt);
        this.packButtons.forEach(btn => btn.update(dt));
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const panelW = 820 * scale;
        const panelH = 420 * scale;
        const px = (this.mgr.width - panelW) / 2;
        const py = (this.mgr.height - panelH) / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(0, 0, this.mgr.width, this.mgr.height);

        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 4 * scale;
        ctx.fillRect(px, py, panelW, panelH);
        ctx.strokeRect(px, py, panelW, panelH);

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(24 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('BIKER SNACK & UPGRADE DEPOT', px + panelW / 2, py + 45 * scale);

        const cardW = 165 * scale;
        const cardH = 240 * scale;
        const startX = px + 40 * scale;
        const startY = py + 100 * scale;
        const gap = 20 * scale;

        MiniGameData.packs.forEach((pack, i) => {
            const cx = startX + i * (cardW + gap);
            const cy = startY;

            ctx.fillStyle = '#27272a';
            ctx.strokeStyle = pack.isUpgrade ? '#00f0ff' : '#4b5563';
            ctx.lineWidth = 2 * scale;
            ctx.fillRect(cx, cy, cardW, cardH);
            ctx.strokeRect(cx, cy, cardW, cardH);

            ctx.fillStyle = pack.isUpgrade ? '#00f0ff' : '#fbbf24';
            ctx.font = `900 ${Math.round(13 * scale)}px monospace`;
            ctx.fillText(pack.name.toUpperCase(), cx + cardW / 2, cy + 30 * scale);

            ctx.fillStyle = '#94a3b8';
            ctx.font = `700 ${Math.round(11 * scale)}px monospace`;
            this.wrapText(ctx, pack.desc, cx + cardW / 2, cy + 75 * scale, cardW - 20 * scale, 16 * scale);

            this.packButtons[i].draw(ctx);
        });

        this.closeBtn.draw(ctx);
        ctx.restore();
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
}