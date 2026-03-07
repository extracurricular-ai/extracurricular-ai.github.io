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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: 'background 0.3s, border-color 0.3s, backdrop-filter 0.3s',
        background: scrolled ? 'rgba(26, 26, 46, 0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      }}
    >
      <div class="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        {/* Logo */}
        <a href="/" style={{ fontWeight: 800, fontSize: '1.25rem', textDecoration: 'none' }}>
          <span class="gradient-text">ExAI</span>
        </a>

        {/* Desktop links */}
        <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', alignItems: 'center' }} class="desktop-nav">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                style={{
                  color: 'var(--color-text-secondary)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text-primary)')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-text-secondary)')}
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
          class="mobile-nav"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          <span style={{
            display: 'block', width: '24px', height: '2px',
            background: 'var(--color-text-primary)',
            transition: 'transform 0.3s',
            transform: open ? 'rotate(45deg) translate(5px, 5px)' : 'none',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '2px',
            background: 'var(--color-text-primary)',
            transition: 'opacity 0.3s',
            opacity: open ? 0 : 1,
          }} />
          <span style={{
            display: 'block', width: '24px', height: '2px',
            background: 'var(--color-text-primary)',
            transition: 'transform 0.3s',
            transform: open ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
          }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          background: 'var(--color-bg-elevated)',
          borderTop: '1px solid var(--color-border)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href={GITHUB_ORG}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-accent-purple)', textDecoration: 'none', fontWeight: 600 }}
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
