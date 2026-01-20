// Smooth scroll function
function smoothScroll(target) {
  const element = document.querySelector(target);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

// Product ordering function
function orderProduct(title, price, id) {
  let qtyInput = document.getElementById(`qty-${title.replace(/\s+/g,'-').toLowerCase()}`);
  let qty = qtyInput.value;
  
  if (qty <= 0) {
    showNotification('Veuillez entrer une quantité valide', 'error');
    return;
  }
  
  let totalPrice = qty * price;
  let message = `Bonjour 👋\n\nJe veux commander:\n✓ ${qty} x ${title}\n💰 Prix total: ${totalPrice} HTG\n\nMerci!`;
  
  let whatsappNumber = "509XXXXXXXX"; // Remplacer par le vrai numéro
  let url = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
  
  window.open(url, "_blank");
  showNotification('Commande envoyée vers WhatsApp! 📱', 'success');
}

// Notification system
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
`;
document.head.appendChild(style);

// Quantity control
document.addEventListener('DOMContentLoaded', function() {
  // Add quantity buttons
  const quantityInputs = document.querySelectorAll('input[type="number"]');
  
  quantityInputs.forEach(input => {
    const wrapper = input.parentElement;
    
    const decreaseBtn = document.createElement('button');
    decreaseBtn.textContent = '−';
    decreaseBtn.type = 'button';
    decreaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 50%;
      margin: 0 5px;
    `;
    decreaseBtn.onclick = (e) => {
      e.preventDefault();
      if (input.value > 1) input.value = parseInt(input.value) - 1;
    };
    
    const increaseBtn = document.createElement('button');
    increaseBtn.textContent = '+';
    increaseBtn.type = 'button';
    increaseBtn.style.cssText = `
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 50%;
      margin: 0 5px;
    `;
    increaseBtn.onclick = (e) => {
      e.preventDefault();
      input.value = parseInt(input.value) + 1;
    };
    
    wrapper.insertBefore(decreaseBtn, input);
    wrapper.insertBefore(increaseBtn, input.nextSibling);
  });
  
  // Add scroll animations
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
  
  // Search functionality (if needed later)
  console.log('Boutique Universelle - Site chargé! 🎉');
});
