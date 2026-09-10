import { useEffect, useRef, useState } from 'preact/hooks';
import { children, complete, findFile, resolvePath, type TerminalFile } from '../lib/terminal';
import { terminalCopy } from './terminal-copy';
import Invaders from './Invaders';
import '../styles/terminal.css';

interface Props { files: TerminalFile[]; locale: string }
interface Output { text?: string; files?: TerminalFile[]; href?: string; error?: boolean }
interface Entry { command: string; cwd: string; output: Output }

export default function HeroTerminal({ files, locale }: Props) {
  const copy = terminalCopy[locale] ?? terminalCopy.en;
  const [cwd, setCwd] = useState('/');
  const [input, setInput] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([{ command: 'ls', cwd: '/', output: { files: children(files, '/') } }]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const draft = useRef('');
  const [game, setGame] = useState(false);
  const [closed, setClosed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);

  useEffect(() => {
    if (!interacted.current || !scrollRef.current) return;
    // Keep the beginning of a long article visible; the prompt stays pinned below it.
    const output = scrollRef.current;
    output.scrollTop = latestRef.current ? latestRef.current.offsetTop - 16 : output.scrollHeight;
  }, [entries]);

  function focusInput() {
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  function run(raw: string, focus = true) {
    const line = raw.trim();
    if (!line) return;
    interacted.current = true;
    setInput('');
    setHistory((previous) => [...previous, line].slice(-100));
    setHistoryIndex(-1);
    const [command, ...args] = line.split(/\s+/);
    const target = args.filter((arg) => !arg.startsWith('-'))[0];
    const path = resolvePath(target ?? '.', cwd);
    const file = findFile(files, path);
    let output: Output = {};
    const error = (message: string) => ({ text: `${command}: ${message}${target ? `: ${target}` : ''}`, error: true });
    switch (command) {
      case 'ls':
        if (args.some((arg) => arg.startsWith('-') && !/^-[al]+$/.test(arg))) output = error(copy.manuals.ls);
        else if (!file) output = error(copy.missing);
        else output = { files: file.directory ? children(files, path, args.some((arg) => /^-[al]*a[al]*$/.test(arg))) : [file] };
        break;
      case 'cd': {
        const next = resolvePath(target ?? '~', cwd);
        const directory = findFile(files, next);
        if (!directory) output = error(copy.missing);
        else if (!directory.directory) output = error(copy.notDir);
        else { setCwd(next); output = { files: children(files, next) }; }
        break;
      }
      case 'pwd': output = { text: cwd === '/' ? '/home/visitor' : `/home/visitor${cwd}` }; break;
      case 'cat':
      case 'open':
        if (!target) output = error(`${copy.usage}: ${copy.manuals[command]}`);
        else if (!file) output = error(copy.missing);
        else if (command === 'open' && file.href) { window.location.assign(file.href); output = { text: file.title, href: file.href }; }
        else if (file.directory) output = { text: `${copy.isDir} ${target}`, files: children(files, path) };
        else output = { text: file.body, href: file.href };
        break;
      case 'man':
      case 'help': {
        const manual = target && Object.hasOwn(copy.manuals, target) && copy.manuals[target as keyof typeof copy.manuals];
        output = { text: target ? manual || copy.unknown : `${copy.help}\n\n${Object.values(copy.manuals).join('\n')}\n\n${copy.shortcuts}\nCtrl+C — ${copy.cancel}` };
        break;
      }
      case 'clear': setEntries([]); setShowWelcome(false); if (focus) focusInput(); return;
      case 'history': output = { text: [...history, line].map((value, index) => `${String(index + 1).padStart(3)}  ${value}`).join('\n') }; break;
      case 'whoami': output = { text: copy.explorer }; break;
      case 'date': output = { text: new Date().toLocaleString(locale) }; break;
      case 'echo': output = { text: args.join(' ') }; break;
      case 'coffee': output = { text: copy.coffee }; break;
      case 'sudo': output = { text: copy.sudo }; break;
      case 'neofetch': output = { text: '  ▄▄▄  ▄   ▄ ▄▄▄  ▄\n  █▄▄   ▀▄▀  █▄█  █\n  █▄▄  ▄▀ ▀▄ █ █  █\n\n  OS       ExAI / collective edition\n  Host     extracurricular.ai\n  Shell    curiosity 1.0\n  License  open source\n  Members  learners + builders + you\n  Uptime   one experiment at a time' }; break;
      case 'games': output = { files: children(files, '/games') }; break;
      case 'play':
        if (target === 'invaders' || target === '/games/invaders') { setGame(true); output = { text: copy.arcade }; }
        else output = { text: copy.manuals.play, files: children(files, '/games') };
        break;
      default: output = error(copy.unknown);
    }
    setEntries((previous) => [...previous, { command: line, cwd, output }].slice(-60));
    if (focus) focusInput();
  }

  function clickFile(file: TerminalFile) {
    run(file.directory ? `cd ${file.path}` : file.path === '/games/invaders' ? 'play invaders' : `cat ${file.path}`, false);
  }

  return <div class={`terminal-wrap ${expanded ? 'is-expanded' : ''}`}>
    <div class="terminal-caption"><span><span class="terminal-status-dot" /> EXAI / PLAYGROUND</span><span>v.01</span></div>
    {closed ? <div class="terminal-closed"><span>{copy.label}</span><button onClick={() => { setClosed(false); setMinimized(false); }}>{copy.reopen} ↗</button></div> :
      <section class="terminal-window" aria-label="ExAI Terminal">
        <header class="terminal-titlebar">
          <div class="terminal-traffic">
            <button class="traffic-close" aria-label={copy.close} title={copy.close} onClick={() => { setGame(false); setClosed(true); }}><span>×</span></button>
            <button class="traffic-minimize" aria-label={minimized ? copy.restore : copy.minimize} title={minimized ? copy.restore : copy.minimize} onClick={() => { setGame(false); setMinimized(!minimized); }}><span>−</span></button>
            <button class="traffic-expand" aria-label={copy.expand} title={copy.expand} aria-pressed={expanded} onClick={() => { setExpanded(!expanded); setMinimized(false); }}><span>↗</span></button>
          </div>
          <span class="terminal-window-title">visitor@exai: {cwd === '/' ? '~' : `~${cwd}`}</span>
          <span class="terminal-shell-label">{game ? 'arcade' : 'exai-sh'}</span>
        </header>
        {minimized ? <button class="terminal-restore" onClick={() => setMinimized(false)}>{copy.restore} ↓</button> : game ?
          <Invaders copy={copy} onExit={() => { setGame(false); focusInput(); }} /> : <>
          <div class="terminal-output" ref={scrollRef} role="region" aria-label={copy.label} tabIndex={0}>
            {showWelcome && <div class="terminal-welcome"><div class="terminal-wordmark" aria-hidden="true">&gt;_ <span>hello, world.</span></div><p>{copy.welcome}</p><p class="terminal-muted">{copy.hint}</p></div>}
            {entries.map((entry, index) => <div class="terminal-entry" key={index} ref={index === entries.length - 1 ? latestRef : undefined}>
              <div class="terminal-command"><span class="terminal-user">visitor<span>@exai</span></span> <span class="terminal-path">{entry.cwd === '/' ? '~' : `~${entry.cwd}`}</span> <span class="terminal-chevron">❯</span> {entry.command}</div>
              {entry.output.text && <pre class={entry.output.error ? 'terminal-error' : 'terminal-text'}>{entry.output.text}</pre>}
              {entry.output.files && <div class="terminal-files">{entry.output.files.map((file) => <button class={`terminal-file ${file.directory ? 'is-directory' : ''}`} onClick={() => clickFile(file)} title={file.title}>
                <span aria-hidden="true">{file.directory ? '▸' : file.path.startsWith('/games/') ? '✦' : '·'}</span><span>{file.path.split('/').pop()}{file.directory ? '/' : ''}</span><span class="terminal-file-description">{file.title}</span>
              </button>)}</div>}
              {entry.output.href && <a class="terminal-result-link" href={entry.output.href}>{copy.read}</a>}
            </div>)}
          </div>
          <form class="terminal-input-row" onSubmit={(event) => { event.preventDefault(); run(input); }}>
            <label for="hero-terminal-input" class="sr-only">{copy.input}</label>
            <span class="terminal-chevron" aria-hidden="true">❯</span>
            <input ref={inputRef} id="hero-terminal-input" value={input} placeholder={copy.placeholder} autoComplete="off" autoCapitalize="off" spellcheck={false} enterKeyHint="go" maxLength={500}
              onInput={(event) => { setInput(event.currentTarget.value); setHistoryIndex(-1); }}
              onKeyDown={(event) => {
                if (event.isComposing) return;
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') { event.preventDefault(); setEntries([]); setShowWelcome(false); }
                else if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); setInput(''); setHistoryIndex(-1); }
                else if (event.key === 'Tab' && !event.shiftKey && input) {
                  const options = complete(input, cwd, files);
                  if (options.length) {
                    event.preventDefault();
                    if (options.length === 1) setInput(options[0]);
                    else { interacted.current = true; setEntries((previous) => [...previous, { command: input, cwd, output: { text: options.join('\n') } }].slice(-60)); }
                  }
                } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                  event.preventDefault();
                  if (historyIndex === -1) draft.current = input;
                  const next = event.key === 'ArrowUp' ? Math.min(historyIndex + 1, history.length - 1) : Math.max(historyIndex - 1, -1);
                  setHistoryIndex(next); setInput(next === -1 ? draft.current : history[history.length - 1 - next]);
                }
              }} />
            <button type="submit" aria-label={copy.run} title={copy.run}>↵</button>
          </form>
          <footer class="terminal-footer"><span><i />{copy.ready}</span><span>{copy.shortcuts}</span></footer>
        </>}
      </section>}
    <div class="terminal-quickstart"><span>$</span>{['ls /', 'cat /README.md', 'man', 'play invaders'].map((command) => <button onClick={() => { setClosed(false); setMinimized(false); setGame(false); run(command, false); }}>{command}<span aria-hidden="true"> ↗</span></button>)}</div>
    <span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{interacted.current && entries.length > 0 ? `${entries[entries.length - 1].command}: ${entries[entries.length - 1].output.text?.slice(0, 180) ?? entries[entries.length - 1].output.files?.map((file) => file.path.split('/').pop()).join(', ') ?? ''}` : ''}</span>
    <noscript><p>{copy.hint} (JavaScript required.)</p></noscript>
  </div>;
}
