import type { Page } from '@playwright/test';

export function monitorFileRequests(page: Page) {
  const unexpectedRequests: string[] = [];
  page.on('request', request => {
    const method = request.method();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;

    const url = new URL(request.url());
    const analyticsHost = /^(?:[a-z0-9-]+\.)?google-analytics\.com$/.test(url.hostname)
      || url.hostname === 'analytics.google.com'
      || url.hostname === 'stats.g.doubleclick.net';
    const contentType = request.headers()['content-type'] ?? '';
    const isAnalytics = method === 'POST' && url.protocol === 'https:' && analyticsHost
      && url.pathname === '/g/collect' && url.searchParams.get('v') === '2'
      && url.searchParams.get('tid') === 'G-YSZZMM0451'
      && (!contentType || /^text\/plain(?:;|$)/i.test(contentType));

    if (!isAnalytics) unexpectedRequests.push(`${method} ${url.origin}${url.pathname}`);
  });
  return unexpectedRequests;
}
