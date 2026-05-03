'use client';

import * as React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceInputButtonProps {
  onTranscript: (value: string) => void;
  disabled?: boolean;
}

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition() {
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const supported = typeof window !== 'undefined' && Boolean(getSpeechRecognition());
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);

  function toggleListening() {
    if (!supported || disabled) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(' ')
        .trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="outline"
      onClick={toggleListening}
      disabled={disabled || !supported}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={supported ? 'Voice input' : 'Voice input is not supported in this browser'}
      className="rounded-md"
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
