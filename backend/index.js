const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/product',  require('./routes/product'));
app.use('/api/analyze',  require('./routes/analyze'));
app.use('/api/price',    require('./routes/price'));
app.use('/api/youtube',  require('./routes/youtube'));
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/watchlist',require('./routes/watchlist'));

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
