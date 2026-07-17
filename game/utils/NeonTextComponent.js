/**
 * Highly polished, self-contained HTML5 Canvas component for rendering 
 * glowing neon text with organic wiggling, flickering ignition, and transition states.
 */
class NeonTextComponent {
    constructor(config = {}) {
        // Text Properties
        this.text = config.text || "SYSTEM READY";
        // Store configuration values so the GameManager resize loop can respect them!
        this.configX = config.x;
        this.configY = config.y;
        this.yPercent = config.yPercent; // e.g., 0.70 for 70% down the screen

        this.x = config.x || 0;
        this.y = config.y || 0;

        // Aesthetic Styling
        this.fontSize = config.fontSize || 36;
        this.fontFamily = config.fontFamily || '"Segoe UI", sans-serif';
        this.coreColor = config.coreColor || '#ffffff';       // The bright inner gas tube
        this.glowColor = config.glowColor || '#ff007f';       // Saturated outer neon glow (hot pink, cyan, teal, etc.)
        this.letterSpacing = config.letterSpacing || '4px';

        // Animation & Transition States
        // 'HIDDEN' | 'ENTERING' | 'ACTIVE' | 'EXITING'
        this.state = config.autoStart ? 'ACTIVE' : 'HIDDEN';
        this.transitionProgress = this.state === 'ACTIVE' ? 1 : 0;

        this.durationIn = config.durationIn || 0.8;   // Seconds to ease in
        this.durationOut = config.durationOut || 0.5; // Seconds to ease out

        // Clock accumulators
        this.time = 0;
        this.flickerTime = 0;

        // Customization mechanics
        this.wiggleIntensity = config.wiggleIntensity !== undefined ? config.wiggleIntensity : 2.5;
        this.wiggleSpeed = config.wiggleSpeed || 6.0;
        this.buzzFrequency = config.buzzFrequency || 15.0; // Dynamic neon hum oscillation frequency
    }

    /**
     * Updates the core text string
     */
    setText(newText) {
        this.text = String(newText);
    }

    /**
     * Sets the position dynamically
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Initiates the neon power-on transition sequence (with organic flickering)
     */
    animateIn() {
        if (this.state === 'ENTERING' || this.state === 'ACTIVE') return;
        this.state = 'ENTERING';
        this.transitionProgress = 0;
    }

    /**
     * Initiates the neon power-down sequence (flickers and dims to black)
     */
    animateOut() {
        if (this.state === 'EXITING' || this.state === 'HIDDEN') return;
        this.state = 'EXITING';
        this.transitionProgress = 1;
    }

    /**
     * Core physics and lifecycle update tick
     * @param {number} dt Delta time in seconds
     */
    update(dt) {
        this.time += dt;

        // 1. Process transition states
        if (this.state === 'ENTERING') {
            this.transitionProgress += dt / this.durationIn;
            if (this.transitionProgress >= 1) {
                this.transitionProgress = 1;
                this.state = 'ACTIVE';
            }
        } else if (this.state === 'EXITING') {
            this.transitionProgress -= dt / this.durationOut;
            if (this.transitionProgress <= 0) {
                this.transitionProgress = 0;
                this.state = 'HIDDEN';
            }
        }
    }

    /**
     * Helper to calculate realistic power-on/off flicker cycles
     */
    _getFlickerAlpha() {
        if (this.state === 'HIDDEN') return 0;

        // Standard linear opacity during base transition
        const baseAlpha = this.transitionProgress;

        // Simulate "leaky capacitor" ignition flickering during entrance
        if (this.state === 'ENTERING') {
            // Create erratic dropouts based on periodic fast-sine noise
            const noise = Math.sin(this.time * 45) * Math.cos(this.time * 11);
            if (baseAlpha < 0.8 && noise > 0.15) {
                return 0.1; // Spark out
            }
        }

        // Simulate occasional mechanical buzz/dropout when active (99% stable)
        if (this.state === 'ACTIVE') {
            const randomFlicker = Math.sin(this.time * 80);
            if (randomFlicker > 0.98) {
                return 0.4; // Quick subtle brownout
            }
        }

        // Dying flicker fade-out sequence
        if (this.state === 'EXITING') {
            const deathNoise = Math.cos(this.time * 30);
            if (baseAlpha > 0.2 && deathNoise > 0.4) {
                return 0; // Lights cut completely for a frame
            }
        }

        return baseAlpha;
    }

    /**
     * Renders the neon sign onto the Canvas Context
     */
    draw(ctx, offsetX = 0, offsetY = 0) {
        if (this.state === 'HIDDEN') return;

        const currentAlpha = this._getFlickerAlpha();
        if (currentAlpha <= 0) return;

        ctx.save();

        // 1. Compute procedural continuous wiggling offsets
        // Combining prime-number-spaced wave harmonics produces a chaotic, non-repetitive wiggle path.
        const wiggleX = Math.sin(this.time * this.wiggleSpeed) * this.wiggleIntensity +
            Math.sin(this.time * this.wiggleSpeed * 1.7) * (this.wiggleIntensity * 0.3);
        const wiggleY = Math.cos(this.time * this.wiggleSpeed * 1.3) * this.wiggleIntensity +
            Math.cos(this.time * this.wiggleSpeed * 2.3) * (this.wiggleIntensity * 0.3);

        // Dynamic rotation tilt based on wiggling speed
        const wiggleAngle = Math.sin(this.time * this.wiggleSpeed * 0.9) * 0.015 * this.wiggleIntensity;

        // Translate to target coordinate matrix
        ctx.translate(this.x + offsetX + wiggleX, this.y + offsetY + wiggleY);
        ctx.rotate(wiggleAngle);
        ctx.globalAlpha = currentAlpha;

        // 2. Setup Typography Styling
        ctx.font = `bold ${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (ctx.letterSpacing !== undefined) {
            ctx.letterSpacing = this.letterSpacing;
        }

        // 3. Dynamic Glow Humming (Slightly expanding/contracting glow intensity over time)
        const humIntensity = 1 + Math.sin(this.time * this.buzzFrequency) * 0.15;
        const baseGlowRadius = this.fontSize * 0.55;
        const currentGlowBlur = baseGlowRadius * humIntensity;

        // --- PASS 1: The Massive Outer Glow Silhouette ---
        ctx.save();
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = this.fontSize * 0.22; // Wide neon trace
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = currentGlowBlur;

        // Triple stroke pass duplicates pixel opacity to force deep, vibrant saturation
        ctx.strokeText(this.text, 0, 0);
        ctx.shadowBlur = currentGlowBlur * 0.5;
        ctx.strokeText(this.text, 0, 0);
        ctx.restore();

        // --- PASS 2: The Core Gas Tube ---
        // A thin stroke of bright, near-white color creates the illusion of hot glowing gas inside glass.
        ctx.save();
        ctx.strokeStyle = this.coreColor;
        ctx.lineWidth = this.fontSize * 0.06; // Fine internal tube core
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Soft core shadow bloom
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = baseGlowRadius * 0.25;

        ctx.fillStyle = this.coreColor;
        ctx.strokeText(this.text, 0, 0);
        ctx.fillText(this.text, 0, 0);
        ctx.restore();

        ctx.restore();
    }
}