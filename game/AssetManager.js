/**
 * SimpleAssetManager
 *
 * A lightweight, high-performance asset pre-loader designed to integrate with
 * the GameLoader/GameManager pipeline. Handles both images and audio assets.
 *
 * Usage:
 *   const assets = [
 *     { key: 'logo',   src: 'images/logo.png'   },
 *     { key: 'coin',   src: 'audio/coin-drop.mp3' },
 *   ];
 *   AssetManager.load(assets, (pct) => loader.setProgress(pct * 100), () => console.log('done'));
 *   const img = AssetManager.get('logo');
 *   const sound = AssetManager.getAudio('coin');
 */
class SimpleAssetManager {
  constructor() {
    /** @private {Map<string, HTMLImageElement>} */
    this._registry = new Map();
    /** @private {Map<string, HTMLAudioElement>} */
    this._audioRegistry = new Map();
  }

  /**
   * The complete collection of all game assets across all mounting components.
   *
   * @returns {Array<{key: string, src: string}>}
   */
  get MANIFEST() {
    return [
      // 1. Logo / Core Brand assets
      { key: 'logo', src: 'images/logo-ff.svg' },

      // 2. Carrot cutter assets
      { key: 'base', src: 'images/carrot-base.png' },
      { key: 'top1', src: 'images/carrot-1.png' },
      { key: 'top2', src: 'images/carrot-2.png' },
      { key: 'top3', src: 'images/carrot-3.png' },
      { key: 'top4', src: 'images/carrot-4.png' },
      { key: 'top5', src: 'images/carrot-5.png' },
      { key: 'image1', src: 'images/image1.png' },

      // 3. Characters assets
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
      { key: 'char-1-burnt', src: 'images/char-1-burnt.webp' },
      { key: 'char-2-burnt', src: 'images/char-2-burnt.webp' },
      { key: 'char-3-burnt', src: 'images/char-3-burnt.webp' },
      { key: 'char-4-burnt', src: 'images/char-4-burnt.webp' },
      { key: 'char-5-burnt', src: 'images/char-5-burnt.webp' },
      { key: 'can1', src: 'images/can1.webp' },
      { key: 'can2', src: 'images/can2.webp' },
      { key: 'can1-crumple', src: 'images/can1-crumple.webp' },
      { key: 'can2-crumple', src: 'images/can2-crumple.webp' },


      // 4. Credits assets
      { key: 'kenwheadon', src: 'images/kenwheadon.png' },
      { key: 'jessyjeankafka', src: 'images/jessyjeankafka.jpg' },
      { key: 'terminal', src: 'images/terminal.jpg' },

      // 5. Achievements/Tracker assets
      { key: 'madeit.webp', src: 'images/madeit.webp' },
      { key: 'friends.webp', src: 'images/friends.webp' },
      { key: 'champion.png', src: 'images/champion.png' },
      { key: 'speed.png', src: 'images/speed.png' },

      // 6. Help manual panel pages
      { key: 'page-1', src: 'images/page-1.png' },
      { key: 'page-2', src: 'images/page-2.png' },
      { key: 'page-3', src: 'images/page-3.png' },
      { key: 'page-4', src: 'images/page-4.png' },
      { key: 'page-5', src: 'images/page-5.png' },

      // 6. Background images
      { key: 'bg-loading', src: 'images/bg-loading.jpg' },
      { key: 'bg-start', src: 'images/bg-start.jpg' },


      // 7. Audio assets (extracted from folder directory)
      { key: 'alert-ding', src: 'audio/alert-ding.mp3' },
      { key: 'bell-correct', src: 'audio/bell-correct-answer.mp3' },
      { key: 'bell-incorrect', src: 'audio/bell-incorrect-answer.mp3' },
      { key: 'card-flip', src: 'audio/card-flip.mp3' },
      { key: 'coin-drop', src: 'audio/coin-drop.mp3' },
      { key: 'hover-1', src: 'audio/hover-1.mp3' },
      { key: 'mouse-click', src: 'audio/mouse-click.mp3' },
      { key: 'pop', src: 'audio/pop.mp3' },
      { key: 'success-shiny', src: 'audio/success-shiny.mp3' },
      { key: 'try-again', src: 'audio/try-again.mp3' },
      { key: 'woosh-fast', src: 'audio/woosh-fast.mp3' },
      { key: 'yell1', src: 'audio/yell1.wav' },
      { key: 'yell2', src: 'audio/yell2.wav' },
      { key: 'yell3', src: 'audio/yell3.wav' },
      { key: 'yell4', src: 'audio/yell4.wav' },
      { key: 'yell5', src: 'audio/yell5.wav' },
      { key: 'yell6', src: 'audio/yell6.wav' },
      { key: 'yell7', src: 'audio/yell7.wav' },
      { key: 'yell8', src: 'audio/yell8.wav' },
      { key: 'yell9', src: 'audio/yell9.wav' },
      { key: 'yell10', src: 'audio/yell10.wav' },
      { key: 'yell11', src: 'audio/yell11.wav' },
      { key: 'yell12', src: 'audio/yell12.wav' },
      { key: 'yell13', src: 'audio/yell13.wav' }
    ];
  }

  // ─────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────

  /**
   * Pre-loads an array of image and audio assets, reporting granular progress via
   * callbacks. Errors are swallowed so a single missing file can never hang
   * the pipeline.
   *
   * @param {Array<{key: string, src: string}>} assetsArray
   * @param {function(number): void}           onProgress  – called with a
   *   normalized value in [0, 1] after every individual asset resolves.
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

    const settle = (key, asset, type) => {
      if (asset) {
        if (type === 'audio') {
          this._audioRegistry.set(key, asset);
        } else {
          this._registry.set(key, asset);
        }
      }

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
      // Simple extension check to detect audio vs image
      const isAudio = /\.(mp3|wav|ogg|aac|m4a)$/i.test(src);

      if (isAudio) {
        const audio = new Audio();
        audio.preload = 'auto';

        let settled = false;
        const handleLoad = () => {
          if (!settled) {
            settled = true;
            settle(key, audio, 'audio');
          }
        };

        // Standard event listener for audio loaded enough to play safely
        audio.addEventListener('canplaythrough', handleLoad);
        audio.addEventListener('error', (err) => {
          if (!settled) {
            settled = true;
            console.warn(`[AssetManager] Failed to load audio asset "${key}" from "${src}":`, err);
            settle(key, null, 'audio');
          }
        });

        audio.src = src;
      } else {
        const img = new Image();
        img.onload = () => settle(key, img, 'image');
        img.onerror = (err) => {
          console.warn(`[AssetManager] Failed to load asset "${key}" from "${src}":`, err);
          settle(key, null, 'image');
        };
        img.src = src;
      }
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
   * Retrieves a fully loaded HTMLAudioElement by its registration key.
   *
   * @param  {string}              key
   * @returns {HTMLAudioElement | null}
   */
  getAudio(key) {
    return this._audioRegistry.get(key) ?? null;
  }

  /**
   * Utility to play a preloaded audio asset easily.
   * 
   * @param {string} key 
   * @param {object} [options]
   * @param {number} [options.volume=1.0] - Volume from 0.0 to 1.0
   * @param {boolean} [options.loop=false] - Whether to loop the track
   */
  playAudio(key, options = {}) {
    const audio = this.getAudio(key);
    if (audio) {
      audio.volume = options.volume ?? 1.0;
      audio.loop = options.loop ?? false;
      audio.currentTime = 0; // Reset track location for spamming SFX
      audio.play().catch((err) => {
        // Safe catch for modern browser auto-play policies blocking audio on load
        console.warn(`[AssetManager] Playback prevented for "${key}":`, err.message);
      });
    } else {
      console.warn(`[AssetManager] Audio asset "${key}" was not found or is still loading.`);
    }
  }

  /**
   * Returns true only when ALL keys supplied have successfully loaded in either registry.
   *
   * @param {...string} keys
   * @returns {boolean}
   */
  has(...keys) {
    return keys.every(k => {
      const imgOk = this._registry.has(k) && this._registry.get(k) !== null;
      const audioOk = this._audioRegistry.has(k) && this._audioRegistry.get(k) !== null;
      return imgOk || audioOk;
    });
  }

  /**
   * Clears every loaded image and sound – call before re-loading a new asset pack.
   */
  clear() {
    this._registry.clear();
    this._audioRegistry.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────
const AssetManager = new SimpleAssetManager();