/**
 * Common Functionality & State Management
 */

const API_URL = '/api';

// State
const state = {
    user: null,
    cart: [],
    products: []
};

// DOM Elements
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    updateNavigation();
    if (window.location.pathname === '/' || window.location.pathname.includes('index.html')) {
        loadFeaturedProducts();
    }
});

/**
 * Check Authentication
 */
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/me`);
        if (response.ok) {
            const data = await response.json();
            state.user = data.user;
            await fetchCart();
        }
    } catch (error) {
        console.log('User not logged in');
    }
}

/**
 * Fetch Cart
 */
async function fetchCart() {
    try {
        const response = await fetch(`${API_URL}/cart`);
        const data = await response.json();
        state.cart = data.items || [];
        updateCartCount();
    } catch (error) {
        console.error('Failed to fetch cart', error);
    }
}

/**
 * Update Navigation based on Auth State
 */
function updateNavigation() {
    const authLinks = document.getElementById('auth-links');
    const userMenu = document.getElementById('user-menu');

    if (state.user) {
        if (authLinks) authLinks.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'block';
            userMenu.innerHTML = `
                <div class="user-menu-trigger">
                    <span class="nav-icon"><i class="fas fa-user-circle"></i> ${state.user.name}</span>
                </div>
                <div class="user-menu-content">
                    <a href="/profile.html" class="user-menu-item"><i class="fas fa-id-card"></i> Profile</a>
                    <a href="/orders.html" class="user-menu-item"><i class="fas fa-box"></i> Orders</a>
                    ${state.user.role === 'admin' ? '<a href="/admin.html" class="user-menu-item"><i class="fas fa-cog"></i> Admin Dashboard</a>' : ''}
                    <a href="#" onclick="logout()" class="user-menu-item text-danger"><i class="fas fa-sign-out-alt"></i> Logout</a>
                </div>
            `;
        }
    } else {
        if (authLinks) authLinks.style.display = 'flex';
        if (userMenu) userMenu.style.display = 'none';
    }
}

/**
 * Logout
 */
async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed', error);
    }
}

/**
 * Add to Cart
 */
async function addToCart(productId, quantity = 1) {
    if (!state.user) {
        showToast('Please login to add items to cart', 'error');
        setTimeout(() => window.location.href = '/login.html', 1500);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity })
        });

        if (response.ok) {
            await fetchCart();
            showToast('Item added to cart!', 'success');
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to add item', 'error');
        }
    } catch (error) {
        showToast('Error adding to cart', 'error');
    }
}

/**
 * Update Cart Count
 */
function updateCartCount() {
    const countElements = document.querySelectorAll('.cart-count');
    const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    countElements.forEach(el => {
        el.textContent = totalItems;
        el.style.display = totalItems > 0 ? 'flex' : 'none';
    });
}

/**
 * Toast Notification
 */
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Format Currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

/**
 * Load Featured Products (Home)
 */
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/products?featured=true&limit=4`);
        const data = await response.json();

        container.innerHTML = data.products.map(product => createProductCard(product)).join('');
    } catch (error) {
        console.error('Failed to load featured products', error);
    }
}

/**
 * Create Product Card HTML
 */
function createProductCard(product) {
    return `
        <div class="product-card">
            <div class="product-image-container">
                <img src="${product.images[0]}" alt="${product.name}" class="product-image">
                ${product.stock < 5 ? '<span class="badge badge-sale" style="position: absolute; top: 1rem; right: 1rem;">Low Stock</span>' : ''}
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 style="font-size: 1.1rem; margin: 0;">${product.name}</h3>
                    <div class="price">$${product.price}</div>
                </div>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${product.description}
                </p>
                <div style="display: flex; gap: 0.5rem;">
                    <a href="/product.html?id=${product.id}" class="btn btn-outline btn-sm" style="flex: 1;">View Details</a>
                    <button onclick="addToCart('${product.id}')" class="btn btn-primary btn-sm">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}
