/**
 * SimpleAssetManager
 *
 * A lightweight, high-performance asset pre-loader designed to integrate with
 * the GameLoader/GameManager pipeline.
 *
 * Usage:
 *   const assets = [
 *     { key: 'logo',   src: 'images/logo.png'   },
 *     { key: 'carrot', src: 'images/carrot-1.png' },
 *   ];
 *   AssetManager.load(assets, (pct) => loader.setProgress(pct * 100), () => console.log('done'));
 *   const img = AssetManager.get('logo');
 *
 * NOTE: GameLoader and StartScreen already call `AssetManager.get('logo')` as a
 * global, so this class exposes both static AND matching instance-level methods
 * so that either usage pattern works without modification to existing code.
 */
class SimpleAssetManager {
  constructor() {
    /** @private {Map<string, HTMLImageElement>} */
    this._registry = new Map();
  }

  /**
   * The complete collection of all game assets across all mounting components,
   * assuming all image files are moved to the root 'images/' folder.
   *
   * @returns {Array<{key: string, src: string}>}
   */
  get MANIFEST() {
    return [
      // 1. Logo / Core Brand assets
      { key: 'logo', src: 'images/logo.jpg' },

      // 2. Carrot cutter assets (originally in carrot/images/)
      { key: 'base', src: 'images/carrot-base.png' },
      { key: 'top1', src: 'images/carrot-1.png' },
      { key: 'top2', src: 'images/carrot-2.png' },
      { key: 'top3', src: 'images/carrot-3.png' },
      { key: 'top4', src: 'images/carrot-4.png' },
      { key: 'top5', src: 'images/carrot-5.png' },
      { key: 'carrot-top', src: 'images/carrot-top.png' },
      { key: 'carrot-bottom', src: 'images/carrot-bottom.png' },
      { key: 'image1', src: 'images/image1.png' },

      // 3. Characters assets (originally in chars/images/)
      { key: 'char-1', src: 'images/char-1.webp' },
      { key: 'char-2', src: 'images/char-2.webp' },
      { key: 'char-3', src: 'images/char-3.webp' },
      { key: 'char-4', src: 'images/char-4.webp' },
      { key: 'char-5', src: 'images/char-5.webp' },
      { key: 'headshot-1', src: 'images/headshot-1.jpg' },
      { key: 'headshot-2', src: 'images/headshot-2.jpg' },
      { key: 'headshot-3', src: 'images/headshot-3.jpg' },
      { key: 'headshot-4', src: 'images/headshot-4.jpg' },
      { key: 'headshot-5', src: 'images/headshot-5.jpg' },

      // 4. Credits assets (originally in credits/images/)
      { key: 'images/kenwheadon.png', src: 'images/kenwheadon.png' },
      { key: 'images/janedoe.png', src: 'images/janedoe.png' },
      { key: 'images/terminal.png', src: 'images/terminal.png' },

      // 5. Achievements/Tracker assets (originally in tracker/images/)
      { key: 'madeit.webp', src: 'images/madeit.webp' },
      { key: 'friends.webp', src: 'images/friends.webp' },
      { key: 'champion.png', src: 'images/champion.png' },
      { key: 'speed.png', src: 'images/speed.png' },

      // 6. Help manual panel pages
      { key: 'page-1', src: 'images/page-1.png' },
      { key: 'page-2', src: 'images/page-2.png' },
      { key: 'page-3', src: 'images/page-3.png' },
      { key: 'page-4', src: 'images/page-4.png' },
      { key: 'page-5', src: 'images/page-5.png' }
    ];
  }

  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────

  /**
   * Pre-loads an array of image assets, reporting granular progress via
   * callbacks. Errors are swallowed so a single missing file can never hang
   * the pipeline – the slot simply stays empty (and `get()` returns null).
   *
   * @param {Array<{key: string, src: string}>} assetsArray
   * @param {function(number): void}           onProgress  – called with a
   *   normalised value in [0, 1] after every individual asset resolves.
   * @param {function(): void}                 onComplete  – called once when
   *   every asset in the batch has settled (loaded or errored).
   */
  load(assetsArray, onProgress, onComplete) {
    if (!assetsArray || assetsArray.length === 0) {
      onProgress?.(1);
      onComplete?.();
      return;
    }

    const total = assetsArray.length;
    let loaded = 0;

    const settle = (key, img) => {
      if (img) this._registry.set(key, img);

      loaded++;
      const normalised = loaded / total;

      try { onProgress?.(normalised); } catch (e) {
        console.warn('[AssetManager] onProgress threw:', e);
      }

      if (loaded === total) {
        try { onComplete?.(); } catch (e) {
          console.warn('[AssetManager] onComplete threw:', e);
        }
      }
    };

    for (const { key, src } of assetsArray) {
      const img = new Image();
      img.onload = () => settle(key, img);
      img.onerror = (err) => {
        console.warn(`[AssetManager] Failed to load asset "${key}" from "${src}":`, err);
        settle(key, null);   // counts as settled so pipeline never hangs
      };
      img.src = src;
    }
  }

  /**
   * Automatically pre-loads all default assets defined in MANIFEST.
   *
   * @param {function(number): void}           onProgress  – normalized progress [0, 1]
   * @param {function(): void}                 onComplete  – completion handler
   */
  loadAllDefault(onProgress, onComplete) {
    this.load(this.MANIFEST, onProgress, onComplete);
  }

  /**
   * Retrieves a fully loaded HTMLImageElement by its registration key.
   *
   * @param  {string}              key
   * @returns {HTMLImageElement | null}
   */
  get(key) {
    return this._registry.get(key) ?? null;
  }

  /**
   * Returns true only when ALL keys supplied have successfully loaded images
   * in the registry. Useful for guarding render paths.
   *
   * @param {...string} keys
   * @returns {boolean}
   */
  has(...keys) {
    return keys.every(k => this._registry.has(k) && this._registry.get(k) !== null);
  }

  /**
   * Clears every loaded image – call before re-loading a new asset pack.
   */
  clear() {
    this._registry.clear();
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
//
// Existing components (GameLoader, StartScreen, AchievementSystem) already call
//   `AssetManager.get('logo')` and `AssetManager.get(ach.imageName)`
// as a global variable, so we expose a single shared instance under that name.
// ─────────────────────────────────────────────────────────────────────────────
const AssetManager = new SimpleAssetManager();
