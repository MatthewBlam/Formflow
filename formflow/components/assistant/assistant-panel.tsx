'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { useFormStore } from '@/store/form-store';
import { getCheckSummary, runChecks } from '@/lib/assistant/check';
import { getInitialAssistantMessage, handleCaseworkerTurn } from '@/lib/assistant/walkthrough';
import { ChatThread } from './chat-thread';
import { ChatComposer } from './chat-composer';

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function AssistantPanel() {
  const state = useFormStore();

  React.useEffect(() => {
    if (!state.formSchema || state.chatMessages.length > 0) return;
    const initial = getInitialAssistantMessage(state);
    state.addChatMessage(makeMessage('assistant', initial.message));
    if (initial.nextFieldId !== undefined) state.setCurrentFieldId(initial.nextFieldId);
    if (initial.issues) state.setCheckIssues(initial.issues);
  }, [state]);

  function checkAnswers() {
    const issues = runChecks(state);
    state.setCheckIssues(issues);
    state.addChatMessage(
      makeMessage('assistant', `I checked your answers so far. ${getCheckSummary(issues)}`)
    );
  }

  function sendMessage(value: string) {
    state.addChatMessage(makeMessage('user', value));
    const result = handleCaseworkerTurn(state, value);
    for (const update of result.updates ?? []) {
      state.updateProfileEntry(update.fieldId, update);
    }
    if (result.nextFieldId !== undefined) state.setCurrentFieldId(result.nextFieldId);
    if (result.issues) state.setCheckIssues(result.issues);
    state.addChatMessage(makeMessage('assistant', result.message));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l bg-background">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Caseworker chat</p>
            <h2 className="text-xl font-semibold text-foreground">BridgeForm assistant</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Ask questions, answer fields, or ask for help at any point.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={checkAnswers}
            disabled={!state.formSchema}
            className="rounded-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            Check
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ChatThread messages={state.chatMessages} />
      </div>
      <ChatComposer disabled={!state.formSchema} onSend={sendMessage} />
    </section>
  );
}
