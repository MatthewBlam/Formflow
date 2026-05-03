'use client';

import { Check, Loader2 } from 'lucide-react';

const STEPS = [
  {
    label: 'Reading your PDF',
    description: 'Scanning document structure and pages',
  },
  {
    label: 'Extracting form fields',
    description: 'Identifying every input, checkbox, and signature field',
  },
  {
    label: 'Preparing your guide',
    description: 'Building step-by-step instructions for each field',
  },
];

interface ProcessingStepsProps {
  currentStep: number;
}

export function ProcessingSteps({ currentStep }: ProcessingStepsProps) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      {STEPS.map((step, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div
            key={step.label}
            data-testid="processing-step"
            data-active={String(isActive)}
            data-complete={String(isComplete)}
            className={`flex items-start gap-5 rounded-2xl border p-5 transition-all duration-500 ${
              isActive
                ? 'border-primary/40 bg-primary/8 shadow-sm'
                : isComplete
                  ? 'border-border bg-secondary/40'
                  : 'border-border/50 bg-transparent opacity-40'
            }`}
          >
            <div
              className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                isComplete
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                    ? 'border-2 border-primary bg-transparent'
                    : 'border-2 border-border bg-transparent'
              }`}
            >
              {isComplete ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : isActive ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
              )}
            </div>

            <div className="flex flex-col gap-0.5">
              <span
                className={`text-base font-semibold transition-colors ${
                  isComplete || isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
              <span className="text-sm text-muted-foreground">{step.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
