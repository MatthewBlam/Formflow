import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentChecklist } from './document-checklist';
import type { DocumentRequirement } from '@/types';

const docs: DocumentRequirement[] = [
  {
    id: 'doc1',
    title: 'Proof of Identity',
    plainExplanation: 'A government-issued ID to verify who you are.',
    examples: ["Driver's license", 'Passport'],
  },
  {
    id: 'doc2',
    title: 'Proof of Income',
    plainExplanation: 'Documents showing how much money you earn.',
    examples: ['Pay stubs', 'Tax return'],
  },
];

describe('DocumentChecklist', () => {
  it('renders document titles', () => {
    render(
      <DocumentChecklist docs={docs} documentStatusMap={{}} onSetDocumentStatus={vi.fn()} />
    );
    expect(screen.getByText('Proof of Identity')).toBeInTheDocument();
    expect(screen.getByText('Proof of Income')).toBeInTheDocument();
  });

  it('renders plain explanation for each document', () => {
    render(
      <DocumentChecklist docs={docs} documentStatusMap={{}} onSetDocumentStatus={vi.fn()} />
    );
    expect(screen.getByText('A government-issued ID to verify who you are.')).toBeInTheDocument();
  });

  it('renders examples for each document', () => {
    render(
      <DocumentChecklist docs={docs} documentStatusMap={{}} onSetDocumentStatus={vi.fn()} />
    );
    expect(screen.getByText("Driver's license")).toBeInTheDocument();
    expect(screen.getByText('Passport')).toBeInTheDocument();
  });

  it('shows needed status by default when doc not in map', () => {
    render(
      <DocumentChecklist docs={docs} documentStatusMap={{}} onSetDocumentStatus={vi.fn()} />
    );
    const buttons = screen.getAllByRole('button', { name: /mark as (present|needed)/i });
    expect(buttons[0]).toHaveTextContent(/mark as present/i);
  });

  it('shows present status when doc is marked present', () => {
    render(
      <DocumentChecklist
        docs={docs}
        documentStatusMap={{ doc1: 'present' }}
        onSetDocumentStatus={vi.fn()}
      />
    );
    const doc1Button = screen.getByRole('button', { name: /mark as needed/i });
    expect(doc1Button).toBeInTheDocument();
  });

  it('calls onSetDocumentStatus with present when user marks a doc present', () => {
    const onSetDocumentStatus = vi.fn();
    render(
      <DocumentChecklist
        docs={docs}
        documentStatusMap={{}}
        onSetDocumentStatus={onSetDocumentStatus}
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: /mark as present/i })[0]);
    expect(onSetDocumentStatus).toHaveBeenCalledWith('doc1', 'present');
  });

  it('calls onSetDocumentStatus with needed when user unmarks a present doc', () => {
    const onSetDocumentStatus = vi.fn();
    render(
      <DocumentChecklist
        docs={docs}
        documentStatusMap={{ doc1: 'present' }}
        onSetDocumentStatus={onSetDocumentStatus}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /mark as needed/i }));
    expect(onSetDocumentStatus).toHaveBeenCalledWith('doc1', 'needed');
  });

  it('shows an empty state when no documents are provided', () => {
    render(
      <DocumentChecklist docs={[]} documentStatusMap={{}} onSetDocumentStatus={vi.fn()} />
    );
    expect(screen.getByText(/no documents required/i)).toBeInTheDocument();
  });
});
