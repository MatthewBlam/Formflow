'use client';

import * as React from 'react';
import type { ChatMessage } from '@/types';

interface ChatThreadProps {
  messages: ChatMessage[];
}

export function ChatThread({ messages }: ChatThreadProps) {
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const visibleMessages = messages.filter((message) => message.role !== 'system');
  const lastMessageId = visibleMessages.at(-1)?.id;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lastMessageId]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-muted-foreground">
        Load a form to start the assistant.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[86%] rounded-md px-3 py-2 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-card text-card-foreground shadow-md shadow-foreground/10 ring-1 ring-border/30'
            }`}
          >
            {message.content.split('\n').map((line, index) => (
              <p key={`${message.id}-${index}`} className={index > 0 ? 'mt-2' : undefined}>
                {line}
              </p>
            ))}
          </div>
        ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
