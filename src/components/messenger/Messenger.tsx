import { useEffect, useRef, useState } from 'preact/hooks';
import { friendsFor, messengerCopy, type Friend } from './personas';
import { buildPrompt, generateReply, HordeError, type ChatMessage, type QueueStatus } from '../../lib/horde';
import '../../styles/messenger.css';

type Conversation = { messages: ChatMessage[]; draft: string; error?: string; nudged?: boolean };
function Avatar({ friend, small = false }: { friend?: Friend; small?: boolean }) {
  return <span class={`msn-avatar msn-${friend?.color ?? 'blue'} ${small ? 'msn-avatar-small' : ''}`} aria-hidden="true"><span>{friend?.portrait ?? '☺'}</span></span>;
}
export default function Messenger({ locale }: { locale: string }) {
  const friends = friendsFor(locale);
  const copy = messengerCopy(locale);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, Conversation>>(() => Object.fromEntries(friends.map(friend => [friend.id, { messages: [{ role: 'assistant', text: friend.greeting }], draft: '' }])));
  const [pending, setPending] = useState<{ friendId: string; status: QueueStatus } | null>(null);
  const [shake, setShake] = useState(false);
  const [unread, setUnread] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const running = useRef<AbortController | null>(null);
  const currentFriend = useRef(selected);
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>();
  currentFriend.current = selected;
  const friend = friends.find(item => item.id === selected);
  const conversation = selected ? conversations[selected] : undefined;
  const isPending = pending?.friendId === selected;

  useEffect(() => {
    setReady(true);
    const desktopWindow = root.current?.closest('[data-window]');
    const stop = () => running.current?.abort();
    desktopWindow?.addEventListener('desktop:close', stop);
    window.addEventListener('pagehide', stop);
    return () => {
      stop(); clearTimeout(shakeTimer.current);
      desktopWindow?.removeEventListener('desktop:close', stop);
      window.removeEventListener('pagehide', stop);
    };
  }, []);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [selected, conversation?.messages.length, conversation?.error, conversation?.nudged]);

  function update(id: string, change: (value: Conversation) => Conversation) {
    setConversations(previous => ({ ...previous, [id]: change(previous[id]) }));
  }
  function selectFriend(id: string) {
    setSelected(id);
    setUnread(previous => previous.filter(value => value !== id));
    requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
  }
  async function send(retry = false) {
    if (!friend || !conversation || running.current) return;
    const text = conversation.draft.trim().slice(0, 500);
    if (!retry && !text) return;
    const id = friend.id;
    const messages: ChatMessage[] = retry ? conversation.messages : [...conversation.messages, { role: 'user', text }];
    const controller = new AbortController();
    running.current = controller;
    update(id, value => ({ ...value, messages: messages.slice(-80), draft: retry ? value.draft : '', error: undefined, nudged: false }));
    setPending({ friendId: id, status: { phase: 'connecting' } });
    try {
      const reply = await generateReply(buildPrompt(friend.prompt, messages, locale), controller.signal,
        status => setPending({ friendId: id, status }));
      if (controller.signal.aborted) return;
      update(id, value => ({ ...value, messages: [...value.messages, { role: 'assistant' as const, ...reply }].slice(-80) }));
      if (currentFriend.current !== id) setUnread(previous => [...new Set([...previous, id])]);
    } catch (error) {
      update(id, value => ({ ...value, error: controller.signal.aborted ? copy.stopped : error instanceof HordeError ? copy[error.code] : copy.network }));
    } finally {
      if (running.current === controller) { running.current = null; setPending(null); }
    }
  }
  function nudge() {
    if (!selected) return;
    update(selected, value => ({ ...value, nudged: true }));
    setShake(false);
    requestAnimationFrame(() => setShake(true));
    clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 450);
  }
  function clear() {
    if (!friend || pending || !window.confirm(copy.clearConfirm)) return;
    update(friend.id, () => ({ messages: [{ role: 'assistant', text: friend.greeting }], draft: '' }));
    input.current?.focus();
  }
  return <div ref={root} class={`msn ${selected ? 'msn-chat-open' : ''} ${shake ? 'msn-nudging' : ''}`}>
    <header class="msn-banner">
      <div class="msn-brand"><span class="msn-buddies" aria-hidden="true">♟♟</span><span><b>msn</b> Messenger<small>ExAI · a little nostalgia</small></span></div>
      <span class="msn-era" aria-hidden="true">:)</span>
    </header>
    <div class="msn-layout">
      <aside class="msn-sidebar" aria-label={copy.friends}>
        <div class="msn-self"><Avatar small /><div><strong>{copy.visitor}</strong><span><i class="msn-dot" /> {copy.online}</span></div></div>
        <div class="msn-roster-title"><strong>▾ {copy.friends} (4)</strong><small>{copy.virtual}</small></div>
        <nav class="msn-roster" aria-label={copy.friends}>
          {friends.map(item => <button type="button" key={item.id} class={`msn-contact ${selected === item.id ? 'is-selected' : ''}`} aria-pressed={selected === item.id} disabled={!ready} onClick={() => selectFriend(item.id)}>
            <Avatar friend={item} small /><span class="msn-contact-info"><strong>{item.name}{unread.includes(item.id) && <span class="msn-unread" aria-label={locale === 'zh' ? '新消息' : 'New message'}> ●</span>}</strong><small>{item.signature}</small></span>
          </button>)}
        </nav>
        <div class="msn-sidebar-bottom"><span aria-hidden="true">✉</span><span>{copy.subtitle}</span><small>1999 called. It said hi.</small></div>
      </aside>
      {friend && conversation ? <section class="msn-chat" aria-label={`${copy.ai}: ${friend.name}`}>
        <header class="msn-chat-heading"><button type="button" class="msn-back" onClick={() => setSelected(null)}><span aria-hidden="true">‹</span> {copy.back}</button><Avatar friend={friend} small /><div><h3>{friend.name}</h3><p>{friend.signature}</p></div><span class="msn-ai-badge">{copy.ai}</span></header>
        <div class="msn-transcript" ref={log} role="log" aria-label={`${friend.name} — ${copy.input}`} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
          <p class="msn-conversation-start">— {copy.subtitle} —</p>
          {conversation.messages.map((message, index) => <div class={`msn-message msn-message-${message.role}`} key={`${friend.id}-${index}`}>
            <span class="msn-speaker">{message.role === 'user' ? copy.visitor : friend.name} <span aria-hidden="true">:</span></span>
            <p>{message.text}</p>
            {message.model && <small class="msn-model">{copy.model} {message.model}</small>}
          </div>)}
          {conversation.nudged && <p class="msn-system-message">{copy.nudged}</p>}
        </div>
        <div class="msn-toolbar"><button type="button" onClick={nudge}><span aria-hidden="true">☺</span> {copy.nudge}</button><button type="button" onClick={clear} disabled={Boolean(pending)}>{copy.clear}</button></div>
        <div class="msn-progress" role="status" aria-live="polite">
          {isPending ? <span><span class="msn-dot msn-working" aria-hidden="true" /> {copy[pending.status.phase]} {pending.status.position !== undefined && ` · ${copy.queue} ${pending.status.position}`} {pending.status.seconds !== undefined && ` · ${pending.status.seconds} ${copy.seconds}`}</span> : conversation.error ? <span class="msn-error">{conversation.error}</span> : pending ? copy.busy : <span>{copy.hint}</span>}
          {conversation.error && !pending && <button type="button" class="msn-retry" onClick={() => void send(true)}>{copy.retry}</button>}
        </div>
        <form class="msn-compose" onSubmit={event => { event.preventDefault(); void send(); }}>
          <label class="sr-only" for="msn-message">{copy.input}</label>
          <textarea ref={input} id="msn-message" rows={3} maxLength={500} value={conversation.draft} placeholder={copy.placeholder}
            onInput={event => { const draft = event.currentTarget.value; update(friend.id, value => ({ ...value, draft })); }}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send(); } }} />
          <div class="msn-send-actions"><button type="submit" disabled={Boolean(pending) || !conversation.draft.trim()}>{copy.send}</button>{isPending && <button type="button" onClick={() => running.current?.abort()}>{copy.cancel}</button>}<small>{conversation.draft.length}/500</small></div>
        </form>
      </section> : <section class="msn-welcome"><div class="msn-welcome-portraits" aria-hidden="true">{friends.map(item => <Avatar friend={item} />)}</div><p class="msn-eyebrow">YOU’VE GOT FRIENDS</p><h3>{copy.welcome}</h3><p>{copy.subtitle}</p><button type="button" class="msn-first-chat" disabled={!ready} onClick={() => selectFriend('summer')}>{friends[0].name} <span aria-hidden="true">→</span></button><div class="msn-welcome-note"><span aria-hidden="true">✳</span> {locale === 'zh' ? '不用想好开场白，「在吗」就很好。' : 'No perfect opening line needed. “Hey” is plenty.'}</div></section>}
    </div>
    <footer class="msn-footnote"><span aria-hidden="true">ⓘ</span><p>{copy.note}</p><a href="https://aihorde.net/" target="_blank" rel="noopener noreferrer">AI Horde ↗</a></footer>
  </div>;
}
