// ══════════════════════════════════════════════════════
//  supabase.js  —  Bridge Broker Supabase Integration
//  No card needed — 100% free tier
// ══════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── YOUR SUPABASE CREDENTIALS ────────────────────────
const SUPABASE_URL  = 'https://xrmbzycasbzdaolvtuop.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_oJsugFsQVL7OvqKxjXzDfw_Z6UBoK9t';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── PHONE NORMALIZATION ───────────────────────────────
// Converts any Ethiopian phone format to +251XXXXXXXXX.
// Handles: 0912345678 / 251912345678 / +251912345678 / 09 123 456 78
// Returns null if the number doesn't look like a valid ET mobile number.
export function normalizeEthiopianPhone(raw) {
  if (!raw) return null;
  // Strip spaces, dashes, parentheses
  let digits = String(raw).replace(/[\s\-().]/g, '');
  // Already international with +
  if (digits.startsWith('+251')) digits = digits.slice(1); // drop +
  // Local 0-prefixed format → international
  if (digits.startsWith('0')) digits = '251' + digits.slice(1);
  // Must now be 251 followed by 9 digits starting with 7 or 9 (12 total).
  // Ethiopian mobile prefixes: 09xx (Safaricom ET, ethio telecom) and
  // 07xx (ethio telecom, additional range). Both normalise to 2517/9xxxxxxxx.
  if (!/^251[79]\d{8}$/.test(digits)) return null;
  return '+' + digits; // → +251XXXXXXXXX
}

// Validate and normalize; throws a user-friendly error if invalid.
export function requirePhone(raw, fieldName = 'Phone number') {
  const normalized = normalizeEthiopianPhone(raw);
  if (!normalized) throw new Error(`${fieldName} doesn't look like a valid Ethiopian mobile number (e.g. 0912 345 678)`);
  return normalized;
}

// ── PAYMENT API (Vercel) ──────────────────────────────
// Deploy the api/ folder to Vercel (same as the chatbot proxy —
// see README.md), then replace this with that deployment's URL,
// e.g. "https://bridge-broker-api.vercel.app". Keep this pointed
// at your OWN deployment — it holds your Chapa secret key.
const PAYMENT_API_BASE = 'https://bridge-proxy-9kwv.vercel.app';

// ── LISTINGS ─────────────────────────────────────────

/**
 * Submit a new vehicle listing (status = pending until admin approves)
 */
// ── IMAGE COMPRESSION ────────────────────────────────
// Resizes a File/Blob to fit within maxPx on the long edge and
// re-encodes as JPEG at the given quality (0–1). Returns a Blob.
// Uses an offscreen Canvas — works in all modern browsers and
// doesn't require any library. Typical savings on a phone camera
// photo: 4 MB → 180–350 KB before upload.
export function compressImage(file, { maxPx = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else                 { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas compression failed')),
        'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// Returns a Supabase Storage public URL with image transform parameters
// appended. Supabase's transform API resizes and converts to WebP on
// the fly, serving the result from their CDN.
//   size: 'thumb'  → 600 px wide,  quality 72  (listing cards)
//   size: 'detail' → 1200 px wide, quality 82  (modal / detail view)
// Falls back to the raw URL if the base URL isn't a Supabase storage URL.
export function photoUrl(rawUrl, size = 'thumb') {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    // Supabase storage transform endpoint: append /render/image/public
    // path pattern: /storage/v1/object/public/<bucket>/<file>
    if (!u.pathname.includes('/storage/v1/object/public/')) return rawUrl;
    const renderPath = u.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const params = size === 'detail'
      ? 'width=1200&quality=82&format=webp'
      : 'width=600&quality=72&format=webp';
    return `${u.origin}${renderPath}?${params}`;
  } catch {
    return rawUrl;
  }
}

export async function submitListing(data, photoFiles, onProgress) {
  // Attach the logged-in seller's user id (if any) so this listing's
  // "✓ Verified" badge can be looked up from their real seller profile.
  // Listings posted while logged out simply have no seller_id and
  // never show a Verified badge — which is correct, since there's no
  // verified identity to attach one to.
  const currentUser = await getCurrentUser();

  // 1. Upload photos first
  const photoUrls = [];
  for (let i = 0; i < photoFiles.length; i++) {
    const file = photoFiles[i];

    if (onProgress) onProgress(0, i, photoFiles.length);

    // Compress client-side before uploading: resize to ≤1600px on the
    // long edge and re-encode as JPEG at 82% quality. On a typical
    // phone photo (4–8 MB) this brings the upload down to 200–400 KB —
    // a ~10–20× reduction that matters a lot on Ethiopian mobile data.
    const compressed = await compressImage(file, { maxPx: 1600, quality: 0.82 });

    // Store under {user_id}/{timestamp}_{name}.jpg so each seller's
    // photos are isolated in their own folder. This lets RLS enforce
    // per-seller delete access (see sql/setup_fixes.sql) and prevents
    // admins from accidentally clearing another seller's images.
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const folder   = currentUser?.id ? `${currentUser.id}/` : 'anon/';
    const fileName = `${folder}${Date.now()}_${baseName}.jpg`;

    const { error } = await supabase.storage
      .from('listing-photos')
      .upload(fileName, compressed, {
        contentType: 'image/jpeg',
        cacheControl: '604800', // 7 days — photos don't change after upload
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('listing-photos')
      .getPublicUrl(fileName);

    photoUrls.push(urlData.publicUrl);
    if (onProgress) onProgress(100, i, photoFiles.length);
  }

  // 2. Insert listing row
  const { data: listing, error } = await supabase
    .from('listings')
    .insert([{
      type:         data.type,
      condition:    data.condition,
      brand:        data.brand,
      model:        data.model,
      year:         data.year,
      mileage:      data.mileage || 0,
      transmission: data.transmission,
      fuel:         data.fuel,
      price:        data.price,
      location:     data.location,
      phone:        normalizeEthiopianPhone(data.phone) || data.phone,
      description:  data.description,
      seller_name:  data.sellerName || 'Anonymous',
      seller_id:    currentUser?.id || null,
      photos:       photoUrls,
      status:       'pending',
      featured:     false,
      views:        0
    }])
    .select()
    .single();

  if (error) throw error;
  return listing.id;
}

/**
 * Get a single approved listing by id, for the listing detail page.
 */
export async function getListingById(id) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Load approved listings with optional filters
 */
export async function loadListings(filters = {}) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.type)      query = query.eq('type', filters.type);
  if (filters.location)  query = query.eq('location', filters.location);
  if (filters.maxPrice)  query = query.lte('price', filters.maxPrice);
  if (filters.condition) query = query.eq('condition', filters.condition);
  if (filters.brand) {
    // filters.brand can come straight from a public URL query string
    // (?brand=...) — e.g. shared links, the homepage JSON-LD SearchAction,
    // or someone hand-crafting the URL. PostgREST's .or() filter syntax
    // treats comma/parentheses/period as structural characters (clause
    // separators, grouping, operator separators), so passing it through
    // unsanitized lets a crafted value inject extra filter clauses or
    // malform the query. Strip everything except letters, numbers,
    // spaces and a few harmless punctuation marks before it's used —
    // more than enough for any real brand/model search term.
    const safeBrand = String(filters.brand).replace(/[^\p{L}\p{N} \-]/gu, '').trim().slice(0, 60);
    if (safeBrand) {
      query = query.or(
        `brand.ilike.%${safeBrand}%,model.ilike.%${safeBrand}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get the current logged-in seller's own listings (any status),
 * used by the seller dashboard — including for picking which
 * listing to upgrade to Featured.
 */
export async function getMyListings() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Get pending listings for admin review
 */
export async function getPendingListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Approve a listing (admin)
 */
export async function approveListing(id) {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'approved' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Reject a listing (admin)
 */
export async function rejectListing(id) {
  const { error } = await supabase
    .from('listings')
    .update({ status: 'rejected' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Increment view count on a listing
 */
export async function incrementViews(id) {
  await supabase.rpc('increment_views', { listing_id: id });
}

/**
 * Start a "Featured Listing" payment via Chapa.
 *
 * IMPORTANT: this does NOT mark the listing as featured itself —
 * it can't, because listings can only be updated by an admin (see
 * RLS policies in sql/setup_admin_security.sql). It calls the
 * api/payment-init serverless function, which creates a pending
 * payment record and returns a Chapa checkout URL. The listing only
 * actually becomes featured after Chapa confirms payment server-to-
 * server via the webhook in api/payment-webhook.js. Redirect the
 * browser to the returned checkout_url to continue.
 *
 * plan: 'featured_1week' | 'featured_4weeks'
 */
export async function startFeaturedPayment(listingId, plan) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in.');

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Your session expired — please log in again.');

  const res = await fetch(`${PAYMENT_API_BASE}/api/payment-init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingId,
      plan,
      email: user.email,
      firstName: user.user_metadata?.full_name?.split(' ')?.[0] || 'Bridge',
      lastName: user.user_metadata?.full_name?.split(' ')?.slice(1).join(' ') || 'Broker',
      phone: user.phone || undefined,
      returnUrl: `${window.location.origin}/seller-dashboard.html?payment=processing`,
      accessToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not start payment.');
  return data; // { checkout_url, tx_ref }
}

/**
 * Poll the status of a payment after returning from Chapa's checkout
 * page. Call repeatedly (e.g. every 2s) until status is no longer
 * 'pending', then stop.
 */
export async function getPaymentStatus(txRef) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Your session expired — please log in again.');

  const res = await fetch(
    `${PAYMENT_API_BASE}/api/payment-status?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Could not check payment status.');
  return res.json(); // { status, plan, amount, currency, method, completed_at }
}

// ── AUTH (Email/Password — Phone OTP needs paid plan) ─

/**
 * Register a new seller account
 */
export async function register(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });
  if (error) throw error;
  return data.user;
}

/**
 * Login existing seller
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  });
  if (error) throw error;
  return data.user;
}

/**
 * Send a password-reset email.
 * Supabase emails a link; clicking it returns the user to the app
 * with a recovery token so they can set a new password.
 */
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/seller-dashboard.html`,
  });
  if (error) throw error;
}

/**
 * Set a new password after the user has clicked the reset link.
 * Must be called while the recovery session is active.
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Logout
 */
export async function logout() {
  await supabase.auth.signOut();
}

/**
 * Listen to auth state changes
 */
export function onAuth(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  // Also fire immediately with current session
  supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user || null);
  });
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user || null;
}

/**
 * Check whether the currently logged-in user is an admin.
 * Relies on the `admins` table + RLS — this is a convenience check
 * for the UI, not the actual security boundary (the database policies
 * are what really enforce it, see sql/setup_admin_security.sql).
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

// ── SELLER VERIFICATION ───────────────────────────────

/**
 * Get the current seller's profile row (creates it on first call
 * if it doesn't exist yet, always starting unverified).
 */
export async function getOrCreateSellerProfile(displayName, phone) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in.');

  const { data: existing, error: readErr } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from('sellers')
    .insert([{
      user_id: user.id,
      display_name: displayName || user.email,
      phone: normalizeEthiopianPhone(phone) || phone || null,
      verified: false
    }])
    .select()
    .single();
  if (insertErr) throw insertErr;
  return created;
}

/**
 * Look up verified status for a list of seller user_ids in one call.
 * Returns a Map<user_id, boolean>. Used to render real "✓ Verified"
 * badges on listing cards instead of hardcoded ones.
 */
export async function getVerifiedMap(userIds) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from('sellers')
    .select('user_id, verified')
    .in('user_id', ids);
  if (error) throw error;

  return new Map((data || []).map(s => [s.user_id, s.verified]));
}

/**
 * Submit a verification request with an ID/license document.
 * File is uploaded to the private 'verification-docs' bucket under
 * the seller's own user id, then a row is added to
 * verification_requests with status 'pending'.
 */
export async function submitVerificationRequest({ fullName, phone, note }, idFile) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in.');

  let idDocumentUrl = null;
  if (idFile) {
    // Sanitize the filename before using it in the storage path.
    // idFile.name is user-controlled and could contain path separators
    // (e.g. "../../evil.js") or unusual characters. Strip everything
    // except alphanumeric, dots, underscores and hyphens, and cap
    // length so the full path stays well under 1024 chars.
    const safeName = idFile.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // replace bad chars with _
      .replace(/\.+/g, '.')              // collapse repeated dots
      .replace(/^[._-]+/, '')             // strip leading dots/dashes
      .slice(0, 80);                      // max 80 chars for filename part
    const path = `${user.id}/${Date.now()}_${safeName || 'document'}`;
    const { error: uploadErr } = await supabase.storage
      .from('verification-docs')
      .upload(path, idFile, { cacheControl: '3600', upsert: false });
    if (uploadErr) throw uploadErr;
    idDocumentUrl = path; // stored as path; admins fetch via signed URL
  }

  const { data, error } = await supabase
    .from('verification_requests')
    .insert([{
      user_id: user.id,
      full_name: fullName,
      phone: normalizeEthiopianPhone(phone) || phone,
      id_document_url: idDocumentUrl,
      note: note || null,
      status: 'pending'
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Get the current seller's most recent verification request status
 * (so the UI can show "Pending review" / "Rejected — resubmit" etc).
 */
export async function getMyVerificationStatus() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * ADMIN: list pending verification requests.
 */
export async function getPendingVerifications() {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * ADMIN: get a temporary signed URL to view a seller's uploaded
 * ID/license document (bucket is private).
 */
export async function getVerificationDocUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(path, 60 * 10); // valid 10 minutes
  if (error) throw error;
  return data.signedUrl;
}

/**
 * ADMIN: approve a verification request — marks the request approved
 * AND flips sellers.verified = true. Both writes are guarded by RLS
 * so only an account in the `admins` table can do this.
 */
export async function approveVerification(requestId, userId) {
  const admin = await getCurrentUser();
  if (!admin) throw new Error('Not logged in.');

  const { error: reqErr } = await supabase
    .from('verification_requests')
    .update({ status: 'approved', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (reqErr) throw reqErr;

  const { error: sellerErr } = await supabase
    .from('sellers')
    .update({ verified: true, verified_at: new Date().toISOString(), verified_by: admin.id })
    .eq('user_id', userId);
  if (sellerErr) throw sellerErr;
}

/**
 * ADMIN: reject a verification request (does not touch verified status).
 */
export async function rejectVerification(requestId) {
  const admin = await getCurrentUser();
  if (!admin) throw new Error('Not logged in.');

  const { error } = await supabase
    .from('verification_requests')
    .update({ status: 'rejected', reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
}

// ── ADMIN STATS ───────────────────────────────────────

export async function getAdminStats() {
  const [total, pending, approved, sellers] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('sellers').select('user_id', { count: 'exact', head: true }).eq('verified', true),
  ]);
  return {
    total:    total.count    || 0,
    pending:  pending.count  || 0,
    approved: approved.count || 0,
    sellers:  sellers.count  || 0,
  };
}

// ── BANK PAYOUT DETAILS ───────────────────────────────

/**
 * Load the current seller's saved bank payout details.
 */
export async function getMyBankDetails() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in.');

  const { data, error } = await supabase
    .from('sellers')
    .select('bank_account_name, bank_account_number, bank_code, bank_updated_at')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no row
  return data || null;
}

/**
 * Save / update the current seller's bank payout details.
 * Upserts so it works even if the seller row doesn't exist yet.
 */
export async function saveMyBankDetails({ bankAccountName, bankAccountNumber, bankCode }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in.');

  // Ensure seller row exists first (getOrCreateSellerProfile handles this)
  await getOrCreateSellerProfile(
    user.user_metadata?.full_name || user.email,
    null
  );

  const { error } = await supabase
    .from('sellers')
    .update({
      bank_account_name:   bankAccountName.trim(),
      bank_account_number: bankAccountNumber.trim(),
      bank_code:           bankCode,
      bank_updated_at:     new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) throw error;
}
