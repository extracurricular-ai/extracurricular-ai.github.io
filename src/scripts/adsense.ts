// Manual article ads. Keep Auto ads OFF in AdSense.
// Publish Google's European regulations message in Privacy & messaging.
// The AdSense loader deploys that CMP; pauseAdRequests holds ads until the
// TCF API reports a usable decision. Missing/blocked CMP never implies consent.
const production = import.meta.env.PROD
  && ['extracurricular.ai', 'www.extracurricular.ai'].includes(location.hostname);
interface ConsentData {
  gdprApplies?: boolean;
  eventStatus?: string;
  cmpStatus?: string;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}
type AdQueue = { push: (parameters: object) => unknown; pauseAdRequests?: number };
type AdWindow = Window & {
  adsbygoogle?: AdQueue;
  googlefc?: {
    callbackQueue: { push: (callback: Record<string, () => void>) => unknown };
    showRevocationMessage?: () => void;
  };
  __tcfapi?: (command: string, version: number, callback: (data: ConsentData, success: boolean) => void) => void;
};
const adWindow = window as AdWindow;
const slots = new Map<HTMLElement, { surface: HTMLElement; near: boolean; requested: boolean; retired: boolean; width: number }>();
let loaded = false;
let failed = false;
let started = false;
let allowed = false;
let scheduled = false;

function queue(): AdQueue {
  return adWindow.adsbygoogle ??= [] as object[];
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; render(); });
}

function active(element: HTMLElement) {
  const owner = element.closest<HTMLElement>('[data-window]');
  return !!owner && !owner.hidden && owner.classList.contains('is-active');
}

function retire(element: HTMLElement) {
  const slot = slots.get(element)!;
  slot.retired = true;
  slot.surface.replaceChildren();
  element.hidden = true;
}

function updateConsent(data: ConsentData, success: boolean) {
  const settled = success && data?.cmpStatus !== 'error'
    && (data?.eventStatus === 'tcloaded' || data?.eventStatus === 'useractioncomplete');
  allowed = success && data?.cmpStatus !== 'error' && (data?.gdprApplies === false
    || (data?.gdprApplies === true && settled
      && data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true));
  queue().pauseAdRequests = allowed ? 0 : 1;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-ad-privacy]')) {
    button.hidden = !(success && data?.gdprApplies === true && adWindow.googlefc?.showRevocationMessage);
  }
  if (settled && !allowed) {
    // Do not refresh an already requested ad when consent is later restored.
    // New article windows can request ads after a new consent decision.
    slots.forEach((slot, element) => { if (slot.requested) retire(element); });
  }
  schedule();
}

function load() {
  if (started) return;
  started = true;
  queue().pauseAdRequests = 1;
  const cmp = adWindow.googlefc ??= { callbackQueue: [] as Record<string, () => void>[] };
  cmp.callbackQueue ??= [] as Record<string, () => void>[];
  cmp.callbackQueue.push({
    CONSENT_API_READY: () => adWindow.__tcfapi?.('addEventListener', 2, updateConsent),
  });
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4514332323196968';
  script.onload = () => { loaded = true; schedule(); };
  script.onerror = () => {
    // Ad blockers or network errors must never interfere with reading.
    failed = true;
    slots.forEach((_, element) => { element.hidden = true; });
  };
  document.head.append(script);
}

function render() {
  if (!production) return;
  if ([...slots.keys()].some(active)) load();
  slots.forEach((slot, element) => {
    if (slot.retired) return;
    element.hidden = !allowed || failed;
    if (!allowed || !loaded || failed) return;
    const width = Math.floor(slot.surface.getBoundingClientRect().width);
    if (slot.requested) {
      // Never crop or scale an existing creative, and never refresh on resize.
      if (width > 0 && width < slot.width) retire(element);
      return;
    }
    if (!active(element) || !slot.near || document.hidden) return;
    if (width < 250 || element.closest('[hidden],[inert]')) return;
    const template = element.querySelector<HTMLTemplateElement>('[data-ad-template]')!;
    const ad = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    ad.style.width = `${width}px`;
    slot.surface.replaceChildren(ad);
    slot.requested = true;
    slot.width = width;
    element.dataset.adState = 'requested';
    // Only the eligible slot has an uninitialised <ins>. Cached or background
    // article windows keep their ad markup in a template until eligible.
    try { queue().push({}); } catch { retire(element); }
  });
}

const intersection = new IntersectionObserver(entries => {
  for (const entry of entries) slots.get(entry.target as HTMLElement)!.near = entry.isIntersecting;
  schedule();
});
const resize = new ResizeObserver(schedule);
const ownerChanges = new MutationObserver(schedule);
const adChanges = new MutationObserver(records => {
  for (const record of records) {
    const ad = record.target as HTMLElement;
    if (ad.dataset.adStatus === 'unfilled') {
      const element = ad.closest<HTMLElement>('[data-article-ad]');
      if (element) retire(element);
    }
  }
});

function discover() {
  for (const element of document.querySelectorAll<HTMLElement>('[data-article-ad]')) {
    if (slots.has(element)) continue;
    const surface = element.querySelector<HTMLElement>('[data-ad-surface]')!;
    slots.set(element, { surface, near: false, requested: false, retired: false, width: 0 });
    if (!production) {
      element.hidden = false;
      element.dataset.adState = 'preview';
      continue;
    }
    intersection.observe(element);
    resize.observe(surface);
    ownerChanges.observe(element.closest('[data-window]')!, { attributes: true, attributeFilter: ['hidden', 'class'] });
    adChanges.observe(surface, { subtree: true, attributes: true, attributeFilter: ['data-ad-status'] });
  }
  schedule();
}

document.addEventListener('click', event => {
  if (!(event.target as HTMLElement).closest('[data-ad-privacy]')) return;
  adWindow.googlefc?.callbackQueue.push({
    CONSENT_API_READY: () => adWindow.googlefc?.showRevocationMessage?.(),
  });
});
document.addEventListener('visibilitychange', schedule);
document.addEventListener('desktop:pagechange', schedule);
const workspace = document.querySelector('#desktop-workspace');
if (workspace) new MutationObserver(discover).observe(workspace, { childList: true });
discover();
