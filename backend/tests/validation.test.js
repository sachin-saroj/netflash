const { validateUrl } = require('../middleware/validate');

describe('URL Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('should pass valid Amazon, Flipkart, and Meesho URLs', () => {
    const validUrls = [
      'https://www.amazon.in/dp/B07WHSY9JQ',
      'https://flipkart.com/product/12345',
      'https://meesho.com/dress/p/123',
      'http://amazon.com/dp/123'
    ];

    validUrls.forEach(url => {
      mockReq.body.url = url;
      validateUrl(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  it('should reject URLs from unsupported domains', () => {
    mockReq.body.url = 'https://google.com/search?q=amazon';
    validateUrl(mockReq, mockRes, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNSUPPORTED_PLATFORM'
        })
      })
    );
  });

  it('should reject spoofed domains containing supported names as subdomains of another site', () => {
    const spoofUrls = [
      'https://amazon.in.evil.com/dp/123',
      'https://flipkart.com.attacker.io/p/123',
      'https://not-meesho.com/p/123'
    ];

    spoofUrls.forEach(url => {
      nextFunction.mockClear();
      mockRes.status.mockClear();
      mockReq.body.url = url;
      validateUrl(mockReq, mockRes, nextFunction);
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  it('should reject non-HTTP/HTTPS protocols', () => {
    mockReq.body.url = 'ftp://amazon.in/dp/123';
    validateUrl(mockReq, mockRes, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_URL',
          message: 'Only HTTP and HTTPS URLs are supported.'
        })
      })
    );
  });

  it('should reject missing or empty URLs', () => {
    mockReq.body.url = '';
    validateUrl(mockReq, mockRes, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
