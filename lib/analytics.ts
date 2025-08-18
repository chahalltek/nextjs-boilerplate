export function track(event: string, params?: Record<string, any>) {
  if (typeof window === "undefined") return;
  // Plausible
  if (window && typeof (window as any).plausible === "function") {
    (window as any).plausible(event, { props: params });
    return;
  }
  // Google Analytics
  const w = window as any;
  if (typeof w.gtag === "function") {
    w.gtag("event", event, params);
  }
}