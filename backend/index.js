const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

const { analyzeRateLimit, generalRateLimit } = require('./middleware/rateLimit');

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Not allowed by CORS'));
      }
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Apply rate limiters to routes
app.use('/api/product',  generalRateLimit, require('./routes/product'));
app.use('/api/analyze',  analyzeRateLimit, require('./routes/analyze'));
app.use('/api/price',    generalRateLimit, require('./routes/price'));
app.use('/api/youtube',  generalRateLimit, require('./routes/youtube'));
app.use('/api/auth',     generalRateLimit, require('./routes/auth'));
app.use('/api/watchlist',generalRateLimit, require('./routes/watchlist'));

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'NETflash' }));

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
// Restarted to reload environment variables

