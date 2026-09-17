/* ============================================
   PIXEL ICON SYSTEM
   Each icon is an 8x8 grid of characters mapped
   to a local palette. '.' = transparent.
   Rendered as inline SVG rects (original artwork).
   ============================================ */
const PIXEL_ICONS = {
  coin: {
    palette: { g:'#B8860B', G:'#F4C430', w:'#FFE694' },
    rows: [
      "..gggg..",
      ".gGGGGg.",
      "gGGwwGGg",
      "gGwwwwGg",
      "gGwwwwGg",
      "gGGwwGGg",
      ".gGGGGg.",
      "..gggg..",
    ]
  },
  sword: {
    palette: { b:'#C7CDD1', h:'#7A4B2A', o:'#0D0D10' },
    rows: [
      "..bb....",
      "..bb....",
      "..bb....",
      "..bb....",
      ".hhhhh..",
      "..hbh...",
      ".h..h...",
      "h....h..",
    ]
  },
  armor: {
    palette: { m:'#4A4550', D:'#F4C430', s:'#5B5563' },
    rows: [
      ".mm..mm.",
      "mssssssm",
      "mDssssDm",
      "msssssm.",
      ".mssssm.",
      "..mssm..",
      "..mssm..",
      "........",
    ]
  },
  elytra: {
    palette: { w:'#3B2A55', p:'#7A4FA0' },
    rows: [
      "w......w",
      "ww....ww",
      ".wp..pw.",
      "..wwww..",
      ".wpwwpw.",
      "wwwwwwww",
      "ww....ww",
      "w......w",
    ]
  },
  apple: {
    palette: { g:'#8F2620', G:'#C0362C', s:'#7A4B2A' },
    rows: [
      "...s....",
      "..gg....",
      ".gGGGg..",
      "gGGGGGg.",
      "gGGGGGg.",
      "gGGGGGg.",
      ".gGGGg..",
      "..gg....",
    ]
  },
  star: {
    palette: { g:'#B8860B', G:'#F4C430' },
    rows: [
      "...GG...",
      "...GG...",
      "..GGGG..",
      "GGGGGGGG",
      ".GGGGGG.",
      "..gG.Gg.",
      ".g....g.",
      "........",
    ]
  },
  diamond: {
    palette: { d:'#1E7A82', D:'#4FD1D9', l:'#B6F5F8' },
    rows: [
      "..dd....",
      ".dDlDd..",
      "dDDDDDd.",
      "dDDDDDd.",
      ".dDDDd..",
      "..dDd...",
      "...d....",
      "........",
    ]
  },
  chest: {
    palette: { w:'#2E1B10', b:'#7A4B2A', g:'#F4C430' },
    rows: [
      "wwwwwwww",
      "wbbbbbbw",
      "wbgggGbw".replace('G','g'),
      "wwwwwwww",
      "wbbbbbbw",
      "wbbbbbbw",
      "wbbbbbbw",
      "wwwwwwww",
    ]
  },
};

function renderPixelIcon(container, key, size) {
  const icon = PIXEL_ICONS[key];
  if (!icon) return;
  const gridSize = icon.rows.length;
  const px = size / gridSize;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${gridSize} ${gridSize}`);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);

  icon.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const char = row[x];
      if (char === '.') continue;
      const color = icon.palette[char];
      if (!color) continue;
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", color);
      svg.appendChild(rect);
    }
  });

  container.innerHTML = "";
  container.appendChild(svg);
}

function renderAllPixelIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const key = el.getAttribute('data-icon');
    const size = parseInt(el.getAttribute('data-size') || '48', 10);
    renderPixelIcon(el, key, size);
  });
}

/* ============================================
   PRODUCT DATA
   ============================================ */
const PRODUCTS = [
  { id: 'coin-1M',  name: '1M Coin server',       category: 'koin', icon: 'coin',    price: 5000,  meta: '1.000.000 unit' },
  { id: 'coin-5M',  name: '5M Coin Server',        category: 'koin', icon: 'coin',    price: 12000,  meta: '5.000.000 unit' },
  { id: 'sword-ench',name: 'Diamond Sword Enchanted',   category: 'item', icon: 'sword',   price: 25000,  meta: 'Sharpness V, Mending, Unbreaking III, Knockback II' },
  { id: 'armor-full',name: 'Netherite Full Armor Set',  category: 'item', icon: 'armor',   price: 12000, meta: '4 pieces' },
  { id: 'elytra-fw', name: 'Elytra + Firework Bundle',  category: 'item', icon: 'elytra',  price: 12000,  meta: '1 set + 64x' },
  { id: 'rank-vip',  name: 'Rank VIP — Selamanya',        category: 'rank', icon: 'star',    price: 20000,  meta: 'Permanen' },
  { id: 'rank-mvp',  name: 'Rank MVP+ Selamanya',       category: 'rank', icon: 'star',    price: 30000, meta: 'Permanen' },
  { id: 'apple-64',  name: 'Golden Apple Stack (64x)',  category: 'item', icon: 'apple',   price: 30000,  meta: '64 unit' },
];

function formatRupiah(num) {
  return 'Rp ' + num.toLocaleString('id-ID');
}

/* ============================================
   CART (persisted via localStorage)
   ============================================ */
const CART_KEY = 'CRYSMP_cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart(cart);
  refreshCartUI();
}

function setQty(productId, qty) {
  const cart = getCart();
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  saveCart(cart);
  refreshCartUI();
}

function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
  refreshCartUI();
}

function cartTotal() {
  const cart = getCart();
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    return product ? sum + product.price * qty : sum;
  }, 0);
}

function cartItemCount() {
  const cart = getCart();
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

/* ============================================
   RENDER: PRODUCT GRID (index.html)
   ============================================ */
function renderProductGrid(filter) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  const list = filter && filter !== 'semua'
    ? PRODUCTS.filter(p => p.category === filter)
    : PRODUCTS;

  grid.innerHTML = list.map(p => `
    <article class="product-card">
      <div class="product-slot"><span class="pixel-icon" data-icon="${p.icon}" data-size="56"></span></div>
      <h3>${p.name}</h3>
      <p class="product-meta">${p.meta}</p>
      <p class="product-price">${formatRupiah(p.price)}</p>
      <button class="add-btn" data-product="${p.id}">+ Keranjang</button>
    </article>
  `).join('');

  renderAllPixelIcons();

  grid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.getAttribute('data-product'));
      btn.textContent = 'Ditambahkan ✓';
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = '+ Keranjang';
        btn.classList.remove('added');
      }, 1000);
    });
  });
}

/* ============================================
   RENDER: CART DRAWER (index.html)
   ============================================ */
function refreshCartUI() {
  const cart = getCart();
  const items = Object.entries(cart);
  const cartCountEl = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const cartEmptyEl = document.getElementById('cartEmpty');
  const cartTotalEl = document.getElementById('cartTotal');

  if (cartCountEl) cartCountEl.textContent = cartItemCount();
  if (cartTotalEl) cartTotalEl.textContent = formatRupiah(cartTotal());

  if (!cartItemsEl) return;

  if (items.length === 0) {
    cartItemsEl.style.display = 'none';
    if (cartEmptyEl) cartEmptyEl.style.display = 'flex';
    return;
  }

  cartItemsEl.style.display = 'flex';
  if (cartEmptyEl) cartEmptyEl.style.display = 'none';

  cartItemsEl.innerHTML = items.map(([id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return '';
    return `
      <div class="cart-row">
        <div class="slot"><span class="pixel-icon" data-icon="${product.icon}" data-size="30"></span></div>
        <div class="cart-row-info">
          <h4>${product.name}</h4>
          <p>${formatRupiah(product.price)}</p>
          <div class="qty-control">
            <button data-action="dec" data-product="${id}">−</button>
            <span>${qty}</span>
            <button data-action="inc" data-product="${id}">+</button>
          </div>
        </div>
        <button class="remove-btn" data-action="remove" data-product="${id}" aria-label="Hapus">✕</button>
      </div>
    `;
  }).join('');

  renderAllPixelIcons();

  cartItemsEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-product');
      const action = btn.getAttribute('data-action');
      const currentQty = getCart()[id] || 0;
      if (action === 'inc') setQty(id, currentQty + 1);
      if (action === 'dec') setQty(id, currentQty - 1);
      if (action === 'remove') removeFromCart(id);
    });
  });
}

/* ============================================
   RENDER: CHECKOUT SUMMARY (checkout.html)
   ============================================ */
function renderCheckoutSummary() {
  const summaryItemsEl = document.getElementById('summaryItems');
  if (!summaryItemsEl) return;

  const cart = getCart();
  const items = Object.entries(cart);
  const subtotal = cartTotal();
  const fee = items.length > 0 ? 2500 : 0;
  const total = subtotal + fee;

  summaryItemsEl.innerHTML = items.map(([id, qty]) => {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return '';
    return `<div class="summary-item-row"><span>${product.name} ×${qty}</span><span>${formatRupiah(product.price * qty)}</span></div>`;
  }).join('') || '<p style="color:var(--text-dim); font-size:0.88rem;">Keranjang kosong.</p>';

  document.getElementById('summarySubtotal').textContent = formatRupiah(subtotal);
  document.getElementById('summaryFee').textContent = formatRupiah(fee);
  document.getElementById('summaryTotal').textContent = formatRupiah(total);
}

// Checkout form submission (real payment vs. demo fallback) is handled by
// checkout-payment.js, loaded only on checkout.html. Keeping it out of this
// shared file avoids two submit handlers fighting over the same form.

/* ============================================
   NAV / CART DRAWER TOGGLES
   ============================================ */
function initNav() {
  const burgerBtn = document.getElementById('burgerBtn');
  const mainNav = document.getElementById('mainNav');
  if (burgerBtn && mainNav) {
    burgerBtn.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      burgerBtn.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const cartBtn = document.getElementById('cartBtn');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartClose = document.getElementById('cartClose');

  function openCart() {
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
  }
  function closeCart() {
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('open');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
}

function initCategoryTabs() {
  const tabsEl = document.getElementById('categoryTabs');
  if (!tabsEl) return;
  tabsEl.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProductGrid(tab.getAttribute('data-filter'));
    });
  });
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  renderAllPixelIcons();
  initNav();
  initCategoryTabs();
  renderProductGrid('semua');
  refreshCartUI();
  renderCheckoutSummary();

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
