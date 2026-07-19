class ShopSystem {
    constructor(manager) {
        this.mgr = manager;
    }

    handleMouseDown(mx, my) {
        const scale = this.mgr.baseScale;
        const d = MiniGameData;

        const panelW = 650 * scale;
        const panelH = 420 * scale;
        const px = (this.mgr.width - panelW) / 2;
        const py = (this.mgr.height - panelH) / 2;

        // Dismiss Interface Box Action Area
        const cbx = px + panelW - 140 * scale;
        const cby = py + panelH - 55 * scale;
        if (mx >= cbx && mx <= cbx + 120 * scale && my >= cby && my <= cby + 40 * scale) {
            this.mgr.state = 'BETWEEN_ROUNDS';
            return true;
        }

        // Loop through Product Option Button Coordinates
        const cardW = 170 * scale;
        const cardH = 240 * scale;
        const startX = px + 40 * scale;
        const startY = py + 100 * scale;
        const gap = 25 * scale;

        for (let i = 0; i < d.packs.length; i++) {
            const cx = startX + i * (cardW + gap);
            const cy = startY;
            const bx = cx + 10 * scale;
            const by = cy + cardH - 50 * scale;
            const bw = cardW - 20 * scale;
            const bh = 38 * scale;

            if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
                this.executePackPurchase(d.packs[i]);
                return true;
            }
        }
        return false;
    }

    executePackPurchase(pack) {
        if (this.mgr.totalCashEarned >= pack.cost) {
            this.mgr.totalCashEarned -= pack.cost;

            // Generate Odds Distribution Calculations
            const roll = Math.random();
            let accumulatedChance = 0;
            let finalReduction = 0;

            for (let option of pack.odds) {
                accumulatedChance += option.chance;
                if (roll <= accumulatedChance) {
                    finalReduction = option.reduction;
                    break;
                }
            }

            if (finalReduction > 0) {
                this.mgr.drunkMeter = Math.max(0, this.mgr.drunkMeter - finalReduction);
                this.mgr.spawnParticle(`-${finalReduction}% DRUNK!`, this.mgr.width / 2, this.mgr.height * 0.45, '#22c55e');
            } else {
                this.mgr.spawnParticle('PACK DUD! NO EFFECT!', this.mgr.width / 2, this.mgr.height * 0.45, '#ef4444');
            }
        } else {
            this.mgr.spawnParticle('NOT ENOUGH CASH!', this.mgr.width / 2, this.mgr.height * 0.45, '#f43f5e');
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const d = MiniGameData;

        const panelW = 650 * scale;
        const panelH = 420 * scale;
        const px = (this.mgr.width - panelW) / 2;
        const py = (this.mgr.height - panelH) / 2;

        ctx.save();
        // Overlay screen fade background mask
        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(0, 0, this.mgr.width, this.mgr.height);

        // Core UI Dashboard Structure Frame
        ctx.fillStyle = '#18181b';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 4 * scale;
        ctx.fillRect(px, py, panelW, panelH);
        ctx.strokeRect(px, py, panelW, panelH);

        // Copy Texts header lines
        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(26 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('BIKER BAR SNACK DEPOT', px + panelW / 2, py + 45 * scale);

        ctx.fillStyle = '#22c55e';
        ctx.font = `700 ${Math.round(16 * scale)}px monospace`;
        ctx.fillText(`BAR WALLET: $${this.mgr.totalCashEarned}`, px + panelW / 2, py + 75 * scale);

        // Product Options Iterative Render Layout Grid Loop
        const cardW = 170 * scale;
        const cardH = 240 * scale;
        const startX = px + 40 * scale;
        const startY = py + 100 * scale;
        const gap = 25 * scale;

        d.packs.forEach((pack, i) => {
            const cx = startX + i * (cardW + gap);
            const cy = startY;

            ctx.fillStyle = '#27272a';
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 2 * scale;
            ctx.fillRect(cx, cy, cardW, cardH);
            ctx.strokeRect(cx, cy, cardW, cardH);

            // Render Product Labels
            ctx.fillStyle = '#f59e0b';
            ctx.font = `900 ${Math.round(13 * scale)}px monospace`;
            ctx.fillText(pack.name.toUpperCase(), cx + cardW / 2, cy + 30 * scale);

            // Descriptions and Specs formatting
            ctx.fillStyle = '#94a3b8';
            ctx.font = `700 ${Math.round(10 * scale)}px monospace`;
            this.wrapText(ctx, pack.desc, cx + cardW / 2, cy + 75 * scale, cardW - 20 * scale, 16 * scale);

            // Purchase Button Elements Setup
            const bx = cx + 10 * scale;
            const by = cy + cardH - 50 * scale;
            const bw = cardW - 20 * scale;
            const bh = 38 * scale;

            ctx.fillStyle = (this.mgr.totalCashEarned >= pack.cost) ? '#b91c1c' : '#4b5563';
            ctx.fillRect(bx, by, bw, bh);

            ctx.fillStyle = '#ffffff';
            ctx.font = `900 ${Math.round(12 * scale)}px monospace`;
            ctx.fillText(`BUY [$${pack.cost}]`, bx + bw / 2, by + bh / 2 + 4 * scale);
        });

        // Close/Dismiss Panel configuration
        const cbx = px + panelW - 140 * scale;
        const cby = py + panelH - 55 * scale;
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(cbx, cby, 120 * scale, 40 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(14 * scale)}px monospace`;
        ctx.fillText('LEAVE SHOP', cbx + 60 * scale, cby + 25 * scale);

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