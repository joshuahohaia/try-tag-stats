/**
 * Optional, privacy-friendly page-view and event counting with GoatCounter.
 *
 * Off by default: nothing loads and nothing is sent unless VITE_GOATCOUNTER_URL is set at build time
 * (for example https://CODE.goatcounter.com/count). GoatCounter sets no cookies.
 *
 * What is sent: the route path (pathname only, no query string) and a small fixed set of event names.
 * Never send player names, team names, search text or any other free text.
 */

export type AnalyticsEvent = 'share-whatsapp' | 'favourite-add' | 'favourite-remove';

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter | { no_onload?: boolean };
  }
}

const COUNT_JS = 'https://gc.zgo.at/count.js';

/** The endpoint to send to, or null when analytics is not configured. */
export function analyticsEndpoint(value: string | undefined = import.meta.env.VITE_GOATCOUNTER_URL): string | null {
  const url = value?.trim();
  if (!url) return null;
  return /^https:\/\/[a-z0-9-]+\.goatcounter\.com\/count$/i.test(url) ? url : null;
}

/** Path to report for a page view: pathname only, so query strings never leave the browser. */
export function pagePath(pathname: string): string {
  return pathname || '/';
}

function counter(): GoatCounter | null {
  const gc = window.goatcounter as Partial<GoatCounter> | undefined;
  return gc && typeof gc.count === 'function' ? (gc as GoatCounter) : null;
}

// count.js loads asynchronously, so the first page view can be reported before it is ready.
// Hold those page views and send them once the script has loaded.
let pendingPaths: string[] = [];

export function trackPageView(pathname: string): void {
  const path = pagePath(pathname);
  const gc = counter();
  if (gc) gc.count({ path });
  else pendingPaths.push(path);
}

function flushPending(): void {
  const gc = counter();
  const paths = pendingPaths;
  pendingPaths = [];
  if (gc) for (const path of paths) gc.count({ path });
}

export function trackEvent(name: AnalyticsEvent): void {
  counter()?.count({ path: name, title: name, event: true });
}

/** Load count.js once. Page views are sent by the router hook, not on script load. */
export function initAnalytics(): boolean {
  const endpoint = analyticsEndpoint();
  if (!endpoint || document.querySelector('script[data-goatcounter]')) return false;
  window.goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = COUNT_JS;
  script.dataset.goatcounter = endpoint;
  script.onload = flushPending;
  document.head.appendChild(script);
  return true;
}
