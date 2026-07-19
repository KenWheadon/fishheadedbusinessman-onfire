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

        const scale = this.mgr.baseScale;
        // Bound unplaced tiles to upper/middle screen real estate
        const minX = 50 * scale;
        const maxX = this.mgr.width - 130 * scale;
        const minY = 90 * scale;
        const maxY = this.mgr.height - 300 * scale;

        pool.forEach((val) => {
            // Start tiles randomly placed around the screen area
            const rx = minX + Math.random() * (maxX - minX);
            const ry = minY + Math.random() * (maxY - minY);

            this.tiles.push({
                val,
                x: rx,
                y: ry,
                tx: rx,
                ty: ry,
                isPlaced: false,
                placedX: 0
            });
        });
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

        // Trace from foreground to background layers
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

        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;
        const placedY = this.mgr.height - 160 * scale; // Moved along the bottom edge

        // Check if dropped inside the matching zone bounds
        if (my >= placedY - 60 * scale && my <= placedY + tileH + 60 * scale) {
            const otherPlaced = this.tiles.filter(t => t.isPlaced && t !== this.draggedTile)
                .sort((a, b) => a.placedX - b.placedX);

            let insertIdx = otherPlaced.length;
            for (let i = 0; i < otherPlaced.length; i++) {
                if (mx < otherPlaced[i].x + tileW / 2) {
                    insertIdx = i;
                    break;
                }
            }

            this.draggedTile.isPlaced = true;

            // Assign sequential indexing spatial anchors to dictate ordering arrays
            if (otherPlaced.length === 0) {
                this.draggedTile.placedX = startX;
            } else if (insertIdx === 0) {
                this.draggedTile.placedX = otherPlaced[0].placedX - 10;
            } else if (insertIdx >= otherPlaced.length) {
                this.draggedTile.placedX = otherPlaced[otherPlaced.length - 1].placedX + 10;
            } else {
                this.draggedTile.placedX = (otherPlaced[insertIdx - 1].placedX + otherPlaced[insertIdx].placedX) / 2;
            }
        } else {
            // Dropped outside: stays unplaced where released, animating seamlessly to rest target
            this.draggedTile.isPlaced = false;
            this.draggedTile.tx = this.draggedTile.x;
            this.draggedTile.ty = this.draggedTile.y;
        }

        this.draggedTile = null;

        if (this.checkSorted()) {
            this.mgr.triggerRoundSuccess();
        }
    }

    update(dt) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;

        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;
        const placedY = this.mgr.height - 160 * scale;

        // Dynamic Gap Generation Setup: Shifts neighbor tiles to reveal slot openings
        let isHoveringZone = false;
        let insertIdx = 0;

        if (this.draggedTile) {
            const dragCenterY = this.draggedTile.y + tileH / 2;
            const dragCenterX = this.draggedTile.x + tileW / 2;
            if (dragCenterY >= placedY - 60 * scale && dragCenterY <= placedY + tileH + 60 * scale) {
                isHoveringZone = true;
                const otherPlaced = this.tiles.filter(t => t.isPlaced && t !== this.draggedTile)
                    .sort((a, b) => a.placedX - b.placedX);
                insertIdx = otherPlaced.length;
                for (let i = 0; i < otherPlaced.length; i++) {
                    if (dragCenterX < otherPlaced[i].x + tileW / 2) {
                        insertIdx = i;
                        break;
                    }
                }
            }
        }

        // Process Target Matrix coordinates loop
        if (isHoveringZone) {
            const otherPlaced = this.tiles.filter(t => t.isPlaced && t !== this.draggedTile)
                .sort((a, b) => a.placedX - b.placedX);

            // Build temporary array tracking structural gap space offsets
            let previewList = [...otherPlaced];
            previewList.splice(insertIdx, 0, this.draggedTile);

            previewList.forEach((tile, idx) => {
                const targetX = startX + idx * (tileW + gap);
                if (tile === this.draggedTile) {
                    // Dragged item tracks mouse accurately
                } else {
                    tile.tx = targetX;
                    tile.ty = placedY;
                }
            });
        } else {
            // Standard layout sorting targets architecture
            const placed = this.tiles.filter(t => t.isPlaced).sort((a, b) => a.placedX - b.placedX);
            placed.forEach((tile, idx) => {
                tile.tx = startX + idx * (tileW + gap);
                tile.ty = placedY;
                tile.placedX = tile.tx;
            });
        }

        // Unplaced resting logic targets
        this.tiles.forEach((tile) => {
            if (!tile.isPlaced && tile !== this.draggedTile) {
                tile.tx = tile.x;
                tile.ty = tile.y;
            }
        });

        // Fluid Framerate-Independent Interpolation Animation Execution
        this.tiles.forEach((tile) => {
            if (tile !== this.draggedTile) {
                tile.x += (tile.tx - tile.x) * 12 * dt;
                tile.y += (tile.ty - tile.y) * 12 * dt;
            }
        });
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const tileW = 75 * scale;
        const tileH = 105 * scale;
        const gap = 15 * scale;
        const totalW = this.tiles.length * tileW + (this.tiles.length - 1) * gap;
        const startX = (this.mgr.width - totalW) / 2;
        const placedY = this.mgr.height - 160 * scale;

        ctx.save();

        // Matching Panel Placement Zone along the absolute bottom region
        ctx.fillStyle = '#111113';
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([6 * scale, 6 * scale]);
        ctx.fillRect(startX - 20 * scale, placedY - 15 * scale, totalW + 40 * scale, tileH + 30 * scale);
        ctx.strokeRect(startX - 20 * scale, placedY - 15 * scale, totalW + 40 * scale, tileH + 30 * scale);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = `900 ${Math.round(13 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText("MATCHING PANEL ZONE", this.mgr.width / 2, placedY + tileH + 25 * scale);

        // Draw standard tiles
        this.tiles.forEach((tile) => {
            if (tile === this.draggedTile) return;
            this.drawTileGraphic(ctx, tile, scale, tileW, tileH, false);
        });

        // Overlay active dragging layer directly on top of system depth buffers
        if (this.draggedTile) {
            this.drawTileGraphic(ctx, this.draggedTile, scale, tileW, tileH, true);
        }

        ctx.restore();
    }

    drawTileGraphic(ctx, tile, scale, tileW, tileH, isDragging) {
        ctx.save();
        if (isDragging) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 16 * scale;
            ctx.shadowOffsetY = 10 * scale;
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