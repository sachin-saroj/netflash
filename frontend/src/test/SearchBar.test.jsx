import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import SearchBar from '../components/SearchBar';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('SearchBar Component Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search input and submit button', () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Paste Amazon, Flipkart, or Meesho product link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Analyze/i })).toBeInTheDocument();
  });

  it('should block empty form submission and show validation error', () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(button);

    expect(screen.getByText('Please paste a product link')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should block unsupported domain submission and show validation error', () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Paste Amazon, Flipkart, or Meesho product link/i);
    fireEvent.change(input, { target: { value: 'https://google.com/search' } });

    const button = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(button);

    expect(screen.getByText('Please paste an Amazon, Flipkart, or Meesho product link')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should successfully submit form and navigate with valid Amazon URL', () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Paste Amazon, Flipkart, or Meesho product link/i);
    fireEvent.change(input, { target: { value: 'https://www.amazon.in/dp/B07WHSY9JQ' } });

    const button = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(button);

    expect(screen.queryByText(/Please paste/i)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith(`/results?url=${encodeURIComponent('https://www.amazon.in/dp/B07WHSY9JQ')}`);
  });

  it('should successfully submit form and navigate with valid Meesho URL', () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Paste Amazon, Flipkart, or Meesho product link/i);
    fireEvent.change(input, { target: { value: 'https://www.meesho.com/sarees/p/9cejj4' } });

    const button = screen.getByRole('button', { name: /Analyze/i });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledWith(`/results?url=${encodeURIComponent('https://www.meesho.com/sarees/p/9cejj4')}`);
  });
});
