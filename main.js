// ══════════════════════════════════════════════════════
//  main.js  —  Bridge Broker (Supabase version)
//  Add this to your js/ folder and update script tags
//  to: <script type="module" src="js/main.js"></script>
// ══════════════════════════════════════════════════════

import { submitListing, loadListings, login, register, logout, onAuth } from './supabase.js';
import { askDelala, initDelalaChat } from './delala-ai.js';

// ── LANGUAGE SYSTEM ──────────────────────────────────
const translations = {
  en: {
    nav_login: "Login", nav_post: "Post Listing",
    hero_btn_browse: "Browse Vehicles", hero_btn_sell: "List Your Vehicle",
    search_btn: "Search",
    chat_greeting: "👋 Welcome to Bridge Broker! I'm Delala AI. Are you looking for a 🚗 Car, 🏍️ Motorcycle, or 🛺 Bajaj today?",
    chat_placeholder: "Type your message...",
    uploading: "Uploading photos...", submitting: "Submitting...",
    submit_success: "✅ Listing submitted! We will review and publish within 24 hours.",
    login_success: "✅ Logged in!", login_logout: "Logout",
    register_success: "✅ Account created! Check your email to confirm.",
  },
  am: {
    nav_login: "ግባ", nav_post: "ዝርዝር ለጥፍ",
    hero_btn_browse: "ተሽከርካሪዎች ይመልከቱ", hero_btn_sell: "ዝርዝርዎን ይለጥፉ",
    search_btn: "ፈልግ",
    chat_greeting: "👋 እንኳን ደህና መጡ! እኔ ደላላ AI ነኝ። ዛሬ 🚗 መኪና፣ 🏍️ ሞተርሳይክል ወይም 🛺 ባጃጅ ይፈልጋሉ?",
    chat_placeholder: "መልእክትዎን ይጻፉ...",
    uploading: "ፎቶዎች እየጫኑ...", submitting: "እያስገቡ...",
    submit_success: "✅ ዝርዝሩ ተልኳል! በ24 ሰዓት ውስጥ እናጸድቃለን።",
    login_success: "✅ ተገብቷል!", login_logout: "ውጣ",
    register_success: "✅ መለያ ተፈጥሯል! ኢሜልዎን ያረጋግጡ።",
  }
};

let currentLang = localStorage.getItem('bb_lang') || 'en';
let currentUser  = null;

function t(key) {
  return translations[currentLang][key] || translations['en'][key] || key;
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.body.classList.toggle('lang-am', currentLang === 'am');
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  localStorage.setItem('bb_lang', currentLang);
}

// ── LOAD REAL LISTINGS FROM SUPABASE ─────────────────
async function loadAndRenderListings() {
  const grid = document.getElementById('listingsGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">Loading listings...</div>';

  try {
    const listings = await loadListings();
    if (!listings.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400)">No listings found.</div>';
      return;
    }

    grid.innerHTML = listings.map(l => `
      <div class="listing-card" data-id="${l.id}" data-type="${l.type}" data-price="${l.price}"
           data-brand="${l.brand}" data-location="${l.location}" data-featured="${l.featured}">
        <div class="listing-img" style="background:var(--charcoal-light);position:relative">
          ${l.photos?.length
            ? `<img src="${l.photos[0]}" alt="${l.brand} ${l.model}" class="listing-img-photo" />`
            : `<div style="display:flex;align-items:center;justify-content:center;height:200px;font-size:48px">
                 ${l.type === 'car' ? '🚗' : l.type === 'motorcycle' ? '🏍️' : '🛺'}
               </div>`
          }
          ${l.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
          <button class="wishlist-btn" data-id="${l.id}" aria-label="Save to favorites">🤍</button>
        </div>
        <div class="listing-body">
          <div class="listing-title">${l.brand} ${l.model} ${l.year}</div>
          <div class="listing-price">${Number(l.price).toLocaleString()} ETB</div>
          <div class="listing-meta">
            <span>📍 ${l.location}</span>
            <span>👁 ${l.views} views</span>
          </div>
          <div class="listing-seller">
            <span>${l.seller_name || 'Seller'}</span>
          </div>
          <div class="listing-actions">
            <a href="tel:${l.phone}" class="btn btn-primary btn-sm">📞 Call</a>
            <a href="https://t.me/share/url?text=${encodeURIComponent(`${l.brand} ${l.model} ${l.year} — ${Number(l.price).toLocaleString()} ETB`)}" 
               class="btn btn-outline btn-sm" target="_blank">✈️ Telegram</a>
          </div>
        </div>
      </div>
    `).join('');

    initWishlist();
  } catch (err) {
    console.error('Failed to load listings:', err);
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger)">Failed to load listings. Please refresh.</div>';
  }
}

// ── SEARCH ────────────────────────────────────────────
function initSearch() {
  const searchBtn = document.getElementById('searchBtn');
  if (!searchBtn) return;
  searchBtn.addEventListener('click', async () => {
    const type     = document.getElementById('filterType')?.value     || '';
    const brand    = document.getElementById('filterBrand')?.value    || '';
    const price    = parseInt(document.getElementById('filterPrice')?.value) || 0;
    const location = document.getElementById('filterLocation')?.value || '';

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
      // Re-render with filtered results
      await loadAndRenderListings();
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
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.counter);
        const suffix = el.dataset.suffix || '';
        let start = 0;
        const step = target / (1800 / 16);
        const timer = setInterval(() => {
          start = Math.min(start + step, target);
          el.textContent = Math.floor(start).toLocaleString() + suffix;
          if (start >= target) clearInterval(timer);
        }, 16);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

// ── LISTING FORM — SAVES TO SUPABASE ─────────────────
function initListingForm() {
  const form       = document.getElementById('listingForm');
  const uploadArea = document.querySelector('.upload-area');
  const photosInput = document.getElementById('lPhotos');
  if (!form) return;

  let selectedFiles = [];

  if (photosInput) {
    photosInput.addEventListener('change', () => {
      selectedFiles = Array.from(photosInput.files);
      if (uploadArea) {
        uploadArea.innerHTML = `
          <div class="upload-icon">📷</div>
          <div class="upload-text">${selectedFiles.length} photo${selectedFiles.length !== 1 ? 's' : ''} selected</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
            ${selectedFiles.map(f => `<span style="font-size:12px;background:rgba(0,201,167,0.15);padding:3px 8px;border-radius:4px;color:var(--teal)">${f.name}</span>`).join('')}
          </div>
        `;
      }
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!currentUser) {
      showToast('⚠️ Please login first to post a listing.');
      openModal('loginModal');
      return;
    }

    const btn  = form.querySelector('[type=submit]');
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
      showToast('⚠️ Please fill in all required fields.');
      return;
    }

    btn.textContent = selectedFiles.length ? t('uploading') : t('submitting');
    btn.disabled = true;

    try {
      await submitListing(data, selectedFiles, (pct, i, total) => {
        btn.textContent = `📷 Uploading photo ${i+1}/${total} (${pct}%)`;
      });
      closeModal('listingModal');
      showToast(t('submit_success'));
      form.reset();
      selectedFiles = [];
    } catch (err) {
      console.error('Submit error:', err);
      showToast('❌ Failed to submit. Please try again.');
    } finally {
      btn.textContent = 'Submit Listing for Review';
      btn.disabled = false;
    }
  });
}

// ── LOGIN MODAL — EMAIL/PASSWORD ──────────────────────
function initLogin() {
  onAuth(user => {
    currentUser = user;
    const loginBtn = document.querySelector('[data-modal="loginModal"]');
    if (!loginBtn) return;
    if (user) {
      loginBtn.textContent = t('login_logout');
      loginBtn.onclick = async () => { await logout(); showToast('Logged out.'); };
    } else {
      loginBtn.textContent = t('nav_login');
      loginBtn.onclick = () => openModal('loginModal');
    }
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
    if (modalTitle) modalTitle.textContent = isRegister ? 'Create Seller Account' : 'Login to Bridge Broker';
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
      btn.textContent = isRegister ? 'Create Account' : 'Login';
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
