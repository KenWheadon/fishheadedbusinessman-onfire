class StartScreen {
    constructor(config = {}) {
        this.width = config.width || 800;
        this.height = config.height || 600;
        this.scale = 1.0;

        // Setup Callbacks
        this.onSettings = config.onSettings || (() => { });
        this.onPlay = config.onPlay || (() => { });

        this.state = 'ACTIVE'; // ACTIVE, POPPING_OUT, OFFSCREEN
        this.time = 0;

        this.logo = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            scale: 1,
            targetScale: 1,
            rotation: 0,
            twirlVelocity: 0
        };

        // NEW: Instantiate consistent arcade-styled buttons
        this.playButton = new ArcadeButton({
            text: 'PLAY',
            themeColor: '#39ff14', // Glowing green for play
            glowColor: '#00ff66'
        });

        this.settingsButton = new ArcadeButton({
            text: 'SETTINGS',
            themeColor: '#ff007f', // Glowing pink/magenta for settings
            glowColor: '#ff00ff'
        });

        // Quick accessible array for batch operations (drawing/updating)
        this.buttons = [this.playButton, this.settingsButton];

        this.popOutTimer = 0;
        this.popOutPhase = 0;

        this.resize(this.width, this.height);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        const referenceDimension = Math.min(width, height);
        this.scale = Math.min(Math.max(referenceDimension / 800, 0.65), 1.35);

        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Scale Logo
        this.logo.x = centerX;
        this.logo.y = centerY - 90 * this.scale;
        this.logo.width = 280 * this.scale;
        this.logo.height = 140 * this.scale;

        // Recalculate positions & sizes for modern responsive layouts
        const startY = centerY + 65 * this.scale;
        const spacing = 75 * this.scale;

        this.playButton.setPosition(centerX, startY, 210 * this.scale, 52 * this.scale, this.scale);
        this.settingsButton.setPosition(centerX, startY + spacing, 210 * this.scale, 52 * this.scale, this.scale);
    }

    reset() {
        this.state = 'ACTIVE';
        this.time = 0;
        this.logo.scale = 1;
        this.logo.targetScale = 1;
        this.logo.rotation = 0;
        this.logo.twirlVelocity = 0;
        this.popOutTimer = 0;
        this.popOutPhase = 0;

        // Reset our modular button configurations inside
        this.buttons.forEach(btn => {
            btn.scale = 1;
            btn.targetScale = 1;
            btn.velocity = 0;
            btn.particles = [];
            btn.ripples = [];
        });

        this.resize(this.width, this.height);
    }

    // Pass canvas local vectors down to the elements
    handleMouseMove(localX, localY) {
        this.buttons.forEach(btn => btn.handleMouseMove(localX, localY));
    }

    handleMouseDown(localX, localY) {
        if (this.state !== 'ACTIVE') return;

        // Check Logo Click twirl
        if (this.isPointInRect(localX, localY, this.logo)) {
            this.logo.twirlVelocity = 12;
            this.logo.targetScale = 1.2;
        }

        // Pass MouseDown through
        this.buttons.forEach(btn => btn.handleMouseDown(localX, localY));
    }

    handleMouseUp(localX, localY) {
        this.logo.targetScale = 1;
        if (this.state !== 'ACTIVE') return;

        // Play Button Callback execution
        this.playButton.handleMouseUp(localX, localY, () => {
            this.triggerPopOut();
        });

        // Settings Button Callback execution
        this.settingsButton.handleMouseUp(localX, localY, () => {
            this.onSettings();
        });
    }

    handleMouseClick(localX, localY) {
        this.handleMouseDown(localX, localY);
        this.handleMouseUp(localX, localY);
    }

    isPointInRect(px, py, rect) {
        return px > rect.x - rect.width / 2 &&
            px < rect.x + rect.width / 2 &&
            py > rect.y - rect.height / 2 &&
            py < rect.y + rect.height / 2;
    }

    triggerPopOut() {
        this.state = 'POPPING_OUT';
        this.popOutTimer = 0.15;
        this.popOutPhase = 1;

        this.logo.targetScale = 1.4;
        this.buttons.forEach(btn => btn.targetScale = 0); // Shrink cleanly on exit transition
    }

    update(dt) {
        const frameMultiplier = dt * 60;
        this.time += dt * 3.0;

        if (this.state === 'OFFSCREEN') return;

        // Handle global layout transitions
        if (this.state === 'POPPING_OUT') {
            if (this.popOutPhase === 1) {
                this.popOutTimer -= dt;
                if (this.popOutTimer <= 0) {
                    this.popOutPhase = 2;
                    this.logo.targetScale = 0;
                }
            } else if (this.popOutPhase === 2 && this.logo.scale < 0.05) {
                this.state = 'OFFSCREEN';
                this.logo.scale = 0;
                if (this.onPlay) this.onPlay();
            }
        }

        // Logo spring physics updates
        const logoRate = 1 - Math.pow(1 - 0.2, frameMultiplier);
        this.logo.scale = this.lerp(this.logo.scale, this.logo.targetScale, logoRate);
        this.logo.rotation += this.logo.twirlVelocity * frameMultiplier;

        const twirlRate = 1 - Math.pow(1 - 0.1, frameMultiplier);
        this.logo.twirlVelocity = this.lerp(this.logo.twirlVelocity, 0, twirlRate);

        const snapBackRate = 1 - Math.pow(1 - 0.12, frameMultiplier);
        this.logo.rotation = this.lerp(this.logo.rotation, 0, snapBackRate);

        // Update each button individually
        this.buttons.forEach(btn => btn.update(dt));
    }

    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    draw(ctx, x, y) {
        if (this.state === 'OFFSCREEN') return;

        ctx.save();
        ctx.translate(x, y);

        ctx.beginPath();
        ctx.rect(0, 0, this.width, this.height);
        ctx.clip();

        // 1. Render Base Teal Wallpaper Background
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Render centered 9:16 'bg-start' wallpaper
        let bgImg = null;
        try {
            bgImg = typeof AssetManager !== 'undefined' ? AssetManager.get('bg-start') : null;
        } catch (e) { }

        const imgHeight = this.height;
        const imgWidth = imgHeight * (9 / 16);
        const imgX = (this.width - imgWidth) / 2;

        if (bgImg) {
            ctx.drawImage(bgImg, imgX, 0, imgWidth, imgHeight);
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(imgX, 0, imgWidth, imgHeight);
        }

        // 3. Render Logo (UPDATED: Added Aspect Ratio Correction)
        ctx.save();
        const logoIdleY = this.state === 'ACTIVE' ? Math.sin(this.time) * 5 : 0;
        ctx.translate(this.logo.x, this.logo.y + logoIdleY * this.scale);
        ctx.rotate(this.logo.rotation);
        ctx.scale(this.logo.scale, this.logo.scale);

        let logoImg = null;
        try {
            logoImg = typeof AssetManager !== 'undefined' ? AssetManager.get('logo') : null;
        } catch (e) { }

        if (logoImg) {
            // Determine SVG's aspect ratio. Fall back to old logo ratio (2:1) if unavailable
            const imgAspect = (logoImg.naturalWidth && logoImg.naturalHeight)
                ? logoImg.naturalWidth / logoImg.naturalHeight
                : 2.0;

            let drawWidth = this.logo.width * 2;
            let drawHeight = this.logo.height * 2;
            const boxAspect = drawWidth / drawHeight;

            // Fit the logo inside the target box without stretching
            if (imgAspect > boxAspect) {
                // Image is wider than the target box aspect ratio
                drawHeight = drawWidth / imgAspect;
            } else {
                // Image is taller than the target box aspect ratio
                drawWidth = drawHeight * imgAspect;
            }

            ctx.drawImage(logoImg, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillRect(-this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 4 * this.scale;
            ctx.strokeRect(-this.logo.width / 2, -this.logo.height / 2, this.logo.width, this.logo.height);

            ctx.fillStyle = '#000';
            ctx.font = `bold ${Math.round(22 * this.scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LOGO IMAGE', 0, 0);
        }
        ctx.restore();

        // 4. Draw our new juicy neon button components!
        this.buttons.forEach(btn => btn.draw(ctx));

        ctx.restore();
    }
}