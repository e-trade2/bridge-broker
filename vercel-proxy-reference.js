// ══════════════════════════════════════════════════════
//  api/chat.js  —  Vercel Serverless Proxy
//  Keeps your Claude API key secret on the server
//
//  HOW TO DEPLOY (5 minutes):
//  1. Create a free account at vercel.com
//  2. Install Vercel CLI:  npm install -g vercel
//  3. Create a new folder called "bridge-broker-proxy"
//  4. Put this file inside it at: api/chat.js
//  5. Also create package.json (see bottom of this file)
//  6. Run: vercel deploy
//  7. In Vercel dashboard → Settings → Environment Variables
//     Add: ANTHROPIC_API_KEY = sk-ant-...your key...
//  8. Copy your deployment URL and paste it into
//     delala-ai.js as the PROXY_URL value
// ══════════════════════════════════════════════════════

export default async function handler(req, res) {
  // Allow requests from your Bridge Broker domain
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { system, messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Fast and cheap — ideal for chatbot
        max_tokens: 400,                     // Keep responses concise
        system: system || '',
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Claude API error:', err);
      return res.status(502).json({ error: 'AI service unavailable' });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── package.json for the proxy folder ────────────────
// Create a file called package.json with this content:
//
// {
//   "name": "bridge-broker-proxy",
//   "version": "1.0.0",
//   "private": true
// }
