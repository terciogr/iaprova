const GEMINI_API_KEY = 'AIzaSyDPtVE_2EG7r39tcbsnKwpWN9Vr_ZyY0XY';

async function testGemini() {
  console.log('🧪 Testando NOVA API Gemini...');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'Responda apenas: OK FUNCIONANDO'
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 10
      }
    })
  });

  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Resposta:', result.candidates?.[0]?.content?.parts?.[0]?.text || 'ERRO');
  
  if (response.ok) {
    console.log('✅ GEMINI API FUNCIONANDO!');
  } else {
    console.log('❌ Erro:', result.error);
  }
}

testGemini().catch(console.error);
