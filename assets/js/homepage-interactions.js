/* ===== AliExpress-Style Homepage Interactions ===== */

// Countdown timer for flash deals
function initFlashDealCountdown(elementId = 'countdown-display') {
  const countdownElement = document.getElementById(elementId);
  if (!countdownElement) return;

  // Set flash sale end time to 24 hours from now
  let endTime = localStorage.getItem('flashDealEndTime');
  if (!endTime) {
    endTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem('flashDealEndTime', endTime);
  } else {
    endTime = parseInt(endTime);
  }

  function updateCountdown() {
    const now = Date.now();
    const timeLeft = endTime - now;

    if (timeLeft <= 0) {
      countdownElement.textContent = '00:00:00';
      // Reset for tomorrow
      localStorage.removeItem('flashDealEndTime');
      return;
    }

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    const formattedTime = [hours, minutes, seconds]
      .map(val => String(val).padStart(2, '0'))
      .join(':');

    countdownElement.textContent = formattedTime;
  }

  updateCountdown(); // Initial update
  setInterval(updateCountdown, 1000); // Update every second
}

// Smooth scroll for category carousel
function scrollCategories(direction) {
  const carousel = document.querySelector('.categories-carousel');
  if (!carousel) return;

  const scrollAmount = 200;
  if (direction === 'left') {
    carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  } else if (direction === 'right') {
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}

// Add product to cart from homepage
function addToCartHome(productTitle, productPrice, productImage) {
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

  // Update cart badge
  updateCartBadge();

  // Show notification
  showNotificationHome(`✅ "${productTitle}" añadido al carrito!`);
}

// Show notification
function showNotificationHome(message) {
  const notification = document.createElement('div');
  notification.className = 'notification-home';
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

// Update cart badge count
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

// Toggle wishlist
function toggleWishlistHome(event, productTitle, productId) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.target.closest('.wishlist-btn');
  if (!button) return;

  let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

  if (button.classList.contains('active')) {
    button.classList.remove('active');
    wishlist = wishlist.filter(item => item !== productTitle);
    showNotificationHome('💔 Retiré des favoris');
  } else {
    button.classList.add('active');
    wishlist.push(productTitle);
    showNotificationHome('❤️ Ajouté aux favoris!');
  }

  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// Live search for homepage
function liveSearchHome() {
  const searchInput = document.getElementById('search-input-home');
  const searchResults = document.getElementById('search-results-home');

  if (!searchInput || !searchResults) return;

  const query = searchInput.value.toLowerCase().trim();

  if (query.length < 2) {
    searchResults.style.display = 'none';
    return;
  }

  // Get all products from the page
  const allProducts = document.querySelectorAll('.product-card-home, .deal-card');
  const results = [];

  allProducts.forEach(product => {
    const titleElement = product.querySelector('.product-title-home, .deal-title');
    if (titleElement) {
      const title = titleElement.textContent.toLowerCase();
      if (title.includes(query)) {
        results.push({
          title: titleElement.textContent,
          element: product
        });
      }
    }
  });

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-result-empty">No se encontraron productos</div>';
  } else {
    searchResults.innerHTML = results.map(result => `
      <div class="search-result-item">
        <span>${result.title}</span>
      </div>
    `).join('');

    // Add click to scroll to result
    searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        results[index].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput.value = '';
        searchResults.style.display = 'none';
      });
    });
  }

  searchResults.style.display = 'block';
}

// Initialize homepage on load
document.addEventListener('DOMContentLoaded', () => {
  // Initialize countdown
  initFlashDealCountdown('countdown-display');

  // Update cart badge on load
  updateCartBadge();

  // Load wishlist state
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productTitle = btn.closest('[data-product-title]')?.getAttribute('data-product-title');
    if (productTitle && wishlist.includes(productTitle)) {
      btn.classList.add('active');
    }
  });

  // Add animation styles dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .search-result-item {
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      border-bottom: 1px solid #f0f0f0;
    }

    .search-result-item:hover {
      background: #f9f9f9;
    }

    .search-result-empty {
      padding: 20px;
      text-align: center;
      color: #999;
    }
  `;
  document.head.appendChild(style);
});

// Export functions for use in HTML
window.addToCartHome = addToCartHome;
window.toggleWishlistHome = toggleWishlistHome;
window.scrollCategories = scrollCategories;
window.liveSearchHome = liveSearchHome;
