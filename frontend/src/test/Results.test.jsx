import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Results from '../pages/Results';
import { analyzeProduct, getPrice, getYoutube } from '../services/api';

vi.mock('../services/api', () => ({
  analyzeProduct: vi.fn(),
  getPrice: vi.fn(),
  getYoutube: vi.fn(),
  api: {
    post: vi.fn()
  }
}));

describe('Results Page Component tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProductData = {
    product: {
      id: 'B07WHSY9JQ',
      platform: 'amazon',
      title: 'boAt Rockerz 450 headphones',
      image: '',
      rating: 4.1,
      reviewCount: 100,
      currentPrice: 1299,
      priceHistory: []
    }
  };

  it('should display the warning banner when demoMode is active', async () => {
    analyzeProduct.mockResolvedValue({
      data: {
        ...mockProductData,
        analysis: {
          trustScore: 6.8,
          reviewsAnalyzed: 15,
          genuinePercent: 60,
          suspiciousPercent: 40,
          incentivizedPercent: 0,
          demoMode: true,
          source: 'mock',
          verdict: 'Mock Verdict'
        }
      }
    });

    getPrice.mockResolvedValue({ data: { prices: [] } });
    getYoutube.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter initialEntries={['/results?url=https://www.amazon.in/dp/B07WHSY9JQ']}>
        <Results user={null} onLoginClick={vi.fn()} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('boAt Rockerz 450 headphones')).toBeInTheDocument();
    });

    const warningBanner = screen.getByText(/Demo Mode Active/i);
    expect(warningBanner).toBeInTheDocument();
    expect(screen.getByText(/Live AI analysis is currently unavailable/i)).toBeInTheDocument();
  });

  it('should NOT display the warning banner when demoMode is false', async () => {
    analyzeProduct.mockResolvedValue({
      data: {
        ...mockProductData,
        analysis: {
          trustScore: 8.5,
          reviewsAnalyzed: 50,
          genuinePercent: 90,
          suspiciousPercent: 10,
          incentivizedPercent: 0,
          demoMode: false,
          source: 'live',
          verdict: 'Buy verdict'
        }
      }
    });

    getPrice.mockResolvedValue({ data: { prices: [] } });
    getYoutube.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter initialEntries={['/results?url=https://www.amazon.in/dp/B07WHSY9JQ']}>
        <Results user={null} onLoginClick={vi.fn()} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('boAt Rockerz 450 headphones')).toBeInTheDocument();
    });

    const warningBanner = screen.queryByText(/Demo Mode Active/i);
    expect(warningBanner).toBeNull();
  });
});
