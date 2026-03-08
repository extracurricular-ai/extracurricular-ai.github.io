import { useState, useEffect } from 'preact/hooks';
import { GITHUB_ORG } from '../config';

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/get-involved', label: 'Get Involved' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      class="fixed top-0 left-0 right-0 z-50 transition-[background,border-color,backdrop-filter] duration-300"
      style={{
        background: scrolled ? 'rgba(26, 26, 46, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      }}
    >
      <div class="max-w-[1280px] mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" class="flex items-center gap-2 no-underline">
          <img src="/logo.png" alt="ExAI" class="h-8 w-8 object-contain" />
          <span class="gradient-text font-extrabold text-xl">ExAI</span>
        </a>

        {/* Desktop links */}
        <ul class="desktop-nav flex gap-8 list-none items-center">
          {links.map((l) => (
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

        {/* GitHub CTA */}
        <a
          href={GITHUB_ORG}
          target="_blank"
          rel="noopener noreferrer"
          class="btn-ghost desktop-nav"
          style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
        >
          GitHub ↗
        </a>

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
          {links.map((l) => (
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
            GitHub ↗
          </a>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
