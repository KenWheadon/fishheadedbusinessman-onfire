/**
 * GameLayoutEditor
 * A visual development tool that mounts onto GameManager to allow real-time
 * dragging, resizing, and JSON exporting of component layout bounds.
 */
class GameLayoutEditor {
    constructor(gameManager) {
        this.gm = gameManager;
        this.isActive = false;
        this.targetLayout = 'top-level'; // 'top-level' (Manager) or 'playing-sub' (MainScreen)

        // Interaction state
        this.selectedElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.handleSize = 10; // size of bottom-right resize square

        this.initUI();
        this.hookGameManager();
    }

    /** Create development control dashboard overlay */
    initUI() {
        this.uiContainer = document.createElement('div');
        this.uiContainer.style = `
      position: fixed; top: 10px; left: 10px; z-index: 9999;
      background: rgba(15, 23, 42, 0.9); border: 2px solid #3b82f6;
      color: #f8fafc; font-family: monospace; padding: 12px;
      border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5);
      width: 280px; font-size: 12px; line-height: 1.5;
    `;

        this.uiContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #60a5fa; display:flex; justify-content:space-between;">
        <span>⚙️ LAYOUT DESIGNER</span>
        <span id="editor-stage-indicator" style="color:#f59e0b">STAGE: LOADING</span>
      </div>
      <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer;">
        <input type="checkbox" id="layout-editor-toggle" style="margin-right: 6px;"> Enable Visual Editing
      </label>
      <div style="margin-bottom: 8px;">
        <span style="color:#94a3b8">Target System:</span><br>
        <select id="layout-target-select" style="width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569; padding: 2px; margin-top:2px;">
          <option value="top-level">Manager Top-Level Layout</option>
          <option value="playing-sub">MainScreen Component Layout</option>
        </select>
      </div>
      <div style="border-top: 1px solid #334155; padding-top: 8px; margin-bottom: 8px;">
        <div id="layout-editor-info" style="color: #cbd5e1; height: 40px;">Select a component to adjust...</div>
      </div>
      <button id="layout-editor-export" style="
        width: 100%; background: #2563eb; color: white; border: none;
        padding: 6px; border-radius: 4px; cursor: pointer; font-weight: bold;
      ">💾 Export Layout JSON</button>
    `;

        document.body.appendChild(this.uiContainer);

        // Wire UI events
        document.getElementById('layout-editor-toggle').addEventListener('change', (e) => {
            this.isActive = e.target.checked;
            if (!this.isActive) this.selectedElement = null;
        });

        document.getElementById('layout-target-select').addEventListener('change', (e) => {
            this.targetLayout = e.target.value;
            this.selectedElement = null;
        });

        document.getElementById('layout-editor-export').addEventListener('click', () => this.exportLayout());
    }

    /** Monkey-patch the rendering cycle and input pipelines safely */
    hookGameManager() {
        const self = this;

        // 1. Hook the draw pipeline
        const originalDraw = this.gm._draw;
        this.gm._draw = function (...args) {
            originalDraw.apply(this, args);
            self.drawOverlay(this._ctx);

            // Update real-time stage label dynamically
            const label = document.getElementById('editor-stage-indicator');
            if (label) label.textContent = `STAGE: ${this._state}`;
        };

        // 2. Intercept canvas mouse interactions when editor is running
        const originalCanvasCoords = this.gm._canvasCoords;

        const handleMouseDown = (e) => {
            if (!this.isActive) return;
            const coords = originalCanvasCoords.call(this.gm, e);
            if (this.processMouseDown(coords.x, coords.y)) {
                e.stopImmediatePropagation(); // Block game inputs if editing
            }
        };

        const handleMouseMove = (e) => {
            if (!this.isActive) return;
            const coords = originalCanvasCoords.call(this.gm, e);
            if (this.processMouseMove(coords.x, coords.y)) {
                e.stopImmediatePropagation();
            }
        };

        const handleMouseUp = (e) => {
            if (!this.isActive) return;
            this.isDragging = false;
            this.isResizing = false;
        };

        // Prepend editor handlers to handle interception cleanly
        const canvas = document.getElementById(this.gm._canvasId);
        canvas.addEventListener('mousedown', handleMouseDown, true);
        canvas.addEventListener('mousemove', handleMouseMove, true);
        canvas.addEventListener('mouseup', handleMouseUp, true);
    }

    /** Resolves which map directory dictionary to manipulate based on selections */
    getActiveLayoutMap() {
        if (this.targetLayout === 'top-level') {
            return this.gm._layout;
        } else if (this.targetLayout === 'playing-sub') {
            const playingScreen = this.gm._components['playing'];
            return playingScreen ? playingScreen.layout : null;
        }
        return null;
    }

    /** Logic to select elements or handle resize grips */
    processMouseDown(mx, my) {
        const layoutMap = this.getActiveLayoutMap();
        if (!layoutMap) return false;

        // Iterate backward to match rendering draw orders (topmost element first)
        const entries = Object.entries(layoutMap);
        for (let i = entries.length - 1; i >= 0; i--) {
            const [name, bounds] = entries[i];
            if (!bounds) continue;

            // Establish box coordinates (defaulting fallback sizes if unassigned)
            const x = bounds.x || 0;
            const y = bounds.y || 0;
            const w = bounds.w !== undefined ? bounds.w : 150;
            const h = bounds.h !== undefined ? bounds.h : 150;

            // Check Bottom-Right corner resize handle grip area
            if (mx >= x + w - this.handleSize && mx <= x + w &&
                my >= y + h - this.handleSize && my <= y + h) {
                this.selectedElement = name;
                this.isResizing = true;
                this.updateInfoPanel(name, bounds);
                return true;
            }

            // Check interior bounding box surface translation click area
            if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
                this.selectedElement = name;
                this.isDragging = true;
                this.dragOffset.x = mx - x;
                this.dragOffset.y = my - y;
                this.updateInfoPanel(name, bounds);
                return true;
            }
        }
        return false;
    }

    /** Drag and Resize logic loops updating bounding properties */
    processMouseMove(mx, my) {
        if (!this.selectedElement) return false;
        const layoutMap = this.getActiveLayoutMap();
        if (!layoutMap) return false;

        const bounds = layoutMap[this.selectedElement];

        if (this.isDragging) {
            bounds.x = Math.round(mx - this.dragOffset.x);
            bounds.y = Math.round(my - this.dragOffset.y);
            this.updateInfoPanel(this.selectedElement, bounds);
            this.syncComponentSize(this.selectedElement, bounds);
            return true;
        }

        if (this.isResizing) {
            const baseBoundsX = bounds.x || 0;
            const baseBoundsY = bounds.y || 0;
            bounds.w = Math.max(20, Math.round(mx - baseBoundsX));
            bounds.h = Math.max(20, Math.round(my - baseBoundsY));
            this.updateInfoPanel(this.selectedElement, bounds);
            this.syncComponentSize(this.selectedElement, bounds);
            return true;
        }
        return false;
    }

    /** Synchronizes underlying structural layout contexts if they have resize routines */
    syncComponentSize(name, bounds) {
        let compInstance = null;
        if (this.targetLayout === 'top-level') {
            compInstance = this.gm._components[name];
        } else {
            const playingScreen = this.gm._components['playing'];
            if (playingScreen && playingScreen.layout[name]) {
                compInstance = playingScreen.layout[name].instance;
            }
        }
        if (compInstance && typeof compInstance.resize === 'function') {
            compInstance.resize(bounds.w, bounds.h);
        }
    }

    updateInfoPanel(name, bounds) {
        const info = document.getElementById('layout-editor-info');
        if (info) {
            info.innerHTML = `
        <span style="color:#60a5fa; font-weight:bold">${name.toUpperCase()}</span><br>
        X: ${bounds.x || 0}px | Y: ${bounds.y || 0}px<br>
        W: ${bounds.w || 'N/A'}px | H: ${bounds.h || 'N/A'}px
      `;
        }
    }

    /** Render alignment overlays directly over the live canvas viewport grid */
    drawOverlay(ctx) {
        if (!this.isActive) return;
        const layoutMap = this.getActiveLayoutMap();
        if (!layoutMap) return;

        ctx.save();
        for (const [name, bounds] of Object.entries(layoutMap)) {
            if (!bounds) continue;

            const x = bounds.x || 0;
            const y = bounds.y || 0;
            const w = bounds.w !== undefined ? bounds.w : 150;
            const h = bounds.h !== undefined ? bounds.h : 150;
            const isSelected = (name === this.selectedElement);

            // Draw bounding box edge tracks
            ctx.strokeStyle = isSelected ? '#ef4444' : '#3b82f6';
            ctx.lineWidth = isSelected ? 3 : 1.5;
            ctx.setLineDash(isSelected ? [] : [4, 4]);
            ctx.strokeRect(x, y, w, h);

            // Semi-transparent surface workspace layer fills
            ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(59, 130, 246, 0.03)';
            ctx.fillRect(x, y, w, h);

            // Draw Resize grip targets
            ctx.fillStyle = isSelected ? '#ef4444' : '#3b82f6';
            ctx.setLineDash([]);
            ctx.fillRect(x + w - this.handleSize, y + h - this.handleSize, this.handleSize, this.handleSize);

            // Label texts
            ctx.fillStyle = isSelected ? '#f87171' : '#60a5fa';
            ctx.font = '11px monospace';
            ctx.fillText(`${name} (${Math.round(w)}x${Math.round(h)})`, x + 4, y + 14);
        }
        ctx.restore();
    }

    /** Serializes current working configuration variables out to downloadable clipboard files */
    exportLayout() {
        const layoutMap = this.getActiveLayoutMap();
        if (!layoutMap) return alert('No active layout map found to output.');

        // Build pretty printed clean layout properties block text output
        const layoutClean = {};
        for (const [key, val] of Object.entries(layoutMap)) {
            if (!val) continue;
            layoutClean[key] = { x: val.x, y: val.y, w: val.w, h: val.h };
        }

        const dataString = JSON.stringify(layoutClean, null, 2);
        console.log(`%c[LAYOUT OVERWRITE EXPORT: ${this.targetLayout.toUpperCase()}]`, 'color: #22c55e; font-weight: bold;');
        console.log(dataString);

        // Create virtual prompt file download tracking point automatically
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `layout-${this.targetLayout}-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}