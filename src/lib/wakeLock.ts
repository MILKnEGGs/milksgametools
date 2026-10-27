// Keep the screen on while a tracker is open. The lock drops whenever the page is hidden,
// so it is re-requested when the page comes back. Unsupported browsers just skip it.

export function keepAwake(): () => void {
  let lock: WakeLockSentinel | null = null;
  let active = true;

  async function request() {
    if (!active || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      // Denied (e.g. low battery mode); the screen just sleeps as normal.
    }
  }
  const onVisible = () => void request();

  document.addEventListener('visibilitychange', onVisible);
  void request();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisible);
    void lock?.release().catch(() => {});
  };
}
