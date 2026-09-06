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

export function useVoiceInput(
  onTranscript: (text: string) => void,
  onError?: (message: string) => void
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(
    null
  );
  // Keep the latest callbacks without re-creating `toggle` on every keystroke.
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      errorRef.current?.("Voice input is not supported in this browser.");
      return;
    }
    if (listening) {
      stop();
      return;
    }
    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    // Final results only: interim results would append the same words repeatedly.
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onerror = (event: unknown) => {
      setListening(false);
      const code = (event as { error?: string })?.error;
      errorRef.current?.(
        code === "not-allowed" || code === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser to dictate."
          : "Voice input failed. Please try again."
      );
    };
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
    try {
      recognition.start();
    } catch {
      // start() throws if called while already active; reset so the next tap works.
      setListening(false);
    }
  }, [listening, stop]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return { listening, supported, toggle };
}
