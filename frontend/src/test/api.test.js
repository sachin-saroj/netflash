import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from '../services/api';

describe('Axios Interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should attach Authorization header if token exists', async () => {
    localStorage.setItem('token', 'valid-test-token');
    
    const mockAdapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
    api.defaults.adapter = mockAdapter;

    await api.get('/dummy');
    
    expect(mockAdapter).toHaveBeenCalled();
    const config = mockAdapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBe('Bearer valid-test-token');
  });

  it('should NOT attach Authorization header if token is absent', async () => {
    const mockAdapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
    api.defaults.adapter = mockAdapter;

    await api.get('/dummy');
    
    expect(mockAdapter).toHaveBeenCalled();
    const config = mockAdapter.mock.calls[0][0];
    expect(config.headers.Authorization).toBeUndefined();
  });
});
