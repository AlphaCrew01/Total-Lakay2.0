/* ============================================
   TOTAL LAKAY - Version Finale Ultime
   Firebase configuré - Admin Dashboard + Client
   Recherche & Filtres - Toutes traductions
   ============================================ */

// ---------- GESTION DES ERREURS GLOBALE ----------
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error('Total Lakay Error:', msg, url, lineNo);
  return false;
};

// ---------- CONFIGURATION FIREBASE ----------
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
const storage = firebase.storage();

// ---------- ÉTAT GLOBAL ----------
let currentUser = null;
let userRole = null;
let pageRole = 'client';
let isAdmin = false;
const roleAlias = {
  admin: 'admin',
  client: 'client',
  livreur: 'vendor',
  vendor: 'vendor'
};
const roleViews = {
  client: ['home','shop','profile','checkout','orders','history','favorites','settings','services','privacy','terms','specialOffers','aiPage'],
  admin: ['home','admin','logistics','profile','orders','history','settings','services','privacy','terms','specialOffers','aiPage'],
  vendor: ['home','logistics','tracking','profile','orders','services','privacy','terms','aiPage']
};
const rolePermissions = {
  admin: ['manageUsers','manageOrders','manageDeliveries','viewStatistics','viewLogs','viewAllOrders'],
  vendor: ['viewAssignedOrders','updateDeliveryStatus','viewDeliveryInfo','viewNotifications','viewHistory'],
  client: ['viewProducts','placeOrders','viewHistory','manageProfile','trackOrders']
};
let currentLang = localStorage.getItem('totalLakayLang') || 'ht';
let currentCurrency = localStorage.getItem('totalLakayCurrency') || 'HTG';
let currentView = 'home';
let products = [];
let orders = [];
let allUsers = [];
let notifications = [];
let cart = loadCart();
let favorites = JSON.parse(localStorage.getItem('totalLakayFavorites') || '[]');
let selectedProductId = null;
let moncashConfig = { clientId: '', clientSecret: '', mode: 'sandbox' };
let aiHistory = []; // 🧠 Mémoire de la conversation
const FREE_AI_LIMIT = 15; // Limite gratuite augmentée à 15 par jour
let isPremium = false; // Statut premium de l'utilisateur

const exchangeRates = {
  HTG: 1,
  USD: 1 / 135,
  EUR: 1 / 140
};

const DEFAULT_PORT_AU_PRINCE = [18.5392, -72.3350];
const DEFAULT_WAREHOUSE_COORDS = [18.55, -72.30];
const AI_PROMPT_PRODUCT_LIMIT = 12;

function normalizeRole(rawRole) {
  const role = String(rawRole || 'client').toLowerCase();
  return roleAlias[role] || 'client';
}

function initPageRole() {
  const storedRole = localStorage.getItem('totalLakayRole');
  pageRole = normalizeRole(storedRole);
  applyPageRoleUI();
}

function setPageRole(role) {
  pageRole = normalizeRole(role);
  localStorage.setItem('totalLakayRole', role || 'client');
  applyPageRoleUI();
}

function getDefaultViewForRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'admin') return 'admin';
  if (normalized === 'vendor') return 'logistics';
  return 'home';
}

function isRoleAllowed(view) {
  return roleViews[pageRole]?.includes(view);
}

function enforcePageRole(view) {
  const normalizedView = String(view || '').trim();
  return isRoleAllowed(normalizedView) ? normalizedView : getDefaultViewForRole(pageRole);
}

function isValidCoords(coords) {
  return Array.isArray(coords) && coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) <= 180;
}

function applyPageRoleUI() {
  document.body.classList.remove('page-client','page-admin','page-vendor');
  document.body.classList.add(`page-${pageRole}`);
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', pageRole !== 'admin'));
  document.querySelectorAll('.vendor-only').forEach(el => el.classList.toggle('hidden', pageRole !== 'vendor'));
  document.querySelectorAll('.client-only').forEach(el => el.classList.toggle('hidden', pageRole !== 'client'));
  document.querySelectorAll('.admin-or-vendor-only').forEach(el => el.classList.toggle('hidden', pageRole !== 'admin' && pageRole !== 'vendor'));
  document.querySelectorAll('.user-only').forEach(el => el.classList.toggle('hidden', !currentUser));
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEl(id) {
  return document.getElementById(id);
}

function hideEl(id) {
  getEl(id)?.classList.add('hidden');
}

function showEl(id) {
  getEl(id)?.classList.remove('hidden');
}

function setElValue(id, value) {
  const el = getEl(id);
  if (el) el.value = value;
  return el;
}

function resetAuthFields() {
  setElValue('loginEmail', '');
  setElValue('loginPassword', '');
  setElValue('registerName', '');
  setElValue('registerEmail', '');
  setElValue('registerPassword', '');
}

function ensureLoginModalExists() {
  if (getEl('loginModal')) return;

  const template = document.createElement('div');
  template.innerHTML = `
    <div id="loginModal" class="modal hidden">
      <div class="login-card glass view-fade-in">
        <span class="close-modal" id="closeLoginModal">&times;</span>
        <div id="loginFormCard">
          <div class="login-header">
            <img src="logo.jpeg" alt="Total Lakay" class="login-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="logo-icon-fallback">TL</div>
            <h2 data-i18n="loginTitle">Konekte pou achte</h2>
            <p data-i18n="welcome">Byenveni nan Total Lakay</p>
          </div>
          <button id="googleLoginBtn" class="btn-google">🟢 <span data-i18n="continueGoogle">Kontinye ak Google</span></button>
          <div class="separator"><span data-i18n="or">oubyen</span></div>
          <input type="email" id="loginEmail" placeholder="Email" data-i18n-placeholder="emailPlaceholder">
          <input type="password" id="loginPassword" placeholder="Modpas" data-i18n-placeholder="passwordPlaceholder">
          <button id="emailLoginBtn" class="btn btn-gold" style="width:100%; margin-top:0.5rem;">🔐 <span data-i18n="login">Konekte</span></button>
          <a href="#" id="forgotPasswordLink" style="display: block; margin-top: 12px; font-size: 0.85rem; color: var(--gold); font-weight: 600; text-decoration: none; text-align: center;" data-i18n="forgotPassword">Mot de passe oublié ?</a>
          <div class="login-switch">
            <span data-i18n="noAccount">Pa gen kont?</span> <a href="#" id="switchToRegister" data-i18n="createAccount">Kreye yon kont</a>
          </div>
        </div>
        <div id="registerForm" class="hidden">
          <div class="login-header">
            <h2 data-i18n="createAccountTitle">Kreye kont ou</h2>
          </div>
          <input type="text" id="registerName" placeholder="Non ou" data-i18n-placeholder="namePlaceholder">
          <input type="email" id="registerEmail" placeholder="Email" data-i18n-placeholder="emailPlaceholder">
          <input type="password" id="registerPassword" placeholder="Modpas (min 6 karaktè)" data-i18n-placeholder="passwordMin">
          <button id="registerBtn" class="btn btn-gold" style="width:100%;">✅ <span data-i18n="createAccount">Kreye kont</span></button>
          <div class="login-switch">
            <span data-i18n="alreadyAccount">Deja gen yon kont?</span> <a href="#" id="switchToLogin" data-i18n="login">Konekte</a>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(template.firstElementChild);
}

function openAuthModal() {
  ensureLoginModalExists();

  const modal = getEl('loginModal');
  const loginCard = getEl('loginFormCard');
  const registerForm = getEl('registerForm');

  if (!modal) {
    console.warn('openAuthModal: loginModal element not found');
    showMessage('Le modal de connexion n’est pas disponible.', 'error');
    return;
  }

  if (loginCard) loginCard.classList.remove('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  resetAuthFields();
  applyLanguage();
  modal.classList.remove('hidden');
  
  // Attacher les event listeners après l'affichage du modal
  setTimeout(() => attachModalEventListeners(), 0);
}

function handleCartClick() {
  if (!currentUser) {
    showMessage(t('loginRequired'), 'error');
    openAuthModal();
    return;
  }
  toggleCartDrawer();
}

function loadCart() {
  try {
    return normalizeCart(JSON.parse(localStorage.getItem('totalLakayCart') || '[]'));
  } catch (error) {
    console.warn('Unable to load cart data, resetting cart.', error);
    localStorage.removeItem('totalLakayCart');
    return [];
  }
}

function normalizeCart(rawCart) {
  if (!Array.isArray(rawCart)) return [];
  return rawCart.map(item => ({
    ...item,
    quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    price: typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price || 0,
    name: typeof item.name === 'object' ? gt(item.name) : item.name,
    image: item.image || ''
  }));
}

function saveCart() {
  cart = normalizeCart(cart);
  localStorage.setItem('totalLakayCart', JSON.stringify(cart));
  updateCartBadge();
}

function getLocationPromise() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation unsupported'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      (err) => reject(err),
      { timeout: 8000 }
    );
  });
}

// ---------- TRADUCTIONS COMPLÈTES ----------
const i18n = {
  ht: {
    forgotPassword: "Modpas oubliye?",
    enterEmailReset: "Tanpri mete email ou pou reset modpas la",
    resetEmailSent: "Lien reset modpas la voye nan email ou!",
    home: "Akèy", shop: "Boutik", orders: "Kòmand", admin: "Admin",
    login: "Konekte", logout: "Dekonekte",
    dashboard: "Tablodbò", totalProducts: "Total Pwodui",
    totalOrders: "Total Kòmand", totalClients: "Total Kliyan",
    pendingOrders: "Kòmand An Atant", confirmedOrders: "Kòmand Konfime",
    revenue: "Revni Total", recentOrders: "Dènye Kòmand",
    manageProducts: "Jere Pwodui", manageOrders: "Jere Kòmand",
    manageClients: "Jere Kliyan", statistics: "Estatistik",
    quickActions: "Aksyon Rapid",
    welcome: "Byenveni nan Total Lakay", slogan: "Tout bagay lakay ou nan yon sèl klike.",
    shopSlogan: "Jwenn tout kalite pwodwi nou yo nan yon sèl plas.",
    featured: "Pwodui rekòmande", goShop: "Ale nan boutik",
    locationLabel: "Pòtoprens, Ayiti",
    buy: "Achte", price: "Pri", noProducts: "Pa gen pwodui ankò",
    loading: "Chajman...",
    address: "Adrès ou", addressPlaceholder: "Rue, Ville, Kòd postal",
    payment: "Mwayen peman", orderNow: "Kòmande",
    orderSuccess: "Kòmand anrejistre ak siksè !",
    loginRequired: "Ou dwe konekte pou achte", fillAllFields: "Ranpli tout chan yo",
    myOrders: "Kòmand mwen yo", status: "Estati", delivery: "Délai livrezon",
    noOrders: "Pa gen kòmand ankò", pending: "An atant", confirmed: "Konfime",
    cancelled: "Anile", delivered: "Livre", waiting: "An atant...",
    addProduct: "Ajoute yon pwodui", productName: "Non pwodui",
    productNamePlaceholder: "Ex: Diri blan", productPrice: "Pri",
    productPricePlaceholder: "25.00", productImage: "URL imaj",
    productImagePlaceholder: "https://...", productDesc: "Deskripsyon",
    productDescPlaceholder: "Deskripsyon pwodui a...",
    oldPrice: "Ansyen pri (si genyen)", oldPricePlaceholder: "30.00",
    save: "Anrejistre", delete: "Efase", edit: "Modifye",
    existingProducts: "Pwodui ki deja egziste", customerOrders: "Kòmand kliyan yo",
    noOrdersAdmin: "Pa gen kòmand", noProductsAdmin: "Pa gen pwodui",
    delayPlaceholder: "Ex: 3 jou", updateStatus: "Mete ajou estati",
    clients: "Kliyan", client: "Kliyan", clientName: "Non kliyan",
    clientEmail: "Email kliyan", clientSince: "Kliyan depi",
    role: "Wòl", makeAdmin: "Fè admin", makeClient: "Fè kliyan",
    loginTitle: "Konekte pou achte", createAccount: "Kreye yon kont",
    createAccountTitle: "Kreye kont ou", noAccount: "Pa gen kont?",
    alreadyAccount: "Deja gen yon kont?", or: "oubyen",
    continueGoogle: "Kontinye ak Google", emailPlaceholder: "Email",
    passwordPlaceholder: "Modpas", namePlaceholder: "Non ou",
    passwordMin: "Modpas (min 6 karaktè)", selectRole: "Chwazi wòl ou (default: Kliyan)",
    notifications: "Notifikasyon", specialOffers: "Òf espesyal",
    settings: "Paramèt", history: "Istwa",
    specialPrice: "Pri espesyal!", promo: "Promosyon!",
    noSpecialOffers: "Pa gen òf espesyal pou kounye a", offer: "ÒFÈ",
    noNotifications: "Pa gen notifikasyon", today: "Jodi a",
    sendNotification: "Voye notifikasyon", notificationTitle: "Tit notifikasyon",
    notificationMessage: "Mesaj notifikasyon",
    language: "Lang / Langue", accountInfo: "Enfòmasyon kont",
    email: "Email", name: "Non", emailVerified: "Email verifye",
    yes: "Wi", no: "Non", resendVerifyEmail: "Renvwaye email verifikasyon",
    welcomeBack: "Byenveni!", welcomeAdmin: "Byenveni Admin!",
    accountCreated: "Kont kreye ak siksè!", loggedOut: "Ou dekonekte",
    productAdded: "Pwodui ajoute!", productUpdated: "Pwodui modifye!",
    productDeleted: "Pwodui efase", delayUpdated: "Délai mete!",
    statusUpdated: "Estati modifye!", delayRequired: "Antre yon délai",
    accountNotFound: "Kont sa a pa egziste. Kreye yon kont.",
    passwordError: "Modpas dwe gen omwen 6 karaktè",
    confirmDelete: "Eske w sèten ou vle efase sa a?",
    adminOnly: "Admin sèlman",
    emailVerifySent: "📩 Tcheke email ou pou verifye kont lan!",
    emailNotVerified: "❌ Verifye email ou avan ou konekte!",
    emailVerifyWarning: "⚠️ Verifye email ou pou kontinye",
    resendEmail: "⏳ Si w poko wè email la, tcheke spam ou...",
    errorOccurred: "Erè: ", clientLabel: "Kliyan", date: "Dat",
    footerRights: "Total Lakay © 2026", footerContact: "Kontakte nou",
    footerServices: "Sèvis", footerPrivacy: "Konfidansyalite",
    footerTerms: "Kondisyon Itilizasyon",
    footerSlogan: "Pi gwo boutik an liy an Ayiti ki ofri w pi bon pwodwi yo ak yon sèvis livrezon rapid ak sekirize.",
    footerCopy: "Total Lakay © 2026. Tout dwa rezève. Deziyen ak ❤️ pou Ayiti.",
    new: "Nouvo",
    notifSent: "✅ Notifikasyon voye!",
    roleChanged: "✅ Wòl modifye!",
    madeAdmin: "✅ Fè admin!",
    madeClient: "✅ Fè kliyan!",
    searchPlaceholder: "🔍 Rechèche yon pwodui...",
    allCategories: "Tout kategori",
    priceMin: "Pri min",
    priceMax: "Pri max",
    applyFilters: "Filtre",
    resetFilters: "Reinisyalize",
    sortDateDesc: "Pi resan",
    sortDateAsc: "Pi ansyen",
    sortPriceAsc: "Pri: Ba → Wo",
    sortPriceDesc: "Pri: Wo → Ba",
    sortNameAsc: "Non: A → Z",
    sortNameDesc: "Non: Z → A",
    resultsFound: "rezilta jwenn",
    noResultsFound: "Pa gen rezilta. Eseye ak lòt mo.",
    left: "restan",
    testimonialsTitle: "Sa kliyan nou yo di",
    statistics: "Statistik",
    orderSummary: "Rezime Kòmand",
    orderInfo: "Enfòmasyon Livrezon",
    confirmOrder: "Konfime Kòmand",
    mustPurchaseToReview: "Ou dwe achte pwodui sa a epi resevwa l avan ou kite yon avis.",
    mostRecent: "Pi resan",
    priceLowToHigh: "Pri: Ba → Wo",
    priceHighToLow: "Pri: Wo → Ba",
    categoryElectronics: "📱 Elektwonik",
    categoryClothing: "👕 Vètman ak Akseswa",
    categorySchool: "🎓 Lekòl",
    categoryWork: "💼 Travay",
    categoryHome: "🏠 Kay",
    categoryBeauty: "💄 Bote",
    categoryOther: "📦 Lòt",
    categoryClothingAccessories: "👕 Vètman ak Akseswa",
    categorySchoolOffice: "🎓 Lekòl ak Travay",
    categoryHomePersonal: "🏠 Kay ak Pèsonèl",
    categoryElectronicsTech: "📱 Elektwonik",
    balance: "Balans",
    myBalance: "Balans ou",
    refund: "Lajan Rembourse",
    onlineClients: "Kliyan an liy",
    moncashSettings: "Anviwònman MonCash (Peman Reyèl)",
    saveConfig: "Anrejistre Konfigirasyon",
    linkMoncash: "Konekte kont MonCash ou",
    moncashPhone: "Nimewo MonCash ou",
    moncashTerms: "Mwen aksepte kondisyon itilizasyon MonCash ak règleman konfidansyalite nou an",
    aiAssistant: "Asistan IA",
    aiPageTitle: "Konvèsasyon ak IA",
    aiPageDesc: "Poze asistan entèlijan nou an nenpòt kesyon sou platfòm lan oswa sou pwodui nou yo.",
    aiWelcome: "Bonjou! Kouman mwen ka ede w jodi a?",
    aiInputPlaceholder: "Ekri mesaj ou a...",
    aiError: "Mwen gen yon ti pwoblèm koneksyon. Tanpri eseye ankò.",
    aiTyping: "🤔 Analize...",
    aiLoginRequiredDesc: "Ou dwe konekte pou w ka pale ak asistan entèlijan nou an.",
    connect: "Konekte",
    connected: "Konekte ak siksè",
    termsConsentTitle: "Kondisyon Itilizasyon",
    termsConsentDesc: "Pou w ka kontinye sèvi ak Total Lakay, ou dwe aksepte kondisyon itilizasyon nou yo ak politik konfidansyalite nou an.",
    accept: "Aksepte", decline: "Refize",
    cancellationReason: "Rezon anilasyon", reasonPlaceholder: "Poukisa ou anile kòmand sa?",
    reasonRequired: "Ou dwe bay yon rezon pou anilasyon an.",
    recentProducts: "Pwodui Resan", categoriesTitle: "Kategori yo", exploreCategories: "Eksplore tout kategori nou yo",
    school: "Lekòl", work: "Travay", home: "Kay", electronics: "Elektwonik", beauty: "Bote", clothing: "Vètman",
    stock: "Kantite nan stòk", category: "Kategori", colors: "Koulè (separe ak vigil)", sizes: "Gwosè / Size (separe ak vigil)",
    selectColor: "Chwazi Koulè", selectSize: "Chwazi Gwosè", quantity: "Kantite", outOfStock: "Pa gen nan stòk ankò",
    servicesTitle: "Sèvis nou yo", privacyTitle: "Konfidansyalite", termsTitle: "Kondisyon yo",
    phoneRecommend: "Nimewo telefòn ou", addressRecommend: "Adrès ou konplè", phoneRequired: "Telefòn obligatwa",
    cart: "Panyen", checkout: "Peye kounye a", securePaymentInfo: "Peman 100% sekirize",
    profile: "Profil", phone: "Telefòn", phonePlaceholder: "Ex: +509 1234 5678",
    updateProfile: "Mete ajou profil", profileUpdated: "Profil mete ajou ak siksè!",
    phoneNumber: "Nimewo telefòn", saveProfile: "Anrejistre Profil",
    addressRecommend: "Adrès (Rekòmande)", phoneRecommend: "Telefòn (Rekòmande)",
    addToCart: "Ajoute nan panyen", removeFromCart: "Retire",
    notifSettings: "Paramèt Notifikasyon", notifPushEnable: "Aktive notifikasyon sou telefòn",
    notifNewProducts: "Nouvo Pwodui", notifSpecialPrices: "Pri Spesyal & Pwomo",
    notifUpdates: "Mizajou sou sit la", notifStatus: "Estati Notifikasyon",
    notifBlocked: "Bloke pa navigatè a", notifGranted: "Otorize",
    notifRequest: "Otorize kounye a", notifSave: "Anrejistre preferans",
    notifPreferencesSaved: "Preferans notifikasyon anrejistre!",
    total: "Total", emptyCart: "Panyen ou vid",
    securePayment: "Peman Sekirize", contactUs: "Kontakte nou",
    favorites: "Favori", noFavorites: "Pa gen favori ankò",
    reviews: "Avi", leaveReview: "Kite yon avi", addReview: "Ajoute yon avi", noReviews: "Pa gen avi ankò",
    rating: "Nòt", comment: "Kòmantè", submit: "Voye", invalidAddress: "Adrès ou antre a pa valab",
    ratingError: "Chwazi yon nòt (zetwal)", commentError: "Ekri yon kòmantè", reviewSuccess: "Mèsi pou avi ou!", reviewError: "Erè voye avi",
    servicesIntro: "Total Lakay sèvi ak teknoloji dènye kri pou ba ou pi bon eksperyans lan :",
    servicesOnline: "Vant ak IA :",
    servicesOnlineDesc: "Yon asistan entèlijan ki ede w jwenn sa w bezwen epi rekòmandasyon pèsonalize.",
    servicesDelivery: "Livrezon ak PWA :",
    servicesDeliveryDesc: "Aksè rapid sou sit la menm lè ou pa gen entènèt, ak notifikasyon an tan reyèl.",
    servicesCustomer: "Sipò 24/7 :",
    servicesCustomerDesc: "Nou disponib via WhatsApp ak asistan IA nou an pou reponn tout kesyon ou yo.",
    servicesSecure: "Peman MonCash :",
    servicesSecureDesc: "Peman rapid epi sekirize ak sistèm MonCash la dirèkteman sou platfòm lan.",
    privacyIntro: "Nan Total Lakay, nou pwoteje done ou yo ak entèlijans atifisyèl :",
    privacyData: "Kolek done :",
    privacyDataDesc: "Nou kolekte sèlman enfòmasyon ki nesesè pou livrezon ou yo (non, adrès, telefòn).",
    privacySecurity: "Sekirite ak IA :",
    privacySecurityDesc: "Nou itilize IA pou detekte fwod epi asire tranzaksyon ou yo fèt an sekirite.",
    privacySharing: "Konfidansyalite :",
    privacySharingDesc: "Done ou yo chiffres epi yo pa janm pataje ak twazyèm pati san konsantman w.",
    privacyRights: "Dwa w yo :",
    privacyRightsDesc: "Ou ka efase oswa modifye enfòmasyon ou yo nenpòt kilè nan pwofil ou.",
    termsIntro: "Lè w itilize Total Lakay, ou asepte kondisyon sa yo :",
    termsAccount: "Kont ak Sekirite :",
    termsAccountDesc: "Ou responsab sekirite modpas ou ak tout aktivite ki fèt sou kont ou an.",
    termsPurchase: "Acha ak IA :",
    termsPurchaseDesc: "Sistèm IA nou an analize chak kòmand pou evite fwod. Tout acha final sof si gen domaj.",
    termsPrice: "Pri ak Pwodwi :",
    termsPriceDesc: "Pri yo ka chanje san avètisman. Nou fè efò pou deskripsyon yo toujou egzak.",
    termsMod: "Mizajou :",
    termsModDesc: "Total Lakay ka modifye kondisyon sa yo epi n ap voye notifikasyon pou fè w konnen.",
    userMoncashPhone: "Nimewo MonCash ou",
    userMoncashConsent: "Mwen dakò pou m resevwa lajan sou kont MonCash mwen",
    logistics: "Lojistik", logisticsDashboard: "Tablodbò Lojistik",
    liveFleet: "Flòt an Tan Reyèl", activeOrders: "Kòmand Aktiv",
    trackOrder: "Suiv Kòmand", in_transit: "Nan wout", completed: "Konplete",
    validated: "Valide", processing: "Nan preparasyon", returnLogistics: "Retounen Lojistik",
    enableAi: "Aktive IA", test: "Teste", amount: "Montan", actions: "Aksyon",
    premiumTitle: "Total Lakay Premium", premiumDesc: "Debloque tout pouvwa LakayGPT",
    subscribe: "Abonne kounye a", subscribePrice: "3650G / mwa",
    aiLimitReached: "Ou rive nan limit demand gratis pou jodi a.",
    upgradeToPremium: "Pase nan Premium pou diskite san limit ak yon IA ki pi entèlijan.",
    currentPlan: "Plan aktyèl", freePlan: "Gratis", premiumPlan: "Premium ✨",
    premiumFeatures: ["Diskisyon san limit", "Repons ki pi pwofon", "Modèl IA siperyè", "Sipò priyoritè"],
    locationLabel: "Port-au-Prince, Haïti"
  },
  fr: {
    forgotPassword: "Mot de passe oublié ?",
    enterEmailReset: "Veuillez entrer votre email pour réinitialiser le mot de passe",
    resetEmailSent: "E-mail de réinitialisation envoyé avec succès !",
    home: "Accueil", shop: "Boutique", orders: "Commandes", admin: "Admin",
    login: "Connexion", logout: "Déconnexion",
    dashboard: "Tableau de bord", totalProducts: "Total Produits",
    totalOrders: "Total Commandes", totalClients: "Total Clients",
    pendingOrders: "Commandes En Attente", confirmedOrders: "Commandes Confirmées",
    revenue: "Revenu Total", recentOrders: "Dernières Commandes",
    manageProducts: "Gérer Produits", manageOrders: "Gérer Commandes",
    manageClients: "Gérer Clients", statistics: "Statistiques",
    quickActions: "Actions Rapides",
    welcome: "Bienvenue sur Total Lakay", slogan: "Tout ce qu'il vous faut, en un clic.",
    shopSlogan: "Trouvez tous nos produits de qualité en un seul endroit.",
    featured: "Produits recommandés", goShop: "Aller à la boutique",
    buy: "Acheter", price: "Prix", noProducts: "Aucun produit",
    loading: "Chargement...",
    address: "Votre adresse", addressPlaceholder: "Rue, Ville, Code postal",
    payment: "Moyen de paiement", orderNow: "Commander",
    orderSuccess: "Commande enregistrée avec succès !",
    loginRequired: "Vous devez être connecté pour acheter", fillAllFields: "Remplissez tous les champs",
    myOrders: "Mes commandes", status: "Statut", delivery: "Délai de livraison",
    noOrders: "Aucune commande", pending: "En attente", confirmed: "Confirmé",
    cancelled: "Annulé", delivered: "Livré", waiting: "En attente...",
    addProduct: "Ajouter un produit", productName: "Nom du produit",
    productNamePlaceholder: "Ex: Riz blanc", productPrice: "Prix",
    productPricePlaceholder: "25.00", productImage: "URL de l'image",
    productImagePlaceholder: "https://...", productDesc: "Description",
    productDescPlaceholder: "Description du produit...",
    oldPrice: "Ancien prix (si applicable)", oldPricePlaceholder: "30.00",
    save: "Enregistrer", delete: "Supprimer", edit: "Modifier",
    existingProducts: "Produits existants", customerOrders: "Commandes clients",
    noOrdersAdmin: "Aucune commande", noProductsAdmin: "Aucun produit",
    delayPlaceholder: "Ex: 3 jours", updateStatus: "Mettre à jour le statut",
    clients: "Clients", client: "Client", clientName: "Nom client",
    clientEmail: "Email client", clientSince: "Client depuis",
    role: "Rôle", makeAdmin: "Faire admin", makeClient: "Faire client",
    loginTitle: "Connexion pour acheter", createAccount: "Créer un compte",
    createAccountTitle: "Créez votre compte", noAccount: "Pas de compte ?",
    alreadyAccount: "Déjà un compte ?", or: "ou",
    continueGoogle: "Continuer avec Google", emailPlaceholder: "Email",
    passwordPlaceholder: "Mot de passe", namePlaceholder: "Votre nom",
    passwordMin: "Mot de passe (min 6 caractères)", selectRole: "Choisissez votre rôle (défaut : Client)",
    notifications: "Notifications", specialOffers: "Offres spéciales",
    settings: "Paramètres", history: "Historique",
    specialPrice: "Prix spécial !", promo: "Promotion !",
    noSpecialOffers: "Aucune offre spéciale pour le moment", offer: "OFFRE",
    noNotifications: "Aucune notification", today: "Aujourd'hui",
    sendNotification: "Envoyer notification", notificationTitle: "Titre notification",
    notificationMessage: "Message notification",
    language: "Lang", accountInfo: "Account info",
    email: "Email", name: "Nom", emailVerified: "Email vérifié",
    yes: "Oui", no: "Non", resendVerifyEmail: "Renvoyer l'email de vérification",
    welcomeBack: "Bienvenue !", welcomeAdmin: "Bienvenue Admin !",
    accountCreated: "Compte créé avec succès !", loggedOut: "Déconnexion réussie",
    productAdded: "Produit ajouté !", productUpdated: "Produit mis à jour !",
    productDeleted: "Produit supprimé", delayUpdated: "Délai de livraison mis à jour !",
    statusUpdated: "Statut mis à jour !", delayRequired: "Entrez un délai de livraison",
    accountNotFound: "Ce compte n'existe pas. Créez un compte.",
    passwordError: "Le mot de passe doit avoir au moins 6 caractères",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer ?",
    adminOnly: "Admin seulement",
    emailVerifySent: "📩 Vérifiez votre email pour activer votre compte !",
    emailNotVerified: "❌ Vérifiez votre email avant de vous connecter !",
    emailVerifyWarning: "⚠️ Vérifiez votre email pour continuer",
    resendEmail: "⏳ Si vous ne voyez pas l'email, vérifiez vos spams...",
    errorOccurred: "Erreur : ", clientLabel: "Client", date: "Date",
    footerRights: "Total Lakay © 2026", footerContact: "Contactez-nous",
    footerServices: "Services", footerPrivacy: "Confidentialité",
    footerTerms: "Conditions d'Utilisation",
    footerSlogan: "La plus grande boutique en ligne d'Haïti offrant les meilleurs produits avec un service de livraison rapide et sécurisé.",
    footerCopy: "Total Lakay © 2026. Tous droits réservés. Conçu avec ❤️ pour Haïti.",
    new: "Nouveau",
    notifSent: "✅ Notification envoyée !",
    roleChanged: "✅ Rôle modifié !",
    madeAdmin: "✅ Passé admin !",
    madeClient: "✅ Passé client !",
    searchPlaceholder: "🔍 Rechercher un produit...",
    allCategories: "Toutes catégories",
    priceMin: "Prix min",
    priceMax: "Prix max",
    applyFilters: "Filtrer",
    resetFilters: "Réinitialiser",
    sortDateDesc: "Plus récent",
    sortDateAsc: "Plus ancien",
    sortPriceAsc: "Prix: Bas → Haut",
    sortPriceDesc: "Prix: Haut → Bas",
    sortNameAsc: "Nom: A → Z",
    sortNameDesc: "Nom: Z → A",
    resultsFound: "résultats trouvés",
    noResultsFound: "Aucun résultat. Essayez d'autres mots.",
    left: "restants",
    testimonialsTitle: "Ce que disent nos clients",
    orderSummary: "Résumé de la commande",
    orderInfo: "Informations de livraison",
    confirmOrder: "Confirmer la commande",
    mustPurchaseToReview: "Vous devez avoir acheté et reçu ce produit pour laisser un avis.",
    mostRecent: "Le plus récent",
    priceLowToHigh: "Prix : Bas → Haut",
    priceHighToLow: "Prix : Haut → Bas",
    categoryElectronics: "📱 Électronique",
    categoryClothing: "👕 Vêtements & Accessoires",
    categorySchool: "🎓 École",
    categoryWork: "💼 Travail",
    categoryHome: "🏠 Maison",
    categoryBeauty: "💄 Beauté",
    categoryOther: "📦 Autres",
    categoryClothingAccessories: "👕 Vêtements & Accessoires",
    categorySchoolOffice: "🎓 École & Travail",
    categoryHomePersonal: "🏠 Maison & Personnel",
    categoryElectronicsTech: "📱 Électronique",
    balance: "Solde",
    myBalance: "Votre solde",
    refund: "Argent Remboursé",
    onlineClients: "Clients en ligne",
    moncashSettings: "Paramètres MonCash (Paiement Réel)",
    saveConfig: "Enregistrer la Configuration",
    linkMoncash: "Lier votre compte MonCash",
    moncashPhone: "Votre numéro MonCash",
    moncashTerms: "J'accepte les conditions d'utilisation et la politique de confidentialité de MonCash",
    aiAssistant: "Assistant IA",
    aiPageTitle: "Conversation avec l'IA",
    aiPageDesc: "Posez à notre assistant intelligent toutes vos questions sur la plateforme ou sur nos produits.",
    aiWelcome: "Bonjour ! Comment puis-je vous aider aujourd'hui ?",
    aiInputPlaceholder: "Écrivez votre message...",
    aiError: "J'ai un petit problème de connexion. Veuillez réessayer.",
    aiTyping: "🤔 Analyse...",
    aiLoginRequiredDesc: "Vous devez être connecté pour discuter avec notre assistant intelligent.",
    connect: "Lier",
    connected: "Lié avec succès",
    termsConsentTitle: "Conditions d'Utilisation",
    termsConsentDesc: "Pour continuer à utiliser Total Lakay, vous devez accepter nos conditions d'utilisation et notre politique de confidentialité.",
    accept: "Accepter", decline: "Refuser",
    cancellationReason: "Raison de l'annulation", reasonPlaceholder: "Pourquoi annulez-vous cette commande ?",
    reasonRequired: "Vous devez fournir une raison pour l'annulation.",
    recentProducts: "Produits Récents", categoriesTitle: "Catégories", exploreCategories: "Explorez toutes nos catégories",
    school: "École", work: "Travail", home: "Maison", electronics: "Électronique", beauty: "Beauté", clothing: "Vêtements",
    stock: "Quantité en stock", category: "Catégorie", colors: "Couleurs (séparées par virgule)", sizes: "Tailles / Sizes (séparées par virgule)",
    selectColor: "Choisir Couleur", selectSize: "Choisir Taille", quantity: "Quantité", outOfStock: "Rupture de stock",
    servicesTitle: "Nos Services", privacyTitle: "Confidentialité", termsTitle: "Conditions",
    phoneRecommend: "Votre numéro de téléphone", addressRecommend: "Votre adresse complète", phoneRequired: "Téléphone requis",
    cart: "Panier", checkout: "Payer maintenant", securePaymentInfo: "Paiement 100% sécurisé",
    profile: "Profil", phone: "Téléphone", phonePlaceholder: "Ex : +509 1234 5678",
    updateProfile: "Mettre à jour le profil", profileUpdated: "Profil mis à jour avec succès !",
    phoneNumber: "Numéro de téléphone", saveProfile: "Enregistrer le Profil",
    addressRecommend: "Adresse (Recommandé)", phoneRecommend: "Téléphone (Recommandé)",
    addToCart: "Ajouter au panier", removeFromCart: "Retirer",
    notifSettings: "Paramètres de Notifications", notifPushEnable: "Activer les notifications push",
    notifNewProducts: "Nouveaux Produits", notifSpecialPrices: "Prix Spéciaux & Promos",
    notifUpdates: "Mises à jour du site", notifStatus: "Statut des Notifications",
    notifBlocked: "Bloqué par le navigateur", notifGranted: "Autorisé",
    notifRequest: "Autoriser maintenant", notifSave: "Enregistrer les préférences",
    notifPreferencesSaved: "Préférences de notifications enregistrées !",
    accountInfo: "Informations du Compte", email: "Email", name: "Nom", role: "Rôle", emailVerified: "Email Vérifié",
    yes: "Oui", no: "Non", resendVerifyEmail: "Renvoyer l'email de vérification",
    total: "Total", emptyCart: "Votre panier est vide",
    securePayment: "Paiement Sécurisé", contactUs: "Contactez-nous",
    favorites: "Favoris", noFavorites: "Pas encore de favoris",
    reviews: "Avis", leaveReview: "Laisser un avis", addReview: "Ajouter un avis", noReviews: "Pas encore d'avis",
    rating: "Note", comment: "Commentaire", submit: "Envoyer", invalidAddress: "Adresse invalide",
    ratingError: "Choisissez une note (étoiles)", commentError: "Écrivez un commentaire", reviewSuccess: "Merci pour votre avis !", reviewError: "Erreur d'envoi",
    servicesIntro: "Total Lakay utilise les dernières technologies pour vous offrir une expérience d'achat inégalée :",
    servicesOnline: "Vente avec IA :",
    servicesOnlineDesc: "Un assistant intelligent pour vous guider et des recommandations basées sur vos goûts.",
    servicesDelivery: "Expérience PWA :",
    servicesDeliveryDesc: "Application installable avec accès hors-ligne et notifications instantanées.",
    servicesCustomer: "Support Premium :",
    servicesCustomerDesc: "Assistance 24/7 via WhatsApp et notre IA pour toutes vos préoccupations.",
    servicesSecure: "Paiements MonCash :",
    servicesSecureDesc: "Intégration directe de MonCash pour des transactions locales rapides et sécurisées.",
    privacyIntro: "Chez Total Lakay, nous protégeons vos données avec l'aide de l'IA :",
    privacyData: "Collecte Minimale :",
    privacyDataDesc: "Nous ne collectons que les informations essentielles au traitement de vos commandes.",
    privacySecurity: "Sécurité Avancée :",
    privacySecurityDesc: "Utilisation de l'IA pour la détection des fraudes et la protection de vos transactions.",
    privacySharing: "Confidentialité Totale :",
    privacySharingDesc: "Vos données sont cryptées et ne sont jamais partagées sans votre accord explicite.",
    privacyRights: "Contrôle Total :",
    privacyRightsDesc: "Modifiez ou supprimez vos données à tout moment depuis votre profil.",
    termsIntro: "En utilisant Total Lakay, vous acceptez nos conditions générales :",
    termsAccount: "Responsabilité :",
    termsAccountDesc: "Vous êtes garant de la sécurité de votre compte et de vos accès.",
    termsPurchase: "Vérification IA :",
    termsPurchaseDesc: "Chaque commande est analysée par notre IA pour garantir la sécurité du vendeur et de l'acheteur.",
    termsPrice: "Exactitude :",
    termsPriceDesc: "Nous nous efforçons d'afficher des prix et des descriptions exacts en temps réel.",
    termsMod: "Évolution :",
    termsModDesc: "Nos conditions peuvent évoluer ; vous serez informé par notification push.",
    userMoncashPhone: "Votre numéro MonCash",
    userMoncashConsent: "J'accepte de recevoir mes remboursements sur mon compte MonCash",
    logistics: "Logistique", logisticsDashboard: "Tableau de Bord Logistique",
    liveFleet: "Flotte en Temps Réel", activeOrders: "Commandes Actives",
    trackOrder: "Suivre Commande", in_transit: "En transit", completed: "Complété",
    validated: "Validé", processing: "En préparation", returnLogistics: "Retour Logistique",
    enableAi: "Activer l'IA", test: "Tester", amount: "Montant", actions: "Actions",
    premiumTitle: "Total Lakay Premium", premiumDesc: "Débloquez toute la puissance de LakayGPT",
    subscribe: "S'abonner maintenant", subscribePrice: "3650G / mois",
    aiLimitReached: "Vous avez atteint votre limite de demandes gratuites pour aujourd'hui.",
    upgradeToPremium: "Passez au Premium pour discuter sans limite avec une IA plus intelligente.",
    currentPlan: "Plan actuel", freePlan: "Gratuit", premiumPlan: "Premium ✨",
    premiumFeatures: ["Discussions illimitées", "Réponses plus profondes", "Modèle IA supérieur", "Support prioritaire"],
    locationLabel: "Port-au-Prince, Haïti"
  },
  en: {
    forgotPassword: "Forgot Password?",
    enterEmailReset: "Please enter your email to reset your password",
    resetEmailSent: "Password reset email sent successfully!",
    home: "Home", shop: "Shop", orders: "Orders", admin: "Admin",
    login: "Login", logout: "Logout",
    dashboard: "Dashboard", totalProducts: "Total Products",
    totalOrders: "Total Orders", totalClients: "Total Clients",
    pendingOrders: "Pending Orders", confirmedOrders: "Confirmed Orders",
    revenue: "Total Revenue", recentOrders: "Recent Orders",
    manageProducts: "Manage Products", manageOrders: "Manage Orders",
    manageClients: "Manage Clients", statistics: "Statistics",
    quickActions: "Quick Actions",
    welcome: "Welcome to Total Lakay", slogan: "Everything you need, one click away.",
    shopSlogan: "Find all our quality products in one place.",
    featured: "Featured products", goShop: "Go to shop",
    buy: "Buy", price: "Price", noProducts: "No products yet",
    loading: "Loading...",
    address: "Your address", addressPlaceholder: "Street, City, Zip code",
    payment: "Payment method", orderNow: "Order Now",
    orderSuccess: "Order successfully placed!",
    loginRequired: "You must login to purchase", fillAllFields: "Please fill all fields",
    myOrders: "My Orders", status: "Status", delivery: "Delivery estimate",
    noOrders: "No orders yet", pending: "Pending", confirmed: "Confirmed",
    cancelled: "Cancelled", delivered: "Delivered", waiting: "Waiting...",
    addProduct: "Add a product", productName: "Product name",
    productNamePlaceholder: "Ex: White rice", productPrice: "Price",
    productPricePlaceholder: "25.00", productImage: "Image URL",
    productImagePlaceholder: "https://...", productDesc: "Description",
    productDescPlaceholder: "Product description...",
    oldPrice: "Old price (if any)", oldPricePlaceholder: "30.00",
    save: "Save", delete: "Delete", edit: "Edit",
    existingProducts: "Existing products", customerOrders: "Customer orders",
    noOrdersAdmin: "No orders", noProductsAdmin: "No products",
    delayPlaceholder: "Ex: 3 days", updateStatus: "Update status",
    clients: "Clients", client: "Client", clientName: "Client name",
    clientEmail: "Client email", clientSince: "Client since",
    role: "Role", makeAdmin: "Make admin", makeClient: "Make client",
    loginTitle: "Login to purchase", createAccount: "Create account",
    createAccountTitle: "Create your account", noAccount: "No account?",
    alreadyAccount: "Already have an account?", or: "or",
    continueGoogle: "Continue with Google", emailPlaceholder: "Email",
    passwordPlaceholder: "Password", namePlaceholder: "Your name",
    passwordMin: "Password (min 6 characters)", selectRole: "Select your role (default: Client)",
    notifications: "Notifications", specialOffers: "Special Offers",
    settings: "Settings", history: "History",
    specialPrice: "Special price!", promo: "Promotion!",
    noSpecialOffers: "No special offers at the moment", offer: "OFFER",
    noNotifications: "No notifications", today: "Today",
    sendNotification: "Send notification", notificationTitle: "Notification title",
    notificationMessage: "Notification message",
    language: "Lang", accountInfo: "Account info",
    email: "Email", name: "Name", emailVerified: "Email verified",
    yes: "Yes", no: "No", resendVerifyEmail: "Resend verification email",
    welcomeBack: "Welcome!", welcomeAdmin: "Welcome Admin!",
    accountCreated: "Account created successfully!", loggedOut: "You are logged out",
    productAdded: "Product added!", productUpdated: "Product updated!",
    productDeleted: "Product deleted", delayUpdated: "Delivery time updated!",
    statusUpdated: "Status updated!", delayRequired: "Enter a delivery time",
    accountNotFound: "This account doesn't exist. Create an account.",
    passwordError: "Password must be at least 6 characters",
    confirmDelete: "Are you sure you want to delete?",
    adminOnly: "Admin only",
    emailVerifySent: "📩 Check your email to verify your account!",
    emailNotVerified: "❌ Verify your email before logging in!",
    emailVerifyWarning: "⚠️ Verify your email to continue",
    resendEmail: "⏳ If you don't see the email, check your spam folder...",
    errorOccurred: "Error: ", clientLabel: "Client", date: "Date",
    footerRights: "Total Lakay © 2026", footerContact: "Contact us",
    footerServices: "Services", footerPrivacy: "Privacy",
    footerTerms: "Terms of Use",
    footerSlogan: "Haiti's largest online store offering the best products with a fast and secure delivery service.",
    footerCopy: "Total Lakay © 2026. All rights reserved. Designed with ❤️ for Haiti.",
    new: "New",
    notifSent: "✅ Notification sent!",
    roleChanged: "✅ Role changed!",
    madeAdmin: "✅ Made admin!",
    madeClient: "✅ Made client!",
    searchPlaceholder: "🔍 Search a product...",
    aiAssistant: "AI Assistant",
    aiPageTitle: "Chat with AI",
    aiPageDesc: "Ask our intelligent assistant any questions about the platform or our products.",
    aiWelcome: "Hello! How can I help you today?",
    aiInputPlaceholder: "Type your message...",
    aiError: "I have a connection problem. Please try again.",
    aiTyping: "🤔 Analyzing...",
    aiLoginRequiredDesc: "You must be logged in to chat with our intelligent assistant.",
    allCategories: "All categories",
    priceMin: "Min price",
    priceMax: "Max price",
    applyFilters: "Filter",
    resetFilters: "Reset",
    sortDateDesc: "Newest",
    sortDateAsc: "Oldest",
    sortPriceAsc: "Price: Low → High",
    sortPriceDesc: "Price: High → Low",
    sortNameAsc: "Name: A → Z",
    sortNameDesc: "Name: Z → A",
    resultsFound: "results found",
    noResultsFound: "No results. Try other words.",
    left: "left",
    testimonialsTitle: "What our customers say",
    orderSummary: "Order Summary",
    orderInfo: "Shipping Information",
    confirmOrder: "Confirm Order",
    mustPurchaseToReview: "You must have purchased and received this product to leave a review.",
    categoryElectronics: "📱 Electronics",
    categoryClothing: "👕 Clothing & Accessories",
    categorySchool: "🎓 School",
    categoryWork: "💼 Work",
    categoryHome: "🏠 Home",
    categoryBeauty: "💄 Beauty",
    categoryOther: "📦 Other",
    categoryClothingAccessories: "👕 Clothing & Accessories",
    categorySchoolOffice: "🎓 School & Work",
    categoryHomePersonal: "🏠 Home & Personal",
    categoryElectronicsTech: "📱 Electronics",
    balance: "Balance",
    myBalance: "Your balance",
    refund: "Money Refunded",
    onlineClients: "Online Clients",
    moncashSettings: "MonCash Settings (Real Payment)",
    saveConfig: "Save Configuration",
    linkMoncash: "Link your MonCash account",
    moncashPhone: "Your MonCash number",
    moncashTerms: "I accept the MonCash terms of use and privacy policy",
    connect: "Link",
    connected: "Linked successfully",
    termsConsentTitle: "Terms of Use",
    termsConsentDesc: "To continue using Total Lakay, you must accept our terms of use and our privacy policy.",
    accept: "Accept", decline: "Decline",
    cancellationReason: "Cancellation Reason", reasonPlaceholder: "Why are you cancelling this order?",
    reasonRequired: "You must provide a reason for the cancellation.",
    recentProducts: "Recent Products", categoriesTitle: "Categories", exploreCategories: "Explore all our categories",
    school: "School", work: "Work", home: "Home", electronics: "Electronics", beauty: "Beauty", clothing: "Clothing",
    stock: "Stock Quantity", category: "Category", colors: "Colors (comma separated)", sizes: "Sizes (comma separated)",
    selectColor: "Select Color", selectSize: "Select Size", quantity: "Quantity", outOfStock: "Out of stock",
    servicesTitle: "Our Services", privacyTitle: "Privacy Policy", termsTitle: "Terms of Use",
    phoneRecommend: "Your phone number", addressRecommend: "Your full address", phoneRequired: "Phone is required",
    cart: "Cart", checkout: "Checkout now", securePaymentInfo: "100% Secure Payment",
    profile: "Profile", phone: "Phone", phonePlaceholder: "Ex: +509 1234 5678",
    updateProfile: "Update Profile", profileUpdated: "Profile updated successfully!",
    phoneNumber: "Phone Number", saveProfile: "Save Profile",
    addressRecommend: "Address (Recommended)", phoneRecommend: "Phone (Recommended)",
    addToCart: "Add to cart", removeFromCart: "Remove",
    notifSettings: "Notification Settings", notifPushEnable: "Enable Push Notifications",
    notifNewProducts: "New Products", notifSpecialPrices: "Special Prices & Promos",
    notifUpdates: "Site Updates", notifStatus: "Notification Status",
    notifBlocked: "Blocked by browser", notifGranted: "Authorized",
    notifRequest: "Authorize Now", notifSave: "Save Preferences",
    notifPreferencesSaved: "Notification preferences saved!",
    accountInfo: "Account Info", email: "Email", name: "Name", role: "Role", emailVerified: "Email Verified",
    yes: "Yes", no: "No", resendVerifyEmail: "Resend verification email",
    total: "Total", emptyCart: "Your cart is empty",
    securePayment: "Secure Payment", contactUs: "Contact Us",
    favorites: "Favorites", noFavorites: "No favorites yet",
    reviews: "Reviews", leaveReview: "Leave a review", addReview: "Add a review", noReviews: "No reviews yet",
    rating: "Rating", comment: "Comment", submit: "Submit", invalidAddress: "Invalid address",
    ratingError: "Choose a rating (stars)", commentError: "Write a comment", reviewSuccess: "Thank you for your review!", reviewError: "Error sending review",
    servicesIntro: "Total Lakay uses cutting-edge technology to give you the best experience:",
    servicesOnline: "AI-Powered Sales:",
    servicesOnlineDesc: "An intelligent assistant to help you find what you need and personalized recommendations.",
    servicesDelivery: "PWA & Offline Access:",
    servicesDeliveryDesc: "Fast access even without internet thanks to our PWA technology and real-time notifications.",
    servicesCustomer: "24/7 Support:",
    servicesCustomerDesc: "We are available via WhatsApp and our AI assistant to answer all your questions.",
    servicesSecure: "MonCash Payments:",
    servicesSecureDesc: "Fast and secure payments with the MonCash system directly on the platform.",
    privacyIntro: "At Total Lakay, we protect your data with AI technology:",
    privacyData: "Data Collection:",
    privacyDataDesc: "We only collect information necessary for your deliveries (name, address, phone).",
    privacySecurity: "AI Security:",
    privacySecurityDesc: "We use AI to detect fraud and ensure your transactions are secure.",
    privacySharing: "Privacy:",
    privacySharingDesc: "Your data is encrypted and never shared with third parties without your consent.",
    privacyRights: "Your Rights:",
    privacyRightsDesc: "You can delete or modify your information anytime in your profile.",
    termsIntro: "By using Total Lakay, you accept the following conditions:",
    termsAccount: "Account & Security:",
    termsAccountDesc: "You are responsible for your password security and all activities on your account.",
    termsPurchase: "AI-Verified Purchases:",
    termsPurchaseDesc: "Our AI system analyzes each order to prevent fraud. All purchases are final unless damaged.",
    termsPrice: "Price and Products:",
    termsPriceDesc: "Prices may change without notice. We strive for accurate descriptions.",
    termsMod: "Updates:",
    termsModDesc: "Total Lakay may modify these terms and we will notify you.",
    logistics: "Logistics", logisticsDashboard: "Logistics Dashboard",
    liveFleet: "Live Fleet", activeOrders: "Active Orders",
    trackOrder: "Track Order", in_transit: "In Transit", completed: "Completed",
    validated: "Validated", processing: "Processing", returnLogistics: "Return to Logistics",
    enableAi: "Enable AI", test: "Test", amount: "Amount", actions: "Actions",
    orderTracking: "Order Tracking", orderCode: "Order Code",
    allowLocation: "Allow Geolocation",
    locationDesc: "Enable this for more precise delivery via GPS tracking.",
    urgentDeliveries: "Urgent Deliveries"
  },
  es: {
    forgotPassword: "¿Olvidaste tu contraseña?",
    enterEmailReset: "Por favor, introduce tu correo para restablecer la contraseña",
    resetEmailSent: "¡Correo electrónico de restablecimiento enviado con éxito!",
    home: "Inicio", shop: "Tienda", orders: "Pedidos", admin: "Admin",
    login: "Iniciar sesión", logout: "Cerrar sesión",
    dashboard: "Panel de control", totalProducts: "Total Productos",
    totalOrders: "Total Pedidos", totalClients: "Total Clientes",
    pendingOrders: "Pedidos Pendientes", confirmedOrders: "Pedidos Confirmados",
    revenue: "Ingresos Totales", recentOrders: "Pedidos Recientes",
    manageProducts: "Gestionar Productos", manageOrders: "Gestionar Pedidos",
    manageClients: "Gestionar Clientes", statistics: "Estadísticas",
    quickActions: "Acciones Rápidas",
    welcome: "Bienvenido a Total Lakay", slogan: "Todo lo que necesitas, a un clic.",
    shopSlogan: "Encuentra todos nuestros productos de calidad en un solo lugar.",
    featured: "Productos destacados", goShop: "Ir a la tienda",
    buy: "Comprar", price: "Precio", noProducts: "No hay productos aún",
    loading: "Cargando...",
    address: "Tu dirección", addressPlaceholder: "Calle, Ciudad, Código postal",
    payment: "Método de pago", orderNow: "Ordenar ahora",
    orderSuccess: "¡Pedido registrado con éxito!",
    loginRequired: "Debes iniciar sesión para comprar", fillAllFields: "Completa todos los campos",
    myOrders: "Mis pedidos", status: "Estado", delivery: "Tiempo de entrega",
    noOrders: "No hay pedidos", pending: "Pendiente", confirmed: "Confirmado",
    cancelled: "Cancelado", delivered: "Entregado", waiting: "Esperando...",
    addProduct: "Añadir producto", productName: "Nombre del producto",
    productNamePlaceholder: "Ej: Arroz blanco", productPrice: "Precio",
    productPricePlaceholder: "25.00", productImage: "URL de imagen",
    productImagePlaceholder: "https://...", productDesc: "Descripción",
    productDescPlaceholder: "Descripción del producto...",
    oldPrice: "Precio anterior (si aplica)", oldPricePlaceholder: "30.00",
    save: "Guardar", delete: "Eliminar", edit: "Editar",
    existingProducts: "Productos existentes", customerOrders: "Pedidos de clientes",
    noOrdersAdmin: "No hay pedidos", noProductsAdmin: "No hay productos",
    delayPlaceholder: "Ej: 3 días", updateStatus: "Actualizar estado",
    clients: "Clientes", client: "Cliente", clientName: "Nombre cliente",
    clientEmail: "Email cliente", clientSince: "Cliente desde",
    role: "Rol", makeAdmin: "Hacer admin", makeClient: "Hacer cliente",
    loginTitle: "Inicia sesión para comprar", createAccount: "Crear cuenta",
    createAccountTitle: "Crea tu cuenta", noAccount: "¿No tienes cuenta?",
    alreadyAccount: "¿Ya tienes cuenta?", or: "o",
    continueGoogle: "Continuar con Google", emailPlaceholder: "Email",
    passwordPlaceholder: "Contraseña", namePlaceholder: "Tu nombre",
    passwordMin: "Contraseña (mín 6 caracteres)", selectRole: "Elige tu rol (defecto: Cliente)",
    notifications: "Notificaciones", specialOffers: "Ofertas especiales",
    settings: "Configuración", history: "Historial",
    specialPrice: "¡Precio especial!", promo: "¡Promoción!",
    noSpecialOffers: "No hay ofertas especiales ahora", offer: "OFERTA",
    noNotifications: "No hay notificaciones", today: "Hoy",
    sendNotification: "Enviar notificación", notificationTitle: "Título notificación",
    notificationMessage: "Mensaje notificación",
    language: "Idioma", accountInfo: "Información de cuenta",
    email: "Email", name: "Nombre", emailVerified: "Email verificado",
    yes: "Sí", no: "No", resendVerifyEmail: "Reenviar email de verificación",
    welcomeBack: "¡Bienvenido!", welcomeAdmin: "¡Bienvenido Admin!",
    accountCreated: "¡Cuenta creada con éxito!", loggedOut: "Has cerrado sesión",
    productAdded: "¡Producto añadido!", productUpdated: "¡Producto actualizado!",
    productDeleted: "Producto eliminado", delayUpdated: "¡Tiempo de entrega actualizado!",
    statusUpdated: "¡Estado actualizado!", delayRequired: "Ingresa un tiempo de entrega",
    accountNotFound: "Esta cuenta no existe. Crea una cuenta.",
    passwordError: "La contraseña debe tener al menos 6 caracteres",
    confirmDelete: "¿Estás seguro de eliminar?",
    adminOnly: "Solo admin",
    emailVerifySent: "📩 ¡Revisa tu email para verificar tu cuenta!",
    emailNotVerified: "❌ ¡Verifica tu email antes de iniciar sesión!",
    emailVerifyWarning: "⚠️ Verifica tu email para continuar",
    resendEmail: "⏳ Si no ves el email, revisa tu carpeta de spam...",
    errorOccurred: "Error: ", clientLabel: "Cliente", date: "Fecha",
    footerRights: "Total Lakay © 2026", footerContact: "Contáctanos",
    footerServices: "Servicios", footerPrivacy: "Privacidad",
    footerTerms: "Condiciones de Uso",
    footerSlogan: "La tienda en línea más grande de Haití que ofrece los mejores productos con un servicio de entrega rápido y seguro.",
    footerCopy: "Total Lakay © 2026. Todos los derechos reservados. Diseñado con ❤️ para Haití.",
    new: "Nuevo",
    notifSent: "✅ ¡Notificación enviada!",
    roleChanged: "✅ ¡Rol cambiado!",
    madeAdmin: "✅ ¡Hecho admin!",
    madeClient: "✅ ¡Hecho cliente!",
    searchPlaceholder: "🔍 Buscar un producto...",
    aiAssistant: "Asistente IA",
    aiPageTitle: "Chat con IA",
    aiPageDesc: "Pregúntale a nuestro asistente inteligente cualquier cosa sobre la plataforma o nuestros productos.",
    aiWelcome: "¡Hola! ¿Cómo puedo ayudarte hoy?",
    aiInputPlaceholder: "Escribe tu mensaje...",
    aiError: "Tengo un pequeño problema de conexión. Inténtalo de nuevo.",
    aiTyping: "🤔 Analizando...",
    aiLoginRequiredDesc: "Debes iniciar sesión para chatear con nuestro asistente inteligente.",
    allCategories: "Todas categorías",
    priceMin: "Precio mín",
    priceMax: "Precio máx",
    applyFilters: "Filtrar",
    resetFilters: "Restablecer",
    sortDateDesc: "Más reciente",
    sortDateAsc: "Más antiguo",
    sortPriceAsc: "Precio: Bajo → Alto",
    sortPriceDesc: "Precio: Alto → Bajo",
    sortNameAsc: "Nombre: A → Z",
    sortNameDesc: "Nombre: Z → A",
    resultsFound: "resultados encontrados",
    noResultsFound: "Sin resultados. Prueba otras palabras.",
    left: "restantes",
    testimonialsTitle: "Lo que dicen nuestros clientes",
    orderSummary: "Resumen del pedido",
    orderInfo: "Información de envío",
    confirmOrder: "Confirmar pedido",
    mustPurchaseToReview: "Debes haber comprado y recibido este producto para dejar una reseña.",
    mostRecent: "Más reciente",
    priceLowToHigh: "Precio: Bajo → Alto",
    priceHighToLow: "Precio: Alto → Bajo",
    categoryElectronics: "📱 Electrónica",
    categoryClothing: "👕 Ropa y Accesorios",
    categorySchool: "🎓 Escuela",
    categoryWork: "💼 Trabajo",
    categoryHome: "🏠 Hogar",
    categoryBeauty: "💄 Belleza",
    categoryOther: "📦 Otros",
    categoryClothingAccessories: "👕 Ropa y Accesorios",
    categorySchoolOffice: "🎓 Escuela y Trabajo",
    categoryHomePersonal: "🏠 Hogar y Personal",
    categoryElectronicsTech: "📱 Electrónica",
    balance: "Saldo",
    myBalance: "Tu saldo",
    refund: "Dinero Reembolsado",
    onlineClients: "Clientes en línea",
    moncashSettings: "Ajustes de MonCash (Pago Real)",
    saveConfig: "Guardar Configuración",
    linkMoncash: "Vincular tu cuenta MonCash",
    moncashPhone: "Tu número MonCash",
    moncashTerms: "Acepto los términos de uso y la política de privacidad de MonCash",
    connect: "Vincular",
    connected: "Vinculado con éxito",
    termsConsentTitle: "Términos de Uso",
    termsConsentDesc: "Para continuar usando Total Lakay, debe aceptar nuestros términos de uso y nuestra política de privacidad.",
    accept: "Aceptar", decline: "Rechazar",
    cancellationReason: "Razón de cancelación", reasonPlaceholder: "¿Por qué cancela este pedido?",
    reasonRequired: "Debe proporcionar una razón para la cancelación.",
    recentProducts: "Productos Recientes", categoriesTitle: "Categorías", exploreCategories: "Explora todas nuestras categorías",
    school: "Escuela", work: "Trabajo", home: "Hogar", electronics: "Electrónica", beauty: "Belleza", clothing: "Ropa",
    stock: "Cantidad en stock", category: "Categoría", colors: "Colores (separados por comas)", sizes: "Tallas (separadas por comas)",
    selectColor: "Seleccionar Color", selectSize: "Seleccionar Talla", quantity: "Cantidad", outOfStock: "Sin stock",
    servicesTitle: "Nuestros Servicios", privacyTitle: "Privacidad", termsTitle: "Condiciones",
    phoneRecommend: "Tu número de teléfono", addressRecommend: "Tu dirección completa", phoneRequired: "Teléfono requerido",
    cart: "Carrito", checkout: "Pagar ahora", securePaymentInfo: "Pago 100% seguro",
    profile: "Perfil", phone: "Teléfono", phonePlaceholder: "Ej: +509 1234 5678",
    updateProfile: "Actualizar perfil", profileUpdated: "¡Perfil actualizado con éxito!",
    phoneNumber: "Número de teléfono", saveProfile: "Guardar Perfil",
    addressRecommend: "Dirección (Recomendado)", phoneRecommend: "Teléfono (Recommandado)",
    total: "Total", emptyCart: "Tu carrito está vacío",
    securePayment: "Pago Seguro", contactUs: "Contáctenos",
    notifications: "Notificaciones", noNotifications: "No hay notificaciones",
    favorites: "Favoritos", noFavorites: "Aún no hay favoritos",
    reviews: "Reseñas", leaveReview: "Dejar una reseña", addReview: "Agregar una reseña", noReviews: "Aún no hay reseñas",
    rating: "Calificación", comment: "Comentario", submit: "Enviar", invalidAddress: "Dirección inválida",
    ratingError: "Elige una calificación (estrellas)", commentError: "Escribe un comentario", reviewSuccess: "¡Gracias por tu reseña!", reviewError: "Error enviando reseña",
    servicesIntro: "Total Lakay utiliza tecnología de vanguardia para ofrecerte la mejor experiencia:",
    servicesOnline: "Venta con IA:",
    servicesOnlineDesc: "Un asistente inteligente para ayudarte a encontrar lo que necesitas y recomendaciones personalizadas.",
    servicesDelivery: "Experiencia PWA:",
    servicesDeliveryDesc: "Acceso rápido incluso sin internet gracias a nuestra tecnología PWA y notificaciones en tiempo real.",
    servicesCustomer: "Soporte 24/7:",
    servicesCustomerDesc: "Estamos disponibles a través de WhatsApp y nuestro asistente de IA para responder todas tus preguntas.",
    servicesSecure: "Pagos MonCash:",
    servicesSecureDesc: "Pagos rápidos y seguros con el sistema MonCash directamente en la plataforma.",
    privacyIntro: "En Total Lakay, protegemos tus datos con tecnología de IA:",
    privacyData: "Recopilación de Datos:",
    privacyDataDesc: "Solo recopilamos información necesaria para tus entregas (nombre, dirección, teléfono).",
    privacySecurity: "Seguridad con IA:",
    privacySecurityDesc: "Utilizamos IA para detectar fraudes y garantizar que tus transacciones sean seguras.",
    privacySharing: "Privacidad:",
    privacySharingDesc: "Tus datos están cifrados y nunca se comparten con terceros sin tu consentimiento.",
    privacyRights: "Tus Derechos:",
    privacyRightsDesc: "Puedes eliminar o modificar tu información en cualquier momento en tu perfil.",
    termsIntro: "Al usar Total Lakay, aceptas las siguientes condiciones:",
    termsAccount: "Cuenta y Seguridad:",
    termsAccountDesc: "Eres responsable de la seguridad de tu contraseña y de todas las actividades en tu cuenta.",
    termsPurchase: "Compras Verificadas por IA:",
    termsPurchaseDesc: "Nuestro sistema de IA analiza cada pedido para evitar fraudes. Todas las compras son definitivas a menos que haya daños.",
    termsPrice: "Precios y Productos:",
    termsPriceDesc: "Los precios pueden cambiar sin previo aviso. Nos esforzamos por tener descripciones precisas.",
    termsMod: "Actualizaciones:",
    termsModDesc: "Total Lakay puede modificar estos términos y te notificaremos.",
    termsConsentTitle: "Condiciones de Uso",
    termsConsentDesc: "Para continuar usando Total Lakay, debe aceptar nuestros términos de uso y nuestra política de privacidad.",
    accept: "Aceptar", decline: "Rechazar",
    logistics: "Logística", logisticsDashboard: "Panel de Logística",
    liveFleet: "Flota en Vivo", activeOrders: "Pedidos Activos",
    trackOrder: "Rastrear Pedido", in_transit: "En tránsito", completed: "Completado",
    validated: "Validado", processing: "En proceso", returnLogistics: "Volver a Logística",
    enableAi: "Activar IA", test: "Probar", amount: "Monto", actions: "Acciones"
  }
};

// ---------- CART FUNCTIONS ----------
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const productName = gt(product.name);
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity = Math.max(1, (existing.quantity || 1) + 1);
  } else {
    cart.push({
      id: product.id,
      name: productName,
      price: product.price,
      image: product.image || '',
      quantity: 1
    });
  }

  saveCart();
  if (document.getElementById('cartDrawer')?.classList.contains('open')) {
    renderCartDrawer();
  }
  showMessage(t('addToCart') + ': ' + productName);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;

  const totalQuantity = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (totalQuantity > 0) {
    badge.textContent = totalQuantity;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderCart() {
  const list = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalAmount');
  if (!list || !totalEl) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-center" style="padding:2rem;">🛒 ${t('emptyCart')}</p>`;
    totalEl.textContent = formatPrice(0);
    return;
  }

  let total = 0;
  list.innerHTML = cart.map((item, index) => {
    const quantity = item.quantity || 1;
    const itemTotal = item.price * quantity;
    total += itemTotal;
    return `
      <div class="cart-item" style="display:flex; align-items:center; gap:1rem; padding:0.8rem; border-bottom:1px solid #eee;">
        <img src="${item.image || 'logo.jpeg'}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;" loading="lazy" onerror="this.src='logo.jpeg'">
        <div style="flex:1;">
          <div style="font-weight:700; color:var(--blue-deep);">${item.name}</div>
          <div style="display:flex; align-items:center; gap:10px; color:var(--text-soft); font-size:0.9rem; margin-top:5px;">
            <span>${quantity}x ${formatPrice(item.price)}</span>
            <strong style="color:var(--gold);">${formatPrice(itemTotal)}</strong>
          </div>
        </div>
        <button class="btn btn-danger btn-sm remove-cart-item" data-index="${index}">🗑️</button>
      </div>
    `;
  }).join('');
  totalEl.textContent = formatPrice(total);

  document.querySelectorAll('.remove-cart-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      removeFromCart(index);
    });
  });
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function toggleFavorite(productId) {
  const index = favorites.indexOf(productId);
  if (index > -1) {
    favorites.splice(index, 1);
    showMessage('Retire nan favori');
  } else {
    favorites.push(productId);
    showMessage('Ajoute nan favori');
  }
  localStorage.setItem('totalLakayFavorites', JSON.stringify(favorites));
  if (currentView === 'shop' || currentView === 'home') renderView(currentView);
}

// ---------- NOTIFICATIONS FUNCTIONS ----------
function listenNotifications() {
  db.collection('notifications').orderBy('createdAt', 'desc').limit(20).onSnapshot(snap => {
    const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (isAdmin) {
      notifications = allNotifs;
    } else {
      notifications = allNotifs.filter(n =>
        n.targetRole === 'all' ||
        !n.targetRole ||
        (n.targetUserId && n.targetUserId === currentUser.uid)
      );
    }

    updateNotifBadge();
  });
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unreadCount = notifications.filter(n => !n.read).length;
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderNotificationsModal() {
  const app = document.getElementById('appContent');
  if (!app) return;
  app.innerHTML = `
    <div class="card-premium">
      <h2>🔔 ${t('notifications')}</h2>
      ${notifications.length === 0 ? `<p class="text-center" style="padding:2rem;">📭 ${t('noNotifications')}</p>` : notifications.map(n => `
        <div class="card" style="margin-bottom:0.8rem; border-left:4px solid ${n.read ? '#ccc' : 'var(--gold)'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${n.title}</strong>
            ${!n.read ? `<button class="btn btn-sm btn-outline mark-read" data-id="${n.id}">👁️</button>` : ''}
          </div>
          <p>${n.message}</p>
        </div>`).join('')}
    </div>
  `;
  document.querySelectorAll('.mark-read').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      await db.collection('notifications').doc(id).update({ read: true });
      renderNotificationsModal();
    });
  });
}

function formatPrice(priceBase) {
  const rate = exchangeRates[currentCurrency] || 1;
  const converted = priceBase * rate;
  if (currentCurrency === 'USD') return `$${converted.toFixed(2)}`;
  if (currentCurrency === 'HTG') return `${Math.round(converted).toLocaleString()} G`;
  if (currentCurrency === 'EUR') return `${converted.toFixed(2)} €`;
  return `${converted.toFixed(2)} ${currentCurrency}`;
}

function generateOrderCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TL-${result}`;
}

// ---------- FONCTIONS UTILITAIRES ----------
function t(key) { return i18n[currentLang]?.[key] || key; }

function applyLanguage(shouldRender = true) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[currentLang]?.[key]) el.textContent = i18n[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[currentLang]?.[key]) el.placeholder = i18n[currentLang][key];
  });

  if (shouldRender && currentView) renderView(currentView);
}

function showMessage(message, type = 'success') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:1.2rem;">${type === 'success' ? '✅' : type === 'info' ? 'ℹ️' : '⚠️'}</span>
      <span>${message}</span>
    </div>
  `;
  toast.style.cssText = `
    position:fixed; bottom:30px; right:30px;
    background: ${type === 'success' ? 'var(--blue-deep)' : type === 'info' ? 'var(--blue-medium)' : 'var(--danger)'};
    color:white; padding:16px 24px; border-radius:var(--radius);
    font-weight:600; z-index:3000;
    box-shadow: var(--shadow-xl);
    border-left: 5px solid ${type === 'success' ? 'var(--gold)' : 'white'};
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'var(--transition)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Translation Helpers
async function autoTranslate(text, targetLang) {
  if (!text) return "";
  const sourceLang = currentLang;
  if (sourceLang === targetLang) return text;
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`);
    const data = await res.json();
    return data.responseData.translatedText || text;
  } catch (e) { return text; }
}

async function getTranslations(text) {
  if (!text) return "";
  const langs = ['ht', 'fr', 'en', 'es'];
  const results = {};
  await Promise.all(langs.map(async (l) => {
    results[l] = await autoTranslate(text, l);
  }));
  return results;
}

function gt(field) {
  if (!field) return "";
  if (typeof field === 'object') {
    return field[currentLang] || field['ht'] || field['en'] || Object.values(field)[0] || "";
  }
  return field;
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// ============================================
// AUTHENTIFICATION AVEC RÔLES
// ============================================
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  const authBtn = document.getElementById('authBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminElements = document.querySelectorAll('.admin-only');
  const vendorElements = document.querySelectorAll('.vendor-only');
  const userElements = document.querySelectorAll('.user-only');

  if (user) {
    try {
      await user.reload();
    } catch (err) {
      console.warn('Unable to refresh user state:', err);
    }

    if (!user.emailVerified) {
      showMessage(t('emailVerifyWarning'), 'error');
      await auth.signOut();
      currentUser = null;
      setPageRole('client');
      renderView('home');
      return;
    }

    if (user.metadata?.lastSignInTime) {
      const signedInAt = new Date(user.metadata.lastSignInTime).getTime();
      if (Date.now() - signedInAt > SESSION_EXPIRY_MS) {
        showMessage(t('loggedOut') + ' (session expirée)', 'info');
        await auth.signOut();
        currentUser = null;
        setPageRole('client');
        renderView('home');
        return;
      }
    }

    let userDoc;
    try {
      const snapshot = await db.collection('users').doc(user.uid).get();
      if (!snapshot.exists) {
        const defaults = {
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          role: 'client',
          permissions: rolePermissions.client,
          status: 'active',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('users').doc(user.uid).set(defaults);
        userDoc = { exists: true, data: () => defaults };
      } else {
        userDoc = snapshot;
      }
    } catch (err) {
      console.error('Firestore user lookup failed:', err);
      showMessage(t('errorOccurred') + err.message, 'error');
      userRole = 'client';
      isAdmin = false;
      setPageRole('client');
      renderView('home');
      return;
    }

    const rawRole = String(userDoc.data().role || 'client').toLowerCase();
    userRole = rawRole;
    pageRole = normalizeRole(rawRole);
    isAdmin = pageRole === 'admin';

    const expectedPermissions = rolePermissions[pageRole] || [];
    const storedPermissions = Array.isArray(userDoc.data().permissions) ? userDoc.data().permissions : [];
    if (!expectedPermissions.every((permission) => storedPermissions.includes(permission))) {
      await db.collection('users').doc(user.uid).update({ permissions: expectedPermissions });
    }

    setPageRole(rawRole);
    if (authBtn) authBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    userElements.forEach(el => el.classList.remove('hidden'));
    adminElements.forEach(el => el.classList.toggle('hidden', pageRole !== 'admin'));
    vendorElements.forEach(el => el.classList.toggle('hidden', pageRole !== 'vendor'));

    if (logoutBtn) {
      logoutBtn.innerHTML = `🚪 <span>${isAdmin ? 'Admin: ' : ''}${t('logout')}</span>`;
    }
    listenNotifications();
  } else {
    if (authBtn) authBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    adminElements.forEach(el => el.classList.add('hidden'));
    vendorElements.forEach(el => el.classList.add('hidden'));
    userElements.forEach(el => el.classList.add('hidden'));
    userRole = null;
    isAdmin = false;
    setPageRole('client');
  }

  if (user) {
    updatePresence();
    setInterval(updatePresence, 2 * 60 * 1000);
  }

  if (!isRoleAllowed(currentView)) {
    currentView = getDefaultViewForRole(pageRole);
  }
  updateCartBadge();
  renderView(currentView);
  if (isAdmin) loadAllData();
  loadNotifications();
});

// ============================================
// BOUTON CONNEXION
// ============================================
window.openAuthModal = openAuthModal;
window.handleCartClick = handleCartClick;

function setupHeaderActionButtons() {
  const authBtn = document.getElementById('authBtn');
  const cartBtn = document.getElementById('cartBtn');
  const drawerOverlay = document.getElementById('drawerOverlay');

  authBtn?.addEventListener('click', () => openAuthModal());
  cartBtn?.addEventListener('click', () => handleCartClick());
  drawerOverlay?.addEventListener('click', () => toggleCartDrawer());
}

function attachModalEventListeners() {
  const googleBtn = getEl('googleLoginBtn');
  const emailBtn = getEl('emailLoginBtn');
  const registerBtn = getEl('registerBtn');
  const closeBtn = getEl('closeLoginModal');
  const switchToRegister = getEl('switchToRegister');
  const switchToLogin = getEl('switchToLogin');
  const forgotLink = getEl('forgotPasswordLink');

  if (googleBtn) {
    googleBtn.removeEventListener('click', googleLoginHandler);
    googleBtn.addEventListener('click', googleLoginHandler);
  }
  if (emailBtn) {
    emailBtn.removeEventListener('click', emailLoginHandler);
    emailBtn.addEventListener('click', emailLoginHandler);
  }
  if (registerBtn) {
    registerBtn.removeEventListener('click', registerHandler);
    registerBtn.addEventListener('click', registerHandler);
  }
  if (closeBtn) {
    closeBtn.removeEventListener('click', closeModalHandler);
    closeBtn.addEventListener('click', closeModalHandler);
  }
  if (switchToRegister) {
    switchToRegister.removeEventListener('click', switchToRegisterHandler);
    switchToRegister.addEventListener('click', switchToRegisterHandler);
  }
  if (switchToLogin) {
    switchToLogin.removeEventListener('click', switchToLoginHandler);
    switchToLogin.addEventListener('click', switchToLoginHandler);
  }
  if (forgotLink) {
    forgotLink.removeEventListener('click', forgotPasswordHandler);
    forgotLink.addEventListener('click', forgotPasswordHandler);
  }
}

function googleLoginHandler() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(() => { getEl('loginModal')?.classList.add('hidden'); showMessage(t('welcomeBack'), 'success'); })
    .catch(err => showMessage(t('errorOccurred') + err.message, 'error'));
}

function emailLoginHandler() {
  const email = getEl('loginEmail')?.value.trim();
  const password = getEl('loginPassword')?.value;
  if (!email || !password) { showMessage(t('fillAllFields'), 'error'); return; }
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      if (!userCredential.user.emailVerified) {
        showMessage(t('emailNotVerified'), 'error');
        userCredential.user.sendEmailVerification().catch(() => { });
        auth.signOut(); return;
      }
      getEl('loginModal')?.classList.add('hidden');
      showMessage(t('welcomeBack'), 'success');
    })
    .catch(err => {
      if (err.code === 'auth/user-not-found') showMessage(t('accountNotFound'), 'error');
      else showMessage(t('errorOccurred') + err.message, 'error');
    });
}

function registerHandler() {
  const name = getEl('registerName')?.value.trim();
  const email = getEl('registerEmail')?.value.trim();
  const password = getEl('registerPassword')?.value;
  if (!name || !email || !password) { showMessage(t('fillAllFields'), 'error'); return; }
  if (password.length < 6) { showMessage(t('passwordError'), 'error'); return; }
  auth.createUserWithEmailAndPassword(email, password)
    .then(async (cred) => {
      await cred.user.sendEmailVerification();
      await cred.user.updateProfile({ displayName: name });
      await db.collection('users').doc(cred.user.uid).set({
        email, displayName: name, role: 'client', emailVerified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      getEl('loginModal')?.classList.add('hidden');
      await auth.signOut();
      showMessage(t('emailVerifySent'), 'success');
    })
    .catch(err => showMessage(t('errorOccurred') + err.message, 'error'));
}

function closeModalHandler() {
  getEl('loginModal')?.classList.add('hidden');
}

function switchToRegisterHandler(e) {
  e.preventDefault();
  getEl('loginFormCard')?.classList.add('hidden');
  getEl('registerForm')?.classList.remove('hidden');
  setElValue('registerName', '');
  setElValue('registerEmail', '');
  setElValue('registerPassword', '');
  applyLanguage();
}

function switchToLoginHandler(e) {
  e.preventDefault();
  getEl('registerForm')?.classList.add('hidden');
  getEl('loginFormCard')?.classList.remove('hidden');
  applyLanguage();
}

async function forgotPasswordHandler(e) {
  e.preventDefault();
  const email = getEl('loginEmail')?.value.trim();
  if (!email) {
    showMessage(t('enterEmailReset'), 'error');
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    showMessage(t('resetEmailSent'), 'success');
  } catch (err) {
    showMessage(t('errorOccurred') + err.message, 'error');
  }
}

// Écouter la touche Escape pour fermer le modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    getEl('loginModal')?.classList.add('hidden');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  auth.signOut();
  showMessage(t('loggedOut'), 'success');
});

// ============================================
// NAVIGATION (centralized)
// ============================================
function initNavigation() {
  const navMap = [
    { id: 'navHome', view: () => getDefaultViewForRole(pageRole) },
    { id: 'navShop', view: 'shop' },
    { id: 'navAI', view: 'aiPage' },
    { id: 'navProfile', view: 'profile' },
    { id: 'navAdmin', view: 'admin' },
    { id: 'navLogistics', view: 'logistics' }
  ];

  navMap.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveNav(item.id);
      const view = typeof item.view === 'function' ? item.view() : item.view;
      currentView = view;
      renderView(view);
    });
  });

  // Dropdown / mobile menu
  const menuMap = [
    { id: 'menuHome', view: () => (isAdmin ? 'admin' : 'home') },
    { id: 'menuShop', view: 'shop' },
    { id: 'menuFavorites', view: 'favorites' },
    { id: 'menuAI', view: 'aiPage' },
    { id: 'menuSpecial', view: 'specialOffers' },
    { id: 'menuHistory', view: 'history' },
    { id: 'menuSettings', view: 'settings' },
    { id: 'menuLogistics', view: 'logistics' }
  ];

  menuMap.forEach(m => {
    const el = document.getElementById(m.id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('dropdownMenu')?.classList.add('hidden');
      const view = typeof m.view === 'function' ? m.view() : m.view;
      // Only allow logistics if admin/vendor
      if (m.id === 'menuLogistics' && !isRoleAllowed('logistics')) return;
      currentView = view;
      renderView(view);
      window.scrollTo(0, 0);
    });
  });

  document.getElementById('menuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
      const lsM = document.getElementById('langSwitchMobile');
      const csM = document.getElementById('currencySwitchMobile');
      if (lsM) lsM.value = currentLang;
      if (csM) csM.value = currentCurrency;
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#menuDropdown')) {
      document.getElementById('dropdownMenu')?.classList.add('hidden');
    } else if (e.target.tagName === 'A' || e.target.closest('a')) {
      document.getElementById('dropdownMenu')?.classList.add('hidden');
    }
  });
}

function renderSpecialOffers(app) {
  const promoProducts = products.filter(p => p.oldPrice && p.oldPrice > p.price);
  app.innerHTML = `
    <div class="shop-hero" style="background:var(--gold-gradient); padding:60px 0; text-align:center; color:var(--blue-deep); margin-bottom:40px;">
      <h1 style="font-size:2.5rem; font-weight:900; margin-bottom:10px;">🔥 ${t('specialOffers')}</h1>
      <p style="font-size:1.1rem; font-weight:600;">Pwofite pi bon rabè nou yo !</p>
    </div>
    <div class="container">
      <div class="grid">
        ${promoProducts.length === 0 ? `<p class="text-center" style="grid-column:1/-1;">${t('noSpecialOffers')}</p>` : promoProducts.map(p => productCardHTML(p)).join('')}
      </div>
    </div>`;
  attachBuyButtons();
}

function renderFavorites(app) {
  const favProducts = products.filter(p => favorites.includes(p.id));
  app.innerHTML = `
    <h2>❤️ ${t('favorites') || 'Favori'}</h2>
    <div class="grid">
      ${favProducts.length === 0 ? `<p class="text-center" style="grid-column:1/-1;">${t('noFavorites')}</p>` : favProducts.map(p => productCardHTML(p)).join('')}
    </div>`;
  attachBuyButtons();
}

// ============================================
// NOTIFICATIONS
// ============================================
async function loadNotifications() {
  if (!currentUser) { notifications = []; updateNotifBadge(); return; }
  try {
    const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(20).get();
    const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filtre local selon le rôle
    if (isAdmin) {
      notifications = allNotifs;
    } else {
      notifications = allNotifs.filter(n =>
        n.targetRole === 'all' ||
        !n.targetRole ||
        n.targetRole === 'client' ||
        (n.targetUserId && n.targetUserId === currentUser.uid)
      );
    }

    updateNotifBadge();
  } catch (e) { notifications = []; updateNotifBadge(); }
}

document.getElementById('notifBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  getEl('notifModal')?.classList.remove('hidden');
  renderNotifList();
});
document.getElementById('closeNotifModal')?.addEventListener('click', () => {
  hideEl('notifModal');
});
document.getElementById('notifModal')?.addEventListener('click', (e) => {
  const notifModal = getEl('notifModal');
  if (notifModal && e.target === notifModal) notifModal.classList.add('hidden');
});
function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (notifications.length === 0) {
    list.innerHTML = `<p class="text-center" style="padding:2rem;">🔔 ${t('noNotifications')}</p>`; return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifAsRead('${n.id}')" style="cursor:pointer; border-left:4px solid ${n.type === 'promo' ? 'var(--gold)' : 'var(--blue-light)'};">
      <div class="notif-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>${n.type === 'promo' ? '🎉' : n.type === 'refund' ? '💸' : '🔔'} ${gt(n.title)}</span>
        ${n.reason ? `<span class="badge" style="font-size:0.65rem; background:rgba(200, 150, 62, 0.1); color:var(--gold); border:1px solid var(--gold);">${gt(n.reason)}</span>` : ''}
      </div>
      <p style="margin:0.4rem 0; font-size:0.9rem;">${gt(n.message)}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-soft);">
        <div class="notif-date">${n.createdAt?.toDate?.()?.toLocaleDateString?.('fr-FR') || t('today')}</div>
        ${!n.read ? `<span style="color:var(--gold); font-weight:700;">● ${t('new')}</span>` : ''}
      </div>
    </div>`).join('');
}

async function markNotifAsRead(notifId) {
  try {
    await db.collection('notifications').doc(notifId).update({ read: true });
    // Update local state to avoid re-fetch immediately
    const notif = notifications.find(n => n.id === notifId);
    if (notif) {
      notif.read = true;
      updateNotifBadge();
      renderNotifList();
    }
  } catch (e) { console.error("Erreur lecture notif:", e); }
}

// ============================================
// LANGUE
// ============================================
document.getElementById('langSwitch')?.addEventListener('change', (e) => {
  currentLang = e.target.value;
  localStorage.setItem('totalLakayLang', currentLang);
  applyLanguage();
});
document.getElementById('langSwitchMobile')?.addEventListener('change', (e) => {
  currentLang = e.target.value;
  localStorage.setItem('totalLakayLang', currentLang);
  applyLanguage();
  document.getElementById('dropdownMenu')?.classList.add('hidden');
});

document.getElementById('currencySwitch')?.addEventListener('change', (e) => {
  currentCurrency = e.target.value;
  localStorage.setItem('totalLakayCurrency', currentCurrency);
  renderView(currentView);
});
document.getElementById('currencySwitchMobile')?.addEventListener('change', (e) => {
  currentCurrency = e.target.value;
  localStorage.setItem('totalLakayCurrency', currentCurrency);
  renderView(currentView);
  document.getElementById('dropdownMenu')?.classList.add('hidden');
});

function setActiveNav(activeId) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById(activeId)?.classList.add('active');
}

// ============================================
// MODAL ACHAT
// ============================================
document.getElementById('closeBuyModal')?.addEventListener('click', () => {
  hideEl('buyModal');
});
document.getElementById('buyModal')?.addEventListener('click', (e) => {
  const buyModal = getEl('buyModal');
  if (buyModal && e.target === buyModal) buyModal.classList.add('hidden');
});
document.getElementById('submitOrder')?.addEventListener('click', async () => {
  if (!currentUser) { showMessage(t('loginRequired'), 'error'); return; }
  if (!currentUser.emailVerified) { showMessage(t('emailNotVerified'), 'error'); return; }
  const address = document.getElementById('orderAddress')?.value.trim();
  const paymentMethod = document.getElementById('orderPayment')?.value || 'Cash';
  if (!address || address.length < 5) { showMessage(t('invalidAddress'), 'error'); return; }
  const product = products.find(p => p.id === selectedProductId);
  if (!product) return;
  const quantity = parseInt(document.getElementById('orderQuantity')?.value) || 1;
  const color = document.getElementById('orderColor')?.value || null;
  const size = document.getElementById('orderSize')?.value || null;

  try {
    const phone = document.getElementById('orderPhone')?.value.trim();
    if (!phone) { showMessage(t('phoneRequired') || "Telefòn obligatwa", 'error'); return; }

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const moncashPhone = userData?.moncashPhone || phone;

    if (paymentMethod === 'MonCash') {
      if (!moncashConfig.clientId || !moncashConfig.clientSecret) {
        showMessage('⚠️ La configuration MonCash est manquante. Configurez-la depuis l’administration.', 'error');
        return;
      }
      if (!moncashPhone) {
        showMessage('⚠️ Vous devez lier un numéro MonCash dans votre profil ou entrer votre numéro MonCash.', 'error');
        return;
      }
    }

    let deliveryCoords = null;
    if (localStorage.getItem('allowLocation') === 'true') {
      try {
        deliveryCoords = await getLocationPromise();
      } catch (err) {
        console.warn('Unable to obtain delivery coordinates:', err.message);
      }
    }

    const orderData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      productId: product.id,
      productName: gt(product.name),
      price: product.price,
      quantity,
      color,
      size,
      totalPrice: product.price * quantity,
      currency: currentCurrency,
      image: product.image || '',
      address,
      phone,
      paymentMethod,
      paymentStatus: paymentMethod === 'MonCash' ? 'pending_payment' : 'cash_due',
      status: paymentMethod === 'MonCash' ? 'awaiting_payment' : 'pending',
      orderCode: generateOrderCode(),
      deliveryEstimate: '',
      coords: deliveryCoords,
      originCoords: DEFAULT_WAREHOUSE_COORDS,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(orderData);

    if (paymentMethod === 'MonCash') {
      await createMoncashPaymentRequest({
        orderId: orderRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        phone: moncashPhone,
        amount: orderData.totalPrice,
        currency: currentCurrency,
        mode: moncashConfig.mode
      });
    }

    const orderCode = orderData.orderCode;
    const confirmationTitle = `✅ Commande ${orderCode || ''} reçue`;
    const confirmationMessage = `Bonjour ${currentUser.displayName || currentUser.email}, votre commande ${orderCode || ''} pour ${product.name} a bien été reçue. Nous vous envoyons une confirmation par email et SMS.`;

    await db.collection('notifications').add({
      title: confirmationTitle,
      reason: 'order_confirmation',
      message: confirmationMessage,
      type: 'info',
      targetUserId: currentUser.uid,
      targetRole: null,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      metadata: {
        orderId: orderRef.id,
        productId: product.id,
        orderCode
      }
    });

    await db.collection('communications').add({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      phone,
      orderId: orderRef.id,
      orderCode,
      type: 'order_confirmation',
      channels: ['email', 'sms'],
      status: 'pending',
      payload: {
        subject: `Confirmation de votre commande ${orderCode || ''}`,
        body: confirmationMessage
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById('buyModal')?.classList.add('hidden');
    setElValue('orderAddress', '');
    const successMessage = paymentMethod === 'MonCash'
      ? '✅ Commande enregistrée. Complétez votre paiement MonCash depuis votre application MonCash.'
      : t('orderSuccess');
    showMessage(successMessage, 'success');
  } catch (error) { showMessage(t('errorOccurred') + error.message, 'error'); }
});

// ============================================
// CHARGEMENT DONNÉES
// ============================================
let productsLoaded = false;
async function loadProducts(forceRefresh = false) {
  if (productsLoaded && !forceRefresh) return;
  try {
    const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    productsLoaded = true;
  } catch (e) { products = []; }
}
async function loadAllOrders() {
  try {
    const snap = await db.collection('orders').orderBy('createdAt', 'desc').get();
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { orders = []; }
}
async function loadMyOrders() {
  if (!currentUser) { orders = []; return; }
  try {
    const snap = await db.collection('orders').where('userId', '==', currentUser.uid).get();
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
  } catch (e) { orders = []; }
}
async function loadAllUsers() {
  try {
    const snap = await db.collection('users').get();
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { allUsers = []; }
}
async function loadAllData() {
  await Promise.all([loadProducts(true), loadAllOrders(), loadAllUsers()]);
}

// ============================================
// RECHERCHE & FILTRES
// ============================================
function getFilteredProducts() {
  let filtered = [...products];

  const searchTerm = (document.getElementById('searchInput') || document.getElementById('shopSearchInput'))?.value?.toLowerCase()?.trim() || '';
  const category = (document.getElementById('categoryFilter') || document.getElementById('shopCategoryFilter'))?.value || 'all';
  const priceMin = parseFloat(document.getElementById('priceMin')?.value) || 0;
  const priceMax = parseFloat(document.getElementById('priceMax')?.value) || Infinity;
  const sortBy = (document.getElementById('sortBy') || document.getElementById('sortFilter'))?.value || 'recent';

  if (searchTerm) {
    filtered = filtered.filter(p =>
      p.name?.toLowerCase().includes(searchTerm) ||
      p.description?.toLowerCase().includes(searchTerm)
    );
  }

  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  filtered = filtered.filter(p => p.price >= priceMin && p.price <= priceMax);

  switch (sortBy) {
    case 'recent': filtered.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)); break;
    case 'low': filtered.sort((a, b) => a.price - b.price); break;
    case 'high': filtered.sort((a, b) => b.price - a.price); break;
    case 'name-asc': filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
    case 'name-desc': filtered.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
    default: filtered.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)); break;
  }

  return filtered;
}

function displayFilteredProducts() {
  const filtered = getFilteredProducts();
  const resultsCount = document.getElementById('resultsCount');

  if (resultsCount) {
    if (filtered.length === 0) {
      resultsCount.innerHTML = `🔍 ${t('noResultsFound')}`;
    } else {
      resultsCount.innerHTML = `<span>${filtered.length}</span> ${t('resultsFound')}`;
    }
  }

  if (filtered.length === 0) {
    return `<p class="text-center" style="grid-column:1/-1; padding:3rem;">📭 ${t('noResultsFound')}</p>`;
  }

  return filtered.map(p => productCardHTML(p)).join('');
}

function setupSearchAndFilters() {
  const searchBar = document.getElementById('searchFilterBar');
  if (searchBar) searchBar.classList.remove('hidden');

  const searchInput = document.getElementById('searchInput') || document.getElementById('shopSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => refreshProductGrid(), 500));
  }

  document.getElementById('searchBtn')?.addEventListener('click', () => refreshProductGrid());

  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') refreshProductGrid();
  });

  document.getElementById('applyFiltersBtn')?.addEventListener('click', () => refreshProductGrid());

  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    const si = document.getElementById('searchInput');
    const cf = document.getElementById('categoryFilter');
    const pmin = document.getElementById('priceMin');
    const pmax = document.getElementById('priceMax');
    const sb = document.getElementById('sortBy');
    const sf = document.getElementById('sortFilter');
    if (si) si.value = '';
    if (cf) cf.value = 'all';
    if (pmin) pmin.value = '';
    if (pmax) pmax.value = '';
    if (sb) sb.value = 'date-desc';
    if (sf) sf.value = 'recent';
    refreshProductGrid();
  });

  document.getElementById('categoryFilter')?.addEventListener('change', () => refreshProductGrid());
  document.getElementById('sortBy')?.addEventListener('change', () => refreshProductGrid());
  document.getElementById('sortFilter')?.addEventListener('change', () => refreshProductGrid());
  document.getElementById('priceMin')?.addEventListener('input', debounce(() => refreshProductGrid(), 500));
  document.getElementById('priceMax')?.addEventListener('input', debounce(() => refreshProductGrid(), 500));
}

function refreshProductGrid() {
  const grid = document.getElementById('allProducts') || document.getElementById('featuredProducts');
  if (grid) {
    grid.innerHTML = displayFilteredProducts();
    attachBuyButtons();
  }
}

// ============================================
// RENDU VUES
// ============================================
async function renderView(view) {
  const requestedView = String(view || '').trim() || getDefaultViewForRole(pageRole);
  view = enforcePageRole(requestedView);
  currentView = view;
  const app = document.getElementById('appContent');
  if (!app) return;

  app.style.opacity = '0';
  app.style.transform = 'translateY(10px)';

  setTimeout(async () => {
    view = enforcePageRole(view);
    applyPageRoleUI();

    const searchBar = document.getElementById('searchFilterBar');
    if (searchBar) {
      if (view === 'shop' || view === 'specialOffers') {
        searchBar.classList.remove('hidden');
      } else {
        searchBar.classList.add('hidden');
      }
    }

    const requireLogin = ['checkout', 'orders', 'profile', 'history', 'favorites'];
    if (!currentUser && requireLogin.includes(view)) {
      showMessage(t('loginRequired'), 'error');
      openAuthModal();
      renderView('home');
      return;
    }

    try {
      switch (view) {
        case 'home': await renderHome(app); break;
        case 'shop': await renderShop(app); break;
        case 'aiPage': await renderAIPage(app); break;
        case 'orders': await renderProfile(app); break;
        case 'profile': await renderProfile(app); break;
        case 'specialOffers': await renderSpecialOffers(app); break;
        case 'favorites': renderFavorites(app); break;
        case 'settings': renderSettings(app); break;
        case 'history': await renderProfile(app); break;
        case 'services': renderServices(app); break;
        case 'privacy': renderPrivacy(app); break;
        case 'terms': renderTerms(app); break;
        case 'checkout': await renderCheckout(app); break;
        case 'admin': if (pageRole === 'admin') { await renderAdminDashboard(app); } else { await renderView(getDefaultViewForRole(pageRole)); } break;
        case 'logistics': if (pageRole === 'admin') { await renderLogisticsDashboard(app); } else if (pageRole === 'vendor') { await renderVendorDashboard(app); } else { await renderView('home'); } break;
        case 'tracking': if (pageRole === 'vendor' || pageRole === 'admin') { await renderOrderTracking(app); } else { await renderView('home'); } break;
        default: await renderHome(app);
      }
    } catch (err) {
      console.error('renderView error:', err);
      app.innerHTML = `<div class="card text-center"><p>⛔ ${t('errorOccurred')} ${escapeHtml(err.message || err)}</p></div>`;
    }

    app.style.transition = 'all 0.4s ease-out';
    app.style.opacity = '1';
    app.style.transform = 'translateY(0)';
    
    // Traduire le nouveau contenu
    applyLanguage(false);
    window.scrollTo(0, 0);
  }, 200);
}
function productCardHTML(product) {
  const hasPromo = product.oldPrice && product.oldPrice > product.price;
  const category = product.category || 'Shop';
  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-img-container">
        ${hasPromo ? `<div class="product-badge">🔥 ${t('specialPrice')}</div>` : ''}
        <button class="wishlist-btn ${favorites.includes(product.id) ? 'active' : ''}" onclick="toggleFavorite('${product.id}')">
          <i class="fas fa-heart"></i> ❤️
        </button>
        <img src="${product.image || 'logo.jpeg'}" alt="${gt(product.name)}" class="product-img" loading="lazy" onerror="this.src='logo.jpeg'">
      </div>
      <div class="product-info">
        <div class="product-category">${t('category' + category.charAt(0).toUpperCase() + category.slice(1)) || category}</div>
        <div class="product-title">${gt(product.name)}</div>
        <div class="product-price-row">
          <div class="product-price">${formatPrice(product.price)}</div>
          ${hasPromo ? `<div class="old-price">${formatPrice(product.oldPrice)}</div>` : ''}
        </div>
        <div style="display:flex; gap:10px; margin-top:auto;">
          <button class="btn-gold add-cart-btn" data-product-id="${product.id}" style="flex:1; padding:8px 12px; font-size:0.85rem;">🛒 ${t('addToCart')}</button>
          <button class="btn-outline buy-now-btn" data-product-id="${product.id}" style="padding:8px 15px;">⚡</button>
        </div>
      </div>
    </div>`;
}

async function renderAdminDashboard(app) {
  if (pageRole !== 'admin') { app.innerHTML = `<div class="card text-center"><p>⛔ ${t('adminOnly')}</p></div>`; return; }
  await loadMoncashConfig();
  await loadAllData();
  const onlineCount = await getOnlineUsersCount();
  setTimeout(() => {
    const el = document.getElementById('onlineCountAdmin');
    if (el) el.textContent = onlineCount;
  }, 100);

  const totalProducts = products.length;
  const totalOrders = orders.length;
  const totalClients = allUsers.filter(u => u.role === 'client').length;
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const urgentCount = orders.filter(o => o.status === 'processing' || o.status === 'in_transit').length;
  const totalRevenue = orders.filter(o => ['validated', 'processing', 'in_transit', 'delivered', 'completed'].includes(o.status)).reduce((sum, o) => sum + (o.price || 0), 0);

  app.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
      <h2 style="margin:0; font-size:2rem;">📊 ${t('dashboard')}</h2>
      <div style="background:var(--gold-gradient); color:var(--blue-deep); padding:8px 20px; border-radius:30px; font-weight:800; box-shadow:var(--shadow-gold);">
        👑 ${t('welcomeAdmin')}
      </div>
    </div>

    <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:20px; margin-bottom:40px;">
      <div class="admin-stat-card" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border-left:5px solid var(--gold); box-shadow:var(--shadow-md);">
        <div style="font-size:2rem; font-weight:900; color:var(--blue-deep);">${totalProducts}</div>
        <div style="color:var(--text-soft); font-weight:600; font-size:0.9rem;">📦 ${t('totalProducts')}</div>
      </div>
      <div class="admin-stat-card" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border-left:5px solid var(--success); box-shadow:var(--shadow-md);">
        <div style="font-size:2rem; font-weight:900; color:var(--blue-deep);">${totalOrders}</div>
        <div style="color:var(--text-soft); font-weight:600; font-size:0.9rem;">📋 ${t('totalOrders')}</div>
      </div>
      <div class="admin-stat-card" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border-left:5px solid var(--blue-light); box-shadow:var(--shadow-md);">
        <div style="font-size:2rem; font-weight:900; color:var(--blue-deep);">${totalClients}</div>
        <div style="color:var(--text-soft); font-weight:600; font-size:0.9rem;">👥 ${t('totalClients')}</div>
      </div>
      <div class="admin-stat-card" id="onlineStatsCard" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border-left:5px solid #f39c12; box-shadow:var(--shadow-md); cursor:pointer;">
        <div id="onlineCountAdmin" style="font-size:2rem; font-weight:900; color:var(--blue-deep);">${onlineCount}</div>
        <div style="color:var(--text-soft); font-weight:600; font-size:0.9rem;">🟢 ${t('onlineClients')}</div>
      </div>
      <div class="admin-stat-card" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border-left:5px solid var(--danger); box-shadow:var(--shadow-md);">
        <div style="font-size:2rem; font-weight:900; color:var(--danger);">${urgentCount}</div>
        <div style="color:var(--text-soft); font-weight:600; font-size:0.9rem;">🚩 ${t('urgentDeliveries')}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:30px; margin-bottom:40px;">
      <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); border:1px solid var(--gray-200);">
        <h3 style="margin-bottom:20px;">💰 ${t('revenue')} & MonCash</h3>
        <div style="font-size:2rem; font-weight:900; color:var(--success); margin-bottom:20px;">${formatPrice(totalRevenue)}</div>
        <div style="display:flex; flex-direction:column; gap:15px; border-top:1px solid #eee; padding-top:20px;">
          <div>
            <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-soft);">Client ID</label>
            <input id="mcClientId" class="search-input" style="width:100%; background:var(--gray-100);" value="${moncashConfig.clientId || ''}" placeholder="Client ID MonCash" />
          </div>
          <div>
            <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-soft);">Client Secret</label>
            <input id="mcClientSecret" class="search-input" style="width:100%; background:var(--gray-100);" type="password" value="${moncashConfig.clientSecret || ''}" placeholder="Client Secret" />
          </div>
          <div>
            <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-soft);">Mode</label>
            <select id="mcMode" class="filter-select" style="width:100%;">
              <option value="sandbox" ${moncashConfig.mode === 'sandbox' ? 'selected' : ''}>Sandbox</option>
              <option value="production" ${moncashConfig.mode === 'production' ? 'selected' : ''}>Production</option>
            </select>
          </div>
          <button id="saveMcConfig" class="btn-gold" style="width:100%; padding:15px;">💾 ${t('saveConfig')}</button>
        </div>
      </div>

      <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); border:1px solid var(--gray-200);">
        <h3 style="margin-bottom:20px;">🤖 ${t('aiAssistant')} Gemini</h3>
        <div style="display:flex; flex-direction:column; gap:15px;">
          <div>
            <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-soft);">Clé API Gemini</label>
            <input id="aiApiKey" class="search-input" style="width:100%; background:var(--gray-100);" type="password" value="${AIConfig.apiKey || ''}" placeholder="AIzaSy..." />
          </div>
          <div>
            <label style="display:block; margin-bottom:8px; font-weight:600; color:var(--text-soft);">Modèle</label>
            <select id="aiModel" class="filter-select" style="width:100%;">
              <option value="gemini-flash-latest" ${AIConfig.model === 'gemini-flash-latest' ? 'selected' : ''}>Gemini Flash (Plus stable)</option>
              <option value="gemini-2.5-flash" ${AIConfig.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Ultra Rapide)</option>
              <option value="gemini-2.0-flash" ${AIConfig.model === 'gemini-2.0-flash' ? 'selected' : ''}>Gemini 2.0 Flash (Stable)</option>
              <option value="gemini-2.0-flash-lite" ${AIConfig.model === 'gemini-2.0-flash-lite' ? 'selected' : ''}>Gemini 2.0 Lite (Économe)</option>
              <option value="gemini-3.1-pro-preview" ${AIConfig.model === 'gemini-3.1-pro-preview' ? 'selected' : ''}>Gemini 3.1 Pro (Expérimental)</option>
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <label class="switch">
              <input type="checkbox" id="aiEnabledToggle" ${AIConfig.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span style="font-weight:600;">${t('enableAi')}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <button id="saveAiConfig" class="btn-gold" style="padding:12px;">💾 ${t('save')}</button>
            <button id="testAiConfig" class="btn-outline" style="padding:12px;">🧪 ${t('test')}</button>
          </div>
          <button id="diagAiConfig" class="btn-outline" style="width:100%; padding:10px; font-size:0.8rem; opacity:0.7;">🔍 Diagnostic (Liste des modèles)</button>
        </div>
      </div>

      <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); border:1px solid var(--gray-200);">
        <h3 style="margin-bottom:20px;">⚡ ${t('quickActions')}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
          <button class="btn-gold" id="adminAddProductBtn">➕ ${t('addProduct')}</button>
          <button class="btn-outline" id="adminManageOrdersBtn">📦 ${t('manageOrders')}</button>
          <button class="btn-outline" id="adminManageClientsBtn">👥 ${t('manageClients')}</button>
          <button class="btn-outline" id="adminSendNotifBtn">🔔 ${t('sendNotification')}</button>
        </div>
      </div>
    </div>

    <!-- MODAL ADD PRODUCT -->
    <div id="adminAddProductForm" class="modal hidden">
      <div class="modal-content" style="max-width:800px;">
        <span class="close-modal" onclick="this.closest('.modal').classList.add('hidden')">&times;</span>
        <input type="hidden" id="adminProdId">
        <h2 style="margin-bottom:20px;">➕ ${t('addProduct')}</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div><label style="display:block; margin-bottom:8px;">${t('productName')}</label><input id="adminProdName" class="search-input" style="width:100%;" placeholder="${t('productNamePlaceholder')}"></div>
          <div><label style="display:block; margin-bottom:8px;">${t('productPrice')} (G)</label><input id="adminProdPrice" class="search-input" style="width:100%;" type="number" placeholder="${t('productPricePlaceholder')}"></div>
          <div><label style="display:block; margin-bottom:8px;">${t('oldPrice')} (Promo)</label><input id="adminProdOldPrice" class="search-input" style="width:100%;" type="number" placeholder="Ansyen pri"></div>
          <div>
            <label style="display:block; margin-bottom:8px;">${t('category')}</label>
            <select id="adminProdCategory" class="filter-select" style="width:100%;">
              <option value="clothing">${t('categoryClothingAccessories')}</option>
              <option value="school">${t('categorySchoolOffice')}</option>
              <option value="home">${t('categoryHomePersonal')}</option>
              <option value="electronics">${t('categoryElectronicsTech')}</option>
            </select>
          </div>
          <div><label style="display:block; margin-bottom:8px;">${t('stock')}</label><input id="adminProdStock" class="search-input" style="width:100%;" type="number" placeholder="0"></div>
          <div><label style="display:block; margin-bottom:8px;">${t('productColors')} (ex: rouge, bleu)</label><input id="adminProdColors" class="search-input" style="width:100%;" placeholder="rouge, bleu"></div>
          <div><label style="display:block; margin-bottom:8px;">${t('productSizes')} (ex: S, M, L)</label><input id="adminProdSizes" class="search-input" style="width:100%;" placeholder="S, M, L"></div>
          <div><label style="display:block; margin-bottom:8px;">${t('productImage')} (URL)</label><input id="adminProdImage" class="search-input" style="width:100%;" placeholder="${t('productImagePlaceholder')}"></div>
        </div>
        <div style="margin-top:20px;">
          <label style="display:block; margin-bottom:8px;">${t('productDesc')}</label>
          <textarea id="adminProdDesc" class="search-input" style="width:100%; height:100px;" placeholder="${t('productDescPlaceholder')}"></textarea>
        </div>
        <button id="saveProductBtn" class="btn-gold mt-2" style="width:100%; padding:15px;">✅ ${t('save')}</button>
      </div>

      <!-- STATISTICS CHARTS -->
      <div class="card-premium" style="grid-column: 1 / -1; background:var(--white); padding:25px; border-radius:var(--radius-lg); border:1px solid var(--gray-200); margin-top:30px;">
        <h3 style="margin-bottom:20px;">📊 ${t('statistics')} (Ventes 7 derniers jours)</h3>
        <div id="adminSalesChart" class="chart-container">
          <!-- JS will populate bars -->
        </div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1.5fr; gap:30px;">
      <!-- PRODUCT LIST -->
      <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border:1px solid var(--gray-200);">
        <h3 style="margin-bottom:20px;">📦 ${t('existingProducts')}</h3>
        <div id="adminProductList" style="max-height:600px; overflow-y:auto; padding-right:10px;">
          ${products.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid var(--gray-100);">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="${p.image || 'logo.jpeg'}" style="width:45px; height:45px; object-fit:cover; border-radius:8px; border:1px solid var(--gray-200);">
                <div>
                  <div style="font-weight:700; color:var(--blue-deep);">${gt(p.name)}</div>
                  <div style="font-size:0.85rem; color:var(--gold); font-weight:600;">${formatPrice(p.price)}</div>
                </div>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="admin-product-action edit-product" data-id="${p.id}" style="border:1px solid rgba(16, 185, 129, 0.2); color:var(--blue-deep);">✏️</button>
                <button class="admin-product-action delete-product" data-id="${p.id}" style="border:1px solid rgba(239, 68, 68, 0.2); color:var(--danger);">🗑️</button>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <!-- ORDER LIST -->
      <div class="card-premium" id="orderManagementSection" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); border:1px solid var(--gray-200);">
        <h3 style="margin-bottom:20px;">📋 ${t('manageOrders')}</h3>
        <div id="adminOrderList" style="max-height:600px; overflow-y:auto; padding-right:10px;">
          ${orders.map(o => `
            <div style="padding:20px; border-radius:var(--radius); background:var(--white-soft); border:1px solid var(--gray-200); margin-bottom:15px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                <strong style="color:var(--blue-deep); font-size:1.05rem;">${o.productName}</strong>
                <select class="status-select filter-select" data-order-id="${o.id}" style="padding:5px 15px; font-size:0.8rem; border-radius:20px;">
                  <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ ${t('pending')}</option>
                  <option value="validated" ${o.status === 'validated' ? 'selected' : ''}>✔️ ${t('validated')}</option>
                  <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>⚙️ ${t('processing')}</option>
                  <option value="in_transit" ${o.status === 'in_transit' ? 'selected' : ''}>🚚 ${t('in_transit')}</option>
                  <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>📦 ${t('delivered')}</option>
                  <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>🏁 ${t('completed')}</option>
                  <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ ${t('cancelled')}</option>
                </select>
                ${o.coords ? `<button class="btn btn-sm btn-outline view-map-btn" data-coords='${JSON.stringify(o.coords)}' data-order-id="${o.id}" style="margin-top:5px;">🗺️ Map</button>` : ''}
              </div>
              <div id="map-order-${o.id}" class="map-container hidden" style="height:200px; margin-top:10px;"></div>
              <div style="font-size:0.85rem; color:var(--text-soft); line-height:1.6; margin-bottom:15px;">
                <div>💰 <strong>${formatPrice(o.price)}</strong> | 👤 ${o.userEmail}</div>
                <div>📍 ${o.address} | 📞 ${o.phone || '---'}</div>
                ${o.items ? `<div class="order-items-block" style="margin-top:5px; padding:8px; border-radius:8px; border:1px dashed #ddd;"><strong>Articles:</strong> ${o.items.map(it => it.name).join(', ')}</div>` : ''}
              </div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <input id="delay-${o.id}" class="search-input" style="flex:1; padding:8px 15px; font-size:0.8rem; border-radius:20px;" placeholder="${t('delayPlaceholder')}" value="${o.deliveryEstimate || ''}">
                <button class="btn-gold update-delay" data-id="${o.id}" style="padding:8px 15px; border-radius:20px;">⏱️</button>
                <button class="btn-outline refund-order-btn" data-id="${o.id}" data-user-id="${o.userId}" data-amount="${o.price}" style="color:var(--danger); border-color:var(--danger); padding:8px 15px; border-radius:20px;">💸 ${t('refund')}</button>
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- CLIENT MANAGEMENT -->
    <div id="adminClientsList" class="card-premium hidden" style="margin-top:30px;">
      <h3 style="margin-bottom:20px;">👥 ${t('manageClients')} (${allUsers.length})</h3>
      <div style="max-height:400px; overflow-y:auto; padding-right:10px;">
        ${allUsers.map(u => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid var(--gray-100);">
            <div>
              <strong style="color:var(--blue-deep);">${u.displayName || u.email}</strong>
              <span style="margin-left:10px; font-size:0.75rem; background:var(--gray-100); padding:3px 10px; border-radius:10px;">${u.role}</span>
            </div>
            <button class="btn-outline toggle-role" data-uid="${u.id}" data-role="${u.role}" style="padding:5px 15px; font-size:0.8rem;">
              ${u.role === 'admin' ? t('makeClient') : t('makeAdmin')}
            </button>
          </div>`).join('')}
      </div>
    </div>

    <!-- NOTIFICATIONS -->
    <div id="adminSendNotifForm" class="card-premium hidden" style="margin-top:30px;">
      <h3 style="margin-bottom:20px;">🔔 ${t('sendNotification')}</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
        <div>
          <label style="display:block; margin-bottom:8px; font-weight:600;">🎯 Destinataire</label>
          <input type="text" id="notifUserSearch" class="search-input" style="width:100%; margin-bottom:10px; padding:10px 15px;" placeholder="🔍 Chercher un utilisateur...">
          <select id="notifTarget" class="filter-select" style="width:100%;">
            <option value="all" style="font-weight:bold;">📢 Tout moun (Tous)</option>
            <option value="role_client" style="font-weight:bold;">👥 Tous les Clients</option>
            <option value="role_admin" style="font-weight:bold;">👑 Tous les Administrateurs</option>
            <optgroup label="Utilisateurs Spécifiques">
              ${allUsers.map(u => `<option class="notif-user-opt" value="${u.id}">${u.displayName || 'Sans Nom'} (${u.email})</option>`).join('')}
            </optgroup>
          </select>
        </div>
        <div>
          <label style="display:block; margin-bottom:8px; font-weight:600;">🏷️ Titre</label>
          <input id="notifTitle" class="search-input" style="width:100%;" placeholder="${t('notificationTitle')}">
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr; gap:20px; margin-bottom:20px;">
        <div>
          <label style="display:block; margin-bottom:8px; font-weight:600;">🧾 Raison</label>
          <input id="notifReason" class="search-input" style="width:100%;" placeholder="${t('reasonPlaceholder')}">
        </div>
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block; margin-bottom:8px; font-weight:600;">✉️ Mesaj</label>
        <textarea id="notifMessage" class="search-input" style="width:100%; height:100px;" placeholder="${t('notificationMessage')}"></textarea>
      </div>
      <button id="sendNotifBtn" class="btn-gold" style="width:100%; padding:15px;">📤 ${t('sendNotification')}</button>
    </div>
  `;

  // Render Charts
  renderAdminCharts();

  // Events Admin
  document.getElementById('adminAddProductBtn')?.addEventListener('click', () => {
    document.getElementById('adminAddProductForm').classList.toggle('hidden');
    document.getElementById('adminClientsList').classList.add('hidden');
    document.getElementById('adminSendNotifForm').classList.add('hidden');
  });
  document.getElementById('adminManageOrdersBtn')?.addEventListener('click', () => {
    document.getElementById('adminOrderList').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('adminManageClientsBtn')?.addEventListener('click', () => {
    document.getElementById('adminClientsList').classList.toggle('hidden');
    document.getElementById('adminAddProductForm').classList.add('hidden');
    document.getElementById('adminSendNotifForm').classList.add('hidden');
  });
  document.getElementById('adminSendNotifBtn')?.addEventListener('click', () => {
    document.getElementById('adminSendNotifForm').classList.toggle('hidden');
    document.getElementById('adminAddProductForm').classList.add('hidden');
    document.getElementById('adminClientsList').classList.add('hidden');
  });

  document.getElementById('saveProductBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('adminProdName')?.value.trim();
    const price = parseFloat(document.getElementById('adminProdPrice')?.value);
    const oldPrice = parseFloat(document.getElementById('adminProdOldPrice')?.value) || null;
    const category = document.getElementById('adminProdCategory')?.value;
    const stock = parseInt(document.getElementById('adminProdStock')?.value) || 0;
    const colorsRaw = document.getElementById('adminProdColors')?.value?.trim() || '';
    const sizesRaw = document.getElementById('adminProdSizes')?.value?.trim() || '';
    const image = document.getElementById('adminProdImage')?.value?.trim() || '';
    const description = document.getElementById('adminProdDesc')?.value?.trim() || '';
    const productId = document.getElementById('adminProdId')?.value || null;

    if (!name || !price) { showMessage(t('fillAllFields'), 'error'); return; }

    try {
      showMessage("Traduction automatique en cours...", "info");
      const [nameTrans, descTrans] = await Promise.all([
        getTranslations(name),
        getTranslations(description)
      ]);

      const productData = {
        name: nameTrans,
        price,
        oldPrice,
        category,
        stock,
        colors: colorsRaw ? colorsRaw.split(',').map(c => c.trim()) : [],
        sizes: sizesRaw ? sizesRaw.split(',').map(s => s.trim()) : [],
        image: image || '',
        description: descTrans,
      };

      if (productId) {
        await db.collection('products').doc(productId).update({
          ...productData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showMessage(t('productUpdated'), 'success');
      } else {
        await db.collection('products').add({
          ...productData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showMessage(t('productAdded'), 'success');
      }

      setElValue('adminProdId', '');
      setElValue('adminProdName', '');
      setElValue('adminProdPrice', '');
      setElValue('adminProdOldPrice', '');
      setElValue('adminProdCategory', 'clothing');
      setElValue('adminProdStock', '');
      setElValue('adminProdColors', '');
      setElValue('adminProdSizes', '');
      setElValue('adminProdImage', '');
      setElValue('adminProdDesc', '');

      await loadAllData(); renderView('admin');
    } catch (error) { showMessage(t('errorOccurred') + error.message, 'error'); }
  });

  document.querySelectorAll('.delete-product').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (confirm(t('confirmDelete'))) {
        await db.collection('products').doc(e.currentTarget.dataset.id).delete();
        showMessage(t('productDeleted'), 'success');
        await loadAllData(); renderView('admin');
      }
    });
  });

  document.querySelectorAll('.edit-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      const product = products.find(p => p.id === productId);
      if (!product) return;
      setElValue('adminProdId', product.id);
      setElValue('adminProdName', gt(product.name) || '');
      setElValue('adminProdPrice', product.price || '');
      setElValue('adminProdOldPrice', product.oldPrice || '');
      setElValue('adminProdCategory', product.category || 'clothing');
      setElValue('adminProdStock', product.stock || 0);
      setElValue('adminProdColors', (product.colors || []).join(', '));
      setElValue('adminProdSizes', (product.sizes || []).join(', '));
      setElValue('adminProdImage', product.image || '');
      setElValue('adminProdDesc', gt(product.description) || '');
      getEl('adminAddProductForm')?.classList.remove('hidden');
    });
  });

  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const orderId = e.target.dataset.orderId;
      const newStatus = e.target.value;
      const order = orders.find(o => o.id === orderId);
      const oldStatus = order ? order.status : 'pending';
      let reason = '';

      if (newStatus === 'cancelled') {
        reason = prompt(t('reasonPlaceholder'));
        if (!reason) {
          e.target.value = oldStatus;
          showMessage(t('reasonRequired'), 'error');
          return;
        }
      }

      try {
        await db.collection('orders').doc(orderId).update({
          status: newStatus,
          cancellationReason: reason || null
        });

        // Stock Decrement Logic
        if (newStatus === 'confirmed' && oldStatus !== 'confirmed' && order.productId) {
          const productRef = db.collection('products').doc(order.productId);
          const productDoc = await productRef.get();
          if (productDoc.exists) {
            const currentStock = productDoc.data().stock || 0;
            const orderQty = order.quantity || 1;
            await productRef.update({ stock: Math.max(0, currentStock - orderQty) });
            await loadProducts(true); // Refresh local products list
          }
        }

        showMessage(t('statusUpdated'), 'success');
        await loadAllOrders(); // Refresh orders to ensure UI is up to date
      } catch (error) { showMessage(t('errorOccurred') + error.message, 'error'); }
    });
  });

  document.querySelectorAll('.view-map-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const b = e.currentTarget;
      const orderId = b.dataset.orderId;
      const coords = JSON.parse(b.dataset.coords);
      const mapDiv = document.getElementById(`map-order-${orderId}`);
      if (mapDiv.classList.contains('hidden')) {
        mapDiv.classList.remove('hidden');
        setTimeout(() => initOrderMap(`map-order-${orderId}`, coords), 100);
      } else {
        mapDiv.classList.add('hidden');
      }
    });
  });

  document.querySelectorAll('.update-delay').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.id;
      const delay = document.getElementById(`delay-${orderId}`).value.trim();
      if (!delay) { showMessage(t('delayRequired'), 'error'); return; }
      await db.collection('orders').doc(orderId).update({ deliveryEstimate: delay });
      showMessage(t('delayUpdated'), 'success');
    });
  });

  document.querySelectorAll('.toggle-role').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const uid = e.currentTarget.dataset.uid;
      const currentRole = e.currentTarget.dataset.role;
      const newRole = currentRole === 'admin' ? 'client' : 'admin';
      await db.collection('users').doc(uid).update({ role: newRole });
      showMessage(newRole === 'admin' ? t('madeAdmin') : t('madeClient'), 'success');
      await loadAllData(); renderView('admin');
    });
  });

  document.getElementById('sendNotifBtn')?.addEventListener('click', async () => {
    const target = document.getElementById('notifTarget')?.value;
    const title = document.getElementById('notifTitle')?.value.trim();
    const reason = document.getElementById('notifReason')?.value?.trim() || '';
    const message = document.getElementById('notifMessage')?.value.trim();

    if (!title || !message) { showMessage(t('fillAllFields'), 'error'); return; }

    try {
      showMessage("Tradiksyon ak Voye nan kou...", "info");

      // Traduction automatique pour tous les champs
      const [titleTrans, reasonTrans, messageTrans] = await Promise.all([
        getTranslations(title),
        getTranslations(reason),
        getTranslations(message)
      ]);

      const notifData = {
        title: titleTrans,
        reason: reasonTrans,
        message: messageTrans,
        type: reason ? (reason.toLowerCase().includes('promo') ? 'promo' : 'info') : 'info',
        targetUserId: (target === 'all' || target.startsWith('role_')) ? null : target,
        targetRole: target === 'all' ? 'all' : (target.startsWith('role_') ? target.replace('role_', '') : null),
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('notifications').add(notifData);

      // Push browser notification if user already granted permission.
      if (Notification.permission === 'granted') {
        new Notification(gt(titleTrans), {
          body: (reason ? gt(reasonTrans) + ': ' : '') + gt(messageTrans),
          icon: 'logo.jpeg'
        });
      }

      showMessage(t('notifSent'), 'success');
      setElValue('notifTitle', '');
      const nr = getEl('notifReason'); if (nr) nr.value = '';
      setElValue('notifMessage', '');
      hideEl('adminSendNotifForm');
    } catch (e) { showMessage(t('errorOccurred') + e.message, 'error'); }
  });

  // Save MonCash Config
  document.getElementById('saveMcConfig')?.addEventListener('click', async () => {
    const clientId = getEl('mcClientId')?.value.trim() || '';
    const clientSecret = getEl('mcClientSecret')?.value.trim() || '';
    const mode = getEl('mcMode')?.value || 'sandbox';
    try {
      await db.collection('settings').doc('moncash').set({ clientId, clientSecret, mode, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      moncashConfig = { clientId, clientSecret, mode };
      showMessage('✅ Konfigirasyon MonCash sove!', 'success');
    } catch (e) { showMessage('Erreur: ' + e.message, 'error'); }
  });

  document.getElementById('saveAiConfig')?.addEventListener('click', async () => {
    const config = {
      apiKey: getEl('aiApiKey')?.value.trim() || '',
      model: getEl('aiModel')?.value || '',
      enabled: getEl('aiEnabledToggle')?.checked ?? false,
      maxTokens: AIConfig.maxTokens || 500,
      temperature: AIConfig.temperature || 0.7,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection('settings').doc('ai_config').set(config);
      Object.assign(AIConfig, config);
      showMessage("✅ Konfigirasyon IA sove!", "success");
    } catch (e) { showMessage('Erreur: ' + e.message, 'error'); }
  });

  document.getElementById('testAiConfig')?.addEventListener('click', async () => {
    const testKey = getEl('aiApiKey')?.value.trim() || '';
    if (!testKey) { showMessage("Tanpri mete yon kle API", "error"); return; }
    
    showMessage("Test IA an kous...", "info");
    const originalKey = AIConfig.apiKey;
    const originalEnabled = AIConfig.enabled;
    
    try {
      AIConfig.apiKey = testKey;
      AIConfig.enabled = true;
      const res = await callAI("Di 'Bonjou' an Kreyòl trè kout.");
      showMessage("✅ Siksè! IA reponn: " + res, "success");
    } catch (e) {
      showMessage("❌ Erè: " + e.message, "error");
    } finally {
      AIConfig.apiKey = originalKey;
      AIConfig.enabled = originalEnabled;
    }
  });

  document.getElementById('diagAiConfig')?.addEventListener('click', async () => {
    const key = getEl('aiApiKey')?.value.trim() || '';
    if (!key) { showMessage("Entrez une clé pour le diagnostic", "error"); return; }
    showMessage("Récupération des modèles...", "info");
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await res.json();
      if (data.models) {
        const list = data.models.map(m => m.name.replace('models/', '')).join(', ');
        alert("Modèles disponibles pour votre clé :\\n\\n" + list);
      } else {
        alert("Aucun modèle trouvé ou erreur: " + JSON.stringify(data));
      }
    } catch (e) {
      alert("Erreur diagnostic: " + e.message);
    }
  });

  // Refund Order
  document.querySelectorAll('.refund-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.currentTarget.dataset.id;
      const userId = e.currentTarget.dataset.userId;
      const amount = parseFloat(e.currentTarget.dataset.amount);
      if (confirm(`Eske w sèten ou vle anile epi remèt $${amount} bay kliyan an?`)) {
        await refundUser(userId, amount, orderId);
        await db.collection('orders').doc(orderId).update({ status: 'cancelled' });
        renderView('admin');
      }
    });
  });

  // Stats Card Presence Click
  document.getElementById('onlineStatsCard')?.addEventListener('click', () => {
    document.getElementById('presenceModal')?.classList.remove('hidden');
    renderPresenceList();
  });

  // Close Presence Modal
  document.getElementById('closePresenceModal')?.addEventListener('click', () => {
    document.getElementById('presenceModal')?.classList.add('hidden');
  });

  // Search Filter for Notifications
  document.getElementById('notifUserSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#notifTarget .notif-user-opt').forEach(opt => {
      const text = opt.textContent.toLowerCase();
      opt.style.display = text.includes(term) ? '' : 'none';
    });
  });
}

// ---------- NEW ADMIN FUNCTIONS ----------
async function loadMoncashConfig() {
  try {
    const doc = await db.collection('settings').doc('moncash').get();
    if (doc.exists) moncashConfig = doc.data();
  } catch (e) { console.error('Erreur config MonCash:', e); }
}

async function createMoncashPaymentRequest({ orderId, userId, userEmail, phone, amount, currency, mode }) {
  try {
    await db.collection('moncash_requests').add({
      orderId,
      userId,
      userEmail,
      phone,
      amount,
      currency,
      provider: 'MonCash',
      mode: mode || moncashConfig.mode || 'production',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error('Erreur création demande MonCash:', e);
  }
}

async function refundUser(userId, amount, orderId) {
  try {
    const userRef = db.collection('users').doc(userId);
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw "Kliyan sa a pa egziste!";
      const currentBalance = userDoc.data().balance || 0;
      transaction.update(userRef, { balance: currentBalance + amount, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      transaction.set(db.collection('notifications').doc(), {
        targetUserId: userId, title: t('refund'),
        message: `Nou remèt ou ${formatPrice(amount)} pou kòmand #${orderId.substring(0, 6)} ki anile a.`,
        type: 'refund', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    showMessage('✅ Lajan an remèt kliyan an!', 'success');
  } catch (e) { showMessage('Erreur remboursement: ' + e, 'error'); }
}

async function updatePresence() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    });
  } catch (e) { console.error("Presence error:", e); }
}

async function getOnlineUsersCount() {
  try {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const snap = await db.collection('users').where('lastSeen', '>=', fiveMinsAgo).get();
    return snap.size;
  } catch (e) { return 0; }
}

async function renderPresenceList() {
  const list = document.getElementById('presenceList');
  if (!list) return;
  list.innerHTML = `<p class="text-center" style="padding:2rem;">⏳ ${t('loading')}</p>`;
  try {
    const snap = await db.collection('users').orderBy('lastSeen', 'desc').limit(50).get();
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    list.innerHTML = users.map(u => {
      const isOnline = u.lastSeen?.toDate?.() >= fiveMinsAgo;
      return `
            <div class="user-presence-item">
                <div style="display:flex; align-items:center;">
                    <span class="presence-status-dot ${isOnline ? 'status-online' : 'status-offline'}"></span>
                    <div>
                        <div style="font-weight:700; color:var(--blue-deep);">${u.displayName || u.email}</div>
                        <div style="font-size:0.75rem; color:var(--text-soft);">${u.role}</div>
                    </div>
                </div>
                <div style="font-size:0.7rem; color:var(--text-soft);">
                    ${u.lastSeen?.toDate?.()?.toLocaleTimeString() || '---'}
                </div>
            </div>`;
    }).join('');
  } catch (e) { list.innerHTML = `<p class="text-center">${t('errorOccurred')}</p>`; }
}

// ---------- SCROLL LISTENER FOR NAVBAR ----------
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.navbar');
  const searchBar = document.getElementById('searchFilterBar');
  if (!nav) return;
  
  if (window.scrollY > 100) {
    nav.classList.add('scrolled');
    // Cacher la barre de recherche au défilement pour libérer de l'espace
    if (searchBar && !searchBar.classList.contains('hidden') && window.scrollY > 300) {
        searchBar.classList.add('hidden');
    }
  } else {
    nav.classList.remove('scrolled');
  }
});

// ============================================
// PAGES CLIENT
// ============================================
async function renderHome(app) {
  app.innerHTML = `
    <div class="hero-section">
      <img src="logo.jpeg" alt="Total Lakay" class="hero-logo" onerror="this.style.display='none';">
      <h1 class="hero-title">🏠 ${t('welcome')}</h1>
      <p class="hero-subtitle">${t('slogan')}</p>
      <button onclick="renderView('shop')" class="btn btn-gold" style="padding:15px 40px; font-size:1.1rem; margin-top:20px;">🛍️ ${t('goShop')}</button>
    </div>

    <!-- Featured Section with Skeletons -->
    <section class="container" style="padding: 60px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
        <div>
          <h2 style="font-size: 2rem; margin-bottom: 10px;">✨ ${t('featured')}</h2>
          <p style="color: var(--text-soft);">${t('exploreCategories')}</p>
        </div>
        <button onclick="renderView('shop')" class="btn-outline desktop-only">${t('viewAll') || 'Tout Boutik'}</button>
      </div>
      <div id="featuredProducts" class="grid">
        ${renderSkeletons(4)}
      </div>
    </section>

    <!-- Testimonials Section - Now Dynamic or Removed as requested -->
    <section id="reviewsSection" class="glass-dark" style="padding: 80px 0; margin: 60px 0; color: white; display: none;">
      <div class="container" style="text-align: center;">
        <h2 style="color: var(--gold); font-size: 2rem; margin-bottom: 50px;">🌟 ${t('testimonialsTitle')}</h2>
        <div id="dynamicReviews" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
          <!-- Real reviews will be injected here -->
        </div>
      </div>
    </section>

    <section class="container" style="padding: 60px 20px;">
      <h2 style="font-size: 2rem; margin-bottom: 40px; text-align: center;">📁 ${t('categoriesTitle')}</h2>
      <div id="homeCategories" class="grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
        ${['clothing', 'electronics', 'school', 'home', 'beauty'].map(cat => `
          <div class="glass" onclick="filterByCategory('${cat}')" style="padding: 25px; text-align: center; border-radius: var(--radius-lg); cursor: pointer; transition: var(--transition);" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
            <div style="font-size: 2.5rem; margin-bottom: 15px;">${getCategoryEmoji(cat)}</div>
            <div style="font-weight: 700; color: var(--blue-deep);">${t('category' + cat.charAt(0).toUpperCase() + cat.slice(1))}</div>
          </div>
        `).join('')}
      </div>
    </section>
    
    <div id="aiRecommendations" class="container" style="padding-bottom: 60px;"></div>
  `;

  // Chargement asynchrone pour l'effet de skeleton
  setTimeout(async () => {
    await loadProducts();
    const grid = document.getElementById('featuredProducts');
    if (grid) {
      grid.innerHTML = products.length === 0 ? `<p>📦 ${t('noProducts')}</p>` : products.slice(0, 4).map(p => productCardHTML(p)).join('');
      attachBuyButtons();
    }
    renderAIRecommendations();
  }, 600);
}

function filterByCategory(cat) {
  currentView = 'shop';
  renderView('shop').then(() => {
    const filter = document.getElementById('categoryFilter');
    if (filter) {
      filter.value = cat;
      refreshProductGrid();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

async function renderShop(app) {
  app.innerHTML = `
    <div class="shop-hero" style="background:var(--blue-deep); padding:80px 0; text-align:center; color:white; margin-bottom:40px; position:relative; overflow:hidden;">
      <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:url('logo.jpeg') center/cover; opacity:0.1; filter:blur(5px);"></div>
      <div style="position:relative; z-index:1;">
        <h1 style="font-size:3rem; font-weight:900; margin-bottom:15px; letter-spacing:-1px;">🛍️ ${t('shop')}</h1>
        <p style="font-size:1.2rem; opacity:0.9; max-width:600px; margin:0 auto;">${t('shopSlogan')}</p>
      </div>
    </div>

    <div class="container">
      <div class="shop-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; margin-bottom:50px; background:var(--white); padding:20px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md); border:1px solid var(--gray-200);">
        <div class="search-bar-container" style="flex:1; min-width:300px; position:relative;">
          <input type="text" id="shopSearchInput" class="search-input" style="width:100%; padding:15px 15px 15px 50px; font-size:1rem; border-radius:30px; border:2px solid var(--gray-100); transition:var(--transition);" placeholder="${t('searchPlaceholder')}">
          <span style="position:absolute; left:20px; top:50%; transform:translateY(-50%); font-size:1.2rem; opacity:0.5;">🔍</span>
        </div>
        <div class="filters-container" style="display:flex; gap:15px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-weight:700; color:var(--text-soft); font-size:0.9rem;">${t('category')}:</span>
            <select id="categoryFilter" class="filter-select" style="padding:10px 20px; border-radius:30px; font-weight:600;">
              <option value="all">📁 ${t('allCategories')}</option>
              <option value="clothing">👕 ${t('categoryClothingAccessories')}</option>
              <option value="school">🎓 ${t('categorySchoolOffice')}</option>
              <option value="home">🏠 ${t('categoryHomePersonal')}</option>
              <option value="electronics">📱 ${t('categoryElectronicsTech')}</option>
            </select>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-weight:700; color:var(--text-soft); font-size:0.9rem;">Trier:</span>
            <select id="sortFilter" class="filter-select" style="padding:10px 20px; border-radius:30px; font-weight:600;">
              <option value="recent">🆕 ${t('mostRecent')}</option>
              <option value="low">📉 ${t('priceLowToHigh')}</option>
              <option value="high">📈 ${t('priceHighToLow')}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="grid" id="allProducts" style="margin-bottom:60px;">
        ${Array(8).fill(0).map(() => `<div class="product-card skeleton"><div class="skeleton-img"></div><div class="product-info"><div class="skeleton-text"></div><div class="skeleton-text" style="width:60%;"></div></div></div>`).join('')}
      </div>
    </div>
  `;
  
  await loadProducts();
  const grid = document.getElementById('allProducts');
  if (grid) {
    grid.innerHTML = displayFilteredProducts();
  }
  attachBuyButtons();
  setupSearchAndFilters();
}

async function renderAIPage(app) {
  if (!currentUser) {
    app.innerHTML = `
      <div class="container" style="padding:100px 0;">
        <div class="card-premium text-center" style="max-width:500px; margin:0 auto; padding:40px;">
          <div style="font-size:4rem; margin-bottom:20px;">🔐</div>
          <h2 style="color:var(--blue-deep); margin-bottom:15px;">${t('loginRequired')}</h2>
          <p style="color:var(--text-soft); margin-bottom:30px;">${t('aiLoginRequiredDesc') || 'Ou dwe konekte pou w ka pale ak asistan entèlijan nou an.'}</p>
          <button class="btn-gold" id="loginFromAI" style="width:100%; padding:15px;">${t('login')}</button>
        </div>
      </div>
    `;
    document.getElementById('loginFromAI')?.addEventListener('click', () => document.getElementById('authBtn')?.click());
    return;
  }

  app.innerHTML = `
    <div class="container" style="padding:40px 0;">
      <div class="card-premium" style="max-width:1000px; margin:0 auto; padding:0; overflow:hidden; border:none; box-shadow:var(--shadow-xl);">
        <div style="background:var(--blue-deep); padding:30px; color:white; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="margin:0; font-size:1.8rem; display:flex; align-items:center; gap:12px;">🤖 ${t('aiAssistant')}</h2>
            <p style="margin:5px 0 0; opacity:0.8; font-size:0.9rem;">${t('aiPageDesc')}</p>
          </div>
          <div style="background:rgba(255,255,255,0.1); padding:8px 20px; border-radius:30px; font-size:0.8rem; font-weight:700; border:1px solid rgba(255,255,255,0.2);">
            ONLINE
          </div>
        </div>
        
        <div style="height:600px; display:flex; flex-direction:column; background:var(--white);">
          <div id="aiPageMessages" style="flex:1; padding:30px; overflow-y:auto; display:flex; flex-direction:column; gap:20px; background:#f8f9fb;">
            <div style="background:var(--white); color:var(--blue-deep); align-self:flex-start; border-radius:20px 20px 20px 5px; padding:20px; max-width:80%; box-shadow:var(--shadow-sm); border:1px solid var(--gray-100); line-height:1.6;">
              👋 ${t('aiWelcome')}
            </div>
          </div>
          
          <div style="padding:25px; background:var(--white); border-top:1px solid var(--gray-200);">
            <div style="display:flex; gap:15px; background:var(--gray-100); padding:8px; border-radius:40px; border:2px solid transparent; transition:var(--transition);" onfocusin="this.style.borderColor='var(--gold)'; this.style.background='white'" onfocusout="this.style.borderColor='transparent'; this.style.background='var(--gray-100)'">
              <input type="text" id="aiPageInput" placeholder="${t('aiInputPlaceholder')}" style="flex:1; border:none; background:transparent; padding:12px 25px; font-size:1rem; outline:none;">
              <button id="sendAiPageMsg" style="background:var(--gold-gradient); color:var(--blue-deep); width:50px; height:50px; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition:var(--transition); box-shadow:var(--shadow-gold);">
                📤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById('aiPageInput');
  const btn = document.getElementById('sendAiPageMsg');

  input.focus();

  btn.addEventListener('click', () => sendAIPageMessage());
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAIPageMessage();
  });
}

async function sendAIPageMessage() {
  const input = document.getElementById('aiPageInput');
  const messages = document.getElementById('aiPageMessages');
  if (!input || !messages) return;

  const question = input.value.trim();
  if (!question) return;

  // User message
  const userMsg = document.createElement('div');
  userMsg.className = 'message user';
  userMsg.style = 'background: var(--gold); color: var(--blue-deep); align-self: flex-end; border-radius: 16px 16px 4px 16px; padding: 1rem; max-width: 80%; line-height: 1.5; font-weight: 500; animation: slideUp 0.3s ease-out;';
  userMsg.textContent = question;
  messages.appendChild(userMsg);

  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Bot typing
  const typingEl = document.createElement('div');
  typingEl.className = 'message bot typing';
  typingEl.style = 'background: #f0f0f0; color: #888; align-self: flex-start; border-radius: 16px 16px 16px 4px; padding: 0.8rem 1.2rem; font-style: italic; animation: fadeIn 0.3s ease;';
  typingEl.textContent = t('aiTyping');
  messages.appendChild(typingEl);
  messages.scrollTop = messages.scrollHeight;

  try {
    const answer = await askAIAssistant(question);
    if (typingEl) typingEl.remove();

    const botMsg = document.createElement('div');
    botMsg.className = 'message bot';
    botMsg.style = 'background: var(--gray-100); align-self: flex-start; border-radius: 16px 16px 16px 4px; padding: 1rem; max-width: 80%; line-height: 1.5; animation: fadeIn 0.3s ease;';
    botMsg.innerHTML = escapeHtml(answer).replace(/\n/g, '<br>');
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
  } catch (err) {
    if (typingEl) typingEl.remove();
    const errorMsg = document.createElement('div');
    errorMsg.className = 'message bot error';
    errorMsg.style = 'background: #ffe5e5; color: #d32f2f; align-self: flex-start; border-radius: 16px; padding: 1rem; font-size: 0.9rem;';
    errorMsg.textContent = t('aiError') + " (" + err.message + ")";
    messages.appendChild(errorMsg);
    messages.scrollTop = messages.scrollHeight;
  }
}

async function renderProfile(app) {
  if (!currentUser) {
    app.innerHTML = `<div class="card text-center"><p>🔐 ${t('loginRequired')}</p><button class="btn-gold" id="loginFromOrders">${t('login')}</button></div>`;
    document.getElementById('loginFromOrders')?.addEventListener('click', () => document.getElementById('authBtn')?.click());
    return;
  }

  let userAddress = '';
  let userPhone = '';
  let currentUserData = {};
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      currentUserData = userDoc.data();
      userAddress = currentUserData.address || '';
      userPhone = currentUserData.phone || '';
    }
  } catch (e) { console.error("Erreur profil:", e); }

  await loadMyOrders();

  const totalSpent = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.price || 0), 0);
  const totalOrders = orders.length;
  const initials = (currentUser.displayName || currentUser.email || 'U').substring(0, 2).toUpperCase();

  app.innerHTML = `
    <div class="container" style="padding-top:40px; padding-bottom:60px;">
      <div style="display:grid; grid-template-columns: 300px 1fr; gap:40px;">
        <!-- SIDEBAR -->
        <div style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); height:fit-content; border:1px solid var(--gray-200);">
          <div class="avatar-container" style="text-align:center; margin-bottom:30px;">
            <div class="avatar" id="profileAvatar" style="width:120px; height:120px; background:var(--gold-gradient); color:var(--blue-deep); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:2.5rem; font-weight:900; position:relative; cursor:pointer; border:4px solid var(--white); box-shadow:var(--shadow-md);">
              ${currentUser.photoURL ? `<img src="${currentUser.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : initials}
              <div style="position:absolute; bottom:5px; right:5px; background:var(--blue-deep); color:white; width:35px; height:35px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1rem; border:2px solid var(--white);">📷</div>
            </div>
            <input type="file" id="profPhotoInput" accept="image/*" style="display:none;">
            <h3 class="profile-avatar-name" style="color:var(--blue-deep); margin-bottom:5px;">${currentUser.displayName || t('clientLabel')}</h3>
            <p style="font-size:0.85rem; color:var(--text-soft); word-break:break-all;">${currentUser.email}</p>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <button class="tab-btn active" data-target="tab-overview" style="width:100%; text-align:left; padding:12px 20px; border-radius:12px; border:none; background:none; color:var(--text-soft); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; transition:var(--transition);">📊 Aperçu</button>
            <button class="tab-btn" data-target="tab-info" style="width:100%; text-align:left; padding:12px 20px; border-radius:12px; border:none; background:none; color:var(--text-soft); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; transition:var(--transition);">👤 ${t('profile')}</button>
            <button class="tab-btn" data-target="tab-orders" style="width:100%; text-align:left; padding:12px 20px; border-radius:12px; border:none; background:none; color:var(--text-soft); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; transition:var(--transition);">📦 ${t('myOrders')}</button>
            <button class="tab-btn" data-target="tab-premium" style="width:100%; text-align:left; padding:12px 20px; border-radius:12px; border:none; background:none; color:var(--text-soft); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; transition:var(--transition);">✨ Premium</button>
            <button class="tab-btn" data-target="tab-security" style="width:100%; text-align:left; padding:12px 20px; border-radius:12px; border:none; background:none; color:var(--text-soft); font-weight:600; cursor:pointer; display:flex; align-items:center; gap:12px; transition:var(--transition);">🔒 Sécurité</button>
          </div>
        </div>

        <!-- CONTENT -->
        <div style="background:var(--white); padding:40px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); border:1px solid var(--gray-200);">
          
          <!-- TAB: OVERVIEW -->
          <div id="tab-overview" class="profile-tab-content active">
            <h2 style="margin-bottom:30px; font-size:1.8rem; color:var(--blue-deep);">📊 Aperçu du Compte</h2>
            <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px; margin-bottom:40px;">
              <div style="background:var(--blue-deep); color:white; padding:30px; border-radius:var(--radius); border-left:6px solid var(--gold); box-shadow:var(--shadow-md);">
                <div style="font-size:2rem; font-weight:900; color:var(--gold); margin-bottom:5px;">${formatPrice(currentUserData?.balance || 0)}</div>
                <div style="font-size:1rem; opacity:0.8; font-weight:600;">${t('myBalance')}</div>
              </div>
              <div style="background:var(--white-soft); padding:30px; border-radius:var(--radius); border:1px solid var(--gray-200);">
                <div style="font-size:2rem; font-weight:900; color:var(--blue-deep); margin-bottom:5px;">${totalOrders}</div>
                <div style="font-size:1rem; color:var(--text-soft); font-weight:600;">Commandes</div>
              </div>
              <div style="background:var(--white-soft); padding:30px; border-radius:var(--radius); border:1px solid var(--gray-200);">
                <div style="font-size:2rem; font-weight:900; color:var(--blue-deep); margin-bottom:5px;">${formatPrice(totalSpent)}</div>
                <div style="font-size:1rem; color:var(--text-soft); font-weight:600;">Total Dépensé</div>
              </div>
            </div>

            <div style="background:rgba(212, 175, 55, 0.05); padding:35px; border-radius:var(--radius); border:1px solid var(--gold-pale);">
              <h3 style="color:var(--blue-deep); margin-bottom:20px; display:flex; align-items:center; gap:10px;">💳 ${t('linkMoncash')}</h3>
              <div style="margin-bottom:20px;">
                <label style="display:block; margin-bottom:10px; font-weight:600; color:var(--text-soft);">${t('moncashPhone')}</label>
                <input type="text" id="userMoncashPhone" class="search-input" style="width:100%; background:var(--white); font-size:1.1rem; padding:15px;" value="${currentUserData?.moncashPhone || ''}" placeholder="+509 3XXX XXXX">
              </div>
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:25px;">
                <input type="checkbox" id="userMoncashConsent" ${currentUserData?.moncashConsent ? 'checked' : ''} style="width:22px; height:22px; cursor:pointer;">
                <label for="userMoncashConsent" style="font-size:0.9rem; color:var(--text-soft); cursor:pointer;">${t('moncashTerms')}</label>
              </div>
              <button id="linkMoncashBtn" class="btn-gold" style="width:100%; padding:18px; font-size:1.1rem;">${currentUserData?.moncashPhone ? t('save') : t('connect')}</button>
            </div>
          </div>

          <!-- TAB: INFO -->
          <div id="tab-info" class="profile-tab-content" style="display:none;">
            <h2 style="margin-bottom:30px; font-size:1.8rem; color:var(--blue-deep);">👤 ${t('profile')}</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:25px; margin-bottom:30px;">
              <div>
                <label style="display:block; margin-bottom:10px; font-weight:600; color:var(--text-soft);">${t('name')}</label>
                <input type="text" id="profName" class="search-input" style="width:100%; padding:15px;" value="${currentUser.displayName || ''}">
              </div>
              <div>
                <label style="display:block; margin-bottom:10px; font-weight:600; color:var(--text-soft);">${t('email')}</label>
                <input type="text" class="search-input" style="width:100%; background:var(--gray-100); color:var(--text-soft); padding:15px;" value="${currentUser.email}" disabled>
              </div>
              <div>
                <label style="display:block; margin-bottom:10px; font-weight:600; color:var(--text-soft);">${t('addressRecommend')}</label>
                <input type="text" id="profAddress" class="search-input" style="width:100%; padding:15px;" value="${userAddress}">
              </div>
              <div>
                <label style="display:block; margin-bottom:10px; font-weight:600; color:var(--text-soft);">${t('phoneRecommend')}</label>
                <input type="text" id="profPhone" class="search-input" style="width:100%; padding:15px;" value="${userPhone}">
              </div>
            </div>
            <button id="saveProfileBtn" class="btn-gold" style="width:100%; padding:18px; font-size:1.1rem;">💾 ${t('saveProfile')}</button>
          </div>

          <!-- TAB: ORDERS -->
          <div id="tab-orders" class="profile-tab-content" style="display:none;">
            <h2 style="margin-bottom:30px; font-size:1.8rem; color:var(--blue-deep);">📦 ${t('myOrders')}</h2>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${orders.length === 0 ? `
                <div style="text-align:center; padding:60px; background:var(--white-soft); border-radius:var(--radius); border:2px dashed var(--gray-200);">
                  <div style="font-size:4rem; margin-bottom:20px;">📭</div>
                  <p style="color:var(--text-soft); font-size:1.2rem;">${t('noOrders')}</p>
                </div>
              ` : orders.map(o => `
                <div style="padding:25px; border-radius:var(--radius); border:1px solid var(--gray-200); background:var(--white-soft); transition:var(--transition); cursor:default;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='var(--gray-200)'">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <strong style="color:var(--blue-deep); font-size:1.2rem;">${o.productName}</strong>
                    <div style="margin: 20px 0;">
                      ${renderStepper(o.status)}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                       <span style="font-weight:700; font-size:0.9rem; color:var(--text-soft);">${t('orderCode')}: ${o.orderCode || '---'}</span>
                       <span class="status-badge status-${o.status}" style="padding:6px 15px; border-radius:30px; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:1px;">${t(o.status)}</span>
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:1rem; color:var(--text-soft);">
                      <span style="color:var(--blue-deep); font-weight:800; font-size:1.1rem;">${formatPrice(o.price)}</span>
                      <span style="margin:0 10px; color:var(--gray-300);">|</span>
                      <span>📅 ${o.createdAt?.toDate?.()?.toLocaleDateString() || '---'}</span>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                      ${o.deliveryEstimate ? `<div style="font-weight:700; color:var(--success); font-size:0.9rem;">🚚 ${t('delivery')}: ${o.deliveryEstimate}</div>` : ''}
                      ${['pending', 'validated', 'processing', 'in_transit'].includes(o.status) ? `<button class="btn btn-sm btn-gold client-track-btn" style="padding:8px 15px;" data-id="${o.id}">📍 Suivre</button>` : ''}
                    </div>
                  </div>
                </div>`).join('')}
            </div>
          </div>

          <!-- TAB: PREMIUM -->
          <div id="tab-premium" class="profile-tab-content" style="display:none;">
            <div style="text-align:center; margin-bottom:40px;">
              <h2 style="font-size:2.2rem; color:var(--blue-deep); margin-bottom:10px;">✨ ${t('premiumTitle')}</h2>
              <p style="color:var(--text-soft); font-size:1.1rem;">${t('premiumDesc')}</p>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px; align-items:start;">
              <!-- Plan Actuel -->
              <div style="background:var(--white-soft); padding:30px; border-radius:var(--radius-lg); border:2px solid ${isPremium ? 'var(--gold)' : 'var(--gray-200)'}; position:relative; overflow:hidden;">
                ${isPremium ? `<div style="position:absolute; top:15px; right:-35px; background:var(--gold); color:white; padding:5px 40px; transform:rotate(45deg); font-weight:900; font-size:0.7rem;">ACTIVE</div>` : ''}
                <h4 style="margin-bottom:20px; text-transform:uppercase; letter-spacing:1px; opacity:0.6;">${t('currentPlan')}</h4>
                <div style="font-size:1.8rem; font-weight:900; color:var(--blue-deep); margin-bottom:10px;">${isPremium ? t('premiumPlan') : t('freePlan')}</div>
                <p style="color:var(--text-soft); margin-bottom:20px;">
                  ${isPremium ? 'Accès illimité à LakayGPT Pro' : `Limite de ${FREE_AI_LIMIT} messages / jour`}
                </p>
                <div style="font-size:0.9rem; font-weight:700; color:var(--blue-deep);">
                  💰 ${isPremium ? 'Abonnement Actif' : '0 HTG / mois'}
                </div>
              </div>

              <!-- Upgrade Card -->
              <div style="background:var(--blue-deep); color:white; padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-gold); border:1px solid var(--gold);">
                <h4 style="color:var(--gold); margin-bottom:20px; text-transform:uppercase;">OFFRE SPÉCIALE</h4>
                <div style="font-size:2rem; font-weight:900; margin-bottom:20px;">3650G <small style="font-size:0.9rem; opacity:0.6;">/ mois</small></div>
                <ul style="list-style:none; padding:0; margin-bottom:30px; display:flex; flex-direction:column; gap:12px;">
                  ${t('premiumFeatures').map(f => `<li style="display:flex; align-items:center; gap:10px;"><i class="fas fa-check-circle" style="color:var(--gold);"></i> ${f}</li>`).join('')}
                </ul>
                <button id="subscribeBtn" class="btn-gold" style="width:100%; padding:15px; font-size:1rem;" ${isPremium ? 'disabled' : ''}>
                  ${isPremium ? 'Déjà abonné' : t('subscribe')}
                </button>
              </div>
            </div>
          </div>

          <!-- TAB: SECURITY -->
          <div id="tab-security" class="profile-tab-content" style="display:none;">
            <button id="resetPasswordBtn" class="btn btn-outline" style="color:var(--blue-deep); border-color:var(--blue-deep); font-weight:600;">📧 Envoyer lien de réinitialisation</button>
          </div>
          <div style="margin-top:2.5rem; text-align:center; padding-top:2rem; border-top:1px solid var(--gray-200);">
             <button id="profileLogoutBtn" class="btn btn-danger" style="min-width:200px;">🚪 ${t('logout')}</button>
          </div>
        </div>

      </div>
    </div>
  `;

  // Tab Switching Logic
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'none';
        b.style.color = 'var(--text-soft)';
      });
      document.querySelectorAll('.profile-tab-content').forEach(c => {
        c.style.display = 'none';
        c.classList.remove('active');
      });

      const clicked = e.currentTarget;
      clicked.classList.add('active');
      clicked.style.background = 'var(--blue-deep)';
      clicked.style.color = 'white';
      
      const targetId = clicked.getAttribute('data-target');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.style.display = 'block';
        targetContent.classList.add('active');
      }
    });
  });

  // Save Profile Logic
  document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
    const name = getEl('profName')?.value.trim() || '';
    const address = getEl('profAddress')?.value.trim() || '';
    const phone = getEl('profPhone')?.value.trim() || '';

    if (address && address.length < 5) {
      showMessage(t('invalidAddress'), 'error');
      return;
    }

    try {
      await db.collection('users').doc(currentUser.uid).update({
        displayName: name,
        address: address,
        phone: phone
      });
      await currentUser.updateProfile({ displayName: name });
      showMessage(t('profileUpdated'), 'success');
      // Update UI without full reload
      const avatarNameEl = document.querySelector('.profile-avatar-name');
      if (avatarNameEl) {
        avatarNameEl.textContent = name || t('clientLabel');
      }

      const avatarEl = document.querySelector('.avatar');
      if (avatarEl && !currentUser.photoURL) {
        avatarEl.innerHTML = `<span id="avatarInitials">${(name || currentUser.email || 'U').substring(0, 2).toUpperCase()}</span><div style="position:absolute; bottom:0; right:0; background:var(--gold); color:white; width:25px; height:25px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; border:2px solid var(--white);">📷</div>`;
      }
    } catch (e) { showMessage(t('errorOccurred') + e.message, 'error'); }
  });

  // Track Order Logic
  document.querySelectorAll('.client-track-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      currentTrackingOrderId = e.target.dataset.id;
      renderView('tracking');
    });
  });

  // Link MonCash Logic
  document.getElementById('linkMoncashBtn')?.addEventListener('click', async () => {
    const phone = document.getElementById('userMoncashPhone').value.trim();
    const consent = document.getElementById('userMoncashConsent').checked;

    if (!phone) { showMessage(t('phoneRequired') || "Telefòn obligatwa", 'error'); return; }
    if (!consent) { showMessage("Ou dwe aksepte kondisyon yo", 'error'); return; }

    try {
      await db.collection('users').doc(currentUser.uid).update({
        moncashPhone: phone,
        moncashConsent: consent,
        moncashLinkedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showMessage("✅ MonCash konekte ak siksè!", 'success');
      renderView('profile');
    } catch (e) { showMessage('Erreur: ' + e.message, 'error'); }
  });

  // Photo Upload Logic
  document.getElementById('profileAvatar')?.addEventListener('click', () => {
    document.getElementById('profPhotoInput')?.click();
  });

  document.getElementById('profPhotoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showMessage(t('fileTooLarge') || "Fichier trop volumineux (max 2Mo)", "error");
      return;
    }

    try {
      showMessage(t('uploading') || "Chargement...", "info");
      const ref = storage.ref(`profiles/${currentUser.uid}/${file.name}`);
      await ref.put(file);
      const url = await ref.getDownloadURL();

      await currentUser.updateProfile({ photoURL: url });
      await db.collection('users').doc(currentUser.uid).update({ photoURL: url });

      const avatarEl = document.getElementById('profileAvatar');
      avatarEl.innerHTML = `<img src="${url}" id="avatarImg"><div style="position:absolute; bottom:0; right:0; background:var(--gold); color:white; width:25px; height:25px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.8rem; border:2px solid var(--white);">📷</div>`;

      showMessage(t('profileUpdated'), "success");
    } catch (err) {
      console.error(err);
      showMessage(t('errorOccurred') + err.message, "error");
    }
  });

  // Reset Password Logic
  document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
    try {
      await auth.sendPasswordResetEmail(currentUser.email);
      showMessage('Email de réinitialisation envoyé !', 'success');
    } catch (e) {
      showMessage('Erreur: ' + e.message, 'error');
    }
  });

  document.getElementById('subscribeBtn')?.addEventListener('click', async () => {
    if (isPremium) return;
    try {
      showLoading(true);
      await db.collection('users').doc(currentUser.uid).update({
        isPremium: true,
        premiumSince: firebase.firestore.FieldValue.serverTimestamp()
      });
      isPremium = true;
      showMessage("✨ Félicitations ! Vous êtes maintenant membre TOTAL LAKAY PREMIUM.", "success");
      await renderProfile(app); // Re-rendre pour voir le changement
    } catch (e) {
      showMessage("Erreur lors de l'abonnement.", "error");
    } finally {
      showLoading(false);
    }
  });

  // Logout Logic
  document.getElementById('profileLogoutBtn')?.addEventListener('click', () => {
    auth.signOut();
    showMessage(t('loggedOut'), 'success');
  });
}

async function renderClientOrders(app) {
  await renderProfile(app);
}

async function renderSettings(app) {
  let notifPrefs = { newProducts: true, specialPrices: true, updates: true };
  if (currentUser) {
    try {
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      if (userDoc.exists && userDoc.data().notifPrefs) {
        notifPrefs = userDoc.data().notifPrefs;
      }
    } catch (e) { console.error(e); }
  }

  app.innerHTML = `
    <div class="card-premium settings-card" style="animation: viewFadeIn 0.4s ease;">
      <h2 style="margin-bottom:2rem; color:var(--blue-deep);">⚙️ ${t('settings')}</h2>
      
      <div class="settings-section">
        <h3>🌍 ${t('language')}</h3>
        <select id="settingsLang" class="filter-select" style="width:100%; max-width:300px;">
          <option value="ht" ${currentLang === 'ht' ? 'selected' : ''}>🇭🇹 Kreyòl</option>
          <option value="fr" ${currentLang === 'fr' ? 'selected' : ''}>🇫🇷 Français</option>
          <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇺🇸 English</option>
          <option value="es" ${currentLang === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
        </select>
      </div>

      <div class="settings-section mt-3">
        <h3>🔔 ${t('notifSettings')}</h3>
        <div class="notif-status-box" id="notifStatusBox">
          <span>${t('notifStatus')}: <strong id="notifStatusLabel">...</strong></span>
          <button class="btn btn-gold btn-sm" id="requestNotifBtn" style="display:none;">${t('notifRequest')}</button>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('notifNewProducts')}</div>
            <div class="setting-desc">Recevez une alerte pour chaque nouveauté</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="prefNewProducts" ${notifPrefs.newProducts ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('notifSpecialPrices')}</div>
            <div class="setting-desc">Promotions et ventes flash</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="prefSpecialPrices" ${notifPrefs.specialPrices ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('notifUpdates')}</div>
            <div class="setting-desc">Infos sur le site et nouvelles fonctions</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="prefUpdates" ${notifPrefs.updates ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        <button class="btn btn-gold mt-2" id="saveNotifPrefsBtn" style="width:100%;">${t('notifSave')}</button>
      </div>

      <div class="settings-section mt-3">
        <h3>📍 ${t('allowLocation')}</h3>
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">${t('allowLocation')}</div>
            <div class="setting-desc">${t('locationDesc')}</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="prefLocation" ${localStorage.getItem('allowLocation') === 'true' ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>

      ${currentUser ? `
      <div class="settings-section mt-3" style="padding-top:1.5rem; border-top:1px solid #eee;">
        <h3>👤 ${t('accountInfo')}</h3>
        <div class="account-details">
          <p><strong>${t('email')}:</strong> ${currentUser.email}</p>
          <p><strong>${t('name')}:</strong> ${currentUser.displayName || '---'}</p>
          <p><strong>${t('role')}:</strong> ${isAdmin ? 'Admin' : 'Client'}</p>
          <p><strong>${t('emailVerified')}:</strong> ${currentUser.emailVerified ? '✅ ' + t('yes') : '❌ ' + t('no')}</p>
          ${!currentUser.emailVerified ? `<button class="btn btn-gold btn-sm mt-2" id="resendVerifyEmail">📧 ${t('resendVerifyEmail')}</button>` : ''}
        </div>
      </div>` : ''}
    </div>`;

  // Language Change
  document.getElementById('settingsLang')?.addEventListener('change', (e) => {
    currentLang = e.target.value;
    const langSwitch = getEl('langSwitch');
    if (langSwitch) langSwitch.value = currentLang;
    applyLanguage();
    renderView('settings'); // Refresh to update labels
  });

  // Notif Status Update
  updateNotifUI();

  document.getElementById('requestNotifBtn')?.addEventListener('click', async () => {
    const permission = await Notification.requestPermission();
    updateNotifUI();
    if (permission === 'granted') showMessage("Notifications autorisées !", "success");
  });

  document.getElementById('saveNotifPrefsBtn')?.addEventListener('click', async () => {
    if (!currentUser) { showMessage(t('loginRequired'), 'error'); return; }
    const prefs = {
      newProducts: document.getElementById('prefNewProducts').checked,
      specialPrices: document.getElementById('prefSpecialPrices').checked,
      updates: document.getElementById('prefUpdates').checked
    };
    try {
      await db.collection('users').doc(currentUser.uid).update({ notifPrefs: prefs });
      showMessage(t('notifPreferencesSaved'), 'success');
    } catch (e) { showMessage(t('errorOccurred') + e.message, 'error'); }
  });

  document.getElementById('prefLocation')?.addEventListener('change', (e) => {
    localStorage.setItem('allowLocation', e.target.checked);
    if (e.target.checked) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {
        showMessage("Permission refusée par le navigateur", "error");
        e.target.checked = false;
        localStorage.setItem('allowLocation', false);
      });
    }
  });

  document.getElementById('resendVerifyEmail')?.addEventListener('click', async () => {
    if (currentUser) { await currentUser.sendEmailVerification(); showMessage(t('emailVerifySent'), 'success'); }
  });
}

function updateNotifUI() {
  const label = document.getElementById('notifStatusLabel');
  const btn = document.getElementById('requestNotifBtn');
  if (!label) return;

  if (!("Notification" in window)) {
    label.textContent = "Non supporté";
    label.style.color = "var(--danger)";
    return;
  }

  if (Notification.permission === 'granted') {
    label.textContent = t('notifGranted');
    label.style.color = "var(--success)";
    if (btn) btn.style.display = 'none';
  } else if (Notification.permission === 'denied') {
    label.textContent = t('notifBlocked');
    label.style.color = "var(--danger)";
    if (btn) btn.style.display = 'none';
  } else {
    label.textContent = "Non configuré";
    label.style.color = "#f39c12";
    if (btn) btn.style.display = 'inline-block';
  }
}


// ============================================
// ATTACHER BOUTONS ACHAT
// ============================================
function attachBuyButtons() {
  document.querySelectorAll('.add-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      addToCart(e.currentTarget.dataset.productId);
    });
  });

  document.querySelectorAll('.buy-now-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!currentUser) { showMessage(t('loginRequired'), 'error'); document.getElementById('authBtn')?.click(); return; }
      if (!currentUser.emailVerified) { showMessage(t('emailNotVerified'), 'error'); return; }
      const product = products.find(p => p.id === e.currentTarget.dataset.productId);
      if (!product) return;
      selectedProductId = product.id;
      document.getElementById('modalProductName').textContent = gt(product.name);
      document.getElementById('modalProductPrice').textContent = formatPrice(product.price);
      document.getElementById('productDetailsContent').innerHTML = `<p style="margin:1rem 0; color:var(--text-soft);">${gt(product.description) || ''}</p>`;

      const variationContainer = document.getElementById('variationSelectors');
      if (variationContainer) {
        let html = '';

        // Stock / Quantity
        if (product.stock > 0) {
          html += `
            <div>
              <label>🔢 ${t('quantity')}</label>
              <input type="number" id="orderQuantity" value="1" min="1" max="${product.stock}" style="width:100px;">
              <span style="font-size:0.8rem; color:var(--text-soft); margin-left:0.5rem;">(${product.stock} ${t('available') || 'disponibles'})</span>
            </div>`;
        } else {
          html += `<p style="color:var(--danger); font-weight:700;">🚫 ${t('outOfStock')}</p>`;
        }

        // Colors
        if (product.colors && product.colors.length > 0) {
          html += `
            <div>
              <label>🎨 ${t('selectColor')}</label>
              <select id="orderColor">
                ${product.colors.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>`;
        }

        // Sizes
        if (product.sizes && product.sizes.length > 0) {
          html += `
            <div>
              <label>📏 ${t('selectSize')}</label>
              <select id="orderSize">
                ${product.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
            </div>`;
        }

        variationContainer.innerHTML = html;
      }

      getEl('buyModal')?.classList.remove('hidden');

      try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData.address) setElValue('orderAddress', userData.address);
          if (userData.phone) setElValue('orderPhone', userData.phone);
        } else {
          setElValue('orderAddress', '');
          setElValue('orderPhone', '');
        }
        renderReviews(product.id);
        setupFormValidation();
      } catch (e) {
        setElValue('orderAddress', '');
        setElValue('orderPhone', '');
      }
    });
  });
}

// Event Listeners Panier


document.getElementById('closeCartModal')?.addEventListener('click', () => {
  document.getElementById('cartModal').classList.add('hidden');
});
document.getElementById('cartModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('cartModal')) document.getElementById('cartModal').classList.add('hidden');
});

document.getElementById('checkoutBtn')?.addEventListener('click', async () => {
  if (!currentUser) {
    document.getElementById('cartModal').classList.add('hidden');
    showMessage(t('loginRequired'), 'error');
    document.getElementById('authBtn')?.click();
    return;
  }
  if (cart.length === 0) return;

  // Vérifier profil
  let userDoc;
  try {
    userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists || !userDoc.data().address || userDoc.data().address.length < 5 || !userDoc.data().phone) {
      document.getElementById('cartModal').classList.add('hidden');
      showMessage(t('invalidAddress') + " / " + t('fillAllFields'), 'error');
      currentView = 'profile'; renderView('profile');
      return;
    }
  } catch (e) { return; }

  const userData = userDoc.data();
  const orderItems = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity || 1
  }));
  const totalPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderCode = generateOrderCode();

  try {
    const orderRef = await db.collection('orders').add({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: userData.displayName || currentUser.displayName || 'Client',
      address: userData.address,
      phone: userData.phone,
      items: orderItems,
      productName: cart.length > 1 ? `${cart[0].name} + ${cart.length - 1}` : cart[0].name,
      price: totalPrice,
      totalPrice,
      currency: currentCurrency,
      status: 'pending',
      paymentMethod: 'Cash',
      paymentStatus: 'cash_due',
      orderCode,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Fraud Detection Integration
    try {
      const fraudCheck = await detectFraudulentOrder({
        id: orderRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userData.displayName || currentUser.displayName || 'Client',
        productName: cart.length > 1 ? `${cart[0].name} + ...` : cart[0].name,
        price: totalPrice,
        address: userData.address,
        phone: userData.phone
      });

      if (fraudCheck.isFraudulent && fraudCheck.riskScore > 0.7) {
        await orderRef.update({
          flaggedForReview: true,
          fraudScore: fraudCheck.riskScore
        });
      }
    } catch (fraudErr) { console.error("Fraud check failed:", fraudErr); }

    await db.collection('notifications').add({
      title: `✅ Commande ${orderCode} reçue`,
      reason: 'order_confirmation',
      message: `Bonjour ${currentUser.displayName || currentUser.email}, votre commande ${orderCode} a bien été enregistrée. Nous vous contacterons pour la livraison.`,
      type: 'info',
      targetUserId: currentUser.uid,
      targetRole: null,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      metadata: {
        orderId: orderRef.id,
        totalPrice,
        orderCode
      }
    });

    await db.collection('communications').add({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      phone: userData.phone,
      orderId: orderRef.id,
      orderCode,
      type: 'order_confirmation',
      channels: ['email', 'sms'],
      status: 'pending',
      payload: {
        subject: `Confirmation de votre commande ${orderCode}`,
        body: `Bonjour ${currentUser.displayName || currentUser.email}, votre commande ${orderCode} pour ${cart.length > 1 ? `${cart[0].name} et ${cart.length - 1} autres articles` : cart[0].name} a été enregistrée avec succès. Total: ${formatPrice(totalPrice)}.`
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    cart = [];
    saveCart();
    document.getElementById('cartModal').classList.add('hidden');
    showMessage(t('orderSuccess'), 'success');
    renderView('profile');
  } catch (error) { showMessage(t('errorOccurred') + error.message, 'error'); }
});

// Reviews Logic
let currentRating = 0;
document.querySelectorAll('#starRating span').forEach(star => {
  star.addEventListener('click', (e) => {
    currentRating = parseInt(e.target.dataset.rating);
    document.querySelectorAll('#starRating span').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.rating) <= currentRating);
    });
  });
});

document.getElementById('submitReviewBtn')?.addEventListener('click', async () => {
  if (!currentUser) { showMessage(t('loginRequired'), 'error'); return; }
  
  // Vérifier si l'utilisateur a déjà acheté ce produit et s'il est livré
  const ordersSnap = await db.collection('orders').where('userId', '==', currentUser.uid).get();
  const hasPurchased = ordersSnap.docs.some(doc => {
    const data = doc.data();
    const purchasedViaItems = Array.isArray(data.items) && data.items.some(i => i.id === selectedProductId);
    const purchasedViaProductId = data.productId === selectedProductId;
    return (purchasedViaItems || purchasedViaProductId) && data.status === 'delivered';
  });

  if (!hasPurchased) { showMessage(t('mustPurchaseToReview'), 'error'); return; }

  if (currentRating === 0) { showMessage(t('ratingError'), 'error'); return; }
  const comment = getEl('reviewComment')?.value.trim() || '';
  if (!comment) { showMessage(t('commentError'), 'error'); return; }

  try {
    await db.collection('reviews').add({
      productId: selectedProductId,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Kliyan',
      rating: currentRating,
      comment,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Notifier l'admin
    await db.collection('notifications').add({
      title: 'Nouvel avis',
      message: `${currentUser.displayName || 'Client'} a laissé un avis de ${currentRating} étoiles.`,
      type: 'review',
      targetRole: 'admin',
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showMessage(t('reviewSuccess'));
    setElValue('reviewComment', '');
    currentRating = 0;
    document.querySelectorAll('#starRating span').forEach(s => s.classList.remove('active'));
    renderReviews(selectedProductId);
  } catch (e) { showMessage(t('reviewError'), 'error'); }
});

async function renderReviews(productId) {
  const list = document.getElementById('productReviewsList');
  if (!list) return;

  try {
    const snap = await db.collection('reviews').where('productId', '==', productId).orderBy('createdAt', 'desc').get();
    if (snap.empty) {
      list.innerHTML = `<p style="opacity:0.6; font-size:0.9rem;">${t('noReviews')}</p>`;
      return;
    }

    list.innerHTML = snap.docs.map(doc => {
      const r = doc.data();
      const date = r.createdAt ? r.createdAt.toDate().toLocaleDateString() : '---';
      return `
        <div class="review-item">
          <div class="review-header">
            <span class="review-author">👤 ${r.userName || 'Kliyan'}</span>
            <span class="review-date">${date}</span>
          </div>
          <div class="review-stars">${'⭐'.repeat(r.rating)}</div>
          <p style="margin-top:10px; font-size:0.9rem; color:var(--text-main);">${r.comment}</p>
        </div>
      `;
    }).join('');
  } catch (e) { console.error(e); }
}

function renderServices(app) {
  app.innerHTML = `
    <div class="card-premium" style="animation: viewFadeIn 0.4s ease;">
      <h2>🛠️ ${t('servicesTitle')}</h2>
      <div style="padding: 1rem 0; line-height: 1.8;">
        <p>${t('servicesIntro')}</p>
        <ul style="margin-left: 1.5rem; margin-top: 1rem;">
          <li style="margin-bottom: 0.5rem;"><strong>${t('servicesOnline')}</strong> ${t('servicesOnlineDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('servicesDelivery')}</strong> ${t('servicesDeliveryDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('servicesCustomer')}</strong> ${t('servicesCustomerDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('servicesSecure')}</strong> ${t('servicesSecureDesc')}</li>
        </ul>
      </div>
    </div>
  `;
}

function renderPrivacy(app) {
  app.innerHTML = `
    <div class="card-premium" style="animation: viewFadeIn 0.4s ease;">
      <h2>🔒 ${t('privacyTitle')}</h2>
      <div style="padding: 1rem 0; line-height: 1.8;">
        <p>${t('privacyIntro')}</p>
        <ul style="margin-left: 1.5rem; margin-top: 1rem;">
          <li style="margin-bottom: 0.5rem;"><strong>${t('privacyData')}</strong> ${t('privacyDataDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('privacySecurity')}</strong> ${t('privacySecurityDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('privacySharing')}</strong> ${t('privacySharingDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('privacyRights')}</strong> ${t('privacyRightsDesc')}</li>
        </ul>
      </div>
    </div>
  `;
}

function renderTerms(app) {
  app.innerHTML = `
    <div class="card-premium" style="animation: viewFadeIn 0.4s ease;">
      <h2>📜 ${t('termsTitle')}</h2>
      <div style="padding: 1rem 0; line-height: 1.8;">
        <p>${t('termsIntro')}</p>
        <ul style="margin-left: 1.5rem; margin-top: 1rem;">
          <li style="margin-bottom: 0.5rem;"><strong>${t('termsAccount')}</strong> ${t('termsAccountDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('termsPurchase')}</strong> ${t('termsPurchaseDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('termsPrice')}</strong> ${t('termsPriceDesc')}</li>
          <li style="margin-bottom: 0.5rem;"><strong>${t('termsMod')}</strong> ${t('termsModDesc')}</li>
        </ul>
      </div>
    </div>
  `;
}

// ============================================
// MODULE IA - TOTAL LAKAY INTELLIGENT (SÉCURISÉ)
// ============================================

// Configuration par défaut (sera écrasée par Remote Config)
let AIConfig = {
  provider: 'gemini',
  apiKey: '', // 🔒 Chargé depuis Firebase Remote Config
  model: 'gemini-2.5-flash',
  maxTokens: 500,
  temperature: 0.7,
  enabled: true
};

// Initialisation sécurisée depuis Firebase Remote Config
async function initAIConfig() {
  try {
    if (firebase.remoteConfig) {
      try {
        const remoteConfig = firebase.remoteConfig();
        remoteConfig.settings = { minimumFetchIntervalMillis: 3600000 };
        remoteConfig.defaultConfig = {
          ai_api_key: '',
          ai_model: AIConfig.model,
          ai_enabled: String(AIConfig.enabled),
          ai_max_tokens: String(AIConfig.maxTokens),
          ai_temperature: String(AIConfig.temperature)
        };

        await remoteConfig.fetchAndActivate();
        AIConfig.apiKey = remoteConfig.getString('ai_api_key') || AIConfig.apiKey;
        AIConfig.model = remoteConfig.getString('ai_model') || AIConfig.model;
        AIConfig.enabled = remoteConfig.getString('ai_enabled') !== 'false';
        AIConfig.maxTokens = parseInt(remoteConfig.getString('ai_max_tokens'), 10) || AIConfig.maxTokens;
        AIConfig.temperature = parseFloat(remoteConfig.getString('ai_temperature')) || AIConfig.temperature;
        console.log('✅ Configuration IA Remote Config chargée');
      } catch (remoteError) {
        console.warn('⚠️ Échec de chargement Remote Config IA :', remoteError);
      }
    }

    const doc = await db.collection('settings').doc('ai_config').get();
    if (doc.exists) {
      const data = doc.data();
      AIConfig.apiKey = data.apiKey || AIConfig.apiKey;
      AIConfig.model = data.model || AIConfig.model;
      AIConfig.maxTokens = data.maxTokens || AIConfig.maxTokens;
      AIConfig.enabled = data.enabled !== undefined ? data.enabled : AIConfig.enabled;
      AIConfig.temperature = data.temperature || AIConfig.temperature;
      console.log('✅ Configuration IA Firestore chargée');
    } else if (!AIConfig.apiKey) {
      console.warn('⚠️ ai_config non trouvé dans Firestore et aucune clé IA définie. LIA restera désactivée.');
    }
  } catch (e) {
    console.error('❌ Erreur chargement config IA :', e);
  }
}

// ============================================
// 1. RECOMMANDATIONS PERSONNALISÉES
// ============================================
async function getAIRecommendations() {
  if (!currentUser) return products.slice(0, 4); // Fallback

  const userHistory = orders.map(o => o.productName).join(', ');
  const userFavorites = favorites.map(id => {
    const p = products.find(pr => pr.id === id);
    return p ? p.name : '';
  }).filter(Boolean).join(', ');

  const activeProducts = products.slice(0, AI_PROMPT_PRODUCT_LIMIT);
  const inventorySummary = activeProducts.length
    ? activeProducts.map(p => `${p.id}:${p.name} (${p.category || 'Autre'}, ${p.price} G)`).join(' | ')
    : 'Aucun produit disponible';

  const prompt = `
En tant qu'expert e-commerce pour Total Lakay en Haïti, analyse :
- Historique d'achats : ${userHistory || 'Aucun'}
- Favoris : ${userFavorites || 'Aucun'}
- Produits disponibles : ${inventorySummary}

Recommande 4 produits que ce client devrait acheter. Réponds UNIQUEMENT en JSON : 
{"recommendations": ["id_produit_1", "id_produit_2", "id_produit_3", "id_produit_4"]}
`;

  try {
    const response = await callAI(prompt);
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanedResponse);
    return parsed.recommendations.map(id => products.find(p => p.id === id)).filter(Boolean);
  } catch (e) {
    console.error('Erreur IA recommandations:', e);
    return products.slice(0, 4); // Fallback
  }
}

const ADMIN_GUIDE = `
GUIDE D'ADMINISTRATION SUPRÊME :
- Gestion de l'Inventaire : Chaque ajout de produit doit être précis. Utilisez les catégories pour le référencement IA. Surveillez les stocks pour éviter les ruptures.
- Logistique & Suivi : Le changement de statut vers "Nan wout" déclenche le tracking GPS. Soyez rigoureux sur les délais de livraison annoncés.
- Finance & MonCash : Les revenus sont calculés en HTG. Vérifiez toujours l'ID de transaction avant de valider manuellement une commande Cash.
- Sécurité : Ne partagez jamais vos accès admin. Utilisez l'outil de diagnostic IA uniquement en cas de bug technique avéré.
- Notifications : Utilisez les mentions @all, @clients ou @admins de manière stratégique pour ne pas spammer les utilisateurs.
`;

const CLIENT_GUIDE = `
GUIDE DE L'EXPÉRIENCE CLIENT :
- Sécurité & Achat : La validation de l'email est le premier pas vers la confiance. Sans elle, aucune commande n'est possible.
- Processus de Commande : Choisissez méticuleusement vos variations (taille, couleur). Remplissez votre adresse avec précision pour le livreur.
- Paiement : Privilégiez MonCash pour une validation instantanée. Le paiement Cash est une alternative pour la livraison.
- PWA & Performance : Installez l'application pour profiter du mode hors-ligne et des notifications push en temps réel.
- Interaction Sociale : Vos avis et vos ❤️ favoris aident la communauté et permettent à l'IA de mieux vous connaître.
`;

// ---------- BASE DE CONNAISSANCES IA ----------
const PLATFORM_KNOWLEDGE = `
NOM : Total Lakay (Tout bagay lakay ou nan yon sèl klike).
MISSION : Boutique e-commerce #1 en Haïti. Propose Électronique, Mode, Maison, École.
SERVICES :
- PWA : Site installable, accès hors-ligne, notifications push.
- IA : Assistant intelligent, recommandations, détection de fraude.
- LIVRAISON : Partout en Haïti avec suivi en temps réel.
- PAIEMENT : MonCash (API officielle) et Cash (Lajan Kach).
`;

// ============================================
// 2. CHATBOT ASSISTANT CLIENT
// ============================================
async function askAIAssistant(question) {
  if (!currentUser) throw new Error(t('loginRequired'));

  const today = new Date().toISOString().split('T')[0];
  const userRef = db.collection('users').doc(currentUser.uid);
  const userDoc = await userRef.get();
  const data = userDoc.exists ? userDoc.data() : {};

  if (!isPremium) {
    let count = data.aiRequestCount || 0;
    const lastDate = data.lastAiRequestDate || '';

    if (lastDate !== today) {
      count = 0; // Nouvelle journée, reset
    }

    if (count >= FREE_AI_LIMIT) {
      throw new Error(t('aiLimitReached') + ' ' + t('upgradeToPremium'));
    }

    if (count >= 10) {
      const remaining = FREE_AI_LIMIT - count;
      setTimeout(() => {
        showMessage(`⚠️ Attention : Il ne vous reste que ${remaining} demandes gratuites pour aujourd'hui.`, 'info');
      }, 1000);
    }
  }

  const roleGuide = isAdmin ? ADMIN_GUIDE : CLIENT_GUIDE;
  const roleName = isAdmin ? 'Administrateur' : (isPremium ? 'Client Premium ✨' : 'Client');
  const preferredModel = isPremium ? (AIConfig.model || 'gemini-flash-latest') : 'gemini-1.5-flash-8b';

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const inventoryProducts = products.slice(0, AI_PROMPT_PRODUCT_LIMIT);
  const inventoryLines = inventoryProducts.length
    ? inventoryProducts.map(p => `- ${p.name} : ${p.stock > 0 ? `En stock (${p.stock} unités)` : 'RUPTURE DE STOCK'}`).join('\n')
    : 'Aucun produit disponible pour le moment.';

  const historyContext = aiHistory.map(h => `${h.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${h.text}`).join('\n');

  const context = `
Ton nom est LakayGPT, l'expert humain virtuel de Total Lakay. 
STATUT UTILISATEUR : ${roleName}. 
${isPremium ? "C'est un utilisateur PREMIUM. Donne des réponses TRÈS DÉTAILLÉES, exhaustives et de haute qualité." : "Utilisateur Gratuit. Sois concis mais utile."}

📅 DATE : ${dateStr}, ${timeStr}.
🚀 GÉNÈSE : L'entreprise Total Lakay a été créée en 2026.

📧 SUPPORT : totallakayst@gmail.com.

INVENTAIRE RÉEL DU SITE (EN DIRECT) :
${inventoryLines}

CONNAISSANCES GÉNÉRALES :
${PLATFORM_KNOWLEDGE}

GUIDE DU RÔLE (${roleName}) :
${roleGuide}

MÉMOIRE DE LA CONVERSATION :
${historyContext}

DIRECTIVES DE RAISONNEMENT :
1. PSYCHOLOGIE : Identifie l'intention.
2. NUANCE : Transitions naturelles.
3. EMPATHIE : Réagis aux émotions.
4. RAISONNEMENT : Explique le "pourquoi".
5. PROACTIVITÉ : Propose des solutions.
6. LANGUE : Kreyòl vibrant ou Français élégant.
`;

  const fullPrompt = `${context}\n\nUtilisateur (${roleName}): ${question}\nLakayGPT:`;
  const answer = await callAI(fullPrompt, preferredModel);

  if (!isPremium) {
    const currentCount = data.aiRequestCount || 0;
    await userRef.set({
      aiRequestCount: currentCount + 1,
      lastAiRequestDate: today
    }, { merge: true });
  }

  aiHistory.push({ role: 'user', text: question });
  aiHistory.push({ role: 'bot', text: answer });
  if (aiHistory.length > 10) aiHistory = aiHistory.slice(-10);

  return answer;
}

// ============================================
// 3. GÉNÉRATION DE DESCRIPTIONS PRODUITS
// ============================================
async function generateProductDescription(productName, category, features) {
  const prompt = `
En tant que copywriter e-commerce expert, crée une description de produit pour Total Lakay.
Produit : ${productName}
Catégorie : ${category}
Caractéristiques : ${features}

Génère dans ces 4 langues :
- Créole haïtien (ht)
- Français (fr)
- Anglais (en)
- Espagnol (es)

Format JSON UNIQUEMENT :
{
  "ht": "description en créole",
  "fr": "description en français", 
  "en": "description en anglais",
  "es": "description en espagnol"
}
`;

  try {
    const response = await callAI(prompt);
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (e) {
    return null;
  }
}

// ============================================
// 4. ANALYSE DE SENTIMENT DES AVIS
// ============================================
async function analyzeReviewSentiment(review) {
  const prompt = `
Analyse cet avis client pour Total Lakay :
"${review}"

Retourne UNIQUEMENT un JSON :
{
  "sentiment": "positif" | "neutre" | "négatif",
  "score": 0.0 à 1.0,
  "tags": ["mot-clé1", "mot-clé2"],
  "summary": "résumé en une phrase"
}
`;

  try {
    const response = await callAI(prompt);
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedResponse);
  } catch (e) {
    return { sentiment: 'neutre', score: 0.5, tags: [], summary: review };
  }
}

// ============================================
// 5. DÉTECTION DE FRAUDE
// ============================================
async function detectFraudulentOrder(order) {
  const prompt = `
Analyse cette commande suspecte sur Total Lakay :
- Client : ${order.userName || order.userEmail}
- Produit : ${order.productName}
- Prix : ${order.price} G
- Adresse : ${order.address}
- Téléphone : ${order.phone}
- Quantité : ${order.quantity || 1}

Historique du client : ${orders.filter(o => o.userId === order.userId).length} commandes

Est-ce une commande frauduleuse ? Réponds UNIQUEMENT en JSON :
{
  "isFraudulent": true/false,
  "riskScore": 0.0 à 1.0,
  "reason": "explication courte"
}
`;

  try {
    const response = await callAI(prompt);
    const cleanedResponse = response.replace(/```json|```/g, '').trim();
    const { isFraudulent, riskScore } = JSON.parse(cleanedResponse);

    if (isFraudulent && riskScore > 0.8) {
      await db.collection('notifications').add({
        title: '🚨 Commande Suspecte',
        message: `Commande #${order.id?.substring(0, 6)} risque ${Math.round(riskScore * 100)}%`,
        type: 'fraud',
        targetRole: 'admin',
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    return { isFraudulent, riskScore };
  } catch (e) {
    return { isFraudulent: false, riskScore: 0 };
  }
}

// ============================================
// 6. MOTEUR D'APPEL IA (SÉCURISÉ)
// ============================================
async function callAI(prompt, preferredModel = null) {
  if (!AIConfig.enabled) throw new Error('IA désactivée temporairement');
  if (!AIConfig.apiKey) {
    await initAIConfig();
    if (!AIConfig.apiKey) throw new Error('Configuration IA manquante');
  }

  // Liste des modèles de secours
  const fallbackModels = [
    preferredModel || AIConfig.model, // Essayer d'abord le modèle préféré (Premium vs Gratuit)
    'gemini-flash-latest', 
    'gemini-1.5-flash', 
    'gemini-1.5-flash-8b', 
    'gemini-2.0-flash',
    'gemini-pro'
  ];

  // Nettoyage de la liste (enlever les doublons et les undefined)
  const uniqueModels = [...new Set(fallbackModels.filter(m => m))];

  for (const model of uniqueModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AIConfig.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: AIConfig.maxTokens,
              temperature: AIConfig.temperature
            }
          })
        }
      );

      if (response.status === 503 || response.status === 429) {
        console.warn(`⚠️ Modèle ${model} saturé, essai du modèle suivant...`);
        continue; // Passer au modèle suivant
      }

      if (!response.ok) {
        const errData = await response.json();
        // Si quota dépassé, désactiver temporairement
        if (response.status === 429) {
          AIConfig.enabled = false;
          setTimeout(() => { AIConfig.enabled = true; }, 60000); // Réactiver après 1 min
          throw new Error('Service IA momentanément indisponible. Réessayez dans une minute.');
        }
        
        throw new Error(errData.error?.message || 'Erreur API Gemini');
      }

      const data = await response.json();
      
      // Gestion des filtres de sécurité ou réponses vides
      if (data.promptFeedback?.blockReason) {
        throw new Error('Message bloqué par les filtres de sécurité Google.');
      }

      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          throw new Error('Réponse bloquée pour raisons de sécurité.');
        }
        console.error('Réponse Gemini inattendue:', data);
        throw new Error('Réponse IA invalide ou vide');
      }
      return data.candidates[0].content.parts[0].text;
      
    } catch (e) {
      // Si c'est le dernier modèle de la liste, on throw l'erreur
      if (model === uniqueModels[uniqueModels.length - 1]) {
        console.error('❌ Tous les modèles IA ont échoué:', e);
        if (!navigator.onLine) throw new Error('Pas de connexion internet');
        throw e;
      }
      // Sinon on continue vers le modèle suivant
      console.warn(`Retrying with next model after error on ${model}:`, e.message);
    }
  }
  throw new Error('Aucun modèle IA n\'a pu répondre.');
}

// ============================================
// 7. INTÉGRATION DANS L'INTERFACE
// ============================================

// Suppression du bouton dynamique car on utilise navAI dans le HTML
function addChatbotToNavbar() { return; }

function toggleChatbot() {
  if (!currentUser) {
    showMessage(t('loginRequired'), 'error');
    document.getElementById('authBtn')?.click();
    return;
  }

  let chatbot = document.getElementById('chatbotContainer');

  if (chatbot) {
    chatbot.classList.toggle('hidden');
    return;
  }

  chatbot = document.createElement('div');
  chatbot.id = 'chatbotContainer';
  chatbot.innerHTML = `
        <div class="chatbot-window">
            <div class="chatbot-header">
                <span>🤖 Assistant</span>
                <div style="display:flex; gap:10px;">
                    <button id="openAIPageFromPop" title="Plein écran" style="background:none; border:none; color:white; cursor:pointer; font-size:1rem;">🔲</button>
                    <button id="closeChatbot" style="background:none; border:none; color:white; cursor:pointer; font-size:1rem;">✕</button>
                </div>
            </div>
            <div class="chatbot-messages" id="chatbotMessages">
                <div class="message bot">
                    👋 Bonjour ! Je suis l'assistant IA de Total Lakay. Comment puis-je vous aider ?
                </div>
            </div>
            <div class="chatbot-input">
                <input type="text" id="chatbotInput" placeholder="Posez votre question...">
                <button id="sendChatbotMsg">📤</button>
            </div>
        </div>
    `;

  document.body.appendChild(chatbot);

  document.getElementById('closeChatbot').addEventListener('click', () => {
    chatbot.classList.add('hidden');
  });

  document.getElementById('openAIPageFromPop').addEventListener('click', () => {
    chatbot.classList.add('hidden');
    renderView('aiPage');
  });

  document.getElementById('sendChatbotMsg').addEventListener('click', sendChatbotMessage);
  document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatbotMessage();
  });
}

async function sendChatbotMessage() {
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');
  if (!input || !messages) return;

  const question = input.value.trim();
  if (!question) return;

  // Message utilisateur avec animation
  const userDiv = document.createElement('div');
  userDiv.className = 'message user';
  userDiv.style.animation = 'aiSlideUp 0.3s ease-out';
  userDiv.textContent = question;
  messages.appendChild(userDiv);
  input.value = '';

  // Indicateur de réflexion animé
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot typing';
  typingDiv.innerHTML = `<span class="dot-flashing"></span> ${t('aiTyping')}`;
  messages.appendChild(typingDiv);
  messages.scrollTop = messages.scrollHeight;

  try {
    const answer = await askAIAssistant(question);
    if (typingDiv) typingDiv.remove();

    const botDiv = document.createElement('div');
    botDiv.className = 'message bot';
    botDiv.style.animation = 'fadeIn 0.3s ease';
    botDiv.innerHTML = escapeHtml(answer).replace(/\n/g, '<br>');
    messages.appendChild(botDiv);
  } catch (e) {
    if (typingDiv) typingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot';
    errorDiv.textContent = t('aiError') + " (" + e.message + ")";
    messages.appendChild(errorDiv);
  }
  messages.scrollTop = messages.scrollHeight;
}

async function renderAIRecommendations() {
  const container = document.getElementById('aiRecommendations');
  if (!container) return;

  container.innerHTML = '<div class="spinner"></div>';

  const recommendations = await getAIRecommendations();

  container.innerHTML = `
        <h3>🤖 ${currentLang === 'ht' ? 'Rekòmandasyon Entèlijan' : 'Recommandations Intelligentes'}</h3>
        <div class="grid">
            ${recommendations.map(p => productCardHTML(p)).join('')}
        </div>
    `;

  attachBuyButtons();
}

// ============================================
// DÉMARRAGE
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Total Lakay - Version Ultime avec IA Sécurisée');

  loadTheme();
  initPageRole();
  
  setupHeaderActionButtons();
  initNavigation();

  // Charger la configuration IA AVANT tout
  try {
    await initAIConfig();
  } catch (error) {
    console.warn('initAIConfig failed:', error);
  }
  
  applyLanguage();

  // Navigation Links (Menu & Footer)
  const navActions = [
    { id: 'linkServices', view: 'services' },
    { id: 'linkPrivacy', view: 'privacy' },
    { id: 'linkTerms', view: 'terms' },
    { id: 'footerServices', view: 'services' },
    { id: 'footerPrivacy', view: 'privacy' },
    { id: 'footerTerms', view: 'terms' }
  ];

  navActions.forEach(action => {
    document.getElementById(action.id)?.addEventListener('click', (e) => {
      e.preventDefault(); renderView(action.view); window.scrollTo(0, 0);
    });
  });

  // menuLogistics handled by initNavigation()

  document.getElementById('footerContact')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://wa.me/50938824664', '_blank');
  });

  // Consent Modal Events
  document.getElementById('acceptConsent')?.addEventListener('click', async () => {
    if (!currentUser) {
      showMessage(t('loginRequired'), 'error');
      return;
    }

    try {
      await db.collection('users').doc(currentUser.uid).update({ termsAccepted: true });
      document.getElementById('consentModal')?.classList.add('hidden');
      showMessage(t('welcome'), 'success');
    } catch (e) {
      console.error('Consent update failed:', e);
      showMessage(t('errorOccurred'), 'error');
    }
  });

  document.getElementById('declineConsent')?.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Sign out failed:', e);
    }
    document.getElementById('consentModal')?.classList.add('hidden');
    showMessage(t('loggedOut'), 'error');
  });

  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('cartDrawer');
      if (drawer?.classList.contains('open')) toggleCartDrawer();
      const chatbot = document.getElementById('chatbotContainer');
      if (chatbot && !chatbot.classList.contains('hidden')) chatbot.classList.add('hidden');
      document.getElementById('dropdownMenu')?.classList.add('hidden');
    }
  });

  renderView('home');

  // Initialisation IA
  addChatbotToNavbar();
  if (AIConfig.enabled && AIConfig.apiKey) {
    if (currentView === 'home') {
      setTimeout(renderAIRecommendations, 2000);
    }
  } else {
    console.warn('⚠️ IA désactivée ou non configurée');
  }
});

// ---------- HELPERS FOR PERFECTION ----------

function renderSkeletons(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      </div>
    `;
  }
  return html;
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(saved);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle('theme-dark', theme === 'dark');
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    toggle.title = theme === 'dark' ? 'Mode sombre' : 'Mode clair';
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

function lockBodyScroll(enabled) {
  document.body.style.overflow = enabled ? 'hidden' : '';
}

function getCategoryEmoji(cat) {
  const emojis = { clothing: '👕', electronics: '📱', school: '🎓', home: '🏠', beauty: '💄', other: '📦' };
  return emojis[cat] || '📦';
}

function filterByCategory(cat) {
  renderView('shop').then(() => {
    const filter = document.getElementById('categoryFilter') || document.getElementById('shopCategoryFilter');
    if (filter) {
      filter.value = cat;
      refreshProductGrid();
    }
  });
}

function renderAdminCharts() {
  const chart = document.getElementById('adminSalesChart');
  if (!chart) return;

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toLocaleDateString('fr-FR', { weekday: 'short' }));
  }

  // Calculer les ventes réelles par jour à partir des commandes livrées
  const salesData = last7Days.map((day, idx) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - (6 - idx));
    const dateKey = targetDate.toISOString().slice(0, 10);

    const value = orders
      .filter(o => o.status === 'delivered')
      .filter(o => {
        const deliveredDate = o.createdAt?.toDate?.();
        return deliveredDate && deliveredDate.toISOString().slice(0, 10) === dateKey;
      })
      .reduce((sum, o) => sum + ((o.totalPrice != null ? o.totalPrice : o.price) || 0), 0);

    return { day, value };
  });

  const max = Math.max(...salesData.map(d => d.value), 1);
  chart.innerHTML = salesData.map(d => `
    <div class="chart-bar" style="height:${(d.value / max) * 100}%;" data-label="${d.day}"></div>
  `).join('');
}

function getCartDrawerElements() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) {
    console.warn('toggleCartDrawer: cart drawer element not found');
    return null;
  }

  return {
    drawer,
    overlay: document.getElementById('drawerOverlay')
  };
}

function toggleCartDrawer() {
  const elements = getCartDrawerElements();
  if (!elements) return;

  const { drawer, overlay } = elements;
  const isOpen = drawer.classList.contains('open');

  if (isOpen) {
    drawer.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
    lockBodyScroll(false);
  } else {
    renderCartDrawer();
    drawer.classList.add('open');
    if (overlay) overlay.style.display = 'block';
    lockBodyScroll(true);
  }
}

function toggleDrawer() {
  toggleCartDrawer();
}

window.toggleCartDrawer = toggleCartDrawer;
window.toggleDrawer = toggleDrawer;

function renderCartDrawer() {
  const content = document.getElementById('drawerContent');
  const footer = document.getElementById('drawerFooter');
  if (!content) return;

  if (cart.length === 0) {
    content.innerHTML = `<div style="text-align:center; padding:40px; opacity:0.5;">
      <div style="font-size:3rem; margin-bottom:20px;">🛒</div>
      <p data-i18n="emptyCart">${t('emptyCart')}</p>
    </div>`;
    footer?.classList.add('hidden');
    return;
  }

  footer?.classList.remove('hidden');
  let total = 0;
  content.innerHTML = cart.map((item, index) => {
    const p = products.find(x => x.id === item.id);
    const quantity = item.quantity || 1;
    total += (item.price || 0) * quantity;
    return `
      <div style="display:flex; gap:15px; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #eee;">
        <img src="${(p?.image || item.image || 'logo.jpeg')}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;">
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.9rem;">${item.name || gt(p?.name)}</div>
          <div style="color:var(--gold); font-weight:700; margin:5px 0;">${formatPrice(item.price)}</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button onclick="updateCartQty(${index}, -1)" style="border:1px solid #ddd; background:none; width:24px; height:24px; border-radius:4px; cursor:pointer;">-</button>
            <span>${quantity}</span>
            <button onclick="updateCartQty(${index}, 1)" style="border:1px solid #ddd; background:none; width:24px; height:24px; border-radius:4px; cursor:pointer;">+</button>
          </div>
        </div>
        <button onclick="removeFromCart(${index}); renderCartDrawer();" style="background:none; border:none; color:var(--danger); cursor:pointer;">✕</button>
      </div>
    `;
  }).join('');
  
  const totalEl = document.getElementById('drawerTotal');
  if (totalEl) totalEl.textContent = formatPrice(total);
}

function updateCartQty(index, delta) {
  if (cart[index]) {
    cart[index].quantity = Math.max(1, (cart[index].quantity || 1) + delta);
    if (cart[index].quantity < 1) cart.splice(index, 1);
    saveCart();
    renderCartDrawer();
    updateCartBadge();
  }
}

function openQuickView(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const modal = document.getElementById('quickViewModal');
  document.getElementById('qvImage').src = p.image || 'logo.jpeg';
  document.getElementById('qvTitle').textContent = gt(p.name);
  document.getElementById('qvCategory').textContent = t('category' + (p.category || 'Shop').charAt(0).toUpperCase() + (p.category || 'Shop').slice(1));
  document.getElementById('qvPrice').textContent = formatPrice(p.price);
  document.getElementById('qvOldPrice').textContent = p.oldPrice ? formatPrice(p.oldPrice) : '';
  document.getElementById('qvDescription').textContent = gt(p.description) || '';
  
  const stockBadge = document.getElementById('qvStockBadge');
  if (p.stock < 5) {
    stockBadge.innerHTML = `<span class="stock-warning">⚠️ Plus que ${p.stock} en stock !</span>`;
  } else {
    stockBadge.innerHTML = `<span style="color:var(--success); font-size:0.8rem;">✅ En stock (${p.stock})</span>`;
  }

  const addBtn = document.getElementById('qvAddToCartBtn');
  addBtn.onclick = () => {
    addToCart(p.id);
    closeQuickView();
    toggleCartDrawer();
  };

  modal.classList.remove('hidden');
}

function closeQuickView() {
  document.getElementById('quickViewModal')?.classList.add('hidden');
}

function setupFormValidation() {
  const addressField = document.getElementById('orderAddress');
  const phoneField = document.getElementById('orderPhone');
  
  if (addressField) {
    addressField.addEventListener('input', (e) => {
      const parent = e.target.closest('.field-container') || e.target.parentElement;
      if (e.target.value.length >= 10) {
        parent.classList.add('valid');
        parent.classList.remove('invalid');
      } else {
        parent.classList.add('invalid');
        parent.classList.remove('valid');
      }
    });
  }
  
  if (phoneField) {
    phoneField.addEventListener('input', (e) => {
      const parent = e.target.closest('.field-container') || e.target.parentElement;
      if (e.target.value.length >= 8) {
        parent.classList.add('valid');
        parent.classList.remove('invalid');
      } else {
        parent.classList.add('invalid');
        parent.classList.remove('valid');
      }
    });
  }
}

async function renderCheckout(app) {
  if (!currentUser) {
    showMessage(t('loginRequired'), 'error');
    document.getElementById('authBtn')?.click();
    return;
  }

  if (cart.length === 0) {
    renderView('home');
    return;
  }

  const orderItems = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity || 1
  }));
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  app.innerHTML = `
    <div class="container" style="max-width:800px; padding:60px 20px;">
      <h2 style="margin-bottom:30px; text-align:center;">💳 ${t('checkout')}</h2>
      
      <div class="grid" style="grid-template-columns: 1.5fr 1fr; gap:40px;">
        <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); border:1px solid var(--gray-200);">
          <h3 style="margin-bottom:20px;">📦 ${t('orderInfo')}</h3>
          
          <label>📍 <span data-i18n="addressRecommend">Adrès ou</span></label>
          <div class="field-container">
            <input type="text" id="checkoutAddress" placeholder="Rue, Ville, Code postal" style="width:100%;" class="search-input">
            <span class="validation-icon success">✅</span>
            <span class="validation-icon error">❌</span>
          </div>

          <label style="margin-top:20px; display:block;">📞 <span data-i18n="phoneRecommend">Telefòn ou</span></label>
          <div class="field-container">
            <input type="text" id="checkoutPhone" placeholder="Ex: +509 1234 5678" style="width:100%;" class="search-input">
            <span class="validation-icon success">✅</span>
            <span class="validation-icon error">❌</span>
          </div>

          <label style="margin-top:20px; display:block;">💳 <span data-i18n="payment">Mwayen peman</span></label>
          <select id="checkoutPayment" class="filter-select" style="width:100%;">
            <option value="MonCash">MonCash</option>
            <option value="Cash">Cash à la livraison</option>
          </select>
          <p style="margin:0.75rem 0 0; font-size:0.95rem; color:var(--text-soft);">
            Choisissez MonCash pour un paiement en ligne sécurisé. Si vous préférez, sélectionnez Cash pour régler à la livraison.
          </p>

          ${localStorage.getItem('allowLocation') === 'true' ? `
          <div style="margin-top:20px;">
            <label>🗺️ Localisation GPS</label>
            <div id="checkoutMap" class="map-container"></div>
            <p style="font-size:0.8rem; color:var(--text-soft); margin-top:5px;">${t('locationDesc')}</p>
          </div>` : ''}

          <button id="finalizeOrderBtn" class="btn btn-gold" style="width:100%; padding:15px; margin-top:30px; font-size:1.1rem;">✅ ${t('confirmOrder') || 'Konfime Kòmand'}</button>
        </div>

        <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); border:1px solid var(--gray-200); height:fit-content;">
          <h3 style="margin-bottom:20px;">🛒 ${t('orderSummary') || 'Rezime'}</h3>
          <div style="max-height:300px; overflow-y:auto; margin-bottom:20px;">
            ${cart.map(item => {
              const p = products.find(x => x.id === item.id);
              const quantity = item.quantity || 1;
              const itemName = item.name || gt(p?.name);
              return `<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.9rem;">
                <span>${quantity}x ${itemName}</span>
                <strong>${formatPrice((item.price || (p?.price || 0)) * quantity)}</strong>
              </div>`;
            }).join('')}
          </div>
          <div style="border-top:2px solid var(--gray-100); padding-top:20px; display:flex; justify-content:space-between; font-weight:800; font-size:1.2rem;">
            <span>Total</span>
            <span style="color:var(--gold);">${formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Pre-fill user data
  if (currentUser) {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.address) setElValue('checkoutAddress', userData.address);
      if (userData.phone) setElValue('checkoutPhone', userData.phone);
    }
  }

  // Setup validation for these specific IDs
  const addr = getEl('checkoutAddress');
  const ph = getEl('checkoutPhone');
  [addr, ph].filter(Boolean).forEach(el => {
    el.addEventListener('input', (e) => {
      const parent = e.target.parentElement;
      const minLen = e.target.id === 'checkoutAddress' ? 10 : 8;
      if (e.target.value.length >= minLen) {
        parent.classList.add('valid');
        parent.classList.remove('invalid');
      } else {
        parent.classList.add('invalid');
        parent.classList.remove('valid');
      }
    });
  });

  document.getElementById('finalizeOrderBtn')?.addEventListener('click', async () => {
    const address = getEl('checkoutAddress')?.value.trim() || '';
    const phone = getEl('checkoutPhone')?.value.trim() || '';
    const payment = getEl('checkoutPayment')?.value || '';

    if (address.length < 10 || phone.length < 8) {
      showMessage(t('fillAllFields'), 'error');
      return;
    }

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const moncashPhone = userData?.moncashPhone || phone;

    if (payment === 'MonCash') {
      if (!moncashConfig.clientId || !moncashConfig.clientSecret) {
        showMessage('⚠️ La configuration MonCash est manquante. Configurez-la depuis l’administration.', 'error');
        return;
      }
      if (!moncashPhone) {
        showMessage('⚠️ Vous devez lier un numéro MonCash dans votre profil ou entrer votre numéro MonCash.', 'error');
        return;
      }
    }

    try {
      const orderCode = generateOrderCode();
      const orderData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userData.displayName || currentUser.displayName || 'Client',
        address,
        phone,
        items: orderItems,
        productName: cart.length > 1 ? `${cart[0].name} + ${cart.length - 1}` : cart[0].name,
        price: total,
        totalPrice: total,
        quantity: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        currency: currentCurrency,
        paymentMethod: payment,
        paymentStatus: payment === 'MonCash' ? 'pending_payment' : 'cash_due',
        status: payment === 'MonCash' ? 'awaiting_payment' : 'pending',
        orderCode,
        coords: orderCoords,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const orderRef = await db.collection('orders').add(orderData);

      if (payment === 'MonCash') {
        await createMoncashPaymentRequest({
          orderId: orderRef.id,
          userId: currentUser.uid,
          userEmail: currentUser.email,
          phone: moncashPhone,
          amount: total,
          currency: currentCurrency,
          mode: moncashConfig.mode
        });
      }

      await db.collection('notifications').add({
        title: `✅ Commande ${orderCode} reçue`,
        reason: 'order_confirmation',
        message: `Bonjour ${currentUser.displayName || currentUser.email}, votre commande ${orderCode} a bien été enregistrée. Total: ${formatPrice(total)}.`,
        type: 'info',
        targetUserId: currentUser.uid,
        targetRole: null,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        metadata: {
          orderId: orderRef.id,
          totalPrice: total,
          orderCode
        }
      });

      await db.collection('communications').add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        phone,
        orderId: orderRef.id,
        orderCode,
        type: 'order_confirmation',
        channels: ['email', 'sms'],
        status: 'pending',
        payload: {
          subject: `Confirmation de votre commande ${orderCode}`,
          body: `Bonjour ${currentUser.displayName || currentUser.email}, votre commande ${orderCode} a été enregistrée avec succès. Total: ${formatPrice(total)}.`
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      cart = [];
      saveCart();
      const successMessage = payment === 'MonCash'
        ? '✅ Commande enregistrée. Complétez votre paiement MonCash depuis votre application MonCash.'
        : t('orderSuccess');
      showMessage(successMessage, 'success');
      renderView('home');
    } catch (e) {
      showMessage('Erreur: ' + e.message, 'error');
    }
  });
}

function renderStepper(currentStatus) {
  const statuses = ['pending', 'validated', 'processing', 'in_transit', 'delivered', 'completed'];
  const currentIndex = statuses.indexOf(currentStatus);
  
  if (currentStatus === 'cancelled') return `<div style="color:var(--danger); font-weight:700; text-align:center; padding:10px; border:1px dashed var(--danger); border-radius:10px;">❌ ${t('cancelled')}</div>`;

  return `
    <ul class="stepper">
      ${statuses.map((s, i) => {
        let state = '';
        if (i < currentIndex) state = 'completed';
        else if (i === currentIndex) state = 'active';
        
        return `
          <li class="step ${state}">
            <div class="step-icon">${i < currentIndex ? '✓' : i + 1}</div>
            <span class="step-label">${t(s)}</span>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

let orderCoords = null;
function initOrderMap(containerId, initialCoords = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const defaultPos = initialCoords || DEFAULT_PORT_AU_PRINCE;
  
  // Clean existing map instance if any
  const existingMap = container._leaflet_id;
  if (existingMap) {
    container.innerHTML = "";
    container._leaflet_id = null;
  }

  const map = L.map(containerId).setView(defaultPos, 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  let marker = L.marker(defaultPos, { draggable: !initialCoords }).addTo(map);

  if (!initialCoords) {
    orderCoords = defaultPos;
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      orderCoords = [lat, lng];
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = [pos.coords.latitude, pos.coords.longitude];
          map.setView(p, 16);
          marker.setLatLng(p);
          orderCoords = p;
        },
        (err) => {
          console.warn("Geolocation Error: ", err);
        }
      );
    }
  }
}

let currentTrackingOrderId = null;
let activeTrackingInterval = null;

async function renderLogisticsDashboard(app) {
  if (pageRole !== 'admin') { renderView(getDefaultViewForRole(pageRole)); return; }

  const activeOrders = orders.filter(o => ['pending', 'validated', 'processing', 'in_transit'].includes(o.status));
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');

  app.innerHTML = `
    <div class="container" style="padding:40px 0;">
      <h2 style="margin-bottom:30px; display:flex; align-items:center; gap:10px;">
        <span style="background:var(--blue-deep); color:white; padding:10px; border-radius:10px;">🚚</span> 
        ${t('logisticsDashboard')}
      </h2>
      
      <div class="grid" style="grid-template-columns: 1fr 1fr; gap:30px; margin-bottom:40px;">
        <!-- Stats Chart -->
        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">📊 ${t('status')}</h3>
          <canvas id="logisticsPieChart" style="max-height:300px;"></canvas>
        </div>
        
        <!-- Live Fleet Map -->
        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">🗺️ ${t('liveFleet')}</h3>
          <div id="adminLiveMap" style="height:300px; border-radius:10px; border:1px solid #eee; overflow:hidden;"></div>
          <p style="margin-top:10px; font-size:0.8rem; color:var(--text-soft);">${t('in_transit')}</p>
        </div>
      </div>

      <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg);">
        <h3 style="margin-bottom:20px;">📋 ${t('activeOrders')}</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; min-width:600px;">
            <thead>
              <tr style="background:var(--gray-100); border-bottom:2px solid var(--gray-200); text-align:left;">
                <th style="padding:15px;">${t('orderCode')}</th>
                <th style="padding:15px;">${t('client')}</th>
                <th style="padding:15px;">${t('status')}</th>
                <th style="padding:15px;">${t('amount')}</th>
                <th style="padding:15px;">${t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              ${activeOrders.map(o => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:15px; font-weight:700; color:var(--blue-deep);">${o.orderCode || o.id.substring(0,6)}</td>
                  <td style="padding:15px;">${o.userEmail}</td>
                  <td style="padding:15px;">
                    <span style="padding:5px 10px; border-radius:20px; font-size:0.8rem; font-weight:600; 
                      background:${o.status==='in_transit' ? 'var(--gold)' : 'var(--blue-light)'};
                      color:${o.status==='in_transit' ? 'var(--blue-deep)' : 'var(--blue-deep)'};">
                      ${t(o.status)}
                    </span>
                  </td>
                  <td style="padding:15px;">${formatPrice(o.price)}</td>
                  <td style="padding:15px;">
                    <button class="btn btn-sm btn-outline admin-view-track" data-id="${o.id}">${t('trackOrder')}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${activeOrders.length === 0 ? `<p style="padding:20px; text-align:center; color:var(--text-soft);">${t('noOrdersAdmin')}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  // Init Pie Chart
  setTimeout(() => {
    const ctx = document.getElementById('logisticsPieChart');
    if (ctx && window.Chart) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [t('pending'), t('processing'), t('in_transit'), t('delivered')],
          datasets: [{
            data: [
              orders.filter(o=>o.status==='pending').length,
              orders.filter(o=>o.status==='processing').length,
              orders.filter(o=>o.status==='in_transit').length,
              deliveredOrders.length
            ],
            backgroundColor: ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // Init Live Map
    const mapEl = document.getElementById('adminLiveMap');
    if (mapEl) {
      if (mapEl._leaflet_id) {
        mapEl.innerHTML = "";
        mapEl._leaflet_id = null;
      }
      const liveMap = L.map('adminLiveMap').setView([18.5392, -72.3350], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(liveMap);
      
      activeOrders.forEach(o => {
        if (o.coords) {
          const m = L.marker(o.coords).addTo(liveMap);
          m.bindPopup(`<b>${o.orderCode || o.id}</b><br>${o.userEmail}<br>${t(o.status)}`);
        }
      });
    }
    
    document.querySelectorAll('.admin-view-track').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentTrackingOrderId = e.target.dataset.id;
        renderView('tracking');
      });
    });
  }, 200);
}

async function renderVendorDashboard(app) {
  if (pageRole !== 'vendor') { renderView(getDefaultViewForRole(pageRole)); return; }
  await loadAllData();

  const deliveryOrders = orders.filter(o => ['validated', 'processing', 'in_transit'].includes(o.status));

  app.innerHTML = `
    <div class="container" style="padding:40px 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; gap:20px; flex-wrap:wrap;">
        <div>
          <h2 style="margin:0; font-size:2rem;">🚚 Livraisons en cours</h2>
          <p style="margin:10px 0 0; color:var(--text-soft);">Tableau de bord du livreur avec suivi des commandes et localisation.</p>
        </div>
        <div style="background:var(--gold-gradient); color:var(--blue-deep); padding:12px 20px; border-radius:30px; font-weight:800; box-shadow:var(--shadow-gold);">
          Livreurs
        </div>
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr; gap:30px; margin-bottom:40px;">
        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">📍 Carte des destinations</h3>
          <div id="vendorLiveMap" style="height:320px; border-radius:14px; border:1px solid var(--gray-200); overflow:hidden;"></div>
          <p style="margin-top:14px; color:var(--text-soft);">Voir les coordonnées exactes des livraisons confirmées.</p>
        </div>

        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">📋 Commandes à livrer</h3>
          ${deliveryOrders.length === 0 ? `<p style="color:var(--text-soft);">Aucune commande active pour le moment.</p>` : ''}
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:520px;">
              <thead>
                <tr style="background:var(--gray-100); text-align:left; border-bottom:2px solid var(--gray-200);">
                  <th style="padding:14px;">Code</th>
                  <th style="padding:14px;">Client</th>
                  <th style="padding:14px;">Statut</th>
                  <th style="padding:14px;">Adresse</th>
                  <th style="padding:14px;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${deliveryOrders.map(o => `
                  <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:14px; font-weight:700;">${o.orderCode || o.id.substring(0,6)}</td>
                    <td style="padding:14px;">${o.userEmail}</td>
                    <td style="padding:14px;">${o.status}</td>
                    <td style="padding:14px;">${o.address}</td>
                    <td style="padding:14px; display:flex; gap:8px; flex-wrap:wrap;">
                      <button class="btn btn-sm btn-outline vendor-track-btn" data-id="${o.id}">Suivre</button>
                      <button class="btn btn-sm btn-outline btn-success vendor-status-btn" data-id="${o.id}" data-status="in_transit">En route</button>
                      <button class="btn btn-sm btn-outline btn-success vendor-status-btn" data-id="${o.id}" data-status="delivered">Livré</button>
                      <a class="btn btn-sm btn-outline" href="tel:${o.phone}" style="text-decoration:none;">Appeler</a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    const mapEl = document.getElementById('vendorLiveMap');
    if (mapEl) {
      if (mapEl._leaflet_id) {
        mapEl.innerHTML = '';
        mapEl._leaflet_id = null;
      }
      const center = deliveryOrders.find(o => isValidCoords(o.coords))?.coords || DEFAULT_PORT_AU_PRINCE;
      const liveMap = L.map('vendorLiveMap').setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(liveMap);

      deliveryOrders.forEach(o => {
        if (isValidCoords(o.coords)) {
          const marker = L.marker(o.coords).addTo(liveMap);
          marker.bindPopup(`<strong>${o.orderCode || o.id.substring(0,6)}</strong><br>${o.address}`);
        }
      });
    }

    document.querySelectorAll('.vendor-track-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentTrackingOrderId = e.currentTarget.dataset.id;
        renderView('tracking');
      });
    });

    document.querySelectorAll('.vendor-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orderId = e.currentTarget.dataset.id;
        const newStatus = e.currentTarget.dataset.status;
        try {
          await db.collection('orders').doc(orderId).update({ status: newStatus });
          showMessage('Statut mis à jour.', 'success');
          await loadAllData();
          renderView('logistics');
        } catch (error) {
          showMessage('Erreur mise à jour statut: ' + error.message, 'error');
        }
      });
    });
  }, 200);
}

async function renderOrderTracking(app) {
  if (!currentTrackingOrderId) { renderView(getDefaultViewForRole(pageRole)); return; }
  const order = orders.find(o => o.id === currentTrackingOrderId);
  if (!order) { renderView(getDefaultViewForRole(pageRole)); return; }

  app.innerHTML = `
    <div class="container" style="padding:40px 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
        <h2 style="margin:0;">📦 ${t('orderTracking')}: <span style="color:var(--gold);">${order.orderCode || order.id.substring(0,8)}</span></h2>
        ${(isAdmin || pageRole === 'vendor') ? `<button class="btn btn-outline" id="backToLogistics">${t('returnLogistics')}</button>` : ''}
      </div>

      <div class="card-premium" style="background:var(--white); padding:30px; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); margin-bottom:30px;">
        ${renderStepper(order.status)}
      </div>

      <div class="grid" style="grid-template-columns: 1fr 1fr; gap:30px;">
        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">📍 ${t('liveFleet')}</h3>
          <div id="liveTrackingMap" style="height:350px; border-radius:10px; overflow:hidden;"></div>
        </div>
        
        <div class="card-premium" style="background:var(--white); padding:25px; border-radius:var(--radius-lg); box-shadow:var(--shadow-md);">
          <h3 style="margin-bottom:20px;">📄 ${t('orderInfo')}</h3>
          <p><strong>${t('productName')}:</strong> ${order.productName}</p>
          <p><strong>${t('quantity')}:</strong> ${order.quantity || 1}</p>
          <p><strong>Total:</strong> ${formatPrice(order.price)}</p>
          <p><strong>${t('payment')}:</strong> ${order.paymentMethod || 'Non spécifié'}</p>
          <p><strong>${t('address')}:</strong> ${order.address}</p>
          <p><strong>${t('phone')}:</strong> ${order.phone}</p>
          ${isValidCoords(order.coords) ? `<p style="margin-top:10px; font-size:0.95rem; color:var(--success);">Coordonnées GPS précises disponibles.</p>` : `<p style="margin-top:10px; font-size:0.95rem; color:var(--danger);">Coordonnées GPS non disponibles ou imprécises. Veuillez appeler le client pour confirmer.</p>`}
          ${order.deliveryEstimate ? `<div style="margin-top:20px; padding:15px; background:var(--blue-light); border-radius:8px; color:var(--blue-deep);"><strong>${t('delivery')}:</strong> ${order.deliveryEstimate}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('backToLogistics')?.addEventListener('click', () => {
    currentTrackingOrderId = null;
    if (activeTrackingInterval) clearInterval(activeTrackingInterval);
    renderView('logistics');
  });

  setTimeout(() => {
    if (!mapEl) return;
    
    if (mapEl._leaflet_id) {
      mapEl.innerHTML = "";
      mapEl._leaflet_id = null;
    }
    
    const destCoords = isValidCoords(order.coords) ? order.coords : DEFAULT_PORT_AU_PRINCE;
    const map = L.map('liveTrackingMap').setView(destCoords, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Destination Marker
    L.marker(destCoords, {icon: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    })}).addTo(map).bindPopup("Destination");

    if (order.status === 'in_transit') {
      const startCoords = order.originCoords || DEFAULT_WAREHOUSE_COORDS;
      let currentLoc = [...startCoords];
      
      const driverMarker = L.marker(currentLoc).addTo(map).bindPopup("Livreur en route").openPopup();
      
      const steps = 100;
      const stepLat = (destCoords[0] - startCoords[0]) / steps;
      const stepLng = (destCoords[1] - startCoords[1]) / steps;
      let currentStep = 0;

      if (activeTrackingInterval) clearInterval(activeTrackingInterval);
      activeTrackingInterval = setInterval(() => {
        if (currentStep >= steps) {
          clearInterval(activeTrackingInterval);
          return;
        }
        currentLoc[0] += stepLat;
        currentLoc[1] += stepLng;
        driverMarker.setLatLng(currentLoc);
        currentStep++;
      }, 500); // Move every 500ms
    }
  }, 300);
}
