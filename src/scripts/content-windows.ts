const metadataSelector = [
  'title', 'meta[name="description"]', 'meta[name="author"]',
  'meta[property^="og:"]', 'meta[property^="article:"]', 'meta[name^="twitter:"]',
  'link[rel="canonical"]', 'link[hreflang]', 'script[type="application/ld+json"]',
].join(',');

interface PageData {
  id: string;
  path: string;
  lang: string;
  metadata: Element[];
  languages: { lang: string; href: string; active: string | null }[];
}
interface Options {
  desktop: HTMLElement;
  windows: Map<string, HTMLElement>;
  taskButtons: Map<string, HTMLButtonElement>;
  registerWindow: (element: HTMLElement, id: string) => void;
  openWindow: (id: string, launcher?: HTMLElement, focus?: boolean) => void;
}

export function contentWindows({ desktop, windows, taskButtons, registerWindow, openWindow }: Options) {
  const pages = new Map<string, PageData>();
  const paths = new Map<string, PageData>();
  const pending = new Map<string, Promise<PageData>>();
  const workspace = desktop.querySelector('#desktop-workspace')!;
  const taskbar = desktop.querySelector('.taskbar-tasks')!;
  const announcement = desktop.querySelector('#desktop-announcement')!;
  const copy = ({
    en: ['Loading window…', 'This window could not be loaded. Your other windows are still open.', 'Retry', 'Dismiss'],
    zh: ['正在打开窗口…', '窗口暂时无法加载，其他窗口仍然保留。', '重试', '关闭提示'],
    es: ['Cargando ventana…', 'No se pudo cargar esta ventana. Las demás siguen abiertas.', 'Reintentar', 'Cerrar aviso'],
    fr: ['Chargement de la fenêtre…', 'Impossible de charger cette fenêtre. Les autres restent ouvertes.', 'Réessayer', 'Fermer'],
  } as Record<string, string[]>)[desktop.lang]!;
  let sequence = 0;
  let intent = 0;
  let errorNotice: HTMLElement | undefined;

  const key = (path: string) => `${path.replace(/\/+$/, '')}/`;
  function accepts(url: URL) {
    return url.origin === location.origin && !url.search && (
      /^\/(?:en|zh|es|fr)(?:\/(?:about|projects|get-involved|privacy|blog(?:\/[^/]+)?))?\/?$/.test(url.pathname)
      || /^\/(?:about|projects|get-involved|privacy|blog)?\/?$/.test(url.pathname)
    );
  }
  function snapshot(doc: Document, id: string): PageData {
    return {
      id,
      path: new URL(doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href).pathname,
      lang: doc.documentElement.lang,
      metadata: [...doc.head.querySelectorAll(metadataSelector)].map(el => el.cloneNode(true) as Element),
      languages: [...doc.querySelectorAll<HTMLAnchorElement>('.language-links a')].map(el => ({
        lang: el.lang, href: el.getAttribute('href')!, active: el.getAttribute('aria-current'),
      })),
    };
  }
  const initial = snapshot(document, desktop.dataset.initialApp!);
  pages.set(initial.id, initial);
  paths.set(key(initial.path), initial);
  paths.set(key(location.pathname), initial);
  history.replaceState({ ...history.state, desktopWindow: initial.id }, '');

  function activate(id: string) {
    // Even utility windows supersede an earlier pending navigation's focus.
    intent++;
    const page = pages.get(id);
    if (!page) return;
    document.head.querySelectorAll(metadataSelector).forEach(el => el.remove());
    document.head.append(...page.metadata.map(el => el.cloneNode(true)));
    document.documentElement.lang = page.lang;
    desktop.querySelector<HTMLAnchorElement>('.skip-link')!.href = `#${windows.get(id)!.id}`;
    for (const link of desktop.querySelectorAll<HTMLAnchorElement>('.language-links a,.start-languages a')) {
      const translation = page.languages.find(item => item.lang === link.lang);
      if (translation) {
        link.href = translation.href;
        link.setAttribute('aria-current', translation.active ?? 'false');
      }
    }
    const url = paths.get(key(location.pathname))?.id === id
      ? `${location.pathname}${location.search}${location.hash}` : page.path;
    history.replaceState({ ...history.state, desktopWindow: id }, '', url);
    document.dispatchEvent(new Event('desktop:pagechange'));
  }

  async function loadStyles(doc: Document) {
    const existing = new Set([...document.querySelectorAll('style,link[rel="stylesheet"]')].map(el =>
      el.getAttribute('href') ?? el.getAttribute('data-vite-dev-id') ?? el.textContent));
    await Promise.all([...doc.querySelectorAll('style,link[rel="stylesheet"]')].filter(el => !el.closest('noscript,template')).map(async el => {
      const identity = el.getAttribute('href') ?? el.getAttribute('data-vite-dev-id') ?? el.textContent;
      if (existing.has(identity)) return;
      existing.add(identity);
      const node = document.importNode(el, true);
      if (node instanceof HTMLLinkElement) {
        await new Promise<void>((resolve, reject) => {
          node.onload = () => resolve();
          node.onerror = () => { node.remove(); reject(new Error('Stylesheet unavailable')); };
          document.head.append(node);
        });
      } else document.head.append(node);
    }));
  }

  function load(url: URL): Promise<PageData> {
    const path = key(url.pathname);
    const cached = paths.get(path);
    if (cached) return Promise.resolve(cached);
    const previous = pending.get(path);
    if (previous) return previous;
    const request = (async () => {
      const response = await fetch(path, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Page unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const originalId = doc.querySelector<HTMLElement>('[data-desktop]')?.dataset.initialApp;
      const source = [...doc.querySelectorAll<HTMLElement>('[data-window]')].find(el => el.dataset.window === originalId);
      const sourceTask = [...doc.querySelectorAll<HTMLButtonElement>('[data-task]')].find(el => el.dataset.task === originalId);
      if (!source || !sourceTask || !originalId) throw new Error('Missing content window');
      const id = windows.has(originalId) ? `${originalId}-${++sequence}` : originalId;
      const page = snapshot(doc, id);
      await loadStyles(doc);
      // Only import the requested window. The desktop, its scripts and running
      // Preact islands stay mounted; Astro hydrates newly connected islands.
      const element = document.importNode(source, true);
      element.querySelectorAll('script').forEach(script => script.remove());
      if (id !== originalId) {
        const ids = new Map<string, string>();
        for (const node of [element, ...element.querySelectorAll<HTMLElement>('[id]')]) {
          // Islands own their DOM and IDs. Their props already distinguish
          // locales; rewriting SSR nodes would disagree with hydration.
          if (!node.id || node.closest('astro-island')) continue;
          const original = node.id;
          node.dataset.originalId = original;
          node.id = `${id}-${original}`;
          ids.set(original, node.id);
        }
        for (const node of element.querySelectorAll<HTMLElement>('[aria-labelledby],[aria-describedby],[aria-controls],[for]')) {
          if (node.closest('astro-island')) continue;
          for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) {
            const value = node.getAttribute(attr);
            if (value) node.setAttribute(attr, value.split(' ').map(token => ids.get(token) ?? token).join(' '));
          }
        }
        const label = element.getAttribute('aria-labelledby')!;
        element.setAttribute('aria-labelledby', ids.get(label) ?? label);
      }
      element.id = `window-${id}`;
      element.dataset.window = id;
      element.lang = page.lang;
      element.hidden = true;
      element.classList.remove('is-active');
      element.dataset.state = 'closed';
      const address = element.querySelector('.os-address-value');
      if (address) address.textContent = page.path;
      const task = document.importNode(sourceTask, true);
      task.dataset.task = id;
      task.setAttribute('aria-controls', element.id);
      task.setAttribute('aria-pressed', 'false');
      task.hidden = true;
      pages.set(id, page);
      paths.set(path, page);
      paths.set(key(page.path), page);
      windows.set(id, element);
      taskButtons.set(id, task);
      registerWindow(element, id);
      workspace.append(element);
      taskbar.append(task);
      return page;
    })();
    pending.set(path, request);
    void request.finally(() => pending.delete(path)).catch(() => {});
    return request;
  }

  async function navigate(url: URL, launcher?: HTMLElement, push = true) {
    const version = ++intent;
    launcher?.setAttribute('aria-busy', 'true');
    announcement.textContent = copy[0];
    try {
      const page = await load(url);
      const focus = version === intent;
      if (focus) errorNotice?.remove();
      if (focus && push && `${location.pathname}${location.hash}` !== `${page.path}${url.hash}`) {
        history.pushState({ desktopWindow: page.id }, '', `${page.path}${url.hash}`);
      }
      openWindow(page.id, launcher, focus);
      if (focus && url.hash) {
        const hash = decodeURIComponent(url.hash.slice(1));
        const destination = [...windows.get(page.id)!.querySelectorAll<HTMLElement>('[id]')]
          .find(el => el.id === hash || el.dataset.originalId === hash);
        if (destination) {
          destination.scrollIntoView({ block: 'center' });
          if (!destination.hasAttribute('tabindex')) destination.tabIndex = -1;
          destination.focus({ preventScroll: true });
        }
      }
    } catch {
      if (version !== intent) return;
      errorNotice?.remove();
      errorNotice = document.createElement('aside');
      errorNotice.className = 'desktop-load-error';
      errorNotice.setAttribute('role', 'alert');
      const message = document.createElement('p');
      message.textContent = copy[1];
      const retry = document.createElement('button');
      retry.className = 'os-button'; retry.textContent = copy[2];
      retry.onclick = () => { errorNotice?.remove(); void navigate(url, launcher, push); };
      const dismiss = document.createElement('button');
      dismiss.className = 'os-button'; dismiss.textContent = copy[3];
      dismiss.onclick = () => { errorNotice?.remove(); launcher?.focus(); };
      errorNotice.append(message, retry, dismiss);
      desktop.append(errorNotice);
    } finally {
      launcher?.removeAttribute('aria-busy');
    }
  }

  window.addEventListener('popstate', () => {
    const url = new URL(location.href);
    if (accepts(url)) void navigate(url, undefined, false);
  });
  document.addEventListener('desktop:navigate', event => {
    const url = new URL((event as CustomEvent<{ href: string }>).detail.href, location.href);
    if (!accepts(url)) return;
    event.preventDefault();
    void navigate(url, document.activeElement instanceof HTMLElement ? document.activeElement : undefined);
  });
  return { accepts, navigate, activate };
}
