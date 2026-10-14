/** Only document URLs are accepted; user input never becomes HTML or script. */
export function browserUrl(input: string, siteOrigin?: string): string | null {
  const value = input.trim();
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    if (siteOrigin && url.origin === new URL(siteOrigin).origin) return null;
    return url.href;
  } catch { return null; }
}

export const BROWSER_HOME = 'about:home';
export const SEARCH_ADDRESS = 'exai://search';
export const searchAddress = (query: string) => `${SEARCH_ADDRESS}?q=${encodeURIComponent(query.trim().slice(0, 200))}`;

export function searchQuery(address: string): string | null {
  try {
    const url = new URL(address);
    return url.protocol === 'exai:' && url.hostname === 'search' ? (url.searchParams.get('q') ?? '').slice(0, 200) : null;
  } catch { return null; }
}

/** Map our public domain to this deployment, including during local preview. */
export function siteAddress(input: string, origin: string, locale: string): string | null {
  try {
    const value = input.trim();
    const url = value.startsWith('/') ? new URL(value, origin) : new URL(value.includes('://') ? value : `https://${value}`);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.origin !== origin && !['extracurricular.ai', 'www.extracurricular.ai'].includes(url.host)) return null;
    const path = url.pathname === '/' ? `/${locale}` : url.pathname;
    return `${path}${url.search}${url.hash}`;
  } catch { return null; }
}

export function isSearchInput(input: string): boolean {
  const value = input.trim();
  return Boolean(value) && !/^[\w+.-]+:/.test(value) && !value.startsWith('/')
    && !/^[^\s/]+\.[^\s/]+(?:[/?#]|$)/.test(value);
}

export interface BrowserHistory { entries: string[]; index: number }
export function visitAddress(history: BrowserHistory, address: string): BrowserHistory {
  if (history.entries[history.index] === address) return history;
  const entries = [...history.entries.slice(0, history.index + 1), address].slice(-100);
  return { entries, index: entries.length - 1 };
}
