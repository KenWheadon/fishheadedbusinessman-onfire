/**
 * GameLayoutEditor
 * A visual development tool that mounts onto GameManager to allow real-time
 * dragging, resizing, and JSON exporting of component layout bounds.
 *
 * USAGE (after gm.init() in index.html):
 *   const editor = new GameLayoutEditor(gm);
 *
 * Supported components (playing-sub mode):
 *   cardGame, chars, debt, carrot, carrotRight
 *
 * KEY INSIGHT: Several components do not render from their layout.x/y directly –
 *   - chars: rendered at (centeredX, this.charsY) – ignores layout.chars.y
 *   - carrot/carrotRight: rendered from internal carrot.layout.nodeX/Y/baseX/Y
 * This editor computes actual screen-space bounds for overlay drawing and
 * mutates the correct underlying property on drag.
 */
class GameLayoutEditor {
    constructor(gameManager) {
        this.gm = gameManager;

        this.isActive = false;
        this.targetLayout = 'playing-sub'; // default to the most useful mode

        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.handleSize = 12;

        this._simulatedGameState = null;
        this._originalGameState = null;

        this._canvas = null;

        // Which components to expose (whitelist)
        this.PLAYING_WHITELIST = ['cardGame', 'chars', 'debt', 'carrot', 'carrotRight'];

        this._initUI();
        this._hookDrawPipeline();
        this._hookMouseEvents();
    }

    // =========================================================================
    // COMPONENT DESCRIPTOR SYSTEM
    //
    // Each descriptor knows:
    //   getBounds(ms)  -> { x, y, w, h }  actual screen position
    //   applyDelta(ms, dx, dy)            mutate position by delta
    //   applySize(ms, dw, dh)             mutate size by delta
    //   getExport(ms)  -> plain object     serialisable data to paste back
    // =========================================================================

    _getDescriptors() {
        return {
            cardGame: {
                getBounds: (ms) => {
                    const e = ms.layout.cardGame;
                    if (!e) return null;
                    const s = ms.cardGameScale;
                    const bw = e.w * s, bh = e.h * s;
                    const bx = e.x + (e.w - bw) / 2;
                    const by = e.y + (e.h - bh) / 2;
                    return { x: bx, y: by, w: bw, h: bh };
                },
                applyDelta: (ms, dx, dy) => {
                    const e = ms.layout.cardGame;
                    if (!e) return;
                    e.x = Math.round(e.x + dx);
                    e.y = Math.round(e.y + dy);
                },
                applySize: (ms, dw, dh) => {
                    const e = ms.layout.cardGame;
                    if (!e) return;
                    e.w = Math.max(80, Math.round(e.w + dw));
                    e.h = Math.max(40, Math.round(e.h + dh));
                    if (e.instance && typeof e.instance.resize === 'function') e.instance.resize(e.w, e.h);
                },
                getExport: (ms) => {
                    const e = ms.layout.cardGame;
                    if (!e) return null;
                    return { x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) };
                }
            },

            debt: {
                getBounds: (ms) => {
                    const e = ms.layout.debt;
                    if (!e) return null;
                    const slideOffsetY = ms.bottomY - ms.yPositions.bottomOnscreen;
                    return { x: e.x, y: e.y + slideOffsetY, w: e.w, h: e.h };
                },
                applyDelta: (ms, dx, dy) => {
                    const e = ms.layout.debt;
                    if (!e) return;
                    e.x = Math.round(e.x + dx);
                    e.y = Math.round(e.y + dy);
                },
                applySize: (ms, dw, dh) => {
                    const e = ms.layout.debt;
                    if (!e) return;
                    e.w = Math.max(80, Math.round(e.w + dw));
                    e.h = Math.max(40, Math.round(e.h + dh));
                    if (e.instance && typeof e.instance.resize === 'function') e.instance.resize(e.w, e.h);
                },
                getExport: (ms) => {
                    const e = ms.layout.debt;
                    if (!e) return null;
                    return { x: Math.round(e.x), y: Math.round(e.y), w: Math.round(e.w), h: Math.round(e.h) };
                }
            },

            chars: {
                // chars ignores layout.x/y - it uses charsY and centres X from width+scale
                getBounds: (ms) => {
                    const e = ms.layout.chars;
                    if (!e) return null;
                    const s = ms.charsScale;
                    const bw = e.w * s;
                    const bh = e.h * s;
                    const bx = (ms.width - bw) / 2;
                    const by = ms.charsY;
                    return { x: bx, y: by, w: bw, h: bh };
                },
                applyDelta: (ms, dx, dy) => {
                    // Y: shift the live charsY AND the yPositions target so it sticks
                    ms.charsY = Math.round(ms.charsY + dy);
                    if (ms.yPositions) {
                        const stateName = ms.gameState;
                        // Determine which yPosition target is driving this state
                        const usesCenter = ['INTRO_CHARS_CENTER', 'PENALTY_SLIDE_DOWN', 'PENALTY_WAIT_CHOICE',
                            'PENALTY_RESOLUTION', 'WIN_SEQUENCE', 'WIN_WAIT', 'LOSE_SEQUENCE'];
                        if (usesCenter.includes(stateName)) {
                            ms.yPositions.charsCenter = Math.round(ms.yPositions.charsCenter + dy);
                        } else {
                            ms.yPositions.charsMinimized = Math.round(ms.yPositions.charsMinimized + dy);
                        }
                    }
                    // X is always centered; dx intentionally ignored
                },
                applySize: (ms, dw, dh) => {
                    const e = ms.layout.chars;
                    if (!e) return;
                    e.w = Math.max(80, Math.round(e.w + dw));
                    e.h = Math.max(40, Math.round(e.h + dh));
                    if (e.instance && typeof e.instance.resize === 'function') e.instance.resize(e.w, e.h);
                },
                getExport: (ms) => {
                    return {
                        charsY_center: Math.round(ms.yPositions ? ms.yPositions.charsCenter : ms.charsY),
                        charsY_minimized: Math.round(ms.yPositions ? ms.yPositions.charsMinimized : ms.charsY),
                        layout_w: Math.round(ms.layout.chars ? ms.layout.chars.w : 0),
                        layout_h: Math.round(ms.layout.chars ? ms.layout.chars.h : 0),
                    };
                }
            },

            carrot: {
                // carrot renders from its own internal layout.nodeX/Y and baseX/Y
                getBounds: (ms) => {
                    const ci = ms.carrot;
                    if (!ci) return null;
                    const slideOffsetY = ms.bottomY - ms.yPositions.bottomOnscreen;
                    const nx = ci.layout.nodeX;
                    const ny = ci.layout.nodeY + slideOffsetY;
                    const r = 60; // approximate hit-zone radius around node
                    return { x: nx - r, y: ny - r, w: r * 2, h: r * 2 };
                },
                applyDelta: (ms, dx, dy) => {
                    const ci = ms.carrot;
                    if (!ci) return;
                    ci.layout.nodeX = Math.round(ci.layout.nodeX + dx);
                    ci.layout.nodeY = Math.round(ci.layout.nodeY + dy);
                    ci.layout.baseX = Math.round(ci.layout.baseX + dx);
                    ci.layout.baseY = Math.round(ci.layout.baseY + dy);
                },
                applySize: (ms, dw, dh) => {
                    const ci = ms.carrot;
                    if (!ci) return;
                    // Independently offsets the carrot sprout node location via resize drag
                    ci.layout.nodeX = Math.round(ci.layout.nodeX + dw);
                    ci.layout.nodeY = Math.round(ci.layout.nodeY + dh);
                },
                getExport: (ms) => {
                    const ci = ms.carrot;
                    if (!ci) return null;
                    return {
                        nodeX: Math.round(ci.layout.nodeX),
                        nodeY: Math.round(ci.layout.nodeY),
                        baseX: Math.round(ci.layout.baseX),
                        baseY: Math.round(ci.layout.baseY),
                    };
                }
            },

            carrotRight: {
                getBounds: (ms) => {
                    const ci = ms.carrotRight;
                    if (!ci) return null;
                    const slideOffsetY = ms.bottomY - ms.yPositions.bottomOnscreen;
                    // carrotRight mirrors with ctx.scale(-1,1) after ctx.translate(width,0)
                    // so its internal nodeX is measured from the right edge
                    const nx = ms.width - ci.layout.nodeX;
                    const ny = ci.layout.nodeY + slideOffsetY;
                    const r = 60;
                    return { x: nx - r, y: ny - r, w: r * 2, h: r * 2 };
                },
                applyDelta: (ms, dx, dy) => {
                    const ci = ms.carrotRight;
                    if (!ci) return;
                    // dx is mirrored because of the ctx.scale(-1,1) flip
                    ci.layout.nodeX = Math.round(ci.layout.nodeX - dx);
                    ci.layout.nodeY = Math.round(ci.layout.nodeY + dy);
                    ci.layout.baseX = Math.round(ci.layout.baseX - dx);
                    ci.layout.baseY = Math.round(ci.layout.baseY + dy);
                },
                applySize: (ms, dw, dh) => {
                    const ci = ms.carrotRight;
                    if (!ci) return;
                    // Independently offsets mirrored right sprout node location (X delta flipped due to matrix scale)
                    ci.layout.nodeX = Math.round(ci.layout.nodeX - dw);
                    ci.layout.nodeY = Math.round(ci.layout.nodeY + dh);
                },
                getExport: (ms) => {
                    const ci = ms.carrotRight;
                    if (!ci) return null;
                    return {
                        nodeX: Math.round(ci.layout.nodeX),
                        nodeY: Math.round(ci.layout.nodeY),
                        baseX: Math.round(ci.layout.baseX),
                        baseY: Math.round(ci.layout.baseY),
                    };
                }
            },
        };
    }

    // =========================================================================
    // UI
    // =========================================================================

    _initUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'layout-editor-panel';
        this.uiContainer.style.cssText = [
            'position:fixed', 'top:10px', 'left:10px', 'z-index:99999',
            'background:rgba(10,15,28,0.96)', 'border:2px solid #3b82f6',
            'color:#f1f5f9', "font-family:'Courier New',monospace",
            'padding:14px 16px', 'border-radius:10px',
            'box-shadow:0 8px 32px rgba(0,0,0,0.7),0 0 20px rgba(59,130,246,0.15)',
            'width:290px', 'font-size:11.5px', 'line-height:1.6', 'user-select:none'
        ].join(';');

        const sel = 'width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #334155;padding:5px 8px;border-radius:5px;font-family:monospace;font-size:11px;cursor:pointer;';
        const btnD = 'background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:5px 8px;border-radius:5px;cursor:pointer;font-family:monospace;font-size:11px;';

        this.uiContainer.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
  <span style="color:#60a5fa;font-weight:bold;font-size:13px;letter-spacing:1px;">&#9881; LAYOUT EDITOR</span>
  <span id="gle-stage-badge" style="background:#1e3a5f22;color:#f59e0b;font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid #f59e0b44;font-weight:bold;">LOADING</span>
</div>

<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;cursor:pointer;padding:6px 8px;background:rgba(59,130,246,0.1);border-radius:6px;border:1px solid #1e40af;">
  <input type="checkbox" id="gle-toggle" style="width:14px;height:14px;cursor:pointer;accent-color:#3b82f6;">
  <span style="font-weight:bold;color:#bfdbfe;">Enable Visual Editing</span>
</label>

<div style="margin-bottom:10px;">
  <div style="color:#94a3b8;font-size:10px;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">Simulate Game State</div>
  <select id="gle-state-select" style="${sel}">
    <option value="">- Live (don't freeze) -</option>
    <option value="INTRO_CHARS_CENTER">INTRO_CHARS_CENTER (chars big, cards hidden)</option>
    <option value="INTRO_MINIMIZE">INTRO_MINIMIZE (chars small, no cards)</option>
    <option value="PLAYING">PLAYING (cards visible, chars small)</option>
    <option value="PENALTY_WAIT_CHOICE">PENALTY_WAIT_CHOICE (chars big, carrots active)</option>
    <option value="WIN_SEQUENCE">WIN_SEQUENCE (chars big)</option>
    <option value="LOSE_SEQUENCE">LOSE_SEQUENCE (chars big)</option>
  </select>
</div>

<div style="border-top:1px solid #1e293b;padding-top:10px;margin-bottom:10px;">
  <div style="color:#94a3b8;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Selected Component</div>
  <div id="gle-info" style="color:#cbd5e1;min-height:48px;padding:6px 8px;background:rgba(15,23,42,0.8);border-radius:5px;border:1px solid #1e293b;">
    Click a highlighted box to select...
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;">
  <button id="gle-nudge-left"  style="${btnD}">&#9668; X-1</button>
  <button id="gle-nudge-right" style="${btnD}">X+1 &#9658;</button>
  <button id="gle-nudge-up"    style="${btnD}">&#9650; Y-1</button>
  <button id="gle-nudge-down"  style="${btnD}">Y+1 &#9660;</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px;">
  <button id="gle-shrink-w" style="${btnD}">W&#8722;5</button>
  <button id="gle-grow-w"   style="${btnD}">W+5</button>
  <button id="gle-shrink-h" style="${btnD}">H&#8722;5</button>
  <button id="gle-grow-h"   style="${btnD}">H+5</button>
</div>

<button id="gle-deselect" style="background:transparent;color:#64748b;border:1px solid #334155;padding:5px 8px;border-radius:5px;cursor:pointer;font-family:monospace;font-size:11px;width:100%;margin-bottom:6px;">&#10005; Deselect</button>

<button id="gle-export" style="width:100%;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;font-family:monospace;box-shadow:0 2px 8px rgba(37,99,235,0.4);">
  &#128190; Export Layout JSON
</button>

<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e293b;color:#475569;font-size:10px;text-align:center;line-height:1.4;">
  Drag = move &middot; Bottom-right grip = resize<br>
  Nudge buttons for 1px precision
</div>`;

        document.body.appendChild(this.uiContainer);

        // ── Events ────────────────────────────────────────────────────────────
        document.getElementById('gle-toggle').addEventListener('change', (e) => {
            this.isActive = e.target.checked;
            if (!this.isActive) {
                this._restoreGameState();
                this.selectedElement = null;
                this._updateInfoPanel(null, null);
            }
        });

        document.getElementById('gle-state-select').addEventListener('change', (e) => {
            this._simulatedGameState = e.target.value || null;
            this._applySimulatedGameState();
        });

        document.getElementById('gle-export').addEventListener('click', () => this.exportLayout());
        document.getElementById('gle-deselect').addEventListener('click', () => {
            this.selectedElement = null;
            this._updateInfoPanel(null, null);
        });

        // Nudge buttons (hold-to-repeat)
        const nudgeMap = {
            'gle-nudge-left': (ms) => this._nudge(ms, -1, 0),
            'gle-nudge-right': (ms) => this._nudge(ms, +1, 0),
            'gle-nudge-up': (ms) => this._nudge(ms, 0, -1),
            'gle-nudge-down': (ms) => this._nudge(ms, 0, +1),
            'gle-shrink-w': (ms) => { const d = this._getDescriptors(); if (d[this.selectedElement]) d[this.selectedElement].applySize(ms, -5, 0); },
            'gle-grow-w': (ms) => { const d = this._getDescriptors(); if (d[this.selectedElement]) d[this.selectedElement].applySize(ms, +5, 0); },
            'gle-shrink-h': (ms) => { const d = this._getDescriptors(); if (d[this.selectedElement]) d[this.selectedElement].applySize(ms, 0, -5); },
            'gle-grow-h': (ms) => { const d = this._getDescriptors(); if (d[this.selectedElement]) d[this.selectedElement].applySize(ms, 0, +5); },
        };

        for (const [id, fn] of Object.entries(nudgeMap)) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            let iv = null;
            btn.addEventListener('mousedown', () => {
                const ms = this._getMainScreen();
                if (ms) { fn(ms); this._refreshInfoFromSelected(ms); }
                iv = setInterval(() => {
                    const ms2 = this._getMainScreen();
                    if (ms2) { fn(ms2); this._refreshInfoFromSelected(ms2); }
                }, 80);
            });
            const stop = () => clearInterval(iv);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
        }
    }

    _nudge(ms, dx, dy) {
        if (!this.selectedElement) return;
        const d = this._getDescriptors();
        if (d[this.selectedElement]) d[this.selectedElement].applyDelta(ms, dx, dy);
    }

    _getMainScreen() {
        return this.gm._components['playing'] || null;
    }

    _refreshInfoFromSelected(ms) {
        if (!this.selectedElement || !ms) return;
        const d = this._getDescriptors();
        const desc = d[this.selectedElement];
        if (desc) {
            const b = desc.getBounds(ms);
            this._updateInfoPanel(this.selectedElement, b);
        }
    }

    // =========================================================================
    // DRAW PIPELINE HOOK
    // =========================================================================

    _hookDrawPipeline() {
        const self = this;
        const origDraw = this.gm._draw.bind(this.gm);

        this.gm._draw = function () {
            origDraw();
            if (self.gm._ctx) self._drawOverlay(self.gm._ctx);

            const badge = document.getElementById('gle-stage-badge');
            if (badge) {
                badge.textContent = self.gm._state;
                const cols = { LOADING: '#64748b', START: '#10b981', PLAYING: '#3b82f6', GAMEOVER: '#ef4444' };
                const c = cols[self.gm._state] || '#f59e0b';
                badge.style.color = c;
                badge.style.borderColor = c + '44';
                badge.style.background = c + '22';
            }
        };
    }

    // =========================================================================
    // MOUSE HOOKS (capture phase)
    // =========================================================================

    _hookMouseEvents() {
        const tryAttach = () => {
            this._canvas = document.getElementById(this.gm._canvasId);
            if (!this._canvas) { requestAnimationFrame(tryAttach); return; }
            this._canvas.addEventListener('mousedown', (e) => this._onMouseDown(e), true);
            this._canvas.addEventListener('mousemove', (e) => this._onMouseMove(e), true);
            this._canvas.addEventListener('mouseup', (e) => this._onMouseUp(e), true);
        };
        requestAnimationFrame(tryAttach);
    }

    _canvasCoords(e) {
        if (!this._canvas) return { x: 0, y: 0 };
        const rect = this._canvas.getBoundingClientRect();
        const scaleX = this.gm._width / rect.width;
        const scaleY = this.gm._height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    _onMouseDown(e) {
        if (!this.isActive) return;
        const { x, y } = this._canvasCoords(e);
        if (this._processMouseDown(x, y)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    _onMouseMove(e) {
        if (!this.isActive) return;
        const { x, y } = this._canvasCoords(e);
        if (this._processMouseMove(x, y)) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    _onMouseUp(e) {
        if (!this.isActive) return;
        if (this.isDragging || this.isResizing) e.stopImmediatePropagation();
        this.isDragging = false;
        this.isResizing = false;
    }

    // =========================================================================
    // MOUSE PROCESSING  (uses descriptors for actual screen bounds)
    // =========================================================================

    _processMouseDown(mx, my) {
        const ms = this._getMainScreen();
        if (!ms) return false;

        const descs = this._getDescriptors();

        // Iterate whitelist in reverse (last drawn = topmost)
        const keys = [...this.PLAYING_WHITELIST].reverse();
        for (const name of keys) {
            const desc = descs[name];
            if (!desc) continue;
            const b = desc.getBounds(ms);
            if (!b) continue;

            const { x, y, w, h } = b;

            // Resize grip (bottom-right corner)
            if (mx >= x + w - this.handleSize && mx <= x + w &&
                my >= y + h - this.handleSize && my <= y + h) {
                this.selectedElement = name;
                this.isResizing = true;
                this.isDragging = false;
                this._resizeBounds = { x, y, w, h }; // snapshot for size math
                this._updateInfoPanel(name, b);
                return true;
            }

            // Drag surface
            if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
                this.selectedElement = name;
                this.isDragging = true;
                this.isResizing = false;
                this.dragOffset.x = mx - x;
                this.dragOffset.y = my - y;
                this._prevDragPos = { x: mx, y: my }; // track delta between moves
                this._updateInfoPanel(name, b);
                return true;
            }
        }

        this.selectedElement = null;
        this._updateInfoPanel(null, null);
        return false;
    }

    _processMouseMove(mx, my) {
        if (!this.selectedElement) return false;
        const ms = this._getMainScreen();
        if (!ms) return false;
        const desc = this._getDescriptors()[this.selectedElement];
        if (!desc) return false;

        if (this.isDragging && this._prevDragPos) {
            const dx = mx - this._prevDragPos.x;
            const dy = my - this._prevDragPos.y;
            this._prevDragPos = { x: mx, y: my };
            desc.applyDelta(ms, dx, dy);
            const b = desc.getBounds(ms);
            this._updateInfoPanel(this.selectedElement, b);
            return true;
        }

        if (this.isResizing && this._resizeBounds) {
            const dw = mx - (this._resizeBounds.x + this._resizeBounds.w);
            const dh = my - (this._resizeBounds.y + this._resizeBounds.h);
            desc.applySize(ms, dw, dh);
            // Update snapshot so incremental resize doesn't double-apply
            this._resizeBounds.w = Math.max(20, this._resizeBounds.w + dw);
            this._resizeBounds.h = Math.max(20, this._resizeBounds.h + dh);
            const b = desc.getBounds(ms);
            this._updateInfoPanel(this.selectedElement, b);
            return true;
        }

        return false;
    }

    // =========================================================================
    // GAME STATE SIMULATION
    // =========================================================================

    _applySimulatedGameState() {
        const ms = this._getMainScreen();
        if (!ms) return;

        if (this._simulatedGameState) {
            if (this._originalGameState === null) this._originalGameState = ms.gameState;
            ms.gameState = this._simulatedGameState;
            ms.stateTimer = 999;

            const yp = ms.yPositions;
            if (!yp) return;

            const targets = {
                'INTRO_CHARS_CENTER': { charsY: yp.charsCenter, charsScale: 1.0, bottomY: yp.bottomOffscreen, cardGameScale: 0.0 },
                'INTRO_MINIMIZE': { charsY: yp.charsMinimized, charsScale: 0.5, bottomY: yp.bottomOnscreen, cardGameScale: 0.0 },
                'PLAYING': { charsY: yp.charsMinimized, charsScale: 0.5, bottomY: yp.bottomOnscreen, cardGameScale: 1.0 },
                'PENALTY_WAIT_CHOICE': { charsY: yp.charsCenter, charsScale: 1.0, bottomY: yp.bottomOnscreen, cardGameScale: 0.0 },
                'WIN_SEQUENCE': { charsY: yp.charsCenter, charsScale: 1.0, bottomY: yp.bottomOnscreen, cardGameScale: 0.0 },
                'LOSE_SEQUENCE': { charsY: yp.charsCenter, charsScale: 1.0, bottomY: yp.bottomOnscreen, cardGameScale: 0.0 },
            };

            const t = targets[this._simulatedGameState];
            if (t) {
                ms.charsY = t.charsY;
                ms.charsScale = t.charsScale;
                ms.bottomY = t.bottomY;
                ms.cardGameScale = t.cardGameScale;
            }
        } else {
            this._restoreGameState();
        }
    }

    _restoreGameState() {
        if (this._originalGameState !== null) {
            const ms = this._getMainScreen();
            if (ms) { ms.gameState = this._originalGameState; ms.stateTimer = 0; }
            this._originalGameState = null;
        }
        this._simulatedGameState = null;
        const sel = document.getElementById('gle-state-select');
        if (sel) sel.value = '';
    }

    // =========================================================================
    // INFO PANEL
    // =========================================================================

    _updateInfoPanel(name, bounds) {
        const info = document.getElementById('gle-info');
        if (!info) return;
        if (!name) {
            info.innerHTML = '<span style="color:#475569;">Click a highlighted box to select...</span>';
            return;
        }
        const round = (v) => v != null ? Math.round(v) : '—';
        info.innerHTML =
            '<span style="color:#60a5fa;font-weight:bold;font-size:12px;">' + name.toUpperCase() + '</span><br>' +
            '<span style="color:#94a3b8;">' +
            'X: <span style="color:#f1f5f9;">' + round(bounds && bounds.x) + '</span>  ' +
            'Y: <span style="color:#f1f5f9;">' + round(bounds && bounds.y) + '</span><br>' +
            'W: <span style="color:#f1f5f9;">' + round(bounds && bounds.w) + '</span>  ' +
            'H: <span style="color:#f1f5f9;">' + round(bounds && bounds.h) + '</span>' +
            '</span>';
    }

    // =========================================================================
    // CANVAS OVERLAY
    // =========================================================================

    _drawOverlay(ctx) {
        if (!this.isActive) return;
        const ms = this._getMainScreen();
        if (!ms) return; // only overlay in playing-sub mode

        const descs = this._getDescriptors();

        ctx.save();
        ctx.setLineDash([]);

        for (const name of this.PLAYING_WHITELIST) {
            const desc = descs[name];
            if (!desc) continue;
            const b = desc.getBounds(ms);
            if (!b) continue;

            const { x, y, w, h } = b;
            const isSel = (name === this.selectedElement);

            // Box
            ctx.strokeStyle = isSel ? '#ef4444' : '#3b82f6';
            ctx.lineWidth = isSel ? 2.5 : 1.5;
            ctx.setLineDash(isSel ? [] : [5, 4]);
            ctx.strokeRect(x + 0.5, y + 0.5, w, h);
            ctx.setLineDash([]);

            // Tint
            ctx.fillStyle = isSel ? 'rgba(239,68,68,0.10)' : 'rgba(59,130,246,0.04)';
            ctx.fillRect(x, y, w, h);

            // Label pill
            ctx.font = 'bold 10px monospace';
            const labelText = name + '  ' + Math.round(w) + 'x' + Math.round(h);
            const lw = ctx.measureText(labelText).width + 10;
            ctx.fillStyle = isSel ? 'rgba(127,29,29,0.88)' : 'rgba(15,23,42,0.84)';
            ctx.fillRect(x, y, lw, 16);
            ctx.fillStyle = isSel ? '#fca5a5' : '#93c5fd';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, x + 5, y + 8);

            // Resize grip
            ctx.fillStyle = isSel ? '#ef4444' : '#3b82f6';
            ctx.fillRect(x + w - this.handleSize, y + h - this.handleSize, this.handleSize, this.handleSize);

            // Corner dots
            ctx.fillStyle = isSel ? '#f87171' : '#60a5fa';
            [[x, y], [x + w, y], [x, y + h]].forEach(([dx, dy]) => {
                ctx.beginPath();
                ctx.arc(dx, dy, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.restore();
    }

    // =========================================================================
    // EXPORT
    // =========================================================================

    exportLayout() {
        const ms = this._getMainScreen();
        if (!ms) {
            alert('[Layout Editor] MainScreen not loaded yet. Start the game first.');
            return;
        }

        const descs = this._getDescriptors();
        const out = {};
        for (const name of this.PLAYING_WHITELIST) {
            const desc = descs[name];
            if (desc) out[name] = desc.getExport(ms);
        }

        const json = JSON.stringify(out, null, 2);
        const suffix = this._simulatedGameState ? '_' + this._simulatedGameState : '';
        const filename = 'layout-playing-sub' + suffix + '-' + Date.now() + '.json';

        console.log('%c[GameLayoutEditor] Export' + suffix, 'color:#22c55e;font-weight:bold;');
        console.log(json);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}