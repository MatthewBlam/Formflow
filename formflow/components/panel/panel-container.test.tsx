import { render, screen, fireEvent } from '@testing-library/react';
import { PanelContainer } from './panel-container';
import type { FormField, FormSchema } from '@/types';


const field: FormField = {
  id: 'f1',
  label: 'Date of Birth',
  type: 'date',
  required: true,
  page: 1,
  bbox: { x: 0, y: 0, width: 0.2, height: 0.05, page: 1 },
  whyAsking: 'Verify identity',
  exampleAnswer: 'Jan 1 1990',
};

const schema: FormSchema = {
  id: 's1',
  title: 'Test',
  sections: [{ id: 'sec1', title: 'Section 1', fields: [field] }],
  documentRequirements: [
    {
      id: 'doc1',
      title: 'Proof of Identity',
      plainExplanation: 'A government-issued ID.',
      examples: ["Driver's license"],
    },
  ],
};

const defaultProps = {
  schema,
  currentPage: 1,
  totalPages: 2,
  activeFieldId: null,
  fieldStatusMap: {},
  documentStatusMap: {},
  completionPercentage: 0,
  onSaveAnswer: vi.fn(),
  onSelectField: vi.fn(),
  onPageChange: vi.fn(),
  onSetDocumentStatus: vi.fn(),
};

describe('PanelContainer', () => {
  it('shows the progress bar', () => {
    render(<PanelContainer {...defaultProps} completionPercentage={33} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/33%/)).toBeInTheDocument();
  });

  it('defaults to the page guide', () => {
    render(<PanelContainer {...defaultProps} />);
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getAllByText('Date of Birth')).toHaveLength(2);
  });

  it('shows field guidance for the current page', () => {
    render(<PanelContainer {...defaultProps} activeFieldId={field.id} />);
    expect(screen.getByText('Verify identity')).toBeInTheDocument();
  });

  it('renders an answer box in the guide', () => {
    render(<PanelContainer {...defaultProps} activeFieldId={field.id} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSaveAnswer from the page guide', () => {
    const onSaveAnswer = vi.fn();
    render(<PanelContainer {...defaultProps} activeFieldId={field.id} onSaveAnswer={onSaveAnswer} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'my answer' } });
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }));
    expect(onSaveAnswer).toHaveBeenCalledWith('f1', 'my answer');
  });

  it('calls onSelectField when a guide item is clicked', () => {
    const onSelectField = vi.fn();
    render(<PanelContainer {...defaultProps} onSelectField={onSelectField} />);
    fireEvent.click(screen.getByRole('button', { name: /date of birth: needed/i }));
    expect(onSelectField).toHaveBeenCalledWith('f1');
  });

  it('calls onPageChange from the guide page controls', () => {
    const onPageChange = vi.fn();
    render(<PanelContainer {...defaultProps} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows a Documents tab', () => {
    render(<PanelContainer {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /documents/i })).toBeInTheDocument();
  });

  it('renders the document checklist when Documents tab is clicked', () => {
    render(<PanelContainer {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /documents/i }));
    expect(screen.getByText('Proof of Identity')).toBeInTheDocument();
  });

  it('calls onSetDocumentStatus when a doc status button is clicked', () => {
    const onSetDocumentStatus = vi.fn();
    render(<PanelContainer {...defaultProps} onSetDocumentStatus={onSetDocumentStatus} />);
    fireEvent.click(screen.getByRole('tab', { name: /documents/i }));
    fireEvent.click(screen.getByRole('button', { name: /mark as present/i }));
    expect(onSetDocumentStatus).toHaveBeenCalledWith('doc1', 'present');
  });
});
