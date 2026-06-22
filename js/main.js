// ══════════════════════════════════════════════════════
//  main.js  —  Bridge Broker (Supabase version)
//  Add this to your js/ folder and update script tags
//  to: <script type="module" src="js/main.js"></script>
// ══════════════════════════════════════════════════════

import { submitListing, loadListings, login, register, logout, onAuth, getVerifiedMap, getAdminStats, photoUrl, normalizeEthiopianPhone, sendPasswordReset } from './supabase.js';
import { askDelala, initDelalaChat } from './delala-ai.js';

// ── LANGUAGE SYSTEM ──────────────────────────────────
const translations = {
  en: {
    // Navigation
    nav_home: "Home", nav_listings: "Listings", nav_about: "About", nav_contact: "Contact",
    nav_login: "Login", nav_post: "Post Listing",
    // Hero
    hero_badge: "Ethiopia's #1 Vehicle Marketplace",
    hero_title_1: "Find Your", hero_title_2: "Perfect Vehicle", hero_title_3: "In Ethiopia",
    hero_sub: "Cars, Motorcycles & Bajajs from trusted sellers across Addis Ababa, Adama, Hawassa and beyond. AI-powered broker available 24/7.",
    // Stats
    stat_listings: "Active Listings", stat_sellers: "Verified Sellers", stat_cities: "Cities Covered",
    // Search / filters
    search_type: "Vehicle Type", search_brand: "Brand / Model", search_price: "Max Price (ETB)", search_location: "Location",
    type_all: "All Types", type_car: "Car", type_moto: "Motorcycle", type_bajaj: "Bajaj",
    loc_all: "All Locations",
    quick_car: "🚗 Car", quick_moto: "🏍️ Motorcycle", quick_bajaj: "🛺 Bajaj", quick_budget: "💰 My budget",
    featured_tab: "Featured", cars_tab: "Cars", motos_tab: "Motorcycles", bajajs_tab: "Bajajs",
    // How it works
    how_title: "How Bridge Broker Works",
    how_sub: "Connecting buyers and sellers safely — from listing to handshake",
    step1_title: "List Your Vehicle",
    step1_desc: "Submit your vehicle details in minutes. We review and approve within 24 hours.",
    step2_title: "Get Discovered",
    step2_desc: "Buyers find your listing through search, filters, and our AI Delala chatbot.",
    step3_title: "Connect & Negotiate",
    step3_desc: "Buyers contact you directly via phone or Telegram. You'll know our commission rate before your listing ever goes live — see",
    step3_desc_link: "Pricing",
    step4_title: "Close the Deal",
    step4_desc: "Finalize the sale in person. We verify both parties for a safe transaction.",
    // CTA section
    cta_title: "Ready to Sell Your Vehicle?",
    cta_sub: "Join hundreds of sellers on Bridge Broker. Free basic listing — featured upgrades available.",
    cta_f1: "Free basic listing — go live in 24 hours",
    cta_f2: "Featured listings pinned to top of search",
    cta_f3: "Verified Broker badge for professional sellers",
    cta_f4: "Direct buyer contact — no commission on sales",
    cta_featured: "Featured Listing", cta_week: "per week",
    cta_btn: "Post Your Listing Now",
    // Modals
    modal_list_title: "Post a Vehicle Listing",
    modal_login_title: "Login to Bridge Broker",
    // Footer
    footer_desc: "Ethiopia's trusted vehicle marketplace. Connecting buyers and sellers of Cars, Motorcycles, and Bajajs across the country.",
    footer_vehicles: "Vehicles", footer_sellers: "For Sellers", footer_company: "Company",
    footer_bottom: "© 2025 Bridge Broker Ethiopia. All rights reserved.",
    // Hero
    hero_btn_browse: "Browse Vehicles", hero_btn_sell: "List Your Vehicle",
    // Search
    search_btn: "Search",
    // Chat
    chat_greeting: "👋 Welcome to Bridge Broker! I'm Delala AI. Are you looking for a 🚗 Car, 🏍️ Motorcycle, or 🛺 Bajaj today?",
    chat_placeholder: "Type your message...",
    // Form feedback
    uploading: "Uploading photos...", submitting: "Submitting...",
    submit_success: "✅ Listing submitted! We will review and publish within 24 hours.",
    login_success: "✅ Logged in!", login_logout: "Logout",
    register_success: "✅ Account created! Check your email to confirm.",
    // Listing form labels
    form_type: "Vehicle Type *", form_condition: "Condition *",
    form_brand: "Brand *", form_model: "Model *",
    form_year: "Year *", form_mileage: "Mileage (km)",
    form_transmission: "Transmission", form_fuel: "Fuel Type",
    form_price: "Price (ETB) *", form_location: "Location *",
    form_phone: "Seller Phone Number *", form_description: "Description",
    form_photos: "Photos (up to 8)",
    // Listing card
    currency: "ETB", call_btn: "📞 Call",
    featured_badge: "⭐ Featured",
    // Errors
    err_required: "Please fill in all required fields.",
    err_phone: "Please enter a valid Ethiopian phone number (e.g. 0912 345 678).",
    err_login_required: "You must be logged in to post a listing.",
    // Payment
    pay_telebirr_note: "⚠️ Telebirr limit is ~10,000 ETB. Use bank transfer for larger amounts.",
    // Escrow
    escrow_payout_note: "After handoff is confirmed, the broker will manually transfer funds to your Telebirr or bank account.",
  },
  am: {
    // Navigation
    nav_home: "መነሻ", nav_listings: "ዝርዝሮች", nav_about: "ስለ እኛ", nav_contact: "አግኙን",
    nav_login: "ግባ", nav_post: "ዝርዝር ለጥፍ",
    // Hero
    hero_badge: "የኢትዮጵያ #1 የተሽከርካሪ ገበያ",
    hero_title_1: "ያግኙ", hero_title_2: "ምርጥ ተሽከርካሪዎን", hero_title_3: "በኢትዮጵያ",
    hero_sub: "መኪናዎች፣ ሞተርሳይክሎች እና ባጃጆች ከታማኝ ሻጮች በአዲስ አበባ፣ አዳማ፣ ሀዋሳ እና ሌሎችም ከተሞች። የ24/7 AI ደላላ አገልግሎት።",
    // Stats
    stat_listings: "ንቁ ዝርዝሮች", stat_sellers: "የተረጋገጡ ሻጮች", stat_cities: "የተሸፈኑ ከተሞች",
    // Search / filters
    search_type: "የተሽከርካሪ አይነት", search_brand: "ብራንድ / ሞዴል", search_price: "ከፍተኛ ዋጋ (ብር)", search_location: "አካባቢ",
    type_all: "ሁሉም አይነቶች", type_car: "መኪና", type_moto: "ሞተርሳይክል", type_bajaj: "ባጃጅ",
    loc_all: "ሁሉም አካባቢዎች",
    quick_car: "🚗 መኪና", quick_moto: "🏍️ ሞተርሳይክል", quick_bajaj: "🛺 ባጃጅ", quick_budget: "💰 በጀቴ",
    featured_tab: "ተለይተው የቀረቡ", cars_tab: "መኪናዎች", motos_tab: "ሞተርሳይክሎች", bajajs_tab: "ባጃጆች",
    // How it works
    how_title: "ብሪጅ ብሮከር እንዴት እንደሚሰራ",
    how_sub: "ሻጮችንና ገዢዎችን በደህንነት ማገናኘት — ከዝርዝር እስከ ስምምነት",
    step1_title: "ተሽከርካሪዎን ይለጥፉ",
    step1_desc: "የተሽከርካሪዎን ዝርዝሮች በደቂቃዎች ውስጥ ያስገቡ። በ24 ሰዓት ውስጥ እንገመግማለን እናጸድቃለን።",
    step2_title: "ይታወቁ",
    step2_desc: "ገዢዎች ዝርዝርዎን በፍለጋ፣ በማጣሪያዎች እና በደላላ AI ቻትቦታችን በኩል ያገኛሉ።",
    step3_title: "ይገናኙ እና ይደራደሩ",
    step3_desc: "ገዢዎች በስልክ ወይም በቴሌግራም በቀጥታ ያገኝዎታል። ዝርዝርዎ ከመውጣቱ በፊት የኮሚሽን መጠናችንን ያውቃሉ — ይመልከቱ",
    step3_desc_link: "ዋጋ",
    step4_title: "ስምምነቱን ይዝጉ",
    step4_desc: "ሽያጩን በአካል ይጨርሱ። ሁለቱንም ወገኖች ለደህንነቱ የተጠበቀ ግብይት እናረጋግጣለን።",
    // CTA section
    cta_title: "ተሽከርካሪዎን ለመሸጥ ዝግጁ ነዎት?",
    cta_sub: "በመቶዎች የሚቆጠሩ ሻጮችን በብሪጅ ብሮከር ይቀላቀሉ። ነጻ መሰረታዊ ዝርዝር — የተለዩ የማሻሻያ አማራጮችም አሉ።",
    cta_f1: "ነጻ መሰረታዊ ዝርዝር — በ24 ሰዓት ውስጥ ይታያል",
    cta_f2: "ተለይተው የቀረቡ ዝርዝሮች በፍለጋ አናት ላይ ይሰካሉ",
    cta_f3: "ለሙያተኛ ሻጮች የተረጋገጠ ብሮከር ባጅ",
    cta_f4: "ቀጥተኛ የገዢ ግንኙነት — በሽያጭ ላይ ኮሚሽን የለም",
    cta_featured: "ተለይቶ የቀረበ ዝርዝር", cta_week: "በሳምንት",
    cta_btn: "ዝርዝርዎን አሁን ይለጥፉ",
    // Modals
    modal_list_title: "የተሽከርካሪ ዝርዝር ይለጥፉ",
    modal_login_title: "ወደ ብሪጅ ብሮከር ይግቡ",
    // Footer
    footer_desc: "የኢትዮጵያ ታማኝ የተሽከርካሪ ገበያ። መኪናዎችን፣ ሞተርሳይክሎችን እና ባጃጆችን ገዢዎችና ሻጮችን በመላ ሀገሪቱ እናገናኛለን።",
    footer_vehicles: "ተሽከርካሪዎች", footer_sellers: "ለሻጮች", footer_company: "ኩባንያ",
    footer_bottom: "© 2025 ብሪጅ ብሮከር ኢትዮጵያ። መብቱ በህግ የተጠበቀ ነው።",
    // Hero
    hero_btn_browse: "ተሽከርካሪዎች ይመልከቱ", hero_btn_sell: "ዝርዝርዎን ይለጥፉ",
    // Search
    search_btn: "ፈልግ",
    // Chat
    chat_greeting: "👋 እንኳን ደህና መጡ! እኔ ደላላ AI ነኝ። ዛሬ 🚗 መኪና፣ 🏍️ ሞተርሳይክል ወይም 🛺 ባጃጅ ይፈልጋሉ?",
    chat_placeholder: "መልእክትዎን ይጻፉ...",
    // Form feedback
    uploading: "ፎቶዎች እየጫኑ...", submitting: "እያስገቡ...",
    submit_success: "✅ ዝርዝሩ ተልኳል! በ24 ሰዓት ውስጥ እናጸድቃለን።",
    login_success: "✅ ተገብቷል!", login_logout: "ውጣ",
    register_success: "✅ መለያ ተፈጥሯል! ኢሜልዎን ያረጋግጡ።",
    // Listing form labels
    form_type: "የተሽከርካሪ ዓይነት *", form_condition: "ሁኔታ *",
    form_brand: "ብራንድ *", form_model: "ሞዴል *",
    form_year: "ዓመት *", form_mileage: "ማይሌጅ (ኪሜ)",
    form_transmission: "ማስተላለፊያ", form_fuel: "የነዳጅ ዓይነት",
    form_price: "ዋጋ (ብር) *", form_location: "ቦታ *",
    form_phone: "የሻጩ ስልክ ቁጥር *", form_description: "መግለጫ",
    form_photos: "ፎቶዎች (እስከ 8)",
    // Listing card
    currency: "ብር", call_btn: "📞 ደውል",
    featured_badge: "⭐ ተለይቷል",
    // Errors
    err_required: "እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ።",
    err_phone: "እባክዎ የሚሰራ የኢትዮጵያ ስልክ ቁጥር ያስገቡ (ለምሳሌ 0912 345 678)።",
    err_login_required: "ዝርዝር ለመለጠፍ መግባት አለብዎት።",
    // Payment
    pay_telebirr_note: "⚠️ የቴሌብር ገደብ ~10,000 ብር ነው። ከዚያ በላይ ለሆኑ ዋጋዎች የባንክ ዝውውር ይጠቀሙ።",
    // Escrow
    escrow_payout_note: "ዕቃው ከተረከቡ በኋላ ደላላው ወደ ቴሌብር ወይም ባንክ ሒሳብዎ ገንዘቡን ያስተላልፋሉ።",
  }
};

let currentLang = localStorage.getItem('bb_lang') || 'en';
let currentUser  = null;

function t(key) {
  return translations[currentLang]?.[key] || translations["en"]?.[key] || null;
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n')); if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const pval = t(el.getAttribute('data-i18n-placeholder')); if (pval) el.placeholder = pval;
  });
  document.body.classList.toggle('lang-am', currentLang === 'am');
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  localStorage.setItem('bb_lang', currentLang);
}

// ── XSS PROTECTION ───────────────────────────────────
// Escape all database-sourced strings before placing them into innerHTML.
// Handles <, >, ", ', & — covers all standard HTML injection vectors.
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── LOAD REAL LISTINGS FROM SUPABASE ─────────────────
// Reads filters from the URL (e.g. listings.html?type=car, or
// ?brand=... from the homepage search / JSON-LD SearchAction) so a
// shared or bookmarked link, a footer category link, or a search
// actually lands on the matching filtered results — not just the
// unfiltered full list. Also pre-fills the filter form fields so the
// UI reflects what's currently filtered.
function getFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filters = {};
  if (params.get('type'))      filters.type      = params.get('type');
  if (params.get('brand'))     filters.brand      = params.get('brand');
  if (params.get('maxPrice'))  filters.maxPrice  = parseInt(params.get('maxPrice')) || undefined;
  if (params.get('location'))  filters.location  = params.get('location');
  if (params.get('condition')) filters.condition = params.get('condition');
  return filters;
}

function prefillFilterForm(filters) {
  const typeEl     = document.getElementById('filterType');
  const brandEl    = document.getElementById('filterBrand');
  const priceEl    = document.getElementById('filterPrice');
  const locationEl = document.getElementById('filterLocation');
  if (typeEl && filters.type)         typeEl.value     = filters.type;
  if (brandEl && filters.brand)       brandEl.value    = filters.brand;
  if (priceEl && filters.maxPrice)    priceEl.value    = filters.maxPrice;
  if (locationEl && filters.location) locationEl.value = filters.location;
}

async function loadAndRenderListings() {
  const grid = document.getElementById('listingsGrid');
  // Exit before making any network requests — this function is imported by
  // main.js which runs on every page, but only listings.html and index.html
  // have a #listingsGrid. Without this guard, loadListings() would fire
  // (and consume Supabase free-tier row reads) on about.html, pricing.html,
  // contact.html, etc.
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">Loading listings...</div>';

  try {
    const filters = getFiltersFromUrl();
    const hasFilters = Object.keys(filters).length > 0;
    if (hasFilters) prefillFilterForm(filters);

    const listings = await loadListings(filters);
    if (!listings.length) {
      grid.innerHTML = hasFilters
        ? '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray-400)"><div style="font-size:48px;margin-bottom:12px">🔍</div><div>No listings match this filter.</div></div>'
        : '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">No listings found.</div>';
      return;
    }
    await renderListings(listings);
  } catch (err) {
    console.error('Failed to load listings:', err);
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger)">Failed to load listings. Please refresh.</div>';
  }
}

// Renders a given array of listings into the grid (used both for the
// default unfiltered load and for search/filter results).
async function renderListings(listings) {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  try {
    // Look up real verified status for every seller in this batch —
    // a badge only ever appears here if sellers.verified is actually
    // true in the database (set by an admin via a reviewed request).
    let verifiedMap = new Map();
    try {
      verifiedMap = await getVerifiedMap(listings.map(l => l.seller_id));
    } catch (e) {
      console.warn('Could not load verified status:', e);
    }

    grid.innerHTML = listings.map(l => {
      const isVerified = l.seller_id && verifiedMap.get(l.seller_id) === true;
      // A listing can have featured=true but an expired featured_expires_at
      // if the periodic cleanup hasn't run yet (see sql/setup_payments.sql) —
      // don't show the badge past its paid-for window even so.
      const isFeaturedActive = l.featured && (!l.featured_expires_at || new Date(l.featured_expires_at) > new Date());
      // Escape all DB-sourced strings before injection into innerHTML.
      const eBrand    = escapeHtml(l.brand);
      const eModel    = escapeHtml(l.model);
      const eLocation = escapeHtml(l.location);
      const eSeller   = escapeHtml(l.seller_name || 'Seller');
      const ePhone    = escapeHtml(l.phone);
      const eId       = escapeHtml(l.id);
      const eType     = escapeHtml(l.type);
      const ePrice    = escapeHtml(String(l.price));
      const conditionLabel = l.condition === 'new' ? 'Brand New' : l.condition === 'seized' ? 'Bank Seized' : 'Locally Used';
      const typeEmoji = l.type === 'car' ? '🚗' : l.type === 'motorcycle' ? '🏍️' : '🛺';
      // Telegram button: each listing carries its own broker Telegram
      // username, set by the admin in the approval modal. Renders
      // disabled (greyed out, not clickable) for listings approved
      // before a Telegram username was set.
      const eTelegram = escapeHtml(l.telegram || '');
      const telegramBtn = eTelegram
        ? `<a href="https://t.me/${eTelegram}" class="btn btn-outline btn-sm" target="_blank" rel="noopener">✈️ Telegram</a>`
        : `<span class="btn btn-outline btn-sm" aria-disabled="true" title="Telegram not available for this listing" style="opacity:0.4;cursor:not-allowed;pointer-events:none">✈️ Telegram</span>`;
      // Only allow tel: links for values that look like real phone numbers
      // (start with + or digits only, plus common separators). Any other
      // value gets a safe fallback so a malformed/malicious DB value can't
      // end up as the literal target of a tel: link.
      const rawPhone = l.phone || '';
      const safeTel = /^\+?[\d\s\-().]+$/.test(rawPhone) ? `tel:${ePhone}` : '#';
      return `
      <div class="listing-card${isFeaturedActive ? ' featured' : ''}" data-id="${eId}" data-type="${eType}" data-price="${ePrice}"
           data-brand="${eBrand}" data-location="${eLocation}" data-featured="${isFeaturedActive}">
        <div class="listing-img" style="background:var(--charcoal-light);position:relative">
          ${l.photos?.length
            ? `<img src="${escapeHtml(photoUrl(l.photos[0], 'thumb'))}" alt="${eBrand} ${eModel}" class="listing-img-photo" loading="lazy" decoding="async" />`
            : `<div style="display:flex;align-items:center;justify-content:center;height:200px;font-size:48px">
                 ${typeEmoji}
               </div>`
          }
          ${isFeaturedActive ? '<span class="featured-badge">⭐ Featured</span>' : ''}
          <div class="listing-condition">${escapeHtml(conditionLabel)}</div>
          <button class="contact-btn wishlist-btn" data-id="${eId}" aria-label="Save to favorites">🤍</button>
        </div>
        <div class="listing-body">
          <div class="listing-title">${eBrand} ${eModel} ${escapeHtml(String(l.year))}</div>
          <div class="listing-price">${Number(l.price).toLocaleString('en-ET')} ${t('currency') || 'ETB'}</div>
          <div class="listing-meta">
            <span>📍 ${eLocation}</span>
            <span>👁 ${escapeHtml(String(l.views))} views</span>
          </div>
          <div class="listing-seller">
            <span>${eSeller}</span>
            ${isVerified ? '<span class="verified-badge">✓ Verified</span>' : ''}
          </div>
          <div class="listing-actions">
            <a href="${safeTel}" class="btn btn-primary btn-sm">📞 Call</a>
            ${telegramBtn}
          </div>
        </div>
      </div>
    `;
    }).join('');

    initWishlist();
    initListingCardClicks();
  } catch (err) {
    console.error('Failed to render listings:', err);
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger)">Failed to load listings. Please refresh.</div>';
  }
}

// ── SEARCH ────────────────────────────────────────────
// On listings.html, filters the page's own grid in place. On every
// other page (homepage, etc.), navigates to listings.html with the
// filters as URL params — loadAndRenderListings() there reads them
// via getFiltersFromUrl() and shows the matching results. This keeps
// the homepage's quick search connected to the full listings page
// (and matches the ?brand= URL the SearchAction schema advertises to
// Google) instead of only ever filtering the small homepage preview.
function initSearch() {
  const searchBtn = document.getElementById('searchBtn');
  if (!searchBtn) return;

  const onListingsPage = window.location.pathname.endsWith('listings.html');

  searchBtn.addEventListener('click', async () => {
    const type     = document.getElementById('filterType')?.value     || '';
    const brand    = document.getElementById('filterBrand')?.value    || '';
    const price    = parseInt(document.getElementById('filterPrice')?.value) || 0;
    const location = document.getElementById('filterLocation')?.value || '';

    if (!onListingsPage) {
      const params = new URLSearchParams();
      if (type)     params.set('type', type);
      if (brand)    params.set('brand', brand);
      if (price)    params.set('maxPrice', price);
      if (location) params.set('location', location);
      const qs = params.toString();
      window.location.href = 'listings.html' + (qs ? '?' + qs : '');
      return;
    }

    const grid = document.getElementById('listingsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">Searching...</div>';

    try {
      const filters = {};
      if (type)     filters.type     = type;
      if (brand)    filters.brand    = brand;
      if (price)    filters.maxPrice = price;
      if (location) filters.location = location;

      const listings = await loadListings(filters);
      if (!listings.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray-400)"><div style="font-size:48px;margin-bottom:12px">🔍</div><div>No listings match your search.</div></div>';
        return;
      }
      // Re-render with the filtered results (NOT the full unfiltered list)
      await renderListings(listings);
    } catch (err) {
      showToast('Search failed. Please try again.');
    }
  });
}

// ── TABS ──────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.listings-tabs')?.querySelectorAll('.tab-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('.listing-card').forEach(card => {
        const type     = card.dataset.type;
        const featured = card.dataset.featured === 'true';
        const show = filter === 'all'
          || (filter === 'featured' && featured)
          || filter === type;
        card.style.display = show ? '' : 'none';
      });
    });
  });
}

// ── COUNTER ANIMATION ─────────────────────────────────
// Animates a single counter element from 0 up to `target`.
function animateCounter(el, target) {
  const suffix = el.dataset.suffix || '';
  let start = 0;
  const step = target / (1800 / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.floor(start).toLocaleString('en-ET') + suffix;
    if (start >= target) clearInterval(timer);
  }, 16);
}

// Fetches live counts from Supabase, patches data-counter attributes,
// then kicks off the IntersectionObserver animation.
// Falls back to the hardcoded values already in the HTML if the fetch fails.
async function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  // Try to get real numbers — replace hardcoded fallbacks in HTML
  try {
    const stats = await getAdminStats();
    const listingEl = document.querySelector('[data-counter-key="listings"]');
    const sellerEl  = document.querySelector('[data-counter-key="sellers"]');
    if (listingEl) listingEl.dataset.counter = stats.approved ?? stats.total ?? listingEl.dataset.counter;
    if (sellerEl)  sellerEl.dataset.counter  = stats.sellers             ?? sellerEl.dataset.counter;
  } catch (e) {
    // Network/RLS error — silently keep the hardcoded fallback values
    console.warn('Hero stats fetch failed, using fallback values:', e);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCounter(el, parseInt(el.dataset.counter) || 0);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ── LISTING FORM — SAVES TO SUPABASE ─────────────────
function initListingForm() {
  const form       = document.getElementById('listingForm');
  const uploadArea = document.getElementById('uploadArea');
  const photosInput = document.getElementById('lPhotos');
  if (!form) return;

  let selectedFiles = [];

  // Single delegated click handler for the whole upload area:
  // - clicking empty space or the "change" link opens the file picker
  // - clicking a ✕ remove button only removes that photo (and must NOT
  //   also reopen the file picker, since it's nested inside uploadArea
  //   and a click there would otherwise bubble up into this same handler)
  uploadArea?.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.photo-remove-btn');
    if (removeBtn) {
      e.stopPropagation();
      const index = Number(removeBtn.dataset.index);
      selectedFiles.splice(index, 1);
      renderPhotoPreviews();
      return;
    }
    photosInput?.click();
  });

  // ── PHOTO PREVIEW in upload area ──────────────────
  function renderPhotoPreviews() {
    if (!uploadArea) return;
    if (!selectedFiles.length) {
      uploadArea.innerHTML = `<div class="upload-icon">📷</div><div class="upload-text">Click to upload photos (up to 8)</div>`;
      return;
    }
    uploadArea.innerHTML = `
      <div class="upload-text" style="margin-bottom:10px">${selectedFiles.length} photo${selectedFiles.length !== 1 ? 's' : ''} selected — <span class="upload-change-link" style="color:var(--teal);cursor:pointer">add more</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
        ${selectedFiles.map((f, i) => {
          const url = URL.createObjectURL(f);
          return `<div style="position:relative">
            <img src="${url}" style="width:72px;height:54px;object-fit:cover;border-radius:6px;border:2px solid rgba(0,201,167,0.3)" />
            <button type="button" class="photo-remove-btn" data-index="${i}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);border:none;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1">✕</button>
          </div>`;
        }).join('')}
      </div>`;
  }

  if (photosInput) {
    photosInput.addEventListener('change', () => {
      const newFiles = Array.from(photosInput.files);
      const combined = [...selectedFiles, ...newFiles];
      if (combined.length > 8) {
        showToast(`⚠️ Only 8 photos allowed — kept the first 8, dropped ${combined.length - 8}.`);
      }
      selectedFiles = combined.slice(0, 8);
      renderPhotoPreviews();
      // Reset the input's own value so picking the exact same file
      // again later still fires a change event (browsers otherwise
      // suppress it when the file list looks unchanged).
      photosInput.value = '';
    });
  }

  // ── PREVIEW STEP before submit ─────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) {
      showToast('⚠️ Please login first to post a listing.');
      openModal('loginModal');
      return;
    }

    const data = {
      type:        form.querySelector('#lVehicleType')?.value  || '',
      condition:   form.querySelector('#lCondition')?.value    || '',
      brand:       form.querySelector('#lBrand')?.value        || '',
      model:       form.querySelector('#lModel')?.value        || '',
      year:        parseInt(form.querySelector('#lYear')?.value)  || 0,
      mileage:     parseInt(form.querySelector('#lMileage')?.value) || 0,
      price:       parseInt(form.querySelector('#lPrice')?.value)   || 0,
      location:    form.querySelector('#lLocation')?.value     || '',
      phone:       form.querySelector('#lPhone')?.value        || '',
      description: form.querySelector('#lDesc')?.value         || '',
      sellerName:  currentUser.user_metadata?.full_name || currentUser.email || 'Seller'
    };

    const required = ['type','condition','brand','model','year','price','location','phone'];
    if (required.some(k => !data[k])) {
      showToast(t('err_required') || '⚠️ Please fill in all required fields.');
      return;
    }

    // Normalize and validate Ethiopian phone number using the shared
    // utility imported from supabase.js — single source of truth.
    const normalizedPhone = normalizeEthiopianPhone(data.phone);
    if (!normalizedPhone) {
      showToast(t('err_phone') || '⚠️ Please enter a valid Ethiopian phone number (e.g. 0912 345 678).');
      return;
    }
    data.phone = normalizedPhone;

    // Show preview modal instead of submitting directly
    showListingPreview(data, selectedFiles, async () => {
      // This callback runs when seller confirms from preview
      const btn = form.querySelector('[type=submit]');
      btn.textContent = selectedFiles.length ? t('uploading') : t('submitting');
      btn.disabled = true;
      try {
        await submitListing(data, selectedFiles, (pct, i, total) => {
          btn.textContent = `📷 Uploading photo ${i+1}/${total} (${pct}%)`;
        });
        closeModal('listingModal');
        closeModal('previewModal');
        showToast(t('submit_success'));
        form.reset();
        selectedFiles = [];
        renderPhotoPreviews();
      } catch (err) {
        console.error('Submit error:', err);
        showToast('❌ Failed to submit. Please try again.');
      } finally {
        btn.textContent = 'Submit Listing for Review';
        btn.disabled = false;
      }
    });
  });
}

// ── LOGIN MODAL — EMAIL/PASSWORD ──────────────────────
function initLogin() {
  onAuth(user => {
    currentUser = user;
    const loginBtns = document.querySelectorAll('[data-modal="loginModal"]');
    if (!loginBtns.length) return;
    loginBtns.forEach(loginBtn => {
      if (user) {
        loginBtn.textContent = t('login_logout');
        loginBtn.onclick = async () => { await logout(); showToast('Logged out.'); };
      } else {
        loginBtn.textContent = t('nav_login');
        loginBtn.onclick = () => openModal('loginModal');
      }
    });
  });

  // Wire up login form inside modal
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  // Add toggle between Login and Register
  const modalTitle = document.querySelector('#loginModal .modal-title');
  let isRegister = false;

  const toggleLink = document.createElement('p');
  toggleLink.style.cssText = 'text-align:center;font-size:13px;color:var(--gray-400);margin-top:12px;cursor:pointer';
  toggleLink.innerHTML = 'New seller? <span style="color:var(--teal)">Create an account</span>';
  loginForm.appendChild(toggleLink);

  toggleLink.addEventListener('click', () => {
    isRegister = !isRegister;
    if (modalTitle) modalTitle.textContent = isRegister ? 'Sign Up' : 'Login to Bridge Broker';
    toggleLink.innerHTML = isRegister
      ? 'Already have an account? <span style="color:var(--teal)">Login</span>'
      : 'New seller? <span style="color:var(--teal)">Create an account</span>';

    // Show/hide name field
    let nameGroup = document.getElementById('loginNameGroup');
    if (isRegister && !nameGroup) {
      nameGroup = document.createElement('div');
      nameGroup.id = 'loginNameGroup';
      nameGroup.className = 'form-group';
      nameGroup.innerHTML = '<label>Full Name *</label><input type="text" id="loginName" placeholder="Abebe Kebede" />';
      loginForm.insertBefore(nameGroup, loginForm.firstChild);
    } else if (!isRegister && nameGroup) {
      nameGroup.remove();
    }

    // Show forgot password only on login mode
    const forgotWrap = document.getElementById('forgotPasswordWrap');
    if (forgotWrap) forgotWrap.style.display = isRegister ? 'none' : 'block';
  });

  // Add "Forgot password?" link (login mode only)
  const forgotWrap = document.createElement('p');
  forgotWrap.id = 'forgotPasswordWrap';
  forgotWrap.style.cssText = 'text-align:right;font-size:12px;margin-top:-8px;margin-bottom:8px;';
  forgotWrap.innerHTML = '<a href="#" id="forgotPasswordLink" style="color:var(--teal);text-decoration:none;">Forgot password?</a>';
  // Insert before the submit button
  const submitBtn = loginForm.querySelector('[type=submit]');
  if (submitBtn) loginForm.insertBefore(forgotWrap, submitBtn);
  else loginForm.appendChild(forgotWrap);

  document.getElementById('forgotPasswordLink')?.addEventListener('click', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail')?.value?.trim();
    if (!email) { showToast('\u26a0\ufe0f Enter your email address first, then click Forgot password.'); return; }
    const link = document.getElementById('forgotPasswordLink');
    link.textContent = '\u23f3 Sending...';
    try {
      await sendPasswordReset(email);
      showToast('\ud83d\udce7 Password reset email sent! Check your inbox.');
      closeModal('loginModal');
    } catch (err) {
      showToast('\u274c ' + err.message);
    } finally {
      link.textContent = 'Forgot password?';
    }
  });

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    const name     = document.getElementById('loginName')?.value?.trim();
    const btn      = loginForm.querySelector('[type=submit]');

    if (!email || !password) { showToast('⚠️ Enter email and password.'); return; }

    btn.textContent = '⏳ Please wait...';
    btn.disabled = true;

    try {
      if (isRegister) {
        await register(email, password, name || '');
        showToast(t('register_success'));
      } else {
        await login(email, password);
        showToast(t('login_success'));
      }
      closeModal('loginModal');
    } catch (err) {
      showToast(`❌ ${err.message}`);
    } finally {
      btn.textContent = isRegister ? 'Sign Up' : 'Login';
      btn.disabled = false;
    }
  });
}

// ── MODALS ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}
function initModals() {
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay')?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, duration = 4000) {
  document.getElementById('bb-toast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'bb-toast';
  toast.style.cssText = `
    position:fixed;bottom:100px;left:50%;transform:translateX(-50%);
    background:var(--charcoal-light);border:1px solid rgba(0,201,167,0.3);
    color:var(--white);padding:12px 24px;border-radius:8px;font-size:14px;
    font-weight:500;z-index:3000;box-shadow:var(--shadow-card);
    animation:slideUp 0.3s ease;max-width:90vw;text-align:center;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
window.showToast  = showToast;
window.closeModal = closeModal;
window.openModal  = openModal;

// ── LISTING CARD NAVIGATION ───────────────────────────
// Clicking a card opens its full detail page. Clicks on the call,
// Telegram, or wishlist buttons inside the card are left alone (they
// already stopPropagation or have their own href) so they don't also
// trigger a navigation away from the page.
function initListingCardClicks() {
  document.querySelectorAll('.listing-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('a, button')) return;
      const id = card.dataset.id;
      if (id) window.location.href = `listing-detail.html?id=${encodeURIComponent(id)}`;
    });
  });
}

// ── WISHLIST ──────────────────────────────────────────
const wishlist = JSON.parse(localStorage.getItem('bb_wishlist') || '[]');
function initWishlist() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (!id) return;
    btn.textContent = wishlist.includes(id) ? '❤️' : '🤍';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const idx = wishlist.indexOf(id);
      if (idx === -1) { wishlist.push(id); btn.textContent = '❤️'; showToast('Added to favorites!'); }
      else { wishlist.splice(idx,1); btn.textContent = '🤍'; showToast('Removed from favorites.'); }
      localStorage.setItem('bb_wishlist', JSON.stringify(wishlist));
    });
  });
}

// ── NAVBAR SCROLL ─────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.style.borderBottomColor = window.scrollY > 20
      ? 'rgba(0,201,167,0.15)' : 'rgba(255,255,255,0.06)';
  }, { passive: true });

  // ── Mobile hamburger — toggles .nav-links open/closed ──
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('nav-links-open');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      hamburger.classList.toggle('active', isOpen);
    });
    // Close the menu after tapping a link, so it doesn't stay open
    // after navigating (or jumping to a same-page anchor).
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav-links-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.classList.remove('active');
      });
    });
  }
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
  initCounters();
  initTabs();
  initSearch();
  initModals();
  initListingForm();
  initLogin();
  initNavbar();
  initDelalaChat(t, currentLang);
  loadAndRenderListings();  // ← load real listings from Supabase

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      applyLanguage();
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
});

// ── LISTING PREVIEW MODAL ─────────────────────────────
function showListingPreview(data, files, onConfirm) {
  // Build or reuse preview modal
  let modal = document.getElementById('previewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'previewModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  // Generate photo previews
  const photoHTML = files.length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${files.map(f => `<img src="${URL.createObjectURL(f)}" style="width:90px;height:68px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,0.1)" />`).join('')}
       </div>`
    : `<div style="color:var(--gray-400);margin-bottom:16px;font-size:13px">No photos selected</div>`;

  const typeEmoji = { car:'🚗', motorcycle:'🏍️', bajaj:'🛺' }[data.type] || '🚗';

  // Escape all user-supplied fields before injecting into innerHTML.
  const pBrand     = escapeHtml(data.brand);
  const pModel     = escapeHtml(data.model);
  const pYear      = escapeHtml(String(data.year));
  const pLocation  = escapeHtml(data.location);
  const pCondition = escapeHtml(data.condition);
  const pMileage   = data.mileage ? escapeHtml(Number(data.mileage).toLocaleString('en-ET')) : null;
  // Description is free-text and the highest-risk field — escape it too.
  // It renders as plain text inside a <div>, so escaping is sufficient.
  const pDesc      = data.description ? escapeHtml(data.description) : null;

  modal.innerHTML = `
    <div style="background:var(--charcoal);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;width:100%;max-width:520px;margin:16px;max-height:90vh;overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <h2 style="font-size:20px">👁 Preview Your Listing</h2>
        <button onclick="closeModal('previewModal')" style="background:none;border:none;color:var(--gray-400);font-size:20px;cursor:pointer">✕</button>
      </div>
      <p style="color:var(--gray-400);font-size:13px;margin-bottom:20px">This is how your listing will look. Go back to edit anything.</p>

      <!-- Preview card -->
      <div style="background:var(--charcoal-light);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:20px">
        ${photoHTML}
        <div style="font-size:20px;font-weight:700;margin-bottom:6px">${typeEmoji} ${pBrand} ${pModel} ${pYear}</div>
        <div style="font-size:22px;font-weight:800;color:var(--teal);margin-bottom:12px">${Number(data.price).toLocaleString('en-ET')} ${t('currency') || 'ETB'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;color:var(--gray-400);margin-bottom:12px">
          <div>📍 ${pLocation}</div>
          <div>🔧 ${pCondition}</div>
          <div>📅 ${pYear}</div>
          ${pMileage ? `<div>🛣️ ${pMileage} KM</div>` : ''}
        </div>
        ${pDesc ? `<div style="font-size:13px;color:var(--gray-400);border-top:1px solid rgba(255,255,255,0.06);padding-top:10px">${pDesc}</div>` : ''}
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:var(--gray-400)">
          ⚠️ Your phone number will be replaced with broker number after admin approval
        </div>
      </div>

      <div style="display:flex;gap:10px">
        <button onclick="closeModal('previewModal')" class="btn btn-outline" style="flex:1;justify-content:center">✏️ Go Back & Edit</button>
        <button id="previewConfirmBtn" class="btn btn-primary" style="flex:1;justify-content:center">✅ Submit for Review</button>
      </div>
    </div>`;

  modal.classList.add('open');
  document.getElementById('previewConfirmBtn').addEventListener('click', () => {
    document.getElementById('previewConfirmBtn').textContent = 'Submitting…';
    document.getElementById('previewConfirmBtn').disabled = true;
    onConfirm();
  });
}

