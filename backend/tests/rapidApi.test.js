const axios = require('axios');
const { createRapidApiClient, requestWithRetry } = require('../services/clients/rapidApi');

jest.mock('axios');

describe('RapidAPI HTTP Client Unit Tests', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance = jest.fn();
    mockAxiosInstance.interceptors = {
      request: { use: jest.fn() }
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully create client and register interceptor', () => {
    const host = 'test.rapidapi.com';
    const client = createRapidApiClient(host);
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: `https://${host}`,
      timeout: 10000
    }));
    expect(client.interceptors.request.use).toHaveBeenCalled();
  });

  it('should resolve on successful request', async () => {
    const mockResponse = { status: 200, data: { ok: true } };
    mockAxiosInstance.mockResolvedValueOnce(mockResponse);

    const res = await requestWithRetry(mockAxiosInstance, { url: '/test' });
    expect(res).toEqual(mockResponse);
    expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
  });

  it('should retry on HTTP 429 and succeed on retry', async () => {
    const error429 = new Error('Too Many Requests');
    error429.response = { status: 429 };

    const mockResponse = { status: 200, data: { ok: true } };

    mockAxiosInstance
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce(mockResponse);

    const res = await requestWithRetry(mockAxiosInstance, { url: '/test' }, 2);
    expect(res).toEqual(mockResponse);
    expect(mockAxiosInstance).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('should retry on HTTP 500 and throw error after exhausting retries', async () => {
    const error500 = new Error('Internal Server Error');
    error500.response = { status: 500 };

    mockAxiosInstance.mockRejectedValue(error500);

    await expect(requestWithRetry(mockAxiosInstance, { url: '/test' }, 2))
      .rejects.toThrow('Internal Server Error');
    expect(mockAxiosInstance).toHaveBeenCalledTimes(3); // 1 initial request + 2 retries
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 2000);
    expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 4000);
  });

  it('should throw immediately without retrying on non-retryable status (e.g. 404)', async () => {
    const error404 = new Error('Not Found');
    error404.response = { status: 404 };

    mockAxiosInstance.mockRejectedValueOnce(error404);

    await expect(requestWithRetry(mockAxiosInstance, { url: '/test' }))
      .rejects.toThrow('Not Found');
    expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
  });

  it('should throw immediately without retrying on network timeout (status undefined)', async () => {
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';

    mockAxiosInstance.mockRejectedValueOnce(timeoutError);

    await expect(requestWithRetry(mockAxiosInstance, { url: '/test' }))
      .rejects.toThrow('timeout of 10000ms exceeded');
    expect(mockAxiosInstance).toHaveBeenCalledTimes(1);
  });
});
