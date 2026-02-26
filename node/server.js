// server.js
// ─────────────────────────────────────────────────────────────
// IMPORT DEPENDENCIES
// ─────────────────────────────────────────────────────────────
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // load .env variables

// ─────────────────────────────────────────────────────────────
// INITIALIZE EXPRESS & SECURE CORS
// ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({
  origin: process.env.CLIENT_ORIGIN_URL,  // frontend URL
  methods: ['GET', 'POST'],
  credentials: true
}));

// ─────────────────────────────────────────────────────────────
// ENV VARIABLES
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// ─────────────────────────────────────────────────────────────
// OAUTH2 CLIENT
// ─────────────────────────────────────────────────────────────
const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ─────────────────────────────────────────────────────────────
// REDIRECT TO GOOGLE LOGIN
// ─────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.redirect(authUrl);
});

// ─────────────────────────────────────────────────────────────
// GOOGLE CALLBACK – now passing FULL user info
// ─────────────────────────────────────────────────────────────
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code received');

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch full user info from Google
    const { data: user } = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    // Pass the FULL user object (with all fields Google returns)
    // We just rename a few keys for frontend consistency
    const fullUserData = {
      ...user,                    // ← keeps id, verified_email, given_name, family_name, etc.
      FullName: user.name,        // map for UI
      PhotoUrl: user.picture,     // map for UI
      // you can keep or remove these aliases — they're only used by the card
    };

    const frontendUrl = process.env.CLIENT_ORIGIN_URL;
    if (!frontendUrl) throw new Error('CLIENT_ORIGIN_URL not set in .env');

    const encodedData = encodeURIComponent(JSON.stringify(fullUserData));
    res.redirect(`${frontendUrl}/profile?userData=${encodedData}`);
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message || err);
    const frontendUrl = process.env.CLIENT_ORIGIN_URL;
    if (frontendUrl) {
      res.redirect(`${frontendUrl}/login?error=Authentication failed`);
    } else {
      res.status(500).send('Authentication error. Please try again.');
    }
  }
});

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend running' });
});

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});