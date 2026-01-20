// Cart Management System
class ShoppingCart {
  constructor() {
    this.items = this.loadCart();
  }

  addItem(productId, title, price, quantity) {
    const existingItem = this.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      this.items.push({
        productId: productId,
        title: title,
        price: parseFloat(price),
        quantity: parseInt(quantity)
      });
    }
    
    this.saveCart();
    this.updateCartUI();
    showNotification(`✅ ${title} ajouté au panier!`, 'success');
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.productId !== productId);
    this.saveCart();
    this.updateCartUI();
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.productId === productId);
    if (item) {
      item.quantity = Math.max(1, parseInt(quantity));
      this.saveCart();
      this.updateCartUI();
    }
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  }

  loadCart() {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  }

  clear() {
    this.items = [];
    this.saveCart();
    this.updateCartUI();
  }

  updateCartUI() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      badge.textContent = this.getItemCount();
      badge.style.display = this.getItemCount() > 0 ? 'block' : 'none';
    }
  }
}

const cart = new ShoppingCart();

// Order Product Function
function orderProduct(title, price, id) {
  let qtyInput = document.getElementById(`qty-${title.replace(/\s+/g,'-').toLowerCase()}`);
  let qty = qtyInput.value;
  
  if (qty <= 0) {
    showNotification('❌ Veuillez entrer une quantité valide', 'error');
    return;
  }
  
  cart.addItem(id, title, price, qty);
  qtyInput.value = 1;
}

// Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#667eea'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideInRight 0.4s ease;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.4s ease';
    setTimeout(() => notification.remove(), 400);
  }, 3000);
}

// Open Order Modal
function openOrderModal() {
  if (cart.items.length === 0) {
    showNotification('❌ Votre panier est vide!', 'error');
    return;
  }
  
  const modal = document.getElementById('order-modal');
  updateOrderSummary();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Close Order Modal
function closeOrderModal() {
  const modal = document.getElementById('order-modal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Update Order Summary
function updateOrderSummary() {
  const summaryDiv = document.getElementById('order-summary');
  
  if (cart.items.length === 0) {
    summaryDiv.innerHTML = '<p>Panier vide</p>';
    return;
  }
  
  let html = '<div class="order-items">';
  cart.items.forEach(item => {
    const subtotal = (item.price * item.quantity).toFixed(2);
    html += `
      <div class="order-item">
        <div class="item-info">
          <span class="item-name">${item.title}</span>
          <span class="item-qty">x${item.quantity}</span>
        </div>
        <div class="item-price">${subtotal} HTG</div>
      </div>
    `;
  });
  html += '</div>';
  html += `
    <div class="order-total">
      <strong>Total: ${cart.getTotal().toFixed(2)} HTG</strong>
    </div>
  `;
  summaryDiv.innerHTML = html;
}

// Submit Order
function submitOrder() {
  const name = document.getElementById('customer-name').value.trim();
  const phone = document.getElementById('customer-phone').value.trim();
  const paymentMethod = document.getElementById('payment-method').value;
  
  if (!name) {
    showNotification('❌ Veuillez entrer votre nom', 'error');
    return;
  }
  
  if (!phone || phone.length < 8) {
    showNotification('❌ Veuillez entrer un numéro de téléphone valide', 'error');
    return;
  }
  
  if (!paymentMethod) {
    showNotification('❌ Veuillez sélectionner une méthode de paiement', 'error');
    return;
  }
  
  // Build WhatsApp message
  let message = `*🛒 NOUVELLE COMMANDE*\n\n`;
  message += `👤 *Nom:* ${name}\n`;
  message += `📱 *Téléphone:* ${phone}\n`;
  message += `💳 *Paiement:* ${paymentMethod}\n\n`;
  message += `*📦 ARTICLES:*\n`;
  
  cart.items.forEach(item => {
    const subtotal = (item.price * item.quantity).toFixed(2);
    message += `• ${item.title} x${item.quantity} = ${subtotal} HTG\n`;
  });
  
  const total = cart.getTotal().toFixed(2);
  message += `\n*💰 TOTAL: ${total} HTG*\n\n`;
  message += `Merci pour votre commande! ✨`;
  
  // WhatsApp API
  let whatsappNumber = "50936000000"; // À remplacer par le vrai numéro
  let url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
  
  window.open(url, "_blank");
  
  // Clear cart and close modal
  setTimeout(() => {
    cart.clear();
    closeOrderModal();
    showNotification('✅ Commande envoyée avec succès! Merci! 🙏', 'success');
  }, 500);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  cart.updateCartUI();
  
  // Add quantity buttons
  const quantityInputs = document.querySelectorAll('input[type="number"]');
  
  quantityInputs.forEach(input => {
    const wrapper = input.parentElement;
    
    const decreaseBtn = document.createElement('button');
    decreaseBtn.textContent = '−';
    decreaseBtn.type = 'button';
    decreaseBtn.className = 'qty-btn';
    decreaseBtn.onclick = (e) => {
      e.preventDefault();
      if (input.value > 1) input.value = parseInt(input.value) - 1;
    };
    
    const increaseBtn = document.createElement('button');
    increaseBtn.textContent = '+';
    increaseBtn.type = 'button';
    increaseBtn.className = 'qty-btn';
    increaseBtn.onclick = (e) => {
      e.preventDefault();
      input.value = parseInt(input.value) + 1;
    };
    
    wrapper.insertBefore(decreaseBtn, input);
    wrapper.insertBefore(increaseBtn, input.nextSibling);
  });
  
  // Scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'floatIn 0.6s ease forwards';
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.product-card').forEach(card => {
    observer.observe(card);
  });
  
  // Parallax effect
  window.addEventListener('scroll', function() {
    const hero = document.querySelector('#hero');
    if (hero) {
      hero.style.transform = `translateY(${window.scrollY * 0.5}px)`;
    }
  });
  
  // Close modal when clicking outside
  const modal = document.getElementById('order-modal');
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      closeOrderModal();
    }
  });
  
  console.log('🛍️ Boutique Universelle - Site chargé!');
});
