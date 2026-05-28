/* ============================================
   Total Lakay - Admin Dashboard JavaScript
   ============================================ */

// Configuration API
const API_BASE = 'http://localhost:3000/api' || process.env.REACT_APP_API_URL;
const CHARTS = {};

// State Management
const adminState = {
  currentUser: null,
  token: localStorage.getItem('adminToken'),
  products: [],
  orders: [],
  deliveries: [],
  users: [],
  payments: [],
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    activeUsers: 0,
    totalSold: 0
  },
  currentSection: 'dashboard',
  filters: {
    dateStart: null,
    dateEnd: null,
    category: null,
    orderStatus: null,
    userRole: null
  }
};

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await initAdminPanel();
  setupEventListeners();
  await loadDashboardData();
});

async function initAdminPanel() {
  // Check authentication
  const token = localStorage.getItem('adminToken');
  if (!token) {
    // Redirect to login if not authenticated
    window.location.href = 'index.html';
    return;
  }

  // Verify admin role
  try {
    const user = await verifyAdminAccess();
    adminState.currentUser = user;
    updateAdminProfile();
  } catch (error) {
    console.error('Admin access denied:', error);
    window.location.href = 'index.html';
  }
}

async function verifyAdminAccess() {
  const token = adminState.token;
  const response = await fetch(`${API_BASE}/users/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Unauthorized');
  const user = await response.json();

  if (user.role !== 'admin') throw new Error('Not an admin');
  return user;
}

function updateAdminProfile() {
  const nameEl = document.getElementById('adminName');
  const roleEl = document.getElementById('adminRole');

  if (nameEl) nameEl.textContent = adminState.currentUser.firstName + ' ' + adminState.currentUser.lastName;
  if (roleEl) roleEl.textContent = 'Administrateur';
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      navigateToSection(section);
    });
  });

  // Section navigation
  const sections = ['dashboard', 'products', 'orders', 'deliveries', 'users', 'payments', 'analytics', 'settings'];
  sections.forEach(section => {
    const element = document.getElementById(`${section}-section`);
    if (element) {
      element.addEventListener('click', (e) => {
        if (e.target.closest('[data-section]')) {
          const newSection = e.target.closest('[data-section]').getAttribute('data-section');
          navigateToSection(newSection);
        }
      });
    }
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      searchAcrossAllData(query);
    });
  }

  // Filter buttons
  document.querySelectorAll('.filters-bar input, .filters-bar select').forEach(filter => {
    filter.addEventListener('change', applyFilters);
  });

  // Sidebar toggle
  document.addEventListener('click', (e) => {
    if (e.target.closest('.sidebar-toggle') || e.target.closest('.menu-toggle')) {
      document.querySelector('.sidebar').classList.toggle('collapsed');
    }
  });

  // Modal close buttons
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.add('hidden');
    });
  });
}

// ============================================
// NAVIGATION
// ============================================
function navigateToSection(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected section
  const selectedSection = document.getElementById(`${section}-section`);
  if (selectedSection) {
    selectedSection.classList.add('active');
  }

  // Update nav item
  document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

  // Update page title
  const titles = {
    dashboard: 'Tableau de Bord',
    products: 'Gestion des Produits',
    orders: 'Gestion des Commandes',
    deliveries: 'Suivi des Livraisons',
    users: 'Gestion des Utilisateurs',
    payments: 'Gestion des Paiements',
    analytics: 'Analytics & Rapports',
    settings: 'Paramètres'
  };

  document.querySelector('.page-title').textContent = titles[section] || 'Dashboard';

  // Load data for section
  if (section === 'dashboard') loadDashboardData();
  if (section === 'products') loadProductsData();
  if (section === 'orders') loadOrdersData();
  if (section === 'deliveries') loadDeliveriesData();
  if (section === 'users') loadUsersData();
  if (section === 'payments') loadPaymentsData();
  if (section === 'analytics') loadAnalyticsData();

  adminState.currentSection = section;
}

// ============================================
// DASHBOARD DATA
// ============================================
async function loadDashboardData() {
  try {
    // Load statistics
    const statsResponse = await fetch(`${API_BASE}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const stats = await statsResponse.json();

    adminState.stats = stats;
    updateDashboardKPIs();

    // Load recent orders
    const ordersResponse = await fetch(`${API_BASE}/orders?limit=5&sort=-createdAt`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const orders = await ordersResponse.json();
    displayRecentOrders(orders.data);

    // Initialize charts
    initCharts();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showNotification('Erreur lors du chargement du tableau de bord', 'error');
  }
}

function updateDashboardKPIs() {
  document.getElementById('totalRevenue').textContent = `${(adminState.stats.totalRevenue || 0).toLocaleString()} HTG`;
  document.getElementById('totalOrders').textContent = adminState.stats.totalOrders || 0;
  document.getElementById('activeUsers').textContent = adminState.stats.activeUsers || 0;
  document.getElementById('totalSold').textContent = adminState.stats.totalSold || 0;
}

function displayRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Aucune commande</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>#${order.orderNumber}</strong></td>
      <td>${order.client?.firstName || 'Client'} ${order.client?.lastName || ''}</td>
      <td>${order.total} HTG</td>
      <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
      <td>${new Date(order.createdAt).toLocaleDateString('fr-HT')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon view" onclick="viewOrder('${order.id}')" title="Voir">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon edit" onclick="editOrder('${order.id}')" title="Éditer">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================
async function loadProductsData() {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await response.json();
    adminState.products = data.data || [];
    displayProducts(adminState.products);
  } catch (error) {
    console.error('Error loading products:', error);
    showNotification('Erreur lors du chargement des produits', 'error');
  }
}

function displayProducts(products) {
  const tbody = document.getElementById('productsTable');
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun produit</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => `
    <tr>
      <td>
        <img src="${product.thumbnail || 'https://via.placeholder.com/40'}" 
             alt="${product.name}" style="width: 40px; height: 40px; border-radius: 4px;">
      </td>
      <td><strong>${product.name}</strong></td>
      <td>${product.category}</td>
      <td>${product.price} HTG</td>
      <td>
        <span style="color: ${product.stock > 10 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444'}">
          ${product.stock}
        </span>
      </td>
      <td>${product.salesCount || 0}</td>
      <td>
        <div style="color: #f59e0b;">
          ${'⭐'.repeat(Math.round(product.rating || 0))}
          ${product.rating?.toFixed(1) || 'N/A'}
        </div>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit" onclick="editProduct('${product.id}')" title="Éditer">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon delete" onclick="deleteProduct('${product.id}')" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterProducts() {
  const search = document.getElementById('productSearch').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;

  const filtered = adminState.products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search);
    const matchCategory = !category || p.category === category;
    return matchSearch && matchCategory;
  });

  displayProducts(filtered);
}

function openProductModal(productId = null) {
  const modal = document.getElementById('productModal');
  if (!modal) return;

  if (productId) {
    const product = adminState.products.find(p => p.id === productId);
    if (product) {
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productDiscountPrice').value = product.discountPrice || '';
      document.getElementById('productStock').value = product.stock;
      document.getElementById('productSku').value = product.sku || '';
      document.getElementById('productDescription').value = product.description || '';
      document.getElementById('productImage').value = product.thumbnail || '';
      document.querySelector('.modal-header h3').textContent = 'Éditer Produit';
    }
  } else {
    document.getElementById('productForm').reset();
    document.querySelector('.modal-header h3').textContent = 'Nouveau Produit';
  }

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

async function saveProduct(e) {
  e.preventDefault();

  const product = {
    name: document.getElementById('productName').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value),
    discountPrice: parseFloat(document.getElementById('productDiscountPrice').value) || null,
    stock: parseInt(document.getElementById('productStock').value),
    sku: document.getElementById('productSku').value,
    description: document.getElementById('productDescription').value,
    thumbnail: document.getElementById('productImage').value
  };

  try {
    const method = adminState.editingProductId ? 'PUT' : 'POST';
    const url = adminState.editingProductId 
      ? `${API_BASE}/products/${adminState.editingProductId}`
      : `${API_BASE}/products`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${adminState.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(product)
    });

    if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

    showNotification('Produit enregistré avec succès', 'success');
    closeProductModal();
    await loadProductsData();
  } catch (error) {
    console.error('Error saving product:', error);
    showNotification('Erreur: ' + error.message, 'error');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;

  try {
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });

    if (!response.ok) throw new Error('Erreur lors de la suppression');

    showNotification('Produit supprimé avec succès', 'success');
    await loadProductsData();
  } catch (error) {
    console.error('Error deleting product:', error);
    showNotification('Erreur: ' + error.message, 'error');
  }
}

// ============================================
// ORDERS MANAGEMENT
// ============================================
async function loadOrdersData() {
  try {
    const response = await fetch(`${API_BASE}/orders`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await response.json();
    adminState.orders = data.data || [];
    displayOrders(adminState.orders);
  } catch (error) {
    console.error('Error loading orders:', error);
    showNotification('Erreur lors du chargement des commandes', 'error');
  }
}

function displayOrders(orders) {
  const tbody = document.getElementById('ordersTable');
  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucune commande</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>#${order.orderNumber}</strong></td>
      <td>${order.client?.firstName || 'N/A'} ${order.client?.lastName || ''}</td>
      <td>${order.items?.length || 0}</td>
      <td>${order.total} HTG</td>
      <td><span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></td>
      <td><span class="status-badge status-${order.paymentStatus.toLowerCase()}">${order.paymentStatus}</span></td>
      <td>${new Date(order.createdAt).toLocaleDateString('fr-HT')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon view" onclick="viewOrder('${order.id}')" title="Voir">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon edit" onclick="editOrder('${order.id}')" title="Éditer">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterOrders() {
  const search = document.getElementById('orderSearch').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;

  const filtered = adminState.orders.filter(o => {
    const matchSearch = o.orderNumber.includes(search) || o.client?.firstName.toLowerCase().includes(search);
    const matchStatus = !status || o.status === status;
    return matchSearch && matchStatus;
  });

  displayOrders(filtered);
}

async function viewOrder(orderId) {
  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const order = await response.json();

    const modal = document.getElementById('orderModal');
    const details = document.getElementById('orderDetails');

    details.innerHTML = `
      <div style="padding: 24px;">
        <h4>Commande #${order.orderNumber}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
          <div>
            <h5>Client</h5>
            <p>${order.client?.firstName} ${order.client?.lastName}</p>
            <p>${order.client?.email}</p>
            <p>${order.client?.phone}</p>
          </div>
          <div>
            <h5>Adresse</h5>
            <p>${order.shippingAddress?.street}</p>
            <p>${order.shippingAddress?.city}, ${order.shippingAddress?.country}</p>
          </div>
        </div>

        <h5 style="margin-top: 20px;">Articles</h5>
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité</th>
              <th>Prix</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(item => `
              <tr>
                <td>${item.product?.name}</td>
                <td>${item.quantity}</td>
                <td>${item.price} HTG</td>
                <td>${item.quantity * item.price} HTG</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div>
            <strong>Sous-total:</strong> ${order.subtotal} HTG
          </div>
          <div>
            <strong>Livraison:</strong> ${order.shippingCost} HTG
          </div>
          <div>
            <strong>Taxe:</strong> ${order.tax} HTG
          </div>
          <div>
            <strong>Total:</strong> <span style="color: var(--accent); font-size: 1.2rem;">${order.total} HTG</span>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <label>Statut:</label>
          <select id="orderStatusSelect" style="margin-top: 10px; width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 8px;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
            <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
            <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Payée</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Traitement</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Expédiée</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée</option>
          </select>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    adminState.selectedOrderId = orderId;
  } catch (error) {
    console.error('Error viewing order:', error);
    showNotification('Erreur lors du chargement de la commande', 'error');
  }
}

async function updateOrderStatus() {
  const newStatus = document.getElementById('orderStatusSelect').value;

  try {
    const response = await fetch(`${API_BASE}/orders/${adminState.selectedOrderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminState.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) throw new Error('Erreur lors de la mise à jour');

    showNotification('Statut de la commande mis à jour', 'success');
    closeOrderModal();
    await loadOrdersData();
  } catch (error) {
    console.error('Error updating order:', error);
    showNotification('Erreur: ' + error.message, 'error');
  }
}

// ============================================
// DELIVERIES MANAGEMENT
// ============================================
async function loadDeliveriesData() {
  try {
    const response = await fetch(`${API_BASE}/deliveries`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await response.json();
    adminState.deliveries = data.data || [];
    displayDeliveries(adminState.deliveries);
  } catch (error) {
    console.error('Error loading deliveries:', error);
    showNotification('Erreur lors du chargement des livraisons', 'error');
  }
}

function displayDeliveries(deliveries) {
  const tbody = document.getElementById('deliveriesTable');
  if (!deliveries || deliveries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucune livraison</td></tr>';
    return;
  }

  tbody.innerHTML = deliveries.map(delivery => `
    <tr>
      <td><strong>#${delivery.id}</strong></td>
      <td>#${delivery.order?.orderNumber}</td>
      <td>${delivery.agent?.firstName} ${delivery.agent?.lastName}</td>
      <td><span class="status-badge status-${delivery.status.toLowerCase()}">${delivery.status}</span></td>
      <td>${delivery.pickupLocation?.address || 'N/A'}</td>
      <td>${delivery.deliveryLocation?.address || 'N/A'}</td>
      <td>${delivery.estimatedDeliveryDate ? new Date(delivery.estimatedDeliveryDate).toLocaleDateString('fr-HT') : 'N/A'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon view" onclick="trackDelivery('${delivery.id}')" title="Suivi">
            <i class="fas fa-map-marker-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterDeliveries() {
  const status = document.getElementById('deliveryStatusFilter').value;

  const filtered = adminState.deliveries.filter(d => {
    return !status || d.status === status;
  });

  displayDeliveries(filtered);
}

// ============================================
// USERS MANAGEMENT
// ============================================
async function loadUsersData() {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await response.json();
    adminState.users = data.data || [];
    displayUsers(adminState.users);
  } catch (error) {
    console.error('Error loading users:', error);
    showNotification('Erreur lors du chargement des utilisateurs', 'error');
  }
}

function displayUsers(users) {
  const tbody = document.getElementById('usersTable');
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun utilisateur</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td><strong>${user.id}</strong></td>
      <td>${user.firstName} ${user.lastName}</td>
      <td>${user.email}</td>
      <td>${user.phone || 'N/A'}</td>
      <td><span style="text-transform: capitalize;">${user.role}</span></td>
      <td><span class="status-badge status-${user.status.toLowerCase()}">${user.status}</span></td>
      <td>${new Date(user.createdAt).toLocaleDateString('fr-HT')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit" onclick="editUser('${user.id}')" title="Éditer">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon delete" onclick="deleteUser('${user.id}')" title="Supprimer">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterUsers() {
  const search = document.getElementById('userSearch').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  const status = document.getElementById('statusFilter').value;

  const filtered = adminState.users.filter(u => {
    const matchSearch = u.firstName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search);
    const matchRole = !role || u.role === role;
    const matchStatus = !status || u.status === status;
    return matchSearch && matchRole && matchStatus;
  });

  displayUsers(filtered);
}

async function deleteUser(userId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) return;

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });

    if (!response.ok) throw new Error('Erreur lors de la suppression');

    showNotification('Utilisateur supprimé avec succès', 'success');
    await loadUsersData();
  } catch (error) {
    console.error('Error deleting user:', error);
    showNotification('Erreur: ' + error.message, 'error');
  }
}

// ============================================
// PAYMENTS MANAGEMENT
// ============================================
async function loadPaymentsData() {
  try {
    const response = await fetch(`${API_BASE}/payments`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const data = await response.json();
    adminState.payments = data.data || [];
    displayPayments(adminState.payments);
  } catch (error) {
    console.error('Error loading payments:', error);
    showNotification('Erreur lors du chargement des paiements', 'error');
  }
}

function displayPayments(payments) {
  const tbody = document.getElementById('paymentsTable');
  if (!payments || payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Aucun paiement</td></tr>';
    return;
  }

  tbody.innerHTML = payments.map(payment => `
    <tr>
      <td><strong>#${payment.id}</strong></td>
      <td>#${payment.order?.orderNumber}</td>
      <td>${payment.amount} HTG</td>
      <td>${payment.method}</td>
      <td><span class="status-badge status-${payment.status.toLowerCase()}">${payment.status}</span></td>
      <td>${new Date(payment.createdAt).toLocaleDateString('fr-HT')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon view" onclick="viewPayment('${payment.id}')" title="Voir">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterPayments() {
  const paymentStatus = document.getElementById('paymentStatusFilter').value;
  const method = document.getElementById('paymentMethodFilter').value;

  const filtered = adminState.payments.filter(p => {
    const matchStatus = !paymentStatus || p.status === paymentStatus;
    const matchMethod = !method || p.method === method;
    return matchStatus && matchMethod;
  });

  displayPayments(filtered);
}

// ============================================
// ANALYTICS
// ============================================
async function loadAnalyticsData() {
  try {
    const response = await fetch(`${API_BASE}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    const analytics = await response.json();

    displayTopProducts(analytics.topProducts);
    displayConversionMetrics(analytics.conversion);
  } catch (error) {
    console.error('Error loading analytics:', error);
    showNotification('Erreur lors du chargement des analytics', 'error');
  }
}

function displayTopProducts(products) {
  const listContainer = document.getElementById('topProductsList');
  if (!products || products.length === 0) {
    listContainer.innerHTML = '<p>Aucune donnée</p>';
    return;
  }

  listContainer.innerHTML = products.slice(0, 10).map((product, index) => `
    <div class="metric-row">
      <span>${index + 1}. ${product.name}</span>
      <strong>${product.salesCount} ventes</strong>
    </div>
  `).join('');
}

function displayConversionMetrics(metrics) {
  if (!metrics) return;

  document.getElementById('visitorCount').textContent = (metrics.visitors || 0).toLocaleString();
  document.getElementById('clientCount').textContent = (metrics.clients || 0).toLocaleString();
  document.getElementById('conversionRate').textContent = metrics.conversionRate?.toFixed(2) + '%' || '0%';
}

// ============================================
// CHARTS INITIALIZATION
// ============================================
function initCharts() {
  if (CHARTS.revenue) CHARTS.revenue.destroy();
  if (CHARTS.orderStatus) CHARTS.orderStatus.destroy();
  if (CHARTS.monthly) CHARTS.monthly.destroy();

  // Revenue Chart
  const revenueCtx = document.getElementById('revenueChart');
  if (revenueCtx) {
    CHARTS.revenue = new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6', 'J7'],
        datasets: [{
          label: 'Revenus (HTG)',
          data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
          borderColor: '#c8963e',
          backgroundColor: 'rgba(200, 150, 62, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Order Status Chart
  const statusCtx = document.getElementById('orderStatusChart');
  if (statusCtx) {
    CHARTS.orderStatus = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Livrées', 'En cours', 'Payées', 'Annulées'],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: ['#10b981', '#3b82f6', '#c8963e', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // Monthly Performance Chart
  const monthlyCtx = document.getElementById('monthlyPerformanceChart');
  if (monthlyCtx) {
    CHARTS.monthly = new Chart(monthlyCtx, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû'],
        datasets: [
          {
            label: 'Revenus',
            data: [65000, 75000, 85000, 95000, 110000, 125000, 135000, 145000],
            backgroundColor: '#c8963e'
          },
          {
            label: 'Commandes',
            data: [120, 150, 180, 220, 260, 310, 380, 420],
            backgroundColor: '#3b82f6'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// ============================================
// SETTINGS
// ============================================
async function saveSettings() {
  const settings = {
    siteName: document.getElementById('siteName').value,
    siteEmail: document.getElementById('siteEmail').value,
    sitePhone: document.getElementById('sitePhone').value,
    moncashEnabled: document.getElementById('moncashEnabled').checked,
    commission: parseFloat(document.getElementById('commission').value),
    baseShipping: parseFloat(document.getElementById('baseShipping').value),
    avgDelivery: parseInt(document.getElementById('avgDelivery').value)
  };

  try {
    const response = await fetch(`${API_BASE}/admin/settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminState.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

    showNotification('Paramètres sauvegardés avec succès', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('Erreur: ' + error.message, 'error');
  }
}

// ============================================
// UTILITIES
// ============================================
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('collapsed');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.add('hidden');
}

function editProduct(productId) {
  adminState.editingProductId = productId;
  openProductModal(productId);
}

function editOrder(orderId) {
  viewOrder(orderId);
}

function editUser(userId) {
  console.log('Edit user:', userId);
  // Implementation for editing user
}

function openUserModal() {
  console.log('Open user modal');
  // Implementation for creating new user
}

function assignDelivery() {
  console.log('Assign delivery');
  // Implementation for assigning delivery
}

function trackDelivery(deliveryId) {
  console.log('Track delivery:', deliveryId);
  // Implementation for tracking delivery
}

function viewPayment(paymentId) {
  console.log('View payment:', paymentId);
  // Implementation for viewing payment
}

function exportOrders() {
  console.log('Export orders');
  // Implementation for exporting orders to CSV
}

function exportPayments() {
  console.log('Export payments');
  // Implementation for exporting payments report
}

function applyDateFilter() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  adminState.filters.dateStart = start;
  adminState.filters.dateEnd = end;
  loadDashboardData();
}

function applyFilters() {
  // Generic filter application
  const currentSection = adminState.currentSection;
  if (currentSection === 'products') filterProducts();
  if (currentSection === 'orders') filterOrders();
  if (currentSection === 'deliveries') filterDeliveries();
  if (currentSection === 'users') filterUsers();
  if (currentSection === 'payments') filterPayments();
}

function searchAcrossAllData(query) {
  // Search functionality across all sections
  console.log('Search query:', query);
}

function handleLogout() {
  localStorage.removeItem('adminToken');
  window.location.href = 'index.html';
}

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
