#!/usr/bin/env node

// Teste da API Gemini
const GEMINI_API_KEY = 'AIzaSyAQE2bq7rxeWzYjIVwEJ5ylvZpd_HORUNI';

async function testGemini() {
    console.log('🧪 Testando API Gemini...\n');

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Crie um resumo de 3 linhas sobre o sistema IAprova para concursos públicos.'
                        }]
                    }]
                }),
            }
        );

        const data = await response.json();

        if (response.ok) {
            console.log('✅ API Gemini funcionando perfeitamente!\n');
            console.log('🤖 Modelo: gemini-pro');
            console.log('📝 Resposta da IA:\n');
            console.log(data.candidates[0].content.parts[0].text);
            console.log('\n✨ Gemini API configurada com sucesso no IAprova!');
        } else {
            console.log('❌ Erro na API Gemini:');
            console.log('Status:', response.status);
            console.log('Erro:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

// Executar teste
testGemini();