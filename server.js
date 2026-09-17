require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const midtransClient = require('midtrans-client');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

// ------------------------------------------------------------------
// Katalog produk sisi server = sumber kebenaran untuk harga.
// Jangan pernah percaya harga yang dikirim dari frontend — client bisa
// dimodifikasi siapa saja lewat devtools.
// ------------------------------------------------------------------
const PRODUCTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf-8'));
const SERVICE_FEE = 2500;

function findProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}

// ------------------------------------------------------------------
// Penyimpanan order — ini in-memory (hilang tiap restart server).
// Untuk pemakaian sungguhan, ganti Map ini dengan database
// (Postgres/MySQL/MongoDB) supaya order tidak hilang saat server restart.
// ------------------------------------------------------------------
const orders = new Map();

// ------------------------------------------------------------------
// Client Midtrans Snap. isProduction, serverKey, dan clientKey diambil
// dari .env — jangan hardcode kunci asli langsung di kode ini.
// ------------------------------------------------------------------
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// ------------------------------------------------------------------
// POST /api/create-transaction
// Body: { items: [{ id, qty }], buyer: { username, email, server } }
// Menghitung ulang total di server, lalu minta Midtrans membuatkan
// token Snap untuk transaksi ini.
// ------------------------------------------------------------------
app.post('/api/create-transaction', async (req, res) => {
  try {
    const { items, buyer } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang kosong.' });
    }
    if (!buyer || !buyer.username || !buyer.email || !buyer.server) {
      return res.status(400).json({ error: 'Data pembeli tidak lengkap.' });
    }

    const itemDetails = [];
    let grossAmount = 0;

    for (const line of items) {
      const product = findProduct(line.id);
      if (!product) {
        return res.status(400).json({ error: `Produk tidak dikenal: ${line.id}` });
      }
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);
      itemDetails.push({ id: product.id, price: product.price, quantity: qty, name: product.name });
      grossAmount += product.price * qty;
    }

    itemDetails.push({ id: 'service-fee', price: SERVICE_FEE, quantity: 1, name: 'Biaya Layanan' });
    grossAmount += SERVICE_FEE;

    const orderId = 'BB-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: buyer.username,
        email: buyer.email,
      },
      custom_field1: buyer.server,
    };

    const transaction = await snap.createTransaction(parameter);

    orders.set(orderId, {
      status: 'pending',
      items: itemDetails,
      grossAmount,
      buyer,
      createdAt: new Date().toISOString(),
    });

    res.json({ token: transaction.token, orderId, redirectUrl: transaction.redirect_url });
  } catch (err) {
    console.error('create-transaction error:', err);
    res.status(500).json({ error: 'Gagal membuat transaksi. Coba lagi.' });
  }
});

// ------------------------------------------------------------------
// POST /api/midtrans-notification
// Ini dipanggil oleh SERVER Midtrans (bukan browser pembeli) setiap
// status pembayaran berubah — inilah bagian yang membuat statusnya
// benar-benar realtime, bukan sekadar delay di frontend.
// Daftarkan URL publik endpoint ini di dashboard Midtrans:
// Settings > Configuration > Payment Notification URL.
// ------------------------------------------------------------------
app.post('/api/midtrans-notification', async (req, res) => {
  try {
    const statusResponse = await snap.transaction.notification(req.body);
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    const order = orders.get(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order tidak ditemukan.' });
    }

    if (transactionStatus === 'capture') {
      order.status = fraudStatus === 'accept' ? 'paid' : 'pending';
    } else if (transactionStatus === 'settlement') {
      order.status = 'paid';
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      order.status = 'failed';
    } else if (transactionStatus === 'pending') {
      order.status = 'pending';
    }

    orders.set(orderId, order);
    res.status(200).send('OK');
  } catch (err) {
    console.error('notification error:', err);
    res.status(500).json({ error: 'Gagal memproses notifikasi.' });
  }
});

// ------------------------------------------------------------------
// GET /api/order-status/:orderId
// Dipanggil berkala (polling) oleh frontend supaya halaman checkout
// bisa langsung tahu begitu webhook di atas mengubah status order.
// ------------------------------------------------------------------
app.get('/api/order-status/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order tidak ditemukan.' });
  }
  res.json({ status: order.status });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Block Bazaar server jalan di http://localhost:${PORT}`);
});
