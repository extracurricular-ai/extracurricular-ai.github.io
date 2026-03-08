import { useState, useEffect } from 'preact/hooks';
import { GITHUB_ORG } from '../config';
import { localizedPath, type Locale } from '../i18n/index';

interface NavLabels {
  home: string;
  about: string;
  projects: string;
  getInvolved: string;
  github: string;
  switchLanguage: string;
}

interface SwitcherLink {
  locale: string;
  label: string;
  href: string;
  active: boolean;
}

interface NavProps {
  currentLocale: string;
  currentPath: string;
  labels: NavLabels;
  switcherLinks: SwitcherLink[];
}

export default function Nav({ currentLocale, currentPath, labels, switcherLinks }: NavProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { href: localizedPath('/', currentLocale as Locale), label: labels.home },
    { href: localizedPath('/about', currentLocale as Locale), label: labels.about },
    { href: localizedPath('/projects', currentLocale as Locale), label: labels.projects },
    { href: localizedPath('/get-involved', currentLocale as Locale), label: labels.getInvolved },
  ];

  return (
    <nav
      class="fixed top-0 left-0 right-0 z-50 transition-[background,border-color,backdrop-filter] duration-300"
      style={{
        background: scrolled ? 'rgba(15, 38, 34, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      }}
    >
      <div class="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href={localizedPath('/', currentLocale as Locale)} class="flex items-center gap-2 no-underline">
          <img src="/logo.png" alt="ExAI" class="h-8 w-8 object-contain" />
          <span class="gradient-text font-extrabold text-xl">ExAI</span>
        </a>

        {/* Desktop links */}
        <ul class="desktop-nav flex gap-8 list-none items-center">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                class="text-text-secondary no-underline text-[0.9rem] font-medium transition-colors duration-200 hover:text-text-primary"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop right: GitHub + language switcher */}
        <div class="desktop-nav flex items-center gap-3">
          <a
            href={GITHUB_ORG}
            target="_blank"
            rel="noopener noreferrer"
            class="btn-ghost"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
          >
            {labels.github} ↗
          </a>

          {/* CSS-only language switcher — hover/focus-within to open */}
          <div class="lang-switcher relative">
            <button class="lang-trigger border border-border text-text-secondary rounded-full px-3 py-1.5 text-[0.825rem] font-medium bg-transparent cursor-pointer transition-colors duration-200 hover:border-accent-purple hover:text-text-primary whitespace-nowrap">
              {switcherLinks.find((l) => l.active)?.label ?? labels.switchLanguage} ▾
            </button>
            <ul class="lang-dropdown hidden absolute top-[calc(100%+8px)] right-0 bg-bg-elevated border border-border rounded-lg py-1 list-none min-w-[120px] shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-[100]">
              {switcherLinks.map(({ locale, label, href, active }) => (
                <li key={locale}>
                  <a
                    href={href}
                    aria-current={active ? 'true' : undefined}
                    class={`block px-4 py-2 text-[0.875rem] no-underline transition-colors duration-150 hover:bg-bg-base hover:text-text-primary ${active ? 'text-accent-purple font-semibold' : 'text-text-secondary'}`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          class="mobile-nav bg-transparent border-0 cursor-pointer p-2 flex flex-col gap-[5px]"
        >
          <span class="block w-6 h-0.5 bg-[var(--color-text-primary)] transition-transform duration-300" style={{ transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span class="block w-6 h-0.5 bg-[var(--color-text-primary)] transition-opacity duration-300" style={{ opacity: open ? 0 : 1 }} />
          <span class="block w-6 h-0.5 bg-[var(--color-text-primary)] transition-transform duration-300" style={{ transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div class="bg-bg-elevated border-t border-border p-6 flex flex-col gap-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              class="text-text-secondary no-underline text-[1.1rem] font-medium"
            >
              {l.label}
            </a>
          ))}
          <a
            href={GITHUB_ORG}
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent-purple no-underline font-semibold"
          >
            {labels.github} ↗
          </a>
          <div class="flex flex-wrap gap-3 pt-2 border-t border-border">
            {switcherLinks.map(({ locale, label, href, active }) => (
              <a
                key={locale}
                href={href}
                class={`text-[0.875rem] no-underline ${active ? 'text-accent-purple font-semibold' : 'text-text-muted'}`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .mobile-nav { display: none !important; } }
        @media (max-width: 767px) { .desktop-nav { display: none !important; } }
        /* CSS-only dropdown — Tailwind cannot do :focus-within show/hide */
        .lang-switcher:hover .lang-dropdown,
        .lang-switcher:focus-within .lang-dropdown { display: block !important; }
      `}</style>
    </nav>
  );
}
