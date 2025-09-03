// lib/_state/resendEvents.ts
export type ResendEvent = {
  id?: string;
  type: string;
  createdAt: number;
  to?: string[] | string;
  subject?: string;
  messageId?: string;
  data?: any;
};

declare global {
  // eslint-disable-next-line no-var
  var __RESEND_EVENTS: ResendEvent[] | undefined;
}

const store: ResendEvent[] = global.__RESEND_EVENTS ?? [];
if (!(global as any).__RESEND_EVENTS) (global as any).__RESEND_EVENTS = store;

export function pushEvent(ev: ResendEvent) {
  store.unshift(ev);
  if (store.length > 200) store.length = 200;
}

export function getEvents(limit = 20) {
  return store.slice(0, limit);
}

export function getSummary(sinceMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - sinceMs;
  const recent = store.filter((e) => e.createdAt >= cutoff);
  const byType = recent.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  return { count: recent.length, byType };
}
