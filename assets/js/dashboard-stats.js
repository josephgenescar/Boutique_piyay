/*
 * BOUTIQUE PIYAY — DASHBOARD ANALYTICS
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('salesChart')) return;

  // 1. Get data from localStorage
  const getOrders = () => {
    const orders = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('bp_order_')) {
        orders.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return orders;
  };

  const orders = getOrders();

  // 2. Calculate Stats
  const stats = {
    revenue: orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0),
    count: orders.length,
    products: 28, // Example static value
    rating: 4.8
  };

  // 3. Update UI
  document.getElementById('stat-revenue').textContent = stats.revenue.toLocaleString() + ' HTG';
  document.getElementById('stat-orders').textContent = stats.count;
  document.getElementById('stat-products').textContent = stats.products;

  // 4. Create Sales Chart
  const ctx = document.getElementById('salesChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      datasets: [{
        label: 'Ventes (HTG)',
        data: [1200, 1900, 3000, 5000, 2400, 3500, 4500], // Mock data
        borderColor: '#ff4747',
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(255, 71, 71, 0.1)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
});
