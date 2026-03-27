let productCatalog = [];

const AI_SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const AI_SUP_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";

async function loadCatalog() {
    try {
        const resp = await fetch('/search.json');
        let staticProds = [];
        if (resp.ok) staticProds = await resp.json();

        const { data: dbProds } = await window.supabase.createClient(AI_SUP_URL, AI_SUP_KEY)
            .from('user_products').select('title, price, category, image_url, id').eq('is_approved', true);

        if (dbProds) {
            const formattedDbProds = dbProds.map(p => ({
                title: p.title,
                price: p.price + " HTG",
                url: `/pwodwi-machann.html?id=${p.id}`,
                image_url: p.image_url
            }));
            productCatalog = [...staticProds, ...formattedDbProds];
        } else {
            productCatalog = staticProds;
        }
    } catch (e) { console.error("Error loading catalog"); }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjou";
    if (hour < 17) return "Bon apremidi";
    return "Bonswa";
}

function formatAIResponse(text) {
    // Detekte fòma pwodwi: [PRODUCT: Tit | Pri | Lyen | Imaj]
    const productRegex = /\[PRODUCT:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\]/g;

    let html = text.replace(productRegex, (match, title, price, url, img) => {
        return `
        <div style="margin-top:10px; border:1px solid #eee; border-radius:12px; overflow:hidden; background:white; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
            <img src="${img || '/assets/images/logo.png'}" style="width:100%; height:120px; object-fit:cover;" onerror="this.src='/assets/images/logo.png'">
            <div style="padding:10px;">
                <div style="font-weight:800; font-size:13px; color:#111; margin-bottom:4px;">${title}</div>
                <div style="color:#ff4747; font-weight:900; font-size:14px; margin-bottom:8px;">${price}</div>
                <a href="${url}" target="_blank" style="display:block; text-align:center; background:#ff4747; color:white; text-decoration:none; padding:8px; border-radius:8px; font-size:12px; font-weight:800;">WÈ PWODWI</a>
            </div>
        </div>`;
    });

    // Rann lòt lyen yo klikab
    return html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#ff4747; font-weight:700;">$1</a>');
}

async function typeWriter(text, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const formattedHTML = formatAIResponse(text);

    // Pou pèfòmans ak presizyon, nou afiche HTML a dirèkteman si gen pwodwi
    if (text.includes('[PRODUCT:')) {
        element.innerHTML = formattedHTML;
    } else {
        let i = 0;
        element.innerHTML = "";
        return new Promise(resolve => {
            function type() {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, 10);
                    const body = document.getElementById('ai-chat-body');
                    if (body) body.scrollTop = body.scrollHeight;
                } else { resolve(); }
            }
            type();
        });
    }
}

async function askPiyayAI(message) {
    const response = await fetch("/.netlify/functions/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, catalog: productCatalog })
    });
    const data = await response.json();
    return data.choices[0].message.content;
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block;">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#f1f5f9; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd;">⏳ M ap chèche sa pou ou...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        const responseId = "resp-" + Date.now();
        chatBody.innerHTML += `<div style="margin-bottom:15px;"><span id="${responseId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6; width:100%; box-sizing:border-box;"></span></div>`;
        await typeWriter(aiResponse, responseId);
    } catch (e) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).innerHTML = `<span style="color:red; font-size:12px;">Erè koneksyon.</span>`;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    setTimeout(async () => {
        const box = document.getElementById('ai-chat-box');
        if (box) {
            box.style.display = 'flex';
            const chatBody = document.getElementById('ai-chat-body');
            if (chatBody) {
                chatBody.innerHTML = "";
                const welcomeId = "welcome-msg";
                chatBody.innerHTML = `<div style="margin-bottom:15px;"><span id="${welcomeId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6;"></span></div>`;
                const introText = `${getGreeting()}! Onè respè. Mwen se gide pwofesyonèl Boutique Piyay. Mwen la pou m ede w jwenn tout sa w ap chèche epi gide w sou platfòm nan. Kijan m ka sèvi w jodi a?`;
                await typeWriter(introText, welcomeId);
            }
        }
    }, 3000);

    document.getElementById('ai-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
});
