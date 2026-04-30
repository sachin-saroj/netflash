const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'netflash_super_secret_key_2026';

function auth(req, res, next) {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ success: false, error: { message: 'No token, authorization denied' } });
  }

  // Usually "Bearer <token>"
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Malformed token, authorization denied' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    logger.error('auth', 'Token verification failed', { error: err.message });
    res.status(401).json({ success: false, error: { message: 'Token is not valid' } });
  }
}

module.exports = auth;
