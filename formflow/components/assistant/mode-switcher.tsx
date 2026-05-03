'use client';

import { CheckCircle2, HelpCircle, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AssistantMode } from '@/types';

const MODES: Array<{ value: AssistantMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'walkthrough', label: 'Walkthrough', icon: ListChecks },
  { value: 'qa', label: 'Q&A', icon: HelpCircle },
  { value: 'check', label: 'Check', icon: CheckCircle2 },
];

interface ModeSwitcherProps {
  activeMode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
}

export function ModeSwitcher({ activeMode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Assistant mode">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <Button
            key={mode.value}
            type="button"
            variant={activeMode === mode.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onModeChange(mode.value)}
            className="rounded-md"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
