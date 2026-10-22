/* =========================================
   VOLTRIX — SUPABASE DATABASE CONNECTION
========================================= */

const SUPABASE_URL = 'https://qpvwyjcuawxdtdjkedgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_G4B1DbyYH8cf1F8WOker5g_rChJx-oS';

// --- INITIALIZATION ---
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  console.error('❌ VOLTRIX ERROR: Supabase library did not load. Did you forget to add the <script> tag for Supabase in your HTML?');
  window.db = null;
} else {
  try {
    window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ VOLTRIX: Supabase connected successfully.');
  } catch (error) {
    console.error('❌ VOLTRIX ERROR: Failed to create Supabase client.', error);
    window.db = null;
  }
}

const supabaseClient = window.db;

function requireDb() { 
  if (!supabaseClient) {
    console.error("❌ Database is not connected. Cannot perform this action.");
  }
  return supabaseClient; 
}

// --- AUTH & SECURITY HELPERS ---
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(String(salt)), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(input, storedHash, salt) {
  const actualHash = await hashPassword(input, salt);
  const stored = String(storedHash || '');
  if (actualHash.length !== stored.length) return false;
  let difference = 0;
  for (let i = 0; i < actualHash.length; i++) difference |= actualHash.charCodeAt(i) ^ stored.charCodeAt(i);
  return difference === 0;
}

function newUserId() { 
  return 'V' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100); 
}

function newReferralCode(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return 'V' + digits.slice(-6) + Math.floor(Math.random() * 90 + 10);
}

// --- DATA MAPPING ---
function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id, 
    userId: user.user_id, 
    fullName: user.full_name,
    firstName: (user.full_name || 'User').trim().split(/\s+/)[0],
    phone: user.phone, 
    email: user.email || '', 
    facePhotoUrl: user.face_photo_url || '',
    faceVerified: Boolean(user.face_verified), 
    bankName: user.bank_name || '',
    bankAccount: user.bank_account || '', 
    bankHolder: user.bank_holder || '',
    pin: user.pin || '', 
    balance: Number(user.balance) || 0,
    totalEarned: Number(user.total_earned) || 0, 
    todayProfit: Number(user.today_profit) || 0,
    yesterdayProfit: Number(user.yesterday_profit) || 0, 
    totalProfit: Number(user.total_profit) || 0,
    tasksCompletedToday: Number(user.tasks_completed_today) || 0,
    chargeProgress: Number(user.charge_progress) || 0, 
    lastTaskDate: user.last_task_date || null,
    currentLevel: user.current_level || 'Slot 0', 
    spinCount: Number(user.spin_count) || 0, 
    lastCheckinDate: user.last_checkin_date || null,
    lastWithdrawalDate: user.last_withdrawal_date || null, 
    referralCode: user.referral_code || '',
    referredBy: user.referred_by || '', 
    referralCount: Number(user.referral_count) || 0,
    referralEarnings: Number(user.referral_earnings) || 0, 
    banned: Boolean(user.banned),
    banReason: user.ban_reason || '', 
    totalDeposit: Number(user.total_deposit) || 0,
    createdAt: user.created_at
  };
}

// --- SESSION MANAGEMENT ---
function setSession(userId) { localStorage.setItem('voltrix_user', String(userId)); }
function getSession() { return localStorage.getItem('voltrix_user'); }
function clearSession() { localStorage.removeItem('voltrix_user'); }

async function getCurrentUser() {
  const userId = getSession(); 
  if (!userId) return null;
  return await dbGetUser(userId);
}

async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    clearSession();
    if (location.pathname && !/index\.html?$/.test(location.pathname) && !/login\.html?$/.test(location.pathname)) location.href = 'login.html';
    return null;
  }
  if (user.banned) {
    clearSession(); 
    alert('Your account has been restricted. ' + (user.banReason || 'Please contact support.'));
    location.href = 'login.html'; 
    return null;
  }
  return user;
}

function logout() { 
  clearSession(); 
  location.href = 'login.html'; 
}

// --- DATABASE QUERIES ---
async function dbGetUserRowByPhone(phone) {
  try {
    const { data, error } = await requireDb().from('users').select('*').eq('phone', phone).limit(1);
    if (error) {
      console.error("Supabase Error (dbGetUserRowByPhone):", error);
      return { _queryError: true, error: error };
    }
    return data && data.length ? data[0] : null;
  } catch (error) { 
    console.error("Catch Error (dbGetUserRowByPhone):", error);
    return { _queryError: true, error: error }; 
  }
}

async function dbGetUser(userId) {
  try {
    const { data, error } = await requireDb().from('users').select('*').eq('user_id', userId).limit(1);
    if (error) {
      console.error("Supabase Error (dbGetUser):", error);
      return null;
    }
    return data && data.length ? normalizeUser(data[0]) : null;
  } catch (error) { 
    console.error("Catch Error (dbGetUser):", error);
    return null; 
  }
}

async function dbValidateReferralCode(code) {
  if (!code) return null;
  try {
    const { data, error } = await requireDb().from('users').select('user_id').eq('referral_code', code).limit(1);
    if (error) return null;
    return data && data.length ? data[0].user_id : null;
  } catch (error) { return null; }
}

async function dbCreateUser({ fullName, phone, email, password, referredBy, facePhotoUrl }) {
  try {
    if (!String(fullName || '').trim() || !String(phone || '').trim() || !String(password || '')) {
      return { error: 'MISSING_FIELDS' };
    }
    
    const existing = await dbGetUserRowByPhone(phone);
    if (existing && existing._queryError) return { error: 'DATABASE_CHECK_FAILED' };
    if (existing) return { error: 'PHONE_TAKEN' };
    
    const userId = newUserId();
    const passwordHash = await hashPassword(password, phone);
    const row = { 
      user_id: userId, 
      full_name: String(fullName).trim(), 
      phone: String(phone).trim(), 
      email: email ? String(email).trim() : null, 
      password_hash: passwordHash, 
      referral_code: newReferralCode(phone), 
      referred_by: referredBy || null, 
      face_photo_url: facePhotoUrl || null, 
      face_verified: false 
    };
    
    const { data, error } = await requireDb().from('users').insert([row]).select();
    
    if (error) {
      console.error("Supabase Insert Error (dbCreateUser):", error);
      return { error: 'CREATE_FAILED', details: error.message };
    }
    if (!data || !data.length) return { error: 'CREATE_FAILED' };
    
    return normalizeUser(data[0]);
  } catch (error) { 
    console.error("Catch Error (dbCreateUser):", error);
    return { error: 'CREATE_FAILED', details: error.message }; 
  }
}

async function dbUpdateUser(userId, updates) {
  try {
    const { data, error } = await requireDb().from('users').update(updates).eq('user_id', userId).select();
    if (error) { 
      console.error("DB Update Error:", error);
      return { error: error.message }; 
    }
    return data && data.length ? normalizeUser(data[0]) : null;
  } catch (error) { 
    console.error("Catch Error (dbUpdateUser):", error);
    return { error: error.message }; 
  }
}

async function dbGetDeposits(userId) {
  try { 
    const { data } = await requireDb().from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }); 
    return data || []; 
  } catch (e) { 
    console.error("dbGetDeposits Error:", e);
    return []; 
  }
}

async function dbCreateDeposit(deposit) {
  try { 
    const { data } = await requireDb().from('deposits').insert([deposit]).select(); 
    return data && data.length ? data[0] : null; 
  } catch (e) { 
    console.error("dbCreateDeposit Error:", e);
    return null; 
  }
}

async function dbGetWithdrawals(userId) {
  try { 
    const { data } = await requireDb().from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }); 
    return data || []; 
  } catch (e) { 
    console.error("dbGetWithdrawals Error:", e);
    return []; 
  }
}

async function dbCreateWithdrawal(withdrawal) {
  try { 
    const { data } = await requireDb().from('withdrawals').insert([withdrawal]).select(); 
    return data && data.length ? data[0] : null; 
  } catch (e) { 
    console.error("dbCreateWithdrawal Error:", e);
    return null; 
  }
}

// --- UTILITIES ---
function formatNaira(amount) { 
  return '₦' + Number(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 }); 
}