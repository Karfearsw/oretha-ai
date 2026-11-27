"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import {
  createRecognizer,
  speechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice";

/**
 * Mic button that dictates speech-to-text into a text field.
 * Calls onTranscript with interim text as it arrives and the final text
 * when the recognizer stops. Renders a plain note when the browser
 * has no speech recognition — never a dead button.
 */
export function VoiceInput({
  onTranscript,
  onDictationStart,
  label = "Dictate",
}: {
  /** (text, isFinal) — interim updates stream in, then a final result. */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Fires when listening starts, so the caller can snapshot the field. */
  onDictationStart?: () => void;
  label?: string;
}) {
  const [supported] = useState(() => speechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const cbRef = useRef(onTranscript);
  cbRef.current = onTranscript;

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  if (!supported) {
    return (
      <span className="text-[11.5px] text-clay">
        Voice isn&apos;t available in this browser — type instead.
      </span>
    );
  }

  const toggle = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
      setListening(false);
      return;
    }
    const rec = createRecognizer();
    if (!rec) {
      setError("Voice isn't available in this browser.");
      return;
    }
    setError(null);
    recRef.current = rec;
    rec.onresult = (e) => {
      let interim = "";
      let finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (finalText) cbRef.current(finalText.trim(), true);
      else if (interim) cbRef.current(interim, false);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Mic blocked — allow microphone access and try again.");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        setError("Couldn't hear that — try again.");
      }
    };
    rec.onend = () => setListening(false);
    try {
      onDictationStart?.();
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? "Stop dictating" : label}
        aria-pressed={listening}
        className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition active:scale-95 ${
          listening
            ? "animate-pulse border-gold/60 bg-gold/20 text-gold"
            : "border-white/12 bg-elevated text-sand hover:text-cream"
        }`}
      >
        {listening ? <MicOff size={14} /> : <Mic size={14} />}
        {listening ? "Listening…" : label}
      </button>
      {error && <span className="text-[11.5px] text-alert">{error}</span>}
    </span>
  );
}
