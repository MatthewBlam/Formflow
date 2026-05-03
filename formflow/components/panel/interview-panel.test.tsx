import { render, screen, fireEvent } from '@testing-library/react';
import { InterviewPanel } from './interview-panel';
import type { FormField } from '@/types';

const field: FormField = {
  id: 'f1',
  label: 'Date of Birth',
  type: 'date',
  required: true,
  page: 1,
  bbox: { x: 0, y: 0, width: 0.2, height: 0.05, page: 1 },
};

describe('InterviewPanel', () => {
  it('renders a text input for the field', () => {
    render(<InterviewPanel field={field} onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSubmit with the entered value when form is submitted', () => {
    const onSubmit = vi.fn();
    render(<InterviewPanel field={field} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'January 1, 1990' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).toHaveBeenCalledWith('f1', 'January 1, 1990');
  });

  it('clears the input after submit', () => {
    render(<InterviewPanel field={field} onSubmit={vi.fn()} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'some value' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(input).toHaveValue('');
  });

  it('does not call onSubmit when input is empty', () => {
    const onSubmit = vi.fn();
    render(<InterviewPanel field={field} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders the field label as a prompt', () => {
    render(<InterviewPanel field={field} onSubmit={vi.fn()} />);
    expect(screen.getByText(/date of birth/i)).toBeInTheDocument();
  });
});
