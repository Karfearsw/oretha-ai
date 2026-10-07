"use client";

import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/* Voice input (Web Speech API) for the chat composer.
 * Extracted from src/app/(mobile)/chats/[threadId]/page.tsx:
 *  - listening   → whether the mic is live (drives the pulse + placeholder)
 *  - voiceNote   → toast line under the composer; shared with the quick
 *                  actions (mail/pin) and options (clear) that also speak
 *                  through it, so the hook exposes the setter too
 *  - toggleVoice → start/stop recognition, honest fallback where unsupported
 */

/* Minimal Web Speech API types (not in the standard DOM lib). */
export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

export function useVoiceInput(setInput: Dispatch<SetStateAction<string>>) {
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  /* ── Voice input (Web Speech API) ─────────────────────────────
   * Real speech-to-text where the browser supports it; honest
   * guidance where it doesn't. Transcripts land in the composer. */
  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceNote(
        "Voice input needs a Chromium browser (Chrome, Edge) or Safari — this browser doesn't expose speech recognition.",
      );
      setTimeout(() => setVoiceNote(null), 6000);
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInput(
        (prev) =>
          (prev ? `${prev.trimEnd()} ` : "") + (final || interim).trim(),
      );
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = (e) => {
      setListening(false);
      recRef.current = null;
      const kind = e?.error;
      setVoiceNote(
        kind === "not-allowed" || kind === "service-not-allowed"
          ? "Microphone access is blocked — allow it in the browser's site settings and try again."
          : kind === "no-speech"
            ? null
            : "Voice input hit a snag — try again, or just type it.",
      );
      if (kind !== "no-speech") setTimeout(() => setVoiceNote(null), 6000);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return { listening, voiceNote, setVoiceNote, toggleVoice };
}
