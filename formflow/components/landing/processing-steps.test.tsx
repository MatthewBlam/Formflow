import { render, screen } from '@testing-library/react';
import { ProcessingSteps } from './processing-steps';

describe('ProcessingSteps', () => {
  it('renders all 3 step labels', () => {
    render(<ProcessingSteps currentStep={0} />);
    expect(screen.getByText(/reading/i)).toBeInTheDocument();
    expect(screen.getByText(/extracting/i)).toBeInTheDocument();
    expect(screen.getByText(/preparing/i)).toBeInTheDocument();
  });

  it('marks the current step as active', () => {
    render(<ProcessingSteps currentStep={1} />);
    const steps = screen.getAllByTestId('processing-step');
    expect(steps[1]).toHaveAttribute('data-active', 'true');
  });

  it('marks steps before current step as complete', () => {
    render(<ProcessingSteps currentStep={2} />);
    const steps = screen.getAllByTestId('processing-step');
    expect(steps[0]).toHaveAttribute('data-complete', 'true');
    expect(steps[1]).toHaveAttribute('data-complete', 'true');
  });

  it('marks steps after current step as pending', () => {
    render(<ProcessingSteps currentStep={0} />);
    const steps = screen.getAllByTestId('processing-step');
    expect(steps[1]).toHaveAttribute('data-complete', 'false');
    expect(steps[2]).toHaveAttribute('data-complete', 'false');
  });
});
