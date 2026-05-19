if (typeof aiCatalog === 'undefined') {
  window.aiCatalog = [];
}
if (typeof currentLang === 'undefined') {
  window.currentLang = localStorage.getItem('bp_lang') || 'fr';
}

/**
 * ✅ LOAD SUPABASE CATALOG FOR AI
 */
async function loadSupabaseCatalogForAI() {
    if (!window.supabaseMain) return;

    try {
        const { data, error } = await window.supabaseMain
            .from('user_products')
            .select('id, title, price, image_url, category, created_at')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        if (data) {
            aiCatalog = data.map(p => ({
                title: p.title,
                price: p.price + " HTG",
                url: `${window.location.origin}/pwodwi-machann.html?id=${p.id}`,
                image: p.image_url,
                category: p.category || 'General',
                seller: "Vendeur Boutique Piyay"
            }));
            console.log("✅ Katalòg AI pare:", aiCatalog.length, "pwodwi");
        }
    } catch (e) {
        console.error("❌ Erè katalòg AI:", e);
    }
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
        loadSupabaseCatalogForAI();
        if (document.getElementById('ai-chat-body').innerHTML === "") {
            addAIMessage("assistant", getWelcomeMessage());
        }
    }
}

function addAIMessage(role, text) {
    const body = document.getElementById('ai-chat-body');
    if (!body) return;

    const div = document.createElement('div');
    div.style.marginBottom = '15px';
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';

    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // 🔥 DETEKTE AK DESINE KAD PWODWI (CARD)
    // Fòma: [PRODUCT: Tit | Pri | Lyen | Imaj | Vendeur]
    let htmlContent = formattedText.replace(/\[PRODUCT:(.*?)\]/g, (match, content) => {
        const parts = content.split('|').map(p => p.trim());

        const title  = parts[0] || 'Pwodwi';
        const price  = parts[1] || '';
        const url    = parts[2] || '#';
        let   img    = parts[3] || '';
        const seller = parts[4] || 'Vendeur Boutique Piyay';

        // Si AI a mete logo a olye foto a, oswa si li vid
        if (!img || img.includes('logo.png') || img === 'null') {
            img = '/assets/images/logo.png';
        }

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:15px; overflow:hidden; margin-top:10px; width:100%; max-width:240px; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
                <div style="height:140px; background:#f8fafc; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='/assets/images/logo.png'">
                </div>
                <div style="padding:12px;">
                    <div style="font-size:10px; font-weight:800; color:#ff4747; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.5px;">🏪 ${seller}</div>
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; height:34px;">${title}</div>
                    <div style="font-size:15px; font-weight:900; color:#ff4747; margin-bottom:10px;">${price}</div>
                    <a href="${url}" style="display:block; text-align:center; background:#ff4747; color:white; text-decoration:none; padding:10px; border-radius:10px; font-size:12px; font-weight:800;">Wè Pwodwi</a>
                </div>
            </div>
        `;
    });

    div.innerHTML = `
        <div style="max-width:90%; padding:12px 16px; border-radius:18px; font-size:14px; line-height:1.5;
                    ${role === 'user' ? 'background:#ff4747; color:white; border-bottom-right-radius:4px;' : 'background:#f1f5f9; color:#1e293b; border-bottom-left-radius:4px;'}">
            ${htmlContent}
        </div>
    `;

    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

/**
 * 🔍 RECHERCHE LOCALE INTELLIGENTE (Fallback si API non disponible)
 */
function searchCatalogLocally(query) {
    if (!aiCatalog || aiCatalog.length === 0) return [];

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(w => w.length > 2);

    return aiCatalog.filter(product => {
        const titleMatch = product.title.toLowerCase().includes(queryLower);
        const categoryMatch = product.category && product.category.toLowerCase().includes(queryLower);
        const keywordMatch = keywords.some(kw =>
            product.title.toLowerCase().includes(kw) ||
            (product.category && product.category.toLowerCase().includes(kw))
        );

        return titleMatch || categoryMatch || keywordMatch;
    }).slice(0, 5); // Limiter à 5 résultats
}

/**
 * 🤖 RÉPONSES AUTOMATIQUES POUR QUESTIONS COURANTES
 */
function getAutoResponse(msg) {
    const msgLower = msg.toLowerCase();

    // Questions sur les prix
    if (msgLower.includes('prix') || msgLower.includes('pri') || msgLower.includes('kòman') || msgLower.includes('combien')) {
        if (currentLang === 'fr') {
            return "Les prix varient selon les vendeurs. Pour voir les prix, cliquez sur les produits qui vous intéressent. Vous pouvez aussi me dire quel type de produit vous cherchez et je vous montrerai les options disponibles.";
        }
        return "Pri yo chanje selon vandè yo. Pou wè pri yo, klike sou pwodwi yo ki enterese ou. Ou ka di m tou ki kalite pwodwi w ap chèche epi m pral montre ou opsyon ki disponib yo.";
    }

    // Questions sur la livraison
    if (msgLower.includes('livraison') || msgLower.includes('livre') || msgLower.includes('kib') || msgLower.includes('ki kote')) {
        if (currentLang === 'fr') {
            return "Nous livrons partout en Haïti! 🚀 La livraison est rapide et sécurisée. Pour plus d'informations sur la livraison d'un produit spécifique, contactez le vendeur directement via WhatsApp.";
        }
        return "Nou livrer nan tout peyi a! 🚀 Livrezon an rapid epi sekirize. Pou plis enfòmasyon sou livrezon yon pwodwi espesifik, kontakte vandè a dirèkteman via WhatsApp.";
    }

    // Questions sur le paiement
    if (msgLower.includes('paiement') || msgLower.includes('peye') || msgLower.includes('moncash') || msgLower.includes('natcash')) {
        if (currentLang === 'fr') {
            return "Le paiement se fait principalement via MonCash ou NatCash. Chaque vendeur peut avoir ses propres méthodes de paiement. Contactez-les via WhatsApp pour confirmer les options de paiement.";
        }
        return "Peyman an fèt sitou via MonCash oswa NatCash. Chak vandè ka gen pwòp metòd peyman li. Kontakte yo via WhatsApp pou konfime opsyon peyman yo.";
    }

    // Questions sur comment vendre
    if (msgLower.includes('vendre') || msgLower.includes('vann') || msgLower.includes('boutik') || msgLower.includes('machann')) {
        if (currentLang === 'fr') {
            return "Pour vendre vos produits sur Boutique Piyay, c'est gratuit! 🎉 Allez sur la page 'Vann pa w' pour créer votre boutique. Vous pourrez ajouter vos produits et commencer à vendre rapidement.";
        }
        return "Pou vann pwodwi ou sou Boutique Piyay, sa a gratis! 🎉 Ale nan paj 'Vann pa w' pou kreye boutik ou. Ou pral kapab ajoute pwodwi ou yo epi kòmanse vann rapidman.";
    }

    return null;
}

/**
 * 🎯 GÉNÉRER RÉPONSE AVEC PRODUITS
 */
function generateProductResponse(products, query) {
    if (products.length === 0) {
        if (currentLang === 'fr') {
            return "Je n'ai trouvé aucun produit correspondant à votre recherche. Essayez avec d'autres mots-clés ou parcourez notre catalogue.";
        }
        return "Mwen pa jwenn okenn pwodwi ki koresponn ak rechèch ou a. Eseye ak lòt mo kle oswa parkouwi katalòg nou an.";
    }

    let response = currentLang === 'fr'
        ? `J'ai trouvé ${products.length} produit(s) qui pourrait vous intéresser:\n\n`
        : `Mwen jwenn ${products.length} pwodwi ki ka enterese ou:\n\n`;

    products.forEach((p, i) => {
        response += `[PRODUCT: ${p.title} | ${p.price} | ${p.url} | ${p.image} | ${p.seller}]\n`;
    });

    if (currentLang === 'fr') {
        response += "\nCliquez sur 'Voir Produit' pour plus de détails. Avez-vous besoin d'aide avec autre chose?";
    } else {
        response += "\nKlike sou 'Wè Pwodwi' pou plis detay. Ou bezwen èd ak lòt bagay?";
    }

    return response;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    addAIMessage('user', msg);

    const typing = document.createElement('div');
    typing.id = 'ai-typing';
    typing.style.margin = '10px';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    document.getElementById('ai-chat-body').appendChild(typing);

    // Vérifier d'abord si c'est une question courante
    const autoResponse = getAutoResponse(msg);
    if (autoResponse) {
        const typingElem = document.getElementById('ai-typing');
        if (typingElem) typingElem.remove();
        addAIMessage('assistant', autoResponse);
        return;
    }

    // Recherche locale dans le catalogue
    const localResults = searchCatalogLocally(msg);
    if (localResults.length > 0) {
        const typingElem = document.getElementById('ai-typing');
        if (typingElem) typingElem.remove();
        const productResponse = generateProductResponse(localResults, msg);
        addAIMessage('assistant', productResponse);
        return;
    }

    // Si pas de résultats locaux, essayer l'API
    try {
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, catalog: aiCatalog, lang: currentLang })
        });

        const data = await response.json();
        const typingElem = document.getElementById('ai-typing');
        if (typingElem) typingElem.remove();

        if (data.choices && data.choices[0]) {
            addAIMessage('assistant', data.choices[0].message.content);
        }
    } catch (err) {
        if (document.getElementById('ai-typing')) document.getElementById('ai-typing').remove();

        // Fallback si l'API échoue
        if (currentLang === 'fr') {
            addAIMessage('assistant', "Je suis en train d'apprendre! 🤖 Pour l'instant, vous pouvez parcourir notre catalogue ou me poser des questions sur les prix, la livraison ou le paiement.");
        } else {
            addAIMessage('assistant', "Mwen ap aprann! 🤖 Pou kounye a, ou ka parkouwi katalòg nou an oswa poze m kesyon sou pri, livrezon oswa peyman.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('ai-input');
    if (inp) {
        inp.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAIMessage(); });
    }
    setTimeout(loadSupabaseCatalogForAI, 2000);
});
