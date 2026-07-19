class TileSystem {
    constructor(manager) {
        this.mgr = manager;
        this.tiles = [];
        this.selectedIdx = null;
    }

    generateTiles(count) {
        this.tiles = [];
        this.selectedIdx = null;
        let pool = [];

        // Collect distinct randomized non-consecutive integers
        while (pool.length < count) {
            let val = Math.floor(Math.random() * 9) + 1;
            if (!pool.includes(val)) pool.push(val);
        }

        // Enforce scramble verification checks to prevent auto-sorted generation wins
        if (count > 1) {
            let sorted = true;
            for (let i = 0; i < pool.length - 1; i++) {
                if (pool[i] > pool[i + 1]) sorted = false;
            }
            if (sorted) {
                let tmp = pool[0]; pool[0] = pool[1]; pool[1] = tmp;
            }
        }

        pool.forEach((val) => {
            this.tiles.push({ val });
        });
    }

    checkSorted() {
        for (let i = 0; i < this.tiles.length - 1; i++) {
            if (this.tiles[i].val > this.tiles[i + 1].val) return false;
        }
        return true;
    }

    handleClick(mx, my) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;
        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;
        const startY = this.mgr.height * 0.72;

        for (let i = 0; i < this.tiles.length; i++) {
            const tx = startX + i * (tileW + gap);
            const ty = startY;

            if (mx >= tx && mx <= tx + tileW && my >= ty && my <= ty + tileH) {
                if (this.selectedIdx === null) {
                    this.selectedIdx = i;
                } else {
                    if (this.selectedIdx !== i) {
                        // Process value matrix swap mechanics
                        let temp = this.tiles[this.selectedIdx];
                        this.tiles[this.selectedIdx] = this.tiles[i];
                        this.tiles[i] = temp;

                        if (this.checkSorted()) {
                            this.mgr.triggerRoundSuccess();
                        }
                    }
                    this.selectedIdx = null;
                }
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;
        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;
        const startY = this.mgr.height * 0.72;

        ctx.save();
        // Wood Board Background Rack
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 4 * scale;
        ctx.fillRect(startX - 25 * scale, startY - 15 * scale, totalW + 50 * scale, tileH + 30 * scale);
        ctx.strokeRect(startX - 25 * scale, startY - 15 * scale, totalW + 50 * scale, tileH + 30 * scale);

        this.tiles.forEach((tile, i) => {
            const tx = startX + i * (tileW + gap);
            const ty = startY;

            // Render Ivory Layer Styles
            ctx.fillStyle = (this.selectedIdx === i) ? '#fef08a' : '#fffbeb';
            ctx.strokeStyle = '#09090b';
            ctx.lineWidth = 2 * scale;
            ctx.fillRect(tx, ty, tileW, tileH);
            ctx.strokeRect(tx, ty, tileW, tileH);

            // Inset Jade Frame
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 1 * scale;
            ctx.strokeRect(tx + 6 * scale, ty + 6 * scale, tileW - 12 * scale, tileH - 12 * scale);

            // Print Numeric Values
            ctx.fillStyle = (tile.val % 2 === 0) ? '#dc2626' : '#1e3a8a';
            ctx.font = `900 ${Math.round(38 * scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tile.val, tx + tileW / 2, ty + tileH / 2);
        });
        ctx.restore();
    }
}