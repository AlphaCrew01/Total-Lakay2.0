/* ============================================
   Total Lakay — Frontend SPA Rebuild
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyBA_cEX_pHmlUZ4xv10GIOLVOv9g_-iolQ",
  authDomain: "total-lakay.firebaseapp.com",
  projectId: "total-lakay",
  storageBucket: "total-lakay.firebasestorage.app",
  messagingSenderId: "37969355540",
  appId: "1:37969355540:web:514e3869a9422e3681d801",
  measurementId: "G-HC09M5HTVZ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const state = {
  currentView: 'dashboard',
  currentUser: null,
  userRole: 'client',
  theme: localStorage.getItem('tl_theme') || 'light',
  currency: localStorage.getItem('tl_currency') || 'HTG',
  cart: JSON.parse(localStorage.getItem('tl_cart') || '[]'),
  products: [],
  orders: [],
  notifications: [],
  dashboardLoaded: false,
  viewCache: {},
};

const views = {
  dashboard: renderDashboard,
  shop: renderShop,
  orders: renderOrders,
  notifications: renderNotifications,
  profile: renderProfile,
  admin: renderAdmin,
  logistics: renderLogistics,
};

const elements = {};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function init() {
  elements.appContent = $('#appContent');
  elements.authModal = $('#authModal');
  elements.cartDrawer = $('#cartDrawer');
  elements.overlay = $('#overlay');
  elements.toastContainer = $('#toastContainer');
  elements.authButton = $('#authButton');
  elements.logoutButton = $('#logoutButton');
  elements.searchInput = $('#searchInput');
  elements.searchSubmit = $('#searchSubmit');
  elements.themeToggle = $('#themeToggle');
  elements.topNotifBadge = $('#topNotifBadge');
  elements.topCartBadge = $('#topCartBadge');
  elements.notifToggle = $('#notifToggle');
  elements.cartToggle = $('#cartToggle');
  elements.checkoutButton = $('#checkoutButton');
  elements.cartItems = $('#cartItems');
  elements.cartTotalAmount = $('#cartTotalAmount');
  elements.sidebarOpen = $('#sidebarOpen');
  elements.sidebarToggle = $('#sidebarToggle');
  elements.authModalClose = $('#authModalClose');
  elements.authForm = $('#authForm');

  applyTheme(state.theme);
  updateAuthUI();
  attachListeners();
  hydrateCart();
  initAuth();
  applyRouteFromHash();
}

function attachListeners() {
  document.body.addEventListener('click', handleGlobalClick);
  elements.themeToggle.addEventListener('click', handleThemeToggle);
  elements.searchSubmit.addEventListener('click', handleSearchSubmit);
  elements.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmit();
    }
  });
  elements.authButton.addEventListener('click', openAuthModal);
  elements.logoutButton.addEventListener('click', handleLogout);
  elements.authModalClose.addEventListener('click', () => closeModal(elements.authModal));
  elements.authForm?.addEventListener('submit', handleAuthSubmit);
  $('#authGoogle')?.addEventListener('click', signInWithGoogle);
  $('#switchRegister')?.addEventListener('click', openRegisterMode);
  elements.cartToggle.addEventListener('click', openCartDrawer);
  $('#closeCart').addEventListener('click', closeCartDrawer);
  elements.checkoutButton.addEventListener('click', handleCheckout);
  elements.overlay.addEventListener('click', closeActivePanels);
  elements.sidebarOpen.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  elements.sidebarToggle.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  $all('[data-view]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const view = event.currentTarget.dataset.view;
      if (view) navigate(view);
    });
  });
  window.addEventListener('hashchange', applyRouteFromHash);
}

function handleGlobalClick(event) {
  const target = event.target;
  if (target.closest('.toast-close')) {
    target.closest('.toast')?.remove();
  }
}

function applyRouteFromHash() {
  const hash = window.location.hash.replace('#', '');
  const view = hash || state.currentView;
  navigate(view, false);
}

function navigate(view, pushState = true) {
  const route = views[view] ? view : 'dashboard';
  if (route === state.currentView && elements.appContent.innerHTML.trim() !== '') {
    return;
  }
  state.currentView = route;
  updateActiveNav();
  if (pushState) {
    window.history.pushState({}, '', `#${route}`);
  }
  renderCurrentView();
}

function updateActiveNav() {
  $all('.nav-link').forEach((button) => {
    button.classList.toggle('nav-active', button.dataset.view === state.currentView);
  });
}

function setLoading(message = 'Chajman...') {
  if (!elements.appContent) return;
  elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>${message}</h2></div><div class="card-body"><div class="skeleton-grid"><div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div></div></div></section>`;
}

function renderCurrentView() {
  if (!views[state.currentView]) {
    state.currentView = 'dashboard';
  }
  views[state.currentView]();
}

function openPanel(panel) {
  panel.classList.remove('hidden');
  elements.overlay.classList.remove('hidden');
}

function closePanel(panel) {
  panel.classList.add('hidden');
  elements.overlay.classList.add('hidden');
}

function closeActivePanels() {
  if (!elements.overlay.classList.contains('hidden')) {
    closeModal(elements.authModal);
    closeCartDrawer();
    document.body.classList.remove('sidebar-open');
  }
}

function openAuthModal() {
  openPanel(elements.authModal);
}

function closeModal(modal) {
  modal.classList.add('hidden');
  elements.overlay.classList.add('hidden');
}

function openCartDrawer() {
  elements.cartDrawer.classList.add('open');
  elements.cartDrawer.classList.remove('hidden');
  elements.overlay.classList.remove('hidden');
}

function closeCartDrawer() {
  elements.cartDrawer.classList.remove('open');
  elements.cartDrawer.classList.add('hidden');
  elements.overlay.classList.add('hidden');
}

function handleThemeToggle() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('tl_theme', theme);
}

function handleSearchSubmit() {
  const term = elements.searchInput.value.trim().toLowerCase();
  state.searchTerm = term;
  if (state.currentView === 'shop') {
    renderShop();
  } else {
    navigate('shop');
  }
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const mode = $('#authForm').dataset.mode || 'login';
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value.trim();
  if (!email || !password) {
    showToast('Ranpli email ak modpas pou kontinye.', 'error');
    return;
  }
  if (mode === 'register') {
    createAccountWithEmail(email, password);
  } else {
    signInWithEmail(email, password);
  }
}

function openRegisterMode() {
  $('#authSubmit').textContent = 'Kreye kont';
  $('#authForm').dataset.mode = 'register';
}

async function createAccountWithEmail(email, password) {
  try {
    showToast('Kreye kont ou...', 'success');
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (result.user) {
      showToast('Kont kreye avèk siksè.', 'success');
      closeModal(elements.authModal);
    }
  } catch (error) {
    showToast(error.message || 'Erè pandan kreye kont.', 'error');
  }
}

async function signInWithEmail(email, password) {
  try {
    showToast('Ap konekte...', 'success');
    const result = await auth.signInWithEmailAndPassword(email, password);
    if (result.user) {
      showToast('Konekte avèk siksè.', 'success');
      closeModal(elements.authModal);
    }
  } catch (error) {
    showToast(error.message || 'Erè koneksyon.', 'error');
  }
}

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    showToast('Konekte avèk Google.', 'success');
    closeModal(elements.authModal);
  } catch (error) {
    showToast(error.message || 'Erè Google Connect.', 'error');
  }
}

async function handleLogout() {
  await auth.signOut();
  showToast('Ou dekonekte avèk siksè.', 'success');
  state.userRole = 'client';
  updateAuthUI();
  navigate('dashboard');
}

function hydrateCart() {
  state.cart = Array.isArray(state.cart) ? state.cart : [];
  saveCart();
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem('tl_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

function addToCart(product) {
  const existing = state.cart.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  showToast('Pwodui ajoute nan panyen.', 'success');
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function updateCartBadge() {
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  elements.topCartBadge.textContent = count;
  elements.topCartBadge.classList.toggle('hidden', count === 0);
}

async function initAuth() {
  auth.onAuthStateChanged(async (user) => {
    state.currentUser = user;
    if (user) {
      await loadUserRole(user);
      showToast(`Byenveni ${user.email || 'retou'}.`, 'success');
    } else {
      state.userRole = 'client';
    }
    updateAuthUI();
    renderCurrentView();
  });
}

async function loadUserRole(user) {
  try {
    const profile = await db.collection('users').doc(user.uid).get();
    const data = profile.exists ? profile.data() : null;
    state.userRole = data?.role || 'client';
  } catch (error) {
    console.error('loadUserRole', error);
    state.userRole = 'client';
  }
}

function updateAuthUI() {
  const loggedIn = !!state.currentUser;
  elements.authButton.classList.toggle('hidden', loggedIn);
  elements.logoutButton.classList.toggle('hidden', !loggedIn);
  $all('.user-only').forEach((el) => el.classList.toggle('hidden', !loggedIn));
  $all('.admin-only').forEach((el) => el.classList.toggle('hidden', state.userRole !== 'admin'));
  $all('.vendor-only').forEach((el) => el.classList.toggle('hidden', state.userRole !== 'vendor'));
}

function showToast(message, type = 'success') {
  const toast = document.createElement('article');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${message}</strong><button class="toast-close">×</button>`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

function renderDashboard() {
  setLoading('Chajman tablodbò...');
  Promise.all([fetchProducts(), fetchOrders(), fetchNotifications()]).then(() => {
    const productCount = state.products.length;
    const orderCount = state.orders.length;
    const revenue = state.orders.reduce((total, order) => total + (order.total || 0), 0);
    const recentProducts = state.products.slice(0, 4);
    const recentOrders = state.orders.slice(0, 5);

    elements.appContent.innerHTML = `
      <section class="section-grid">
        <section class="card">
          <div class="card-header"><h2>Rezime rapid</h2></div>
          <div class="card-body stats-grid">
            <article class="stat-card"><span>Total pwodwi</span><strong>${productCount}</strong></article>
            <article class="stat-card"><span>Total kòmand</span><strong>${orderCount}</strong></article>
            <article class="stat-card"><span>Revni estime</span><strong>${formatMoney(revenue)}</strong></article>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><h2>Analytics</h2></div>
          <div class="card-body"><canvas id="salesChart" width="400" height="200"></canvas></div>
        </section>
      </section>

      <section class="section-grid">
        <section class="card">
          <div class="card-header"><h2>Pwodui rekòmande</h2></div>
          <div class="card-body product-grid">
            ${recentProducts.map(renderProductCardMinimal).join('')}
          </div>
        </section>

        <section class="card">
          <div class="card-header"><h2>Dènye kòmand</h2></div>
          <div class="card-body">
            ${recentOrders.length ? renderOrdersTable(recentOrders) : '<p class="muted">Pa gen kòmand resan.</p>'}
          </div>
        </section>
      </section>
    `;

    renderSalesChart(revenue, orderCount);
  }).catch((error) => {
    console.error(error);
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Erè</h2></div><div class="card-body"><p class="muted">Nou pa ka chaje tablodbò la kounye a.</p></div></section>`;
  });
}

function renderShop() {
  setLoading('Chajman boutik...');
  fetchProducts().then(() => {
    const filter = state.searchTerm || '';
    const filtered = state.products.filter((product) => product.name.toLowerCase().includes(filter) || product.category.toLowerCase().includes(filter));
    elements.appContent.innerHTML = `
      <section class="card">
        <div class="card-header"><h2>Boutik</h2></div>
        <div class="card-body product-grid">
          ${filtered.length ? filtered.map(renderProductCardFull).join('') : '<p class="muted">Pa gen rezilta pou rechèch la.</p>'}
        </div>
      </section>
    `;
    attachProductActions();
  }).catch((error) => {
    console.error(error);
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Erè boutik</h2></div><div class="card-body"><p class="muted">Nou pa ka chaje pwodwi yo kounye a.</p></div></section>`;
  });
}

function renderOrders() {
  if (!state.currentUser) {
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Aksè restrenn</h2></div><div class="card-body"><p class="muted">Ou dwe konekte pou wè kòmand ou yo.</p></div></section>`;
    return;
  }
  setLoading('Chajman kòmand...');
  fetchOrders().then(() => {
    elements.appContent.innerHTML = `
      <section class="card">
        <div class="card-header"><h2>Kòmand mwen yo</h2></div>
        <div class="card-body">${state.orders.length ? renderOrdersTable(state.orders) : '<p class="muted">Pa gen kòmand pou kounye a.</p>'}</div>
      </section>
    `;
  }).catch((error) => {
    console.error(error);
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Erè</h2></div><div class="card-body"><p class="muted">Nou pa ka chaje kòmand yo.</p></div></section>`;
  });
}

function renderNotifications() {
  setLoading('Chajman notifikasyon...');
  fetchNotifications().then(() => {
    elements.appContent.innerHTML = `
      <section class="card">
        <div class="card-header"><h2>Notifikasyon</h2></div>
        <div class="card-body notification-list">
          ${state.notifications.length ? state.notifications.map(renderNotificationItem).join('') : '<p class="muted">Pa gen notifikasyon pou kounye a.</p>'}
        </div>
      </section>
    `;
  });
}

function renderProfile() {
  if (!state.currentUser) {
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Profil</h2></div><div class="card-body"><p class="muted">Ou dwe konekte pou wè enfòmasyon kont ou.</p></div></section>`;
    return;
  }
  elements.appContent.innerHTML = `
    <section class="card">
      <div class="card-header"><h2>Profil mwen</h2></div>
      <div class="card-body">
        <div class="section-grid">
          <div class="card-body">
            <p><strong>Email:</strong> ${state.currentUser.email}</p>
            <p><strong>Wòl:</strong> ${state.userRole}</p>
            <p><strong>UID:</strong> ${state.currentUser.uid}</p>
          </div>
          <div class="card-body">
            <p>Jere preferans ou, verifye imel ou, epi kontwole sekirite kont lan.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAdmin() {
  if (state.userRole !== 'admin') {
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Aksè admin</h2></div><div class="card-body"><p class="muted">Ou pa gen dwa admin pou aksede seksyon sa a.</p></div></section>`;
    return;
  }
  setLoading('Chajman admin...');
  Promise.all([fetchProducts(), fetchOrders()]).then(() => {
    const pending = state.orders.filter((order) => order.status === 'pending').length;
    elements.appContent.innerHTML = `
      <section class="section-grid">
        <section class="card">
          <div class="card-header"><h2>Admin Panel</h2></div>
          <div class="card-body stats-grid">
            <article class="stat-card"><span>Pwodui total</span><strong>${state.products.length}</strong></article>
            <article class="stat-card"><span>Kòmand total</span><strong>${state.orders.length}</strong></article>
            <article class="stat-card"><span>Kòmand ann atant</span><strong>${pending}</strong></article>
          </div>
        </section>
      </section>
    `;
  });
}

function renderLogistics() {
  if (state.userRole !== 'vendor') {
    elements.appContent.innerHTML = `<section class="card"><div class="card-header"><h2>Lojistik</h2></div><div class="card-body"><p class="muted">Seksyon sa a disponib sèlman pou livrezon.</p></div></section>`;
    return;
  }
  setLoading('Chajman lojistik...');
  fetchOrders().then(() => {
    const deliveries = state.orders.filter((order) => order.status !== 'delivered');
    elements.appContent.innerHTML = `
      <section class="card">
        <div class="card-header"><h2>Livrezon an tan reyèl</h2></div>
        <div class="card-body">
          ${deliveries.length ? renderOrdersTable(deliveries) : '<p class="muted">Pa gen livrezon aktif pou kounye a.</p>'}
        </div>
      </section>
    `;
  });
}

function renderProductCardMinimal(product) {
  return `
    <article class="product-card">
      <div class="product-image">${escapeHtml(product.name)}</div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(product.category || 'Kategori')}</div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <div class="product-footer">
          <span class="product-price">${formatMoney(product.price)}</span>
          <button class="btn btn-outline" data-add="${product.id}">Achte</button>
        </div>
      </div>
    </article>
  `;
}

function renderProductCardFull(product) {
  return `
    <article class="product-card">
      <div class="product-image">${escapeHtml(product.name)}</div>
      <div class="product-body">
        <div class="product-category">${escapeHtml(product.category || 'Kategori')}</div>
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="muted">${escapeHtml(product.description || 'Pa gen deskripsyon.')}</p>
        <div class="product-footer">
          <strong class="product-price">${formatMoney(product.price)}</strong>
          <div class="product-actions">
            <button class="btn btn-gold" data-add="${product.id}">Achte</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderOrdersTable(orders) {
  return `
    <table class="table">
      <thead>
        <tr><th>ID</th><th>Kliyan</th><th>Pri</th><th>Estati</th></tr>
      </thead>
      <tbody>
        ${orders.map((order) => `
          <tr>
            <td>${escapeHtml(order.id || '—')}</td>
            <td>${escapeHtml(order.customerName || order.email || '—')}</td>
            <td>${formatMoney(order.total || 0)}</td>
            <td>${escapeHtml(order.status || '—')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderNotificationItem(notification) {
  return `
    <article class="notification-item">
      <strong>${escapeHtml(notification.title)}</strong>
      <p>${escapeHtml(notification.message)}</p>
      <small>${new Date(notification.createdAt || Date.now()).toLocaleString()}</small>
    </article>
  `;
}

function attachProductActions() {
  elements.appContent.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.add;
      const product = state.products.find((item) => item.id === productId);
      if (!product) return;
      addToCart(product);
    });
  });
}

function renderCart() {
  elements.cartItems.innerHTML = state.cart.length ? state.cart.map((item) => `
    <article class="cart-item">
      <img src="${escapeHtml(item.image || 'logo.jpeg')}" alt="${escapeHtml(item.name)}">
      <div class="cart-item-detail">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${item.quantity} x ${formatMoney(item.price)}</small>
      </div>
      <button class="btn btn-outline" data-remove="${item.id}">Retire</button>
    </article>
  `).join('') : '<p class="muted">Panyen ou vid.</p>';
  elements.cartTotalAmount.textContent = formatMoney(state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  elements.cartItems.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => removeFromCart(button.dataset.remove));
  });
}

function handleCheckout() {
  if (!state.currentUser) {
    showToast('Ou dwe konekte pou peye.', 'error');
    openAuthModal();
    return;
  }
  showToast('Pwosesis peman inikapab kounye a. Souple retounen pita.', 'success');
}

function formatMoney(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('fr-HT', { style: 'currency', currency: state.currency }).format(value);
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

async function fetchProducts() {
  if (state.products.length) return state.products;
  const snapshot = await db.collection('products').limit(24).get();
  state.products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return state.products;
}

async function fetchOrders() {
  if (state.orders.length && state.ordersLoaded) return state.orders;
  const query = state.userRole === 'admin' ? db.collection('orders') : db.collection('orders').where('userId', '==', state.currentUser?.uid || '');
  const snapshot = await query.get();
  state.orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  state.ordersLoaded = true;
  return state.orders;
}

async function fetchNotifications() {
  if (state.notifications.length) return state.notifications;
  const snapshot = await db.collection('notifications').orderBy('createdAt', 'desc').limit(12).get();
  state.notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  updateNotificationBadge();
  return state.notifications;
}

function updateNotificationBadge() {
  const count = state.notifications.filter((item) => !item.read).length;
  elements.topNotifBadge.textContent = count;
  elements.topNotifBadge.classList.toggle('hidden', count === 0);
}

function renderSalesChart(totalRevenue, totalOrders) {
  const canvas = document.getElementById('salesChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Lendi', 'Madi', 'Mèkredi', 'Jedi', 'Vandredi', 'Samdi', 'Dimanch'],
      datasets: [{ label: 'Revni', data: [totalRevenue * 0.9, totalRevenue * 0.95, totalRevenue * 0.8, totalRevenue, totalRevenue * 1.05, totalRevenue * 0.97, totalRevenue], backgroundColor: 'rgba(188, 141, 44, 0.18)', borderColor: 'rgba(188, 141, 44, 1)', fill: true, tension: 0.4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(15,23,42,0.08)' } } } }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  init();
  setTimeout(() => document.getElementById('splashScreen').classList.add('hidden'), 1000);
});
