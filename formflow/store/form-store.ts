import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AssistantMode, ChatMessage, FormFlowState, FormSchema, Issue, UploadKind } from '@/types';
import { APP_CONFIG } from '@/lib/constants';

type ExtractionStatus = 'idle' | 'processing' | 'complete' | 'error';

interface StoreState extends FormFlowState {
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  pdfUrl: string | null;
  setExtractionStatus: (status: ExtractionStatus, error?: string) => void;
  setPdfUrl: (url: string | null) => void;
}

const initialState = {
  formSchema: null,
  extractionStatus: 'idle' as const,
  extractionError: null,
  pdfUrl: null,
  applicationProfile: {},
  documentStatusMap: {},
  language: 'en' as const,
  currentPage: 1,
  activePanelView: null,
  activeFieldId: null,
  activeMode: 'walkthrough' as const,
  selectedDemoFormId: null,
  uploadKind: 'unknown' as const,
  uploadKindConfidence: 0,
  chatMessages: [],
  currentFieldId: null,
  checkIssues: [],
};

export const useFormStore = create<StoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setLanguage: (lang) => set({ language: lang }),
      setActiveFieldId: (id) => set({ activeFieldId: id }),
      setCurrentFieldId: (id) => set({ currentFieldId: id, activeFieldId: id }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setActivePanelView: (view) => set({ activePanelView: view }),
      setActiveMode: (mode: AssistantMode) => set({ activeMode: mode }),
      setSelectedDemoFormId: (id: string | null) => set({ selectedDemoFormId: id }),
      setUploadKind: (kind: UploadKind, confidence = 0) =>
        set({ uploadKind: kind, uploadKindConfidence: confidence }),
      addChatMessage: (message: ChatMessage) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      setChatMessages: (messages: ChatMessage[]) => set({ chatMessages: messages }),
      setCheckIssues: (issues: Issue[]) => set({ checkIssues: issues }),
      updateProfileEntry: (fieldId, entry) =>
        set((state) => ({
          applicationProfile: { ...state.applicationProfile, [fieldId]: entry },
        })),
      setDocumentStatus: (docId, status) =>
        set((state) => ({
          documentStatusMap: { ...state.documentStatusMap, [docId]: status },
        })),
      setFormSchema: (schema: FormSchema | null) => set({ formSchema: schema }),
      setExtractionStatus: (status, error) =>
        set({ extractionStatus: status, extractionError: error ?? null }),
      setPdfUrl: (url) => set({ pdfUrl: url }),
      resetSession: () => set({ ...initialState }),
    }),
    {
      name: APP_CONFIG.storageKey,
      version: APP_CONFIG.storeVersion,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { extractionStatus, extractionError, ...persisted } = state;
        return persisted;
      },
    }
  )
);
