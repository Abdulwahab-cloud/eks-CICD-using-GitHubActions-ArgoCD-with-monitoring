// ===== CONFIG =====
const API_URL = window.ENV_API_URL || 'http://localhost:3001';

// ===== STATE =====
let cart = [];
let products = [];
let currentFilter = 'all';

// ===== DOM REFS =====
const cartDrawer   = document.getElementById('cartDrawer');
const cartOverlay  = document.getElementById('cartOverlay');
const cartItems    = document.getElementById('cartItems');
const cartFooter   = document.getElementById('cartFooter');
const cartCount    = document.getElementById('cartCount');
const cartTotal    = document.getElementById('cartTotal');
const productsGrid = document.getElementById('productsGrid');
const filterTabs   = document.getElementById('filterTabs');
const toast        = document.getElementById('toast');
const toastMsg     = document.getElementById('toastMsg');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();
  bindEvents();
});

// ===== API =====
async function fetchProducts(category = '') {
  try {
    const url = category && category !== 'all'
      ? `${API_URL}/api/products?category=${category}`
      : `${API_URL}/api/products`;
    const res = await fetch(url);
    products = await res.json();
    renderProducts(products);
  } catch (err) {
    // Fallback to local data if API is not yet running
    products = FALLBACK_PRODUCTS;
    const filtered = currentFilter === 'all'
      ? products
      : products.filter(p => p.category === currentFilter);
    renderProducts(filtered);
  }
}

async function createOrder(orderData) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return res.json();
}

// ===== RENDER =====
function renderProducts(list) {
  if (!list.length) {
    productsGrid.innerHTML = '<div class="loading">No products found.</div>';
    return;
  }
  productsGrid.innerHTML = list.map((p, i) => `
    <div class="product-card" style="animation-delay:${i * 0.05}s" data-id="${p.id}">
      <div class="product-img">
        <span>${p.emoji}</span>
        ${p.badge ? `<span class="badge badge-${p.badge}">${p.badge}</span>` : ''}
        <button class="add-btn" data-id="${p.id}" aria-label="Add to cart">+</button>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <div class="product-price">
            ${p.originalPrice ? `<span class="original-price">$${p.originalPrice}</span>` : ''}
            $${p.price}
          </div>
          <div class="stars">${p.rating}</div>
        </div>
      </div>
    </div>
  `).join('');

  // Bind add-to-cart buttons
  productsGrid.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      addToCart(parseInt(btn.dataset.id));
    });
  });
}

function renderCart() {
  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛍</div>
        <div style="font-size:15px;margin-bottom:6px;color:var(--text)">Your cart is empty</div>
        <div style="font-size:13px;color:var(--muted)">Add some items to get started</div>
      </div>`;
    cartFooter.style.display = 'none';
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-img">${item.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
      </div>
      <button class="remove-btn" data-id="${item.id}" aria-label="Remove">✕</button>
    </div>
  `).join('');

  cartTotal.textContent = `$${total.toFixed(2)}`;
  cartFooter.style.display = 'block';

  // Bind qty + remove
  cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.id), parseInt(btn.dataset.delta)));
  });
  cartItems.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.id)));
  });
}

function updateCartCount() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartCount.textContent = count;
}

// ===== CART ACTIONS =====
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ ...product, qty: 1 }); }
  updateCartCount();
  showToast(`${product.name} added to cart`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartCount();
  renderCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else renderCart();
  updateCartCount();
}

async function checkout() {
  if (!cart.length) return;
  try {
    const order = await createOrder({ items: cart, total: cart.reduce((s,i) => s + i.price * i.qty, 0) });
    showToast(`Order #${order.id} placed successfully!`);
    cart = [];
    updateCartCount();
    renderCart();
    closeCart();
  } catch {
    showToast('Checkout failed, please try again.');
  }
}

// ===== UI =====
function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  renderCart();
}
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
}

let toastTimer;
function showToast(msg) {
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== EVENTS =====
function bindEvents() {
  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn').addEventListener('click', checkout);
  document.getElementById('shopNow').addEventListener('click', () => {
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  });

  filterTabs.addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    filterTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    fetchProducts(currentFilter);
  });
}

// ===== FALLBACK DATA (when API is offline) =====
const FALLBACK_PRODUCTS = [
  { id:1, name:'Studio Pro Headphones', category:'tech',    emoji:'🎧', price:89,  badge:'hot',  rating:'★★★★★' },
  { id:2, name:'Merino Wool Throw',     category:'home',    emoji:'🧣', price:64,  badge:'sale', rating:'★★★★☆', originalPrice:85 },
  { id:3, name:'Minimal Desk Lamp',     category:'home',    emoji:'💡', price:49,  badge:'new',  rating:'★★★★★' },
  { id:4, name:'Leather Tote Bag',      category:'fashion', emoji:'👜', price:119, badge:null,   rating:'★★★★★' },
  { id:5, name:'Smart Watch Series X',  category:'tech',    emoji:'⌚', price:199, badge:'new',  rating:'★★★★☆' },
  { id:6, name:'Linen Shirt',           category:'fashion', emoji:'👔', price:79,  badge:'sale', rating:'★★★★★', originalPrice:95 },
];