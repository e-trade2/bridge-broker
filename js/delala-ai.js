/**
 * Delala AI — Integrated Client Logic (v2)
 * Communicates with: https://bridge-proxy-9kwv.vercel.app/api/chat
 *
 * IMPROVEMENTS:
 * ✅ Persistent chat via localStorage
 * ✅ Robust auto-scroll
 * ✅ Clear chat button
 * ✅ Deep linking buttons for vehicle suggestions
 * ✅ Dynamic listings injection (ready for Supabase)
 * ✅ XSS-safe message rendering
 */

let chatHistory = [];
const MAX_HISTORY = 10;
// ── API base URL ──────────────────────────────────────────────────────────────
// This must match PAYMENT_API_BASE in js/supabase.js — both point at the same
// Vercel deployment. If you redeploy, update the value in supabase.js and here.
const PROXY_URL = "https://bridge-proxy-9kwv.vercel.app/api/chat";
const STORAGE_KEY = "delala_chat_history";

// ── Vehicle catalogue (swap this for a Supabase fetch — see fetchListings()) ──
// Fields:
//   name  — display label shown in the AI message and button text
//   year  — model year for display only
//   price — approximate price string for the AI system prompt
//   brand — used to build the ?brand= filter URL (must match listings.brand in DB)
//   type  — 'car' | 'motorcycle' | 'bajaj' — used to build the ?type= filter URL
const STATIC_LISTINGS = [
  { name: "Toyota Vitz",        year: 2015, price: "1,250,000 ETB", brand: "Toyota",  type: "car"        },
  { name: "TVS King Bajaj",     year: 2024, price: "185,000 ETB",   brand: "TVS",     type: "bajaj"      },
  { name: "Haojue HJ150",       year: 2022, price: "95,000 ETB",    brand: "Haojue",  type: "motorcycle" },
  { name: "Suzuki Dzire",       year: 2018, price: "980,000 ETB",   brand: "Suzuki",  type: "car"        },
  { name: "TVS Apache RTR 160", year: 2024, price: "135,000 ETB",   brand: "TVS",     type: "motorcycle" },
  { name: "Bajaj RE 4S",        year: 2021, price: "145,000 ETB",   brand: "Bajaj",   type: "bajaj"      },
];

/**
 * Fetch listings from Supabase (or fall back to static list).
 * To activate: uncomment the fetch block and set SUPABASE_URL / SUPABASE_KEY.
 * The REST query selects brand, model, year, price, and type — columns that
 * actually exist in the listings table. There is no 'name' or 'slug' column.
 */
async function fetchListings() {
  // ── SUPABASE INTEGRATION (uncomment when ready) ──────────────────────────
  // const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
  // const SUPABASE_KEY = "YOUR_ANON_KEY";
  // try {
  //   const res = await fetch(
  //     `${SUPABASE_URL}/rest/v1/listings?select=brand,model,year,price,type&status=eq.approved&limit=20`,
  //     { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  //   );
  //   if (res.ok) {
  //     const rows = await res.json();
  //     // Map DB columns to the shape STATIC_LISTINGS uses
  //     return rows.map(r => ({
  //       name:  `${r.brand} ${r.model}`,
  //       year:  r.year,
  //       price: `${Number(r.price).toLocaleString('en-ET')} ETB`,
  //       brand: r.brand,
  //       type:  r.type,
  //     }));
  //   }
  // } catch (e) { console.warn("Supabase fetch failed, using static listings", e); }
  // ─────────────────────────────────────────────────────────────────────────
  return STATIC_LISTINGS;
}

function buildSystemPrompt(listings, lang) {
  const listBlock = listings
    .map(l => `- ${l.name} ${l.year} — ${l.price}`)
    .join("\n");

  return `You are Delala AI, the intelligent vehicle broker assistant for Bridge Broker — Ethiopia's vehicle marketplace.
Your personality: Friendly, knowledgeable, and concise (under 3 sentences unless listing items).
You NEVER make up listings.
Current listings:
${listBlock}
If you don't know, refer users to Telegram @bridgebroker.${lang === "am" ? "\n\nRespond in Amharic." : ""}`;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  } catch (_) {}
}

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    // Validate structure — each entry must be {role, content} with safe roles.
    // Prevents corrupted or injected localStorage data from crashing the app
    // or sneaking system-role messages into the server payload.
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) =>
        m &&
        typeof m === "object" &&
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string" &&
        m.content.length <= 2000
    );
  } catch (_) {
    return [];
  }
}

// ── Core AI call ──────────────────────────────────────────────────────────────
export async function askDelala(userMessage, lang = "en") {
  chatHistory.push({ role: "user", content: userMessage });
  // Keep the array at most MAX_HISTORY*2 entries (user+assistant pairs).
  // Use a while loop — a single shift() only ever removes one entry,
  // which doesn't work if the array somehow grew beyond the limit.
  while (chatHistory.length > MAX_HISTORY * 2) chatHistory.shift();

  // NOTE: system prompt is now hardcoded in api/chat.js on the server.
  // We send only { messages } — the client can no longer inject system instructions.

  try {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory, lang }),
    });

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const data = await response.json();
    const aiText = data.content?.[0]?.text || "Sorry, I couldn't respond right now.";

    chatHistory.push({ role: "assistant", content: aiText });
    saveHistory();
    return aiText;
  } catch (err) {
    console.error("Delala AI Error:", err);
    throw err;
  }
}

// ── Chat UI ───────────────────────────────────────────────────────────────────
export function initDelalaChat(t, currentLang) {
  const ui = {
    fab:    document.getElementById("chatFab"),
    window: document.getElementById("chatWindow"),
    close:  document.getElementById("chatClose"),
    send:   document.getElementById("chatSend"),
    input:  document.getElementById("chatInput"),
    msgs:   document.getElementById("chatMessages"),
    clear:  document.getElementById("chatClear"), // ← add this button in your HTML
  };

  if (!ui.fab || !ui.msgs) return;

  // Restore persisted history
  chatHistory = loadHistory();
  if (chatHistory.length > 0) {
    replayHistory(ui.msgs, chatHistory);
  } else {
    addBotMessage(ui.msgs, t("chat_greeting"));
  }

  scrollToBottom(ui.msgs);

  // Toggle chat window
  ui.fab.addEventListener("click", () => {
    ui.window.classList.toggle("open");
    if (ui.window.classList.contains("open")) scrollToBottom(ui.msgs);
  });
  ui.close?.addEventListener("click", () => ui.window.classList.remove("open"));

  // Clear chat
  ui.clear?.addEventListener("click", () => {
    chatHistory = [];
    localStorage.removeItem(STORAGE_KEY);
    ui.msgs.innerHTML = "";
    addBotMessage(ui.msgs, t("chat_greeting"));
  });

  const handleSend = async () => {
    const text = ui.input?.value?.trim();
    if (!text) return;

    ui.input.value = "";
    ui.input.disabled = ui.send.disabled = true;

    addUserMessage(ui.msgs, text);
    const typing = addTypingIndicator(ui.msgs);

    try {
      const reply = await askDelala(text, currentLang);
      typing.remove();
      addBotMessage(ui.msgs, reply);
    } catch {
      typing.remove();
      addBotMessage(
        ui.msgs,
        currentLang === "am"
          ? "ይቅርታ፣ ተገናኝቶ አልተሳካም።"
          : "Sorry, connection failed."
      );
    } finally {
      ui.input.disabled = ui.send.disabled = false;
      ui.input.focus();
    }
  };

  ui.send?.addEventListener("click", handleSend);
  ui.input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Scroll chat container to the very bottom. */
function scrollToBottom(msgs) {
  requestAnimationFrame(() => {
    msgs.scrollTop = msgs.scrollHeight;
  });
}

/**
 * Render bot message with XSS-safe text and auto deep-link buttons
 * for any vehicle names that match our listings.
 */
function addBotMessage(msgs, text) {
  const div = document.createElement("div");
  div.className = "msg bot";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  // Safe text — no innerHTML from AI text
  const para = document.createElement("p");
  para.textContent = text;
  bubble.appendChild(para);

  // Deep-link buttons for matching vehicles
  const buttons = buildDeepLinkButtons(text);
  if (buttons.length) {
    const btnRow = document.createElement("div");
    btnRow.className = "msg-links";
    buttons.forEach((b) => btnRow.appendChild(b));
    bubble.appendChild(btnRow);
  }

  div.innerHTML = `<div class="msg-avatar">🤖</div>`;
  div.appendChild(bubble);
  msgs.appendChild(div);
  scrollToBottom(msgs);
}

function addUserMessage(msgs, text) {
  const div = document.createElement("div");
  div.className = "msg user";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text; // textContent = XSS safe
  div.innerHTML = `<div class="msg-avatar">👤</div>`;
  div.appendChild(bubble);
  msgs.appendChild(div);
  scrollToBottom(msgs);
}

function addTypingIndicator(msgs) {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble typing"><span></span><span></span><span></span></div>`;
  msgs.appendChild(div);
  scrollToBottom(msgs);
  return div;
}

/**
 * Replay saved history into the DOM (without re-calling the AI).
 * Only shows user/assistant turns, skips system messages.
 */
function replayHistory(msgs, history) {
  history.forEach((msg) => {
    if (msg.role === "user") addUserMessage(msgs, msg.content);
    else if (msg.role === "assistant") addBotMessage(msgs, msg.content);
  });
}

/**
 * Scan AI reply for vehicle names and return anchor buttons
 * that link to /listings.html?brand=<brand>&type=<type>.
 * Uses brand and type from STATIC_LISTINGS so the URL params
 * match exactly what getFiltersFromUrl() in main.js reads.
 */
function buildDeepLinkButtons(text) {
  const lower = text.toLowerCase();
  return STATIC_LISTINGS
    .filter((l) => lower.includes(l.name.toLowerCase()))
    .map((l) => {
      const params = new URLSearchParams({ brand: l.brand, type: l.type });
      const a = document.createElement("a");
      a.href = `/listings.html?${params.toString()}`;
      a.className = "msg-link-btn";
      a.textContent = `View ${l.name} →`;
      return a;
    });
}
