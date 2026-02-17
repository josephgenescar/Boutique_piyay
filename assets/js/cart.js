// Enhanced Cart System for Boutique Piyay
// Save as: assets/js/cart.js

class ShoppingCart {
  constructor() {
    this.cart = this.loadCart();
    this.init();
  }

  init() {
    this.updateCartDisplay();
    this.updateCartCount();
    this.bindEvents();
  }

  loadCart() {
    const saved = localStorage.getItem('boutique_piyay_cart');
    return saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem('boutique_piyay_cart', JSON.stringify(this.cart));
    this.updateCartDisplay();
    this.updateCartCount();
  }

  addItem(product) {
    const existing = this.cart.find(item =>
      item.id === product.id &&
      JSON.stringify(item.selectedVariants) === JSON.stringify(product.selectedVariants)
    );

    if (existing) {
      existing.quantity += product.quantity || 1;
    } else {
      this.cart.push({
        id: product.id || Date.now(),
        title: product.title,
        price: product.price,
        image: product.image,
        quantity: product.quantity || 1,
        selectedVariants: product.selectedVariants || {},
        url: product.url
      });
    }

    this.saveCart();
    this.showNotification(`✅ ${product.title} ajouté au panier!`);
  }

  removeItem(index) {
    this.cart.splice(index, 1);
    this.saveCart();
    this.showNotification('🗑️ Produit retiré du panier');
  }

  updateQuantity(index, quantity) {
    if (quantity <= 0) {
      this.removeItem(index);
    } else {
      this.cart[index].quantity = quantity;
      this.saveCart();
    }
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.showNotification('🛒 Panier vidé');
  }

  getTotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getItemCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  updateCartCount() {
    const countElements = document.querySelectorAll('.cart-count, #cartCount');
    const count = this.getItemCount();

    countElements.forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-block' : 'none';
    });
  }

  showNotification(message, type = 'success') {
    const existing = document.querySelector('.cart-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: type === 'success' ? '#10b981' : '#ef4444',
      color: 'white',
      padding: '15px 25px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '100000',
      animation: 'slideInRight 0.3s ease-out',
      fontWeight: '500'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  processCheckout(formData) {
    const order = {
      orderNumber: 'BP-' + Date.now(),
      date: new Date().toISOString(),
      customer: {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        notes: formData.get('notes')
      },
      items: this.cart,
      payment: {
        method: formData.get('payment_method'),
        amount: this.getTotal() + this.calculateShipping(this.getTotal())
      },
      status: 'pending'
    };

    let orders = JSON.parse(localStorage.getItem('orders') || '[]');
    orders.push(order);
    localStorage.setItem('orders', JSON.stringify(orders));

    this.sendWhatsAppOrder(order);
    this.clearCart();

    localStorage.setItem('lastOrder', JSON.stringify(order));
    window.location.href = '/order-confirmation';

    return order;
  }

  sendWhatsAppOrder(order) {
    const whatsappNumber = '50948868964';

    let message = `🛍️ *NOUVELLE COMMANDE*

📋 Commande: ${order.orderNumber}
👤 Client: ${order.customer.name}
📱 Téléphone: ${order.customer.phone}
📍 Adresse: ${order.customer.address}, ${order.customer.city}

*PRODUITS:*
${order.items.map(item =>
  `• ${item.title} x${item.quantity} - ${item.price * item.quantity} HTG`
).join('\n')}

💰 *Total: ${order.payment.amount} HTG*
💳 Paiement: ${order.payment.method}

${order.customer.notes ? `📝 Notes: ${order.customer.notes}` : ''}
`;

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }

  calculateShipping(subtotal) {
    if (subtotal >= 1000) return 0;
    return 100;
  }

  updateCartDisplay() {
    // This will be called to update any cart displays on the page
  }

  bindEvents() {
    // Bind any necessary events
  }
}

const cart = new ShoppingCart();

function addToCart(title, price, image = '', url = '') {
  cart.addItem({ title, price, image, url });
}

const style = document.createElement('style');
style.textContent = `
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);