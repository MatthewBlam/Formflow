import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from './upload-zone';

const makePdf = () => new File(['pdf'], 'form.pdf', { type: 'application/pdf' });
const makeTxt = () => new File(['txt'], 'form.txt', { type: 'text/plain' });

describe('UploadZone', () => {
  it('renders upload prompt text', () => {
    render(<UploadZone onFile={vi.fn()} />);
    expect(screen.getByText(/drag.*drop|click.*upload/i)).toBeInTheDocument();
  });

  it('calls onFile with a valid PDF when dropped', () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} />);
    const zone = screen.getByTestId('upload-zone');
    fireEvent.drop(zone, {
      dataTransfer: { files: [makePdf()], types: ['Files'] },
    });
    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'form.pdf' }));
  });

  it('shows an error and does not call onFile when a non-PDF is dropped', () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} />);
    const zone = screen.getByTestId('upload-zone');
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeTxt()], types: ['Files'] },
    });
    expect(onFile).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onFile when a valid PDF is selected via file input', () => {
    const onFile = vi.fn();
    render(<UploadZone onFile={onFile} />);
    const input = screen.getByTestId('file-input');
    Object.defineProperty(input, 'files', { value: [makePdf()], configurable: true });
    fireEvent.change(input);
    expect(onFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'form.pdf' }));
  });
});
