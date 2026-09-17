# Block Bazaar — Panduan Pembayaran Realtime

## Kenapa butuh backend?

Website statis (HTML/CSS/JS saja) tidak bisa memproses pembayaran sungguhan
dengan aman. Payment gateway seperti Midtrans butuh **server key** rahasia
untuk membuat transaksi — kalau kunci itu ditaruh di kode frontend, siapa
saja yang membuka DevTools browser bisa mencurinya. Karena itu arsitekturnya
dipecah dua:

- **Frontend** (`index.html`, `checkout.html`, dll) — hanya pakai
  **client key** (aman untuk publik) dan memanggil backend lewat `fetch`.
- **Backend** (`/server`) — memegang **server key** rahasia, membuat
  transaksi ke Midtrans, dan menerima notifikasi status pembayaran.

## Bagaimana ini jadi "realtime"

1. Pembeli isi form checkout → frontend memanggil `POST /api/create-transaction`.
2. Backend menghitung ulang total harga sendiri (tidak percaya angka dari
   frontend), lalu minta Midtrans membuatkan token Snap.
3. Frontend membuka popup pembayaran Midtrans (Snap.js) memakai token itu.
4. Begitu pembeli membayar, **Midtrans mengirim notifikasi langsung ke
   backend** lewat `POST /api/midtrans-notification` — ini terjadi di sisi
   server-ke-server, jadi statusnya akurat walau pembeli menutup tab.
5. Frontend melakukan polling `GET /api/order-status/:orderId` tiap 3 detik
   selagi menampilkan layar "Menunggu Konfirmasi", dan otomatis pindah ke
   layar sukses begitu backend mencatat status `paid`.

Kalau backend belum kamu jalankan, frontend otomatis jatuh ke **mode demo**
(langsung menampilkan sukses palsu) supaya template tetap bisa dilihat
tanpa setup — tapi itu bukan transaksi sungguhan, hanya simulasi UI.

## Setup backend

1. Daftar akun di [midtrans.com](https://midtrans.com), aktifkan mode
   **Sandbox**, lalu ambil *Server Key* dan *Client Key* dari
   Settings → Access Keys.
2. Masuk folder server dan install dependency:
   ```
   cd server
   npm install
   ```
3. Salin `.env.example` jadi `.env`, isi dengan key sandbox kamu:
   ```
   cp .env.example .env
   ```
4. Jalankan server:
   ```
   npm start
   ```
   Backend akan jalan di `http://localhost:4000`.

## Setup frontend

1. Buka `checkout-payment.js`, isi:
   - `API_BASE_URL` → alamat backend kamu (default `http://localhost:4000`).
   - `MIDTRANS_CLIENT_KEY` → client key sandbox dari dashboard Midtrans.
2. Buka `index.html` lewat local server (mis. ekstensi Live Server di VS
   Code), bukan langsung dobel klik file — supaya `fetch` ke backend tidak
   diblokir CORS.
3. Pastikan origin yang kamu pakai untuk membuka frontend sama dengan
   `FRONTEND_ORIGIN` di `.env` backend.

## Supaya notifikasi webhook bisa diterima saat masih di localhost

Midtrans perlu mengirim notifikasi ke URL publik, sedangkan `localhost`
tidak bisa diakses dari internet. Untuk uji coba:

1. Jalankan `ngrok http 4000` (atau tool tunnel sejenis) untuk dapat URL publik.
2. Di dashboard Midtrans → Settings → Configuration, isi *Payment
   Notification URL* dengan `https://<url-ngrok-kamu>/api/midtrans-notification`.
3. Sekarang pembayaran sandbox akan benar-benar memicu update status di
   backend kamu secara realtime.

## Sebelum ke production

- Ganti `MIDTRANS_IS_PRODUCTION=true` dan pakai server key + client key
  **production** (bukan sandbox).
- Ganti `MIDTRANS_SNAP_URL` di `checkout-payment.js` ke
  `https://app.midtrans.com/snap/snap.js`.
- Ganti penyimpanan order dari `Map` in-memory ke database sungguhan, supaya
  data order tidak hilang tiap server restart.
- Jalankan backend di hosting yang punya HTTPS (Vercel/Railway/VPS + Nginx),
  karena payment gateway mensyaratkan koneksi terenkripsi.
