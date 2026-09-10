import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export interface ComposerLabels {
  label: string;
  placeholder: string;
  hint: string;
  submit: string;
  copying: string;
  copied: string;
  failed: string;
  open: string;
}

export default function DiscussionComposer({ href, labels }: { href: string; labels: ComposerLabels }) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle');
  const textarea = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (status !== 'failed') return;
    // Select only after the copying state has released the disabled textarea.
    textarea.current?.focus({ preventScroll: true });
    textarea.current?.select();
  }, [status]);

  async function copyAndOpen() {
    if (!draft.trim() || status === 'copying') return;
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(draft);
      setStatus('copied');
      // Same-tab navigation avoids popup blockers after the async clipboard operation.
      window.location.assign(href);
    } catch {
      setStatus('failed');
    }
  }

  return <form class="discussion-composer" onSubmit={(event) => { event.preventDefault(); void copyAndOpen(); }}>
    <label for="community-message">{labels.label}</label>
    <textarea ref={textarea} id="community-message" rows={4} value={draft} disabled={status === 'copying'} maxLength={10000} placeholder={labels.placeholder} aria-describedby="community-message-hint community-message-status"
      onInput={(event) => { setDraft(event.currentTarget.value); setStatus('idle'); }} />
    <p id="community-message-hint" class="discussion-hint">{labels.hint}</p>
    <div class="discussion-composer-actions">
      <button class="btn-primary" type="submit" disabled={!draft.trim() || status === 'copying'}>{status === 'copying' ? labels.copying : labels.submit}</button>
      <a class="discussion-text-link" href={href}>{labels.open}</a>
    </div>
    <p id="community-message-status" class="discussion-status" role="status" aria-live="polite">{status === 'failed' ? labels.failed : status === 'copied' ? labels.copied : ''}</p>
  </form>;
}
