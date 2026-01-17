
const API_KEY = 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY';

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{
            parts: [{
                text: 'Responda apenas: OK'
            }]
        }]
    })
})
.then(res => res.json())
.then(data => {
    if (data.candidates) {
        console.log('✅ Gemini API funcionando!');
        console.log('Resposta:', data.candidates[0].content.parts[0].text);
    } else {
        console.error('❌ Erro:', data);
    }
});
