/* ============================================
   Total Lakay — Complete Frontend App
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State Management
const state = {
  currentUser: null,
  userRole: 'client',
  theme: localStorage.getItem('tl_theme') || 'light',
  currency: localStorage.getItem('tl_currency') || 'HTG',
  cart: JSON.parse(localStorage.getItem('tl_cart') || '[]'),
  products: [],
  language: localStorage.getItem('tl_language') || 'ht'
};

// Translations
const translations = {
  ht: {
    home: 'Akèy',
    shop: 'Boutik',
    cart: 'Panyen',
    login: 'Konekte',
    logout: 'Dekonekte',
    noNotifications: 'Pa gen notifikasyon'
  },
  fr: {
    home: 'Accueil',
    shop: 'Boutique',
    cart: 'Panier',
    login: 'Connexion',
    logout: 'Déconnexion',
    noNotifications: 'Pas de notifications'
  },
  en: {
    home: 'Home',
    shop: 'Shop',
    cart: 'Cart',
    login: 'Login',
    logout: 'Logout',
    noNotifications: 'No notifications'
  }
};

// Initialize app
function init() {
  applyTheme(state.theme);
  setupEventListeners();
  initAuth();
  loadProducts();
  renderHome();
}

function setupEventListeners() {
  // Auth buttons
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const closeLoginModal = document.getElementById('closeLoginModal');
  
  if (authBtn) authBtn.addEventListener('click', () => openLoginModal());
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (closeLoginModal) closeLoginModal.addEventListener('click', () => closeLoginModal.parentElement.classList.add('hidden'));
  
  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  
  // Language & Currency
  const langSwitch = document.getElementById('langSwitch');
  const currencySwitch = document.getElementById('currencySwitch');
  
  if (langSwitch) langSwitch.addEventListener('change', (e) => {
    state.language = e.target.value;
    localStorage.setItem('tl_language', state.language);
    updateTranslations();
  });
  
  if (currencySwitch) currencySwitch.addEventListener('change', (e) => {
    state.currency = e.target.value;
    localStorage.setItem('tl_currency', state.currency);
  });
  
  // Login form
  const emailLoginBtn = document.getElementById('emailLoginBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  
  if (emailLoginBtn) emailLoginBtn.addEventListener('click', handleEmailLogin);
  if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleLogin);
  
  // Register
  const registerBtn = document.getElementById('registerBtn');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  
  if (registerBtn) registerBtn.addEventListener('click', handleRegister);
  if (switchToRegister) switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginFormCard').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  });
  if (switchToLogin) switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginFormCard').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  });
  
  // Navigation
  const navShop = document.getElementById('navShop');
  if (navShop) navShop.addEventListener('click', renderShop);
  
  // Cart
  document.addEventListener('click', (e) => {
    if (e.target.closest('.close-modal') && e.target.closest('#loginModal')) {
      document.getElementById('loginModal').classList.add('hidden');
    }
  });
  
  // Menu dropdown
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    });
  }
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown') && dropdownMenu) {
      dropdownMenu.classList.add('hidden');
    }
  });
}

function initAuth() {
  auth.onAuthStateChanged((user) => {
    state.currentUser = user;
    updateAuthUI();
    updateUserOnlyElements();
  });
}

function updateAuthUI() {
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (state.currentUser) {
    if (authBtn) authBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
  } else {
    if (authBtn) authBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }
}

function updateUserOnlyElements() {
  const userOnlyElements = document.querySelectorAll('.user-only');
  userOnlyElements.forEach(el => {
    if (state.currentUser) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function handleEmailLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Veyifye email ak modpas');
    return;
  }
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      document.getElementById('loginModal').classList.add('hidden');
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
    })
    .catch(error => {
      alert('Erè: ' + error.message);
    });
}

function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => {
      document.getElementById('loginModal').classList.add('hidden');
    })
    .catch(error => {
      alert('Erè: ' + error.message);
    });
}

function handleRegister() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  
  if (!name || !email || !password || password.length < 6) {
    alert('Veyifye tou info yo. Modpas min 6 karaktè');
    return;
  }
  
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      return userCredential.user.updateProfile({
        displayName: name
      });
    })
    .then(() => {
      document.getElementById('loginModal').classList.add('hidden');
      document.getElementById('registerName').value = '';
      document.getElementById('registerEmail').value = '';
      document.getElementById('registerPassword').value = '';
      document.getElementById('loginFormCard').classList.remove('hidden');
      document.getElementById('registerForm').classList.add('hidden');
      alert('Kont kreye avèk siksè!');
    })
    .catch(error => {
      alert('Erè: ' + error.message);
    });
}

function handleLogout() {
  auth.signOut()
    .then(() => {
      state.currentUser = null;
      updateAuthUI();
      updateUserOnlyElements();
      renderHome();
    })
    .catch(error => {
      alert('Erè: ' + error.message);
    });
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('tl_theme', state.theme);
  applyTheme(state.theme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function updateTranslations() {
  // Simple i18n implementation
  const elements = document.querySelectorAll('[data-i18n]');
  const lang = state.language;
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
}

function renderHome() {
  const appContent = document.getElementById('appContent');
  appContent.innerHTML = `
    <div class="hero-section">
      <img src="logo.jpeg" alt="Total Lakay" class="hero-logo" onerror="this.style.display='none';">
      <h1 class="hero-title">🏠 Byenveni nan Total Lakay</h1>
      <p class="hero-subtitle">Tout bagay lakay ou nan yon sèl klike.</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:25px;">
        <button onclick="renderShop()" class="btn btn-gold" style="padding:12px 22px;">🛒 Ale nan Boutik</button>
      </div>
    </div>
  `;
}

function loadProducts() {
  // Simulated products
  state.products = [
    {
      id: 1,
      name: 'Telefòn Smart 5G',
      price: 2500,
      currency: 'HTG',
      image: 'https://via.placeholder.com/300x200?text=Phone',
      category: 'electronics',
      description: 'Telefòn dwèt dernye teknoloji'
    },
    {
      id: 2,
      name: 'Rad Entèn',
      price: 350,
      currency: 'HTG',
      image: 'https://via.placeholder.com/300x200?text=Shirt',
      category: 'clothing',
      description: 'Rad kalite bon'
    },
    {
      id: 3,
      name: 'Liv Edukasyon',
      price: 450,
      currency: 'HTG',
      image: 'https://via.placeholder.com/300x200?text=Book',
      category: 'school',
      description: 'Liv ak kont pratik'
    },
    {
      id: 4,
      name: 'Frije',
      price: 8500,
      currency: 'HTG',
      image: 'https://via.placeholder.com/300x200?text=Fridge',
      category: 'home',
      description: 'Frije kalite ekselan'
    }
  ];
}

function renderShop() {
  const appContent = document.getElementById('appContent');
  document.getElementById('searchFilterBar').classList.remove('hidden');
  
  let html = '<div class="grid">';
  
  state.products.forEach(product => {
    html += `
      <div class="product-card">
        <div class="product-img-container">
          <img src="${product.image}" alt="${product.name}" class="product-img" onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}'">
        </div>
        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title">${product.name}</h3>
          <div class="product-price-row">
            <span class="product-price">${product.price} ${product.currency}</span>
          </div>
          <button class="btn btn-gold" onclick="addToCart(${product.id})" style="width: 100%; margin-top: auto;">
            🛒 Ajoute
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  appContent.innerHTML = html;
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  
  const existingItem = state.cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
  } else {
    state.cart.push({
      ...product,
      quantity: 1
    });
  }
  
  localStorage.setItem('tl_cart', JSON.stringify(state.cart));
  updateCartBadge();
  alert('Ajoute nan panyen!');
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const totalItems = state.cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  if (badge) {
    if (totalItems > 0) {
      badge.textContent = totalItems;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('drawerOverlay');
  
  if (!drawer.classList.contains('open')) {
    drawer.classList.add('open');
    overlay.style.display = 'block';
    renderCartDrawer();
  } else {
    drawer.classList.remove('open');
    overlay.style.display = 'none';
  }
}

function renderCartDrawer() {
  const content = document.getElementById('drawerContent');
  const footer = document.getElementById('drawerFooter');
  
  if (state.cart.length === 0) {
    content.innerHTML = '<p style="text-align: center; padding: 20px;">Panyen ou vid</p>';
    footer.classList.add('hidden');
    return;
  }
  
  let total = 0;
  let html = '';
  
  state.cart.forEach((item, index) => {
    const itemTotal = item.price * (item.quantity || 1);
    total += itemTotal;
    
    html += `
      <div style="padding: 15px; border-bottom: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h4 style="margin: 0 0 5px;">${item.name}</h4>
            <p style="margin: 0; font-size: 0.9rem; color: #666;">
              ${item.price} HTG x ${item.quantity || 1}
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="removeFromCart(${index})">❌</button>
        </div>
      </div>
    `;
  });
  
  content.innerHTML = html;
  
  const totalSpan = document.getElementById('drawerTotal');
  if (totalSpan) totalSpan.textContent = `${total} HTG`;
  
  footer.classList.remove('hidden');
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  localStorage.setItem('tl_cart', JSON.stringify(state.cart));
  updateCartBadge();
  renderCartDrawer();
}

function renderView(view) {
  if (view === 'shop') {
    renderShop();
  } else if (view === 'home') {
    renderHome();
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Handle cartDrawer open/close with drawer overlay
if (document.getElementById('drawerOverlay')) {
  document.getElementById('drawerOverlay').addEventListener('click', () => {
    const drawer = document.getElementById('cartDrawer');
    drawer.classList.remove('open');
    document.getElementById('drawerOverlay').style.display = 'none';
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('✅ Service Worker enregistré:', registration.scope);
      })
      .catch(error => {
        console.log('❌ Erreur Service Worker:', error);
      });
  });
}
