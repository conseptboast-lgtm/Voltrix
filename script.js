/* ============================================================
   VOLTRIX — Shared Helper Functions
   Loaded on every page AFTER supabase.js
   ============================================================ */

/* ---------- Navigation ---------- */
function go(url) {
  window.location.href = url;
}

/* ---------- Telegram ---------- */
function openTelegram() {
  window.open('https://t.me/sandrakbullouck', '_blank');
}

/* Legacy alias — old code calls openSupport() */
function openSupport() {
  openTelegram();
}

/* ---------- PWA Install ---------- */
var deferredPrompt = null;

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
});

function installApp() {
  // Already installed?
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    alert('✅ Voltrix is already installed on your device!');
    return;
  }

  // Android Chrome — native install prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(choice) {
      console.log('[PWA] User choice:', choice.outcome);
      deferredPrompt = null;
    });
    return;
  }

  // iOS Safari — manual instructions
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) {
    alert(
      '📲 To install Voltrix on iPhone:\n\n' +
      '1. Tap the Share button at the bottom\n' +
      '2. Scroll down → "Add to Home Screen"\n' +
      '3. Tap "Add"\n\n' +
      'Voltrix will appear on your home screen!'
    );
    return;
  }

  // Desktop / other
  alert(
    '📲 To install Voltrix:\n\n' +
    '• Android Chrome: ⋮ menu → "Install app"\n' +
    '• Desktop Chrome: install icon in address bar\n' +
    '• iPhone Safari: Share → "Add to Home Screen"'
  );
}

/* ---------- Legacy drawer helpers (compatibility) ---------- */
function openDrawer() {
  var d = document.getElementById('drawer');
  var o = document.getElementById('drawerOverlay');
  if (d) d.classList.add('open');
  if (o) o.classList.add('open');
}

function closeDrawer() {
  var d = document.getElementById('drawer');
  var o = document.getElementById('drawerOverlay');
  if (d) d.classList.remove('open');
  if (o) o.classList.remove('open');
}

/* Legacy alias — old code calls openSnapchat() */
function openSnapchat() {
  window.location.href = 'join-group.html';
}

/* ---------- Service Worker registration ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) {
        console.log('[PWA] Service Worker registered');
      })
      .catch(function(e) {
        console.warn('[PWA] SW registration failed:', e);
      });
  });
}

/* ---------- Boot log ---------- */
document.addEventListener('DOMContentLoaded', function() {
  console.log('[Voltrix] script.js loaded');
});

/* ⭐ SAFE COMMISSION CALCULATION LOGIC (UPDATED TO 10%) ⭐ */
function calculateDailyCommission(uplineVIPLevel, downlineVIPLevel, levelType) {
  // Define the base daily task earnings for each VIP level
  var dailyTaskEarnings = {
    1: 500,      // VIP1
    2: 1200,     // VIP2
    3: 2566.67,  // VIP3
    4: 4466.67,  // VIP4
    5: 7400,     // VIP5
    6: 15000,    // VIP6
    7: 18333.33, // VIP7
    8: 36666.67, // VIP8
    9: 80000     // VIP9
  };

  // Get the downline's daily earnings
  var downlineDaily = dailyTaskEarnings[downlineVIPLevel] || 0;

  // ⭐ UPDATED COMMISSION RATES (Level 1 is now 10%) ⭐
  var commissionRate = 0;
  if (levelType === 'A') commissionRate = 0.10; // 10% for Level 1
  if (levelType === 'B') commissionRate = 0.03; // 3% for Level 2
  if (levelType === 'C') commissionRate = 0.01; // 1% for Level 3

  // Calculate the final commission
  return downlineDaily * commissionRate;
}