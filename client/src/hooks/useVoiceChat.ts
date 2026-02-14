import { useCallback, useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Web Speech API types (not shipped with lib.dom in all TS configs)  */
/* ------------------------------------------------------------------ */
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'thinking';

interface UseVoiceChatOptions {
  lang?: string;           // BCP-47 language code, default 'th-TH'
  voiceName?: string;      // preferred TTS voice name
  rate?: number;           // TTS speed (0.1 – 10), default 1
  pitch?: number;          // TTS pitch (0 – 2), default 1
  onTranscript?: (text: string) => void;   // called when STT finalises
  onError?: (message: string) => void;
  onStateChange?: (state: VoiceState) => void;
}

interface UseVoiceChatReturn {
  state: VoiceState;
  isSupported: boolean;
  transcript: string;       // latest recognised text
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  cancelSpeech: () => void;
  interimText: string;      // partial recognition while user is speaking
}

export function useVoiceChat(options: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const {
    lang = 'th-TH',
    rate = 1,
    pitch = 1,
    onTranscript,
    onError,
    onStateChange,
  } = options;

  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const transcriptRef = useRef('');
  const interimRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onStateChangeRef = useRef(onStateChange);

  // Keep callback refs fresh
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  // Push state changes
  useEffect(() => { onStateChangeRef.current?.(state); }, [state]);

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionCtor && !!synthRef.current;

  const resolveThaiVoice = useCallback(async (synth: SpeechSynthesis): Promise<SpeechSynthesisVoice | null> => {
    const pickThaiVoice = () => {
      const voices = synth.getVoices();
      // Prioritize known high-quality Thai voices
      const google = voices.find(v => v.name.includes('Google') && v.lang.includes('th'));
      const kanya = voices.find(v => v.name.includes('Kanya') || v.name.includes('Narisa'));
      const pattara = voices.find(v => v.name.includes('Pattara'));

      return google || kanya || pattara
        || voices.find(v => v.lang?.toLowerCase().startsWith('th'))
        || voices.find(v => v.lang?.toLowerCase().includes('th-th'))
        // Fallback: check if name contains "Thai" (useful for some systems where lang is weird)
        || voices.find(v => v.name.toLowerCase().includes('thai'))
        || null;
    };

    const immediate = pickThaiVoice();
    if (immediate) return immediate;

    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      let settled = false;

      const done = (voice: SpeechSynthesisVoice | null) => {
        if (settled) return;
        settled = true;
        synth.onvoiceschanged = null;
        resolve(voice);
      };

      const timeout = setTimeout(() => {
        done(pickThaiVoice());
      }, 800);

      synth.onvoiceschanged = () => {
        clearTimeout(timeout);
        done(pickThaiVoice());
      };
    });
  }, []);

  /* ----- STT (Speech-to-Text) ----- */

  const startListening = useCallback(() => {
    if (!SpeechRecognitionCtor) return;
    if (recognitionRef.current) return;

    const synth = synthRef.current;
    if (synth?.speaking || synth?.pending) {
      onErrorRef.current?.('กรุณารอให้ AI พูดจบก่อน แล้วค่อยเริ่มบันทึกเสียง');
      return;
    }

    // Cancel any ongoing speech first
    synth?.cancel();
    setTranscript('');
    setInterimText('');
    transcriptRef.current = '';
    interimRef.current = '';

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    // @ts-expect-error supported in Chromium implementations
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      interimRef.current = interim;
      setInterimText(interim);
      if (finalText) {
        transcriptRef.current = finalText;
        setTranscript(finalText);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[STT] Recognition error:', event.error);
      if (event.error !== 'aborted') {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onErrorRef.current?.('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณากด "อนุญาต" (Allow) ที่แถบ Address Bar หรือตรวจสอบการตั้งค่า Browser');
        } else if (event.error === 'no-speech') {
          onErrorRef.current?.('ไม่ได้ยินเสียงพูด กรุณาพูดให้ชัดเจนแล้วลองอีกครั้ง');
        } else {
          onErrorRef.current?.('เกิดปัญหาในการรับเสียง กรุณาลองอีกครั้ง');
        }
        setState('idle');
      }
    };

    recognition.onend = () => {
      // STT session ended — fire callback with whatever we got
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setState('idle');
      onErrorRef.current?.('ไม่สามารถเริ่มบันทึกเสียงได้ กรุณาลองอีกครั้ง');
    }
  }, [SpeechRecognitionCtor, lang]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.stop();
    recognitionRef.current = null;

    // Collect the final transcript
    setInterimText('');
    const finalText = (transcriptRef.current || interimRef.current || '').trim();
    transcriptRef.current = finalText;
    interimRef.current = '';
    setTranscript(finalText);
    setTimeout(() => onTranscriptRef.current?.(finalText), 0);
    setState('idle');
  }, []);

  /* ----- TTS (Text-to-Speech) ----- */

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(async (resolve) => {
      // Stop any ongoing recognition & speech first
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      synthRef.current?.cancel();

      // 1. Try Server-side Google Cloud TTS (High Quality)
      try {
        console.log('[TTS] Requesting server-side Google Cloud TTS...');
        // We use fetch directly here to handle blob response easily
        const response = await fetch('/api/audio/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);

          audio.onplay = () => setState('speaking');
          audio.onended = () => { setState('idle'); URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => {
            console.warn('[TTS] Server audio playback failed, falling back to local.');
            setState('idle');
            resolve(); // Or try fallback
          };

          await audio.play();
          return; // Success!
        } else {
          console.warn('[TTS] Server TTS failed:', await response.text());
        }
      } catch (err) {
        console.warn('[TTS] Server TTS error:', err);
      }

      // 2. Fallback: Local Browser TTS
      console.log('[TTS] Falling back to local browser TTS');
      const synth = synthRef.current;
      if (!synth) { resolve(); return; }
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      const thaiVoice = await resolveThaiVoice(synth);
      if (thaiVoice) {
        utterance.voice = thaiVoice;
        utterance.onstart = () => setState('speaking');
        utterance.onend = () => { setState('idle'); resolve(); };
        utterance.onerror = () => { setState('idle'); resolve(); };
        synth.speak(utterance);
      } else {
        console.warn('[TTS] No local Thai voice found. Trying online fallback...');
        // Fallback: Use Google Translate TTS API (client=tw-ob)
        try {
          setState('speaking');
          const encodedText = encodeURIComponent(text);
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=th&q=${encodedText}`;
          const audio = new Audio(url);

          audio.onended = () => {
            setState('idle');
            resolve();
          };

          audio.onerror = (e) => {
            console.error('[TTS] Online fallback failed:', e);
            onErrorRef.current?.('ไม่สามารถอ่านเสียงได้ (ไม่พบเสียงไทยในเครื่อง และ Fallback เชื่อมต่อไม่ได้)');
            setState('idle');
            resolve();
          };

          await audio.play();
        } catch (err) {
          console.error('[TTS] Playback error:', err);
          setState('idle');
          resolve();
        }
      }
    });
  }, [lang, rate, pitch, resolveThaiVoice]);

  const cancelSpeech = useCallback(() => {
    synthRef.current?.cancel();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    state,
    isSupported,
    transcript,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    interimText,
  };
}
