export const SUBMIT_OVERLAY_DELAY_MS = 620;

export function scheduleSubmitOverlay(onVisible: () => void, delay = SUBMIT_OVERLAY_DELAY_MS) {
  const timer = globalThis.setTimeout(onVisible, delay);
  return () => globalThis.clearTimeout(timer);
}
