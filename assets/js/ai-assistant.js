let aiCatalog = [];

// ✅ Fonksyon pou chèche pwodwi "live" nan Supabase
async function loadSupabaseCatalogForAI() {
    if (!window.supabaseMain) return;
    try {
        // Chèche pwodwi yo ansanm ak enfòmasyon sou machann yo (profiles)
        const { data, error } = await window.supabaseMain
            .from('user_products')
            .select(`
                id,
                title,
                price,
                image_url,
                category,
                profiles (full_name)
            `)
            .limit(50); // Nou pran 50 pi resan yo pou AI a pa parèt twò lou

        if (data) {
            aiCatalog = data.map(p => ({
                title: p.title,
                price: p.price + " HTG",
                url: `${window.location.origin}/pwodwi-machann.html?id=${p.id}`,
                image: p.image_url || '/assets/images/logo.png',
                seller: p.profiles ? p.profiles.full_name : "Boutique Piyay"
            }));
        }
    } catch (e) {
        console.error("AI Catalog Load Error:", e);
    }
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (!box) return;
    const isVisible = box.style.display === 'flex';
    box.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
        // Chak fwa li ouvri chat la, nou rafrechi katalòg la pou l "live"
        loadSupabaseCatalogForAI();
        if (document.getElementById('ai-chat-body').innerHTML === "") {
            addAIMessage("assistant", "Bonjou! Mwen se **Piyay AI**, asistan entèlijan Boutique Piyay la. Mwen konekte an dirèk ak tout machann nou yo. Ki pwodwi w ap chèche jodi a? 😊");
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

    // Ranje tèks la pou li bèl (Markdown-ish)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Parse pwodwi yo [PRODUCT: Tit | Pri | Lyen | Imaj]
    let htmlContent = formattedText.replace(/\[PRODUCT:(.*?)\]/g, (match, content) => {
        const parts = content.split('|').map(p => p.trim());
        const title = parts[0] || '';
        const price = parts[1] || '';
        const url   = parts[2] || '#';
        const img   = parts[3] || '/assets/images/logo.png';

        return `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:15px; overflow:hidden; margin-top:10px; width:100%; max-width:220px; box-shadow:0 10px 25px rgba(0,0,0,0.05); transition:0.3s;">
                <img src="${img}" style="width:100%; height:130px; object-fit:cover; background:#f8fafc;">
                <div style="padding:12px;">
                    <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${title}</div>
                    <div style="font-size:14px; font-weight:900; color:#ff4747; margin-bottom:10px;">${price}</div>
                    <a href="${url}" style="display:block; text-align:center; background:#ff4747; color:white; text-decoration:none; padding:8px; border-radius:10px; font-size:12px; font-weight:800; transition:0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Wè Pwodwi</a>
                </div>
            </div>
        `;
    });

    div.innerHTML = `
        <div style="max-width:85%; padding:12px 16px; border-radius:18px; font-size:14px; line-height:1.5;
                    ${role === 'user' ? 'background:#ff4747; color:white; border-bottom-right-radius:4px;' : 'background:#f1f5f9; color:#1e293b; border-bottom-left-radius:4px;'}">
            ${htmlContent}
        </div>
    `;

    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    addAIMessage('user', msg);

    // Show typing
    const typing = document.createElement('div');
    typing.id = 'ai-typing';
    typing.style.margin = '10px';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    document.getElementById('ai-chat-body').appendChild(typing);
    document.getElementById('ai-chat-body').scrollTop = document.getElementById('ai-chat-body').scrollHeight;

    try {
        const response = await fetch('/.netlify/functions/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                catalog: aiCatalog // Voye katalòg Supabase la bay AI a
            })
        });

        const data = await response.json();
        const typingElem = document.getElementById('ai-typing');
        if (typingElem) typingElem.remove();

        if (data.choices && data.choices[0]) {
            addAIMessage('assistant', data.choices[0].message.content);
        } else {
            addAIMessage('assistant', "Mwen regrèt, mwen pa ka reponn kounye a. Tanpri eseye ankò.");
        }
    } catch (err) {
        console.error(err);
        const typingElem = document.getElementById('ai-typing');
        if (typingElem) typingElem.remove();
        addAIMessage('assistant', "Mwen gen yon ti pwoblèm koneksyon. Verifye entènèt ou.");
    }
}

// Event listener
document.addEventListener('DOMContentLoaded', () => {
    const inp = document.getElementById('ai-input');
    if (inp) {
        inp.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendAIMessage();
        });
    }
    // Premye chajman katalòg
    setTimeout(loadSupabaseCatalogForAI, 2000);
});
