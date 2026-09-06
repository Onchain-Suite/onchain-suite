"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal Web Speech API wrapper for dictating into a text field. Feature-detects
 * SpeechRecognition (Chrome/Edge/Safari), reports `supported` so callers can hide
 * the control where it is unavailable, and streams the final transcript to
 * `onTranscript`. Shared by the dashboard command bar and the intelligence chat
 * composer so both dictate the same way.
 */
type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null
  );
  // Keep the latest callback without re-creating `toggle` on every keystroke.
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      stop();
      return;
    }
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: unknown) => {
      const e = event as {
        results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
      };
      const { results } = e;
      if (!results || results.length === 0) return;
      const last = results[results.length - 1];
      const alt = last?.[0] ?? null;
      const text =
        alt && typeof alt.transcript === "string" ? alt.transcript : "";
      if (text.trim().length > 0) callbackRef.current(text.trim());
    };
    setListening(true);
    recognition.start();
  }, [listening, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { listening, supported, toggle };
}
