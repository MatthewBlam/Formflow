'use client';

import { useState } from 'react';
import type { FormField } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface InterviewPanelProps {
  field: FormField;
  onSubmit: (fieldId: string, value: string) => void;
}

export function InterviewPanel({ field, onSubmit }: InterviewPanelProps) {
  const [value, setValue] = useState('');

  function handleSubmit() {
    if (!value.trim()) return;
    onSubmit(field.id, value.trim());
    setValue('');
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="text-sm font-medium text-foreground">
        {field.plainLanguageLabel ?? field.label}
      </label>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        rows={3}
      />
      <Button onClick={handleSubmit} size="sm">
        Save
      </Button>
    </div>
  );
}
