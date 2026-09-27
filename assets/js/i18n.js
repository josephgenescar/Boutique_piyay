// Bilingual French and Haitian Creole translations.
const supportedLanguages = ['fr', 'ht'];
const savedLanguage = localStorage.getItem('bp_lang');
window.currentLang = supportedLanguages.includes(savedLanguage) ? savedLanguage : 'fr';
window.translations = window.translations || {};

function resolveTranslation(key) {
  return key.split('.').reduce((value, part) => value && value[part], window.translations[window.currentLang]);
}

function setTranslation(dictionary, key, value) {
  const parts = key.split('.');
  const leaf = parts.pop();
  const parent = parts.reduce((current, part) => {
    if (!current[part] || typeof current[part] !== 'object') current[part] = {};
    return current[part];
  }, dictionary);
  parent[leaf] = value;
}

window.t = function(key, fallback) {
  return resolveTranslation(key) || fallback || key;
};

function translateElements(root) {
  if (!window.translations[window.currentLang]) return;

  const elements = [];
  if (root.nodeType === Node.ELEMENT_NODE && root.matches('[data-i18n], [data-i18n-placeholder], [data-i18n-attr]')) {
    elements.push(root);
  }
  if (root.querySelectorAll) {
    elements.push(...root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-attr]'));
  }

  elements.forEach(element => {
    const textKey = element.getAttribute('data-i18n');
    const text = textKey && resolveTranslation(textKey);
    if (text && element.textContent !== text) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = text;
      } else {
        element.textContent = text;
      }
    }

    const placeholderKey = element.getAttribute('data-i18n-placeholder');
    const placeholder = placeholderKey && resolveTranslation(placeholderKey);
    if (placeholder) element.placeholder = placeholder;

    const attributes = element.getAttribute('data-i18n-attr');
    if (attributes) {
      attributes.split(',').forEach(entry => {
        const [attribute, key] = entry.trim().split(':');
        const value = key && resolveTranslation(key);
        if (attribute && value) element.setAttribute(attribute, value);
      });
    }
  });
}

window.applyTranslations = function() {
  document.documentElement.lang = window.currentLang === 'ht' ? 'ht-HT' : 'fr-HT';
  translateElements(document);
};

window.loadTranslations = async function() {
  const language = window.currentLang;
  try {
    if (!window.translations[language]) {
      const response = await fetch(`/locales/${language}.json`);
      if (!response.ok) throw new Error(`Translation request failed: ${response.status}`);
      window.translations[language] = await response.json();
    }
    window.applyTranslations();

    const client = window.supabaseMain;
    if (!client) return;
    const { data, error } = await client
      .from('site_translations')
      .select('translation_key, translation_value')
      .eq('language', language);
    if (error || !data) return;

    data.forEach(item => setTranslation(window.translations[language], item.translation_key, item.translation_value));
    if (language === window.currentLang) window.applyTranslations();
  } catch (error) {
    console.error('Unable to load translations:', error);
  }
};

window.changeLanguage = async function(lang) {
  if (!supportedLanguages.includes(lang)) return;
  window.currentLang = lang;
  localStorage.setItem('bp_lang', lang);
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = lang;
  await window.loadTranslations();
};

document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = window.currentLang;
  window.loadTranslations();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) translateElements(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
