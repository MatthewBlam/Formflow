'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AssistantPanel } from '@/components/assistant/assistant-panel';
import { getCheckSummary, runChecks } from '@/lib/assistant/check';
import { getCachedExtraction, readPdfFile, saveCachedExtraction } from '@/lib/extraction-cache';
import { getDefaultDemoForm, getDemoForm } from '@/lib/forms/registry';
import { useFormStore } from '@/store/form-store';
import {
  getAnswerPacket,
  getCheckIssueCount,
  getCompletionPercentage,
  getCurrentSection,
  getRemainingRequiredFields,
} from '@/store/selectors';
import type { ChatMessage, FormField, ProfileEntry, UploadKind } from '@/types';
import { FormControlPanel } from './form-control-panel';

function subscribeToHydrationStore() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

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

export function FormWorkspace() {
  const router = useRouter();
  const state = useFormStore();
  const hydrated = React.useSyncExternalStore(
    subscribeToHydrationStore,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot
  );
  const completionPercentage = getCompletionPercentage(state);
  const currentSection = getCurrentSection(state);
  const remainingRequiredFields = getRemainingRequiredFields(state);
  const issueCount = getCheckIssueCount(state);
  const answerPacket = getAnswerPacket(state);
  const missingDocumentCount = state.formSchema?.documentRequirements?.filter(
    (doc) => state.documentStatusMap[doc.id] !== 'present'
  ).length ?? 0;

  function loadDemo(id: string) {
    const demo = getDemoForm(id) ?? getDefaultDemoForm();
    state.resetSession();
    state.setSelectedDemoFormId(demo.id);
    state.setFormSchema(demo.schema);
    state.setPdfUrl(demo.pdfUrl);
    state.setUploadKind('blank', 1);
    state.setExtractionStatus('complete');
    state.setCurrentFieldId(null);
    state.setChatMessages([
      makeMessage(
        'assistant',
        `Loaded ${demo.title}. I can walk through the required fields, answer questions, or check existing answers.`
      ),
    ]);
  }

  async function uploadPdf(file: File) {
    const blobUrl = URL.createObjectURL(file);
    state.setPdfUrl(blobUrl);
    state.setSelectedDemoFormId(null);
    state.setExtractionStatus('processing');
    state.setChatMessages([makeMessage('assistant', 'Reading the uploaded PDF and preparing guidance...')]);

    try {
      const pdfRead = await readPdfFile(file);
      const cached = getCachedExtraction(pdfRead.documentHash);
      if (cached) {
        state.setFormSchema(cached.schema);
        state.setUploadKind(cached.uploadKind, cached.uploadKindConfidence);
        state.setExtractionStatus('complete');
        state.setChatMessages([
          makeMessage(
            'assistant',
            `Loaded cached guidance for ${cached.fileName}. I can walk through the required fields, answer questions, or check existing answers.`
          ),
        ]);
        return;
      }

      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: blobUrl, pdfBase64: pdfRead.base64 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Extract failed: ${response.status}`);

      const kind = (body.uploadKind ?? 'unknown') as UploadKind;
      const confidence = typeof body.uploadKindConfidence === 'number' ? body.uploadKindConfidence : 0;
      state.setFormSchema(body.schema);
      state.setUploadKind(kind, confidence);
      saveCachedExtraction({
        documentHash: pdfRead.documentHash,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        cachedAt: new Date().toISOString(),
        schema: body.schema,
        uploadKind: kind,
        uploadKindConfidence: confidence,
      });
      state.setExtractionStatus('complete');
      if (kind === 'filled') {
        const issues = runChecks({ ...state, formSchema: body.schema });
        state.setCheckIssues(issues);
        state.setChatMessages([
          makeMessage('assistant', `This looks like a filled form. ${getCheckSummary(issues)}`),
        ]);
      } else if (kind === 'blank') {
        state.setChatMessages([
          makeMessage('assistant', 'This looks like a blank form. I can walk you through the required fields.'),
        ]);
      } else {
        state.setChatMessages([
          makeMessage(
            'assistant',
            'I could not confidently tell whether this PDF is blank or filled. You can answer fields in chat, ask me questions, or use the Check button if you already filled it out.'
          ),
        ]);
      }
    } catch (error) {
      state.setExtractionStatus('error', error instanceof Error ? error.message : 'Unknown upload error');
      state.setChatMessages([
        makeMessage('assistant', 'I could not process that upload. You can try again or use the SAWS 2 PLUS demo form.'),
      ]);
    }
  }

  function saveManualAnswer(field: FormField, value: string) {
    const update: ProfileEntry = {
      fieldId: field.id,
      value,
      status: 'complete',
      source: 'interview',
      confidence: 1,
    };
    state.updateProfileEntry(field.id, update);
    state.setCurrentFieldId(field.id);
    state.setCurrentPage(field.page);
    state.addChatMessage(
      makeMessage(
        'system',
        `Manual response updated: ${field.plainLanguageLabel ?? field.label} = ${value}`
      )
    );
  }

  if (!hydrated) {
    return (
      <main
        className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2"
        aria-busy="true"
      >
        <aside className="flex min-h-0 flex-1 flex-col border-r bg-background">
          <div className="border-b p-3">
            <div className="h-9 rounded-md bg-muted" />
          </div>
          <div className="flex-1 bg-secondary/20 p-4">
            <div className="rounded-xl bg-card p-4 ring-1 ring-border/40">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="mt-3 h-6 w-40 rounded bg-muted" />
            </div>
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col border-l bg-background">
          <div className="border-b p-4">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="mt-3 h-4 w-72 rounded bg-muted" />
          </div>
          <div className="flex-1" />
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
      <FormControlPanel
        schema={state.formSchema}
        selectedDemoFormId={state.selectedDemoFormId}
        uploadKind={state.uploadKind}
        uploadKindConfidence={state.uploadKindConfidence}
        processing={state.extractionStatus === 'processing'}
        pdfUrl={state.pdfUrl}
        currentPage={state.currentPage}
        completionPercentage={completionPercentage}
        currentSection={currentSection}
        remainingRequiredCount={remainingRequiredFields.length}
        missingDocumentCount={missingDocumentCount}
        issueCount={issueCount}
        answerPacket={answerPacket}
        applicationProfile={state.applicationProfile}
        onSelectDemo={loadDemo}
        onUpload={uploadPdf}
        onPageChange={state.setCurrentPage}
        onSaveManualAnswer={saveManualAnswer}
      />
      <AssistantPanel />
      {!state.formSchema && (
        <button
          type="button"
          onClick={() => router.push('/')}
          className="sr-only"
        >
          Return to landing page
        </button>
      )}
    </main>
  );
}
