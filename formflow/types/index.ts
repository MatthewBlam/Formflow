export type FieldType = 'text' | 'date' | 'number' | 'checkbox' | 'select';

export type FieldStatus = 'missing' | 'complete' | 'needs_confirmation' | 'inferred' | 'conflicting';

export type AnswerSource = 'interview' | 'inferred' | 'imported';

export type AssistantMode = 'walkthrough' | 'qa' | 'check';

export type UploadKind = 'blank' | 'filled' | 'unknown';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface FormField {
  id: string;
  label: string;
  plainLanguageLabel?: string;
  type: FieldType;
  required: boolean;
  page: number;
  bbox: BoundingBox;
  whyAsking?: string;
  exampleAnswer?: string;
  options?: string[];
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

export interface DocumentRequirement {
  id: string;
  title: string;
  plainExplanation: string;
  examples: string[];
}

export interface FormSchema {
  id: string;
  title: string;
  sections: FormSection[];
  documentRequirements?: DocumentRequirement[];
}

export interface ProfileEntry {
  fieldId: string;
  value: string;
  status: FieldStatus;
  source: AnswerSource;
  confidence?: number;
}

export interface Issue {
  id: string;
  type: string;
  fieldIds: string[];
  message: string;
  suggestion: string;
  severity?: 'info' | 'warning' | 'error';
}

export interface ExplainerContent {
  fieldId: string;
  meaning: string;
  whyAsked: string;
  exampleAnswer: string;
  documentsNeeded: string[];
  commonMistake: string;
}

export interface FormFlowState {
  formSchema: FormSchema | null;
  applicationProfile: Record<string, ProfileEntry>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
  language: 'en' | 'es';
  currentPage: number;
  activePanelView: 'explainer' | 'interview' | 'checklist' | 'review' | null;
  activeFieldId: string | null;
  activeMode: AssistantMode;
  selectedDemoFormId: string | null;
  uploadKind: UploadKind;
  uploadKindConfidence: number;
  chatMessages: ChatMessage[];
  currentFieldId: string | null;
  checkIssues: Issue[];
  setLanguage: (lang: 'en' | 'es') => void;
  setActiveFieldId: (id: string | null) => void;
  setCurrentFieldId: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setActivePanelView: (view: 'explainer' | 'interview' | 'checklist' | 'review' | null) => void;
  setActiveMode: (mode: AssistantMode) => void;
  setSelectedDemoFormId: (id: string | null) => void;
  setUploadKind: (kind: UploadKind, confidence?: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  setCheckIssues: (issues: Issue[]) => void;
  updateProfileEntry: (fieldId: string, entry: ProfileEntry) => void;
  setDocumentStatus: (docId: string, status: 'needed' | 'present') => void;
  setFormSchema: (schema: FormSchema | null) => void;
  resetSession: () => void;
}
