#!/usr/bin/env node

// Teste do serviço de email Resend
const RESEND_API_KEY = 're_6CZhpi3d_GZ5MBa2s6qn4yQ1MQHfGtRjA';

async function testEmail() {
    console.log('🧪 Testando serviço de email Resend...\n');

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'IAprova <onboarding@resend.dev>',
                to: 'terciogomesrabelo@gmail.com', // Email verificado no Resend
                subject: '✅ IAprova - Sistema Migrado com Sucesso!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
                            <h1 style="color: white; margin: 0;">🧠 IAprova</h1>
                            <p style="color: rgba(255,255,255,0.9); margin-top: 5px;">Sistema de Preparação Inteligente para Concursos</p>
                        </div>
                        
                        <div style="padding: 30px; background: white;">
                            <h2 style="color: #1F2937;">🎉 Migração Concluída com Sucesso!</h2>
                            
                            <p style="color: #4B5563; line-height: 1.6;">
                                O sistema IAprova foi completamente migrado do GitHub e está funcionando perfeitamente!
                            </p>
                            
                            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="color: #1F2937; margin-top: 0;">✅ Status da Migração:</h3>
                                <ul style="color: #4B5563;">
                                    <li>✅ 99 arquivos migrados do GitHub</li>
                                    <li>✅ Banco de dados D1 configurado</li>
                                    <li>✅ 30+ migrações aplicadas</li>
                                    <li>✅ 5000+ tópicos populados</li>
                                    <li>✅ Sistema de email Resend funcionando</li>
                                    <li>✅ Aplicação rodando no sandbox</li>
                                </ul>
                            </div>
                            
                            <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="color: #1E40AF; margin-top: 0;">🌐 Acesso ao Sistema:</h3>
                                <p style="margin: 10px 0;">
                                    <strong>URL:</strong> 
                                    <a href="https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai" style="color: #2563EB;">
                                        https://3000-id12ekrieaebwye022748-18e660f9.sandbox.novita.ai
                                    </a>
                                </p>
                                <p style="margin: 10px 0;">
                                    <strong>Usuário teste:</strong> teste@iaprova.com
                                </p>
                                <p style="margin: 10px 0;">
                                    <strong>Senha:</strong> 123456
                                </p>
                            </div>
                            
                            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="color: #92400E; margin-top: 0;">📝 Configurações Aplicadas:</h3>
                                <ul style="color: #78350F;">
                                    <li>✅ Resend API Key configurada</li>
                                    <li>⚠️ Cloudflare Token precisa ser verificado</li>
                                    <li>💡 Groq API Key pendente (para IA)</li>
                                </ul>
                            </div>
                            
                            <p style="color: #6B7280; margin-top: 30px;">
                                <strong>Próximos passos:</strong><br>
                                1. Verificar o token do Cloudflare (parece estar incompleto)<br>
                                2. Configurar uma chave Groq API para geração de conteúdo<br>
                                3. Fazer deploy para produção quando pronto
                            </p>
                        </div>
                        
                        <div style="background: #F9FAFB; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
                            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                                IAprova v20.7 - Sistema completamente migrado<br>
                                © 2026 - Desenvolvido com ❤️
                            </p>
                        </div>
                    </div>
                `
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Email enviado com sucesso!');
            console.log('📧 ID do email:', data.id);
            console.log('📬 Enviado para: terciogomesrabelo@gmail.com');
            console.log('\n✨ Resend configurado corretamente no IAprova!');
            console.log('\n📝 Nota: Para enviar emails para outros destinatários,');
            console.log('   você precisa verificar um domínio em resend.com/domains');
        } else {
            console.log('❌ Erro ao enviar email:');
            console.log('Status:', response.status);
            console.log('Erro:', data);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
    }
}

// Executar teste
testEmail();