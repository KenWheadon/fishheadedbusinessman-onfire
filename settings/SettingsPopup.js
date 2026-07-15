class SettingsPopup {
    constructor(canvasId, callbacks = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Callbacks
        this.onAchievements = callbacks.onAchievements || (() => {});
        this.onCredits = callbacks.onCredits || (() => {});
        this.onClose = callbacks.onClose || (() => {});
        this.onVolumeChange = callbacks.onVolumeChange || (() => {});

        // Center on Canvas
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2;
        
        // Dimensions
        this.width = 460;
        this.height = 400;

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
        this.hoveredElement = null; // 'exit', 'mute', 'bgSlider', 'sfxSlider', 'achievements', 'credits'

        this.mouseX = 0;
        this.mouseY = 0;

        this.bindEvents();
    }

    show() {
        this.state = 'POPPING_IN';
        this.scale = 0;
        this.targetScale = 1.12; // Initial POP overshoot
        this.canvas.style.cursor = 'default';
    }

    hide() {
        this.state = 'POPPING_OUT';
        this.targetScale = 1.15; // Quick swell animation
        setTimeout(() => {
            this.targetScale = 0;
        }, 80);
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

    // Translates screen coordinate points to locally scaled pop-up coordinate points
    getLocalMouse() {
        if (this.scale < 0.01) return { x: 0, y: 0 };
        const localX = (this.mouseX - this.x) / this.scale;
        const localY = (this.mouseY - this.y) / this.scale;
        return { x: localX, y: localY };
    }

    bindEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.state === 'OFFSCREEN') return;

            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;

            const local = this.getLocalMouse();

            // Drag handler for BG Volume Slider
            if (this.draggingBG) {
                const val = (local.x - (-40)) / 200; // Track starts at local X: -40 and is 200px wide
                this.bgVolume = Math.max(0, Math.min(1, val));
                this.onVolumeChange('bg', this.bgVolume);
            } 
            // Drag handler for SFX Volume Slider
            else if (this.draggingSFX) {
                const val = (local.x - (-40)) / 200;
                this.sfxVolume = Math.max(0, Math.min(1, val));
                this.onVolumeChange('sfx', this.sfxVolume);
            }

            this.hoveredElement = null;

            // 1. Check Exit Button (Circular boundary around x: 200, y: -170, radius 14)
            const dx = local.x - 200;
            const dy = local.y - (-170);
            if (dx*dx + dy*dy < 14*14) {
                this.hoveredElement = 'exit';
            }
            // 2. Check Mute Toggle Pill (x: 90, y: -90, width: 60, height: 24)
            else if (this.isPointInLocalRect(local.x, local.y, 90, -90, 60, 24)) {
                this.hoveredElement = 'mute';
            }
            // 3. Check BG Volume Hitbox
            else if (this.isPointInLocalRect(local.x, local.y, 60, -30, 220, 24)) {
                this.hoveredElement = 'bgSlider';
            }
            // 4. Check SFX Volume Hitbox
            else if (this.isPointInLocalRect(local.x, local.y, 60, 30, 220, 24)) {
                this.hoveredElement = 'sfxSlider';
            }
            // 5. Check Achievements Button (x: -100, y: 110, width: 170, height: 40)
            else if (this.isPointInLocalRect(local.x, local.y, -100, 110, 170, 40)) {
                this.hoveredElement = 'achievements';
            }
            // 6. Check Credits Button (x: 100, y: 110, width: 170, height: 40)
            else if (this.isPointInLocalRect(local.x, local.y, 100, 110, 170, 40)) {
                this.hoveredElement = 'credits';
            }

            // Update Cursor Style
            if (this.hoveredElement && this.state === 'ACTIVE') {
                this.canvas.style.cursor = 'pointer';
            } else if (this.state === 'ACTIVE') {
                this.canvas.style.cursor = 'default';
            }
        });

        this.canvas.addEventListener('mousedown', () => {
            if (this.state !== 'ACTIVE') return;
            const local = this.getLocalMouse();

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
            } else if (this.hoveredElement === 'credits') {
                this.onCredits();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.draggingBG = false;
            this.draggingSFX = false;
        });
    }

    update() {
        if (this.state === 'OFFSCREEN') return;

        this.time += 0.05;

        // Smooth transition animation
        this.scale = this.lerp(this.scale, this.targetScale, 0.22);

        // POP Open Overshoot settling logic
        if (this.state === 'POPPING_IN') {
            if (Math.abs(this.scale - 1.12) < 0.02) {
                this.targetScale = 1.0; 
                this.state = 'ACTIVE';
            }
        }

        // POP Closed settlement logic
        if (this.state === 'POPPING_OUT' && this.scale < 0.04) {
            this.state = 'OFFSCREEN';
            this.scale = 0;
        }
    }

    draw() {
        if (this.state === 'OFFSCREEN') return;

        // Draw translucent dark background backdrop
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Center popup coordinate space
        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.scale(this.scale, this.scale);

        // Drop shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        this.ctx.beginPath();
        this.ctx.roundRect(-this.width / 2, -this.height / 2 + 8, this.width, this.height, 15);
        this.ctx.fill();

        // Dialog Panel Window Box
        this.ctx.fillStyle = '#2b2b2b';
        this.ctx.strokeStyle = '#3e3e3e';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 15);
        this.ctx.fill();
        this.ctx.stroke();

        // Header Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('SETTINGS', 0, -145);

        // Header Border Accent Line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-180, -115);
        this.ctx.lineTo(180, -115);
        this.ctx.stroke();

        // Exit / Close Button (top-right corner)
        this.ctx.save();
        this.ctx.translate(200, -170);
        if (this.hoveredElement === 'exit') {
            this.ctx.scale(1.15, 1.15);
            this.ctx.fillStyle = '#ff3333';
        } else {
            this.ctx.fillStyle = '#e81123';
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 14, 0, Math.PI * 2);
        this.ctx.fill();

        // White 'X' graphic inside button
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(-5, -5);
        this.ctx.lineTo(5, 5);
        this.ctx.moveTo(5, -5);
        this.ctx.lineTo(-5, 5);
        this.ctx.stroke();
        this.ctx.restore();

        // Text settings
        this.ctx.fillStyle = '#dddddd';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'left';

        // --- ROW 1: Mute ---
        this.ctx.fillText('MUTE ALL AUDIO', -180, -90);
        this.ctx.save();
        this.ctx.translate(90, -90);
        // Switch body
        this.ctx.fillStyle = this.isMuted ? '#FF9800' : '#454545';
        this.ctx.beginPath();
        this.ctx.roundRect(-30, -12, 60, 24, 12);
        this.ctx.fill();
        // Switch circular knob
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.isMuted ? 16 : -16, 0, 9, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // --- ROW 2: Music volume ---
        this.ctx.fillText('MUSIC VOLUME', -180, -30);
        this.ctx.strokeStyle = '#454545';
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(-40, -30);
        this.ctx.lineTo(160, -30);
        this.ctx.stroke();

        if (this.bgVolume > 0) {
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.beginPath();
            this.ctx.moveTo(-40, -30);
            this.ctx.lineTo(-40 + this.bgVolume * 200, -30);
            this.ctx.stroke();
        }

        // Thumb handle
        this.ctx.save();
        this.ctx.translate(-40 + this.bgVolume * 200, -30);
        if (this.hoveredElement === 'bgSlider' || this.draggingBG) {
            this.ctx.scale(1.2, 1.2);
            this.ctx.fillStyle = '#64b5f6';
        } else {
            this.ctx.fillStyle = '#ffffff';
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // --- ROW 3: SFX Volume ---
        this.ctx.fillText('SFX VOLUME', -180, 30);
        this.ctx.strokeStyle = '#454545';
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(-40, 30);
        this.ctx.lineTo(160, 30);
        this.ctx.stroke();

        if (this.sfxVolume > 0) {
            this.ctx.strokeStyle = '#2196F3';
            this.ctx.beginPath();
            this.ctx.moveTo(-40, 30);
            this.ctx.lineTo(-40 + this.sfxVolume * 200, 30);
            this.ctx.stroke();
        }

        // Thumb handle
        this.ctx.save();
        this.ctx.translate(-40 + this.sfxVolume * 200, 30);
        if (this.hoveredElement === 'sfxSlider' || this.draggingSFX) {
            this.ctx.scale(1.2, 1.2);
            this.ctx.fillStyle = '#64b5f6';
        } else {
            this.ctx.fillStyle = '#ffffff';
        }
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();

        // Divider
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(-180, 70);
        this.ctx.lineTo(180, 70);
        this.ctx.stroke();

        // --- ROW 4: Achievements & Credits buttons ---
        // Achievements Button
        this.ctx.save();
        this.ctx.translate(-100, 110);
        if (this.hoveredElement === 'achievements') {
            this.ctx.scale(1.05, 1.05);
            this.ctx.fillStyle = '#ffb020';
        } else {
            this.ctx.fillStyle = '#FF9800';
        }
        this.ctx.beginPath();
        this.ctx.roundRect(-85, -20, 170, 40, 8);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('ACHIEVEMENTS', 0, 0);
        this.ctx.restore();

        // Credits Button
        this.ctx.save();
        this.ctx.translate(100, 110);
        if (this.hoveredElement === 'credits') {
            this.ctx.scale(1.05, 1.05);
            this.ctx.fillStyle = '#42a5f5';
        } else {
            this.ctx.fillStyle = '#2196F3';
        }
        this.ctx.beginPath();
        this.ctx.roundRect(-85, -20, 170, 40, 8);
        this.ctx.fill();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('CREDITS', 0, 0);
        this.ctx.restore();

        this.ctx.restore();
    }
}