import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

const COLUMNS = 48;
const ROWS = 24;
const SHADES = '.,-~:;=!*#$@';

// Sample the torus once; each frame only rotates and projects these points.
const points: { x: number; y: number; z: number; nx: number; ny: number; nz: number }[] = [];
for (let ring = 0; ring < Math.PI * 2; ring += 0.08) {
  for (let tube = 0; tube < Math.PI * 2; tube += 0.12) {
    const cosTube = Math.cos(tube);
    const sinTube = Math.sin(tube);
    const cosRing = Math.cos(ring);
    const sinRing = Math.sin(ring);
    const radius = 1.65 + 0.7 * cosTube;
    points.push({ x: radius * cosRing, y: radius * sinRing, z: 0.7 * sinTube, nx: cosTube * cosRing, ny: cosTube * sinRing, nz: sinTube });
  }
}

function renderFrame(a: number, b: number): string {
  const pixels = new Array<string>(COLUMNS * ROWS).fill(' ');
  const depths = new Float32Array(COLUMNS * ROWS);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  for (const p of points) {
    const y = p.y * ca - p.z * sa;
    const z = p.y * sa + p.z * ca;
    const x = p.x * cb + z * sb;
    const depth = 1 / (6 + z * cb - p.x * sb);
    const col = Math.round(COLUMNS / 2 + x * depth * 44);
    const row = Math.round(ROWS / 2 - y * depth * 22);
    if (col < 0 || col >= COLUMNS || row < 0 || row >= ROWS) continue;
    const index = row * COLUMNS + col;
    if (depth <= depths[index]) continue;
    depths[index] = depth;
    const ny = p.ny * ca - p.nz * sa;
    const nz = p.ny * sa + p.nz * ca;
    const light = (p.nx * cb + nz * sb) * 0.25 + ny * 0.4 - (nz * cb - p.nx * sb) * 0.85;
    const shade = Math.round(Math.max(0, Math.min(1, 0.2 + light * 0.8)) * (SHADES.length - 1));
    pixels[index] = SHADES[shade];
  }
  return Array.from({ length: ROWS }, (_, row) => pixels.slice(row * COLUMNS, (row + 1) * COLUMNS).join('')).join('\n');
}

const initialFrame = renderFrame(0.55, 0.25);

export default function AsciiDonut({ pauseLabel, resumeLabel }: { pauseLabel: string; resumeLabel: string }) {
  const art = useRef<HTMLPreElement>(null);
  const angles = useRef({ a: 0.55, b: 0.25 });
  const [playingOverride, setPlayingOverride] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const playing = playingOverride ?? !reducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReducedMotion(media.matches); setPlayingOverride(null); };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const element = art.current;
    if (!element || !playing) return;
    let frame = 0;
    let previous = 0;
    let visible = true;

    function tick(now: number) {
      if (!previous) previous = now;
      const elapsed = now - previous;
      // 20 fps is enough for character animation; update only the pre, not the shell.
      if (elapsed >= 50) {
        const dt = Math.min(elapsed / 1000, 0.1);
        angles.current.a += dt * 0.6;
        angles.current.b += dt * 0.35;
        element!.textContent = renderFrame(angles.current.a, angles.current.b);
        previous = now;
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(frame);
      previous = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    }

    // The banner can scroll out of view inside the terminal as well as on the page.
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [playing]);

  return <div class="terminal-donut">
    <pre ref={art} class="terminal-donut-art" aria-hidden="true">{initialFrame}</pre>
    <button type="button" class="terminal-donut-toggle" aria-label={`${playing ? pauseLabel : resumeLabel}: ASCII donut`} title={playing ? pauseLabel : resumeLabel} aria-pressed={!playing} onClick={() => setPlayingOverride(!playing)}>{playing ? 'Ⅱ' : '▶'}</button>
  </div>;
}
