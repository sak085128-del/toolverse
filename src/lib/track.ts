let enabled = false;

export function initAnalytics(): void {
  enabled = false;
  try {
    const probe = new Function('return typeof window.analytics === "object"');
    enabled = probe();
  } catch { enabled = false; }
  window.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") initAnalytics();
    },
    { once: true }
  );
}

export function track(event: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    const api = (window as unknown as { analytics?: { track?: (e: string, d?: Record<string, unknown>) => void } }).analytics;
    api?.track?.(event, data);
  } catch { /* noop */ }
}

export function trackToolViews(sequence: Array<{ slug: string; title: string }>): void {
  window.addEventListener("load", () => {
    for (const item of sequence) {
      if (document.querySelector(`[data-tool-view="${item.slug}"]`)) {
        track("tool_view", { slug: item.slug, title: item.title });
      }
    }
  });
}