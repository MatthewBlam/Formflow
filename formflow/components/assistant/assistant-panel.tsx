'use client';

import * as React from 'react';
import type { AssistantMode, ChatMessage } from '@/types';
import { useFormStore } from '@/store/form-store';
import { getCheckSummary, runChecks } from '@/lib/assistant/check';
import { getInitialAssistantMessage, handleAssistantTurn } from '@/lib/assistant/walkthrough';
import { ModeSwitcher } from './mode-switcher';
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
    if (initial.mode) state.setActiveMode(initial.mode);
    if (initial.nextFieldId !== undefined) state.setCurrentFieldId(initial.nextFieldId);
    if (initial.issues) state.setCheckIssues(initial.issues);
  }, [state]);

  function changeMode(mode: AssistantMode) {
    state.setActiveMode(mode);
    if (mode === 'check') {
      const issues = runChecks(state);
      state.setCheckIssues(issues);
      state.addChatMessage(makeMessage('assistant', getCheckSummary(issues)));
    }
    if (mode === 'qa') {
      state.addChatMessage(
        makeMessage(
          'assistant',
          'Ask me about a field, document proof, whether something can be left blank, or what is still missing.'
        )
      );
    }
  }

  function sendMessage(value: string) {
    state.addChatMessage(makeMessage('user', value));
    const result = handleAssistantTurn(state, value);
    for (const update of result.updates ?? []) {
      state.updateProfileEntry(update.fieldId, update);
    }
    if (result.nextFieldId !== undefined) state.setCurrentFieldId(result.nextFieldId);
    if (result.mode) state.setActiveMode(result.mode);
    if (result.issues) state.setCheckIssues(result.issues);
    state.addChatMessage(makeMessage('assistant', result.message));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l bg-background">
      <div className="border-b p-4">
        <div className="mb-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Assistant</p>
          <h2 className="text-xl font-semibold text-foreground">BridgeForm guide</h2>
        </div>
        <ModeSwitcher activeMode={state.activeMode} onModeChange={changeMode} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ChatThread messages={state.chatMessages} />
      </div>
      <ChatComposer disabled={!state.formSchema} onSend={sendMessage} />
    </section>
  );
}
