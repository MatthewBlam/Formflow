'use client';

import { useRouter } from 'next/navigation';
import { AssistantPanel } from '@/components/assistant/assistant-panel';
import { getCheckSummary, runChecks } from '@/lib/assistant/check';
import { getDefaultDemoForm, getDemoForm } from '@/lib/forms/registry';
import { useFormStore } from '@/store/form-store';
import {
  getAnswerPacket,
  getCheckIssueCount,
  getCompletionPercentage,
  getCurrentSection,
  getRemainingRequiredFields,
} from '@/store/selectors';
import type { ChatMessage, UploadKind } from '@/types';
import { FormControlPanel } from './form-control-panel';

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

async function fileToBase64(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

export function FormWorkspace() {
  const router = useRouter();
  const state = useFormStore();
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
    state.setActiveMode('walkthrough');
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
      const pdfBase64 = await fileToBase64(file);
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: blobUrl, pdfBase64 }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `Extract failed: ${response.status}`);

      const kind = (body.uploadKind ?? 'unknown') as UploadKind;
      const confidence = typeof body.uploadKindConfidence === 'number' ? body.uploadKindConfidence : 0;
      state.setFormSchema(body.schema);
      state.setUploadKind(kind, confidence);
      state.setExtractionStatus('complete');
      const mode = kind === 'filled' ? 'check' : kind === 'blank' ? 'walkthrough' : 'qa';
      state.setActiveMode(mode);
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
            'I could not confidently tell whether this PDF is blank or filled. Use Walkthrough to answer it from scratch, or Check if you already filled it out.'
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

  return (
    <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(380px,0.9fr)_minmax(460px,1.1fr)]">
      <FormControlPanel
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
        onSelectDemo={loadDemo}
        onUpload={uploadPdf}
        onPageChange={state.setCurrentPage}
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
