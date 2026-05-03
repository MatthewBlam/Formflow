'use client';

import { ArrowUpRight, Play, FileText, Sparkles, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onTryDemo: () => void;
  onUploadClick: () => void;
}

const FEATURES = [
  { icon: FileText, label: 'Reads any government PDF' },
  { icon: Sparkles, label: 'AI-guided, field by field' },
  { icon: ShieldCheck, label: 'No account required' },
];

export function HeroSection({ onTryDemo, onUploadClick }: HeroSectionProps) {
  return (
    <div className="flex flex-col items-center gap-10 text-center w-full max-w-5xl">

      {/* Headline */}
      <div className="flex flex-col items-center gap-5">
        <h1
          className="max-w-4xl text-6xl font-normal tracking-tight text-foreground sm:text-7xl lg:text-8xl"
          style={{ fontFamily: 'var(--font-heading, serif)' }}
        >
          Fill government forms{' '}
          <span className="italic">with confidence</span>
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
          FormFlow reads your PDF, finds every field, and guides you through completion — step by step.
        </p>
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={onTryDemo}
          className="inline-flex h-13 items-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Try Demo Form
          <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/20">
            <ArrowUpRight className="size-3.5" />
          </span>
        </button>
        <button
          onClick={onUploadClick}
          className="inline-flex h-13 items-center gap-2 rounded-full border border-border bg-transparent px-8 text-base font-semibold text-foreground transition-all hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Upload a PDF
          <span className="flex size-6 items-center justify-center rounded-full border border-border">
            <Play className="size-3 fill-current" />
          </span>
        </button>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground"
          >
            <Icon className="size-3.5 text-primary" />
            {label}
          </div>
        ))}
      </div>


    </div>
  );
}
