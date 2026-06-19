const mongoose = require('mongoose');

/**
 * @file User.js
 * @description Mongoose schema definition and model for registered platform users.
 * Handles credential storage, user preferences, and validation rules.
 */

/**
 * @typedef {Object} User
 * @property {string} name - The user's full name, trimmed. Required.
 * @property {string} email - The user's email address, trimmed and stored in lowercase. Must be unique. Validated via robust RFC 5322 regex.
 * @property {string} password - The bcrypt-hashed user password. Excluded from query results by default for security.
 * @property {Date} createdAt - Timestamp indicating when the user account was created. Defaults to Date.now.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      /**
       * Validates that the email meets RFC 5322 specifications.
       * - Prevents starting/ending dots.
       * - Prevents consecutive dots.
       * - Requires at least one Top-Level Domain (TLD) segment.
       * @param {string} v - The email string to validate.
       * @returns {boolean} True if the email is valid, false otherwise.
       */
      validator: function(v) {
        // Robust RFC 5322 email regex checking for starting/ending dots, consecutive dots, and requiring at least one TLD segment
        return /^(?!\.)(?!.*\.\.)[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?<!\.)@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(v);
      },
      message: props => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Security Consideration: Prevents password hash leakage by hiding this field from default query projections.
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);

