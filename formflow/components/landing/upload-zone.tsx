'use client';

import { useRef, useState } from 'react';
import { useFileUpload } from '@/hooks/use-file-upload';

interface UploadZoneProps {
  onFile: (file: File) => void;
}

export function UploadZone({ onFile }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const { error, validate } = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    validate(file);
    if (file.type === 'application/pdf' && file.size <= 20 * 1024 * 1024) {
      onFile(file);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <div
        data-testid="upload-zone"
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
      >
        <p className="text-sm text-muted-foreground">Drag &amp; drop or click to upload a PDF</p>
        <p className="text-xs text-muted-foreground">Max 20 MB</p>
      </div>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
