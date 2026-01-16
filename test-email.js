// Script para testar o envio de email com Resend
const RESEND_API_KEY = 're_jM7CRGCv_F2PvEN3YayRW2XgRuegXk7sz';

async function testEmail() {
  console.log('🚀 Testando envio de email com Resend...');
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: ['terciogomesrabelo@gmail.com'],
        subject: 'Teste IAprova - Email funcionando!',
        html: `
          <h1>🎉 Email funcionando!</h1>
          <p>Parabéns! O sistema de email do IAprova está funcionando corretamente.</p>
          <p>Este é um email de teste enviado via Resend API.</p>
          <p><strong>Próximos passos:</strong></p>
          <ul>
            <li>Fazer cadastro no sistema</li>
            <li>Verificar o email de confirmação</li>
            <li>Fazer login</li>
          </ul>
          <p>Acesse o sistema em: <a href="https://3000-irlvrmbehvaldb16ba7lm-b9b802c4.sandbox.novita.ai">IAprova</a></p>
        `,
      }),
    });

    const result = await response.text();
    console.log('📧 Status:', response.status);
    console.log('📧 Resposta:', result);
    
    if (response.ok) {
      console.log('✅ Email enviado com sucesso!');
      console.log('📬 Verifique sua caixa de entrada: terciogomesrabelo@gmail.com');
    } else {
      console.log('❌ Erro ao enviar email');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testEmail();