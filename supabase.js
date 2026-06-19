// ══════════════════════════════════════════════════════
//  supabase.js  —  Bridge Broker Supabase Integration
//  No card needed — 100% free tier
// ══════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── YOUR SUPABASE CREDENTIALS ────────────────────────
const SUPABASE_URL  = 'https://xrmbzycasbzdaolvtuop.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_EIjYMLjXtbdfL-J1gs-B4g_DPjL0qzh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── LISTINGS ─────────────────────────────────────────

/**
 * Submit a new vehicle listing (status = pending until admin approves)
 */
export async function submitListing(data, photoFiles, onProgress) {
  // 1. Upload photos first
  const photoUrls = [];
  for (let i = 0; i < photoFiles.length; i++) {
    const file = photoFiles[i];
    const fileName = `${Date.now()}_${file.name}`;

    if (onProgress) onProgress(0, i, photoFiles.length);

    const { data: uploadData, error } = await supabase.storage
      .from('listing-photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

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
      phone:        data.phone,
      description:  data.description,
      seller_name:  data.sellerName || 'Anonymous',
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
 * Load approved listings with optional filters
 */
export async function loadListings(filters = {}) {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'approved')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.type)     query = query.eq('type', filters.type);
  if (filters.location) query = query.eq('location', filters.location);
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
  if (filters.brand)    query = query.or(
    `brand.ilike.%${filters.brand}%,model.ilike.%${filters.brand}%`
  );

  const { data, error } = await query;
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
 * Feature a listing after payment
 */
export async function featureListing(id, weeks = 1) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + weeks * 7);
  const { error } = await supabase
    .from('listings')
    .update({ featured: true, featured_expires_at: expiresAt.toISOString() })
    .eq('id', id);
  if (error) throw error;
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

// ── ADMIN STATS ───────────────────────────────────────

export async function getAdminStats() {
  const [total, pending, approved] = await Promise.all([
    supabase.from('listings').select('id', { count: 'exact', head: true }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ]);
  return {
    total:    total.count    || 0,
    pending:  pending.count  || 0,
    approved: approved.count || 0,
  };
}
