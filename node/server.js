// server.js
// ─────────────────────────────────────────────────────────────
// LINE 1-4: IMPORT DEPENDENCIES
// ─────────────────────────────────────────────────────────────
const express = require('express');                 // Web framework for Node.js
const { OAuth2Client } = require('google-auth-library'); // Official Google OAuth library
const axios = require('axios');                     // HTTP client to call Google's People API
const cors = require('cors');                       // Middleware to handle Cross-Origin requests

// ─────────────────────────────────────────────────────────────
// LINE 6-7: INITIALIZE EXPRESS & CORS
// ─────────────────────────────────────────────────────────────
const app = express();                              // Create the Express application instance
app.use(cors());                                    // Enable CORS for all origins (⚠️ see security note below)

// ─────────────────────────────────────────────────────────────
// LINE 9: SERVER PORT
// ─────────────────────────────────────────────────────────────
const PORT = 5000;                                  // Port the backend will listen on

// ─────────────────────────────────────────────────────────────
// LINE 11-14: LOAD ENVIRONMENT VARIABLES
// ─────────────────────────────────────────────────────────────
require('dotenv').config();                         // Load .env file into process.env
const CLIENT_ID = process.env.CLIENT_ID;            // Google OAuth Client ID (from Cloud Console)
const CLIENT_SECRET = process.env.CLIENT_SECRET;    // Google OAuth Client Secret (keep this private!)
const REDIRECT_URI = process.env.REDIRECT_URI;      // Must match Google Cloud Console exactly

// ─────────────────────────────────────────────────────────────
// LINE 16: CREATE OAUTH2 CLIENT INSTANCE
// ─────────────────────────────────────────────────────────────
const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
// This object handles: generating auth URLs, exchanging codes for tokens, refreshing tokens

// ─────────────────────────────────────────────────────────────
// LINE 19-28: STEP 1 — REDIRECT USER TO GOOGLE LOGIN
// ─────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Request refresh token for long-term access
    scope: [                  // Permissions we're requesting from the user
      'openid',               // OpenID Connect core scope
      'email',                // User's email address
      'profile',              // Basic profile info (name, picture)
      'https://www.googleapis.com/auth/userinfo.profile',  // Explicit profile access
      'https://www.googleapis.com/auth/userinfo.email'      // Explicit email access
    ]
  });
  res.redirect(authUrl);  // Send user's browser to Google's login page
});
// 🔹 User clicks "Sign in" → Browser goes to /auth/google → User lands on Google login

// ─────────────────────────────────────────────────────────────
// LINE 31-50: STEP 2 — HANDLE GOOGLE CALLBACK
// ─────────────────────────────────────────────────────────────
app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;            // Google appends ?code=XXX to the redirect URL
  if (!code) return res.send('No code received'); // Basic validation

  try {
    // Exchange the authorization code for access/refresh tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);  // Set tokens on the client for subsequent API calls

    // Fetch extended user profile from Google People API
    const { data: user } = await axios.get(
      'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos,locales',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } } // Authenticate the request
    );

    // Return the raw user data as JSON to the browser
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(user, null, 2)); // Pretty-printed JSON response

  } catch (err) {
    // Log error details (in production, use a proper logger)
    console.error(err.response?.data || err);
    res.send('Authentication error'); // Generic error to avoid leaking details
  }
});
// 🔹 After user approves, Google redirects to /auth/google/callback?code=XXX
// 🔹 Backend exchanges code → tokens → fetches profile → returns JSON

// ─────────────────────────────────────────────────────────────
// LINE 53: START THE SERVER
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Server is now listening. Visit http://localhost:5000/auth/google to start the flow.