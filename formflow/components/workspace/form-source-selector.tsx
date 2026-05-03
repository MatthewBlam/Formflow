'use client';

import * as React from 'react';
import { FileUp, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoForms } from '@/lib/forms/registry';

interface FormSourceSelectorProps {
  selectedDemoFormId: string | null;
  uploadKindLabel: string;
  processing: boolean;
  onSelectDemo: (id: string) => void;
  onUpload: (file: File) => void;
}

export function FormSourceSelector({
  selectedDemoFormId,
  uploadKindLabel,
  processing,
  onSelectDemo,
  onUpload,
}: FormSourceSelectorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <section className="border-b p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Form source</p>
          <h2 className="text-lg font-semibold text-foreground">Choose a form</h2>
        </div>
        <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{uploadKindLabel}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {demoForms.map((form) => (
          <Button
            key={form.id}
            type="button"
            variant={selectedDemoFormId === form.id ? 'default' : 'outline'}
            onClick={() => onSelectDemo(form.id)}
            disabled={processing}
            className="h-auto justify-start rounded-md px-3 py-2 text-left"
          >
            <PlayCircle className="h-4 w-4" />
            <span>{form.title}</span>
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          className="h-auto justify-start rounded-md px-3 py-2"
        >
          <FileUp className="h-4 w-4" />
          <span>{processing ? 'Processing upload...' : 'Upload PDF'}</span>
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.currentTarget.value = '';
        }}
      />
    </section>
  );
}
