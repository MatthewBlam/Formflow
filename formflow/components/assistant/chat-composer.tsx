'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (value: string) => void;
}

export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [value, setValue] = React.useState('');

  function send(text = value) {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  }

  return (
    <div className="border-t bg-background p-3">
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
  );
}
