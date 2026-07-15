/**
 * Elegant, modular Game Loading Screen Component
 */
class GameLoader {
  constructor(logoPath = '') {
    this.logoPath = logoPath;
    
    // Progress tracking states
    this.targetProgress = 0;   // Where the progress bar wants to be
    this.currentProgress = 0;  // Where the progress bar currently is (animating)
    
    this.isStarted = false;    // Tracks if loading has officially begun
    this.animationFrameId = null;

    // Configuration
    this.autoFillSpeed = 0.03; // How fast the bar passively crawls on its own (per frame)

    this.injectStyles();
    this.createUIElements();
    this.reset(); // Start in default, non-animating idle state
  }

  /**
   * Automatically injects styles with variables for easy tweaking
   */
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .loader-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #0e0e12;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9000;
        transition: opacity 0.5s ease;
      }

      /* Logo styles */
      .loader-logo-wrapper {
        margin-bottom: 40px;
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .loader-logo {
        max-width: 200px;
        max-height: 120px;
        object-fit: contain;
      }

      /* Default fallback logo if image fails or path is empty */
      .loader-logo-fallback {
        font-size: 80px;
        filter: grayscale(100%);
        opacity: 0.3;
        transition: all 0.5s ease;
      }

      /* Progress Bar Wrapper */
      .loader-bar-container {
        width: 80%;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.03);
        border: 2px solid #2a2a35;
        height: 20px;
        border-radius: 10px;
        padding: 3px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        transition: all 0.5s ease;
      }

      /* Progress Bar Filling Element */
      .loader-bar-fill {
        height: 100%;
        width: 0%;
        background: #444; /* Default dull gray state */
        border-radius: 6px;
        position: relative;
        transition: background-color 0.5s ease;
      }

      /* Text State Display */
      .loader-text {
        margin-top: 15px;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 2px;
        color: #555;
        text-transform: uppercase;
        transition: color 0.5s ease;
      }

      /* =========================================
         ACTIVE / STARTED STATE STYLING 
         ========================================= */

      /* Dynamic pulse effect when starting */
      .loader-container.active .loader-logo-fallback,
      .loader-container.active .loader-logo {
        filter: none;
        opacity: 1;
        animation: logoPulse 2s infinite ease-in-out;
      }

      .loader-container.active .loader-bar-container {
        border-color: #e5c158;
        box-shadow: 0 0 15px rgba(229, 193, 88, 0.15);
      }

      .loader-container.active .loader-bar-fill {
        background: linear-gradient(90deg, #e5c158, #fff1aa);
        box-shadow: 0 0 10px rgba(229, 193, 88, 0.5);
      }

      /* Subtle animated glow overlay on the active bar */
      .loader-container.active .loader-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.4) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        animation: shimmer 1.5s infinite;
        background-size: 200% 100%;
      }

      .loader-container.active .loader-text {
        color: #e5c158;
      }

      /* Animations */
      @keyframes shimmer {
        0% { background-position: -150% 0; }
        100% { background-position: 150% 0; }
      }

      @keyframes logoPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Generates DOM structures
   */
  createUIElements() {
    this.container = document.createElement('div');
    this.container.className = 'loader-container';

    // Set up logo image, fallback to elegant placeholder emoji if load fails or is missing
    const logoHTML = this.logoPath 
      ? `<img class="loader-logo" src="${this.logoPath}" alt="Game Logo" onerror="this.style.display='none'; document.getElementById('loader-fallback').style.display='block';">`
      : '';

    this.container.innerHTML = `
      <div class="loader-logo-wrapper">
        ${logoHTML}
        <div id="loader-fallback" class="loader-logo-fallback" style="${this.logoPath ? 'display:none;' : ''}">🎮</div>
      </div>
      <div class="loader-bar-container">
        <div class="loader-bar-fill"></div>
      </div>
      <div class="loader-text">Standby</div>
    `;

    document.body.appendChild(this.container);

    this.barFill = this.container.querySelector('.loader-bar-fill');
    this.statusText = this.container.querySelector('.loader-text');
  }

  /**
   * Triggers the "Active" loaded mode and starts the loop
   */
  start() {
    if (this.isStarted) return;
    
    this.isStarted = true;
    this.container.classList.add('active');
    this.statusText.textContent = 'Loading Game Resources... 0%';
    
    this.runUpdateLoop();
  }

  /**
   * Sets the target loader percentage manually (supports backwards progress)
   */
  setProgress(percent) {
    // Clamp values between 0 and 100
    this.targetProgress = Math.min(Math.max(percent, 0), 100);
  }

  /**
   * Smooth physics engine utilizing Linear Interpolation (Lerp)
   */
  runUpdateLoop() {
    const ease = 0.08; // Easing velocity. Lower = smoother/slower, Higher = snappier.
    
    const update = () => {
      if (!this.isStarted) return;

      // 1. Slowly auto-fill the target progress bar by itself up to 99%
      if (this.targetProgress < 99) {
        this.targetProgress += this.autoFillSpeed;
      }

      // 2. Linear interpolation calculation (Lerps smoothly forwards OR backwards)
      const diff = this.targetProgress - this.currentProgress;
      this.currentProgress += diff * ease;

      // Close the loop gap once extremely close to the target destination
      if (Math.abs(diff) < 0.1) {
        this.currentProgress = this.targetProgress;
      }

      // 3. Render updated width onto the DOM
      this.barFill.style.width = `${this.currentProgress}%`;

      // 4. Update the text label based on the current visible progress (not target)
      const roundedDisplay = Math.round(this.currentProgress);
      if (roundedDisplay >= 100) {
        this.statusText.textContent = 'Ready to Play!';
      } else {
        this.statusText.textContent = `Loading... ${roundedDisplay}%`;
      }

      // Continue frame loop
      this.animationFrameId = requestAnimationFrame(update);
    };

    // Prevent duplicate loops stacking
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(update);
  }

  /**
   * Returns the system to its initial static idle state (0% Progress, Gray, Non-animating)
   */
  reset() {
    this.isStarted = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.targetProgress = 0;
    this.currentProgress = 0;
    
    this.container.classList.remove('active');
    this.barFill.style.width = '0%';
    this.statusText.textContent = 'Standby';
  }
}