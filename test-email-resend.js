const RESEND_API_KEY = 're_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA';

async function testEmail() {
  console.log('📧 Testando envio de email com Resend...');
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: 'terciogomesrabelo@gmail.com',
      subject: 'Teste IAprova - Email Funcionando!',
      html: '<h1>Email funcionando!</h1><p>Se você recebeu este email, o sistema está configurado corretamente.</p>',
    }),
  });

  const result = await response.json();
  console.log('Resultado:', result);
}

testEmail().catch(console.error);
