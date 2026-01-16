// Serviço de Email usando Resend API
// Para produção, configure a API key no Cloudflare Workers

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor(apiKey: string) {
    this.config = {
      apiKey: apiKey || 'demo_key', // Use uma chave real em produção
      fromEmail: 'onboarding@resend.dev',
      fromName: 'IAprova - Preparação para Concursos'
    };
  }

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      // Em desenvolvimento, apenas loga o email
      if (this.config.apiKey === 'demo_key') {
        console.log('📧 Email simulado:', {
          to: params.to,
          subject: params.subject,
          preview: params.text?.substring(0, 100)
        });
        return true;
      }

      // Em produção, usa Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text
        }),
      });

      console.log('📧 Enviando email para:', params.to);
      console.log('📧 Resposta Resend:', response.status);
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Erro ao enviar email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  // Template de email de verificação
  getVerificationEmailTemplate(userName: string, verificationLink: string): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #122D6A 0%, #2A4A9F 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: #122D6A; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 IAprova</h1>
            <p style="margin: 0;">Sua jornada rumo à aprovação começa aqui!</p>
          </div>
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            <p>Bem-vindo ao <strong>IAprova</strong>, a plataforma inteligente de preparação para concursos públicos.</p>
            
            <p>Para começar a usar sua conta, precisamos verificar seu email. Clique no botão abaixo:</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button" style="color: white;">✅ Verificar Email</a>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Este link é válido por 24 horas. Após esse período, você precisará solicitar um novo link.
            </div>
            
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #122D6A; font-size: 14px;">${verificationLink}</p>
            
            <h3>O que você terá acesso:</h3>
            <ul>
              <li>📚 Plano de estudos personalizado com IA</li>
              <li>📝 Conteúdo gerado especificamente para seu concurso</li>
              <li>🎯 Metas semanais adaptativas</li>
              <li>📊 Acompanhamento detalhado do progresso</li>
              <li>🤖 Assistente IA para tirar dúvidas</li>
            </ul>
            
            <p>Se você não criou esta conta, pode ignorar este email com segurança.</p>
            
            <div class="footer">
              <p>© 2025 IAprova - Todos os direitos reservados</p>
              <p>Este é um email automático, por favor não responda.</p>
              <p>Precisa de ajuda? Entre em contato: suporte@iaprova.com.br</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Olá, ${userName}!

Bem-vindo ao IAprova, a plataforma inteligente de preparação para concursos públicos.

Para verificar seu email, acesse o link abaixo:
${verificationLink}

Este link é válido por 24 horas.

O que você terá acesso:
- Plano de estudos personalizado com IA
- Conteúdo gerado especificamente para seu concurso
- Metas semanais adaptativas
- Acompanhamento detalhado do progresso
- Assistente IA para tirar dúvidas

Se você não criou esta conta, pode ignorar este email.

Atenciosamente,
Equipe IAprova
    `;

    return { html, text };
  }

  // Template de email de boas-vindas (após verificação)
  getWelcomeEmailTemplate(userName: string, loginLink: string): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 14px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .tip { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Verificado com Sucesso!</h1>
          </div>
          <div class="content">
            <h2>Parabéns, ${userName}!</h2>
            <p>Seu email foi verificado e sua conta está ativa. Agora você tem acesso completo ao IAprova!</p>
            
            <div class="tip">
              <strong>💡 Dica para começar:</strong>
              <ol style="margin: 10px 0;">
                <li>Complete a entrevista inicial para personalizar seu plano</li>
                <li>Defina a data da sua prova</li>
                <li>Gere suas primeiras metas semanais</li>
                <li>Comece a estudar com conteúdo gerado por IA</li>
              </ol>
            </div>
            
            <div style="text-align: center;">
              <a href="${loginLink}" class="button" style="color: white;">🚀 Acessar IAprova</a>
            </div>
            
            <p>Estamos aqui para ajudar você a conquistar sua aprovação!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Parabéns, ${userName}!

Seu email foi verificado com sucesso!
Agora você tem acesso completo ao IAprova.

Acesse sua conta: ${loginLink}

Dicas para começar:
1. Complete a entrevista inicial
2. Defina a data da sua prova
3. Gere suas metas semanais
4. Comece a estudar

Boa sorte nos estudos!
Equipe IAprova
    `;

    return { html, text };
  }
}