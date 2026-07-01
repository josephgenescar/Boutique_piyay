
  /* ══ AD SLIDER ══ */
  const adBanners   = ['konektem','kaylakou'];
  const hiddenAds   = new Set();
  let adCurrent     = 0;
  let adAutoplay    = null;
  let lastScrollY   = window.scrollY;
  let adHidden      = false;

  function getVisibleAds() {
    return adBanners.filter(id => !hiddenAds.has(id));
  }

  function updateAdVisibility() {
    const adBox = document.querySelector('.main-ads-box');
    if (!adBox) return;

    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;

    if (delta > 10 && currentY > 120) {
      if (!adHidden) {
        adBox.classList.add('hidden-on-scroll');
        adHidden = true;
      }
    } else if (delta < -10) {
      if (adHidden) {
        adBox.classList.remove('hidden-on-scroll');
        adHidden = false;
      }
    }

    lastScrollY = currentY;
  }

  window.addEventListener('scroll', () => {
    window.requestAnimationFrame(updateAdVisibility);
  }, { passive: true });
  document.addEventListener('DOMContentLoaded', updateAdVisibility);

  function adGoTo(idx) {
    const track = document.getElementById('adSliderTrack');
    if (!track) return;
    const totalSlides = track.children.length;
    if (totalSlides === 0) return;
    adCurrent = (idx + totalSlides) % totalSlides;
    track.style.transform = `translateX(-${adCurrent * 100}%)`;
    document.querySelectorAll('.ad-dot').forEach((d,i) => {
      d.classList.toggle('active', i === adCurrent);
    });
  }

  function hideAd(id) {
    hiddenAds.add(id);
    // Kache bannè fizikman
    const slides = document.querySelectorAll('.ad-banner');
    slides.forEach(s => {
      if (s.querySelector(`[onclick*="${id}"]`)) s.style.display = 'none';
    });
    const visible = getVisibleAds();
    // Mete ajou dots
    const dotsEl = document.getElementById('adDots');
    if (dotsEl) {
      dotsEl.innerHTML = visible.map((_,i) =>
        `<button class="ad-dot ${i===0?'active':''}" onclick="adGoTo(${i})"></button>`
      ).join('');
    }
    if (visible.length === 0) {
      document.getElementById('adSliderTrack').parentElement.style.display = 'none';
      document.querySelector('.box-sep') && (document.querySelector('[style*="height:1px"]').style.display='none');
    } else {
      adGoTo(0);
    }
  }

  function startAdAutoplay() {
    clearInterval(adAutoplay);
    adAutoplay = setInterval(() => {
      const visible = getVisibleAds();
      if (visible.length > 1) adGoTo(adCurrent + 1);
    }, 4000);
  }

  /* ══ SUPABASE ══ */
  const supabaseHome = typeof window.supabase !== 'undefined'
    ? window.supabase.createClient(
        "https://letyferfjpxmstohvgcj.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg"
      )
    : null;

  let allSellers  = [];
  let allProducts = [];
  let sellerMap   = {};
  let boostedIndex = 0;
  let boostedAutoplay = null;
  let boostedBannerAutoplay = null;

  function buildSellerMap() {
    sellerMap = {};
    allSellers.forEach(s => {
      sellerMap[s.id] = {
        full_name:        s.full_name        || 'Boutique Piyay',
        whatsapp_number:  s.whatsapp_number  || s.whatsapp || '50948868964'
      };
    });
  }

  function startInfiniteFlashTimer() {
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('minutes');
    const sEl = document.getElementById('seconds');
    if (!hEl) return;
    setInterval(() => {
      const now      = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1);
      const diff     = tomorrow - now;
      hEl.innerText  = String(Math.floor(diff/3600000)).padStart(2,'0');
      mEl.innerText  = String(Math.floor((diff%3600000)/60000)).padStart(2,'0');
      sEl.innerText  = String(Math.floor((diff%60000)/1000)).padStart(2,'0');
    }, 1000);
  }

  async function loadAllData() {
    if (!supabaseHome) return;
    try {
      const { data: prods }   = await supabaseHome
        .from('user_products')
        .select('id,title,price,image_url,seller_id,category,is_flash_sale,old_price,is_boosted,created_at,flash_start_at,is_approved,boost_expires_at')
        .order('created_at', { ascending: false });

      const { data: sellers } = await supabaseHome
        .from('profiles')
        .select('*');

      const { data: feedbacks } = await supabaseHome
        .from('feedback')
        .select('product_id, rating');

      allProducts = (prods   || []).filter(p => p.image_url && p.title && p.price);
      allSellers  = (sellers || []).filter(s => s.is_active_seller === true);
      
      // Kalkile mwayèn rating pou chak pwodwi
      const ratingsMap = {};
      if (feedbacks) {
        feedbacks.forEach(f => {
          if (!ratingsMap[f.product_id]) {
            ratingsMap[f.product_id] = { total: 0, count: 0 };
          }
          ratingsMap[f.product_id].total += f.rating;
          ratingsMap[f.product_id].count += 1;
        });
      }
      
      // Ajoute mwayèn rating nan chak pwodwi
      allProducts.forEach(p => {
        const ratingData = ratingsMap[p.id];
        if (ratingData && ratingData.count > 0) {
          p.avgRating = ratingData.total / ratingData.count;
          p.ratingCount = ratingData.count;
        } else {
          p.avgRating = 0;
          p.ratingCount = 0;
        }
      });
      
      buildSellerMap();

      console.log('📦 Total pwodwi chaje:', allProducts.length);
      console.log('🔍 Pwodwi avek is_boosted:', allProducts.filter(p => p.is_boosted));

      // Filte pwodwi boost ki pa eksperyé
      const now = new Date();
      const activeBoosted = allProducts.filter(p => {
        if (!p.is_boosted) return false;
        if (!p.boost_expires_at) return true; // Si pa gen dat, konsidere aktif
        return new Date(p.boost_expires_at) > now;
      });

      console.log('🚀 Pwodwi boost chaje:', activeBoosted.length, activeBoosted);
      renderBoostedInBanner(activeBoosted);
      renderSellers(allSellers);
      renderProducts(allProducts);

      const flashProds = allProducts.filter(p => {
        if (p.is_flash_sale === true && p.flash_start_at) {
          const diffH = (now - new Date(p.flash_start_at)) / 3600000;
          return diffH < 24;
        }
        return false;
      });

      if (flashProds.length > 0) {
        document.getElementById('flash-sale').style.display = 'block';
        renderFlashSlider(flashProds);
      }
      startInfiniteFlashTimer();
    } catch(e) { console.error('Erè chajman:', e); }
  }

  function renderBoosted(list) {
    const section = document.getElementById('boosted-section');
    const track   = document.getElementById('boosted-slider-track');
    if (!section || !track) return;
    const featured = list.slice(0, 4);
    if (featured.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';

    const items = featured.map(p => {
      const phone = ((sellerMap[p.seller_id]?.whatsapp_number) || '50948868964').replace(/[^0-9]/g, '');
      const sellerName = (sellerMap[p.seller_id]?.shop_name || sellerMap[p.seller_id]?.full_name || 'Boutique Piyay').replace(/'/g, "\\'");
      
      // Genere etoile rating
      let ratingHTML = '';
      if (p.avgRating > 0) {
        const stars = Math.round(p.avgRating);
        ratingHTML = `<div class="mkt-prod-rating">⭐ ${p.avgRating.toFixed(1)} (${p.ratingCount})</div>`;
      }
      
      return `
        <div class="mkt-prod-card">
          <a href="/pwodwi-machann.html?id=${p.id}">
            <img class="mkt-prod-img" src="${p.image_url}" alt="${p.title}"
                 onerror="this.src='https://ui-avatars.com/api/?name=P&background=f1f5f9&color=cbd5e1'">
          </a>
          <div class="mkt-prod-name">${p.title}</div>
          ${ratingHTML}
          <div class="mkt-prod-price">${p.price} HTG</div>
          <button class="btn-add-light" onclick="if(window.orderProduct) orderProduct('${p.title.replace(/'/g,"\\'")}','${p.price}','${p.id}','${p.image_url}','${p.seller_id}','${phone}','${sellerName}')">
            🛒 <span data-i18n="cart.add">Ajouter</span>
          </button>
        </div>`;
    });

    track.innerHTML = items.join('');
    track.scrollLeft = 0;
    boostedIndex = 0;
    updateBoostedControls();
    startBoostedAutoplay();

    track.addEventListener('mouseenter', stopBoostedAutoplay);
    track.addEventListener('mouseleave', startBoostedAutoplay);
  }

  function renderBoostedInBanner(list) {
    console.log('🎯 renderBoostedInBanner apele avek:', list.length, 'pwodwi');
    const container = document.getElementById('boosted-ads-container');
    console.log('📦 Container boosted-ads-container:', container);
    if (!container) {
      console.log('❌ Container boosted-ads-container pa trouve');
      return;
    }
    if (list.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      updateAdDots();
      console.log('⚠️ Pa gen pwodwi boost');
      return;
    }
    container.style.display = 'block';

    // Prendre tous les produits boostés pour le banner horizontal
    const boostedProducts = list;
    console.log('✅ Pwodwi boost pou afiche:', boostedProducts);

    stopBoostedBannerAutoplay();
    container.innerHTML = `
      <div class="mkt-prod-grid">
        ${boostedProducts.map(p => {
          const phone = ((sellerMap[p.seller_id]?.whatsapp_number) || '50948868964').replace(/[^0-9]/g,'');
          const sellerName = (sellerMap[p.seller_id]?.shop_name || sellerMap[p.seller_id]?.full_name || 'Boutique Piyay').replace(/'/g, "\\'");
          return `
            <div class="mkt-prod-card">
              <a href="/pwodwi-machann.html?id=${p.id}">
                <img class="mkt-prod-img" src="${p.image_url}" alt="${p.title}"
                     onerror="this.src='https://ui-avatars.com/api/?name=P&background=f1f5f9&color=cbd5e1'">
              </a>
              <div class="mkt-prod-name">${p.title}</div>
              <div class="mkt-prod-price">${p.price} HTG</div>
              <button class="btn-add-light" onclick="if(window.orderProduct) orderProduct('${p.title.replace(/'/g,"\\'")}','${p.price}','${p.id}','${p.image_url}','${p.seller_id}','${phone}','${sellerName}')">
                🛒 <span data-i18n="cart.add">Ajouter</span>
              </button>
            </div>`;
        }).join('')}
      </div>`;

    console.log('🎨 Container HTML apres update:', container.innerHTML);
    updateAdDots();
    startBoostedBannerAutoplay();
  }

  function startBoostedBannerAutoplay() {
    const banner = document.querySelector('.ad-banner.boosted-product');
    if (!banner) return;
    clearInterval(boostedBannerAutoplay);
    boostedBannerAutoplay = null;

    const contentWidth = banner.scrollWidth;
    const visibleWidth = banner.clientWidth;
    if (contentWidth <= visibleWidth) return;

    let scrollPos = 0;
    banner.onmouseenter = stopBoostedBannerAutoplay;
    banner.onmouseleave = startBoostedBannerAutoplay;

    boostedBannerAutoplay = setInterval(() => {
      if (!banner) return;
      const maxScroll = contentWidth - visibleWidth;
      if (scrollPos >= maxScroll) {
        scrollPos = 0;
      } else {
        scrollPos = Math.min(scrollPos + visibleWidth * 0.9, maxScroll);
      }
      banner.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }, 4300);
  }

  function stopBoostedBannerAutoplay() {
    clearInterval(boostedBannerAutoplay);
    boostedBannerAutoplay = null;
  }

  function updateAdDots() {
    const track = document.getElementById('adSliderTrack');
    if (!track) return;
    const totalSlides = track.children.length;
    console.log('🔢 Total slides:', totalSlides);
    const dotsEl = document.getElementById('adDots');
    if (!dotsEl) return;

    dotsEl.innerHTML = Array.from({length: totalSlides}, (_, i) =>
      `<button class="ad-dot ${i===0?'active':''}" onclick="adGoTo(${i})"></button>`
    ).join('');
    console.log('🔵 Dots mete ajou:', totalSlides, 'dots');
  }

  function boostedMoveTo(index) {
    const track = document.getElementById('boosted-slider-track');
    if (!track) return;
    const cards = Array.from(track.querySelectorAll('.boosted-card'));
    if (!cards.length) return;
    if (index < 0) boostedIndex = cards.length - 1;
    else if (index >= cards.length) boostedIndex = 0;
    else boostedIndex = index;
    const card = cards[boostedIndex];
    if (!card) return;
    const offset = card.offsetLeft;
    track.scrollTo({ left: offset, behavior: 'smooth' });
    updateBoostedControls();
  }

  function startBoostedAutoplay() {
    clearInterval(boostedAutoplay);
    const track = document.getElementById('boosted-slider-track');
    if (!track) return;
    const cards = track.querySelectorAll('.boosted-card');
    if (cards.length < 2) return;
    boostedAutoplay = setInterval(() => {
      boostedMoveTo(boostedIndex + 1);
    }, 4500);
  }

  function stopBoostedAutoplay() {
    clearInterval(boostedAutoplay);
    boostedAutoplay = null;
  }

  function insertBoostedAdsterraScript() {
    const adCard = document.querySelector('.boosted-ad-card .adsterra-banner');
    if (!adCard) return;
    const existing = adCard.querySelector('script[src*="profitablecpmratenetwork.com"]');
    if (existing) return;

    const container = adCard.querySelector('#container-2e8d42466e54761c90d32db5824eb06c');
    if (!container) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = 'https://pl29038232.profitablecpmratenetwork.com/2e8d42466e54761c90d32db5824eb06c/invoke.js';
    adCard.appendChild(script);
  }

  function updateBoostedControls() {
    const prev = document.getElementById('boosted-prev');
    const next = document.getElementById('boosted-next');
    const track = document.getElementById('boosted-slider-track');
    if (!prev || !next || !track) return;
    const cards = track.querySelectorAll('.boosted-card');
    prev.disabled = boostedIndex <= 0;
    next.disabled = boostedIndex >= cards.length - 1;
  }

  function boostedPrev() { boostedMoveTo(boostedIndex - 1); }
  function boostedNext() { boostedMoveTo(boostedIndex + 1); }

  function renderFeaturedSellers(list) {
    const row = document.getElementById('featured-sellers-row');
    if (!row) return;
    if (list.length === 0) {
      row.innerHTML = `<div class="empty-state"><div class="e-icon">🏬</div><div class="e-title">Aucune boutique recommandée pour le moment</div></div>`;
      return;
    }
    const featured = list.slice(0, 4);
    row.innerHTML = featured.map(s => {
      const sellerDisplayName = s.shop_name || s.full_name || 'Boutik';
      const initial = (sellerDisplayName || 'B').charAt(0).toUpperCase();
      return `
        <a class="featured-seller-card" href="/boutik-machann.html?id=${s.id}">
          <div class="seller-avatar-small">${initial}</div>
          <div class="seller-info-small">
            <span>${sellerDisplayName}</span>
            <small>📍 ${s.address || 'Ayiti'}</small>
          </div>
        </a>`;
    }).join('');
  }

  function renderSellers(list) {
    const grid = document.getElementById('sellers-grid-home');
    if (!grid) return;
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="e-icon">🏪</div><div class="e-title" data-i18n="market.no_sellers">Aucun vendeur pour le moment</div></div>`;
      return;
    }
    grid.innerHTML = list.map(s => {
      const sProds = allProducts.filter(p => String(p.seller_id) === String(s.id) && p.image_url).slice(0,4);
      let previews = sProds.map(p => `<div class="preview-img"><img src="${p.image_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='📦'"></div>`).join('');
      for (let i = sProds.length; i < 4; i++) previews += `<div class="preview-img">📦</div>`;
      const sellerDisplayName = s.shop_name || s.full_name || 'Boutik';
      const initial       = (sellerDisplayName || 'M').charAt(0).toUpperCase();
      const avatarContent = s.avatar_url
        ? `<img src="${s.avatar_url}" onerror="this.style.display='none';this.parentElement.innerText='${initial}'">`
        : initial;
      return `
        <div class="seller-card">
          <div class="seller-head">
            <div class="seller-avatar">${avatarContent}</div>
            <div class="seller-info">
              <h4>${sellerDisplayName}</h4>
              <p>📍 ${s.address || 'Ayiti'}</p>
              <span class="seller-verified">✅ Verifye</span>
            </div>
          </div>
          <div class="seller-previews">${previews}</div>
          <a href="/boutik-machann.html?id=${s.id}" class="btn-visit">Visiter la boutique →</a>
        </div>`;
    }).join('');
  }

  function renderProducts(list) {
    const grid = document.getElementById('supabase-products-grid');
    if (!grid) return;
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="e-icon">📦</div><div class="e-title" data-i18n="market.no_products">Aucun produit pour le moment</div><div class="e-sub" data-i18n="market.products_soon">Les vendeurs ajouteront bientôt leurs produits !</div></div>`;
      return;
    }
    grid.innerHTML = list.map(p => {
      const phone = ((sellerMap[p.seller_id]?.whatsapp_number) || '50948868964').replace(/[^0-9]/g,'');
      const sellerName = (sellerMap[p.seller_id]?.shop_name || sellerMap[p.seller_id]?.full_name || 'Boutique Piyay').replace(/'/g, "\\'");
      
      // Genere etoile rating
      let ratingHTML = '';
      if (p.avgRating > 0) {
        ratingHTML = `<div class="mkt-prod-rating">⭐ ${p.avgRating.toFixed(1)} (${p.ratingCount})</div>`;
      }
      
      return `
        <div class="mkt-prod-card">
          <a href="/pwodwi-machann.html?id=${p.id}">
            <img class="mkt-prod-img" src="${p.image_url}" alt="${p.title}"
                 onerror="this.src='https://ui-avatars.com/api/?name=P&background=f1f5f9&color=cbd5e1'">
          </a>
          <div class="mkt-prod-name">${p.title}</div>
          ${ratingHTML}
          <div class="mkt-prod-price">${p.price} HTG</div>
          <button class="btn-add-light" onclick="if(window.orderProduct) orderProduct('${p.title.replace(/'/g,"\"")}','${p.price}','${p.id}','${p.image_url}','${p.seller_id}','${phone}','${sellerName}')">
            🛒 <span data-i18n="cart.add">Ajouter</span>
          </button>
        </div>`;
    }).join('');
  }

  function renderFlashSlider(list) {
    const slider = document.getElementById('flash-slider-inner');
    if (!slider) return;
    slider.innerHTML = list.map(p => {
      const valOld = p.old_price ? parseFloat(p.old_price) : 0;
      const valNew = parseFloat(p.price);
      const disc   = (valOld > valNew) ? Math.round(((valOld-valNew)/valOld)*100) : 0;
      const phone  = ((sellerMap[p.seller_id]?.whatsapp_number) || '50948868964').replace(/[^0-9]/g,'');
      const sellerName = (sellerMap[p.seller_id]?.shop_name || sellerMap[p.seller_id]?.full_name || 'Boutique Piyay').replace(/'/g, "\\'");
      
      // Genere etoile rating
      let ratingHTML = '';
      if (p.avgRating > 0) {
        ratingHTML = `<div class="flash-rating">⭐ ${p.avgRating.toFixed(1)} (${p.ratingCount})</div>`;
      }
      
      return `
        <div class="flash-card">
          ${disc > 0 ? `<span class="flash-pct">-${disc}%</span>` : ''}
          <div class="flash-img-wrap">
            <a href="/pwodwi-machann.html?id=${p.id}">
              <img class="flash-img" src="${p.image_url}" alt="${p.title}"
                   onerror="this.src='https://ui-avatars.com/api/?name=P&background=f1f5f9&color=cbd5e1'">
            </a>
          </div>
          <div class="flash-name">${p.title}</div>
          ${ratingHTML}
          <div class="flash-prices">
            <span class="flash-new">${p.price} HTG</span>
            ${valOld > valNew ? `<span class="flash-old">${p.old_price} HTG</span>` : ''}
          </div>
          <button class="btn-flash" onclick="if(window.orderProduct) orderProduct('${p.title.replace(/'/g,"\\'")}','${p.price}','${p.id}','${p.image_url}','${p.seller_id}','${phone}','${sellerName}')">
            🛒 <span data-i18n="cart.add">Ajouter</span>
          </button>
        </div>`;
    }).join('');
  }

  function switchMarketTab(tab) {
    document.getElementById('tab-sellers').classList.toggle('active',  tab==='sellers');
    document.getElementById('tab-products').classList.toggle('active', tab==='products');
    document.getElementById('sellers-view').style.display  = tab==='sellers'  ? 'block' : 'none';
    document.getElementById('products-view').style.display = tab==='products' ? 'block' : 'none';
  }

  let catPreviewTimeout = null;

  function showCategoryPreview(target) {
    if (!target) return;
    const panelId = target.dataset.previewPanel || 'cat-preview-panel';
    const title = target.dataset.catTitle || target.textContent.trim();
    const desc = target.dataset.catDesc || 'Découvrez cette catégorie.';
    const img = target.dataset.catImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=ff4747&color=fff`;
    const href = target.href || '#';
    const slug = target.dataset.catSlug || title;

    const panel = document.getElementById(panelId);
    if (!panel) return;
    const titleEl = panel.querySelector('.cat-preview-title');
    const descEl = panel.querySelector('.cat-preview-desc');
    const imgEl = panel.querySelector('.cat-preview-image');
    const linkEl = panel.querySelector('.cat-preview-link');
    const buyEl = panel.querySelector('.cat-preview-buy');
    const countEl = panel.querySelector('.cat-preview-count');
    const priceEl = panel.querySelector('.cat-preview-price');
    const sampleEl = panel.querySelector('.cat-preview-sample');
    const productImgEl = panel.querySelector('.cat-preview-product-image');
    const productNameEl = panel.querySelector('.cat-preview-product-name');
    if (!titleEl || !descEl || !imgEl || !linkEl || !buyEl || !countEl || !priceEl || !sampleEl || !productImgEl || !productNameEl) return;

    const matchingProducts = allProducts.filter(p => {
      return p.category && String(p.category).toLowerCase() === String(slug).toLowerCase();
    });
    const itemCount = matchingProducts.length;
    const sampleNames = matchingProducts.slice(0, 3).map(p => p.title).filter(Boolean);
    const newestProduct = matchingProducts.reduce((latest, p) => {
      const created = p.created_at ? new Date(p.created_at).getTime() : NaN;
      if (isNaN(created)) return latest;
      if (!latest || created > latest.createdAt) {
        return { ...p, createdAt: created };
      }
      return latest;
    }, null);
    const newestPrice = newestProduct ? parseFloat(newestProduct.price) : NaN;
    const priceText = !isNaN(newestPrice) ? `Nouveau à partir de ${newestPrice.toLocaleString('fr-FR')} HTG` : 'Prix indisponible';

    titleEl.textContent = title;
    descEl.textContent = desc;
    imgEl.src = img;
    imgEl.alt = title + ' image';
    linkEl.href = href;
    countEl.textContent = itemCount > 0 ? `${itemCount} produit${itemCount > 1 ? 's' : ''} disponibles` : 'Aucun pwodwi pou kounye a';
    priceEl.textContent = priceText;
    sampleEl.textContent = sampleNames.length > 0 ? `Ex: ${sampleNames.join(', ')}` : 'Dekouvri pi bon of yo.';

    if (newestProduct && newestProduct.id) {
      productImgEl.src = newestProduct.image_url || '/assets/images/logo.png';
      productImgEl.alt = `Produit: ${newestProduct.title}`;
      productNameEl.textContent = newestProduct.title || 'Produit récent';
      buyEl.href = '#';
      buyEl.style.display = 'inline-flex';
      buyEl.onclick = function (event) {
        event.preventDefault();
        if (window.orderProduct) {
          window.orderProduct(
            String(newestProduct.title || 'Produit'),
            String(newestProduct.price || ''),
            String(newestProduct.id),
            String(newestProduct.image_url || ''),
            String(newestProduct.seller_id || ''),
            String((sellerMap[newestProduct.seller_id]?.whatsapp_number || '50948868964')).replace(/[^0-9]/g, ''),
            String(sellerMap[newestProduct.seller_id]?.shop_name || sellerMap[newestProduct.seller_id]?.full_name || 'Boutique Piyay')
          );
        } else {
          window.location.href = `/pwodwi-machann.html?id=${newestProduct.id}`;
        }
      };
    } else {
      productImgEl.src = '/assets/images/logo.png';
      productImgEl.alt = 'Aucun pwodwi disponib';
      productNameEl.textContent = 'Aucun pwodwi';
      buyEl.style.display = 'none';
      buyEl.onclick = null;
    }

    document.querySelectorAll('.cat-preview-container.active').forEach(activePanel => {
      if (activePanel !== panel) {
        activePanel.classList.remove('active');
        activePanel.setAttribute('aria-hidden', 'true');
        activePanel.style.display = 'none';
      }
    });
    panel.classList.add('active');
    panel.setAttribute('aria-hidden', 'false');
    panel.style.display = 'block';
  }

  function scheduleHideCategoryPreview() {
    clearTimeout(catPreviewTimeout);
    catPreviewTimeout = setTimeout(() => {
      document.querySelectorAll('.cat-preview-container').forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
        panel.style.display = 'none';
      });
    }, 150);
  }

  function cancelHideCategoryPreview() {
    clearTimeout(catPreviewTimeout);
  }

  function initCategoryPreview() {
    const bubbles = document.querySelectorAll('.cat-bubble, .site-nav .nav-lnk[data-cat-slug]');
    const panel = document.querySelector('.cat-preview-container');
    if (!bubbles.length || !panel) return;

    bubbles.forEach(bubble => {
      bubble.addEventListener('pointerenter', () => {
        cancelHideCategoryPreview();
        showCategoryPreview(bubble);
      });
      bubble.addEventListener('pointerleave', scheduleHideCategoryPreview);
      bubble.addEventListener('focus', () => {
        cancelHideCategoryPreview();
        showCategoryPreview(bubble);
      });
      bubble.addEventListener('blur', scheduleHideCategoryPreview);
    });

    const panels = document.querySelectorAll('.cat-preview-container');
    panels.forEach(panel => {
      panel.addEventListener('pointerenter', cancelHideCategoryPreview);
      panel.addEventListener('pointerleave', scheduleHideCategoryPreview);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    startAdAutoplay();
    loadAllData();
    initCategoryPreview();
  });
