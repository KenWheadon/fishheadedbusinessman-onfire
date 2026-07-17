class SettingsPopup {
    constructor(config = {}, callbacks = {}) {
        // Core dimensions populated dynamically via GameManager resize loops
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scaleFactor = 1.0;

        // Dynamic Dialog Panel Box Dimensions (Increased defaults to match larger popup size)
        this.dialogWidth = 540;
        this.dialogHeight = 660;
        this.isMobile = false;

        // Callbacks
        this.onAchievements = callbacks.onAchievements || (() => { });
        this.onHelp = callbacks.onHelp || (() => { });
        this.onCredits = callbacks.onCredits || (() => { });
        this.onClose = callbacks.onClose || (() => { });
        this.onVolumeChange = callbacks.onVolumeChange || (() => { });

        // Default Volume States
        this.isMuted = false;
        this.bgVolume = 0.5;
        this.sfxVolume = 0.7;

        // Component Lifecycle & Scaling Animation States
        this.state = 'OFFSCREEN'; // OFFSCREEN, POPPING_IN, ACTIVE, POPPING_OUT
        this.scale = 0;
        this.targetScale = 0;
        this.time = 0;

        // Interactive Drag & Hover States
        this.draggingBG = false;
        this.draggingSFX = false;
        this.hoveredElement = null; // 'mute', 'bgSlider', 'sfxSlider'

        // 1. INSTANTIATE MODULAR BUTTONS
        this.achievementsButton = new ArcadeButton({
            text: 'ACHIEVEMENTS',
            themeColor: '#ff9800', // Neon Orange
            glowColor: '#ffb020'
        });

        this.helpButton = new ArcadeButton({
            text: 'HELP',
            themeColor: '#39ff14', // Glowing Cyber Green
            glowColor: '#00ff66'
        });

        this.creditsButton = new ArcadeButton({
            text: 'CREDITS',
            themeColor: '#2196f3', // Electric Blue
            glowColor: '#00f0ff'
        });

        // 2. INSTANTIATE EXTRACTED CLOSE BUTTON
        this.closeButton = new CloseButton({ size: 24 });

        this.buttons = [this.achievementsButton, this.helpButton, this.creditsButton];

        // Dynamic hitboxes computed on resize
        this.hitboxes = {};

        // Trigger initial layout configuration
        this.resize(this.width, this.height);
    }

    show() {
        this.state = 'POPPING_IN';
        this.scale = 0;
        this.targetScale = 1.12; // Initial snap-pop spring overshoot
    }

    hide() {
        this.state = 'POPPING_OUT';
        this.targetScale = 1.15; // Swell overshoot animation

        this.isHidingInitiated = true;
        this.hideTimer = 0.08;
    }

    isoffscreen() {
        return this.state === 'OFFSCREEN';
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    // Helper to evaluate center-relative axis alignment intersections
    isPointInLocalRect(lx, ly, rx, ry, rw, rh) {
        return lx > rx - rw / 2 &&
            lx < rx + rw / 2 &&
            ly > ry - rh / 2 &&
            ly < ry + rh / 2;
    }

    // Maps global canvas coordinates to scale-independent center-relative space
    getCenterRelativeMouse(localX, localY) {
        if (this.scale < 0.01) return { x: 0, y: 0 };
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (localX - cx) / this.scale,
            y: (localY - cy) / this.scale
        };
    }

    // Responsive sizing engine - seamlessly handles Mobile, Tablet, and Desktop breakpoints
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Establish core scaling ratios
        const baseScale = Math.min(width / 800, height / 600);
        this.scaleFactor = Math.min(Math.max(baseScale, 0.75), 1.25);

        // Fluid panel dimensions (Vertical layout prioritizes stack breathing room)
        if (width < 480) {
            // Mobile (Grows vertically to accommodate massive, touch-friendly buttons)
            this.dialogWidth = Math.min(width * 0.94, 380); // Increased from 340
            this.dialogHeight = Math.min(height * 0.94, 580); // Increased from 530
            this.isMobile = true;
        } else if (width < 768) {
            // Tablet
            this.dialogWidth = 480 * this.scaleFactor; // Increased from 440
            this.dialogHeight = 600 * this.scaleFactor; // Increased from 540
            this.isMobile = false;
        } else {
            // Desktop
            this.dialogWidth = 540 * this.scaleFactor; // Increased from 480
            this.dialogHeight = 660 * this.scaleFactor; // Increased from 580
            this.isMobile = false;
        }

        // Clamp boundaries to preserve optimal rectangular proportions
        this.dialogWidth = Math.max(320, Math.min(700, this.dialogWidth)); // Increased clamps
        this.dialogHeight = Math.max(520, Math.min(780, this.dialogHeight)); // Increased clamps

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // Proportional row splits (Center-relative Y metrics)
        this.row1Y = -dh * 0.28; // Mute option row
        this.row2Y = -dh * 0.10; // Music volume slider row
        this.row3Y = dh * 0.08;  // SFX volume slider row

        // Stacked Bottom Buttons vertical offsets (Adjusted layout multiplier steps to match tall buttons)
        this.row4Y_1 = dh * 0.22; // Achievements (Adjusted to 0.22)
        this.row4Y_2 = dh * 0.33; // Help
        this.row4Y_3 = dh * 0.44; // Credits (Adjusted to 0.44)

        // Chunky button widths spanning nearly the entire width of the settings frame
        const btnW = dw * 0.85;
        const btnH = this.isMobile ? 48 : 54 * this.scaleFactor; // Increased from 38 / 42

        // Position our ArcadeButtons in center-relative space
        this.achievementsButton.setPosition(0, this.row4Y_1, btnW, btnH, this.scaleFactor);
        this.helpButton.setPosition(0, this.row4Y_2, btnW, btnH, this.scaleFactor);
        this.creditsButton.setPosition(0, this.row4Y_3, btnW, btnH, this.scaleFactor);

        // Position Close Button in corner
        this.closeButton.setPosition(dw / 2 - 22, -dh / 2 + 22, 24, this.scaleFactor);

        // Define hit-testing geometry arrays (Close button hit checks are fully handled by the closeButton class)
        this.hitboxes = {
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
                h: 48, // Increased slider height from 36 (thicker grab area)
                startX: -dw * 0.42,
                width: dw * 0.84
            },
            sfxSlider: {
                x: 0, // Centered bar
                y: this.row3Y + 8, // Bar positioned offset below label
                w: dw * 0.84,
                h: 48, // Increased slider height from 36
                startX: -dw * 0.42,
                width: dw * 0.84
            }
        };
    }

    // handleMouseMove tracks mouse coordinates dynamically
    handleMouseMove(localX, localY) {
        if (this.state === 'OFFSCREEN') return;

        const local = this.getCenterRelativeMouse(localX, localY);
        const bgBox = this.hitboxes.bgSlider;
        const sfxBox = this.hitboxes.sfxSlider;

        // Continuous dragging calculation updates (uses safe mouse down/up states)
        if (this.draggingBG) {
            const val = (local.x - bgBox.startX) / bgBox.width;
            this.bgVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('bg', this.bgVolume);
        } else if (this.draggingSFX) {
            const val = (local.x - sfxBox.startX) / sfxBox.width;
            this.sfxVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('sfx', this.sfxVolume);
        }

        // Handle standard interactive hit detection
        this.hoveredElement = null;
        for (const [key, box] of Object.entries(this.hitboxes)) {
            if (this.isPointInLocalRect(local.x, local.y, box.x, box.y, box.w, box.h)) {
                this.hoveredElement = key;
                break;
            }
        }

        // Forward mouse positions directly to components
        this.closeButton.handleMouseMove(local.x, local.y);
        this.buttons.forEach(btn => btn.handleMouseMove(local.x, local.y));
    }

    handleMouseDown(localX, localY) {
        if (this.state !== 'ACTIVE') return;
        const local = this.getCenterRelativeMouse(localX, localY);

        const bgBox = this.hitboxes.bgSlider;
        const sfxBox = this.hitboxes.sfxSlider;

        // Route interactions to close button
        this.closeButton.handleMouseDown(local.x, local.y);

        if (this.hoveredElement === 'mute') {
            this.isMuted = !this.isMuted;
            this.onVolumeChange('mute', this.isMuted);
        } else if (this.hoveredElement === 'bgSlider') {
            this.draggingBG = true;
            const val = (local.x - bgBox.startX) / bgBox.width;
            this.bgVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('bg', this.bgVolume);
        } else if (this.hoveredElement === 'sfxSlider') {
            this.draggingSFX = true;
            const val = (local.x - sfxBox.startX) / sfxBox.width;
            this.sfxVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('sfx', this.sfxVolume);
        }

        // Forward mouse press events down
        this.buttons.forEach(btn => btn.handleMouseDown(local.x, local.y));
    }

    handleMouseUp(localX, localY) {
        this.draggingBG = false;
        this.draggingSFX = false;

        if (this.state !== 'ACTIVE') return;
        const local = this.getCenterRelativeMouse(localX, localY);

        // Resolve close button click trigger
        this.closeButton.handleMouseUp(local.x, local.y, () => {
            this.hide();
            this.onClose();
        });

        // Resolve modular releases
        this.achievementsButton.handleMouseUp(local.x, local.y, () => {
            this.onAchievements();
        });
        this.helpButton.handleMouseUp(local.x, local.y, () => {
            this.onHelp();
        });
        this.creditsButton.handleMouseUp(local.x, local.y, () => {
            this.onCredits();
        });
    }

    handleMouseClick(localX, localY) {
        // Redundant click hook omitted to avoid double-firing bugs on click routing
    }

    getCursorStyle() {
        // Check hover scale offset states
        const isButtonHovered = this.buttons.some(btn => btn.scale > 1.01 || btn.targetScale > 1.0);
        const isMuteHovered = this.hoveredElement === 'mute';
        const isSliderHovered = this.hoveredElement === 'bgSlider' || this.hoveredElement === 'sfxSlider';
        const isCloseHovered = this.closeButton.isHovered;

        return (isCloseHovered || isMuteHovered || isSliderHovered || isButtonHovered) && this.state === 'ACTIVE' ? 'pointer' : 'default';
    }

    update(dt) {
        if (this.state === 'OFFSCREEN') return;

        const dtRatio = dt * 60;
        this.time += 0.05 * dtRatio;

        const lerpFactor = 1 - Math.pow(1 - 0.22, dtRatio);
        this.scale = this.lerp(this.scale, this.targetScale, lerpFactor);

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

        // Tick animations on close button and sub-buttons
        this.closeButton.update(dt);
        this.buttons.forEach(btn => btn.update(dt));
    }

    draw(ctx, x, y) {
        if (this.state === 'OFFSCREEN') return;

        // Solid background layout mask (70% opacity)
        ctx.fillStyle = 'rgba(10, 10, 14, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.scale, this.scale);

        const dw = this.dialogWidth;
        const dh = this.dialogHeight;

        // 1. NEO-BRUTALIST FLAT GLOW SHADOW (Neon pink offset shadow)
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(-dw / 2 + 8, -dh / 2 + 8, dw, dh);

        // 2. MAIN RETRO SCREEN CASE
        ctx.fillStyle = '#0a0a0c';
        ctx.strokeStyle = '#00f0ff'; // Phosphor Cyan Outline
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
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 8, 2);
        ctx.fillRect(-dw / 2 + 10, -dh / 2 + 10, 2, 8);
        ctx.fillRect(dw / 2 - 18, -dh / 2 + 10, 8, 2);
        ctx.fillRect(dw / 2 - 12, -dh / 2 + 10, 2, 8);

        // 5. HEADER (Uses the same font as the start / neon buttons!)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(32 * this.scaleFactor)}px "Courier New", Courier, monospace`; // Increased from 24
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = this.closeButton.isHovered ? 4 : 0;
        ctx.fillText('SETTINGS', 0, -dh / 2 + 35);
        ctx.shadowBlur = 0;

        // Brutalist neon divider bar
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-dw * 0.42, -dh / 2 + 58);
        ctx.lineTo(dw * 0.42, -dh / 2 + 58);
        ctx.stroke();

        // 6. DRAW MODULAR CLOSE WINDOW CORNER BOX [ X ]
        this.closeButton.draw(ctx);

        // Standard Row Typography
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(12 * this.scaleFactor)}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'left';

        // ─────────────────────────────────────────────────────────
        // ROW 1: MUTE SYSTEM
        // ─────────────────────────────────────────────────────────
        ctx.fillText('MUTE ALL AUDIO', -dw * 0.4, this.row1Y);

        const muteBox = this.hitboxes.mute;
        ctx.save();
        ctx.translate(muteBox.x, muteBox.y);

        // Solid track backing
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#00f0ff';
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

        // Giant active sliding neon warning toggle block
        ctx.fillStyle = this.isMuted ? '#ff007f' : '#39ff14'; // Pink for Mute-On, Cyan/Green for Mute-Off
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(toggleTargetX - handleW / 2, -handleH / 2, handleW, handleH);
        ctx.strokeRect(toggleTargetX - handleW / 2, -handleH / 2, handleW, handleH);

        // Handle Switch Label
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px "Courier New", monospace';
        ctx.fillText(this.isMuted ? 'ON' : 'OFF', toggleTargetX, 0);
        ctx.restore();

        // ─────────────────────────────────────────────────────────
        // ROW 2 & 3: SLIDER INPUT PLATES (Music & SFX)
        // ─────────────────────────────────────────────────────────
        const drawSlider = (label, value, yPos, isHovered, isDragging, key) => {
            const sBox = this.hitboxes[key];

            // 1. Monospace option label on TOP (Increased font size & clearance padding)
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(18 * this.scaleFactor)}px "Courier New", Courier, monospace`; // Increased from 13
            ctx.textAlign = 'left';
            ctx.fillText(label, sBox.startX, yPos - 22); // Clears the thicker slider bar at -22

            // 2. Chunky, heavy slide bar on BOTTOM (Visually thickened)
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 3;
            ctx.fillRect(sBox.startX, yPos - 12, sBox.width, 24); // Thickened from yPos-8, height 16 -> yPos-12, height 24
            ctx.strokeRect(sBox.startX, yPos - 12, sBox.width, 24);

            // Audio Level Neon Progress Bar
            if (value > 0) {
                const fillWidth = value * sBox.width;
                const grad = ctx.createLinearGradient(sBox.startX, 0, sBox.startX + fillWidth, 0);
                if (key === 'bgSlider') {
                    grad.addColorStop(0, '#ff007f'); // Magenta Neon
                    grad.addColorStop(1, '#ff00aa');
                } else {
                    grad.addColorStop(0, '#00f0ff'); // Cyan to electric green
                    grad.addColorStop(1, '#39ff14');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(sBox.startX + 1.5, yPos - 10.5, fillWidth - 3, 21); // Internally widened from 13 to 21
            }

            // High-fidelity tuning tick-marks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let step = 1; step < 10; step++) {
                const tickX = sBox.startX + (sBox.width / 10) * step;
                ctx.beginPath();
                ctx.moveTo(tickX, yPos - 11); // Stretched tick bounds
                ctx.lineTo(tickX, yPos + 11);
                ctx.stroke();
            }

            // Tactical Heavy Diamond Slider Handle (Cabinet style)
            const handleX = sBox.startX + value * sBox.width;
            ctx.save();
            ctx.translate(handleX, yPos);
            ctx.rotate(Math.PI / 4); // Diamond transform

            if (isHovered || isDragging) {
                ctx.shadowColor = (key === 'bgSlider') ? '#ff007f' : '#00f0ff';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = (key === 'bgSlider') ? '#ff007f' : '#00f0ff';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2.5;
            }

            const ds = 14 * this.scaleFactor; // Scaled chunkier diamond handle (Increased from 10)
            ctx.fillRect(-ds, -ds, ds * 2, ds * 2);
            ctx.strokeRect(-ds, -ds, ds * 2, ds * 2);
            ctx.restore();

            // Active digital readouts (Increased size)
            ctx.fillStyle = (key === 'bgSlider') ? '#ff007f' : '#00f0ff';
            ctx.font = `bold ${Math.round(16 * this.scaleFactor)}px "Courier New", Courier, monospace`; // Increased from 11
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.round(value * 100)}%`, sBox.startX + sBox.width, yPos - 22); // Aligned with the label row
        };

        drawSlider('MUSIC VOLUME', this.bgVolume, this.row2Y, this.hoveredElement === 'bgSlider', this.draggingBG, 'bgSlider');
        drawSlider('SFX VOLUME', this.sfxVolume, this.row3Y, this.hoveredElement === 'sfxSlider', this.draggingSFX, 'sfxSlider');

        // Cyber Bottom Panel Separator
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-dw * 0.42, dh * 0.15);
        ctx.lineTo(dw * 0.42, dh * 0.15);
        ctx.stroke();

        // ─────────────────────────────────────────────────────────
        // ROW 4: DRAW STACKED VERTICAL ARCADEBUTTONS
        // ─────────────────────────────────────────────────────────
        this.buttons.forEach(btn => btn.draw(ctx));

        ctx.restore();
    }
}