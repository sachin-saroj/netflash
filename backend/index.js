const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// F-05 FIX: Import the general rate limiter — previously defined but never used.
const { generalRateLimit } = require('./middleware/rateLimit');

const app = express();

// F-05/F-09 Proxy Hardening: Trust the first proxy hop to correctly identify client IPs
// behind Cloudflare, Nginx, Railway, Render, etc. preventing global rate-limiter lockout.
app.set('trust proxy', 1);

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// F-05 FIX: Apply general rate limiter to ALL /api/* routes.
// This provides baseline protection against brute-force attacks, credential stuffing,
// and general API abuse. Config: 100 requests per 15 minutes per IP.
// The analyze endpoint has its OWN stricter limiter applied at the route level.
app.use('/api', generalRateLimit);

app.use('/api/product',  require('./routes/product'));
app.use('/api/analyze',  require('./routes/analyze'));
app.use('/api/price',    require('./routes/price'));
app.use('/api/youtube',  require('./routes/youtube'));
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/watchlist',require('./routes/watchlist'));

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'NETflash' }));

if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('[NETflash] MongoDB connected');
    })
    .catch(err => { 
      console.error('[NETflash] MongoDB failed (IP blocked or down). Running in DB-less mode for demo.'); 
    });

  // Always start the server even if DB fails, so analysis feature works
  app.listen(process.env.PORT || 5000, () =>
    console.log(`[NETflash] Server running on port ${process.env.PORT || 5000}`)
  );
}

module.exports = app;
