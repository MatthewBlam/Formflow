'use client';

interface HeroSectionProps {
  onTryDemo: () => void;
  onUploadClick: () => void;
}

export function HeroSection({ onTryDemo, onUploadClick }: HeroSectionProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Fill government forms with confidence
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        FormFlow reads your PDF, finds every field, and helps you complete it — step by step.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onTryDemo}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try Demo Form
        </button>
        <button
          onClick={onUploadClick}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Upload a PDF
        </button>
      </div>
      <p className="max-w-md text-xs text-muted-foreground">
        Your progress is saved only in this browser. When AI help is used, selected form text or
        answers may be sent for AI processing. No account required.
      </p>
    </div>
  );
}
