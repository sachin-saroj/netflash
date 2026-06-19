import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import { api } from '../services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Dashboard Component Tests', () => {
  const mockUser = { id: 'user-a', name: 'Test User', email: 'test@example.com' };
  const mockWatchlistItems = [
    {
      _id: 'item-1',
      productId: 'p1',
      platform: 'amazon',
      title: 'Amazon Product Test',
      image: 'http://amazon.jpg',
      savedPrice: 1200,
      url: 'http://amazon.in/dp/p1'
    },
    {
      _id: 'item-2',
      productId: 'p2',
      platform: 'flipkart',
      title: 'Flipkart Product Test',
      image: 'http://flipkart.jpg',
      savedPrice: 800,
      url: 'http://flipkart.com/p/p2'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should display the loading spinner on mount', () => {
    // API call remains pending
    api.get.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Dashboard user={mockUser} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading Watchlist.../i)).toBeInTheDocument();
  });

  it('should redirect to home if no user and no token exist', () => {
    render(
      <MemoryRouter>
        <Dashboard user={null} />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should render empty watchlist state correctly', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [] } });

    render(
      <MemoryRouter>
        <Dashboard user={mockUser} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Your watchlist is empty/i)).toBeInTheDocument();
    });
  });

  it('should render saved watchlist items', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: mockWatchlistItems } });

    render(
      <MemoryRouter>
        <Dashboard user={mockUser} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Amazon Product Test')).toBeInTheDocument();
      expect(screen.getByText('Flipkart Product Test')).toBeInTheDocument();
      expect(screen.getByText('₹1,200')).toBeInTheDocument();
      expect(screen.getByText('₹800')).toBeInTheDocument();
    });
  });

  it('should remove product card on successful delete action', async () => {
    api.get.mockResolvedValue({ data: { success: true, data: mockWatchlistItems } });
    api.delete.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <Dashboard user={mockUser} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Amazon Product Test')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]); // Delete first item (item-1)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/watchlist/item-1');
      expect(screen.queryByText('Amazon Product Test')).toBeNull();
      expect(screen.getByText('Flipkart Product Test')).toBeInTheDocument();
    });
  });

  it('should keep card and handle errors gracefully on failed delete action', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockResolvedValue({ data: { success: true, data: mockWatchlistItems } });
    api.delete.mockRejectedValue(new Error('Delete request failed'));

    render(
      <MemoryRouter>
        <Dashboard user={mockUser} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Amazon Product Test')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/watchlist/item-1');
      expect(screen.getByText('Amazon Product Test')).toBeInTheDocument(); // still there
      expect(consoleSpy).toHaveBeenCalledWith('Failed to remove item');
    });

    consoleSpy.mockRestore();
  });
});
