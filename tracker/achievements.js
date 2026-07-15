/**
 * Particle class handles the canvas-based celebration effects.
 */
class Particle {
  constructor(x, y, emoji) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.size = Math.random() * 15 + 15; 
    
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 3; 
    
    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.01; 
    this.gravity = 0.25;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.15;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    this.rotation += this.rotSpeed;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

/**
 * Game Achievement System Class
 */
class AchievementSystem {
  constructor() {
    // Achievements configuration list: TITLE - DESCRIPTION - IMAGE NAME - EMOJI
    this.rawAchievements = [
      'made it - survive the game - madeit.webp - MUSCLE ARM',
      'friends - all your friends survive - friends.webp - HEART',
      'champion - defeat the final boss without taking damage - champion.png - TROPHY',
      'speedrunner - finish the first act in under 5 minutes - speed.png - FIRE'
    ];

    this.emojiMap = {
      'MUSCLE ARM': '💪',
      'HEART': '❤️',
      'TROPHY': '🏆',
      'FIRE': '🔥',
      'STAR': '⭐'
    };

    this.achievements = [];
    this.particles = [];
    this.isAnimating = false;
    this.isOpen = false;

    this.initAchievements();
    this.loadState();
    this.injectStyles();
    this.createUIElements();
    this.bindEvents();
  }

  initAchievements() {
    this.achievements = this.rawAchievements.map(rawStr => {
      const parts = rawStr.split('-').map(item => item.trim());
      const [title, desc, imageName, emojiKey] = parts;
      
      return {
        title: title,
        desc: desc,
        imageName: imageName,
        emoji: this.emojiMap[emojiKey.toUpperCase()] || emojiKey,
        unlocked: false,
        seen: false 
      };
    });
  }

  loadState() {
    const savedData = localStorage.getItem('game_achievements_state');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        this.achievements.forEach(ach => {
          if (parsed[ach.title]) {
            ach.unlocked = parsed[ach.title].unlocked;
            ach.seen = parsed[ach.title].seen;
          }
        });
      } catch (e) {
        console.error("Failed to parse loaded achievements data", e);
      }
    }
  }

  saveState() {
    const dataToSave = {};
    this.achievements.forEach(ach => {
      dataToSave[ach.title] = {
        unlocked: ach.unlocked,
        seen: ach.seen
      };
    });
    localStorage.setItem('game_achievements_state', JSON.stringify(dataToSave));
  }

  unlockAchievement(title) {
    const ach = this.achievements.find(a => a.title.toLowerCase() === title.toLowerCase());
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.seen = false; 
      this.saveState();
      this.showToastNotification(ach);
    }
  }

  showToastNotification(ach) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <img class="toast-img" src="images/${ach.imageName}" alt="${ach.title}" onerror="this.style.display='none'">
      <div class="toast-content">
        <div class="toast-label">ACHIEVEMENT UNLOCKED!</div>
        <div class="toast-title">${ach.title}</div>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ach-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 10, 12, 0.95);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      
      .ach-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }

      .ach-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10001;
      }

      .ach-window {
        background: #1c1c1f;
        border: 2px solid #e5c158;
        border-radius: 16px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        padding: 30px;
        box-shadow: 0 15px 50px rgba(0,0,0,0.8);
        display: flex;
        flex-direction: column;
        position: relative;
        z-index: 10000;
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .ach-overlay.active .ach-window {
        transform: scale(1);
      }

      .ach-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #333;
        padding-bottom: 15px;
        margin-bottom: 20px;
      }

      .ach-header h2 {
        margin: 0;
        color: #e5c158;
        font-size: 28px;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }

      .ach-close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 30px;
        cursor: pointer;
        transition: color 0.2s;
      }

      .ach-close-btn:hover {
        color: #e5c158;
      }

      .ach-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 20px;
        overflow-y: auto;
        padding: 10px;
        flex-grow: 1;
      }

      /* Grid Card */
      .ach-card {
        background: #252529;
        border: 2px solid #3c3c40;
        border-radius: 12px;
        padding: 15px;
        text-align: center;
        cursor: not-allowed;
        transition: all 0.2s ease;
        user-select: none;
        opacity: 0.4;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .ach-card.unlocked {
        opacity: 1;
        cursor: pointer;
        border-color: #555;
      }

      .ach-card.unlocked:hover {
        border-color: #e5c158;
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(229, 193, 88, 0.2);
      }

      .ach-card-thumb-container {
        width: 70px;
        height: 70px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 10px;
        border-radius: 8px;
        background: #1c1c1f;
        overflow: hidden;
      }

      .ach-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .ach-card-placeholder {
        font-size: 36px;
        color: #666;
      }

      .ach-card-title {
        font-size: 13px;
        font-weight: bold;
        color: #ccc;
        text-transform: capitalize;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }

      .ach-card.unlocked .ach-card-title {
        color: #fff;
      }

      /* Modal Details Window alongside image */
      .ach-modal {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(10, 10, 12, 0.98);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px;
        box-sizing: border-box;
        z-index: 10002;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .ach-modal.active {
        opacity: 1;
        pointer-events: auto;
      }

      .ach-modal-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 30px;
        max-width: 600px;
        text-align: left;
        margin-bottom: 30px;
      }

      @media (max-width: 600px) {
        .ach-modal-content {
          flex-direction: column;
          text-align: center;
        }
      }

      .ach-modal-img {
        width: 150px;
        height: 150px;
        border-radius: 12px;
        border: 3px solid #e5c158;
        object-fit: cover;
        box-shadow: 0 10px 20px rgba(0,0,0,0.5);
      }

      .ach-modal-details {
        display: flex;
        flex-direction: column;
      }

      .ach-modal-title {
        font-size: 32px;
        color: #e5c158;
        margin: 0 0 10px 0;
        text-transform: capitalize;
        font-weight: bold;
      }

      .ach-modal-desc {
        font-size: 18px;
        color: #bbb;
        line-height: 1.5;
        margin: 0;
      }

      /* Toast element rules */
      .achievement-toast {
        position: fixed;
        bottom: -100px;
        right: 20px;
        background: #1c1c1f;
        border: 2px solid #e5c158;
        border-radius: 10px;
        padding: 15px 25px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 100000;
        transition: bottom 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .achievement-toast.show {
        bottom: 20px;
      }

      .toast-img {
        width: 45px;
        height: 45px;
        border-radius: 6px;
        object-fit: cover;
      }

      .toast-content {
        display: flex;
        flex-direction: column;
      }

      .toast-label {
        font-size: 11px;
        color: #e5c158;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .toast-title {
        font-size: 16px;
        font-weight: bold;
        color: #fff;
        text-transform: capitalize;
      }
    `;
    document.head.appendChild(style);
  }

  createUIElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ach-overlay';
    this.overlay.innerHTML = `
      <canvas class="ach-canvas"></canvas>
      <div class="ach-window">
        <div class="ach-header">
          <h2>Achievements</h2>
          <button class="ach-close-btn">&times;</button>
        </div>
        <div class="ach-grid"></div>
        
        <!-- Large Detail Modal -->
        <div class="ach-modal">
          <div class="ach-modal-content">
            <img class="ach-modal-img" src="" alt="Achievement Image">
            <div class="ach-modal-details">
              <h3 class="ach-modal-title">Locked</h3>
              <p class="ach-modal-desc">Locked Description</p>
            </div>
          </div>
          <button class="btn-game ach-modal-close">Close Details</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.canvas = this.overlay.querySelector('.ach-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.grid = this.overlay.querySelector('.ach-grid');
    this.closeBtn = this.overlay.querySelector('.ach-close-btn');
    
    this.modal = this.overlay.querySelector('.ach-modal');
    this.modalImg = this.overlay.querySelector('.ach-modal-img');
    this.modalTitle = this.overlay.querySelector('.ach-modal-title');
    this.modalDesc = this.overlay.querySelector('.ach-modal-desc');
    this.modalCloseBtn = this.overlay.querySelector('.ach-modal-close');

    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindEvents() {
    this.closeBtn.addEventListener('click', () => this.closeCatalog());
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    window.addEventListener('resize', () => this.resizeCanvas());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeCatalog();
      }
    });
  }

  renderGrid() {
    this.grid.innerHTML = '';
    this.achievements.forEach((ach, index) => {
      const card = document.createElement('div');
      card.className = `ach-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
      card.dataset.index = index;
      
      if (ach.unlocked) {
        card.innerHTML = `
          <div class="ach-card-thumb-container">
            <img class="ach-card-img" src="images/${ach.imageName}" alt="${ach.title}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2270%22 height=%2270%22><rect width=%22100%%22 height=%22100%%22 fill=%22%23444%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22>No Image</text></svg>'">
          </div>
          <div class="ach-card-title">${ach.title}</div>
        `;
        card.addEventListener('click', () => this.showDetails(ach));
      } else {
        card.innerHTML = `
          <div class="ach-card-thumb-container">
            <div class="ach-card-placeholder">❓</div>
          </div>
          <div class="ach-card-title">???</div>
        `;
      }

      this.grid.appendChild(card);
    });
  }

  openCatalog() {
    this.isOpen = true;
    this.renderGrid();
    this.overlay.classList.add('active');
    this.resizeCanvas();
    this.startLoop();

    setTimeout(() => {
      this.celebrateNewUnlocks();
    }, 150);
  }

  closeCatalog() {
    this.isOpen = false;
    this.overlay.classList.remove('active');
    this.closeModal();
  }

  celebrateNewUnlocks() {
    let triggeredAny = false;
    const cards = this.grid.querySelectorAll('.ach-card');

    this.achievements.forEach((ach, index) => {
      if (ach.unlocked && !ach.seen) {
        const cardDom = cards[index];
        if (cardDom) {
          const rect = cardDom.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          this.spawnParticles(x, y, ach.emoji, 30);
          ach.seen = true;
          triggeredAny = true;
        }
      }
    });

    if (triggeredAny) {
      this.saveState();
    }
  }

  showDetails(ach) {
    this.modalImg.src = `images/${ach.imageName}`;
    this.modalTitle.textContent = ach.title;
    this.modalDesc.textContent = ach.desc;
    this.modal.classList.add('active');

    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    this.spawnParticles(x, y, ach.emoji, 80);
  }

  closeModal() {
    this.modal.classList.remove('active');
  }

  spawnParticles(x, y, emoji, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, emoji));
    }
    this.startLoop();
  }

  startLoop() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const animateFrame = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.particles = this.particles.filter(p => {
        p.update();
        p.draw(this.ctx);
        return p.alpha > 0;
      });

      if (this.particles.length > 0 || this.isOpen) {
        requestAnimationFrame(animateFrame);
      } else {
        this.isAnimating = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };

    requestAnimationFrame(animateFrame);
  }

  clearProgress() {
    localStorage.removeItem('game_achievements_state');
    this.initAchievements();
    if (this.isOpen) {
      this.renderGrid();
    }
    alert("Progress cleared successfully!");
  }
}