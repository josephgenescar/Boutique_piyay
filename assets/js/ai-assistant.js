if (typeof currentLang === 'undefined') {
  window.currentLang = localStorage.getItem('bp_lang') || 'fr';
}

function getWelcomeMessage() {
    if (currentLang === 'fr') {
        return "Bonjour! Je suis **Piyay AI**. Je suis là pour vous aider à trouver les meilleurs produits chez nos vendeurs. Que cherchez-vous? 😊";
    }
    return "Bonjou! Mwen se **Piyay AI**. Mwen la pou m ede w jwenn pi bon pwodwi nan men machann nou yo. Kisa w ap chèche? 😊";
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (!box) return;
    const isVisible = box.style.display === 'flex';
    box.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
        currentLang = localStorage.getItem('bp_lang') || 'fr';
        if (document.getElementById('ai-chat-body').children.length === 0) {
            addAIMessage("assistant", getWelcomeMessage());
        }
    }
}

function addAIMessage(role, text, products = []) {
    const body = document.getElementById('ai-chat-body');
    if (!body) return;

    const message = document.createElement('div');
    message.style.cssText = `display:flex;flex-direction:column;align-items:${role === 'user' ? 'flex-end' : 'flex-start'};gap:10px;margin-bottom:15px;`;

    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width:90%;padding:12px 16px;border-radius:18px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;${role === 'user' ? 'background:#ff4747;color:white;border-bottom-right-radius:4px;' : 'background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px;'}`;
    bubble.textContent = String(text || '');
    message.appendChild(bubble);

    (Array.isArray(products) ? products : []).slice(0, 5).forEach((product) => {
        if (!product || !product.id || !product.title) return;
        const card = document.createElement('article');
        card.style.cssText = 'display:grid;grid-template-columns:76px 1fr;gap:12px;max-width:320px;width:100%;padding:10px;background:#fff;border:1px solid #dbe3e8;border-radius:8px;';

        const image = document.createElement('img');
        const imageUrl = String(product.image_url || '');
        if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) image.src = imageUrl;
        else {
            try {
                const parsedImage = new URL(imageUrl);
                if (parsedImage.protocol === 'https:') image.src = parsedImage.href;
            } catch { /* Invalid catalog image URL: keep the card text-only. */ }
        }
        image.alt = '';
        image.loading = 'lazy';
        image.style.cssText = 'width:76px;height:76px;object-fit:cover;border-radius:4px;background:#f1f5f9;';
        card.appendChild(image);

        const details = document.createElement('div');
        details.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0;';
        const seller = document.createElement('span');
        seller.textContent = String(product.seller_name || 'Boutique Piyay');
        seller.style.cssText = 'font-size:11px;color:#536966;';
        const title = document.createElement('strong');
        title.textContent = String(product.title);
        title.style.cssText = 'font-size:13px;color:#172a2a;overflow-wrap:anywhere;';
        const price = document.createElement('span');
        price.textContent = `${Number(product.price).toLocaleString()} HTG`;
        price.style.cssText = 'font-weight:800;color:#be3f34;';
        const link = document.createElement('a');
        link.href = `/pwodwi-machann.html?id=${encodeURIComponent(String(product.id))}`;
        link.textContent = currentLang === 'fr' ? 'Voir le produit' : 'Wè pwodwi a';
        link.style.cssText = 'color:#176a59;font-size:12px;font-weight:700;';
        details.append(seller, title, price, link);
        card.appendChild(details);
        message.appendChild(card);
    });

    body.appendChild(message);
    body.scrollTop = body.scrollHeight;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const body = document.getElementById('ai-chat-body');
    const button = document.querySelector('#ai-chat-box button[onclick="sendAIMessage()"]');
    const msg = input?.value.trim() || '';
    if (!msg || !body || window.aiRequestPending) return;

    input.value = '';
    addAIMessage('user', msg);

    const typing = document.createElement('div');
    typing.id = 'ai-typing';
    typing.textContent = currentLang === 'fr' ? 'Recherche en cours…' : 'M ap chèche repons lan…';
    typing.style.cssText = 'margin:8px 0 14px;padding:8px 12px;color:#536966;font-size:13px;';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;
    window.aiRequestPending = true;
    if (button) button.disabled = true;

    try {
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, lang: currentLang === 'fr' ? 'fr' : 'ht' })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'AI support request failed');
        if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('AI reply was empty');
        addAIMessage('assistant', data.reply, data.products);
    } catch {
        const fallback = currentLang === 'fr'
            ? 'Je ne peux pas vérifier cette information pour le moment. Contactez Boutique Piyay sur WhatsApp au +509 4886-8964.'
            : 'Mwen pa ka verifye enfòmasyon sa a kounye a. Kontakte Boutique Piyay sou WhatsApp nan +509 4886-8964.';
        addAIMessage('assistant', fallback);
    } finally {
        typing.remove();
        window.aiRequestPending = false;
        if (button) button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('ai-input');
    if (inp) {
        inp.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendAIMessage();
            }
        });
    }
});
