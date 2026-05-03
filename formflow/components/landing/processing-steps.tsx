'use client';

const STEPS = [
  { label: 'Reading your PDF' },
  { label: 'Extracting form fields' },
  { label: 'Preparing your form' },
];

interface ProcessingStepsProps {
  currentStep: number;
}

export function ProcessingSteps({ currentStep }: ProcessingStepsProps) {
  return (
    <ol className="flex flex-col gap-3">
      {STEPS.map((step, i) => {
        const isComplete = i < currentStep;
        const isActive = i === currentStep;
        return (
          <li
            key={step.label}
            data-testid="processing-step"
            data-active={String(isActive)}
            data-complete={String(isComplete)}
            className={`flex items-center gap-3 text-sm ${
              isComplete
                ? 'text-primary'
                : isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">
              {isComplete ? '✓' : i + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
