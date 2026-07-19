class ShopSystem {
    constructor(manager) {
        this.mgr = manager;
        this.currentTab = 'UPGRADES'; // UPGRADES, ITEMS

        // Tab Selector Buttons
        this.upgradesTabBtn = new ArcadeButton({ text: 'STATS', themeColor: '#ec4899', glowColor: '#db2777' });
        this.itemsTabBtn = new ArcadeButton({ text: 'ITEMS', themeColor: '#a855f7', glowColor: '#9333ea' });

        // Upgrades Tab Inventory
        this.upgradesInventory = [
            { id: 'workSpeed', name: 'Macro Keyboard', desc: '+30% Work Speed', cost: 120, current: 0, max: 3 },
            { id: 'stealthTint', name: 'Privacy Screen', desc: '-20% Alert Growth', cost: 180, current: 0, max: 3 },
            { id: 'maxFun', name: 'Comfy Chair', desc: '-25% Fun Depletion', cost: 150, current: 0, max: 3 }
        ];

        // Items Tab Inventory 
        this.itemsInventory = [
            { id: 'fish', name: 'Slippery Fish', desc: 'High fun reward. Slippery lateral air drift.', cost: 200, current: 0, max: 3 },
            { id: 'knife', name: 'Tactical Knife', desc: 'Extreme fun reward. Heavy, high-velocity dive.', cost: 350, current: 0, max: 3 }
        ];

        this.closeButton = new CloseButton({ size: 32, themeColor: '#ef4444', shadowColor: '#991b1b' });

        this.upgradeButtons = [];
        this.upgradesInventory.forEach(item => {
            this.upgradeButtons.push(new ArcadeButton({ text: `BUY: $${item.cost}`, themeColor: '#38bdf8', glowColor: '#0ea5e9' }));
        });

        this.itemButtons = [];
        this.itemsInventory.forEach(item => {
            this.itemButtons.push(new ArcadeButton({ text: `BUY: $${item.cost}`, themeColor: '#22c55e', glowColor: '#16a34a' }));
        });

        this.updateItemButtonTexts();
    }

    updateItemButtonTexts() {
        this.itemsInventory.forEach((item, idx) => {
            const btn = this.itemButtons[idx];
            if (item.current === 0) {
                btn.text = `BUY: $${item.cost}`;
            } else if (this.mgr.equippedItem !== item.id) {
                btn.text = 'EQUIP';
                btn.themeColor = '#eab308';
                btn.glowColor = '#ca8a04';
            } else if (item.current < item.max) {
                btn.text = `UPGRADE: $${item.cost}`;
                btn.themeColor = '#38bdf8';
                btn.glowColor = '#0ea5e9';
            } else {
                btn.text = 'EQUIPPED';
                btn.themeColor = '#22c55e';
                btn.glowColor = '#16a34a';
            }
        });
    }

    resize(w, h) {
        const scale = this.mgr.baseScale;
        const panelW = 650 * scale;
        const panelH = 470 * scale;
        const panelX = (w - panelW) / 2;
        const panelY = (h - panelH) / 2 + 30 * scale;

        this.closeButton.setPosition(panelX + panelW - 30 * scale, panelY + 30 * scale, 30 * scale);

        // Position Tab Toggles at top
        this.upgradesTabBtn.setPosition(panelX + 240 * scale, panelY + 42 * scale, 100 * scale, 34 * scale, scale);
        this.itemsTabBtn.setPosition(panelX + 350 * scale, panelY + 42 * scale, 100 * scale, 34 * scale, scale);

        const itemH = 95 * scale;
        const startY = panelY + 125 * scale;

        // Scale Upgrades Layout Positions
        this.upgradesInventory.forEach((_, idx) => {
            this.upgradeButtons[idx].setPosition(panelX + panelW - 120 * scale, startY + idx * itemH, 150 * scale, 40 * scale, scale);
        });

        // Scale Items Layout Positions
        this.itemsInventory.forEach((_, idx) => {
            this.itemButtons[idx].setPosition(panelX + panelW - 120 * scale, startY + idx * itemH, 150 * scale, 40 * scale, scale);
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

                        if (item.id === 'workSpeed') this.mgr.modifiers.workRate += 0.30;
                        if (item.id === 'stealthTint') this.mgr.modifiers.suspicionScale -= 0.20;
                        if (item.id === 'maxFun') this.mgr.modifiers.funDrainScale -= 0.25;

                        item.cost = Math.floor(item.cost * 1.5);
                        this.upgradeButtons[idx].text = item.current >= item.max ? 'MAXED' : `BUY: $${item.cost}`;
                        this.mgr.spawnParticle('UPGRADE PURCHASED!', this.mgr.width / 2, this.mgr.height * 0.4, '#22c55e');
                        if (typeof AssetManager !== 'undefined') AssetManager.playAudio('success-shiny', { volume: 0.5 });
                    }
                });
            });
        } else {
            this.itemsInventory.forEach((item, idx) => {
                this.itemButtons[idx].handleMouseUp(x, y, () => {
                    // Purchase Item Node
                    if (item.current === 0) {
                        if (this.mgr.money >= item.cost) {
                            this.mgr.money -= item.cost;
                            item.current = 1;
                            this.mgr.equippedItem = item.id;
                            this.mgr.itemLevels[item.id] = 1;
                            item.cost = Math.floor(item.cost * 1.6);
                            this.mgr.spawnParticle(`${item.name} UNLOCKED!`, this.mgr.width / 2, this.mgr.height * 0.4, '#a855f7');
                            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('success-shiny', { volume: 0.6 });
                        }
                    }
                    // Equip Item Node
                    else if (this.mgr.equippedItem !== item.id) {
                        this.mgr.equippedItem = item.id;
                        if (typeof AssetManager !== 'undefined') AssetManager.playAudio('mouse-click', { volume: 0.4 });
                    }
                    // Upgrade Physics Handling Node
                    else if (item.current < item.max) {
                        if (this.mgr.money >= item.cost) {
                            this.mgr.money -= item.cost;
                            item.current++;
                            this.mgr.itemLevels[item.id] = item.current;
                            item.cost = Math.floor(item.cost * 1.6);
                            this.mgr.spawnParticle(`${item.name} STABILIZED!`, this.mgr.width / 2, this.mgr.height * 0.4, '#38bdf8');
                            if (typeof AssetManager !== 'undefined') AssetManager.playAudio('success-shiny', { volume: 0.5 });
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

        // Highlight Active Tab
        this.upgradesTabBtn.themeColor = this.currentTab === 'UPGRADES' ? '#ec4899' : '#475569';
        this.itemsTabBtn.themeColor = this.currentTab === 'ITEMS' ? '#a855f7' : '#475569';

        if (this.currentTab === 'UPGRADES') {
            this.upgradesInventory.forEach((item, idx) => {
                if (item.current >= item.max) this.upgradeButtons[idx].themeColor = '#475569';
                this.upgradeButtons[idx].update(dt);
            });
        } else {
            this.updateItemButtonTexts();
            this.itemButtons.forEach(btn => btn.update(dt));
        }
    }

    draw(ctx) {
        const scale = this.mgr.baseScale;
        const panelW = 650 * scale;
        const panelH = 470 * scale;
        const panelX = (this.mgr.width - panelW) / 2;
        const panelY = (this.mgr.height - panelH) / 2 + 30 * scale;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
        ctx.strokeStyle = this.currentTab === 'UPGRADES' ? '#ec4899' : '#a855f7';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 12 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${Math.round(22 * scale)}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('OFFICE SUPPLY SHOP', panelX + 30 * scale, panelY + 45 * scale);

        this.upgradesTabBtn.draw(ctx);
        this.itemsTabBtn.draw(ctx);

        const itemH = 95 * scale;
        const startY = panelY + 125 * scale;

        if (this.currentTab === 'UPGRADES') {
            this.upgradesInventory.forEach((item, idx) => {
                const rowY = startY + idx * itemH;
                ctx.fillStyle = '#f8fafc';
                ctx.font = `700 ${Math.round(16 * scale)}px monospace`;
                ctx.fillText(item.name, panelX + 30 * scale, rowY + 12 * scale);

                ctx.fillStyle = '#94a3b8';
                ctx.font = `500 ${Math.round(13 * scale)}px monospace`;
                ctx.fillText(item.desc, panelX + 30 * scale, rowY + 34 * scale);

                for (let i = 0; i < item.max; i++) {
                    ctx.fillStyle = i < item.current ? '#ec4899' : '#334155';
                    ctx.fillRect(panelX + 30 * scale + (i * 24 * scale), rowY + 48 * scale, 16 * scale, 8 * scale);
                }
                this.upgradeButtons[idx].draw(ctx);
            });
        } else {
            // Render default weapon entry for 'can' selection feedback
            const canRowY = startY - 45 * scale;
            ctx.fillStyle = this.mgr.equippedItem === 'can' ? '#22c55e' : '#64748b';
            ctx.font = `700 ${Math.round(15 * scale)}px monospace`;
            ctx.fillText(this.mgr.equippedItem === 'can' ? '● DEFAULT ALUMINUM CAN (EQUIPPED)' : '○ DEFAULT ALUMINUM CAN (CLICK TEXT TO EQUIP)', panelX + 30 * scale, canRowY);

            // Allow clicking default can row text directly to drop weapons
            if (this.mgr.isDragging === false && this.mgr.openShopButton.isPressed === false) {
                // Track mouse interactions to equip default weapon if hovered
            }

            this.itemsInventory.forEach((item, idx) => {
                const rowY = startY + idx * itemH;
                const isEquipped = this.mgr.equippedItem === item.id;

                ctx.fillStyle = isEquipped ? '#a855f7' : '#f8fafc';
                ctx.font = `700 ${Math.round(16 * scale)}px monospace`;
                ctx.fillText(isEquipped ? `● ${item.name} [ACTIVE]` : item.name, panelX + 30 * scale, rowY + 12 * scale);

                ctx.fillStyle = '#94a3b8';
                ctx.font = `500 ${Math.round(12 * scale)}px monospace`;
                ctx.fillText(item.desc, panelX + 30 * scale, rowY + 34 * scale);

                // Draw Stability Upgrade Nodes
                ctx.fillStyle = '#cbd5e1';
                ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
                ctx.fillText('STABILITY:', panelX + 30 * scale, rowY + 54 * scale);
                for (let i = 0; i < item.max; i++) {
                    ctx.fillStyle = i < item.current ? '#a855f7' : '#334155';
                    ctx.fillRect(panelX + 110 * scale + (i * 22 * scale), rowY + 46 * scale, 14 * scale, 8 * scale);
                }
                this.itemButtons[idx].draw(ctx);
            });
        }

        this.closeButton.draw(ctx);
    }
}