export class Input {
  constructor(onDirection) {
    this.onDirection = onDirection;

    // Track touch start for swipe detection
    this.touchStartX = 0;
    this.touchStartY = 0;

    window.addEventListener('keydown', (e) => this.handleKey(e));
    window.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  handleKey(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT') return;

    const keyMap = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
    };

    const dir = keyMap[e.code];
    if (dir) {
      e.preventDefault();
      this.onDirection(dir);
    }
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  handleTouchEnd(e) {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    const minSwipe = 30;
    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      this.onDirection(dx > 0 ? 'right' : 'left');
    } else {
      this.onDirection(dy > 0 ? 'down' : 'up');
    }
  }
}
