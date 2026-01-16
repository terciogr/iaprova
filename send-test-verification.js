// Script para enviar email de teste de verificação
const RESEND_API_KEY = 're_jM7CRGCv_F2PvEN3YayRW2XgRuegXk7sz';

// Token de teste (você pode mudar)
const TEST_TOKEN = 'TestToken123ABC456DEF789GHI012JKL';

async function sendVerificationEmail() {
  console.log('🚀 Enviando email de verificação de teste...');
  
  // URL do sistema no sandbox
  const verificationUrl = `https://3000-irlvrmbehvaldb16ba7lm-b9b802c4.sandbox.novita.ai/verificar-email?token=${TEST_TOKEN}`;
  
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
        subject: '🎓 Verifique seu email - IAprova',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Verificação de Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
            <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
              <tr>
                <td align="center">
                  <table cellpadding="0" cellspacing="0" width="600" style="background-color: white; border-radius: 10px;">
                    <tr>
                      <td style="padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; text-align: center; margin: 0;">🎓 IAprova</h1>
                        <p style="color: white; text-align: center; margin: 10px 0 0 0;">Preparação Inteligente para Concursos</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333; margin-bottom: 20px;">Olá, Tércio!</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                          Este é um <strong>email de teste</strong> para verificar que o link de verificação está funcionando corretamente.
                        </p>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
                          Clique no botão abaixo para testar a verificação:
                        </p>
                        <table cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td align="center">
                              <a href="${verificationUrl}" 
                                style="display: inline-block; 
                                       padding: 15px 40px; 
                                       background-color: #667eea; 
                                       color: white; 
                                       text-decoration: none; 
                                       border-radius: 5px; 
                                       font-weight: bold;
                                       font-size: 16px;">
                                ✅ Verificar Email Agora
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #999; font-size: 14px; margin-top: 30px;">
                          Se o botão não funcionar, copie e cole este link no seu navegador:
                        </p>
                        <p style="color: #3b82f6; font-size: 14px; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 5px;">
                          ${verificationUrl}
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                        <div style="background: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px;">
                          <p style="color: #92400e; font-size: 14px; margin: 0;">
                            <strong>⚠️ Nota de Teste:</strong><br>
                            Este é um email de teste. O token usado é: <code style="background: #fff; padding: 2px 5px; border-radius: 3px;">${TEST_TOKEN}</code>
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 30px; background: #f9fafb; border-radius: 0 0 10px 10px;">
                        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                          © 2024 IAprova - Sistema de Preparação para Concursos
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    const result = await response.text();
    console.log('📧 Status:', response.status);
    console.log('📧 Resposta:', result);
    
    if (response.ok) {
      console.log('✅ Email de verificação enviado com sucesso!');
      console.log('📬 Verifique sua caixa de entrada: terciogomesrabelo@gmail.com');
      console.log('🔗 Ao clicar no link, você deve ser direcionado para:');
      console.log('   ', verificationUrl);
      console.log('🎯 Token de teste:', TEST_TOKEN);
    } else {
      console.log('❌ Erro ao enviar email');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

sendVerificationEmail();