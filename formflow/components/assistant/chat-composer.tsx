'use client';

import * as React from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceInputButton } from './voice-input-button';

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (value: string) => void;
}

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [value, setValue] = React.useState('');
  const [voicePreview, setVoicePreview] = React.useState<string | null>(null);

  function send(text = value) {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    setVoicePreview(null);
  }

  return (
    <div className="border-t bg-background p-3">
      {voicePreview && (
        <div className="mb-3 rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Voice preview</p>
          <p className="mt-1 text-sm leading-6 text-foreground">{voicePreview}</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" onClick={() => send(voicePreview)} className="rounded-md">
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setVoicePreview(null)}
              className="rounded-md"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type your answer or question..."
          rows={3}
          disabled={disabled}
          aria-label="Message"
          className="min-h-20"
        />
        <div className="flex flex-col gap-2">
          <VoiceInputButton disabled={disabled} onTranscript={setVoicePreview} />
          <Button
            type="button"
            size="icon-sm"
            onClick={() => send()}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="rounded-md"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
