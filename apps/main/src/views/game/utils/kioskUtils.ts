/**
 * Kiosk Mode & Anti-Exit Utilities
 * Fullscreen enforcement, screen wake lock, no-exit protection.
 */

let wakeLockSentinel: any = null;

export const kioskUtils = {
  /**
   * Check if document is currently in fullscreen
   */
  isFullscreen(): boolean {
    if (typeof document === 'undefined') return false;
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  },

  /**
   * Request full screen
   */
  async requestFullscreen(): Promise<boolean> {
    try {
      const el = document.documentElement as any;
      if (kioskUtils.isFullscreen()) return true;

      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return true;
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
        return true;
      }
    } catch (err) {
      console.info('Fullscreen request:', err);
    }
    return false;
  },

  /**
   * Listen to fullscreen changes
   */
  onFullscreenChange(callback: (isFullscreen: boolean) => void) {
    const handler = () => {
      callback(kioskUtils.isFullscreen());
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('mozfullscreenchange', handler);
    document.addEventListener('MSFullscreenChange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
      document.removeEventListener('mozfullscreenchange', handler);
      document.removeEventListener('MSFullscreenChange', handler);
    };
  },

  /**
   * Keep screen awake
   */
  async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.info('Wake lock not granted:', err);
      }
    }
    return false;
  },

  releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch (e) {}
      wakeLockSentinel = null;
    }
  },

  enableBeforeUnloadWarning() {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  },

  setupHistoryTrap(onBackAttempt: () => void) {
    window.history.pushState({ inGame: true }, '', window.location.href);
    const onPop = () => {
      window.history.pushState({ inGame: true }, '', window.location.href);
      onBackAttempt();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  },
};
