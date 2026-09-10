import { useEffect, useRef, useState } from 'preact/hooks';
import type { TerminalCopy } from './terminal-copy';

type Status = 'ready' | 'playing' | 'paused' | 'over';
interface Point { x: number; y: number }
const WIDTH = 480;
const HEIGHT = 280;
const alien = ['00100100', '00011000', '00111100', '01111110', '11011011', '11111111', '10100101', '00100100'];
const ship = ['0001000', '0011100', '0011100', '1111111', '1111111', '1101011'];
const formation = () => Array.from({ length: 24 }, (_, i) => ({ x: 58 + (i % 8) * 46, y: 28 + Math.floor(i / 8) * 30 }));
const initial = () => ({ player: 233, enemies: formation(), bullets: [] as Point[], bombs: [] as Point[], direction: 1, shotAt: 0, bombAt: 0, invincible: 0, score: 0, lives: 3, wave: 1 });

export default function Invaders({ copy, onExit }: { copy: TerminalCopy; onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const state = useRef(initial());
  const held = useRef(new Set<string>());
  const statusRef = useRef<Status>('ready');
  const [status, setStatus] = useState<Status>('ready');
  const [hud, setHud] = useState({ score: 0, lives: 3, wave: 1 });
  function changeStatus(next: Status) { statusRef.current = next; setStatus(next); held.current.clear(); }
  function start() { state.current = initial(); setHud({ score: 0, lives: 3, wave: 1 }); changeStatus('playing'); area.current?.focus({ preventScroll: true }); }
  function pause() { if (statusRef.current === 'playing') changeStatus('paused'); }

  useEffect(() => {
    area.current?.focus({ preventScroll: true });
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let previous = 0;
    let time = 0;
    function sprite(rows: string[], x: number, y: number, color: string) {
      ctx!.fillStyle = color;
      rows.forEach((row, yy) => [...row].forEach((pixel, xx) => { if (pixel === '1') ctx!.fillRect(Math.round(x) + xx * 2, Math.round(y) + yy * 2, 2, 2); }));
    }
    function draw() {
      const s = state.current;
      ctx!.fillStyle = '#061310'; ctx!.fillRect(0, 0, WIDTH, HEIGHT);
      ctx!.fillStyle = '#244239';
      for (let i = 0; i < 55; i++) ctx!.fillRect((i * 137 + 13) % WIDTH, (i * 83 + 29) % HEIGHT, 1, 1);
      s.enemies.forEach((enemy) => sprite(alien, enemy.x, enemy.y, '#65dac2'));
      if (s.invincible <= time || Math.floor(time * 12) % 2 === 0) sprite(ship, s.player, 250, '#f3bc75');
      ctx!.fillStyle = '#ecf8dc'; s.bullets.forEach((b) => ctx!.fillRect(b.x, b.y, 2, 7));
      ctx!.fillStyle = '#ff7f83'; s.bombs.forEach((b) => ctx!.fillRect(b.x, b.y, 3, 7));
      ctx!.fillStyle = '#2a5144'; ctx!.fillRect(0, 272, WIDTH, 1);
    }
    function tick(timestamp: number) {
      const dt = previous ? Math.min((timestamp - previous) / 1000, 0.04) : 0;
      previous = timestamp;
      if (statusRef.current === 'playing') {
        time += dt;
        const s = state.current;
        if (held.current.has('left')) s.player -= 235 * dt;
        if (held.current.has('right')) s.player += 235 * dt;
        s.player = Math.max(4, Math.min(WIDTH - 18, s.player));
        if (held.current.has('fire') && time - s.shotAt > 0.19) { s.bullets.push({ x: s.player + 6, y: 246 }); s.shotAt = time; }
        s.bullets.forEach((b) => b.y -= dt * 330);
        s.bombs.forEach((b) => b.y += dt * (105 + Math.min(s.wave, 10) * 9));
        s.bullets = s.bullets.filter((b) => b.y > -8);
        s.bombs = s.bombs.filter((b) => b.y < HEIGHT);
        const speed = 15 + Math.min(s.wave, 15) * 6 + (24 - s.enemies.length) * 1.2;
        s.enemies.forEach((enemy) => enemy.x += s.direction * dt * speed);
        if (s.enemies.some((enemy) => enemy.x < 7 || enemy.x > WIDTH - 23)) {
          s.direction *= -1;
          s.enemies.forEach((enemy) => { enemy.x = Math.max(7, Math.min(WIDTH - 23, enemy.x)); enemy.y += 12; });
        }
        if (time - s.bombAt > Math.max(0.3, 1.05 - s.wave * 0.07) && s.enemies.length) {
          const enemy = s.enemies[Math.floor(Math.random() * s.enemies.length)];
          s.bombs.push({ x: enemy.x + 7, y: enemy.y + 16 }); s.bombAt = time;
        }
        for (const bullet of s.bullets) {
          const hit = s.enemies.findIndex((enemy) => bullet.x + 2 >= enemy.x && bullet.x <= enemy.x + 16 && bullet.y <= enemy.y + 16 && bullet.y + 7 >= enemy.y);
          if (hit !== -1) { s.enemies.splice(hit, 1); bullet.y = -20; s.score += 10; setHud({ score: s.score, lives: s.lives, wave: s.wave }); }
        }
        for (const bomb of s.bombs) {
          if (time >= s.invincible && bomb.x + 3 >= s.player && bomb.x <= s.player + 14 && bomb.y + 7 >= 250 && bomb.y <= 262) {
            bomb.y = HEIGHT + 10; s.lives--; s.invincible = time + 1.5;
            setHud({ score: s.score, lives: s.lives, wave: s.wave });
          }
        }
        if (s.lives <= 0 || s.enemies.some((enemy) => enemy.y + 16 >= 248)) changeStatus('over');
        else if (!s.enemies.length) {
          s.wave++; s.enemies = formation(); s.bombs = []; s.bullets = []; s.direction = 1;
          setHud({ score: s.score, lives: s.lives, wave: s.wave });
        }
      }
      draw();
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(frame); held.current.clear(); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const keyAction = (key: string) => ({ ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ' ': 'fire' })[key];
  return <div class="arcade" ref={area} tabIndex={0} role="group" aria-label={`${copy.arcade}. ${copy.gameHint}`}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) pause(); }}
    onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); onExit(); return; }
      if (event.key.toLowerCase() === 'p' && !event.repeat) { event.preventDefault(); if (statusRef.current === 'playing') pause(); else if (statusRef.current === 'paused') changeStatus('playing'); }
      const action = keyAction(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      if (action && statusRef.current === 'playing' && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); held.current.add(action); }
    }}
    onKeyUp={(event) => { const action = keyAction(event.key.length === 1 ? event.key.toLowerCase() : event.key); if (action) { held.current.delete(action); } }}>
    <div class="arcade-header"><strong>{copy.arcade}</strong><button onClick={onExit}>{copy.exit} ↗</button></div>
    <div class="arcade-hud"><span>{copy.score} <b>{String(hud.score).padStart(4, '0')}</b></span><span>{copy.wave} <b>{hud.wave}</b></span><span>{copy.lives} <b>{hud.lives}</b></span></div>
    <div class="arcade-stage">
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} role="img" aria-label={`${copy.arcade} — ${copy.score}: ${hud.score}, ${copy.lives}: ${hud.lives}`} />
      {status !== 'playing' && <div class="arcade-overlay"><span class="arcade-overline">EXAI ARCADE / 01</span><h3>{status === 'ready' ? copy.arcade : status === 'paused' ? copy.paused : copy.over}</h3><p>{status === 'over' ? `${copy.score}: ${hud.score}` : copy.gameIntro}</p><button onClick={() => { if (status === 'paused') { changeStatus('playing'); area.current?.focus(); } else start(); }}>{status === 'ready' ? copy.start : status === 'paused' ? copy.resume : copy.restart} →</button></div>}
    </div>
    <div class="arcade-controls">{(['left', 'right', 'fire'] as const).map((action) => <button aria-label={copy[action]} disabled={status !== 'playing'}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); held.current.add(action); }}
      onPointerUp={() => held.current.delete(action)} onPointerCancel={() => held.current.delete(action)} onLostPointerCapture={() => held.current.delete(action)}
      onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); held.current.add(action); } }}
      onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') held.current.delete(action); }}
      onBlur={() => held.current.delete(action)}>{action === 'left' ? '←' : action === 'right' ? '→' : `${copy.fire} ↑`}</button>)}
      <button disabled={status === 'ready' || status === 'over'} onClick={() => { if (status === 'playing') pause(); else { changeStatus('playing'); area.current?.focus(); } }}>{status === 'paused' ? copy.resume : copy.pause}</button>
    </div>
    <p class="arcade-hint">{copy.gameHint}</p>
  </div>;
}
