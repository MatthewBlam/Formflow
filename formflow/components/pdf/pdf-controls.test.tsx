import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { PdfControls } from '@/components/pdf/pdf-controls';

describe('PdfControls', () => {
  test('shows current page and total pages', () => {
    render(<PdfControls currentPage={2} totalPages={5} onPrevPage={() => {}} onNextPage={() => {}} />);
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  test('disables prev button on page 1', () => {
    render(<PdfControls currentPage={1} totalPages={5} onPrevPage={() => {}} onNextPage={() => {}} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  test('enables prev button when not on page 1', () => {
    render(<PdfControls currentPage={2} totalPages={5} onPrevPage={() => {}} onNextPage={() => {}} />);
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
  });

  test('disables next button on last page', () => {
    render(<PdfControls currentPage={5} totalPages={5} onPrevPage={() => {}} onNextPage={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('enables next button when not on last page', () => {
    render(<PdfControls currentPage={3} totalPages={5} onPrevPage={() => {}} onNextPage={() => {}} />);
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  test('calls onPrevPage when prev button clicked', () => {
    const onPrevPage = vi.fn();
    render(<PdfControls currentPage={2} totalPages={5} onPrevPage={onPrevPage} onNextPage={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPrevPage).toHaveBeenCalledTimes(1);
  });

  test('calls onNextPage when next button clicked', () => {
    const onNextPage = vi.fn();
    render(<PdfControls currentPage={2} totalPages={5} onPrevPage={() => {}} onNextPage={onNextPage} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onNextPage).toHaveBeenCalledTimes(1);
  });
});
