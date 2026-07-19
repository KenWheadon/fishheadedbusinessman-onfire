class ShopSystem {
    constructor(manager) {
        this.mgr = manager;
        this.currentTab = 'UPGRADES';

        this.upgradesTabBtn = new ArcadeButton({ text: 'UPGRADES', themeColor: '#ff007f', glowColor: '#ff00ff' });
        this.itemsTabBtn = new ArcadeButton({ text: 'ITEMS', themeColor: '#00f0ff', glowColor: '#00ffff' });

        this.upgradesInventory = JSON.parse(JSON.stringify(MiniGameData.upgrades));
        this.itemsInventory = JSON.parse(JSON.stringify(MiniGameData.items.catalog));

        this.closeButton = new CloseButton({ size: MiniGameData.shopLayout.closeButtonSize, themeColor: '#ff007f', shadowColor: '#ff007f' });

        this.upgradeButtons = [];
        this.upgradesInventory.forEach(item => {
            this.upgradeButtons.push(new ArcadeButton({ text: `${item.cost} PTS`, themeColor: '#39ff14', glowColor: '#00ff66' }));
        });

        this.itemButtons = [];
        this.itemsInventory.forEach(item => {
            this.itemButtons.push(new ArcadeButton({ text: `${item.cost} PTS`, themeColor: '#39ff14', glowColor: '#00ff66' }));
        });

        this.updateItemButtonTexts();
    }

    updateItemButtonTexts() {
        this.itemsInventory.forEach((item, idx) => {
            const btn = this.itemButtons[idx];
            if (item.current === 0) {
                btn.text = `${item.cost} PTS`;
                btn.themeColor = '#ff007f';
                btn.glowColor = '#ff00ff';
            } else if (this.mgr.equippedItem !== item.id) {
                btn.text = 'EQUIP';
                btn.themeColor = '#ffe600';
                btn.glowColor = '#ffcc00';
            } else if (item.current < item.max) {
                btn.text = `${item.cost} PTS`;
                btn.themeColor = '#39ff14';
                btn.glowColor = '#00ff66';
            } else {
                btn.text = 'ACTIVE';
                btn.themeColor = '#00f0ff';
                btn.glowColor = '#00ffff';
            }
        });
    }

    resize(w, h) {
        const scale = this.mgr.baseScale;
        const sl = MiniGameData.shopLayout;
        const sw = sl.panelW * scale;
        const sh = sl.panelH * scale;
        const panelX = (w - sw) / 2;
        const panelY = (h - sh) / 2 + sl.panelYOffset * scale;

        this.closeButton.setPosition(panelX + sw - sl.closeBtnXOffset * scale, panelY + sl.closeBtnYOffset * scale, sl.closeButtonSize * scale);

        this.upgradesTabBtn.setPosition(panelX + sw / 2 - sl.tabXOffset * scale, panelY + sl.tabYOffset * scale, sl.tabW * scale, sl.tabH * scale, scale);
        this.itemsTabBtn.setPosition(panelX + sw / 2 + sl.tabXOffset * scale, panelY + sl.tabYOffset * scale, sl.tabW * scale, sl.tabH * scale, scale);

        const cardH = sl.cardH * scale;
        const cardGap = sl.cardGap * scale;
        const startY = panelY + sl.startYOffset * scale;

        this.upgradesInventory.forEach((_, idx) => {
            this.upgradeButtons[idx].setPosition(panelX + sw - sl.buyBtnXOffset * scale, startY + idx * (cardH + cardGap) + cardH / 2, sl.buyBtnW * scale, sl.buyBtnH * scale, scale);
        });

        this.itemsInventory.forEach((_, idx) => {
            this.itemButtons[idx].setPosition(panelX + sw - sl.buyBtnXOffset * scale, startY + idx * (cardH + cardGap) + cardH / 2, sl.buyBtnW * scale, sl.buyBtnH * scale, scale);
        });
    }

    handleMouseMove(x, y) {
        this.closeButton.handleMouseMove(x, y);
        this.upgradesTabBtn.handleMouseMove(x, y);
        this.itemsTabBtn.handleMouseMove(x, y);

        if (this.currentTab === 'UPGRADES') {
            this.upgradeButtons.forEach(btn => btn.handleMouseMove(x, y));
        } else {
            this.itemButtons.forEach(btn => btn.handleMouseMove(x, y));
        }
    }

    handleMouseDown(x, y) {
        this.closeButton.handleMouseDown(x, y);
        this.upgradesTabBtn.handleMouseDown(x, y);
        this.itemsTabBtn.handleMouseDown(x, y);

        if (this.currentTab === 'UPGRADES') {
            this.upgradeButtons.forEach(btn => btn.handleMouseDown(x, y));
        } else {
            this.itemButtons.forEach(btn => btn.handleMouseDown(x, y));
        }
    }

    handleMouseUp(x, y) {
        this.closeButton.handleMouseUp(x, y, () => {
            this.mgr.state = 'ACTIVE';
            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('card-flip', { volume: 0.5 });
        });

        this.upgradesTabBtn.handleMouseUp(x, y, () => { this.currentTab = 'UPGRADES'; });
        this.itemsTabBtn.handleMouseUp(x, y, () => { this.currentTab = 'ITEMS'; });

        if (this.currentTab === 'UPGRADES') {
            this.upgradesInventory.forEach((item, idx) => {
                this.upgradeButtons[idx].handleMouseUp(x, y, () => {
                    if (this.mgr.money >= item.cost && item.current < item.max) {
                        this.mgr.money -= item.cost;
                        item.current++;

                        if (item.id === 'workSpeed') this.mgr.modifiers.workRate += item.statMod;
                        if (item.id === 'stealthTint') this.mgr.modifiers.suspicionScale += item.statMod;
                        if (item.id === 'maxFun') this.mgr.modifiers.funDrainScale += item.statMod;

                        item.cost = Math.floor(item.cost * item.multiplier);
                        this.upgradeButtons[idx].text = item.current >= item.max ? 'MAXED' : `${item.cost} PTS`;
                        this.mgr.spawnParticle('UPGRADE UNLOCKED!', this.mgr.width / 2, this.mgr.height * 0.4, '#39ff14');
                    }
                });
            });
        } else {
            const costScale = MiniGameData.items.scalingMultiplier;
            this.itemsInventory.forEach((item, idx) => {
                this.itemButtons[idx].handleMouseUp(x, y, () => {
                    if (item.current === 0) {
                        if (this.mgr.money >= item.cost) {
                            this.mgr.money -= item.cost;
                            item.current = 1;
                            this.mgr.equippedItem = item.id;
                            this.mgr.itemLevels[item.id] = 1;
                            item.cost = Math.floor(item.cost * costScale);
                            this.mgr.spawnParticle(`${item.name} READY!`, this.mgr.width / 2, this.mgr.height * 0.4, '#00f0ff');
                        }
                    } else if (this.mgr.equippedItem !== item.id) {
                        this.mgr.equippedItem = item.id;
                    } else if (item.current < item.max) {
                        if (this.mgr.money >= item.cost) {
                            this.mgr.money -= item.cost;
                            item.current++;
                            this.mgr.itemLevels[item.id] = item.current;
                            item.cost = Math.floor(item.cost * costScale);
                            this.mgr.spawnParticle(`${item.name} STABILIZED!`, this.mgr.width / 2, this.mgr.height * 0.4, '#39ff14');
                        }
                    }
                    this.updateItemButtonTexts();
                });
            });
        }
    }

    update(dt) {
        this.closeButton.update(dt);
        this.upgradesTabBtn.update(dt);
        this.itemsTabBtn.update(dt);

        if (this.currentTab === 'UPGRADES') {
            this.upgradeButtons.forEach(btn => btn.update(dt));
        } else {
            this.updateItemButtonTexts();
            this.itemButtons.forEach(btn => btn.update(dt));
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const sl = MiniGameData.shopLayout;
        const sw = sl.panelW * scale;
        const sh = sl.panelH * scale;
        const panelX = (this.mgr.width - sw) / 2;
        const panelY = (this.mgr.height - sh) / 2 + sl.panelYOffset * scale;

        ctx.fillStyle = 'rgba(10, 10, 14, 0.7)';
        ctx.fillRect(0, 0, this.mgr.width, this.mgr.height);

        ctx.fillStyle = '#ff007f';
        ctx.fillRect(panelX + 8, panelY + 8, sw, sh);

        ctx.fillStyle = '#0a0a0c';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.fillRect(panelX, panelY, sw, sh);
        ctx.strokeRect(panelX, panelY, sw, sh);

        ctx.save();
        ctx.beginPath(); ctx.rect(panelX, panelY, sw, sh); ctx.clip();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
        ctx.lineWidth = 1;
        for (let sy = panelY; sy < panelY + sh; sy += 3) {
            ctx.beginPath(); ctx.moveTo(panelX, sy); ctx.lineTo(panelX + sw, sy); ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(22 * scale)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('UPGRADE SHOP', panelX + sw / 2, panelY + 35 * scale);

        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(panelX + sw * 0.08, panelY + 55 * scale);
        ctx.lineTo(panelX + sw * 0.92, panelY + 55 * scale);
        ctx.stroke();

        ctx.fillStyle = '#ffe600';
        ctx.font = `bold ${Math.round(11 * scale)}px "Courier New", monospace`;
        ctx.fillText(`// SYSTEM CORES: ${Math.floor(this.mgr.money)} PTS`, panelX + sw / 2, panelY + 72 * scale);

        this.upgradesTabBtn.draw(ctx);
        this.itemsTabBtn.draw(ctx);

        const cardW = sw * 0.92;
        const cardH = sl.cardH * scale;
        const cardGap = sl.cardGap * scale;
        const startY = panelY + sl.startYOffset * scale;
        const cardX = panelX + (sw - cardW) / 2;

        if (this.currentTab === 'UPGRADES') {
            this.upgradesInventory.forEach((item, idx) => {
                const rowY = startY + idx * (cardH + cardGap);

                ctx.fillStyle = '#121215';
                ctx.strokeStyle = '#39ff14';
                ctx.lineWidth = 2;
                ctx.fillRect(cardX, rowY, cardW, cardH);
                ctx.strokeRect(cardX, rowY, cardW, cardH);

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(12 * scale)}px "Courier New", monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(item.name.toUpperCase(), cardX + 16 * scale, rowY + 22 * scale);

                ctx.fillStyle = '#8a8a9a';
                ctx.font = `bold ${Math.round(10 * scale)}px "Courier New", monospace`;
                ctx.fillText(item.desc, cardX + 16 * scale, rowY + 40 * scale);

                ctx.fillStyle = '#39ff14';
                ctx.fillText(`[RANK Level: ${item.current} / ${item.max}]`, cardX + 16 * scale, rowY + 58 * scale);

                this.upgradeButtons[idx].draw(ctx);
            });
        } else {
            this.itemsInventory.forEach((item, idx) => {
                const rowY = startY + idx * (cardH + cardGap);
                const isEquipped = this.mgr.equippedItem === item.id;

                ctx.fillStyle = '#121215';
                ctx.strokeStyle = isEquipped ? '#00f0ff' : '#ff007f';
                ctx.lineWidth = 2;
                ctx.fillRect(cardX, rowY, cardW, cardH);
                ctx.strokeRect(cardX, rowY, cardW, cardH);

                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.round(12 * scale)}px "Courier New", monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(item.name.toUpperCase(), cardX + 16 * scale, rowY + 22 * scale);

                ctx.fillStyle = '#8a8a9a';
                ctx.font = `bold ${Math.round(10 * scale)}px "Courier New", monospace`;
                ctx.fillText(item.desc, cardX + 16 * scale, rowY + 40 * scale);

                ctx.fillStyle = isEquipped ? '#00f0ff' : '#ff007f';
                ctx.fillText(item.current > 0 ? `[STABILITY ACCURACY LEVEL: ${item.current}]` : '[STATUS: LOCKED]', cardX + 16 * scale, rowY + 58 * scale);

                this.itemButtons[idx].draw(ctx);
            });
        }

        this.closeButton.draw(ctx);
    }
}