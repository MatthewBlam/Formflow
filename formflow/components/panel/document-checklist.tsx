'use client';

import type { DocumentRequirement } from '@/types';

interface DocumentChecklistProps {
  docs: DocumentRequirement[];
  documentStatusMap: Record<string, 'needed' | 'present'>;
  onSetDocumentStatus: (docId: string, status: 'needed' | 'present') => void;
}

export function DocumentChecklist({ docs, documentStatusMap, onSetDocumentStatus }: DocumentChecklistProps) {
  if (docs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4 text-center">
        No documents required.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto">
      {docs.map((doc) => {
        const status = documentStatusMap[doc.id] ?? 'needed';
        const isPresent = status === 'present';
        return (
          <div key={doc.id} className="rounded-lg border p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className={`text-sm font-semibold ${isPresent ? 'text-green-600 line-through' : 'text-foreground'}`}>
                  {doc.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{doc.plainExplanation}</p>
                {doc.examples.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {doc.examples.map((ex) => (
                      <li key={ex} className="text-xs bg-muted rounded px-1.5 py-0.5">{ex}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSetDocumentStatus(doc.id, isPresent ? 'needed' : 'present')}
                className={`shrink-0 text-xs rounded px-2 py-1 border transition-colors ${
                  isPresent
                    ? 'border-green-500 text-green-600 hover:bg-green-50'
                    : 'border-muted-foreground text-muted-foreground hover:bg-accent'
                }`}
              >
                {isPresent ? 'Mark as needed' : 'Mark as present'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
