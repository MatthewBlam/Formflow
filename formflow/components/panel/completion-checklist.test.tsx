import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionChecklist } from './completion-checklist';
import type { FormSchema, FieldStatus } from '@/types';

const schema: FormSchema = {
  id: 's1',
  title: 'Test Form',
  sections: [
    {
      id: 'sec1',
      title: 'Personal Info',
      fields: [
        { id: 'f1', label: 'First Name', type: 'text', required: true, page: 1, bbox: { x: 0, y: 0, width: 0.1, height: 0.02, page: 1 } },
        { id: 'f2', label: 'Last Name', type: 'text', required: true, page: 1, bbox: { x: 0, y: 0, width: 0.1, height: 0.02, page: 1 } },
        { id: 'f3', label: 'Nickname', type: 'text', required: false, page: 1, bbox: { x: 0, y: 0, width: 0.1, height: 0.02, page: 1 } },
      ],
    },
    {
      id: 'sec2',
      title: 'Address',
      fields: [
        { id: 'f4', label: 'Street', type: 'text', required: true, page: 2, bbox: { x: 0, y: 0, width: 0.1, height: 0.02, page: 2 } },
      ],
    },
  ],
};

const statusMap: Record<string, FieldStatus> = {
  f1: 'complete',
  f2: 'missing',
  f4: 'missing',
};

describe('CompletionChecklist', () => {
  it('renders section headings', () => {
    render(<CompletionChecklist schema={schema} fieldStatusMap={statusMap} onSelectField={vi.fn()} />);
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
  });

  it('renders only required fields', () => {
    render(<CompletionChecklist schema={schema} fieldStatusMap={statusMap} onSelectField={vi.fn()} />);
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Street')).toBeInTheDocument();
    expect(screen.queryByText('Nickname')).not.toBeInTheDocument();
  });

  it('calls onSelectField with the field id when a row is clicked', () => {
    const onSelectField = vi.fn();
    render(<CompletionChecklist schema={schema} fieldStatusMap={statusMap} onSelectField={onSelectField} />);
    fireEvent.click(screen.getByText('Last Name'));
    expect(onSelectField).toHaveBeenCalledWith('f2');
  });

  it('shows a completion indicator for complete fields', () => {
    render(<CompletionChecklist schema={schema} fieldStatusMap={statusMap} onSelectField={vi.fn()} />);
    const firstNameRow = screen.getByText('First Name').closest('[data-status]');
    expect(firstNameRow).toHaveAttribute('data-status', 'complete');
  });
});
