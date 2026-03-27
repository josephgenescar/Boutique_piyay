async function askPiyayAI(message) {
    console.log("Ap voye mesaj bay AI:", message);

    try {
        const response = await fetch("/.netlify/functions/ai-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        console.log("Repons sèvè Netlify:", response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Erè nan sèvè Netlify:", errorText);
            throw new Error(`Erè ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Done AI resevwa:", data);
        return data.choices[0].message.content;
    } catch (err) {
        console.error("Erè nan askPiyayAI:", err);
        throw err;
    }
}

function toggleAIChat() {
    const box = document.getElementById('ai-chat-box');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('ai-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('ai-chat-body');
    chatBody.innerHTML += `<div style="margin-bottom:10px; text-align:right;"><span style="background:#ff4747; color:white; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">${msg}</span></div>`;
    input.value = '';

    const loadingId = "loading-" + Date.now();
    chatBody.innerHTML += `<div id="${loadingId}" style="margin-bottom:10px;"><span style="background:#eee; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block;">⏳ M ap reflechi...</span></div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
        const aiResponse = await askPiyayAI(msg);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        chatBody.innerHTML += `<div style="margin-bottom:10px;"><span style="background:#f1f5f9; color:#333; padding:8px 12px; border-radius:15px; font-size:13px; display:inline-block; border:1px solid #ddd;">${aiResponse}</span></div>`;
    } catch (e) {
        console.error("Erè final nan sendAIMessage:", e);
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.innerHTML = `<span style="color:red; font-size:12px;">Erè koneksyon: ${e.message}</span>`;
    }
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Louvri chat la otomatikman apre 3 segonn
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const box = document.getElementById('ai-chat-box');
        if (box && (box.style.display === 'none' || box.style.display === '')) {
            box.style.display = 'flex';
        }
    }, 3000);

    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendAIMessage();
            }
        });
    }
});
