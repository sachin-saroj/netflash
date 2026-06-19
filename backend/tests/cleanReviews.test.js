const { cleanReviews } = require('../utils/cleanReviews');

describe('cleanReviews Helper Unit Tests', () => {
  it('should return empty list if reviews parameter is not an array', () => {
    expect(cleanReviews(null, 'amazon')).toEqual([]);
    expect(cleanReviews('not-an-array', 'amazon')).toEqual([]);
  });

  it('should clean, trim, and normalize valid review text', () => {
    const raw = [
      { text: '  Excellent build quality! Highly recommended.  ', rating: 5, verifiedPurchase: true }
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].text).toBe('Excellent build quality! Highly recommended.');
    expect(cleaned[0].platform).toBe('amazon');
  });

  it('should filter out reviews with length less than 10 characters', () => {
    const raw = [
      { text: 'Too short', rating: 2 },
      { text: 'Good product!', rating: 5 } // length 13
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].text).toBe('Good product!');
  });

  it('should filter out empty, null, or undefined reviews', () => {
    const raw = [
      null,
      { text: '' },
      { body: '         ' },
      { review_text: undefined }
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    expect(cleaned).toEqual([]);
  });

  it('should preserve and map ratings using different property keys', () => {
    const raw = [
      { text: 'First review text here', rating: 4.5 },
      { text: 'Second review text here', stars: 3 },
      { text: 'Third review text here', review_star: 2.5 },
      { text: 'Fourth review text here' } // default 0
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned[0].rating).toBe(4.5);
    expect(cleaned[1].rating).toBe(3);
    expect(cleaned[2].rating).toBe(2.5);
    expect(cleaned[3].rating).toBe(0);
  });

  it('should correctly map verified purchase status and reviewer total reviews', () => {
    const raw = [
      { text: 'First review text here', verified_purchase: true, reviewer_total_reviews: 12 },
      { text: 'Second review text here', verifiedPurchase: false, reviewerTotalReviews: 'unknown' },
      { text: 'Third review text here', is_verified: true }
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned[0].verifiedPurchase).toBe(true);
    expect(cleaned[0].reviewerTotalReviews).toBe(12);
    
    expect(cleaned[1].verifiedPurchase).toBe(false);
    expect(cleaned[1].reviewerTotalReviews).toBe('unknown');
    
    expect(cleaned[2].verifiedPurchase).toBe(true);
    expect(cleaned[2].reviewerTotalReviews).toBe('unknown');
  });

  it('should map review dates correctly using different platforms keys', () => {
    const raw = [
      { text: 'First review text here', date: '2026-06-18' },
      { text: 'Second review text here', review_date: '2026-06-19' },
      { text: 'Third review text here', created_at: '2026-06-20' }
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned[0].date).toBe('2026-06-18');
    expect(cleaned[1].date).toBe('2026-06-19');
    expect(cleaned[2].date).toBe('2026-06-20');
  });

  it('should remove duplicate reviews based on text matching', () => {
    const raw = [
      { text: 'This is a duplicated review text check.', rating: 5 },
      { text: 'This is a unique review text check.', rating: 4 },
      { text: 'This is a duplicated review text check.', rating: 1 } // Duplicate
    ];
    const cleaned = cleanReviews(raw, 'amazon');
    
    expect(cleaned).toHaveLength(2);
    expect(cleaned[0].text).toBe('This is a duplicated review text check.');
    expect(cleaned[1].text).toBe('This is a unique review text check.');
  });
});
