/* ===== AliExpress-Style Shop Page Filters & Interactions ===== */

class ShopFilters {
  constructor() {
    this.allProducts = [];
    this.filteredProducts = [];
    this.filters = {
      search: '',
      category: '',
      priceMin: 0,
      priceMax: 10000,
      rating: 0,
      inStock: false,
      onSale: false,
      freeShipping: false
    };
    this.sortBy = 'newest';
    this.init();
  }

  init() {
    // Get all products from DOM
    this.allProducts = Array.from(document.querySelectorAll('.product-card-shop'));

    // Attach event listeners
    this.attachEventListeners();

    // Initial filter
    this.applyFilters();
  }

  attachEventListeners() {
    // Search input
    const searchInput = document.getElementById('shop-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.toLowerCase();
        this.applyFilters();
      });
    }

    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.applyFilters();
      });
    }

    // Price range sliders
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    if (priceMinInput && priceMaxInput) {
      priceMinInput.addEventListener('input', (e) => {
        this.filters.priceMin = parseInt(e.target.value) || 0;
        this.applyFilters();
      });
      priceMaxInput.addEventListener('input', (e) => {
        this.filters.priceMax = parseInt(e.target.value) || 10000;
        this.applyFilters();
      });
    }

    // Rating filter
    const ratingCheckboxes = document.querySelectorAll('[data-filter="rating"]');
    ratingCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.filters.rating = e.target.checked ? parseInt(e.target.value) : 0;
        this.applyFilters();
      });
    });

    // Stock filter
    const stockCheckbox = document.getElementById('filter-in-stock');
    if (stockCheckbox) {
      stockCheckbox.addEventListener('change', (e) => {
        this.filters.inStock = e.target.checked;
        this.applyFilters();
      });
    }

    // Sale filter
    const saleCheckbox = document.getElementById('filter-on-sale');
    if (saleCheckbox) {
      saleCheckbox.addEventListener('change', (e) => {
        this.filters.onSale = e.target.checked;
        this.applyFilters();
      });
    }

    // Free shipping filter
    const freeShippingCheckbox = document.getElementById('filter-free-shipping');
    if (freeShippingCheckbox) {
      freeShippingCheckbox.addEventListener('change', (e) => {
        this.filters.freeShipping = e.target.checked;
        this.applyFilters();
      });
    }

    // Sort dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.applyFilters();
      });
    }

    // Reset filters button
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Collapsible filter headers
    const filterHeaders = document.querySelectorAll('.filter-header');
    filterHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        if (content && content.classList.contains('filter-content')) {
          content.classList.toggle('collapsed');
          header.classList.toggle('collapsed');
        }
      });
    });
  }

  applyFilters() {
    let filtered = this.allProducts.filter(product => this.matchesFilters(product));

    // Sort products
    filtered.sort((a, b) => this.sortProducts(a, b));

    this.filteredProducts = filtered;
    this.updateDisplay();
  }

  matchesFilters(product) {
    // Search filter
    if (this.filters.search) {
      const title = product.querySelector('.product-title-shop')?.textContent.toLowerCase() || '';
      if (!title.includes(this.filters.search)) return false;
    }

    // Category filter
    if (this.filters.category) {
      const category = product.dataset.category || '';
      if (category !== this.filters.category) return false;
    }

    // Price filter
    const price = parseFloat(product.dataset.price) || 0;
    if (price < this.filters.priceMin || price > this.filters.priceMax) {
      return false;
    }

    // Stock filter
    if (this.filters.inStock) {
      const inStock = product.dataset.inStock === 'true';
      if (!inStock) return false;
    }

    // Sale filter
    if (this.filters.onSale) {
      const onSale = product.dataset.onSale === 'true';
      if (!onSale) return false;
    }

    // Rating filter
    if (this.filters.rating > 0) {
      const rating = parseFloat(product.dataset.rating) || 5;
      if (rating < this.filters.rating) return false;
    }

    return true;
  }

  sortProducts(a, b) {
    const aPrice = parseFloat(a.dataset.price) || 0;
    const bPrice = parseFloat(b.dataset.price) || 0;
    const aDate = new Date(a.dataset.date) || new Date();
    const bDate = new Date(b.dataset.date) || new Date();
    const aTitle = a.querySelector('.product-title-shop')?.textContent || '';
    const bTitle = b.querySelector('.product-title-shop')?.textContent || '';

    switch (this.sortBy) {
      case 'price-low':
        return aPrice - bPrice;
      case 'price-high':
        return bPrice - aPrice;
      case 'name':
        return aTitle.localeCompare(bTitle);
      case 'newest':
        return bDate - aDate;
      case 'popular':
        const aSold = parseInt(a.dataset.sold) || 0;
        const bSold = parseInt(b.dataset.sold) || 0;
        return bSold - aSold;
      default:
        return 0;
    }
  }

  updateDisplay() {
    const grid = document.getElementById('products-grid-shop');
    if (!grid) return;

    // Hide all products
    this.allProducts.forEach(product => product.style.display = 'none');

    // Show filtered products
    if (this.filteredProducts.length === 0) {
      grid.innerHTML += `
        <div class="no-results-shop" style="grid-column: 1 / -1;">
          <div class="no-results-icon-shop">🔍</div>
          <h3>Aucun produit trouvé</h3>
          <p>Essayez de modifier vos filtres ou votre recherche</p>
        </div>
      `;
    } else {
      this.filteredProducts.forEach(product => product.style.display = 'block');
    }

    // Update results count
    const countElement = document.getElementById('results-count');
    if (countElement) {
      countElement.textContent = this.filteredProducts.length;
    }

    // Update active filters display
    this.updateActiveFiltersDisplay();
  }

  updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('active-filters');
    if (!activeFiltersContainer) return;

    const tags = [];

    if (this.filters.search) {
      tags.push(`Recherche: "${this.filters.search}"`);
    }

    if (this.filters.category) {
      tags.push(`Catégorie: ${this.filters.category}`);
    }

    if (this.filters.priceMin !== 0 || this.filters.priceMax !== 10000) {
      tags.push(`Prix: ${this.filters.priceMin} - ${this.filters.priceMax} HTG`);
    }

    if (this.filters.inStock) {
      tags.push('En stock');
    }

    if (this.filters.onSale) {
      tags.push('En promotion');
    }

    if (this.filters.rating > 0) {
      tags.push(`Note: ${this.filters.rating}+⭐`);
    }

    if (tags.length > 0) {
      activeFiltersContainer.innerHTML = tags.map(tag => `
        <div class="filter-tag">
          ${tag}
          <span class="filter-tag-remove" onclick="shopFilters.removeFilter('${tag}')">✕</span>
        </div>
      `).join('');
      activeFiltersContainer.style.display = 'flex';
    } else {
      activeFiltersContainer.style.display = 'none';
    }
  }

  removeFilter(tagText) {
    // Simple implementation - clears all filters
    this.resetFilters();
  }

  resetFilters() {
    this.filters = {
      search: '',
      category: '',
      priceMin: 0,
      priceMax: 10000,
      rating: 0,
      inStock: false,
      onSale: false,
      freeShipping: false
    };
    this.sortBy = 'newest';

    // Reset input fields
    const searchInput = document.getElementById('shop-search');
    if (searchInput) searchInput.value = '';

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) categoryFilter.value = '';

    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    if (priceMinInput) priceMinInput.value = '0';
    if (priceMaxInput) priceMaxInput.value = '10000';

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'newest';

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    this.applyFilters();
  }
}

// Initialize on page load
let shopFilters;
document.addEventListener('DOMContentLoaded', () => {
  shopFilters = new ShopFilters();
});

// Add to cart function
function addToCartShop(productTitle, productPrice, productImage) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');

  const existingItem = cart.find(item => item.title === productTitle);
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({
      title: productTitle,
      price: productPrice,
      image: productImage,
      quantity: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  showNotificationShop(`✅ "${productTitle}" ajouté au panier!`);
  updateCartBadge();
}

// Show notification
function showNotificationShop(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2500);
}

// Toggle wishlist
function toggleWishlistShop(event, productTitle) {
  event.preventDefault();
  event.stopPropagation();

  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

  if (wishlist.includes(productTitle)) {
    wishlist = wishlist.filter(item => item !== productTitle);
    showNotificationShop('💔 Retiré des favoris');
  } else {
    wishlist.push(productTitle);
    showNotificationShop('❤️ Ajouté aux favoris!');
  }

  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// Update cart badge
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const badge = document.getElementById('cart-badge');
  if (badge) {
    if (cartCount > 0) {
      badge.textContent = cartCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);
