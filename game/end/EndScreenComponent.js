class EndScreenComponent {
    constructor({ width, height, onMainMenu, onSettings, onCredits }) {
        // Core Layout Boundaries
        this.width = width || 800;
        this.height = height || 600;
        this.scaleFactor = 1.0;

        // Callbacks
        this.callbacks = {
            onMainMenu,
            onSettings,
            onCredits
        };

        // Internal States & Breakpoint Dimensions
        this.introProgress = 0; // Animates smoothly from 0 to 1
        this.isWin = true;
        this.dialogWidth = 520;
        this.dialogHeight = 620;
        this.isMobile = false;

        // 1. INSTANTIATE MODULAR JUICY ARCADE BUTTONS
        this.mainMenuButton = new ArcadeButton({
            text: 'MAIN MENU',
            themeColor: '#39ff14', // Glowing Cyber Green
            glowColor: '#00ff66'
        });

        this.settingsButton = new ArcadeButton({
            text: 'SETTINGS',
            themeColor: '#00f0ff', // Phosphor Cyan
            glowColor: '#00ffff'
        });

        this.creditsButton = new ArcadeButton({
            text: 'CREDITS',
            themeColor: '#ff9800', // Neon Orange
            glowColor: '#ffb020'
        });

        this.buttons = [this.mainMenuButton, this.settingsButton, this.creditsButton];

        // Perform initial manual layout calculation sync
        this.resize(this.width, this.height);
    }

    setWinState(isWin) {
        this.isWin = isWin;
    }

    // Maps local canvas space to scale-independent center-relative space 
    getCenterRelativeMouse(localX, localY) {
        const scale = Math.max(0.01, this.introProgress);
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (localX - cx) / scale,
            y: (localY - cy) / scale
        };
    }

    // Responsive sizing engine - seamlessly handles Mobile, Tablet, and Desktop breakpoints
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Establish uniform base scaling ratios
        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.7), 1.25);

        // Fluid layout dimensions based on device form factor breakpoints
        if (width < 480) {
            // Mobile: Expand proportions vertically to breathe comfortably
            this.dialogWidth = Math.min(width * 0.94, 360);
            this.dialogHeight = Math.min(height * 0.94, 540);
            this.isMobile = true;
        } else if (width < 768) {
            // Tablet
            this.dialogWidth = 460 * this.scaleFactor;
            this.dialogHeight = 560 * this.scaleFactor;
            this.isMobile = false;
        } else {
            // Desktop
            this.dialogWidth = 520 * this.scaleFactor;
            this.dialogHeight = 620 * this.scaleFactor;
            this.isMobile = false;
        }

        // Clamp boundaries to prevent structural visual breakages
        this.dialogWidth = Math.max(300, Math.min(660, this.dialogWidth));
        this.dialogHeight = Math.max(480, Math.min(740, this.dialogHeight));

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // Center-relative text placements
        this.titleY = -dh * 0.28;
        this.statusY = -dh * 0.16;

        // Stacked Vertical Layout Math
        const btnW = dw * 0.82;
        const btnH = this.isMobile ? 44 : 50 * this.scaleFactor;
        const gap = this.isMobile ? 14 : 20 * this.scaleFactor;
        const startBtnY = dh * 0.06;

        // Pass updated positioning configurations directly down to ArcadeButtons
        this.mainMenuButton.setPosition(0, startBtnY, btnW, btnH, this.scaleFactor);
        this.settingsButton.setPosition(0, startBtnY + btnH + gap, btnW, btnH, this.scaleFactor);
        this.creditsButton.setPosition(0, startBtnY + (btnH + gap) * 2, btnW, btnH, this.scaleFactor);
    }

    // 1. UPDATE: Handles introductory fade ticks and nested button physics loops
    update(dt) {
        // Linear scaling intro entrance fade
        if (this.introProgress < 1) {
            this.introProgress += dt * 1.5; // Takes ~0.66 seconds to snap in fully
            if (this.introProgress > 1) this.introProgress = 1;
        }

        // Tick internal spring motion physics profiles on buttons
        this.buttons.forEach(btn => btn.update(dt));
    }

    // 2. DRAW: Juicy, layered canvas presentation rendering sequence
    draw(ctx, x, y) {
        ctx.save();

        // Translate to layout block position assigned by GameManager
        ctx.translate(x, y);

        // Enforce component perimeter boundaries mask (acts like overflow: hidden)
        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();

        // Dark Matte Screen Backdrop Underlay Tint (Progressively blends in)
        ctx.fillStyle = `rgba(10, 10, 14, ${0.75 * this.introProgress})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Break early if component is completely invisible
        if (this.introProgress <= 0.01) {
            ctx.restore();
            return;
        }

        // Apply shared scaling matrices centered on screen midpoints
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.introProgress, this.introProgress);

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // LAYER A: NEO-BRUTALIST FLAT SHADOW LAYER (Vibrant Magenta Offset)
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-dw / 2 + 8, -dh / 2 + 8, dw, dh);

        // LAYER B: PRIMARY TERMINAL CABINET ENCLOSURE CASE
        ctx.fillStyle = '#0a0a0c';
        ctx.strokeStyle = this.isWin ? '#39ff14' : '#ff007f'; // Dynamic thematic frame colors
        ctx.lineWidth = 4;
        ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
        ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);

        // LAYER C: RETRO CRT MONITOR SWEEPING RASTER SCANLINES
        ctx.save();
        ctx.beginPath();
        ctx.rect(-dw / 2, -dh / 2, dw, dh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let sy = -dh / 2; sy < dh / 2; sy += 3) {
            ctx.beginPath();
            ctx.moveTo(-dw / 2, sy);
            ctx.lineTo(dw / 2, sy);
            ctx.stroke();
        }
        ctx.restore();

        // LAYER D: SCI-FI CORNER EMBED ACCENT GEOMETRY
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 8, 2);
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 2, 8);
        ctx.fillRect(dw / 2 - 18, -dh / 2 + 10, 8, 2);
        ctx.fillRect(dw / 2 - 12, -dh / 2 + 10, 2, 8);

        // LAYER E: STATUS HEADER DISPLAY BANNERS (High Contrast Monospace Typography)
        ctx.save();
        ctx.shadowColor = this.isWin ? '#00ff66' : '#ff007f';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(36 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textString = this.isWin ? 'STAGE CLEARED' : 'GAME OVER';
        ctx.fillText(textString, 0, this.titleY);
        ctx.restore();

        // Cyber System Status Metadata Feed Subtitle
        ctx.fillStyle = this.isWin ? '#39ff14' : '#ffe600';
        ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';

        const statusString = this.isWin ? '// TERMINAL: OPERATIONS SUCCESSFUL' : '// WARNING: ASSET DETONATED';
        ctx.fillText(statusString, 0, this.statusY);

        // Brutalist Structural Division Bar Separator Line
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-dw * 0.42, -dh * 0.08);
        ctx.lineTo(dw * 0.42, -dh * 0.08);
        ctx.stroke();

        // LAYER F: DRAW REUSABLE SYSTEM ACTION BUTTONS
        this.buttons.forEach(btn => btn.draw(ctx));

        ctx.restore();
        ctx.restore();
    }

    // 3. INPUT ROUTING: Maps localized window pointer contexts down safely
    handleMouseMove(localX, localY) {
        const local = this.getCenterRelativeMouse(localX, localY);

        this.buttons.forEach(btn => btn.handleMouseMove(local.x, local.y));

        // Tells GameManager orchestration loop whether it should swap out pointer shapes
        return this.buttons.some(btn => btn.isHovered);
    }

    handleMouseDown(localX, localY) {
        const local = this.getCenterRelativeMouse(localX, localY);
        this.buttons.forEach(btn => btn.handleMouseDown(local.x, local.y));
    }

    handleMouseUp(localX, localY) {
        const local = this.getCenterRelativeMouse(localX, localY);

        // Execute cleanly bounded click releases natively linked into ArcadeButton components
        this.mainMenuButton.handleMouseUp(local.x, local.y, this.callbacks.onMainMenu);
        this.settingsButton.handleMouseUp(local.x, local.y, this.callbacks.onSettings);
        this.creditsButton.handleMouseUp(local.x, local.y, this.callbacks.onCredits);
    }

    handleMouseClick(localX, localY) {
        // Redundant click hook omitted to avoid double-firing bugs on touch release triggers
    }
}