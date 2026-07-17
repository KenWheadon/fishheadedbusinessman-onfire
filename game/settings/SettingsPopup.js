class SettingsPopup {
    constructor(config = {}, callbacks = {}) {
        // Core dimensions populated dynamically via GameManager resize loops[cite: 1, 4]
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        // Dynamic Dialog Panel Box Dimensions
        this.dialogWidth = 460;
        this.dialogHeight = 520;
        this.isMobile = false;

        // Callbacks[cite: 4]
        this.onAchievements = callbacks.onAchievements || (() => { });
        this.onHelp = callbacks.onHelp || (() => { });
        this.onCredits = callbacks.onCredits || (() => { });
        this.onClose = callbacks.onClose || (() => { });
        this.onVolumeChange = callbacks.onVolumeChange || (() => { });

        // Default Volume States[cite: 4]
        this.isMuted = false;
        this.bgVolume = 0.5;
        this.sfxVolume = 0.7;

        // Component Lifecycle & Scaling Animation States[cite: 4]
        this.state = 'OFFSCREEN'; // OFFSCREEN, POPPING_IN, ACTIVE, POPPING_OUT
        this.scale = 0;
        this.targetScale = 0;
        this.time = 0;

        // Interactive Drag & Hover States[cite: 4]
        this.draggingBG = false;
        this.draggingSFX = false;
        this.hoveredElement = null; // 'exit', 'mute', 'bgSlider', 'sfxSlider'

        // 1. INSTANTIATE ARCADEBUTTONS
        // Utilizes your codebase's standard ArcadeButton modules for absolute styling consistency[cite: 2, 6]
        this.achievementsButton = new ArcadeButton({
            text: 'ACHIEVEMENTS',
            themeColor: '#ff9800', // Neon Orange[cite: 4]
            glowColor: '#ffb020'
        });

        this.helpButton = new ArcadeButton({
            text: 'HELP',
            themeColor: '#39ff14', // Glowing Cyber Green[cite: 4]
            glowColor: '#00ff66'
        });

        this.creditsButton = new ArcadeButton({
            text: 'CREDITS',
            themeColor: '#2196f3', // Electric Blue[cite: 4]
            glowColor: '#00f0ff'
        });

        // Track modular buttons inside a localized registry loop[cite: 2]
        this.buttons = [this.achievementsButton, this.helpButton, this.creditsButton];

        // Dynamic hitboxes computed on resize[cite: 4]
        this.hitboxes = {};

        // Trigger initial layout configuration
        this.resize(this.width, this.height);
    }

    show() {
        this.state = 'POPPING_IN';
        this.scale = 0;
        this.targetScale = 1.12; // Initial snap-pop spring overshoot[cite: 4]
    }

    hide() {
        this.state = 'POPPING_OUT';
        this.targetScale = 1.15; // Swell overshoot animation[cite: 4]

        this.isHidingInitiated = true;
        this.hideTimer = 0.08;
    }

    isoffscreen() {
        return this.state === 'OFFSCREEN'; //[cite: 4]
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end; //[cite: 4]
    }

    // Helper to evaluate center-relative axis alignment intersections[cite: 4]
    isPointInLocalRect(lx, ly, rx, ry, rw, rh) {
        return lx > rx - rw / 2 &&
            lx < rx + rw / 2 &&
            ly > ry - rh / 2 &&
            ly < ry + rh / 2;
    }

    // Maps global canvas coordinates to scale-independent center-relative space[cite: 4]
    getCenterRelativeMouse(localX, localY) {
        if (this.scale < 0.01) return { x: 0, y: 0 };
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (localX - cx) / this.scale,
            y: (localY - cy) / this.scale
        };
    }

    // Responsive sizing engine - seamlessly handles Mobile, Tablet, and Desktop breakpoints[cite: 4]
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Establish core scaling ratios
        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.75), 1.25);

        // Fluid panel dimensions (Vertical layout prioritizes stack breathing room)[cite: 4]
        if (width < 480) {
            // Mobile (Grows vertically to accommodate massive, touch-friendly buttons)[cite: 4]
            this.dialogWidth = Math.min(width * 0.94, 340);
            this.dialogHeight = Math.min(height * 0.94, 530);
            this.isMobile = true;
        } else if (width < 768) {
            // Tablet
            this.dialogWidth = 440 * this.scaleFactor;
            this.dialogHeight = 540 * this.scaleFactor;
            this.isMobile = false;
        } else {
            // Desktop
            this.dialogWidth = 480 * this.scaleFactor;
            this.dialogHeight = 580 * this.scaleFactor;
            this.isMobile = false;
        }

        // Clamp boundaries to preserve optimal rectangular proportions[cite: 4]
        this.dialogWidth = Math.max(290, Math.min(600, this.dialogWidth));
        this.dialogHeight = Math.max(480, Math.min(620, this.dialogHeight));

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // Proportional row splits (Center-relative Y metrics)
        this.row1Y = -dh * 0.28; // Mute option row
        this.row2Y = -dh * 0.10; // Music volume slider row (extra spacing)
        this.row3Y = dh * 0.08;  // SFX volume slider row (extra spacing)

        // Stacked Bottom Buttons vertical offsets[cite: 4]
        this.row4Y_1 = dh * 0.23; // Achievements
        this.row4Y_2 = dh * 0.33; // Help
        this.row4Y_3 = dh * 0.43; // Credits

        // Chunky button widths spanning nearly the entire width of the settings frame[cite: 4]
        const btnW = dw * 0.85;
        const btnH = this.isMobile ? 38 : 42 * this.scaleFactor;

        // Position our ArcadeButtons in center-relative space[cite: 2, 6]
        this.achievementsButton.setPosition(0, this.row4Y_1, btnW, btnH, this.scaleFactor);
        this.helpButton.setPosition(0, this.row4Y_2, btnW, btnH, this.scaleFactor);
        this.creditsButton.setPosition(0, this.row4Y_3, btnW, btnH, this.scaleFactor);

        // Define hit-testing geometry arrays[cite: 4]
        this.hitboxes = {
            exit: {
                x: dw / 2 - 22,
                y: -dh / 2 + 22,
                w: 24,
                h: 24
            },
            mute: {
                x: dw * 0.18,
                y: this.row1Y,
                w: 140, // Much wider interactive touch and visual toggle zone
                h: 44
            },
            bgSlider: {
                x: 0, // Centered bar
                y: this.row2Y + 8, // Bar positioned offset below label
                w: dw * 0.84, // Much wider interactive click zone matching layout width
                h: 36, // Chunkier mouse grab window
                startX: -dw * 0.42,
                width: dw * 0.84
            },
            sfxSlider: {
                x: 0, // Centered bar
                y: this.row3Y + 8, // Bar positioned offset below label
                w: dw * 0.84,
                h: 36,
                startX: -dw * 0.42,
                width: dw * 0.84
            }
        };
    }

    // handleMouseMove tracks mouse coordinates dynamically[cite: 1, 4]
    handleMouseMove(localX, localY) {
        if (this.state === 'OFFSCREEN') return;

        const local = this.getCenterRelativeMouse(localX, localY);
        const bgBox = this.hitboxes.bgSlider;
        const sfxBox = this.hitboxes.sfxSlider;

        // Continuous dragging calculation updates (uses safe mouse down/up states)
        if (this.draggingBG) {
            const val = (local.x - bgBox.startX) / bgBox.width;
            this.bgVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('bg', this.bgVolume); //[cite: 4]
        } else if (this.draggingSFX) {
            const val = (local.x - sfxBox.startX) / sfxBox.width;
            this.sfxVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('sfx', this.sfxVolume); //[cite: 4]
        }

        // Handle standard interactive hit detection
        this.hoveredElement = null;
        for (const [key, box] of Object.entries(this.hitboxes)) {
            if (this.isPointInLocalRect(local.x, local.y, box.x, box.y, box.w, box.h)) {
                this.hoveredElement = key;
                break;
            }
        }

        // Forward coordinates directly to physical components[cite: 2]
        this.buttons.forEach(btn => btn.handleMouseMove(local.x, local.y)); //[cite: 2]
    }

    handleMouseDown(localX, localY) {
        if (this.state !== 'ACTIVE') return;
        const local = this.getCenterRelativeMouse(localX, localY);

        const bgBox = this.hitboxes.bgSlider;
        const sfxBox = this.hitboxes.sfxSlider;

        if (this.hoveredElement === 'exit') {
            this.hide();
            this.onClose(); //[cite: 4]
        } else if (this.hoveredElement === 'mute') {
            this.isMuted = !this.isMuted;
            this.onVolumeChange('mute', this.isMuted); //[cite: 4]
        } else if (this.hoveredElement === 'bgSlider') {
            this.draggingBG = true;
            const val = (local.x - bgBox.startX) / bgBox.width;
            this.bgVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('bg', this.bgVolume); //[cite: 4]
        } else if (this.hoveredElement === 'sfxSlider') {
            this.draggingSFX = true;
            const val = (local.x - sfxBox.startX) / sfxBox.width;
            this.sfxVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('sfx', this.sfxVolume); //[cite: 4]
        }

        // Forward mouse press events down[cite: 2]
        this.buttons.forEach(btn => btn.handleMouseDown(local.x, local.y)); //[cite: 2]
    }

    handleMouseUp(localX, localY) {
        this.draggingBG = false;
        this.draggingSFX = false;

        if (this.state !== 'ACTIVE') return;
        const local = this.getCenterRelativeMouse(localX, localY);

        // Resolve modular releases[cite: 2]
        this.achievementsButton.handleMouseUp(local.x, local.y, () => {
            this.onAchievements(); //[cite: 4]
        });
        this.helpButton.handleMouseUp(local.x, local.y, () => {
            this.onHelp(); //[cite: 4]
        });
        this.creditsButton.handleMouseUp(local.x, local.y, () => {
            this.onCredits(); //[cite: 4]
        });
    }

    handleMouseClick(localX, localY) {
        // Redundant click hook omitted to avoid double-firing bugs on click routing[cite: 1]
    }

    getCursorStyle() {
        // Check hover scale offset states[cite: 2]
        const isButtonHovered = this.buttons.some(btn => btn.scale > 1.01 || btn.targetScale > 1.0);
        return (this.hoveredElement || isButtonHovered) && this.state === 'ACTIVE' ? 'pointer' : 'default'; //[cite: 4]
    }

    update(dt) {
        if (this.state === 'OFFSCREEN') return; //[cite: 4]

        const dtRatio = dt * 60;
        this.time += 0.05 * dtRatio;

        const lerpFactor = 1 - Math.pow(1 - 0.22, dtRatio);
        this.scale = this.lerp(this.scale, this.targetScale, lerpFactor); //[cite: 4]

        if (this.isHidingInitiated) {
            this.hideTimer -= dt;
            if (this.hideTimer <= 0) {
                this.isHidingInitiated = false;
                this.targetScale = 0;
            }
        }

        if (this.state === 'POPPING_IN') {
            if (Math.abs(this.scale - 1.12) < 0.02) {
                this.targetScale = 1.0;
                this.state = 'ACTIVE';
            }
        }

        if (this.state === 'POPPING_OUT' && this.scale < 0.04) {
            this.state = 'OFFSCREEN';
            this.scale = 0;
        }

        // Tick internal animations on nested buttons[cite: 2]
        this.buttons.forEach(btn => btn.update(dt)); //[cite: 2]
    }

    draw(ctx, x, y) {
        if (this.state === 'OFFSCREEN') return; //[cite: 4]

        // Solid background layout mask (70% opacity)[cite: 4]
        ctx.fillStyle = 'rgba(10, 10, 14, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.scale, this.scale);

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // 1. NEO-BRUTALIST FLAT GLOW SHADOW (Neon pink offset shadow)[cite: 4]
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-dw / 2 + 8, -dh / 2 + 8, dw, dh);

        // 2. MAIN RETRO SCREEN CASE[cite: 4]
        ctx.fillStyle = '#0a0a0c';
        ctx.strokeStyle = '#00f0ff'; // Phosphor Cyan Outline[cite: 4]
        ctx.lineWidth = 4;
        ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
        ctx.strokeRect(-dw / 2, -dh / 2, dw, dh);

        // 3. CRT SCREEN SCANLINES
        ctx.save();
        ctx.beginPath();
        ctx.rect(-dw / 2, -dh / 2, dw, dh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
        ctx.lineWidth = 1;
        for (let sy = -dh / 2; sy < dh / 2; sy += 3) {
            ctx.beginPath();
            ctx.moveTo(-dw / 2, sy);
            ctx.lineTo(dw / 2, sy);
            ctx.stroke();
        }
        ctx.restore();

        // 4. TECH BRACKETS
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)'; //[cite: 4]
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 8, 2);
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 2, 8);
        ctx.fillRect(dw / 2 - 18, -dh / 2 + 10, 8, 2);
        ctx.fillRect(dw / 2 - 12, -dh / 2 + 10, 2, 8);

        // 5. HEADER (Uses the same font as the start / neon buttons!)[cite: 5, 6]
        ctx.fillStyle = '#ffffff'; //[cite: 4]
        ctx.font = `bold ${Math.round(24 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = this.hoveredElement ? 4 : 0;
        ctx.fillText('SETTINGS', 0, -dh / 2 + 35); //[cite: 4]
        ctx.shadowBlur = 0;

        // Brutalist neon divider bar[cite: 4]
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-dw * 0.42, -dh / 2 + 58);
        ctx.lineTo(dw * 0.42, -dh / 2 + 58);
        ctx.stroke();

        // 6. BRUTALIST CLOSE WINDOW CORNER CORNER BOX[cite: 4]
        const exBox = this.hitboxes.exit;
        ctx.save();
        ctx.translate(exBox.x, exBox.y);

        const isExitHovered = this.hoveredElement === 'exit';
        const exitOffset = isExitHovered ? 1.5 : 4;

        ctx.fillStyle = '#ff007f'; //[cite: 4]
        ctx.fillRect(-exBox.w / 2 + 4, -exBox.h / 2 + 4, exBox.w, exBox.h);

        ctx.fillStyle = isExitHovered ? '#ff0055' : '#121214'; //[cite: 4]
        ctx.strokeStyle = isExitHovered ? '#ffffff' : '#ff007f'; //[cite: 4]
        ctx.lineWidth = 2.5;
        ctx.fillRect(-exBox.w / 2 + exitOffset, -exBox.h / 2 + exitOffset, exBox.w, exBox.h);
        ctx.strokeRect(-exBox.w / 2 + exitOffset, -exBox.h / 2 + exitOffset, exBox.w, exBox.h);

        ctx.strokeStyle = '#ffffff'; //[cite: 4]
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4 + exitOffset, -4 + exitOffset); ctx.lineTo(4 + exitOffset, 4 + exitOffset);
        ctx.moveTo(4 + exitOffset, -4 + exitOffset); ctx.lineTo(-4 + exitOffset, 4 + exitOffset);
        ctx.stroke();
        ctx.restore();

        // Standard Row Typography
        ctx.fillStyle = '#ffffff'; //[cite: 4]
        ctx.font = `bold ${Math.round(12 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'left';

        // ─────────────────────────────────────────────────────────
        // ROW 1: MUTE SYSTEM
        // ─────────────────────────────────────────────────────────
        ctx.fillText('MUTE ALL AUDIO', -dw * 0.4, this.row1Y); //[cite: 4]

        const muteBox = this.hitboxes.mute;
        ctx.save();
        ctx.translate(muteBox.x, muteBox.y);

        // Solid track backing[cite: 4]
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff'; //[cite: 4]
        ctx.lineWidth = 3;
        ctx.fillRect(-muteBox.w / 2, -muteBox.h / 2, muteBox.w, muteBox.h);
        ctx.strokeRect(-muteBox.w / 2, -muteBox.h / 2, muteBox.w, muteBox.h);

        // Backdrop indicator text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LIVE', -muteBox.w / 4, 0);
        ctx.fillText('MUTED', muteBox.w / 4, 0);

        // Slide Handle Block
        const handleW = muteBox.w / 2 - 6;
        const handleH = muteBox.h - 8;
        const toggleTargetX = this.isMuted ? (muteBox.w / 4) : (-muteBox.w / 4);

        // Giant active sliding neon warning toggle block[cite: 4]
        ctx.fillStyle = this.isMuted ? '#ff007f' : '#39ff14'; // Pink for Mute-On, Cyan/Green for Mute-Off[cite: 4]
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(toggleTargetX - handleW / 2, -handleH / 2, handleW, handleH);
        ctx.strokeRect(toggleTargetX - handleW / 2, -handleH / 2, handleW, handleH);

        // Handle Switch Label
        ctx.fillStyle = '#000000'; //[cite: 4]
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillText(this.isMuted ? 'ON' : 'OFF', toggleTargetX, 0); //[cite: 4]
        ctx.restore();

        // ─────────────────────────────────────────────────────────
        // ROW 2 & 3: SLIDER INPUT PLATES (Music & SFX)
        // ─────────────────────────────────────────────────────────
        const drawSlider = (label, value, yPos, isHovered, isDragging, key) => {
            const sBox = this.hitboxes[key];

            // 1. Monospace option label on TOP[cite: 4]
            ctx.fillStyle = '#ffffff'; //[cite: 4]
            ctx.font = `bold ${Math.round(13 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.textAlign = 'left';
            ctx.fillText(label, sBox.startX, yPos - 18);

            // 2. Chunky, heavy slide bar on BOTTOM[cite: 4]
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#1e293b'; //[cite: 4]
            ctx.lineWidth = 3;
            ctx.fillRect(sBox.startX, yPos - 8, sBox.width, 16); // Thicker chunky track frame
            ctx.strokeRect(sBox.startX, yPos - 8, sBox.width, 16);

            // Audio Level Neon Progress Bar
            if (value > 0) {
                const fillWidth = value * sBox.width;
                const grad = ctx.createLinearGradient(sBox.startX, 0, sBox.startX + fillWidth, 0);
                if (key === 'bgSlider') {
                    grad.addColorStop(0, '#ff007f'); // Magenta Neon[cite: 4]
                    grad.addColorStop(1, '#ff00aa');
                } else {
                    grad.addColorStop(0, '#00f0ff'); // Cyan to electric green[cite: 4]
                    grad.addColorStop(1, '#39ff14');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(sBox.startX + 1.5, yPos - 6.5, fillWidth - 3, 13); // Chunky interior progression
            }

            // High-fidelity tuning tick-marks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; //[cite: 4]
            ctx.lineWidth = 1;
            for (let step = 1; step < 10; step++) {
                const tickX = sBox.startX + (sBox.width / 10) * step;
                ctx.beginPath();
                ctx.moveTo(tickX, yPos - 7);
                ctx.lineTo(tickX, yPos + 7);
                ctx.stroke();
            }

            // Tactical Heavy Diamond Slider Handle (Cabinet style)
            const handleX = sBox.startX + value * sBox.width;
            ctx.save();
            ctx.translate(handleX, yPos);
            ctx.rotate(Math.PI / 4); // Diamond transform

            if (isHovered || isDragging) {
                ctx.shadowColor = (key === 'bgSlider') ? '#ff007f' : '#00f0ff'; //[cite: 4]
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ffffff'; //[cite: 4]
                ctx.strokeStyle = (key === 'bgSlider') ? '#ff007f' : '#00f0ff'; //[cite: 4]
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#ffffff'; //[cite: 4]
                ctx.strokeStyle = '#000000'; //[cite: 4]
                ctx.lineWidth = 2.5;
            }

            const ds = 10 * this.scaleFactor; // Scaled chunkier diamond handle (was 7)
            ctx.fillRect(-ds, -ds, ds * 2, ds * 2);
            ctx.strokeRect(-ds, -ds, ds * 2, ds * 2);
            ctx.restore();

            // Active digital readouts
            ctx.fillStyle = (key === 'bgSlider') ? '#ff007f' : '#00f0ff'; //[cite: 4]
            ctx.font = `bold ${Math.round(11 * this.scaleFactor)}px "Courier New", Courier, monospace`;
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(value * 100)}%`, sBox.startX + sBox.width, yPos - 18); // Moved aligned neatly next to label on top
        };

        drawSlider('MUSIC VOLUME', this.bgVolume, this.row2Y, this.hoveredElement === 'bgSlider', this.draggingBG, 'bgSlider'); //[cite: 4]
        drawSlider('SFX VOLUME', this.sfxVolume, this.row3Y, this.hoveredElement === 'sfxSlider', this.draggingSFX, 'sfxSlider'); //[cite: 4]

        // Cyber Bottom Panel Separator[cite: 4]
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-dw * 0.42, dh * 0.15);
        ctx.lineTo(dw * 0.42, dh * 0.15);
        ctx.stroke();

        // ─────────────────────────────────────────────────────────
        // ROW 4: DRAW STACKED VERTICAL ARCADEBUTTONS
        // ─────────────────────────────────────────────────────────
        // Renders each customized modular button stacked in center-relative space[cite: 2, 4]
        this.buttons.forEach(btn => btn.draw(ctx)); //[cite: 2]

        ctx.restore();
    }
}