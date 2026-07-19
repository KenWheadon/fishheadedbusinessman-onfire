/**
 * GameManager
 *
 * The central orchestrator for the Fish-Headed Businessman on Fire game.
 * Owns the single <canvas>, the rAF loop, the state machine, input routing,
 * and the loading pipeline.  All modular components receive only their own
 * localised coordinate space and dt – they never touch the DOM directly.
 *
 * ┌──────────────────────── State Machine ─────────────────────────────────┐
 * │  LOADING  →  START  →  PLAYING  →  GAMEOVER  →  START (restart)       │
 * └────────────────────────────────────────────────────────────────────────┘
 */
class GameManager {

  // ─────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────

  constructor(config = {}) {
    // ── Canvas ──────────────────────────────────────────────
    this._canvasId = config.canvasId || 'gameCanvas';
    // Use full screen values by default on initial start
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    /** @type {HTMLCanvasElement|null} */
    this._canvas = null;
    /** @type {CanvasRenderingContext2D|null} */
    this._ctx = null;

    // ── Asset manifest ──────────────────────────────────────
    this._assets = config.assets || [];

    // ── State machine ───────────────────────────────────────
    /** @type {'LOADING'|'START'|'PLAYING'|'GAMEOVER'} */
    this._state = 'LOADING';

    // ── Components & layout ─────────────────────────────────
    /**
     * Named component map. Each value must implement:
     *   update(dt), draw(ctx, x, y),
     *   handleMouseMove(lx, ly), handleMouseClick(lx, ly)
     * @type {Object.<string, object>}
     */
    this._components = config.components || {};

    /**
     * Bounding boxes used for both rendering offsets and input coordinate
     * transformation.  { x, y, w, h }
     * @type {Object.<string, {x:number,y:number,w:number,h:number}>}
     */
    this._layout = config.layout || {};

    // ── Neon Text Elements ──────────────────────────────────
    this._loadingNeon = config.loadingNeon || null;
    this._startNeon = config.startNeon || null;

    // ── Resizing Hook ───────────────────────────────────────
    this._onResizeCallback = config.onResize || null;

    // ── GameLoader ──────────────────────────────────────────
    this._loaderConfig = config.loaderConfig || {};
    /** @type {GameLoader|null} */
    this._loader = null;

    // ── rAF loop ────────────────────────────────────────────
    this._rafId = null;
    this._lastTime = null;
    this._running = false;

    // ── Achievement hook ─────────────────────────────────────
    this.onAchievementTriggered = config.onAchievementTriggered || null;
    this.onAssetsLoaded = config.onAssetsLoaded || null;

    // ── Input routing state ──────────────────────────────────
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundMouseClick = this._onMouseClick.bind(this);
    this._boundResize = this.resize.bind(this);
  }

  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────

  /**
   * Bootstraps the entire game with dynamic resizing listeners.
   */
  init() {
    // 1. Resolve canvas
    this._canvas = document.getElementById(this._canvasId);
    if (!this._canvas) {
      throw new Error(`[GameManager] No <canvas> found with id="${this._canvasId}"`);
    }

    // Set viewport dimensions immediately on resolution
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._canvas.width = this._width;
    this._canvas.height = this._height;
    this._ctx = this._canvas.getContext('2d');

    // 2. Create and start the GameLoader
    this._loader = new GameLoader({
      width: this._width,
      height: this._height,
      ...this._loaderConfig,
    });
    this._loader.start();

    // 3. Trigger initial neon ignition sequence
    this._loadingNeon?.animateIn();

    // 4. Wire input and window resize listeners
    this._attachInputListeners();
    window.addEventListener('resize', this._boundResize);

    // Run initial manual layout sync to center neon texts
    this.resize();

    // 5. Kick off the rAF loop
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));

    // 6. Simultaneously begin asset loading
    AssetManager.load(
      this._assets,
      (normalisedPct) => {
        this._loader?.setProgress(normalisedPct * 100);
      },
      () => {
        // Begin fading out the loading screen neon text alongside the loader exit transition
        this._loadingNeon?.animateOut();

        if (typeof this.onAssetsLoaded === 'function') {
          try {
            this.onAssetsLoaded();
          } catch (e) {
            console.warn('[GameManager] onAssetsLoaded threw:', e);
          }
        }

        // Wait for the loader's own exit animation to finish before switching
        this._waitForLoaderExit(() => {
          this._transitionTo('START');
        });
      }
    );
  }

  /**
   * Cleanly handles resizing and scales internal buffers to match the window.
   */
  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this._width = w;
    this._height = h;

    if (this._canvas) {
      this._canvas.width = w;
      this._canvas.height = h;
    }

    // 1. Recalculate component bounding box layout grids using the hook
    if (typeof this._onResizeCallback === 'function') {
      this._onResizeCallback(w, h);
    }

    // 2. Center and scale neon text layers dynamically, respecting manual overrides
    if (this._loadingNeon) {
      // Use yPercent first, then static configY, or fall back to default h * 0.18
      const targetY = this._loadingNeon.yPercent !== undefined
        ? (h * this._loadingNeon.yPercent)
        : (this._loadingNeon.configY !== undefined ? this._loadingNeon.configY : h * 0.18);

      this._loadingNeon.setPosition(w / 2, targetY);
    }

    if (this._startNeon) {
      // Use yPercent first, then static configY, or fall back to default h * 0.22
      const targetY = this._startNeon.yPercent !== undefined
        ? (h * this._startNeon.yPercent)
        : (this._startNeon.configY !== undefined ? this._startNeon.configY : h * 0.22);

      this._startNeon.setPosition(w / 2, targetY);
    }

    // 3. Propagate new boundaries to the GameLoader
    if (this._loader && typeof this._loader.resize === 'function') {
      this._loader.resize(w, h);
    }

    // 4. Delegate dimensions to active screens/overlays
    for (const [name, component] of Object.entries(this._components)) {
      if (component && typeof component.resize === 'function') {
        const bounds = this._layout[name] || { x: 0, y: 0, w: w, h: h };
        component.resize(bounds.w || w, bounds.h || h);
      }
    }
  }

  /**
   * Cleanly stops the animation loop and removes input listeners.
   */
  destroy() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._detachInputListeners();
    window.removeEventListener('resize', this._boundResize);
  }

  // ── State helpers ──────────────────────────────────────────

  /** Read-only accessor for the current game state. */
  get state() { return this._state; }

  /**
   * Triggers the onAchievementTriggered hook without coupling to any concrete
   * achievement system implementation.
   */
  triggerAchievement(key, data) {
    if (typeof this.onAchievementTriggered === 'function') {
      try {
        this.onAchievementTriggered(key, data);
      } catch (e) {
        console.warn('[GameManager] onAchievementTriggered threw:', e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // rAF Loop
  // ─────────────────────────────────────────────────────────

  /** @private */
  _loop(timestamp) {
    if (!this._running) return;

    // Delta-time calculation – capped at 100 ms to prevent spiral-of-death
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    this._update(dt);
    this._draw();

    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  // ─────────────────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────────────────

  /** @private */
  _update(dt) {
    // Tick the active status clocks of active text arrays to process fades and wiggles
    this._loadingNeon?.update(dt);
    this._startNeon?.update(dt);

    switch (this._state) {
      case 'LOADING':
        this._loader?.update(dt);
        break;

      case 'START':
      case 'PLAYING':
      case 'GAMEOVER':
        this._updateActiveComponents(dt);
        break;
    }
  }

  /**
   * Tick every component registered for the current non-loading state.
   * @private
   */
  _updateActiveComponents(dt) {
    const activeScreenMap = {
      'START': 'start',
      'PLAYING': 'playing',
      'GAMEOVER': 'end'
    };
    const activeScreen = activeScreenMap[this._state];

    for (const [name, component] of Object.entries(this._components)) {
      if (name === 'start' || name === 'playing' || name === 'end') {
        if (name !== activeScreen) continue;
      }
      if (typeof component.update === 'function') {
        component.update(dt);
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Draw
  // ─────────────────────────────────────────────────────────

  /** @private */
  _draw() {
    const ctx = this._ctx;
    if (!ctx) return;

    // Clear frame
    ctx.clearRect(0, 0, this._width, this._height);

    switch (this._state) {
      case 'LOADING':
        // GameLoader owns the entire background canvas during loading
        this._loader?.draw(ctx, 0, 0);
        // Draw the neon text cleanly layered on top of the centered background image
        this._loadingNeon?.draw(ctx, 0, 0);
        break;

      case 'START':
        this._drawActiveComponents(ctx);
        // Draw the active screen neon text layered directly over the start menu components
        this._startNeon?.draw(ctx, 0, 0);
        break;

      case 'PLAYING':
      case 'GAMEOVER':
        this._drawActiveComponents(ctx);
        break;
    }
  }

  /**
   * Renders each named component into its registered layout bounding box.
   * @private
   */
  _drawActiveComponents(ctx) {
    const activeScreenMap = {
      'START': 'start',
      'PLAYING': 'playing',
      'GAMEOVER': 'end'
    };
    const activeScreen = activeScreenMap[this._state];

    for (const [name, component] of Object.entries(this._components)) {
      if (name === 'start' || name === 'playing' || name === 'end') {
        if (name !== activeScreen) continue;
      }
      if (typeof component.draw !== 'function') continue;

      const bounds = this._layout[name] ?? { x: 0, y: 0 };
      component.draw(ctx, bounds.x, bounds.y);
    }
  }

  // ─────────────────────────────────────────────────────────
  // State Machine
  // ─────────────────────────────────────────────────────────

  /** @private */
  _transitionTo(nextState) {
    const prev = this._state;
    if (prev === nextState) return;

    // Power off the Start Screen neon text if exiting the Start state
    if (prev === 'START') {
      this._startNeon?.animateOut();
    }

    this._state = nextState;
    console.log(`[GameManager] State: ${prev} → ${nextState}`);

    // ── Achievement hook trigger points ──────────────────────
    if (prev === 'LOADING' && nextState === 'START') {
      this.triggerAchievement('game_loaded');
    }
    if (nextState === 'PLAYING') {
      this.triggerAchievement('game_started');
    }
    if (nextState === 'GAMEOVER') {
      this.triggerAchievement('game_over');
    }

    this._onStateEnter(nextState);
  }

  /** @private */
  _onStateEnter(state) {
    switch (state) {
      case 'START': {
        // Ignite start screen neon text with dynamic flickering entrance
        this._startNeon?.animateIn();

        const startComp = this._components['start'];
        if (startComp && typeof startComp.reset === 'function') {
          startComp.reset();
        }
        break;
      }
      case 'PLAYING': {
        const mainComp = this._components['playing'];
        if (mainComp && typeof mainComp.reset === 'function') {
          mainComp.reset();
        }
        break;
      }
      case 'GAMEOVER': {
        const endComp = this._components['end'];
        if (endComp && typeof endComp.reset === 'function') {
          endComp.reset();
        }
        if (endComp) endComp.introProgress = 0;
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────
  // Loading transition helper
  // ─────────────────────────────────────────────────────────

  /** @private */
  _waitForLoaderExit(callback) {
    const poll = () => {
      if (!this._loader || !this._loader.isOnScreen()) {
        callback();
      } else {
        requestAnimationFrame(poll);
      }
    };
    requestAnimationFrame(poll);
  }

  // ─────────────────────────────────────────────────────────
  // Input Routing
  // ─────────────────────────────────────────────────────────

  /** @private */
  _attachInputListeners() {
    const c = this._canvas;
    c.addEventListener('mousemove', this._boundMouseMove);
    c.addEventListener('mousedown', this._boundMouseDown);
    c.addEventListener('mouseup', this._boundMouseUp);
    c.addEventListener('click', this._boundMouseClick);
  }

  /** @private */
  _detachInputListeners() {
    const c = this._canvas;
    if (!c) return;
    c.removeEventListener('mousemove', this._boundMouseMove);
    c.removeEventListener('mousedown', this._boundMouseDown);
    c.removeEventListener('mouseup', this._boundMouseUp);
    c.removeEventListener('click', this._boundMouseClick);
  }

  /** @private */
  _canvasCoords(e) {
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._width / rect.width;
    const scaleY = this._height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  /** @private */
  _routeInput(handlerName, cx, cy) {
    if (this._state === 'LOADING') {
      const lh = this._loader;
      if (lh && typeof lh[handlerName] === 'function') {
        lh[handlerName](cx, cy);
      }
      return;
    }

    const achievements = this._components['achievements'];
    if (achievements && achievements.isOpen) {
      if (typeof achievements[handlerName] === 'function') {
        const bounds = this._layout['achievements'] ?? { x: 0, y: 0 };
        achievements[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return;
    }

    const help = this._components['help'];
    if (help && help.isVisible) {
      if (typeof help[handlerName] === 'function') {
        const bounds = this._layout['help'] ?? { x: 0, y: 0 };
        help[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return;
    }

    const credits = this._components['credits'];
    if (credits && credits.isVisible) {
      if (typeof credits[handlerName] === 'function') {
        const bounds = this._layout['credits'] ?? { x: 0, y: 0 };
        credits[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return;
    }

    const settings = this._components['settings'];
    if (settings && !settings.isoffscreen()) {
      if (typeof settings[handlerName] === 'function') {
        const bounds = this._layout['settings'] ?? { x: 0, y: 0 };
        settings[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return;
    }

    const activeScreenMap = {
      'START': 'start',
      'PLAYING': 'playing',
      'GAMEOVER': 'end'
    };
    const activeScreen = activeScreenMap[this._state];

    for (const [name, component] of Object.entries(this._components)) {
      if (name === 'achievements' || name === 'settings' || name === 'help' || name === 'credits') continue;

      if (name === 'start' || name === 'playing' || name === 'end') {
        if (name !== activeScreen) continue;
      }

      if (typeof component[handlerName] !== 'function') continue;

      const bounds = this._layout[name] ?? { x: 0, y: 0, w: this._width, h: this._height };
      const { x: bx, y: by, w: bw = this._width, h: bh = this._height } = bounds;

      if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
        component[handlerName](cx - bx, cy - by);
      }
    }
  }

  _onMouseMove(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseMove', x, y);
  }

  _onMouseDown(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseDown', x, y);
  }

  _onMouseUp(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseUp', x, y);
  }

  _onMouseClick(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseClick', x, y);
  }
}