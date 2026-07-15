class SettingsPopup {
    constructor(config = {}, callbacks = {}) {
        // Dimensions defined via configuration object
        this.width = config.width || 460;
        this.height = config.height || 400;
        
        // Callbacks
        this.onAchievements = callbacks.onAchievements || (() => {});
        this.onHelp = callbacks.onHelp || (() => {}); // Added Help callback
        this.onCredits = callbacks.onCredits || (() => {});
        this.onClose = callbacks.onClose || (() => {});
        this.onVolumeChange = callbacks.onVolumeChange || (() => {});

        // Default Volume States
        this.isMuted = false;
        this.bgVolume = 0.5;
        this.sfxVolume = 0.7;

        // Component State
        this.state = 'OFFSCREEN'; // OFFSCREEN, POPPING_IN, ACTIVE, POPPING_OUT
        this.scale = 0;
        this.targetScale = 0;
        this.time = 0;

        // Interactive Drag States
        this.draggingBG = false;
        this.draggingSFX = false;
        this.hoveredElement = null; // 'exit', 'mute', 'bgSlider', 'sfxSlider', 'achievements', 'help', 'credits'
    }

    show() {
        this.state = 'POPPING_IN';
        this.scale = 0;
        this.targetScale = 1.12; // Initial juice overshoot animation
    }

    hide() {
        this.state = 'POPPING_OUT';
        this.targetScale = 1.15; // Quick swell juice animation
        
        // Use time-delta based checks instead of hardcoded setTimeouts inside update()
        this.isHidingInitiated = true;
        this.hideTimer = 0.08; // 80ms animation sequence window
    }

    isoffscreen() {
        return this.state === 'OFFSCREEN';
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    // Helper to check standard rectangular buttons in local space
    isPointInLocalRect(lx, ly, rx, ry, rw, rh) {
        return lx > rx - rw / 2 && 
               lx < rx + rw / 2 && 
               ly > ry - rh / 2 && 
               ly < ry + rh / 2;
    }

    // Translates incoming layout-space coordinates to center-relative animation space
    getCenterRelativeMouse(localX, localY) {
        if (this.scale < 0.01) return { x: 0, y: 0 };
        const cx = this.width / 2;
        const cy = this.height / 2;
        return {
            x: (localX - cx) / this.scale,
            y: (localY - cy) / this.scale
        };
    }

    // Expose standard input hooks
    handleMouseMove(localX, localY, isMouseDown = false) {
        if (this.state === 'OFFSCREEN') return;

        const local = this.getCenterRelativeMouse(localX, localY);

        // Handle active continuous dragging transformations
        if (isMouseDown) {
            if (this.draggingBG) {
                const val = (local.x - (-40)) / 200;
                this.bgVolume = Math.max(0, Math.min(1, val));
                this.onVolumeChange('bg', this.bgVolume);
            } else if (this.draggingSFX) {
                const val = (local.x - (-40)) / 200;
                this.sfxVolume = Math.max(0, Math.min(1, val));
                this.onVolumeChange('sfx', this.sfxVolume);
            }
        } else {
            this.draggingBG = false;
            this.draggingSFX = false;
        }

        this.hoveredElement = null;

        // 1. Exit Button Circle Boundary
        const dx = local.x - 200;
        const dy = local.y - (-170);
        if (dx * dx + dy * dy < 14 * 14) {
            this.hoveredElement = 'exit';
        }
        // 2. Mute Toggle Pill
        else if (this.isPointInLocalRect(local.x, local.y, 90, -90, 60, 24)) {
            this.hoveredElement = 'mute';
        }
        // 3. BG Volume Hitbox
        else if (this.isPointInLocalRect(local.x, local.y, 60, -30, 220, 24)) {
            this.hoveredElement = 'bgSlider';
        }
        // 4. SFX Volume Hitbox
        else if (this.isPointInLocalRect(local.x, local.y, 60, 30, 220, 24)) {
            this.hoveredElement = 'sfxSlider';
        }
        // 5. Achievements Button (x: -125, y: 110, width: 110, height: 40)
        else if (this.isPointInLocalRect(local.x, local.y, -125, 110, 110, 40)) {
            this.hoveredElement = 'achievements';
        }
        // 6. Help Button (x: 0, y: 110, width: 110, height: 40)
        else if (this.isPointInLocalRect(local.x, local.y, 0, 110, 110, 40)) {
            this.hoveredElement = 'help';
        }
        // 7. Credits Button (x: 125, y: 110, width: 110, height: 40)
        else if (this.isPointInLocalRect(local.x, local.y, 125, 110, 110, 40)) {
            this.hoveredElement = 'credits';
        }
    }

    handleMouseDown(localX, localY) {
        if (this.state !== 'ACTIVE') return;
        const local = this.getCenterRelativeMouse(localX, localY);

        if (this.hoveredElement === 'exit') {
            this.hide();
            this.onClose();
        } else if (this.hoveredElement === 'mute') {
            this.isMuted = !this.isMuted;
            this.onVolumeChange('mute', this.isMuted);
        } else if (this.hoveredElement === 'bgSlider') {
            this.draggingBG = true;
            const val = (local.x - (-40)) / 200;
            this.bgVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('bg', this.bgVolume);
        } else if (this.hoveredElement === 'sfxSlider') {
            this.draggingSFX = true;
            const val = (local.x - (-40)) / 200;
            this.sfxVolume = Math.max(0, Math.min(1, val));
            this.onVolumeChange('sfx', this.sfxVolume);
        } else if (this.hoveredElement === 'achievements') {
            this.onAchievements();
        } else if (this.hoveredElement === 'help') {
            this.onHelp();
        } else if (this.hoveredElement === 'credits') {
            this.onCredits();
        }
    }

    handleMouseUp() {
        this.draggingBG = false;
        this.draggingSFX = false;
    }

    getCursorStyle() {
        return (this.hoveredElement && this.state === 'ACTIVE') ? 'pointer' : 'default';
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
    }

    draw(ctx, x, y) {
        if (this.state === 'OFFSCREEN') return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, this.width, this.height);

        ctx.save();
        ctx.translate(x + this.width / 2, y + this.height / 2);
        ctx.scale(this.scale, this.scale);

        // Drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2 + 8, this.width, this.height, 15);
        ctx.fill();

        // Dialog Panel Window Box
        ctx.fillStyle = '#2b2b2b';
        ctx.strokeStyle = '#3e3e3e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 15);
        ctx.fill();
        ctx.stroke();

        // Header Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SETTINGS', 0, -145);

        // Header Border Accent Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-180, -115);
        ctx.lineTo(180, -115);
        ctx.stroke();

        // Exit Button
        ctx.save();
        ctx.translate(200, -170);
        if (this.hoveredElement === 'exit') {
            ctx.scale(1.15, 1.15);
            ctx.fillStyle = '#ff3333';
        } else {
            ctx.fillStyle = '#e81123';
        }
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-5, -5); ctx.lineTo(5, 5);
        ctx.moveTo(5, -5); ctx.lineTo(-5, 5);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#dddddd';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';

        // --- ROW 1: Mute ---
        ctx.fillText('MUTE ALL AUDIO', -180, -90);
        ctx.save();
        ctx.translate(90, -90);
        ctx.fillStyle = this.isMuted ? '#FF9800' : '#454545';
        ctx.beginPath();
        ctx.roundRect(-30, -12, 60, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.isMuted ? 16 : -16, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- ROW 2: Music volume ---
        ctx.fillText('MUSIC VOLUME', -180, -30);
        ctx.strokeStyle = '#454545';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-40, -30);
        ctx.lineTo(160, -30);
        ctx.stroke();

        if (this.bgVolume > 0) {
            ctx.strokeStyle = '#2196F3';
            ctx.beginPath();
            ctx.moveTo(-40, -30);
            ctx.lineTo(-40 + this.bgVolume * 200, -30);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(-40 + this.bgVolume * 200, -30);
        if (this.hoveredElement === 'bgSlider' || this.draggingBG) {
            ctx.scale(1.2, 1.2);
            ctx.fillStyle = '#64b5f6';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- ROW 3: SFX Volume ---
        ctx.fillText('SFX VOLUME', -180, 30);
        ctx.strokeStyle = '#454545';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-40, 30);
        ctx.lineTo(160, 30);
        ctx.stroke();

        if (this.sfxVolume > 0) {
            ctx.strokeStyle = '#2196F3';
            ctx.beginPath();
            ctx.moveTo(-40, 30);
            ctx.lineTo(-40 + this.sfxVolume * 200, 30);
            ctx.stroke();
        }

        ctx.save();
        ctx.translate(-40 + this.sfxVolume * 200, 30);
        if (this.hoveredElement === 'sfxSlider' || this.draggingSFX) {
            ctx.scale(1.2, 1.2);
            ctx.fillStyle = '#64b5f6';
        } else {
            ctx.fillStyle = '#ffffff';
        }
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-180, 70);
        ctx.lineTo(180, 70);
        ctx.stroke();

        // --- ROW 4: Achievements, Help & Credits ---
        
        // Button base settings
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 1. Achievements Button (Left)
        ctx.save();
        ctx.translate(-125, 110);
        if (this.hoveredElement === 'achievements') {
            ctx.scale(1.05, 1.05);
            ctx.fillStyle = '#ffb020';
        } else {
            ctx.fillStyle = '#FF9800';
        }
        ctx.beginPath();
        ctx.roundRect(-55, -20, 110, 40, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('ACHIEVEMENTS', 0, 0);
        ctx.restore();

        // 2. Help Button (Middle)
        ctx.save();
        ctx.translate(0, 110);
        if (this.hoveredElement === 'help') {
            ctx.scale(1.05, 1.05);
            ctx.fillStyle = '#66bb6a'; // Light emerald
        } else {
            ctx.fillStyle = '#4CAF50'; // Emerald green
        }
        ctx.beginPath();
        ctx.roundRect(-55, -20, 110, 40, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('HELP', 0, 0);
        ctx.restore();

        // 3. Credits Button (Right)
        ctx.save();
        ctx.translate(125, 110);
        if (this.hoveredElement === 'credits') {
            ctx.scale(1.05, 1.05);
            ctx.fillStyle = '#42a5f5';
        } else {
            ctx.fillStyle = '#2196F3';
        }
        ctx.beginPath();
        ctx.roundRect(-55, -20, 110, 40, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CREDITS', 0, 0);
        ctx.restore();

        ctx.restore();
    }
}