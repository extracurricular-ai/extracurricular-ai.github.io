/** Public anonymous access, documented by AI Horde. This is not a private key. */
const API = 'https://aihorde.net/api/v2';
const ANONYMOUS_KEY = '0000000000';
export type HordeErrorCode = 'network' | 'rate' | 'unavailable' | 'timeout' | 'empty';
export class HordeError extends Error {
  constructor(public code: HordeErrorCode) { super(code); }
}
export interface ChatMessage { role: 'user' | 'assistant'; text: string; model?: string }
export interface QueueStatus { phase: 'connecting' | 'waiting' | 'generating'; position?: number; seconds?: number }

export function buildPrompt(persona: string, messages: ChatMessage[], locale: string) {
  // Keep the character instruction and latest messages inside a small context.
  // Use conservative character limits because Chinese tokenization is denser.
  const recent: string[] = [];
  let remaining = 1100;
  for (const message of messages.slice(-8).reverse()) {
    const text = message.text.slice(0, Math.min(500, remaining));
    if (!text) break;
    recent.unshift(`### ${message.role === 'user' ? 'User' : 'Assistant'}:\n${text}`);
    remaining -= text.length;
  }
  const language = ({ zh: 'Simplified Chinese', en: 'English', es: 'Spanish', fr: 'French' } as Record<string, string>)[locale] ?? 'English';
  return `### Instruction:\n${persona}\nThis is a fictional MSN Messenger chat. Reply in ${language}, or the visitor's language if they ask. Write only your next chat message, in 1–3 short sentences. No role labels, stage directions or long lists. Never write the visitor's next message. Be honest that you are an AI character if asked.\n\n${recent.join('\n\n')}\n\n### Assistant:\n`;
}

async function jsonRequest(path: string, init: RequestInit, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20_000);
  try {
    const response = await fetch(`${API}${path}`, { ...init, signal: controller.signal });
    if (!response.ok) throw new HordeError(response.status === 429 ? 'rate' : 'unavailable');
    const data = await response.json();
    if (!data || typeof data !== 'object') throw new HordeError('unavailable');
    return data;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error instanceof HordeError) throw error;
    throw new HordeError(controller.signal.aborted ? 'timeout' : 'network');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function generateReply(prompt: string, signal: AbortSignal, progress: (status: QueueStatus) => void) {
  let id: string | undefined;
  let completed = false;
  const deadline = Date.now() + 180_000;
  try {
    signal.throwIfAborted();
    progress({ phase: 'connecting' });
    // Finish submission even if cancelled, so a returned job ID can be deleted.
    const submitted = await jsonRequest('/generate/text/async', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANONYMOUS_KEY },
      body: JSON.stringify({ prompt, params: { n: 1, max_context_length: 2048, max_length: 160, temperature: 0.75, rep_pen: 1.1, stop_sequence: ['\n### User:', '\n### Instruction:', '\n### Assistant:'] } }),
    });
    if (typeof submitted.id !== 'string' || !submitted.id) throw new HordeError('unavailable');
    id = submitted.id;
    signal.throwIfAborted();
    progress({ phase: 'waiting' });
    while (Date.now() < deadline) {
      await delay(3000, signal);
      const status = await jsonRequest(`/generate/text/status/${encodeURIComponent(id)}`, {}, signal);
      if (status.faulted) throw new HordeError('unavailable');
      if (status.done) {
        completed = true;
        const generations = status.generations as { text?: unknown; model?: unknown }[] | undefined;
        const generation = Array.isArray(generations) ? generations[0] : undefined;
        const text = typeof generation?.text === 'string' ? generation.text.split(/\n### (?:User|Instruction|Assistant):/)[0].trim() : '';
        if (!text) throw new HordeError('empty');
        return { text: text.slice(0, 4000), model: typeof generation?.model === 'string' ? generation.model : undefined };
      }
      progress({ phase: typeof status.processing === 'number' && status.processing > 0 ? 'generating' : 'waiting',
        position: typeof status.queue_position === 'number' ? status.queue_position : undefined,
        seconds: typeof status.wait_time === 'number' ? Math.max(0, Math.ceil(status.wait_time)) : undefined });
    }
    throw new HordeError('timeout');
  } finally {
    if (id && !completed) {
      // Best effort cancellation of our own job; never cancel another user's work.
      void fetch(`${API}/generate/text/status/${encodeURIComponent(id)}`, { method: 'DELETE', signal: AbortSignal.timeout(5000), keepalive: true }).catch(() => {});
    }
  }
}
