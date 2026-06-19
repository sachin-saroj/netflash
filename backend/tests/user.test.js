const User = require('../models/User');

describe('User Model Validation & Constraints', () => {
  it('should accept a valid email and name', () => {
    const user = new User({
      name: 'Sachin Saroj',
      email: 'sachin@example.com',
      password: 'password123'
    });
    const error = user.validateSync();
    expect(error).toBeUndefined();
  });

  it('should accept valid email formats with multiple domain segments', () => {
    const user = new User({
      name: 'Sachin Saroj',
      email: 'sachin.saroj@example.co.in',
      password: 'password123'
    });
    const error = user.validateSync();
    expect(error).toBeUndefined();
  });

  it('should reject email without TLD segment', () => {
    const user = new User({
      name: 'Sachin Saroj',
      email: 'sachin@invalid',
      password: 'password123'
    });
    const error = user.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  it('should reject email with consecutive dots in local part', () => {
    const user = new User({
      name: 'Sachin Saroj',
      email: 'sachin..saroj@example.com',
      password: 'password123'
    });
    const error = user.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
  });

  it('should reject malformed email strings', () => {
    const invalidEmails = ['sachin', 'sachin@', '@example.com', '.sachin@example.com', 'sachin.@example.com'];
    invalidEmails.forEach(email => {
      const user = new User({
        name: 'Sachin',
        email,
        password: 'password123'
      });
      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });
  });

  it('should exclude password field by default on query selection configuration', () => {
    const passwordField = User.schema.paths.password;
    expect(passwordField.options.select).toBe(false);
  });
});
