import { render, screen } from '@testing-library/react';
import { FieldExplainer } from './field-explainer';
import type { FormField } from '@/types';

const field: FormField = {
  id: 'f1',
  label: 'Date of Birth',
  plainLanguageLabel: 'Your birthday',
  type: 'date',
  required: true,
  page: 1,
  bbox: { x: 0, y: 0, width: 0.2, height: 0.05, page: 1 },
  whyAsking: 'Used to verify your identity',
  exampleAnswer: 'January 1, 1990',
};

describe('FieldExplainer', () => {
  it('renders the plain language label when available', () => {
    render(<FieldExplainer field={field} />);
    expect(screen.getByText('Your birthday')).toBeInTheDocument();
  });

  it('falls back to label when no plainLanguageLabel', () => {
    render(<FieldExplainer field={{ ...field, plainLanguageLabel: undefined }} />);
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
  });

  it('renders whyAsking text', () => {
    render(<FieldExplainer field={field} />);
    expect(screen.getByText('Used to verify your identity')).toBeInTheDocument();
  });

  it('renders the example answer', () => {
    render(<FieldExplainer field={field} />);
    expect(screen.getByText('January 1, 1990')).toBeInTheDocument();
  });

  it('renders nothing when field is null', () => {
    const { container } = render(<FieldExplainer field={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
