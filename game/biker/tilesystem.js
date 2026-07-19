class TileSystem {
    constructor(manager) {
        this.mgr = manager;
        this.tiles = [];
        this.draggedTile = null;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    generateTiles(count) {
        this.tiles = [];
        this.draggedTile = null;
        let pool = [];

        while (pool.length < count) {
            let val = Math.floor(Math.random() * 9) + 1;
            if (!pool.includes(val)) pool.push(val);
        }

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
            this.tiles.push({
                val,
                x: 0,
                y: 0,
                isPlaced: false,
                placedX: 0
            });
        });

        this.updateTargetPositions();
    }

    updateTargetPositions() {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;

        // Process Unplaced rack formatting
        const unplaced = this.tiles.filter(t => !t.isPlaced);
        if (unplaced.length > 0) {
            const totalUnplacedW = unplaced.length * tileW + (unplaced.length - 1) * gap;
            const startUnplacedX = (this.mgr.width - totalUnplacedW) / 2;
            const unplacedY = this.mgr.height * 0.78;

            unplaced.forEach((tile, idx) => {
                if (tile !== this.draggedTile) {
                    tile.x = startUnplacedX + idx * (tileW + gap);
                    tile.y = unplacedY;
                }
            });
        }

        // Process Placed layout formatting (Ordered horizontally dynamically by their placedX coordinate position)
        const placed = this.tiles.filter(t => t.isPlaced).sort((a, b) => a.placedX - b.placedX);
        if (placed.length > 0) {
            const totalPlacedW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
            const startPlacedX = (this.mgr.width - totalPlacedW) / 2;
            const placedY = this.mgr.height * 0.56;

            placed.forEach((tile, idx) => {
                tile.placedX = startPlacedX + idx * (tileW + gap);
                if (tile !== this.draggedTile) {
                    tile.x = tile.placedX;
                    tile.y = placedY;
                }
            });
        }
    }

    checkSorted() {
        const placed = this.tiles.filter(t => t.isPlaced).sort((a, b) => a.placedX - b.placedX);
        if (placed.length < this.tiles.length) return false;

        for (let i = 0; i < placed.length - 1; i++) {
            if (placed[i].val > placed[i + 1].val) return false;
        }
        return true;
    }

    handleClick(mx, my) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;

        // Trace selection detection upwards from front rendering stack
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            if (mx >= tile.x && mx <= tile.x + tileW && my >= tile.y && my <= tile.y + tileH) {
                this.draggedTile = tile;
                this.offsetX = mx - tile.x;
                this.offsetY = my - tile.y;
                return true;
            }
        }
        return false;
    }

    handleMouseMove(mx, my) {
        if (this.draggedTile) {
            this.draggedTile.x = mx - this.offsetX;
            this.draggedTile.y = my - this.offsetY;
        }
    }

    handleMouseUp(mx, my) {
        if (!this.draggedTile) return;

        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;

        const totalPlacedW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startPlacedX = (this.mgr.width - totalPlacedW) / 2;
        const placedY = this.mgr.height * 0.56;

        // Check drop accuracy relative to Target Placement zone vertical window bounds
        if (my >= placedY - 50 * scale && my <= placedY + tileH + 50 * scale) {
            const existingPlaced = this.tiles.filter(t => t.isPlaced && t !== this.draggedTile)
                .sort((a, b) => a.placedX - b.placedX);

            let insertIdx = 0;
            let insertedInline = false;

            // Loop to scan horizontal positions and slice tile directly between neighbors
            for (let i = 0; i < existingPlaced.length; i++) {
                const midPoint = existingPlaced[i].placedX + tileW / 2;
                if (mx < midPoint) {
                    insertIdx = i;
                    insertedInline = true;
                    break;
                }
            }
            if (!insertedInline) insertIdx = existingPlaced.length;

            this.draggedTile.isPlaced = true;

            // Assign dummy anchor placements to trigger layout array shifts on target layout refresh updates
            if (existingPlaced.length === 0) {
                this.draggedTile.placedX = startPlacedX;
            } else if (insertIdx === 0) {
                this.draggedTile.placedX = existingPlaced[0].placedX - 10;
            } else if (insertIdx >= existingPlaced.length) {
                this.draggedTile.placedX = existingPlaced[existingPlaced.length - 1].placedX + 10;
            } else {
                this.draggedTile.placedX = (existingPlaced[insertIdx - 1].placedX + existingPlaced[insertIdx].placedX) / 2;
            }
        } else {
            // Snap back down to unplaced item deck if dropped elsewhere
            this.draggedTile.isPlaced = false;
        }

        this.draggedTile = null;
        this.updateTargetPositions();

        if (this.checkSorted()) {
            this.mgr.triggerRoundSuccess();
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;
        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;

        const placedY = this.mgr.height * 0.56;
        const unplacedY = this.mgr.height * 0.78;

        ctx.save();

        // Render Drop Target Zone
        ctx.fillStyle = '#141417';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.fillRect(startX - 15 * scale, placedY - 10 * scale, totalW + 30 * scale, tileH + 20 * scale);
        ctx.strokeRect(startX - 15 * scale, placedY - 10 * scale, totalW + 30 * scale, tileH + 20 * scale);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.font = `900 ${Math.round(13 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText("DRAG & DROP TILES HERE IN ASCENDING ORDER", this.mgr.width / 2, placedY + tileH / 2 + 5 * scale);

        // Render Unplaced Rack Base Board
        ctx.fillStyle = '#27272a';
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 4 * scale;
        ctx.fillRect(startX - 25 * scale, unplacedY - 15 * scale, totalW + 50 * scale, tileH + 30 * scale);
        ctx.strokeRect(startX - 25 * scale, unplacedY - 15 * scale, totalW + 50 * scale, tileH + 30 * scale);

        // Draw standard layout layers
        this.tiles.forEach((tile) => {
            if (tile === this.draggedTile) return;
            this.drawTileGraphic(ctx, tile, scale, tileW, tileH, false);
        });

        // Always draw active selection graphic on top of the layout depth field
        if (this.draggedTile) {
            this.drawTileGraphic(ctx, this.draggedTile, scale, tileW, tileH, true);
        }

        ctx.restore();
    }

    drawTileGraphic(ctx, tile, scale, tileW, tileH, isDragging) {
        ctx.save();
        if (isDragging) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 14 * scale;
            ctx.shadowOffsetY = 8 * scale;
        }

        ctx.fillStyle = isDragging ? '#fef08a' : '#fffbeb';
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 2 * scale;
        ctx.fillRect(tile.x, tile.y, tileW, tileH);
        ctx.strokeRect(tile.x, tile.y, tileW, tileH);

        ctx.strokeStyle = tile.isPlaced ? '#2563eb' : '#16a34a';
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(tile.x + 6 * scale, tile.y + 6 * scale, tileW - 12 * scale, tileH - 12 * scale);

        ctx.fillStyle = (tile.val % 2 === 0) ? '#dc2626' : '#1e3a8a';
        ctx.font = `900 ${Math.round(38 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.val, tile.x + tileW / 2, tile.y + tileH / 2);
        ctx.restore();
    }
}