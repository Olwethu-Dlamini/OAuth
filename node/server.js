// server.js
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // allow Blazor frontend to call backend

const PORT = 5000;

require('dotenv').config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Step 1: Redirect user to Google login
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

// Step 2: Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code received');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch full user info from People API
    const { data: user } = await axios.get(
      'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos,locales',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    // Return raw JSON to the browser
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(user, null, 2));

  } catch (err) {
    console.error(err.response?.data || err);
    res.send('Authentication error');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));