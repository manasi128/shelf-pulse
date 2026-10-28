/**
 * Browser speech-to-text (Web Speech API), used in live mode when the browser supports it.
 * Audio goes to the browser's own speech service; nothing passes through this app's server.
 */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

const LOCALES: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', ta: 'ta-IN', bn: 'bn-IN' };

function ctor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && ctor() != null;
}

/** Starts listening; returns a stop function. `onText` receives the running transcript. */
export function listen(lang: string, onText: (text: string) => void, onEnd: () => void): () => void {
  const C = ctor();
  if (!C) {
    onEnd();
    return () => {};
  }
  const rec = new C();
  rec.lang = LOCALES[lang] ?? 'en-IN';
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
    onText(text);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  rec.start();
  return () => rec.stop();
}
