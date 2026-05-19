// Sistèm Tradiksyon Bilingue FR/KR

let currentLang = localStorage.getItem('bp_lang') || 'fr';
let translations = {};

// Chaje tradiksyon yo
async function loadTranslations() {
  try {
    const response = await fetch('/assets/js/translations.json');
    translations = await response.json();
    applyTranslations();
  } catch (error) {
    console.error('Erè chajman tradiksyon:', error);
  }
}

// Chanje lang
function changeLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('bp_lang', lang);
  document.getElementById('lang-selector').value = lang;
  applyTranslations();
}

// Aplike tradiksyon yo
function applyTranslations() {
  if (!translations[currentLang]) return;

  const t = translations[currentLang];

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
  loadTranslations();
  document.getElementById('lang-selector').value = currentLang;
});
