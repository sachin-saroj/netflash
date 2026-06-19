const { extractProductId } = require('../utils/extractProductId');

describe('extractProductId Helper Unit Tests', () => {
  describe('Amazon URL Parsing', () => {
    it('should parse standard Amazon /dp/ URLs', () => {
      const urls = [
        'https://www.amazon.in/dp/B07WHSY9JQ',
        'https://amazon.in/dp/B07WHSY9JQ',
        'https://www.amazon.com/dp/B07WHSY9JQ?ref=dp_foo',
        'http://amazon.com/dp/B07WHSY9JQ/'
      ];
      urls.forEach(url => {
        const result = extractProductId(url);
        expect(result).toEqual({ platform: 'amazon', id: 'B07WHSY9JQ' });
      });
    });

    it('should parse Amazon /gp/product/ URLs', () => {
      const urls = [
        'https://www.amazon.in/gp/product/B07WHSY9JQ',
        'https://amazon.com/gp/product/B07WHSY9JQ?ref=widget_name'
      ];
      urls.forEach(url => {
        const result = extractProductId(url);
        expect(result).toEqual({ platform: 'amazon', id: 'B07WHSY9JQ' });
      });
    });

    it('should throw an error if ASIN is missing or malformed', () => {
      expect(() => extractProductId('https://www.amazon.in/dp/')).toThrow();
      expect(() => extractProductId('https://www.amazon.in/dp/B07W')).toThrow(); // Too short
    });
  });

  describe('Flipkart URL Parsing', () => {
    it('should parse Flipkart URLs containing pid query parameter', () => {
      const urls = [
        'https://www.flipkart.com/boat-rockerz-450/p/itm?pid=ACCFLG45Y',
        'https://flipkart.com/p/item-details?ref=foo&pid=ACCFLG45Y'
      ];
      urls.forEach(url => {
        const result = extractProductId(url);
        expect(result).toEqual({ platform: 'flipkart', id: 'ACCFLG45Y' });
      });
    });

    it('should parse Flipkart URLs containing /p/ path segment ID', () => {
      const url = 'https://www.flipkart.com/boat-rockerz-450/p/itmf3dfg3d';
      const result = extractProductId(url);
      expect(result).toEqual({ platform: 'flipkart', id: 'itmf3dfg3d' });
    });

    it('should throw an error if Flipkart PID is missing', () => {
      expect(() => extractProductId('https://www.flipkart.com/boat-rockerz-450/')).toThrow();
    });
  });

  describe('Meesho URL Parsing', () => {
    it('should parse Meesho /p/ structure URLs', () => {
      const url = 'https://www.meesho.com/sarees/p/9cejj4';
      const result = extractProductId(url);
      expect(result).toEqual({ platform: 'meesho', id: '9cejj4' });
    });

    it('should parse Meesho /product/ structure URLs', () => {
      const url = 'https://www.meesho.com/product/123456';
      const result = extractProductId(url);
      expect(result).toEqual({ platform: 'meesho', id: '123456' });
    });

    it('should parse Meesho trailing digit URLs', () => {
      expect(extractProductId('https://www.meesho.com/sarees/123456')).toEqual({ platform: 'meesho', id: '123456' });
      expect(extractProductId('https://meesho.com/dress/98765/')).toEqual({ platform: 'meesho', id: '98765' });
    });

    it('should throw an error if Meesho product ID is missing', () => {
      expect(() => extractProductId('https://www.meesho.com/sarees/')).toThrow();
    });
  });

  describe('Security & Bad Inputs Handling', () => {
    it('should reject unsupported domains', () => {
      const urls = [
        'https://www.google.com',
        'https://www.myntra.com/product/123',
        'https://apple.com/dp/B07WHSY9JQ'
      ];
      urls.forEach(url => {
        expect(() => extractProductId(url)).toThrow('URL is not from a supported platform');
      });
    });

    it('should reject host spoofing attempts', () => {
      const spoofUrls = [
        'https://amazon.in.evil.com/dp/B07WHSY9JQ',
        'https://www.flipkart.com.attacker.io/p/123',
        'https://not-meesho.com/product/123'
      ];
      spoofUrls.forEach(url => {
        expect(() => extractProductId(url)).toThrow('URL is not from a supported platform');
      });
    });

    it('should throw error for malformed URL strings', () => {
      const badStrings = [
        'not-a-url',
        'http://',
        'ftp://amazon.in/dp/B07WHSY9JQ'
      ];
      badStrings.forEach(str => {
        expect(() => extractProductId(str)).toThrow();
      });
    });
  });
});
