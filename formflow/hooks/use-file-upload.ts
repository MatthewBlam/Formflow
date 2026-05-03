'use client';

import { useState } from 'react';
import { APP_CONFIG } from '@/lib/constants';

interface FileUploadState {
  file: File | null;
  error: string | null;
  validate: (f: File) => void;
  reset: () => void;
}

export function useFileUpload(): FileUploadState {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate(f: File) {
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      setFile(null);
      return;
    }
    if (f.size > APP_CONFIG.maxFileSizeMB * 1024 * 1024) {
      setError(`File must be under ${APP_CONFIG.maxFileSizeMB} MB.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  }

  function reset() {
    setFile(null);
    setError(null);
  }

  return { file, error, validate, reset };
}
