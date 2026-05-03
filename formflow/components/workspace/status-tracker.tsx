'use client';

import { AlertTriangle, CheckCircle2, ClipboardList, FileText } from 'lucide-react';
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
  const metrics = [
    {
      label: 'Current section',
      value: currentSection?.title ?? 'Not started',
      icon: ClipboardList,
    },
    {
      label: 'Required left',
      value: `${remainingRequiredCount} field${remainingRequiredCount === 1 ? '' : 's'}`,
      icon: CheckCircle2,
    },
    {
      label: 'Documents',
      value: `${missingDocumentCount} needed`,
      icon: FileText,
    },
    {
      label: 'Checks',
      value: `${issueCount} issue${issueCount === 1 ? '' : 's'}`,
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="min-h-0 bg-secondary/20 p-4">
      <div className="rounded-xl bg-card p-4 shadow-sm shadow-foreground/5 ring-1 ring-border/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form status</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{completionPercentage}% complete</h2>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {remainingRequiredCount === 0 ? 'Ready to review' : 'In progress'}
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${completionPercentage}%` }}
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Form completion"
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Keep answering required fields in chat, then use Check My Responses for a consistency review.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl bg-card p-4 shadow-sm shadow-foreground/5 ring-1 ring-border/40"
          >
            <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
