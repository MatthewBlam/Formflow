import { render, screen } from '@testing-library/react';
import { FormProgressBar } from './progress-bar';

describe('FormProgressBar', () => {
  it('displays the percentage as text', () => {
    render(<FormProgressBar percentage={42} />);
    expect(screen.getByText(/42%/)).toBeInTheDocument();
  });

  it('displays 0% when no fields complete', () => {
    render(<FormProgressBar percentage={0} />);
    expect(screen.getByText(/0%/)).toBeInTheDocument();
  });

  it('displays 100% when all fields complete', () => {
    render(<FormProgressBar percentage={100} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('renders a progress indicator element', () => {
    render(<FormProgressBar percentage={60} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
