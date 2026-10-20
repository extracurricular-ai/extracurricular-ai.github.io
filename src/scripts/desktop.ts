import type { DesktopCopy } from '../components/desktop/copy';
import { contentWindows } from './content-windows';

const desktop = document.querySelector<HTMLElement>('[data-desktop]');
if (desktop) {
  const copy: DesktopCopy = JSON.parse(desktop.dataset.copy!);
  const windows = new Map(Array.from(desktop.querySelectorAll<HTMLElement>('[data-window]')).map(el => [el.dataset.window!, el]));
  const taskButtons = new Map(Array.from(desktop.querySelectorAll<HTMLButtonElement>('[data-task]')).map(el => [el.dataset.task!, el]));
  const startButton = document.querySelector<HTMLButtonElement>('#start-button')!;
  const menu = document.querySelector<HTMLElement>('#start-menu')!;
  const announcement = document.querySelector<HTMLElement>('#desktop-announcement')!;
  const launchers = new Map<string, HTMLElement>();
  let navigation: ReturnType<typeof contentWindows> | undefined;
  let z = 10;
  let active = desktop.dataset.initialApp!;
  let desktopSnapshot: string[] = [];
  const isFlow = () => matchMedia('(max-width: 700px)').matches || desktop.classList.contains('pref-simple');
  const visible = (el?: HTMLElement | null): el is HTMLElement => Boolean(el?.isConnected && el.getClientRects().length && !el.closest('[hidden]'));

  function announce(action: string, el: HTMLElement) { announcement.textContent = `${action}: ${el.dataset.title}`; }
  function activate(id: string) {
    const el = windows.get(id);
    if (!el || el.hidden) return;
    active = id;
    windows.forEach((window, key) => {
      window.classList.toggle('is-active', key === id);
      // Background controls can be partly covered by another window. Keep only
      // the active document interactive; the taskbar and title region switch it.
      window.querySelectorAll<HTMLElement>('.os-window-controls, .os-menubar, .os-move-controls, .os-window-body')
        .forEach(part => { part.inert = key !== id && !isFlow(); });
    });
    taskButtons.forEach((button, key) => button.setAttribute('aria-pressed', String(key === id)));
    el.style.zIndex = String(++z);
    navigation?.activate(id);
  }
  function focusWindow(el: HTMLElement) {
    el.focus({ preventScroll: !isFlow() });
    if (isFlow()) el.scrollIntoView({ block: 'start' });
  }
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    startButton.setAttribute('aria-expanded', 'false');
    if (returnFocus) startButton.focus();
  }
  function openWindow(id: string, launcher?: HTMLElement, focus = true) {
    const el = windows.get(id);
    if (!el) return;
    if (launcher && !el.contains(launcher) && !menu.contains(launcher)) launchers.set(id, launcher);
    if (focus) closeMenu();
    el.hidden = false;
    el.dataset.state = 'open';
    taskButtons.get(id)!.hidden = false;
    if (focus) {
      activate(id);
      focusWindow(el);
    } else {
      el.querySelectorAll<HTMLElement>('.os-window-controls, .os-menubar, .os-move-controls, .os-window-body')
        .forEach(part => { part.inert = !isFlow(); });
    }
    el.dispatchEvent(new Event('desktop:open'));
    if (focus) announce(copy.opened, el);
  }
  function fallbackFocus(id: string) {
    const launcher = launchers.get(id);
    const icon = desktop!.querySelector<HTMLElement>(`.desktop-icons [data-app-link="${id}"], .desktop-icons [data-open="${id}"]`);
    if (visible(launcher)) {
      const parentWindow = launcher.closest<HTMLElement>('[data-window]');
      if (parentWindow) activate(parentWindow.dataset.window!);
      launcher.focus();
    }
    else if (visible(icon)) icon.focus();
    else startButton.focus();
  }
  document.addEventListener('desktop:messenger', () => openWindow('messenger', document.activeElement instanceof HTMLElement ? document.activeElement : undefined));
  function hideWindow(id: string, close: boolean) {
    const el = windows.get(id)!;
    el.dispatchEvent(new Event('desktop:hide'));
    if (close) el.dispatchEvent(new Event('desktop:close'));
    el.hidden = true;
    el.dataset.state = close ? 'closed' : 'minimized';
    const task = taskButtons.get(id)!;
    task.hidden = close;
    task.setAttribute('aria-pressed', 'false');
    const next = [...windows.entries()].filter(([, w]) => !w.hidden).sort((a, b) => Number(b[1].style.zIndex) - Number(a[1].style.zIndex))[0];
    if (next) activate(next[0]);
    if (close) fallbackFocus(id); else task.focus();
    announce(close ? copy.closed : copy.minimized, el);
  }
  function clampPosition(el: HTMLElement, x: number, y: number) {
    const width = el.offsetWidth;
    const maxX = Math.max(0, innerWidth - width - 6);
    const maxY = Math.max(0, innerHeight - Math.min(el.offsetHeight, 240) - 62);
    el.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
    el.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
    // A moved window still fits above the taskbar, including its status bar.
    el.style.maxHeight = `calc(100dvh - ${Math.max(0, Math.min(maxY, y)) + 62}px)`;
  }

  startButton.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    startButton.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector<HTMLElement>('a,button')?.focus();
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target as Node) && !startButton.contains(event.target as Node)) closeMenu();
  });
  document.addEventListener('focusin', event => {
    const target = event.target as HTMLElement;
    if (!menu.hidden && !menu.contains(target) && target !== startButton) closeMenu();
    const el = target.closest<HTMLElement>('[data-window]');
    if (el && active !== el.dataset.window) activate(el.dataset.window!);
  });
  menu.addEventListener('keydown', event => {
    const links = Array.from(menu.querySelectorAll<HTMLElement>('a,button'));
    const index = links.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % links.length : event.key === 'ArrowUp' ? (index - 1 + links.length) % links.length : event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); links[next].focus(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!menu.hidden) { event.preventDefault(); closeMenu(true); return; }
    const window = (event.target as HTMLElement).closest<HTMLElement>('[data-window]');
    const movePanel = window?.querySelector<HTMLElement>('.os-move-controls');
    if (movePanel && !movePanel.hidden) {
      movePanel.hidden = true;
      const toggle = window!.querySelector<HTMLButtonElement>('[data-move-toggle]')!;
      toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
    }
  });
  desktop.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('a');
    if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && !link.target && !link.hasAttribute('download')) {
      const url = new URL(link.href);
      if (link.classList.contains('skip-link')) {
        const destination = document.getElementById(url.hash.slice(1))?.dataset.window;
        event.preventDefault(); openWindow(destination ?? desktop!.dataset.initialApp!, link); return;
      }
      if (navigation?.accepts(url) && !link.closest('.language-links,.start-languages')) {
        event.preventDefault();
        void navigation.navigate(url, link);
        return;
      }
    }
    const button = target.closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.open) { openWindow(button.dataset.open, button); return; }
    if (button.dataset.task) {
      const el = windows.get(button.dataset.task)!;
      if (!el.hidden && active === button.dataset.task) hideWindow(button.dataset.task, false);
      else openWindow(button.dataset.task);
      return;
    }
    if (button.hasAttribute('data-show-desktop')) {
      const opened = [...windows.entries()].filter(([, w]) => !w.hidden).map(([id]) => id);
      if (opened.length) { desktopSnapshot = opened; opened.forEach(id => hideWindow(id, false)); button.focus(); }
      else { desktopSnapshot.forEach(id => openWindow(id)); desktopSnapshot = []; }
      return;
    }
    const el = button.closest<HTMLElement>('[data-window]');
    if (!el) return;
    const id = el.dataset.window!;
    switch (button.dataset.windowAction) {
      case 'close': hideWindow(id, true); return;
      case 'minimize': hideWindow(id, false); return;
      case 'maximize': {
        const max = el.classList.toggle('is-maximized');
        button.setAttribute('aria-pressed', String(max));
        const label = max ? copy.restore : copy.maximize;
        button.setAttribute('aria-label', `${label}: ${el.dataset.title}`); button.title = label;
        activate(id); return;
      }
    }
    if (button.hasAttribute('data-move-toggle')) {
      const panel = el.querySelector<HTMLElement>('.os-move-controls')!;
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
    }
    if (button.dataset.move && !isFlow()) {
      if (el.classList.contains('is-maximized')) el.querySelector<HTMLButtonElement>('[data-window-action="maximize"]')!.click();
      const rect = el.getBoundingClientRect();
      const offsets: Record<string, [number, number]> = { left: [-32, 0], right: [32, 0], up: [0, -32], down: [0, 32] };
      const offset = offsets[button.dataset.move];
      clampPosition(el, offset ? rect.x + offset[0] : (innerWidth - rect.width) / 2, offset ? rect.y + offset[1] : 36);
    }
  });

  function registerWindow(el: HTMLElement, id: string) {
    el.addEventListener('pointerdown', () => activate(id));
    const handle = el.querySelector<HTMLElement>('[data-drag-handle]')!;
    let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button') || isFlow() || el.classList.contains('is-maximized')) return;
      const rect = el.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      el.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (drag) clampPosition(el, drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y);
    });
    const end = () => { drag = undefined; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    handle.addEventListener('lostpointercapture', end);
  }
  windows.forEach(registerWindow);
  window.addEventListener('resize', () => {
    activate(active);
    if (isFlow()) return;
    windows.forEach(el => { if (!el.hidden && !el.classList.contains('is-maximized')) { const rect = el.getBoundingClientRect(); clampPosition(el, rect.x, rect.y); } });
  });

  const preferences: Record<string, boolean> = {};
  try { Object.assign(preferences, JSON.parse(localStorage.getItem('exai-desktop-preferences') || '{}')); } catch { /* Storage is optional. */ }
  const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
  function applyPreferences() {
    ['contrast', 'large', 'motion', 'simple'].forEach(key => desktop!.classList.toggle(`pref-${key}`, preferences[key] === true));
    document.documentElement.classList.toggle('large-text', preferences.large === true);
    document.documentElement.dataset.reduceMotion = String(preferences.motion === true || motionMedia.matches);
    activate(active);
    document.dispatchEvent(new Event('desktop:preferences'));
  }
  motionMedia.addEventListener('change', applyPreferences);
  desktop.querySelectorAll<HTMLInputElement>('[data-preference]').forEach(input => {
    input.checked = preferences[input.dataset.preference!] === true;
    input.addEventListener('change', () => {
      preferences[input.dataset.preference!] = input.checked;
      applyPreferences();
      try { localStorage.setItem('exai-desktop-preferences', JSON.stringify(preferences)); } catch { /* Private browsing can block storage. */ }
    });
  });
  applyPreferences();
  activate(active);
  navigation = contentWindows({ desktop, windows, taskButtons, registerWindow, openWindow });
  const clock = document.querySelector<HTMLTimeElement>('#desktop-clock')!;
  function updateClock() { const now = new Date(); clock.textContent = now.toLocaleTimeString(document.documentElement.lang, { hour: '2-digit', minute: '2-digit' }); clock.dateTime = now.toISOString(); }
  updateClock(); setInterval(updateClock, 30_000);
}
