/* ============================================
   PAYMENT INTEGRATION (Midtrans Snap)
   ------------------------------------------------
   Cara pakai:
   1. Jalankan backend di folder /server (lihat README.md di sana).
   2. Isi API_BASE_URL di bawah dengan alamat backend kamu.
   3. Isi MIDTRANS_CLIENT_KEY dengan client key dari dashboard Midtrans
      (Settings > Access Keys). Client key AMAN ditaruh di frontend.
      Server key TIDAK PERNAH boleh ada di file frontend manapun.

   Kalau backend belum jalan, form ini otomatis jatuh ke "mode demo"
   supaya template tetap bisa dicoba tanpa setup backend dulu — tapi
   itu bukan transaksi sungguhan.
   ============================================ */
const API_BASE_URL = 'http://localhost:4000';
const MIDTRANS_CLIENT_KEY = 'SB-Mid-client-GANTI-DENGAN-CLIENT-KEY-ASLI';
const MIDTRANS_SNAP_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
// Untuk mode production Midtrans, ganti ke: https://app.midtrans.com/snap/snap.js

let snapScriptLoaded = false;

function loadSnapScript() {
  return new Promise((resolve, reject) => {
    if (snapScriptLoaded && window.snap) return resolve();
    const script = document.createElement('script');
    script.src = MIDTRANS_SNAP_URL;
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    script.onload = () => { snapScriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Gagal memuat Snap.js — cek koneksi atau client key.'));
    document.head.appendChild(script);
  });
}

async function isBackendReachable() {
  try {
    await fetch(`${API_BASE_URL}/api/order-status/ping`, { method: 'GET' });
    return true; // server merespons apapun isinya = server hidup
  } catch (e) {
    return false;
  }
}

function showView(viewId) {
  ['checkoutView', 'processingView', 'successView'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = (id !== viewId);
  });
}

function showProcessing(orderId) {
  showView('processingView');
  document.getElementById('processingOrderCode').textContent = orderId;
}

function showSuccess(orderId, username, isDemo) {
  showView('successView');
  document.getElementById('orderCode').textContent = orderId;
  document.getElementById('successUsername').textContent = username;
  const banner = document.getElementById('demoModeBanner');
  if (banner) banner.hidden = !isDemo;
}

/* Poll the backend so the UI reflects the real status pushed by Midtrans's
   webhook (server-to-server), not just what the Snap popup callback says.
   This is what makes the confirmation "realtime" instead of a fixed delay. */
function pollOrderStatus(orderId, username, { intervalMs = 3000, timeoutMs = 5 * 60 * 1000 } = {}) {
  const startedAt = Date.now();

  const timer = setInterval(async () => {
    if (Date.now() - startedAt > timeoutMs) {
      clearInterval(timer);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/order-status/${orderId}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === 'paid') {
        clearInterval(timer);
        localStorage.removeItem(CART_KEY);
        showSuccess(orderId, username, false);
      } else if (data.status === 'failed') {
        clearInterval(timer);
        showView('checkoutView');
        alert('Pembayaran gagal, dibatalkan, atau kedaluwarsa. Silakan coba lagi.');
      }
      // status masih 'pending' -> lanjut polling
    } catch (e) {
      // gangguan jaringan sesaat, coba lagi di interval berikutnya
    }
  }, intervalMs);
}

async function payWithMidtrans(cartEntries, buyer) {
  const items = cartEntries.map(([id, qty]) => ({ id, qty }));

  const res = await fetch(`${API_BASE_URL}/api/create-transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, buyer }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Gagal membuat transaksi di server.');
  }

  const { token, orderId } = await res.json();
  await loadSnapScript();

  window.snap.pay(token, {
    onSuccess: () => { showProcessing(orderId); pollOrderStatus(orderId, buyer.username); },
    onPending: () => { showProcessing(orderId); pollOrderStatus(orderId, buyer.username); },
    onError: () => { alert('Pembayaran gagal. Silakan coba lagi.'); },
    onClose: () => { /* pengguna menutup popup sebelum menyelesaikan pembayaran */ },
  });
}

function payDemo(username) {
  const orderCode = 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.removeItem(CART_KEY);
  showSuccess(orderCode, username, true);
}

function initCheckoutSubmit() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('mcUsername').value.trim();
    const email = document.getElementById('buyerEmail').value.trim();
    const server = document.getElementById('serverTarget').value;
    if (!username || !email || !server) return;

    const entries = Object.entries(getCart());
    if (entries.length === 0) {
      alert('Keranjang kamu masih kosong.');
      return;
    }

    const submitBtn = form.querySelector('.checkout-submit');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    try {
      const online = await isBackendReachable();
      if (online) {
        await payWithMidtrans(entries, { username, email, server });
      } else {
        payDemo(username);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

document.addEventListener('DOMContentLoaded', initCheckoutSubmit);
