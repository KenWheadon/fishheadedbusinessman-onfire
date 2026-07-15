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
 *
 * Integration Workflow
 * ────────────────────
 *  1. GameManager.init()  – spins up GameLoader + starts the rAF loop.
 *  2.                     – simultaneously kicks off AssetManager.load().
 *  3. onProgress(pct)     – bridges to GameLoader.setProgress(pct * 100).
 *  4. onComplete()        – transitions LOADING → START.
 *
 * Constructor Options
 * ────────────────────
 *  {
 *    canvasId        : string           – id of the existing <canvas> element
 *    width           : number           – logical canvas width  (default: 800)
 *    height          : number           – logical canvas height (default: 600)
 *    assets          : Array<{key,src}> – manifest handed to AssetManager.load()
 *    components      : {                – named modular screen components
 *      start         : StartScreen instance,
 *      achievements  : AchievementSystem instance,
 *      // … any component that exposes update(dt), draw(ctx, x, y),
 *      //   handleMouseMove(lx, ly), handleMouseClick(lx, ly)
 *    }
 *    layout          : {                – bounding boxes for each component
 *      start         : { x, y, w, h },
 *      achievements  : { x, y, w, h },
 *    }
 *    onAchievementTriggered : function(achievementKey) – external hook
 *    loaderConfig    : {}               – forwarded to new GameLoader(...)
 *  }
 *
 * Achievement Hook
 * ────────────────
 *  GameManager never hardcodes achievement logic. It exposes:
 *    this.onAchievementTriggered(key, data)
 *  which callers wire to their AchievementSystem, analytics layer, etc.
 *  GameManager calls it on state transitions and can be called externally
 *  by game-play modules at any time.
 *
 * Extending to new states
 * ───────────────────────
 *  Override _updateState(dt) / _drawState() or add extra cases to the
 *  switch blocks.  The pattern is intentionally not sealed.
 */
class GameManager {

  // ─────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────

  constructor(config = {}) {
    // ── Canvas ──────────────────────────────────────────────
    this._canvasId = config.canvasId || 'gameCanvas';
    this._width    = config.width    || 800;
    this._height   = config.height   || 600;

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
     * Named component map.  Each value must implement:
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

    // ── GameLoader ──────────────────────────────────────────
    this._loaderConfig = config.loaderConfig || {};
    /** @type {GameLoader|null} */
    this._loader = null;

    // ── rAF loop ────────────────────────────────────────────
    this._rafId       = null;
    this._lastTime    = null;
    this._running     = false;

    // ── Achievement hook ─────────────────────────────────────
    /**
     * External achievement pipeline.
     * Signature: (key: string, data?: any) => void
     */
    this.onAchievementTriggered = config.onAchievementTriggered || null;

    // ── Input routing state ──────────────────────────────────
    this._boundMouseMove  = this._onMouseMove.bind(this);
    this._boundMouseDown  = this._onMouseDown.bind(this);
    this._boundMouseUp    = this._onMouseUp.bind(this);
    this._boundMouseClick = this._onMouseClick.bind(this);
  }

  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────

  /**
   * Bootstraps the entire game:
   *  • Resolves the <canvas> element and 2D context
   *  • Creates and starts the GameLoader
   *  • Begins the rAF loop
   *  • Launches the asset loading pipeline
   */
  init() {
    // 1. Resolve canvas
    this._canvas = document.getElementById(this._canvasId);
    if (!this._canvas) {
      throw new Error(`[GameManager] No <canvas> found with id="${this._canvasId}"`);
    }
    this._canvas.width  = this._width;
    this._canvas.height = this._height;
    this._ctx = this._canvas.getContext('2d');

    // 2. Create and start the GameLoader
    this._loader = new GameLoader({
      width:  this._width,
      height: this._height,
      ...this._loaderConfig,
    });
    this._loader.start();

    // 3. Wire input listeners on the canvas
    this._attachInputListeners();

    // 4. Kick off the rAF loop
    this._running = true;
    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));

    // 5. Simultaneously begin asset loading
    //    onProgress → GameLoader.setProgress(pct * 100)
    //    onComplete  → transition LOADING → START
    AssetManager.load(
      this._assets,
      (normalisedPct) => {
        this._loader?.setProgress(normalisedPct * 100);
      },
      () => {
        // Wait for the loader's own exit animation to finish before switching
        this._waitForLoaderExit(() => {
          this._transitionTo('START');
        });
      }
    );
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
  }

  // ── State helpers ──────────────────────────────────────────

  /** Read-only accessor for the current game state. */
  get state() { return this._state; }

  /**
   * Triggers the onAchievementTriggered hook without coupling to any concrete
   * achievement system implementation.
   *
   * @param {string} key  – achievement identifier
   * @param {*}     [data] – optional payload
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
    switch (this._state) {
      case 'LOADING':
        this._loader?.update(dt);
        break;

      case 'START':
        this._updateActiveComponents(dt);
        break;

      case 'PLAYING':
        this._updateActiveComponents(dt);
        break;

      case 'GAMEOVER':
        this._updateActiveComponents(dt);
        break;
    }
  }

  /**
   * Tick every component registered for the current non-loading state.
   * Override to change which components are active per state.
   * @private
   */
  _updateActiveComponents(dt) {
    for (const [name, component] of Object.entries(this._components)) {
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
        // GameLoader owns the entire canvas during loading
        this._loader?.draw(ctx, 0, 0);
        break;

      case 'START':
      case 'PLAYING':
      case 'GAMEOVER':
        this._drawActiveComponents(ctx);
        break;
    }
  }

  /**
   * Renders each named component into its registered layout bounding box.
   * Components receive their OWN local coordinate space (0,0) via ctx.translate,
   * so they never need to know where they live on the master canvas.
   * @private
   */
  _drawActiveComponents(ctx) {
    for (const [name, component] of Object.entries(this._components)) {
      if (typeof component.draw !== 'function') continue;

      const bounds = this._layout[name] ?? { x: 0, y: 0 };
      component.draw(ctx, bounds.x, bounds.y);
    }
  }

  // ─────────────────────────────────────────────────────────
  // State Machine
  // ─────────────────────────────────────────────────────────

  /**
   * Drives a state transition and fires the achievement hook for milestone
   * transitions so external systems can react without hard coupling.
   *
   * @private
   * @param {'LOADING'|'START'|'PLAYING'|'GAMEOVER'} nextState
   */
  _transitionTo(nextState) {
    const prev = this._state;
    if (prev === nextState) return;

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

    // ── Lifecycle callbacks on components ────────────────────
    this._onStateEnter(nextState);
  }

  /**
   * Called immediately after entering a new state.  Wire component resets or
   * one-time setup here.
   * @private
   */
  _onStateEnter(state) {
    switch (state) {
      case 'START': {
        // Reset the start-screen component if it exposes a reset API
        const startComp = this._components['start'];
        if (startComp && typeof startComp.reset === 'function') {
          startComp.reset();
        }
        break;
      }
      case 'PLAYING':
        break;

      case 'GAMEOVER':
        break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Loading transition helper
  // ─────────────────────────────────────────────────────────

  /**
   * Polls the GameLoader's `isOnScreen()` flag once per frame until the exit
   * animation completes, then fires the callback.  This prevents the game from
   * flipping to START while the loader's pop-and-exit sequence is mid-flight.
   *
   * @private
   * @param {function} callback
   */
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
    c.addEventListener('mousemove',  this._boundMouseMove);
    c.addEventListener('mousedown',  this._boundMouseDown);
    c.addEventListener('mouseup',    this._boundMouseUp);
    c.addEventListener('click',      this._boundMouseClick);
  }

  /** @private */
  _detachInputListeners() {
    const c = this._canvas;
    if (!c) return;
    c.removeEventListener('mousemove',  this._boundMouseMove);
    c.removeEventListener('mousedown',  this._boundMouseDown);
    c.removeEventListener('mouseup',    this._boundMouseUp);
    c.removeEventListener('click',      this._boundMouseClick);
  }

  /**
   * Converts a raw MouseEvent into canvas-local coordinates, accounting for
   * device-pixel scaling and any CSS sizing applied to the canvas element.
   *
   * @private
   * @param {MouseEvent} e
   * @returns {{ x: number, y: number }}
   */
  _canvasCoords(e) {
    const rect    = this._canvas.getBoundingClientRect();
    const scaleX  = this._width  / rect.width;
    const scaleY  = this._height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  /**
   * Routes a mouse position to whichever component owns that canvas region,
   * transforming to the component's local coordinate space before dispatch.
   *
   * @private
   * @param {string}   handlerName – 'handleMouseMove' | 'handleMouseClick' | …
   * @param {number}   cx          – canvas x
   * @param {number}   cy          – canvas y
   */
  _routeInput(handlerName, cx, cy) {
    if (this._state === 'LOADING') {
      // During loading only the GameLoader receives input
      const lh = this._loader;
      if (lh && typeof lh[handlerName] === 'function') {
        lh[handlerName](cx, cy);
      }
      return;
    }

    // We check popups in reverse draw order (top-most first) to allow modal interception.
    // If achievements is open, it consumes all inputs.
    const achievements = this._components['achievements'];
    if (achievements && achievements.isOpen) {
      if (typeof achievements[handlerName] === 'function') {
        const bounds = this._layout['achievements'] ?? { x: 0, y: 0 };
        achievements[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return; // Block other components
    }

    // If help carousel is open, it consumes all inputs.
    const help = this._components['help'];
    if (help && help.isVisible) {
      if (typeof help[handlerName] === 'function') {
        const bounds = this._layout['help'] ?? { x: 0, y: 0 };
        help[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return; // Block other components
    }

    // If credits is open, it consumes all inputs.
    const credits = this._components['credits'];
    if (credits && credits.isVisible) {
      if (typeof credits[handlerName] === 'function') {
        const bounds = this._layout['credits'] ?? { x: 0, y: 0 };
        credits[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return; // Block other components
    }

    // If settings is open, it consumes all inputs.
    const settings = this._components['settings'];
    if (settings && !settings.isoffscreen()) {
      if (typeof settings[handlerName] === 'function') {
        const bounds = this._layout['settings'] ?? { x: 0, y: 0 };
        settings[handlerName](cx - bounds.x, cy - bounds.y);
      }
      return; // Block other components
    }

    // Route to every component whose layout bounds contain the hit point.
    // Components clip themselves, so overlapping regions go to both.
    for (const [name, component] of Object.entries(this._components)) {
      if (name === 'achievements' || name === 'settings' || name === 'help' || name === 'credits') continue; // Already handled above
      if (typeof component[handlerName] !== 'function') continue;

      const bounds = this._layout[name] ?? { x: 0, y: 0, w: this._width, h: this._height };
      const { x: bx, y: by, w: bw = this._width, h: bh = this._height } = bounds;

      // Hit test against bounding box
      if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
        // Transform to the component's local coordinate origin
        component[handlerName](cx - bx, cy - by);
      }
    }
  }

  /** @private */
  _onMouseMove(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseMove', x, y);
  }

  /** @private */
  _onMouseDown(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseDown', x, y);
  }

  /** @private */
  _onMouseUp(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseUp', x, y);
  }

  /** @private */
  _onMouseClick(e) {
    const { x, y } = this._canvasCoords(e);
    this._routeInput('handleMouseClick', x, y);
  }
}
