// Sistèm Tradiksyon Bilingue FR/KR

if (typeof currentLang === 'undefined') {
  window.currentLang = localStorage.getItem('bp_lang') || 'fr';
}
if (typeof translations === 'undefined') {
  window.translations = {};
}

// Chaje tradiksyon yo
window.loadTranslations = async function() {
  try {
    const response = await fetch('/assets/js/translations.json');
    window.translations = await response.json();
    console.log('✅ Tradiksyon chaje:', window.currentLang, window.translations[window.currentLang]);
    applyTranslations();
  } catch (error) {
    console.error('❌ Erè chajman tradiksyon:', error);
  }
}

// Chanje lang
window.changeLanguage = function(lang) {
  window.currentLang = lang;
  localStorage.setItem('bp_lang', lang);
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = lang;
  console.log('🔄 Lang chanje nan:', lang);
  applyTranslations();
}

// Aplike tradiksyon yo
window.applyTranslations = function() {
  if (!window.translations[window.currentLang]) {
    console.error('❌ Pa gen tradiksyon pou:', window.currentLang);
    return;
  }

  const t = window.translations[window.currentLang];
  console.log('📝 Aplike tradiksyon pou:', window.currentLang);

  // Tradwi eleman ak data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const keys = key.split('.');
    let value = t;
    keys.forEach(k => {
      if (value) value = value[k];
    });
    if (value) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    } else {
      console.warn('⚠️ Pa jwè tradiksyon pou:', key);
    }
  });

  // Tradwi eleman ak data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const keys = key.split('.');
    let value = t;
    keys.forEach(k => {
      if (value) value = value[k];
    });
    if (value) el.placeholder = value;
  });
}

// Inisyalize
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM pare, kòmanse chaj tradiksyon...');
  window.loadTranslations();
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = window.currentLang;
});
