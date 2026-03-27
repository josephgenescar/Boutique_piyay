let productCatalog = [];

async function loadCatalog() {
    try {
        const response = await fetch('/search.json');
        productCatalog = await response.json();
        console.log("Katalòg chaje:", productCatalog.length, "pwodwi.");
    } catch (e) {
        console.error("Erè katalòg:", e);
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
    let i = 0;
    element.innerHTML = "";
    return new Promise(resolve => {
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 20);
                document.getElementById('ai-chat-body').scrollTop = document.getElementById('ai-chat-body').scrollHeight;
            } else {
                resolve();
            }
        }
        type();
    });
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'flex';
        localStorage.setItem('ai_chat_closed', 'false');
    } else {
        box.style.display = 'none';
        localStorage.setItem('ai_chat_closed', 'true'); // Sonje ke itilizatè a fèmen l
    }
}

async function askPiyayAI(message) {
    try {
        const response = await fetch("/.netlify/functions/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, catalog: productCatalog })
        });
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (err) {
        throw err;
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block;">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#f1f5f9; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd;">⏳ M ap ekri...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        const responseId = "resp-" + Date.now();
        chatBody.innerHTML += `<div style="margin-bottom:15px;"><span id="${responseId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6;"></span></div>`;
        await typeWriter(aiResponse, responseId);
    } catch (e) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.innerHTML = `<span style="color:red; font-size:12px;">Erè koneksyon...</span>`;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();

    // Tcheke si itilizatè a te fèmen l anvan
    const isClosed = localStorage.getItem('ai_chat_closed');

    if (isClosed !== 'true') {
        setTimeout(async () => {
            const box = document.getElementById('ai-chat-box');
            box.style.display = 'flex';
            const chatBody = document.getElementById('ai-chat-body');
            chatBody.innerHTML = "";

            const welcomeId = "welcome-msg";
            chatBody.innerHTML = `<div style="margin-bottom:15px;"><span id="${welcomeId}" style="background:#f1f5f9; color:#333; padding:10px 15px; border-radius:18px; font-size:14px; display:inline-block; border:1px solid #ddd; line-height:1.6;"></span></div>`;

            const introText = `${getGreeting()}! Onè respè pou ou. Mwen se asistan Boutique Piyay. Eske ou se yon Kliyan, yon Machann, oswa yon Afilye? Di m kisa w ap chèche jodia.`;
            await typeWriter(introText, welcomeId);
        }, 3000);
    }

    document.getElementById('ai-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAIMessage();
    });
});
