import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import TrustScoreCard from '../components/TrustScoreCard';

describe('TrustScoreCard Component Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const waitForAnimation = () => {
    act(() => {
      vi.advanceTimersByTime(1200);
    });
  };

  it('should render correct color and label for Score 8 (Highly Trustworthy / Green)', async () => {
    render(<TrustScoreCard score={8} reviewCount={150} />);
    waitForAnimation();

    expect(screen.getByText('8.0')).toBeInTheDocument();
    expect(screen.getByText('Highly Trustworthy')).toBeInTheDocument();
    expect(screen.getByText('Based on 150 reviews analyzed')).toBeInTheDocument();

    const scoreNum = screen.getByText('8.0');
    expect(scoreNum.style.color).toBe('rgb(34, 197, 94)'); // #22C55E
  });

  it('should render correct color and label for Score 7 (Trustworthy / Green)', async () => {
    render(<TrustScoreCard score={7} reviewCount={50} />);
    waitForAnimation();

    expect(screen.getByText('7.0')).toBeInTheDocument();
    expect(screen.getByText('Trustworthy')).toBeInTheDocument();
    
    const scoreNum = screen.getByText('7.0');
    expect(scoreNum.style.color).toBe('rgb(34, 197, 94)'); // #22C55E
  });

  it('should render correct color and label for Score 5 (Moderately Trustworthy / Yellow)', async () => {
    render(<TrustScoreCard score={5} reviewCount={10} />);
    waitForAnimation();

    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('Moderately Trustworthy')).toBeInTheDocument();

    const scoreNum = screen.getByText('5.0');
    expect(scoreNum.style.color).toBe('rgb(234, 179, 8)'); // #EAB308
  });

  it('should render correct color and label for Score 4 (Mixed / Yellow)', async () => {
    render(<TrustScoreCard score={4} reviewCount={25} />);
    waitForAnimation();

    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('Mixed')).toBeInTheDocument();

    const scoreNum = screen.getByText('4.0');
    expect(scoreNum.style.color).toBe('rgb(234, 179, 8)'); // #EAB308
  });

  it('should render correct color and label for Score 2 (Suspicious / Red)', async () => {
    render(<TrustScoreCard score={2} reviewCount={100} />);
    waitForAnimation();

    expect(screen.getByText('2.0')).toBeInTheDocument();
    expect(screen.getByText('Suspicious')).toBeInTheDocument();

    const scoreNum = screen.getByText('2.0');
    expect(scoreNum.style.color).toBe('rgb(239, 68, 68)'); // #EF4444
  });

  it('should render correct color and label for Score 1.5 (Highly Suspicious / Red)', async () => {
    render(<TrustScoreCard score={1.5} reviewCount={5} />);
    waitForAnimation();

    expect(screen.getByText('1.5')).toBeInTheDocument();
    expect(screen.getByText('Highly Suspicious')).toBeInTheDocument();

    const scoreNum = screen.getByText('1.5');
    expect(scoreNum.style.color).toBe('rgb(239, 68, 68)'); // #EF4444
  });

  it('should handle zero or missing score gracefully', async () => {
    render(<TrustScoreCard score={0} reviewCount={0} />);
    waitForAnimation();

    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Highly Suspicious')).toBeInTheDocument();
    expect(screen.getByText('Based on 0 reviews analyzed')).toBeInTheDocument();
  });
});
