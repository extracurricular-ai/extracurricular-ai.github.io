import { BROWSER_HOME, browserUrl, isSearchInput, searchAddress, searchQuery, siteAddress, visitAddress, type BrowserHistory } from '../lib/browser';
import { searchSite, type SearchDocument } from '../lib/site-search';
import { navigateToPage } from '../lib/desktop-navigation';
import type { BrowserCopy } from '../components/desktop/browser-copy';
import type { SearchCopy } from '../components/desktop/search-copy';

const browser = document.querySelector<HTMLElement>('[data-browser]');
if (browser) {
  const copy: BrowserCopy = JSON.parse(browser.dataset.browserCopy!);
  const searchCopy: SearchCopy = JSON.parse(browser.dataset.searchCopy!);
  const locale = browser.dataset.locale!;
  const searchPanel = browser.querySelector<HTMLElement>('[data-browser-search]')!;
  const searchInput = browser.querySelector<HTMLInputElement>('#ie-search-query')!;
  const searchHeading = browser.querySelector<HTMLElement>('[data-search-heading]')!;
  const searchMessage = browser.querySelector<HTMLElement>('[data-search-message]')!;
  const searchResults = browser.querySelector<HTMLOListElement>('[data-search-results]')!;
  const form = browser.querySelector<HTMLFormElement>('[data-browser-form]')!;
  const address = browser.querySelector<HTMLInputElement>('#ie-address')!;
  const error = browser.querySelector<HTMLElement>('#ie-address-error')!;
  const home = browser.querySelector<HTMLElement>('[data-browser-home]')!;
  const host = browser.querySelector<HTMLElement>('[data-browser-frame]')!;
  const status = browser.querySelector<HTMLElement>('[data-browser-status]')!;
  const favorites = browser.querySelector<HTMLElement>('#ie-favorites')!;
  const action = (name: string) => browser.querySelector<HTMLButtonElement>(`[data-browser-action="${name}"]`)!;
  let history: BrowserHistory = { entries: [BROWSER_HOME], index: 0 };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let suspended = false;
  let generation = 0;
  let index: Promise<SearchDocument[]> | undefined;

  async function showSearch(query: string, focus: boolean) {
    const version = generation;
    searchInput.value = query;
    searchResults.replaceChildren();
    searchMessage.textContent = '';
    searchHeading.textContent = query ? searchCopy.loading : searchCopy.prompt;
    status.textContent = searchHeading.textContent;
    if (focus) (query ? searchHeading : searchInput).focus();
    if (!query || suspended) return;
    searchResults.setAttribute('aria-busy', 'true');
    try {
      index ??= fetch(browser!.dataset.searchIndex!).then(async response => {
        if (!response.ok) throw new Error('Search index unavailable');
        return await response.json() as SearchDocument[];
      }).catch(error => { index = undefined; throw error; });
      const documents = await index;
      if (version !== generation || suspended) return;
      const matches = searchSite(documents, query, locale);
      const fragment = document.createDocumentFragment();
      for (const result of matches) {
        const url = new URL(result.href, location.origin);
        if (url.origin !== location.origin) continue;
        const item = document.createElement('li');
        const meta = document.createElement('small');
        meta.textContent = `${searchCopy[result.kind]} · ${({ zh: '中文', en: 'English', es: 'Español', fr: 'Français' } as Record<string, string>)[result.locale] ?? result.locale}`;
        const heading = document.createElement('h3');
        const link = document.createElement('a');
        link.href = result.href; link.textContent = result.title; link.lang = result.locale;
        heading.append(link);
        const path = document.createElement('small');
        path.textContent = `extracurricular.ai${url.pathname}`;
        const summary = document.createElement('p');
        summary.textContent = result.description; summary.lang = result.locale;
        item.append(meta, heading, path, summary); fragment.append(item);
      }
      searchResults.replaceChildren(fragment);
      searchHeading.textContent = searchCopy.count.replace('{count}', String(searchResults.children.length)).replace('{query}', () => query);
      searchMessage.textContent = searchResults.children.length ? '' : searchCopy.empty;
      status.textContent = searchHeading.textContent;
    } catch {
      if (version !== generation || suspended) return;
      searchHeading.textContent = searchCopy.failed;
      status.textContent = searchCopy.failed;
    } finally {
      if (version === generation) searchResults.removeAttribute('aria-busy');
    }
  }

  function clearError() { error.hidden = true; error.textContent = ''; address.removeAttribute('aria-invalid'); }
  function unload() { generation++; clearTimeout(timer); host.replaceChildren(); searchResults.removeAttribute('aria-busy'); }
  function render(focusSearch = false) {
    const url = history.entries[history.index];
    const isHome = url === BROWSER_HOME;
    const query = searchQuery(url);
    const isLocal = isHome || query !== null;
    unload(); clearError();
    address.value = url;
    home.hidden = !isHome;
    host.hidden = isLocal;
    searchPanel.hidden = query === null;
    action('back').disabled = history.index === 0;
    action('forward').disabled = history.index === history.entries.length - 1;
    browser!.querySelectorAll<HTMLElement>('[data-browser-external]').forEach(el => { el.hidden = isLocal; });
    const external = browser!.querySelector<HTMLAnchorElement>('[data-browser-external-link]')!;
    if (isHome) { external.removeAttribute('href'); status.textContent = copy.ready; return; }
    if (query !== null) { external.removeAttribute('href'); void showSearch(query, focusSearch); return; }
    external.href = url;
    if (suspended) return;
    status.textContent = `${copy.requesting}: ${new URL(url).hostname}`;
    const frame = document.createElement('iframe');
    frame.title = `${copy.pageTitle}: ${url}`;
    frame.referrerPolicy = 'no-referrer';
    // External scripts run in an opaque origin. Never grant access to the
    // desktop, its storage, or top-level navigation, even after a redirect.
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
    frame.allow = "camera 'none'; microphone 'none'; geolocation 'none'; autoplay 'none'; payment 'none'";
    frame.addEventListener('load', () => {
      if (host.firstElementChild !== frame) return;
      clearTimeout(timer);
      // Iframes also fire load for failed/blocked documents. Do not report
      // success or try to inspect a cross-origin document to detect failure.
      status.textContent = `${copy.attempted}: ${new URL(url).hostname}`;
    });
    frame.src = url;
    host.append(frame);
    timer = setTimeout(() => { if (host.firstElementChild === frame) status.textContent = copy.waiting; }, 10_000);
  }
  function navigate(value: string) {
    const trimmed = value.trim();
    const local = siteAddress(trimmed, location.origin, locale);
    if (local) { navigateToPage(local); return; }
    const query = searchQuery(trimmed);
    const url = trimmed === BROWSER_HOME ? BROWSER_HOME : query !== null ? searchAddress(query)
      : isSearchInput(trimmed) ? searchAddress(trimmed) : browserUrl(trimmed, location.origin);
    if (!url) {
      error.textContent = searchCopy.invalid; error.hidden = false; address.setAttribute('aria-invalid', 'true');
      address.focus(); return;
    }
    history = visitAddress(history, url);
    render(searchQuery(url) !== null);
  }
  form.addEventListener('submit', event => { event.preventDefault(); navigate(address.value); });
  browser.querySelectorAll<HTMLFormElement>('[data-site-search-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input')!;
      if (!input.value.trim()) { input.focus(); return; }
      navigate(searchAddress(input.value));
    });
  });
  address.addEventListener('input', clearError);
  browser.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('[data-browser-visit]');
    if (link && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      event.preventDefault(); navigate(link.href); address.focus(); return;
    }
    const button = target.closest<HTMLButtonElement>('[data-browser-action]');
    if (!button) return;
    switch (button.dataset.browserAction) {
      case 'back': if (history.index > 0) { history.index--; render(); if (button.disabled) address.focus(); } break;
      case 'forward': if (history.index < history.entries.length - 1) { history.index++; render(); if (button.disabled) address.focus(); } break;
      case 'refresh': render(); break;
      case 'home': navigate(BROWSER_HOME); break;
      case 'search': navigate(searchAddress('')); break;
      case 'favorites': favorites.hidden = !favorites.hidden; button.setAttribute('aria-expanded', String(!favorites.hidden)); break;
      case 'enter': host.querySelector('iframe')?.focus(); break;
      case 'address': address.focus(); address.select(); break;
    }
  });
  const window = browser.closest<HTMLElement>('[data-window]');
  window?.addEventListener('desktop:close', () => { suspended = true; unload(); });
  window?.addEventListener('desktop:open', () => { if (suspended) { suspended = false; render(); } });
}
