/**
 * Kiosk Mode & Anti-Exit Utilities
 * Prevents accidental exits, keeps screen awake, forces landscape fullscreen.
 */

let wakeLockSentinel: any = null;

export const kioskUtils = {
  /**
   * Request full screen on modern mobile browsers
   */
  async requestFullscreen(): Promise<boolean> {
    try {
      const el = document.documentElement as any;
      if (document.fullscreenElement) return true;

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
      console.info('Fullscreen request blocked or not supported on this device:', err);
    }
    return false;
  },

  /**
   * Keep screen awake using Screen Wake Lock API
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
        console.info('Wake lock request not granted:', err);
      }
    }
    return false;
  },

  /**
   * Release wake lock if held
   */
  releaseWakeLock() {
    if (wakeLockSentinel) {
      try {
        wakeLockSentinel.release();
      } catch (e) {
        // ignore
      }
      wakeLockSentinel = null;
    }
  },

  /**
   * Register beforeunload confirmation to prevent accidental refresh / tab close
   */
  enableBeforeUnloadWarning() {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'משחק הניווט פעיל! אם תצאו עכשיו, ההתקדמות נשמרת אך מומלץ להישאר במשחק.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  },

  /**
   * Setup a history pushState trap so back button / back swipe doesn't navigate away
   */
  setupHistoryTrap(onBackAttempt: () => void) {
    // Push an extra dummy state
    window.history.pushState({ inGame: true }, '', window.location.href);

    const onPop = (_event: PopStateEvent) => {
      // Re-push to trap
      window.history.pushState({ inGame: true }, '', window.location.href);
      onBackAttempt();
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  },
};
