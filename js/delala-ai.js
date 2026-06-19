// ══════════════════════════════════════════════════════
//  delala-ai.js  —  Real AI Chatbot for Bridge Broker
//  Uses Google Gemini API (FREE tier — no proxy needed!)
// ══════════════════════════════════════════════════════

// ── HOW TO GET YOUR FREE GEMINI API KEY ──────────────
//  1. Go to https://aistudio.google.com/app/apikey
//  2. Sign in with your Google account
//  3. Click "Create API Key"
//  4. Paste it below — it's FREE with generous limits!
//
//  Free tier limits (as of 2025):
//  - gemini-2.0-flash:  1,500 requests/day, 1M tokens/min
//  - No credit card needed!
// ─────────────────────────────────────────────────────

const GEMINI_API_KEY = "AIzaSyAQ.Ab8RN6IqXXvlojzHfdRnGBgP87lCto9i4OFaxo3M6RfezbtyeA"; // ← Paste your key here
const GEMINI_MODEL   = "gemini-2.0-flash";
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Conversation history (keep last 10 turns to save tokens)
let chatHistory = [];
const MAX_HISTORY = 10;

// The system prompt that makes Delala AI a vehicle broker
const SYSTEM_PROMPT = `You are Delala AI, the intelligent vehicle broker assistant for Bridge Broker — Ethiopia's vehicle marketplace. You help buyers find Cars, Motorcycles, and Bajajs.

Your personality:
- Friendly, knowledgeable, and helpful
- You know the Ethiopian vehicle market well
- You speak naturally in English OR Amharic depending on what the user writes
- You are concise — keep replies under 3 sentences unless giving a list
- You NEVER make up listings that don't exist

What you can help with:
- Recommending vehicle types based on budget and needs
- Explaining the difference between vehicle models (Toyota Vitz vs Corolla, TVS King vs Bajaj RE, etc.)
- Helping users understand Ethiopian vehicle pricing in ETB
- Guiding sellers on how to post a listing
- Explaining the verification and featured listing system
- Answering general vehicle questions

Current listings on the platform include:
- Toyota Vitz 2015 — 1,250,000 ETB — Addis Ababa (Featured, Verified Seller)
- TVS King Bajaj 2024 — 185,000 ETB — Adama (Verified Seller)
- Haojue HJ150 2022 — 95,000 ETB — Hawassa
- Suzuki Dzire 2018 — 980,000 ETB — Addis Ababa (Featured, Verified Seller)
- TVS Apache RTR 160 2024 — 135,000 ETB — Adama (Verified Seller)
- Bajaj RE 4S 2021 — 145,000 ETB — Bahir Dar

When a user asks for vehicle recommendations:
1. Ask about their budget if not mentioned
2. Ask what they'll use it for (personal/commercial/delivery)
3. Suggest the best match from the listings above

If users want to contact a seller or need human help, tell them to click the phone 📞 or Telegram ✈️ buttons on any listing card.

If asked something you don't know, say "I'm not sure about that — please contact our team on Telegram @bridgebroker".

Never discuss topics unrelated to vehicles or the Bridge Broker platform.`;

/**
 * Send a message to Delala AI (Gemini) and get a response
 * @param {string} userMessage
 * @param {string} lang — "en" or "am"
 * @returns {Promise<string>} AI response text
 */
export async function askDelala(userMessage, lang = "en") {
  // Add user message to history
  chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

  // Keep history manageable
  if (chatHistory.length > MAX_HISTORY * 2) {
    chatHistory = chatHistory.slice(chatHistory.length - MAX_HISTORY * 2);
  }

  const systemInstruction = SYSTEM_PROMPT + (lang === "am"
    ? "\n\nThe user is writing in Amharic. Please respond in Amharic."
    : "");

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: chatHistory,
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.7
    }
  };

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} — ${err?.error?.message || "unknown"}`);
  }

  const data = await response.json();
  const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text
    || "Sorry, I couldn't respond right now.";

  // Add AI response to history for context
  chatHistory.push({ role: "model", parts: [{ text: aiText }] });

  return aiText;
}

/**
 * Reset conversation (called when chat window is closed/reopened)
 */
export function resetChat() {
  chatHistory = [];
}

// ── DROP-IN REPLACEMENT FOR initChatbot() IN main.js ──
//
// Replace the entire initChatbot() function in main.js with this.
// Also add this import at the top of main.js:
//   import { askDelala, resetChat } from './delala-ai.js';
//
// Then update main.js to use type="module":
//   <script type="module" src="js/main.js"></script>

export function initDelalaChat(t, currentLang) {
  const fab      = document.getElementById('chatFab');
  const window_  = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatClose');
  const sendBtn  = document.getElementById('chatSend');
  const input    = document.getElementById('chatInput');
  const msgs     = document.getElementById('chatMessages');

  if (!fab || !msgs) return;

  // Show greeting on first open
  if (msgs.children.length === 0) {
    addBotMessage(msgs, t('chat_greeting'));
  }

  fab.addEventListener('click', () => {
    window_.classList.toggle('open');
    fab.querySelector('.chat-pulse')?.remove();
    fab.setAttribute('aria-expanded', window_.classList.contains('open'));
  });

  closeBtn?.addEventListener('click', () => {
    window_.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
  });

  const send = async () => {
    const text = input?.value?.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    // Show user message
    addUserMessage(msgs, text);

    // Show typing indicator
    const typing = addTypingIndicator(msgs);

    try {
      const reply = await askDelala(text, currentLang);
      typing.remove();
      addBotMessage(msgs, reply);
    } catch (err) {
      typing.remove();
      addBotMessage(msgs, currentLang === 'am'
        ? "ይቅርታ፣ አሁን ምላሽ መስጠት አልቻልኩም። እባክዎ ቆይተው ይሞክሩ።"
        : "Sorry, I couldn't connect right now. Please try again in a moment."
      );
      console.error('Delala AI error:', err);
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  };

  sendBtn?.addEventListener('click', send);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  // Quick buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.textContent.replace(/🚗|🏍️|🛺|💰/g, '').trim();
      if (input) input.value = text;
      send();
    });
  });
}

// ── HELPERS ──────────────────────────────────────────

function addBotMessage(msgs, text) {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">🤖</div>
    <div class="msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addUserMessage(msgs, text) {
  const div = document.createElement('div');
  div.className = 'msg user';
  div.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">👤</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addTypingIndicator(msgs) {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'delala-typing';
  div.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">🤖</div>
    <div class="msg-bubble delala-typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
