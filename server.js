const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// JWT Authenticator Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Development Route to fetch a test JWT token
app.get('/api/token', (req, res) => {
  const token = jwt.sign({ user: 'visto_admin' }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Task #2 Endpoint: Upload to Bunny.net Singapore PoP
app.post('/api/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const bunnyEndpoint = `https://sg.storage.bunnycdn.com/${process.env.BUNNY_STORAGE_ZONE}/${filename}`;

    await axios.put(bunnyEndpoint, req.file.buffer, {
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
    });

    const cdnUrl = `https://${process.env.BUNNY_STORAGE_ZONE}.b-cdn.net/${filename}`;
    res.json({ success: true, videoUrl: cdnUrl, filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => console.log(`VISTO API running on port ${process.env.PORT}`));
