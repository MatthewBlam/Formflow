'use client';

import { AlertTriangle, CheckCircle2, ClipboardList, FileText } from 'lucide-react';
import { FormProgressBar } from '@/components/panel/progress-bar';
import type { FormSection } from '@/types';

interface StatusTrackerProps {
  completionPercentage: number;
  currentSection: FormSection | null;
  remainingRequiredCount: number;
  missingDocumentCount: number;
  issueCount: number;
}

export function StatusTracker({
  completionPercentage,
  currentSection,
  remainingRequiredCount,
  missingDocumentCount,
  issueCount,
}: StatusTrackerProps) {
  return (
    <section className="border-b">
      <FormProgressBar percentage={completionPercentage} />
      <div className="grid grid-cols-2 gap-2 p-4">
        <div className="rounded-md border p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            Section
          </div>
          <p className="text-sm font-medium text-foreground">{currentSection?.title ?? 'Not started'}</p>
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Remaining
          </div>
          <p className="text-sm font-medium text-foreground">{remainingRequiredCount} required</p>
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <FileText className="h-4 w-4" />
            Documents
          </div>
          <p className="text-sm font-medium text-foreground">{missingDocumentCount} needed</p>
        </div>
        <div className="rounded-md border p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Checks
          </div>
          <p className="text-sm font-medium text-foreground">{issueCount} issue{issueCount === 1 ? '' : 's'}</p>
        </div>
      </div>
    </section>
  );
}
