const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// F-07 FIX: Removed hardcoded JWT secret fallback ('netflash_super_secret_key_2026').
// Previously: process.env.JWT_SECRET || 'netflash_super_secret_key_2026'
// This allowed anyone with repo access to forge valid JWTs if JWT_SECRET was unset.
//
// Now: JWT_SECRET MUST be provided via environment variable. If missing, the module
// throws at import time, preventing the server from starting in an insecure state.
// This is a fail-fast security pattern — silent degradation is unacceptable for auth.
if (!process.env.JWT_SECRET) {
  throw new Error(
    '[NETflash] FATAL: JWT_SECRET environment variable is required. ' +
    'Server cannot start without it. Set JWT_SECRET in your .env file.'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

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
