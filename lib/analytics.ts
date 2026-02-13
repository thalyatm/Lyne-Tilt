const ENDPOINT = '/api/analytics/events';
const FLUSH_INTERVAL = 5000;
const MAX_BATCH = 20;

let sessionId: string | null = null;
let queue: Array<Record<string, unknown>> = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const stored = sessionStorage.getItem('_a_sid');
    if (stored) {
      sessionId = stored;
      return stored;
    }
  } catch { /* SSR or restricted */ }

  const id = crypto.randomUUID();
  sessionId = id;
  try {
    sessionStorage.setItem('_a_sid', id);
  } catch { /* ignore */ }
  return id;
}

function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  const payload = JSON.stringify({ events: batch });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, payload);
  } else {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL);
}

export function trackEvent(
  eventType: string,
  data?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  queue.push({
    event_type: eventType,
    entity_type: data?.entityType,
    entity_id: data?.entityId,
    session_id: getSessionId(),
    referrer: document.referrer || undefined,
    pathname: window.location.hash.replace('#', '') || '/',
    metadata: data?.metadata,
    timestamp: new Date().toISOString(),
  });

  if (queue.length >= MAX_BATCH) {
    flush();
  } else {
    scheduleFlush();
  }
}

export function trackPageView() {
  trackEvent('page_view');
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
