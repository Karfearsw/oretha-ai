/**
 * Voice helpers for Prompt Forge — browser Web Speech API only.
 * No keys, no backend, no new dependencies. Everything degrades
 * gracefully when the browser offers no speech support.
 */

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: {
        results: ArrayLike<
          ArrayLike<{ transcript: string }> & { isFinal: boolean }
        >;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor =
    (w.SpeechRecognition as SpeechRecognitionCtor | undefined) ??
    (w.webkitSpeechRecognition as SpeechRecognitionCtor | undefined);
  return Ctor ?? null;
}

export function speechRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null;
}

export function speechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function createRecognizer(): SpeechRecognitionLike | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices();
}

export function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
): void {
  if (!speechSynthesisSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.rate = 1.02;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (speechSynthesisSupported()) window.speechSynthesis.cancel();
}
