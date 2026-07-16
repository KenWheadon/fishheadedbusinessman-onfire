const ENABLE_DEBUG = true;

class DebugMenu {
  constructor(gm, endScreen) {
    if (!ENABLE_DEBUG) return;
    
    this.gm = gm;
    this.endScreen = endScreen;
    
    this.createMenu();
  }
  
  createMenu() {
    this.container = document.createElement('div');
    this.container.style.position = 'fixed';
    this.container.style.top = '10px';
    this.container.style.left = '10px';
    this.container.style.padding = '10px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.container.style.border = '1px solid #ff4e50';
    this.container.style.borderRadius = '8px';
    this.container.style.zIndex = '9999';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '8px';
    this.container.style.fontFamily = 'monospace';
    this.container.style.color = '#fff';

    const title = document.createElement('div');
    title.innerText = 'DEBUG MENU';
    title.style.fontWeight = 'bold';
    title.style.textAlign = 'center';
    title.style.marginBottom = '5px';
    title.style.color = '#ff4e50';
    this.container.appendChild(title);

    this.addButton('Jump to Play', () => {
      // Force game playing state
      if (this.gm._components.playing && typeof this.gm._components.playing.reset === 'function') {
        this.gm._components.playing.reset();
      }
      this.gm._transitionTo('PLAYING');
    });

    this.addButton('Simulate Win', () => {
      if (this.endScreen && typeof this.endScreen.setWinState === 'function') {
        this.endScreen.setWinState(true);
      }
      this.gm._transitionTo('GAMEOVER');
    });

    this.addButton('Simulate Lose', () => {
      if (this.endScreen && typeof this.endScreen.setWinState === 'function') {
        this.endScreen.setWinState(false);
      }
      this.gm._transitionTo('GAMEOVER');
    });

    this.addButton('Pay off 100k', () => {
      const playing = this.gm._components.playing;
      if (playing && playing.debt && playing.debt.state === 'active') {
        playing.debt.debt -= 100000;
        playing.debt.textScale = 0.5;
        playing.debt.floatingTexts.push({
            text: '-$100,000',
            x: playing.debt.width / 2 + (Math.random() * 80 - 40),
            y: playing.debt.height / 2 + 15,
            vy: -110,
            opacity: 1.0,
            color: '#22c55e'
        });
        
        // If it goes to 0 or below, we can force the main screen into win sequence
        if (playing.debt.debt <= 0) {
            playing.debt.debt = 0;
            playing.debt.triggerWin();
            playing.gameState = 'WIN_SEQUENCE';
            playing.stateTimer = 1.2;
        }
      }
    });

    this.addButton('Cut Carrot', () => {
      const playing = this.gm._components.playing;
      if (playing && playing.carrot && playing.carrotRight) {
        // Try left side first
        const leftUncut = playing.carrot.carrots.filter(c => !c.isCut);
        if (leftUncut.length > 0) {
            playing.carrot.isLocked = false;
            playing.carrot.cut(leftUncut[0].index);
            return;
        }
        // Then right side
        const rightUncut = playing.carrotRight.carrots.filter(c => !c.isCut);
        if (rightUncut.length > 0) {
            playing.carrotRight.isLocked = false;
            playing.carrotRight.cut(rightUncut[0].index);
        }
      }
    });

    document.body.appendChild(this.container);
  }

  addButton(text, onClick) {
    const btn = document.createElement('button');
    btn.innerText = text;
    btn.style.padding = '5px 10px';
    btn.style.backgroundColor = '#1e1e2d';
    btn.style.color = '#fff';
    btn.style.border = '1px solid #3c3c54';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.fontFamily = 'monospace';
    
    btn.onmouseover = () => btn.style.backgroundColor = '#2a2a3f';
    btn.onmouseout = () => btn.style.backgroundColor = '#1e1e2d';
    
    btn.onclick = onClick;
    this.container.appendChild(btn);
  }
}
