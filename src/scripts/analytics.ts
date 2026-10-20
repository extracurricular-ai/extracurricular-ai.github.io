// Basic consent mode: no Google script or requests before an explicit opt-in.
// GA Admin > Data streams > Web > Enhanced measurement: turn it off for this
// pageview-only integration. send_page_view:false does NOT disable automatic
// history-based pageviews; enabling them would double-count desktop navigation.
// Development and non-production hosts never load the Google tag.
const measurementId = 'G-5BMZQENB77';
const preferenceKey = 'exai-analytics-consent-v1';
const lifetime = 180 * 24 * 60 * 60 * 1000;
type Choice = 'granted' | 'denied';
type Preference = { choice: Choice; expires: number };
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  'ga-disable-G-5BMZQENB77'?: boolean;
};
const analyticsWindow = window as AnalyticsWindow;
const enabled = import.meta.env.PROD
  && ['extracurricular.ai', 'www.extracurricular.ai'].includes(location.hostname);
const panel = document.querySelector<HTMLElement>('#analytics-consent')!;
const settings = document.querySelector<HTMLButtonElement>('[data-cookie-settings]')!;
const close = panel.querySelector<HTMLButtonElement>('[data-consent-close]')!;
let preference: Preference | null = readPreference();
let initialized = false;
let lastPage = '';
let expiryTimer: ReturnType<typeof setTimeout> | undefined;

function readPreference(): Preference | null {
  try {
    const value = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null');
    if (value && ['granted', 'denied'].includes(value.choice)
      && typeof value.expires === 'number' && value.expires > Date.now()
      && value.expires <= Date.now() + lifetime) return value;
  } catch { /* Storage may be unavailable; ask again on the next document. */ }
  return null;
}

function showPanel(show: boolean) {
  panel.hidden = !show;
  settings.setAttribute('aria-expanded', String(show));
  close.hidden = !preference;
}

function cleanUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? `${url.origin}${url.pathname}` : '';
  } catch { return ''; }
}

function pageView() {
  if (!enabled || preference?.choice !== 'granted' || preference.expires <= Date.now()) return;
  const current = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const page = cleanUrl(current ?? location.href);
  if (page === lastPage) return;
  const parameters = {
    page_location: page,
    page_title: document.title,
    page_referrer: lastPage || cleanUrl(document.referrer),
  };
  analyticsWindow.gtag?.('set', parameters);
  analyticsWindow.gtag?.('event', 'page_view', parameters);
  lastPage = page;
}

function removeAnalyticsCookies() {
  const parts = location.hostname.split('.');
  const domains = ['', ...parts.map((_, index) => `; Domain=${parts.slice(index).join('.')}`)];
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
    }
  }
}

function applyPreference() {
  clearTimeout(expiryTimer);
  const granted = preference?.choice === 'granted';
  analyticsWindow['ga-disable-G-5BMZQENB77'] = !granted || !enabled;
  if (!granted) {
    if (initialized) analyticsWindow.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    removeAnalyticsCookies();
    lastPage = '';
  } else if (enabled) {
    if (!initialized) {
      analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.gtag = function () { analyticsWindow.dataLayer!.push(arguments); };
      analyticsWindow.gtag('consent', 'default', {
        analytics_storage: 'denied', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied',
      });
      analyticsWindow.gtag('consent', 'update', { analytics_storage: 'granted' });
      analyticsWindow.gtag('js', new Date());
      analyticsWindow.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_expires: lifetime / 1000,
        cookie_update: false,
        page_location: cleanUrl(location.href),
        page_referrer: cleanUrl(document.referrer),
      });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.onload = () => {
        if (preference?.choice !== 'granted') removeAnalyticsCookies();
      };
      document.head.append(script);
      initialized = true;
    } else {
      analyticsWindow.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    }
    pageView();
  }
  if (preference) {
    // Recheck daily to stay within setTimeout's maximum delay.
    expiryTimer = setTimeout(() => {
      if (preference && preference.expires <= Date.now()) {
        preference = null;
        showPanel(true);
      }
      applyPreference();
    }, Math.min(preference.expires - Date.now(), 24 * 60 * 60 * 1000));
  }
}

settings.addEventListener('click', () => {
  showPanel(panel.hidden);
  if (!panel.hidden) panel.querySelector<HTMLButtonElement>('[data-consent]')!.focus();
});
close.addEventListener('click', () => { showPanel(false); settings.focus(); });
panel.addEventListener('keydown', event => {
  if (event.key === 'Escape' && preference) { showPanel(false); settings.focus(); }
});
for (const button of panel.querySelectorAll<HTMLButtonElement>('[data-consent]')) {
  button.addEventListener('click', () => {
    preference = { choice: button.dataset.consent as Choice, expires: Date.now() + lifetime };
    try { localStorage.setItem(preferenceKey, JSON.stringify(preference)); } catch { /* Keep the choice in memory. */ }
    applyPreference();
    showPanel(false);
    settings.focus();
  });
}
window.addEventListener('storage', event => {
  if (event.key !== preferenceKey && event.key !== null) return;
  preference = readPreference();
  applyPreference();
  showPanel(!preference);
});
document.addEventListener('desktop:pagechange', pageView);
applyPreference();
showPanel(!preference);
