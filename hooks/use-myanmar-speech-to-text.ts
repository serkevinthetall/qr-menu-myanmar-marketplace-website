import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/** Chrome Myanmar speech works best with my-MM; my is a fallback. */
const MYANMAR_LOCALES = ['my-MM', 'my'] as const;
export const VOICE_MAX_SECONDS = 10;
const MAX_LISTENING_MS = VOICE_MAX_SECONDS * 1000;

type UseMyanmarSpeechToTextOptions = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
};

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Allow microphone access in your browser.';
    case 'no-speech':
      return '';
    case 'audio-capture':
      return 'No microphone found. Check your audio input device.';
    case 'network':
      return 'Speech recognition needs an internet connection.';
    case 'aborted':
      return '';
    default:
      return 'Voice input failed. Try again.';
  }
}

/** Clean browser speech output for Myanmar/English delivery notes. */
function normalizeTranscript(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickBestTranscript(result: SpeechRecognitionResult): string {
  let bestText = result[0]?.transcript ?? '';
  let bestConfidence = result[0]?.confidence ?? 0;

  for (let index = 1; index < result.length; index += 1) {
    const alternative = result[index];
    const confidence = alternative?.confidence ?? 0;
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestText = alternative?.transcript ?? bestText;
    }
  }

  return bestText;
}

export function useMyanmarSpeechToText({
  onTranscript,
  onError,
}: UseMyanmarSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const keepListeningRef = useRef(false);
  const endsAtRef = useRef(0);
  const localeIndexRef = useRef(0);
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  const clearTimers = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const finishListening = useCallback(() => {
    keepListeningRef.current = false;
    clearTimers();
    setIsListening(false);
    setSecondsLeft(0);
  }, [clearTimers]);

  const updateCountdown = useCallback(() => {
    const remainingMs = Math.max(0, endsAtRef.current - Date.now());
    setSecondsLeft(Math.ceil(remainingMs / 1000));
  }, []);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      return;
    }

    setIsSupported(true);
    const recognition = new Ctor();
    // Phrase-by-phrase finals are more accurate for Myanmar than live interim text.
    recognition.lang = MYANMAR_LOCALES[0];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = event => {
      let combined = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal) {
          continue;
        }
        combined += pickBestTranscript(result);
      }

      const text = normalizeTranscript(combined);
      if (text) {
        onTranscriptRef.current(text);
      }
    };

    recognition.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      // If language pack fails, try the next Myanmar locale once.
      if (
        event.error === 'language-not-supported' &&
        localeIndexRef.current < MYANMAR_LOCALES.length - 1
      ) {
        localeIndexRef.current += 1;
        recognition.lang = MYANMAR_LOCALES[localeIndexRef.current];
        if (keepListeningRef.current && Date.now() < endsAtRef.current) {
          try {
            recognition.start();
            return;
          } catch {
            // Fall through.
          }
        }
      }

      const message = mapSpeechError(event.error);
      if (message) {
        onErrorRef.current?.(message);
      }
      recognition.abort();
      finishListening();
    };

    recognition.onend = () => {
      if (keepListeningRef.current && Date.now() < endsAtRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Fall through and stop if restart fails.
        }
      }
      finishListening();
    };

    recognitionRef.current = recognition;

    return () => {
      keepListeningRef.current = false;
      clearTimers();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [clearTimers, finishListening]);

  const stop = useCallback(() => {
    keepListeningRef.current = false;
    clearTimers();
    recognitionRef.current?.stop();
    setIsListening(false);
    setSecondsLeft(0);
  }, [clearTimers]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      onErrorRef.current?.(
        Platform.OS === 'web'
          ? 'Voice input is not supported in this browser. Try Chrome or Edge.'
          : 'Voice input is available on web only.',
      );
      return;
    }

    try {
      clearTimers();
      keepListeningRef.current = true;
      localeIndexRef.current = 0;
      recognition.lang = MYANMAR_LOCALES[0];
      endsAtRef.current = Date.now() + MAX_LISTENING_MS;
      setSecondsLeft(VOICE_MAX_SECONDS);
      setIsListening(true);

      recognition.start();

      countdownTimerRef.current = setInterval(updateCountdown, 200);
      maxDurationTimerRef.current = setTimeout(() => {
        keepListeningRef.current = false;
        recognitionRef.current?.stop();
        finishListening();
      }, MAX_LISTENING_MS);
    } catch {
      finishListening();
      onErrorRef.current?.('Voice input is already active. Tap stop, then try again.');
    }
  }, [clearTimers, finishListening, updateCountdown]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
      return;
    }
    start();
  }, [isListening, start, stop]);

  return {
    isListening,
    isSupported,
    secondsLeft,
    maxSeconds: VOICE_MAX_SECONDS,
    start,
    stop,
    toggle,
  };
}
