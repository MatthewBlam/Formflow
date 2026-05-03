'use client';

import type { ChatMessage } from '@/types';

interface ChatThreadProps {
  messages: ChatMessage[];
}

export function ChatThread({ messages }: ChatThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-muted-foreground">
        Load a form to start the assistant.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {messages
        .filter((message) => message.role !== 'system')
        .map((message) => (
          <div
            key={message.id}
            className={`max-w-[86%] rounded-md px-3 py-2 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto border bg-background text-foreground'
            }`}
          >
            {message.content.split('\n').map((line, index) => (
              <p key={`${message.id}-${index}`} className={index > 0 ? 'mt-2' : undefined}>
                {line}
              </p>
            ))}
          </div>
        ))}
    </div>
  );
}
