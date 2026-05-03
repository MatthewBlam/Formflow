'use client';

import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';

interface FormProgressBarProps {
  percentage: number;
}

export function FormProgressBar({ percentage }: FormProgressBarProps) {
  return (
    <div className="px-4 py-3 border-b">
      <Progress value={percentage}>
        <ProgressLabel>Progress</ProgressLabel>
        <ProgressValue>{() => `${percentage}%`}</ProgressValue>
      </Progress>
    </div>
  );
}
