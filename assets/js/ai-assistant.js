let productCatalog = [];

const AI_SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const AI_SUP_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";

async function loadCatalog() {
    try {
        const resp = await fetch('/search.json');
        let staticProds = [];
        if (resp.ok) staticProds = await resp.json();

        const { data: dbProds, error } = await window.supabase.createClient(AI_SUP_URL, AI_SUP_KEY)
            .from('user_products')
            .select('title, price, category, image_url, id')
            .eq('is_approved', true);

        if (dbProds) {
            const formattedDbProds = dbProds.map(p => ({
                title: p.title,
                price: p.price + " HTG",
                url: `/pwodwi-machann.html?id=${p.id}`,
                seller_name: "Machann Boutique Piyay"
            }));
            productCatalog = [...staticProds, ...formattedDbProds];
        } else {
            productCatalog = staticProds;
        }
    } catch (e) {
        console.error("Erè chajman.");
    }
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjou";
    if (hour < 17) return "Bon apremidi";
    return "Bonswa";
}

async function typeWriter(text, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    let i = 0;
    element.innerHTML = "";
    return new Promise(resolve => {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 15);
                const body = document.getElementById('ai-chat-body');
                if (body) body.scrollTop = body.scrollHeight;
            } else {
                resolve();
            }
        }
        type();
    });
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (box) box.style.display = (box.style.display === 'none' || box.style.display === '') ? 'flex' : 'none';
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
        chatBody.innerHTML += `<div style="margin-bottom:15px;"><span id="${responseId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6;"></span></div>`;
        await typeWriter(aiResponse, responseId);
    } catch (e) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).innerHTML = `<span style="color:red; font-size:12px;">M gen yon ti pwoblèm koneksyon.</span>`;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    setTimeout(async () => {
        const box = document.getElementById('ai-chat-box');
        if (box) {
            box.style.display = 'flex';
            const chatBody = document.getElementById('ai-chat-body');
            chatBody.innerHTML = "";
            const welcomeId = "welcome-msg";
            chatBody.innerHTML = `<div style="margin-bottom:15px;"><span id="${welcomeId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6;"></span></div>`;

            // ✅ AKÈY PWOFE SYONÈL SAN PALE TEKNIK
            const introText = `${getGreeting()}! Onè respè. Mwen se asistan pwofesyonèl Boutique Piyay. Mwen la pou m ede w jwenn tout sa w ap chèche sou platfòm nan. Èske w se yon kliyan, yon machann, oswa yon afilye?`;
            await typeWriter(introText, welcomeId);
        }
    }, 3000);

    document.getElementById('ai-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
});
