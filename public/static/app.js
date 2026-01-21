// Verificação inicial
console.log('🚀 IAprova - Iniciando aplicação...');

// Estado da aplicação
let currentUser = null;
let currentStep = 'login';
let interviewData = {};
let disciplinasDisponiveis = [];
let currentTheme = localStorage.getItem('theme') || 'light';
let customColors = JSON.parse(localStorage.getItem('customColors') || '{"primary": "#8b5cf6", "secondary": "#ec4899", "accent": "#3b82f6"}');
let rgbColors = JSON.parse(localStorage.getItem('rgbColors') || '{"primary": "#8b5cf6", "secondary": "#ec4899", "accent": "#3b82f6"}');

// Temas disponíveis - EXPANDIDO COM MAIS VARIAÇÕES
const themes = {
  light: {
    // Backgrounds
    bg: 'bg-white',
    bgAlt: 'bg-gray-50',
    card: 'bg-white',
    cardHover: 'hover:bg-gray-50',
    
    // Textos
    text: 'text-gray-800',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-500',
    textDark: 'text-gray-900',
    
    // Bordas
    border: 'border-gray-200',
    borderHover: 'hover:border-gray-300',
    
    // Inputs
    input: 'bg-white border-gray-300 text-gray-900',
    inputFocus: 'focus:border-[#1A3A7F] focus:ring-[#1A3A7F]',
    
    // Buttons secundários
    btnSecondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    btnDanger: 'bg-[#D0D9EB] text-[#122D6A] hover:bg-[#C5D1E8]',
    
    // Alertas e notificações
    alert: 'bg-[#E8EDF5] border-[#C5D1E8] text-[#0D1F4D]',
    success: 'bg-[#E8EDF5] border-[#C5D1E8] text-[#0D1F4D]',
    warning: 'bg-[#E8EDF5] border-[#C5D1E8] text-[#122D6A]',
    error: 'bg-[#E8EDF5] border-[#C5D1E8] text-[#0D1F4D]',
    
    // Outros
    shadow: 'shadow-md',
    divider: 'border-gray-200'
  },
  dark: {
    // Backgrounds
    bg: 'bg-gray-900',
    bgAlt: 'bg-gray-800',
    card: 'bg-gray-800',
    cardHover: 'hover:bg-gray-750',
    
    // Textos
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    textMuted: 'text-gray-400',
    textDark: 'text-white',
    
    // Bordas
    border: 'border-gray-700',
    borderHover: 'hover:border-gray-600',
    
    // Inputs
    input: 'bg-gray-700 border-gray-600 text-gray-100',
    inputFocus: 'focus:border-[#2A4A9F] focus:ring-[#2A4A9F]',
    
    // Buttons secundários
    btnSecondary: 'bg-gray-700 text-gray-100 hover:bg-gray-600',
    btnDanger: 'bg-[#0A1839] text-[#D0D9EB] hover:bg-[#0A1839]',
    
    // Alertas e notificações
    alert: 'bg-[#0A1839]/30 border-[#1A3A7F] text-[#8FA4CC]',
    success: 'bg-[#0A1839]/30 border-[#1A3A7F] text-[#8FA4CC]',
    warning: 'bg-[#0A1839]/30 border-[#1A3A7F] text-[#6B83B5]',
    error: 'bg-[#0A1839]/30 border-[#1A3A7F] text-[#8FA4CC]',
    
    // Outros
    shadow: 'shadow-2xl shadow-black/50',
    divider: 'border-gray-700'
  }
};

// ══════════════════════════════════════════════════════════════════
// PALETA DE CORES CUSTOMIZADA - Azul Marinho Profissional
// Cor base: RGB(18, 45, 106) = #122D6A
// ══════════════════════════════════════════════════════════════════
const BRAND_COLORS = {
  // Tons principais do azul marinho
  primary: '#122D6A',      // RGB(18, 45, 106) - Cor principal
  primaryDark: '#0D1F4D',  // Mais escuro para hover
  primaryLight: '#1A3A7F', // Um pouco mais claro
  primaryLighter: '#2A4A9F', // Para gradientes
  
  // Tons claros para backgrounds
  bgLight: '#E8EDF5',      // Background claro sutil
  bgLighter: '#F3F6FA',    // Background muito claro
  
  // Bordas
  borderLight: '#C5D1E8',  // Borda clara
  borderMedium: '#8FA4CC', // Borda média
  
  // Texto
  textOnPrimary: '#FFFFFF',
  textPrimary: '#122D6A',
  textLight: '#4A6491'
};

// Paleta monocromática azul marinho - tons profissionais
const colorPalette = {
  light: {
    // Tons monocromáticos azul marinho sutis
    primary: {
      gradient: 'from-[#122D6A] to-[#0D1F4D]',
      text: 'text-[#122D6A]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#122D6A]'
    },
    secondary: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#1A3A7F]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#1A3A7F]'
    },
    success: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#122D6A]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#1A3A7F]'
    },
    warning: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#122D6A]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#1A3A7F]'
    },
    info: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#122D6A]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#1A3A7F]'
    },
    accent: {
      gradient: 'from-[#122D6A] to-[#0D1F4D]',
      text: 'text-[#122D6A]',
      bg: 'bg-[#E8EDF5]',
      border: 'border-[#C5D1E8]',
      icon: 'text-[#122D6A]'
    }
  },
  dark: {
    // Tons monocromáticos azul marinho para dark mode
    primary: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    },
    secondary: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    },
    success: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    },
    warning: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    },
    info: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    },
    accent: {
      gradient: 'from-[#1A3A7F] to-[#122D6A]',
      text: 'text-[#8FA4CC]',
      bg: 'bg-[#122D6A]/20',
      border: 'border-[#1A3A7F]',
      icon: 'text-[#8FA4CC]'
    }
  }
};

// Helper para acessar paleta atual
const c = (type = 'primary') => colorPalette[currentTheme][type] || colorPalette[currentTheme].primary;

// Helper para acessar tema atual
const t = () => themes[currentTheme];

// ══════════════════════════════════════════════════════════════════
// SISTEMA DE MODAIS CUSTOMIZADOS - Substitui alerts/confirms nativos
// ══════════════════════════════════════════════════════════════════

// Container global para modais
function getModalContainer() {
  let container = document.getElementById('modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modal-container';
    document.body.appendChild(container);
  }
  return container;
}

// Modal de Alerta (substitui alert())
function showModal(message, options = {}) {
  const {
    type = 'info',        // 'success', 'error', 'warning', 'info'
    title = null,
    buttonText = 'OK',
    onClose = null
  } = options;
  
  const icons = {
    success: '<i class="fas fa-check-circle text-green-500 text-4xl"></i>',
    error: '<i class="fas fa-times-circle text-red-500 text-4xl"></i>',
    warning: '<i class="fas fa-exclamation-triangle text-yellow-500 text-4xl"></i>',
    info: '<i class="fas fa-info-circle text-[#122D6A] text-4xl"></i>'
  };
  
  const titles = {
    success: 'Sucesso!',
    error: 'Erro',
    warning: 'Atenção',
    info: 'Informação'
  };
  
  const modalId = 'modal-' + Date.now();
  const container = getModalContainer();
  
  const modalHTML = `
    <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeModal('${modalId}')"></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform animate-scaleIn">
        <!-- Ícone -->
        <div class="flex justify-center mb-4">
          ${icons[type]}
        </div>
        
        <!-- Título -->
        <h3 class="text-xl font-bold text-center text-gray-800 mb-3">
          ${title || titles[type]}
        </h3>
        
        <!-- Mensagem -->
        <div class="text-gray-600 text-center mb-6 whitespace-pre-line text-sm leading-relaxed">
          ${message.replace(/\\n/g, '<br>')}
        </div>
        
        <!-- Botão -->
        <button 
          onclick="closeModal('${modalId}')"
          class="w-full bg-[#122D6A] hover:bg-[#0D1F4D] text-white py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02]"
        >
          ${buttonText}
        </button>
      </div>
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
    </style>
  `;
  
  container.innerHTML += modalHTML;
  
  // Guardar callback para quando fechar
  if (onClose) {
    document.getElementById(modalId)._onClose = onClose;
  }
}

// Modal de Confirmação (substitui confirm())
function showConfirm(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Confirmar',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      type = 'warning'
    } = options;
    
    const icons = {
      warning: '<i class="fas fa-question-circle text-[#122D6A] text-4xl"></i>',
      danger: '<i class="fas fa-exclamation-triangle text-red-500 text-4xl"></i>',
      info: '<i class="fas fa-info-circle text-[#122D6A] text-4xl"></i>'
    };
    
    const modalId = 'confirm-' + Date.now();
    const container = getModalContainer();
    
    const modalHTML = `
      <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform animate-scaleIn">
          <!-- Ícone -->
          <div class="flex justify-center mb-4">
            ${icons[type] || icons.warning}
          </div>
          
          <!-- Título -->
          <h3 class="text-xl font-bold text-center text-gray-800 mb-3">
            ${title}
          </h3>
          
          <!-- Mensagem -->
          <div class="text-gray-600 text-center mb-6 whitespace-pre-line text-sm leading-relaxed">
            ${message.replace(/\\n/g, '<br>')}
          </div>
          
          <!-- Botões -->
          <div class="flex gap-3">
            <button 
              onclick="resolveConfirm('${modalId}', false)"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              ${cancelText}
            </button>
            <button 
              onclick="resolveConfirm('${modalId}', true)"
              class="flex-1 bg-[#122D6A] hover:bg-[#0D1F4D] text-white py-3 rounded-xl font-semibold transition-all duration-200"
            >
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML += modalHTML;
    
    // Guardar resolve para usar no callback
    document.getElementById(modalId)._resolve = resolve;
  });
}

// Modal de Input (substitui prompt())
function showPrompt(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Digite',
      placeholder = '',
      defaultValue = '',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      inputType = 'text'
    } = options;
    
    const modalId = 'prompt-' + Date.now();
    const inputId = 'input-' + Date.now();
    const container = getModalContainer();
    
    const modalHTML = `
      <div id="${modalId}" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        
        <!-- Modal -->
        <div class="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform animate-scaleIn">
          <!-- Título -->
          <h3 class="text-xl font-bold text-center text-gray-800 mb-3">
            ${title}
          </h3>
          
          <!-- Mensagem -->
          <div class="text-gray-600 text-center mb-4 text-sm">
            ${message}
          </div>
          
          <!-- Input -->
          <input 
            type="${inputType}"
            id="${inputId}"
            value="${defaultValue}"
            placeholder="${placeholder}"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 mb-6 focus:border-[#122D6A] focus:ring-2 focus:ring-[#122D6A]/20 outline-none transition-all"
            onkeypress="if(event.key==='Enter') resolvePrompt('${modalId}', '${inputId}', true)"
          />
          
          <!-- Botões -->
          <div class="flex gap-3">
            <button 
              onclick="resolvePrompt('${modalId}', '${inputId}', false)"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              ${cancelText}
            </button>
            <button 
              onclick="resolvePrompt('${modalId}', '${inputId}', true)"
              class="flex-1 bg-[#122D6A] hover:bg-[#0D1F4D] text-white py-3 rounded-xl font-semibold transition-all duration-200"
            >
              ${confirmText}
            </button>
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML += modalHTML;
    
    // Focar no input
    setTimeout(() => {
      document.getElementById(inputId)?.focus();
    }, 100);
    
    // Guardar resolve para usar no callback
    document.getElementById(modalId)._resolve = resolve;
  });
}

// Funções auxiliares para fechar modais
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const onClose = modal._onClose;
    modal.remove();
    if (onClose) onClose();
  }
}

function resolveConfirm(modalId, result) {
  const modal = document.getElementById(modalId);
  if (modal) {
    const resolve = modal._resolve;
    modal.remove();
    if (resolve) resolve(result);
  }
}

function resolvePrompt(modalId, inputId, confirmed) {
  const modal = document.getElementById(modalId);
  const input = document.getElementById(inputId);
  if (modal) {
    const resolve = modal._resolve;
    const value = confirmed && input ? input.value : null;
    modal.remove();
    if (resolve) resolve(value);
  }
}

// Toast de notificação rápida (para mensagens curtas)
function showToast(message, type = 'info', duration = 3000) {
  const colors = {
    success: 'bg-[#122D6A]',
    error: 'bg-gray-700',
    warning: 'bg-blue-600',
    info: 'bg-[#2A4A9F]'
  };
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  const toastId = 'toast-' + Date.now();
  const container = getModalContainer();
  
  const toastHTML = `
    <div id="${toastId}" class="fixed top-4 right-4 z-[9999] transform translate-x-full animate-slideIn">
      <div class="${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
        <i class="fas ${icons[type]}"></i>
        <span class="text-sm font-medium">${message}</span>
        <button onclick="document.getElementById('${toastId}').remove()" class="ml-2 hover:opacity-70">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      .animate-slideIn { animation: slideIn 0.3s ease-out forwards; }
    </style>
  `;
  
  container.innerHTML += toastHTML;
  
  // Auto-remover após duration
  setTimeout(() => {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.animation = 'slideIn 0.3s ease-in reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// ══════════════════════════════════════════════════════════════════

// Aplicar tema
function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  
  // Aplicar ao body E ao container principal
  document.body.className = themes[theme].bg;
  const mainDiv = document.getElementById('app');
  if (mainDiv) {
    mainDiv.className = themes[theme].bg + ' min-h-screen transition-colors duration-300';
  }
  
  // Aplicar classe dark ao HTML se tema escuro
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
}

// Converter hex para RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 139, g: 92, b: 246 }; // fallback purple
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  // Se tema RGB ou custom, resetar para light
  if (currentTheme === 'rgb' || currentTheme === 'custom') {
    currentTheme = 'light';
    localStorage.setItem('theme', 'light');
  }
  applyTheme(currentTheme);
  checkUser();
  
  // Adicionar botão de emergência "Voltar ao Login"
  addEmergencyBackButton();
});

// ============== SISTEMA DE CONTAGEM DE ACESSOS ==============
function contabilizarAcesso() {
  if (!currentUser) return;
  
  // Obter dados de acesso do localStorage
  const acessosKey = `acessos_${currentUser.id}`;
  const primeiroAcessoKey = `primeiro_acesso_${currentUser.id}`;
  const ultimoAcessoKey = `ultimo_acesso_${currentUser.id}`;
  const historicoKey = `historico_acessos_${currentUser.id}`;
  
  // Recuperar dados existentes
  let totalAcessos = parseInt(localStorage.getItem(acessosKey) || '0');
  let primeiroAcesso = localStorage.getItem(primeiroAcessoKey);
  let historico = JSON.parse(localStorage.getItem(historicoKey) || '[]');
  
  // Incrementar contador
  totalAcessos++;
  
  // Data e hora atual
  const agora = new Date();
  const dataHoraAtual = agora.toISOString();
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR');
  
  // Se é o primeiro acesso, registrar
  if (!primeiroAcesso) {
    primeiroAcesso = dataHoraAtual;
    localStorage.setItem(primeiroAcessoKey, primeiroAcesso);
    
    // Mostrar mensagem de boas-vindas especial no primeiro acesso
    setTimeout(() => {
      showToast(`🎉 Bem-vindo ao IAprova! Este é seu primeiro acesso!`, 'success');
    }, 2000);
  } else if (totalAcessos === 5) {
    setTimeout(() => {
      showToast(`🌟 Você já acessou 5 vezes! Continue assim!`, 'success');
    }, 2000);
  } else if (totalAcessos === 10) {
    setTimeout(() => {
      showToast(`🎯 10 acessos! Você está no caminho certo!`, 'success');
    }, 2000);
  } else if (totalAcessos === 25) {
    setTimeout(() => {
      showToast(`💪 25 acessos! Sua dedicação é admirável!`, 'success');
    }, 2000);
  } else if (totalAcessos === 50) {
    setTimeout(() => {
      showToast(`🏆 50 acessos! Você é um estudante dedicado!`, 'success');
    }, 2000);
  } else if (totalAcessos === 100) {
    setTimeout(() => {
      showToast(`🎊 100 acessos! Parabéns pela consistência!`, 'success');
    }, 2000);
  }
  
  // Adicionar ao histórico
  historico.unshift({
    data: dataFormatada,
    hora: horaFormatada,
    timestamp: dataHoraAtual,
    numero: totalAcessos
  });
  
  // Limitar histórico a 100 registros
  if (historico.length > 100) {
    historico = historico.slice(0, 100);
  }
  
  // Salvar dados atualizados
  localStorage.setItem(acessosKey, totalAcessos.toString());
  localStorage.setItem(ultimoAcessoKey, dataHoraAtual);
  localStorage.setItem(historicoKey, JSON.stringify(historico));
  
  // Registrar no console
  console.log(`📊 Acesso #${totalAcessos} registrado - ${dataFormatada} às ${horaFormatada}`);
  
  // Atualizar indicador visual se existir
  updateAccessIndicator(totalAcessos);
  
  return {
    total: totalAcessos,
    primeiro: primeiroAcesso,
    ultimo: dataHoraAtual,
    historico: historico
  };
}

// Atualizar indicador de acessos no dashboard
function updateAccessIndicator(totalAcessos) {
  // Adicionar badge de acessos no perfil se existir
  setTimeout(() => {
    const userMenuButton = document.querySelector('[onclick*="toggleUserMenu"]');
    if (userMenuButton && !document.getElementById('access-badge')) {
      const badge = document.createElement('span');
      badge.id = 'access-badge';
      badge.className = 'absolute -top-1 -right-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-lg';
      badge.textContent = totalAcessos;
      badge.title = `${totalAcessos} acessos ao sistema`;
      userMenuButton.style.position = 'relative';
      userMenuButton.appendChild(badge);
    } else if (document.getElementById('access-badge')) {
      document.getElementById('access-badge').textContent = totalAcessos;
    }
  }, 1000);
}

// Função para obter estatísticas de acesso
window.getEstatisticasAcesso = function() {
  if (!currentUser) return null;
  
  const acessosKey = `acessos_${currentUser.id}`;
  const primeiroAcessoKey = `primeiro_acesso_${currentUser.id}`;
  const ultimoAcessoKey = `ultimo_acesso_${currentUser.id}`;
  const historicoKey = `historico_acessos_${currentUser.id}`;
  
  const totalAcessos = parseInt(localStorage.getItem(acessosKey) || '0');
  const primeiroAcesso = localStorage.getItem(primeiroAcessoKey);
  const ultimoAcesso = localStorage.getItem(ultimoAcessoKey);
  const historico = JSON.parse(localStorage.getItem(historicoKey) || '[]');
  
  // Calcular frequência de acesso
  let frequencia = 'Primeira vez';
  let nivel = 'Iniciante';
  
  if (totalAcessos >= 100) {
    frequencia = 'Veterano';
    nivel = '🏆 Lendário';
  } else if (totalAcessos >= 50) {
    frequencia = 'Assíduo';
    nivel = '⭐ Expert';
  } else if (totalAcessos >= 25) {
    frequencia = 'Frequente';
    nivel = '💎 Avançado';
  } else if (totalAcessos >= 10) {
    frequencia = 'Regular';
    nivel = '📚 Intermediário';
  } else if (totalAcessos >= 5) {
    frequencia = 'Ativo';
    nivel = '🌱 Aprendiz';
  } else if (totalAcessos > 1) {
    frequencia = 'Novo usuário';
    nivel = '👋 Iniciante';
  }
  
  // Calcular dias desde o primeiro acesso
  let diasDesdeInicio = 0;
  if (primeiroAcesso) {
    const inicio = new Date(primeiroAcesso);
    const agora = new Date();
    diasDesdeInicio = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24));
  }
  
  return {
    total: totalAcessos,
    frequencia: frequencia,
    nivel: nivel,
    primeiroAcesso: primeiroAcesso,
    ultimoAcesso: ultimoAcesso,
    diasDesdeInicio: diasDesdeInicio,
    mediaDiaria: diasDesdeInicio > 0 ? (totalAcessos / diasDesdeInicio).toFixed(1) : totalAcessos,
    historico: historico
  };
}

// ============== SISTEMA UNIFICADO DE BOTÕES FLUTUANTES (FAB SPEED DIAL) ==============

// Função para registrar acesso
function registrarAcesso() {
    try {
        // Obter dados de acesso do localStorage
        let dadosAcesso = localStorage.getItem('dadosAcesso');
        let acessos = dadosAcesso ? JSON.parse(dadosAcesso) : {
            totalAcessos: 0,
            primeiroAcesso: null,
            ultimoAcesso: null,
            acessosDiarios: {},
            acessosMensais: {}
        };
        
        const hoje = new Date();
        const dataStr = hoje.toISOString().split('T')[0];
        const mesAno = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        
        // Atualizar contadores
        acessos.totalAcessos++;
        if (!acessos.primeiroAcesso) {
            acessos.primeiroAcesso = dataStr;
        }
        acessos.ultimoAcesso = dataStr;
        
        // Contagem diária
        acessos.acessosDiarios[dataStr] = (acessos.acessosDiarios[dataStr] || 0) + 1;
        
        // Contagem mensal
        acessos.acessosMensais[mesAno] = (acessos.acessosMensais[mesAno] || 0) + 1;
        
        // Salvar no localStorage
        localStorage.setItem('dadosAcesso', JSON.stringify(acessos));
        
        // Atualizar exibição se estiver no dashboard
        if (document.getElementById('stats-acessos')) {
            atualizarExibicaoAcessos();
        }
        
        return acessos;
    } catch (error) {
        console.error('Erro ao registrar acesso:', error);
        return null;
    }
}

// Função para atualizar exibição de acessos
function atualizarExibicaoAcessos() {
    const elemento = document.getElementById('stats-acessos');
    if (elemento) {
        const dados = localStorage.getItem('dadosAcesso');
        if (dados) {
            const acessos = JSON.parse(dados);
            elemento.textContent = acessos.totalAcessos || 0;
            
            // Adicionar tooltip com informações detalhadas
            const hoje = new Date().toISOString().split('T')[0];
            const acessosHoje = acessos.acessosDiarios[hoje] || 0;
            elemento.title = `Total: ${acessos.totalAcessos}\nHoje: ${acessosHoje}\nPrimeiro acesso: ${acessos.primeiroAcesso || 'N/A'}`;
        }
    }
}
let fabMenuOpen = false;

function createUnifiedFAB() {
  // Remover botões antigos se existirem
  document.getElementById('emergency-back-btn')?.remove();
  document.getElementById('chatButton')?.remove();
  document.getElementById('ia-config-button-container')?.remove();
  document.getElementById('unified-fab-container')?.remove();
  
  // Criar overlay separado (fora do container do FAB)
  const overlay = document.createElement('div');
  overlay.id = 'fab-overlay';
  overlay.className = 'hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-[9997]';
  overlay.onclick = toggleFabMenu;
  document.body.appendChild(overlay);
  
  // Criar container principal do FAB
  const fabContainer = document.createElement('div');
  fabContainer.id = 'unified-fab-container';
  fabContainer.className = 'fixed bottom-6 right-6 z-[9998]';
  
  // HTML do sistema FAB unificado (sem o overlay)
  fabContainer.innerHTML = `
    <!-- Container dos sub-botões -->
    <div id="fab-menu" class="absolute bottom-16 right-0 flex flex-col items-end gap-3 opacity-0 pointer-events-none transition-all duration-300 z-[9999]">
      
      <!-- Botão Logout -->
      <div class="flex items-center gap-3 transform translate-x-4 transition-all duration-300 fab-item">
        <span class="bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg opacity-0">
          Sair do Sistema
        </span>
        <button 
          onclick="voltarAoLogin(); event.stopPropagation();"
          class="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center relative"
          title="Sair do Sistema">
          <i class="fas fa-sign-out-alt text-lg"></i>
        </button>
      </div>
      
      <!-- Botão Configurações IA -->
      <div class="flex items-center gap-3 transform translate-x-4 transition-all duration-300 fab-item">
        <span class="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg opacity-0">
          Personalizar IA
        </span>
        <button 
          onclick="openIAConfig(); toggleFabMenu(); event.stopPropagation();"
          class="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center relative"
          title="Configurações de IA">
          <i class="fas fa-brain text-lg"></i>
        </button>
      </div>
      
      <!-- Botão Chat Lilu -->
      <div class="flex items-center gap-3 transform translate-x-4 transition-all duration-300 fab-item">
        <span class="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg opacity-0">
          Assistente Lilu
        </span>
        <button 
          onclick="toggleChat(); toggleFabMenu(); event.stopPropagation();"
          class="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center relative"
          title="Conversar com Lilu">
          <i class="fas fa-robot text-lg"></i>
        </button>
      </div>
    </div>
    
    <!-- Botão Principal (FAB) -->
    <button 
      id="fab-main"
      onclick="toggleFabMenu()"
      class="w-14 h-14 bg-gradient-to-br from-[#122D6A] via-[#1e3a8a] to-[#2A4A9F] text-white rounded-full shadow-xl hover:shadow-2xl transform transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
      title="Menu de Ações">
      <!-- Efeito de brilho animado -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-500 transform -skew-x-12 group-hover:animate-shimmer"></div>
      
      <!-- Ícone principal com transição suave -->
      <div class="relative z-10 flex items-center justify-center">
        <i class="fas fa-layer-group text-xl transition-all duration-300" id="fab-icon"></i>
      </div>
      
      <!-- Indicador de notificação -->
      <span class="absolute flex h-3 w-3 -top-1 -right-1">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-gradient-to-r from-orange-400 to-pink-500 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-r from-orange-500 to-pink-600 shadow-lg"></span>
      </span>
      
      <!-- Anel de foco -->
      <div class="absolute inset-0 rounded-full border-2 border-white opacity-0 scale-110 group-hover:opacity-40 group-hover:scale-100 transition-all duration-300"></div>
    </button>
  `;
  
  document.body.appendChild(fabContainer);
  
  // Adicionar estilos CSS para animações
  if (!document.getElementById('fab-styles')) {
    const styles = document.createElement('style');
    styles.id = 'fab-styles';
    styles.innerHTML = `
      /* Animações do FAB */
      #fab-menu.open {
        opacity: 1;
        pointer-events: auto;
      }
      
      #fab-menu.open .fab-item {
        transform: translateX(0);
      }
      
      #fab-menu.open .fab-item span {
        opacity: 1;
        transition-delay: 0.2s;
      }
      
      #fab-menu.open .fab-item:nth-child(1) {
        transition-delay: 0.05s;
      }
      
      #fab-menu.open .fab-item:nth-child(2) {
        transition-delay: 0.1s;
      }
      
      #fab-menu.open .fab-item:nth-child(3) {
        transition-delay: 0.15s;
      }
      
      #fab-main.open #fab-icon {
        transform: rotate(135deg);
      }
      
      /* Efeito de hover nos labels */
      .fab-item:hover span {
        transform: scale(1.05);
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      }
      
      /* Botões sem glassmorphism para evitar conflitos */
      .fab-item button {
        position: relative;
        z-index: 10;
      }
      
      /* Garantir que os itens do menu fiquem acima do overlay */
      #fab-menu {
        z-index: 9999 !important;
      }
      
      #fab-menu .fab-item {
        z-index: 9999 !important;
      }
      
      /* Animação suave de respiração no botão principal */
      @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03); }
      }
      
      #fab-main {
        animation: breathe 4s ease-in-out infinite;
      }
      
      #fab-main:hover {
        animation: none;
        transform: scale(1.1);
      }
      
      /* Sombras coloridas nos botões */
      .fab-item button {
        position: relative;
      }
      
      .fab-item button::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        padding: 2px;
        background: linear-gradient(45deg, #667eea, #764ba2, #f093fb);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .fab-item button:hover::before {
        opacity: 1;
      }
      
      /* Responsivo para mobile */
      @media (max-width: 640px) {
        #unified-fab-container {
          bottom: 1.25rem;
          right: 1.25rem;
        }
        
        #fab-main {
          width: 3rem;
          height: 3rem;
        }
        
        #fab-main i {
          font-size: 1rem;
        }
        
        .fab-item button {
          width: 2.5rem;
          height: 2.5rem;
        }
        
        .fab-item i, .fab-item span.text-xl {
          font-size: 0.875rem;
        }
        
        .fab-item > span {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
      }
      
      /* Animação de pulso personalizada */
      @keyframes pulse-attention {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: .5;
        }
      }
      
      .animate-pulse-slow {
        animation: pulse-attention 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
      
      /* Animação shimmer para efeito de brilho */
      @keyframes shimmer {
        0% {
          transform: translateX(-100%) skewX(-12deg);
        }
        100% {
          transform: translateX(200%) skewX(-12deg);
        }
      }
      
      .group:hover .group-hover\\:animate-shimmer {
        animation: shimmer 1.5s ease-out;
      }
      
      /* Gradiente animado de fundo */
      @keyframes gradient-shift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      .animated-gradient {
        background-size: 200% 200%;
        animation: gradient-shift 3s ease infinite;
      }
    `;
    document.head.appendChild(styles);
  }
}

// Função para alternar o menu FAB
window.toggleFabMenu = function() {
  fabMenuOpen = !fabMenuOpen;
  const menu = document.getElementById('fab-menu');
  const mainBtn = document.getElementById('fab-main');
  const overlay = document.getElementById('fab-overlay');
  
  if (fabMenuOpen) {
    menu.classList.add('open');
    mainBtn.classList.add('open');
    overlay.classList.remove('hidden');
    // Remover indicador de pulso quando abrir
    mainBtn.querySelector('.absolute.flex')?.classList.add('hidden');
  } else {
    menu.classList.remove('open');
    mainBtn.classList.remove('open');
    overlay.classList.add('hidden');
  }
}

// Substituir a função antiga - agora usa o FAB unificado
function addEmergencyBackButton() {
  // O FAB unificado já inclui todos os botões necessários
  createUnifiedFAB();
}

function checkUser() {
  const userId = localStorage.getItem('userId');
  const userEmail = localStorage.getItem('userEmail');
  
  // SEMPRE mostrar login se não tiver email salvo (sessão expirada ou logout)
  if (!userId || !userEmail) {
    renderLogin();
    return;
  }
  
  // Se tem userId E email, está autenticado
  currentUser = { 
    id: parseInt(userId), 
    email: userEmail,
    name: localStorage.getItem('userName') || '',
    created_at: localStorage.getItem('userCreatedAt') || null
  };
  verificarEntrevista();
  
  // Criar botão de ajuda flutuante após login
  setTimeout(createHelpButton, 1000);
  
  // Adicionar botão de ajuda no header (?) à direita
  setTimeout(addHelpToHeader, 500);
}

// ============== TELA DE VERIFICAÇÃO DE EMAIL ==============
function renderEmailVerification(email, message, showResend = false) {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
      <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div class="text-center mb-8">
          <i class="fas fa-envelope-open-text text-6xl ${c('primary').icon} mb-4"></i>
          <h1 class="text-2xl font-bold ${themes[currentTheme].text}">Verificação de Email</h1>
        </div>
        
        <!-- Mensagem -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">
            <i class="fas fa-info-circle mr-2"></i>
            ${message}
          </p>
          ${email ? `<p class="text-xs text-[#122D6A] mt-2">Email: <strong>${email}</strong></p>` : ''}
        </div>
        
        <!-- Aviso sobre serviço de email em teste -->
        <div class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-sm text-amber-800 mb-2">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            <strong>Serviço de Email em Teste</strong>
          </p>
          <p class="text-xs text-amber-700">
            O serviço de envio de emails está em modo de teste e pode não funcionar para todos os emails.
            Se você não receber o email, clique em "Reenviar" para obter um link de verificação manual.
          </p>
        </div>
        
        <!-- Botões -->
        <div class="space-y-3">
          ${showResend ? `
            <button id="btn-resend-email" onclick="resendVerificationEmail('${email}')" 
              class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              <i class="fas fa-paper-plane mr-2"></i>
              Reenviar / Obter Link Manual
            </button>
          ` : `
            <button id="btn-resend-email" onclick="resendVerificationEmail('${email}')" 
              class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">
              <i class="fas fa-link mr-2"></i>
              Obter Link de Verificação
            </button>
          `}
          
          <button onclick="renderLogin()" 
            class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
            <i class="fas fa-arrow-left mr-2"></i>
            Voltar ao Login
          </button>
        </div>
        
        <!-- Instruções -->
        <div class="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p class="text-xs text-gray-600">
            <i class="fas fa-lightbulb mr-1"></i>
            <strong>Dica:</strong> Se o email não chegar em 5 minutos, verifique a pasta de spam ou 
            clique no botão acima para obter um link de verificação manual.
          </p>
        </div>
      </div>
    </div>
  `;
}

// Função para reenviar email de verificação
async function resendVerificationEmail(email) {
  try {
    const btn = document.getElementById('btn-resend-email') || event?.target;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processando...';
    }
    
    const response = await axios.post('/api/resend-verification', { email });
    
    // Se tem token (modo dev ou email não pôde ser enviado)
    if (response.data.devToken) {
      const verificationUrl = response.data.verificationUrl || 
        (window.location.origin + '/verificar-email?token=' + response.data.devToken);
      
      console.log('🔗 Token de verificação:', response.data.devToken);
      console.log('🔗 URL de verificação:', verificationUrl);
      
      // Mostrar tela com link de verificação
      document.getElementById('app').innerHTML = createVerificationLinkScreen(email, verificationUrl, response.data.message);
    } else if (response.data.alreadyVerified) {
      showModal('Seu email já foi verificado! Você pode fazer login agora.', { 
        type: 'success',
        title: 'Email Verificado'
      });
      setTimeout(() => renderLogin(), 2000);
    } else {
      showModal(response.data.message, { type: 'success' });
      // Restaurar botão após 2 segundos
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }, 2000);
    }
  } catch (error) {
    console.error('Erro ao reenviar email:', error);
    const btn = document.getElementById('btn-resend-email') || event?.target;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-link mr-2"></i>Tentar Novamente';
    }
    showModal(error.response?.data?.error || 'Erro ao processar solicitação', { type: 'error' });
  }
}

// Criar tela de link de verificação
function createVerificationLinkScreen(email, verificationUrl, message) {
  return `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
      <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div class="text-center mb-6">
          <div class="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <i class="fas fa-link text-4xl text-green-600"></i>
          </div>
          <h1 class="text-2xl font-bold ${themes[currentTheme].text}">Link de Verificação</h1>
          <p class="text-sm text-gray-500 mt-2">${email}</p>
        </div>
        
        <!-- Mensagem de sucesso -->
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-sm text-green-800">
            <i class="fas fa-check-circle mr-2"></i>
            ${message || 'Link de verificação gerado com sucesso!'}
          </p>
        </div>
        
        <!-- Link de verificação -->
        <div class="bg-gray-100 p-4 rounded-lg mb-6">
          <label class="block text-xs font-medium text-gray-600 mb-2">
            <i class="fas fa-link mr-1"></i>
            Clique no botão abaixo ou copie o link:
          </label>
          <div class="flex gap-2 mb-3">
            <input type="text" 
              id="verification-url-input"
              value="${verificationUrl}"
              class="flex-1 p-2 text-xs border rounded bg-white font-mono"
              onclick="this.select()"
              readonly>
            <button onclick="navigator.clipboard.writeText('${verificationUrl}'); showToast('Link copiado!', 'success')"
              class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition"
              title="Copiar link">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
        
        <!-- Botão principal -->
        <a href="${verificationUrl}" 
          class="block w-full bg-gradient-to-r from-green-600 to-green-700 text-white text-center py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-green-800 transition shadow-lg mb-4">
          <i class="fas fa-check-circle mr-2"></i>
          Verificar Meu Email
        </a>
        
        <!-- Botão secundário -->
        <button onclick="renderLogin()" 
          class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
          <i class="fas fa-arrow-left mr-2"></i>
          Voltar ao Login
        </button>
        
        <!-- Instruções -->
        <div class="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p class="text-xs text-amber-800">
            <i class="fas fa-info-circle mr-1"></i>
            <strong>Nota:</strong> O serviço de email está em modo de teste. 
            Use o link acima para verificar seu email manualmente.
          </p>
        </div>
      </div>
    </div>
  `;
}

// ============== TELA DE ESQUECI SENHA ==============
function showForgotPassword() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
      <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div class="text-center mb-8">
          <i class="fas fa-key text-6xl text-red-500 mb-4"></i>
          <h1 class="text-2xl font-bold ${themes[currentTheme].text}">Recuperar Senha</h1>
          <p class="${themes[currentTheme].textSecondary} mt-2">
            Digite seu email para receber as instruções
          </p>
        </div>
        
        <form id="forgotPasswordForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">E-mail cadastrado</label>
            <input type="email" id="resetEmail" required 
              class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="seu@email.com"
              pattern="[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
              title="Por favor, insira um email válido">
          </div>
          
          <button type="submit" id="sendResetBtn"
            class="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition">
            <i class="fas fa-paper-plane mr-2"></i>
            Enviar Email de Recuperação
          </button>
        </form>
        
        <div class="mt-6 text-center">
          <button onclick="renderLogin()" 
            class="text-sm text-gray-600 hover:text-gray-700">
            <i class="fas fa-arrow-left mr-1"></i>
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const btn = document.getElementById('sendResetBtn');
    
    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
      
      const response = await axios.post('/api/forgot-password', { email });
      
      // SEMPRE mostrar link quando houver devToken (independente se email foi enviado ou não)
      if (response.data.devToken) {
        console.log('🔐 Token de reset:', response.data.devToken);
        const resetUrl = response.data.resetUrl || `${window.location.origin}/resetar-senha?token=${response.data.devToken}`;
        
        // Mostrar tela com link de reset
        document.getElementById('app').innerHTML = `
          <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
            <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
              <div class="text-center mb-6">
                <div class="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <i class="fas fa-key text-4xl text-red-600"></i>
                </div>
                <h2 class="text-2xl font-bold ${themes[currentTheme].text}">Redefinir Senha</h2>
                <p class="text-sm text-gray-500 mt-2">${email}</p>
              </div>
              
              <div class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p class="text-sm text-amber-800 mb-2">
                  <i class="fas fa-info-circle mr-2"></i>
                  <strong>Serviço de Email em Teste</strong>
                </p>
                <p class="text-xs text-amber-700">
                  ${response.data.message || 'Use o link abaixo para redefinir sua senha.'}
                </p>
              </div>
              
              <div class="bg-gray-100 p-4 rounded-lg mb-4">
                <label class="block text-xs font-medium text-gray-600 mb-2">
                  <i class="fas fa-link mr-1"></i>
                  Clique no botão ou copie o link:
                </label>
                <div class="flex gap-2 mb-3">
                  <input type="text" 
                    value="${resetUrl}"
                    class="flex-1 p-2 text-xs border rounded bg-white font-mono"
                    onclick="this.select()"
                    readonly>
                  <button onclick="navigator.clipboard.writeText('${resetUrl}'); showToast('Link copiado!', 'success')"
                    class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>
              
              <a href="${resetUrl}" 
                class="block w-full bg-gradient-to-r from-red-600 to-red-700 text-white text-center py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition shadow-lg mb-4">
                <i class="fas fa-key mr-2"></i>
                Redefinir Minha Senha
              </a>
              
              <button onclick="renderLogin()" 
                class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
                <i class="fas fa-arrow-left mr-2"></i>
                Voltar ao Login
              </button>
            </div>
          </div>
        `;
      } else {
        // Produção - email enviado de verdade
        showModal(response.data.message || 'Se o email estiver cadastrado, você receberá instruções de recuperação.', {
          type: 'success',
          title: 'Email Enviado!'
        });
        setTimeout(() => renderLogin(), 3000);
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      const errorData = error.response?.data;
      
      if (errorData?.needsVerification) {
        renderEmailVerification(email, errorData.error, true);
      } else {
        showModal(errorData?.error || 'Erro ao processar solicitação', { type: 'error' });
      }
      
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Enviar Email de Recuperação';
    }
  });
}

// Função para resetar senha
async function resetPasswordWithToken(token) {
  try {
    // Primeiro validar o token
    const validateResponse = await axios.get(`/api/reset-password/validate/${token}`);
    
    if (!validateResponse.data.valid) {
      showModal(validateResponse.data.error || 'Token inválido', { type: 'error' });
      setTimeout(() => renderLogin(), 3000);
      return;
    }
    
    const userEmail = validateResponse.data.email;
    
    // Mostrar formulário de nova senha
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
        <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
          <div class="text-center mb-8">
            <i class="fas fa-lock text-6xl text-green-500 mb-4"></i>
            <h1 class="text-2xl font-bold ${themes[currentTheme].text}">Criar Nova Senha</h1>
            <p class="${themes[currentTheme].textSecondary} mt-2">
              Email: <strong>${userEmail}</strong>
            </p>
          </div>
          
          <form id="resetPasswordForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
              <input type="password" id="newPassword" required minlength="4"
                class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Mínimo 4 caracteres">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
              <input type="password" id="confirmPassword" required minlength="4"
                class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Digite a senha novamente">
            </div>
            
            <button type="submit" id="resetBtn"
              class="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">
              <i class="fas fa-save mr-2"></i>
              Salvar Nova Senha
            </button>
          </form>
          
          <div class="mt-6 text-center">
            <button onclick="renderLogin()" 
              class="text-sm text-gray-600 hover:text-gray-700">
              <i class="fas fa-times mr-1"></i>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const btn = document.getElementById('resetBtn');
      
      if (newPassword !== confirmPassword) {
        showModal('As senhas não coincidem!', { type: 'error' });
        return;
      }
      
      try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';
        
        const response = await axios.post('/api/reset-password', {
          token,
          newPassword
        });
        
        showModal(response.data.message || 'Senha alterada com sucesso!', {
          type: 'success',
          title: '✅ Sucesso!'
        });
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => renderLogin(), 2000);
        
      } catch (error) {
        console.error('Erro ao resetar senha:', error);
        showModal(error.response?.data?.error || 'Erro ao alterar senha', { type: 'error' });
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Nova Senha';
      }
    });
    
  } catch (error) {
    console.error('Erro ao validar token:', error);
    showModal('Token inválido ou expirado', { type: 'error' });
    setTimeout(() => renderLogin(), 3000);
  }
}

// ============== TELA DE LOGIN ==============
function renderLogin() {
  let isLoginMode = true;

  const render = () => {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
        <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md">
          <div class="text-center mb-8">
            <i class="fas fa-brain text-6xl ${c('primary').icon} mb-4"></i>
            <h1 class="text-4xl font-bold ${themes[currentTheme].text}">
              <span class="${c('primary').text}">IA</span><span class="${c('secondary').text}">prova</span>
            </h1>
            <p class="${themes[currentTheme].textSecondary} mt-2">Preparação Inteligente para Concursos Públicos</p>
          </div>
          
          <!-- Botões de alternância -->
          <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button id="btnLogin" onclick="toggleMode(true)" 
              class="${isLoginMode ? 'bg-white shadow' : ''} flex-1 py-2 rounded-md font-semibold transition">
              Login
            </button>
            <button id="btnCadastro" onclick="toggleMode(false)" 
              class="${!isLoginMode ? 'bg-white shadow' : ''} flex-1 py-2 rounded-md font-semibold transition">
              Cadastro
            </button>
          </div>
          
          <form id="authForm" class="space-y-4">
            ${!isLoginMode ? `
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                <input type="text" id="userName" required 
                  class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] focus:border-transparent"
                  placeholder="Seu nome completo">
              </div>
            ` : ''}
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <input type="email" id="userEmail" required 
                class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] focus:border-transparent"
                placeholder="seu@email.com"
                pattern="[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"
                title="Por favor, insira um email válido"
                oninput="this.value = this.value.toLowerCase()">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input type="password" id="userPassword" required minlength="4"
                class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] focus:border-transparent"
                placeholder="Mínimo 4 caracteres">
            </div>
            
            <button type="submit" 
              class="w-full bg-[#122D6A] text-white py-3 rounded-lg font-semibold hover:bg-[#0D1F4D] transition">
              ${isLoginMode ? '🔓 Entrar' : '🚀 Criar Conta'}
            </button>
          </form>
          
          <!-- Link Esqueci Senha (apenas no modo login) -->
          ${isLoginMode ? `
            <div class="mt-4 text-center">
              <button type="button" onclick="showForgotPassword()" 
                class="text-sm text-[#122D6A] hover:text-blue-700 font-medium">
                <i class="fas fa-key mr-1"></i>
                Esqueceu sua senha?
              </button>
            </div>
          ` : ''}
          
          <div class="mt-6 text-center text-sm text-gray-600">
            ${isLoginMode ? 
              'Primeira vez aqui? Use o Cadastro acima.' : 
              'Já tem conta? Use o Login acima.'}
          </div>
        </div>
      </div>
    `;

    window.toggleMode = (loginMode) => {
      isLoginMode = loginMode;
      render();
    };

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('userEmail').value;
      const password = document.getElementById('userPassword').value;

      try {
        if (isLoginMode) {
          // Login
          console.log('🔑 Tentando fazer login com:', email);
          const response = await axios.post('/api/login', { email, password });
          console.log('✅ Login bem sucedido:', response.data);
          currentUser = response.data;
          
          // Salvar dados da sessão
          localStorage.setItem('userId', currentUser.id);
          localStorage.setItem('userEmail', email);
          localStorage.setItem('userName', currentUser.name || '');
          localStorage.setItem('userCreatedAt', currentUser.created_at || '');
          
          // Contabilizar acesso
          contabilizarAcesso();
          
          console.log('📊 Verificando entrevista...');
          verificarEntrevista();
        } else {
          // Cadastro
          const name = document.getElementById('userName').value;
          const response = await axios.post('/api/users', { name, email, password });
          
          if (response.data.id) {
            // Se precisa verificação de email
            if (response.data.needsVerification) {
              console.log('📧 Verificação necessária:', response.data);
              
              // SEMPRE mostrar link quando houver token (para permitir verificação manual)
              if (response.data.devToken) {
                const verificationUrl = response.data.verificationUrl || 
                  `${window.location.origin}/verificar-email?token=${response.data.devToken}`;
                
                console.log('🔗 URL de verificação:', verificationUrl);
                
                // Mostrar tela com link de verificação
                document.getElementById('app').innerHTML = createVerificationLinkScreen(
                  email, 
                  verificationUrl, 
                  response.data.message
                );
                return;
              }
              
              // Fallback: mostrar tela de verificação padrão
              renderEmailVerification(email, response.data.message);
            } else {
              showModal('Cadastro realizado com sucesso! Faça login agora.', { type: 'success', title: 'Bem-vindo!' });
              isLoginMode = true;
              render();
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro no login/cadastro:', error);
        const errorData = error.response?.data;
        const errorMsg = errorData?.error || error.message || 'Erro na operação';
        
        // Se o email não foi verificado
        if (errorData?.needsVerification) {
          renderEmailVerification(errorData.email || email, errorMsg, true);
        } else {
          showModal(errorMsg, { type: 'error' });
        }
      }
    });
  };

  render();
}

// ============== ENTREVISTA INICIAL ==============
async function iniciarEntrevista() {
  // ✅ CORREÇÃO: NÃO carregar disciplinas padrão aqui
  // Elas serão carregadas apenas se não houver edital
  
  interviewData = {
    user_id: currentUser.id,
    objetivo_tipo: '',
    tempo_disponivel_dia: 0,
    experiencia: '',
    ja_estudou_antes: false,
    reprovacoes: 0,
    disciplinas: [],
    disciplinas_do_edital: [] // Novo campo
  };
  
  renderEntrevistaStep1();
}

function renderEntrevistaStep1() {
  // ✅ Cancelar qualquer countdown ativo ao trocar de tela
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
  }
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-4 md:py-8">
      <div class="max-w-3xl mx-auto px-3 md:px-4">
        <div class="${themes[currentTheme].card} rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
          <!-- Header com progress visual moderno -->
          <div class="mb-6 md:mb-8">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 md:gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-sm md:text-base">1</span>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">Entrevista Inicial</h2>
                  <p class="text-xs md:text-sm text-gray-500">Configure seu plano de estudos</p>
                </div>
              </div>
              <span class="hidden md:block text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">1/4</span>
            </div>
            
            <!-- Progress bar moderno -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 md:h-2 rounded-full transition-all duration-500" style="width: 25%"></div>
              </div>
              <div class="flex justify-between mt-1 text-[10px] md:text-xs text-gray-400">
                <span class="text-[#122D6A] font-medium">Objetivo</span>
                <span>Perfil</span>
                <span>Disciplinas</span>
                <span>Concluir</span>
              </div>
            </div>
          </div>

          <h3 class="text-base md:text-xl font-semibold mb-4 md:mb-6 text-center ${themes[currentTheme].text}">
            <i class="fas fa-flag-checkered mr-2 text-[#1A3A7F]"></i>
            Qual é seu objetivo?
          </h3>

          <div class="space-y-3 md:space-y-4">
            <button onclick="selecionarObjetivo('concurso_especifico')" 
              class="w-full p-4 md:p-6 border-2 ${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-gradient-to-r hover:from-[#E8EDF5] hover:to-[#F3F6FA] transition-all duration-200 text-left group">
              <div class="flex items-center">
                <div class="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#E8EDF5] to-[#D0D9EB] rounded-xl flex items-center justify-center mr-3 md:mr-4 group-hover:from-[#122D6A] group-hover:to-[#1A3A7F] transition-all">
                  <i class="fas fa-bullseye text-xl md:text-2xl text-[#1A3A7F] group-hover:text-white transition-all"></i>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-base md:text-lg ${themes[currentTheme].text}">Concurso Específico</h4>
                  <p class="text-xs md:text-sm ${themes[currentTheme].textSecondary}">Já sei qual concurso quero fazer</p>
                </div>
                <i class="fas fa-chevron-right text-gray-300 group-hover:text-[#122D6A] hidden md:block"></i>
              </div>
            </button>

            <button onclick="selecionarObjetivo('area_geral')" 
              class="w-full p-4 md:p-6 border-2 ${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:bg-gradient-to-r hover:from-[#E8EDF5] hover:to-[#F3F6FA] transition-all duration-200 text-left group">
              <div class="flex items-center">
                <div class="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#E8EDF5] to-[#D0D9EB] rounded-xl flex items-center justify-center mr-3 md:mr-4 group-hover:from-[#122D6A] group-hover:to-[#1A3A7F] transition-all">
                  <i class="fas fa-th-large text-xl md:text-2xl text-[#1A3A7F] group-hover:text-white transition-all"></i>
                </div>
                <div class="flex-1">
                  <h4 class="font-semibold text-base md:text-lg ${themes[currentTheme].text}">Área Geral</h4>
                  <p class="text-xs md:text-sm ${themes[currentTheme].textSecondary}">Quero estudar para uma área específica</p>
                </div>
                <i class="fas fa-chevron-right text-gray-300 group-hover:text-[#122D6A] hidden md:block"></i>
              </div>
            </button>
          </div>

          <!-- Botão Voltar ao Login - Compacto no mobile -->
          <div class="mt-6 md:mt-8 pt-4 md:pt-6 border-t ${themes[currentTheme].border}">
            <button onclick="voltarAoLogin()" 
              class="w-full py-2.5 md:py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm md:text-base">
              <i class="fas fa-arrow-left text-xs md:text-sm"></i>
              <span>Voltar ao Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Função para voltar ao login
async function voltarAoLogin() {
  const confirmed = await showConfirm('Deseja sair da entrevista e voltar ao login?\n\nOs dados da entrevista atual não serão salvos.', {
    title: 'Sair da Entrevista',
    confirmText: 'Sim, sair',
    cancelText: 'Continuar aqui',
    type: 'warning'
  });
  if (confirmed) {
    localStorage.clear();
    window.location.reload();
  }
}

// Mapeamento de cargos para áreas específicas
function detectarAreaPorCargo(cargo) {
  const cargoLower = cargo.toLowerCase();
  
  // Saúde
  if (cargoLower.includes('enferm') || cargoLower.includes('médico') || 
      cargoLower.includes('farmac') || cargoLower.includes('fisio') ||
      cargoLower.includes('psicólogo') || cargoLower.includes('nutricionista') ||
      cargoLower.includes('saúde') || cargoLower.includes('sus')) {
    return 'saude';
  }
  
  // Educação
  if (cargoLower.includes('professor') || cargoLower.includes('pedagog') ||
      cargoLower.includes('educador') || cargoLower.includes('docent')) {
    return 'educacao';
  }
  
  // Fiscal
  if (cargoLower.includes('auditor') || cargoLower.includes('fiscal') ||
      cargoLower.includes('receita') || cargoLower.includes('tribut')) {
    return 'fiscal';
  }
  
  // Policial
  if (cargoLower.includes('policial') || cargoLower.includes('agente') ||
      cargoLower.includes('delegado') || cargoLower.includes('investigador') ||
      cargoLower.includes('penitenciário')) {
    return 'policial';
  }
  
  // Tribunais
  if (cargoLower.includes('tribunal') || cargoLower.includes('judiciário') ||
      cargoLower.includes('analista judic')) {
    return 'tribunais';
  }
  
  return null; // Não detectado, usuário escolherá manualmente
}

function selecionarObjetivo(tipo) {
  interviewData.objetivo_tipo = tipo;
  
  if (tipo === 'concurso_especifico') {
    renderConcursoEspecifico();
  } else {
    renderAreaGeral();
  }
}

function renderConcursoEspecifico() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-4 md:py-8">
      <div class="max-w-3xl mx-auto px-3 md:px-4">
        <div class="${themes[currentTheme].card} rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
          <!-- Header com progress visual moderno -->
          <div class="mb-6 md:mb-8">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 md:gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-sm md:text-base">1</span>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">Qual concurso?</h2>
                  <p class="text-xs md:text-sm text-gray-500">Informe os dados do concurso</p>
                </div>
              </div>
              <span class="hidden md:block text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">1/4</span>
            </div>
            
            <!-- Progress bar moderno -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 md:h-2 rounded-full transition-all duration-500" style="width: 25%"></div>
              </div>
              <div class="flex justify-between mt-1 text-[10px] md:text-xs text-gray-400">
                <span class="text-[#122D6A] font-medium">Objetivo</span>
                <span>Perfil</span>
                <span>Disciplinas</span>
                <span>Concluir</span>
              </div>
            </div>
          </div>

          <form id="concursoForm" class="space-y-4 md:space-y-6">
            <!-- Nome do Concurso -->
            <div class="relative">
              <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                <i class="fas fa-building mr-1 text-[#1A3A7F]"></i>
                Nome do Concurso/Órgão
              </label>
              <input type="text" id="concursoNome" required placeholder="Ex: Receita Federal, Polícia Federal, TRT-SP"
                class="w-full px-3 md:px-4 py-2.5 md:py-3 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base">
            </div>

            <!-- Cargo -->
            <div class="relative">
              <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                <i class="fas fa-user-tie mr-1 text-[#1A3A7F]"></i>
                Cargo pretendido
              </label>
              <input type="text" id="cargo" required placeholder="Ex: Auditor Fiscal, Agente, Analista"
                class="w-full px-3 md:px-4 py-2.5 md:py-3 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base">
              <p class="text-[10px] md:text-xs text-gray-400 mt-1">
                <i class="fas fa-magic mr-1"></i>
                O conteúdo será personalizado para este cargo
              </p>
            </div>

            <!-- Banca Organizadora -->
            <div class="relative">
              <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                <i class="fas fa-landmark mr-1 text-[#1A3A7F]"></i>
                Banca Organizadora <span class="text-gray-400 font-normal">(se souber)</span>
              </label>
              <select id="bancaOrganizadora"
                class="w-full px-3 md:px-4 py-2.5 md:py-3 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base">
                <option value="">Selecione a banca (opcional)</option>
                <option value="CESPE/CEBRASPE">CESPE / CEBRASPE</option>
                <option value="FCC">FCC - Fundação Carlos Chagas</option>
                <option value="FGV">FGV - Fundação Getúlio Vargas</option>
                <option value="VUNESP">VUNESP</option>
                <option value="CESGRANRIO">CESGRANRIO</option>
                <option value="IBFC">IBFC</option>
                <option value="IADES">IADES</option>
                <option value="IDECAN">IDECAN</option>
                <option value="QUADRIX">QUADRIX</option>
                <option value="INSTITUTO AOCP">Instituto AOCP</option>
                <option value="CONSULPLAN">Consulplan</option>
                <option value="FUNDATEC">FUNDATEC</option>
                <option value="FUNCAB">FUNCAB</option>
                <option value="COPESE">COPESE</option>
                <option value="outra">Outra banca</option>
              </select>
              <p class="text-[10px] md:text-xs text-gray-400 mt-1">
                <i class="fas fa-star mr-1"></i>
                Questões e conteúdo serão adaptados ao estilo da banca
              </p>
            </div>

            <!-- Prazo -->
            <div class="relative">
              <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                <i class="fas fa-calendar-alt mr-1 text-[#1A3A7F]"></i>
                Prazo até a prova <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input type="date" id="prazoProva"
                class="w-full px-3 md:px-4 py-2.5 md:py-3 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base">
            </div>

            <!-- Seção de Upload - Modernizada e compacta no mobile -->
            <div class="bg-gradient-to-br from-[#E8EDF5] via-[#F3F6FA] to-white p-3 md:p-5 rounded-xl border-2 border-[#C5D1E8]">
              <label class="block text-xs md:text-sm font-semibold text-gray-800 mb-2 md:mb-3 flex items-center">
                <div class="w-6 h-6 md:w-8 md:h-8 bg-[#122D6A] rounded-lg flex items-center justify-center mr-2">
                  <i class="fas fa-file-upload text-white text-xs md:text-sm"></i>
                </div>
                Anexar Edital <span class="text-gray-400 font-normal ml-1">(recomendado)</span>
              </label>
              
              <!-- Tipos de arquivo - Compacto no mobile -->
              <div class="bg-white rounded-lg p-2 md:p-3 mb-3 border border-[#C5D1E8]/50">
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div class="p-2 rounded-lg hover:bg-gray-50 transition">
                    <i class="fas fa-file-pdf text-red-500 text-lg md:text-xl mb-1"></i>
                    <p class="text-[9px] md:text-xs text-gray-600 font-medium">PDF</p>
                    <p class="text-[8px] md:text-[10px] text-gray-400 hidden md:block">Extração automática</p>
                  </div>
                  <div class="p-2 rounded-lg hover:bg-gray-50 transition">
                    <i class="fas fa-file-alt text-gray-500 text-lg md:text-xl mb-1"></i>
                    <p class="text-[9px] md:text-xs text-gray-600 font-medium">TXT</p>
                    <p class="text-[8px] md:text-[10px] text-gray-400 hidden md:block">Mais rápido</p>
                  </div>
                  <div class="p-2 rounded-lg hover:bg-[#2A4A9F]/5 transition border border-green-200 bg-green-50/50">
                    <i class="fas fa-file-excel text-[#2A4A9F] text-lg md:text-xl mb-1"></i>
                    <p class="text-[9px] md:text-xs text-green-700 font-medium">XLSX</p>
                    <p class="text-[8px] md:text-[10px] text-[#2A4A9F] hidden md:block">✨ Recomendado!</p>
                  </div>
                </div>
              </div>

              <!-- Input de upload - Modernizado -->
              <div class="relative">
                <input type="file" id="editaisUpload" multiple accept=".pdf,.txt,.xlsx"
                  class="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white rounded-lg focus:ring-2 focus:ring-[#1A3A7F] file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-[#122D6A] file:text-white hover:file:bg-[#0D1F4D] border-2 border-dashed border-gray-300 hover:border-[#1A3A7F] transition-all text-xs md:text-sm">
              </div>
              
              <!-- Dicas de processamento - Compactas no mobile -->
              <div class="mt-2 md:mt-3 space-y-1 md:space-y-1.5 text-[10px] md:text-xs">
                <p class="text-[#1A3A7F] flex items-center">
                  <i class="fas fa-robot mr-1.5"></i>
                  <span>IA IA extrai disciplinas automaticamente</span>
                </p>
              </div>
              
              <div id="editaisPreview" class="mt-2 md:mt-3 space-y-1.5"></div>
            </div>

            <!-- Botões - Responsivos -->
            <div class="flex gap-2 md:gap-4 pt-2">
              <button type="button" onclick="renderEntrevistaStep1()" 
                class="px-4 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm md:text-base text-gray-600 flex items-center gap-1 md:gap-2">
                <i class="fas fa-arrow-left text-xs"></i>
                <span class="hidden md:inline">Voltar</span>
              </button>
              <button type="submit" 
                class="flex-1 bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] text-white py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-[#0D1F4D] hover:to-[#122D6A] transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-[#122D6A]/20">
                <span>Continuar</span>
                <i class="fas fa-arrow-right text-xs"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Preview de editais
  document.getElementById('editaisUpload').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('editaisPreview');
    
    if (files.length === 0) {
      preview.innerHTML = '';
      return;
    }
    
    preview.innerHTML = files.map((file, idx) => `
      <div class="flex items-center justify-between bg-[#E8EDF5] px-3 py-2 rounded text-sm">
        <div class="flex items-center gap-2">
          <i class="fas fa-file-${file.name.endsWith('.pdf') ? 'pdf text-red-500' : 'alt text-[#2A4A9F]'}"></i>
          <span class="text-gray-700">${file.name}</span>
          <span class="text-gray-400">(${(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <button type="button" onclick="removerEdital(${idx})" class="text-red-500 hover:text-red-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  });

  document.getElementById('concursoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    interviewData.concurso_nome = document.getElementById('concursoNome').value;
    interviewData.cargo = document.getElementById('cargo').value;
    interviewData.banca_organizadora = document.getElementById('bancaOrganizadora').value || null;
    interviewData.prazo_prova = document.getElementById('prazoProva').value || null;
    
    console.log('📋 Banca organizadora selecionada:', interviewData.banca_organizadora);
    
    // Salvar arquivos de editais
    const editaisFiles = document.getElementById('editaisUpload').files;
    interviewData.editais_arquivos = Array.from(editaisFiles);
    
    // ✅ Informar sobre PDFs (mas não bloquear)
    const arquivosPDF = Array.from(editaisFiles).filter(f => f.name.endsWith('.pdf'));
    if (arquivosPDF.length > 0) {
      console.log(`📄 ${arquivosPDF.length} PDF(s) detectado(s). IA AI irá extrair o texto automaticamente.`);
    }
    
    console.log(`📄 ${editaisFiles.length} edital(is) anexado(s)`);
    
    // Detectar área automaticamente baseado no cargo
    const areaDetectada = detectarAreaPorCargo(interviewData.cargo);
    if (areaDetectada) {
      interviewData.area_geral = areaDetectada;
      console.log(`Área detectada automaticamente: ${areaDetectada} para cargo: ${interviewData.cargo}`);
    }
    
    // ✅ NOVO: Processar edital ANTES de ir para Step2
    if (editaisFiles.length > 0) {
      await processarEditalAntesDeStep2();
    } else {
      renderEntrevistaStep2();
    }
  });
}

// ✅ NOVA FUNÇÃO: Processar edital ANTES de mostrar disciplinas
async function processarEditalAntesDeStep2() {
  // ✅ IMPORTANTE: Cancelar qualquer countdown ativo
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
    console.log('⏱️ Countdown cancelado - iniciando novo processamento');
  }
  
  // Detectar se tem PDFs
  const temPDF = interviewData.editais_arquivos.some(f => f.name.endsWith('.pdf'));
  const tempoEstimado = temPDF ? '30-60 segundos' : '10-30 segundos';
  
  // Estado atual do processamento
  let etapaAtual = 1;
  let logMensagens = [];
  
  // Função auxiliar para atualizar UI com feedback progressivo
  function atualizarFeedbackUI(etapa, mensagem, tipo = 'info') {
    etapaAtual = etapa;
    logMensagens.push({ etapa, mensagem, tipo, timestamp: new Date().toLocaleTimeString() });
    
    const iconeEtapa = (num) => {
      if (num < etapaAtual) return '<i class="fas fa-check-circle text-green-500"></i>';
      if (num === etapaAtual) return '<i class="fas fa-spinner fa-spin text-[#2A4A9F]"></i>';
      return '<i class="far fa-circle text-gray-300"></i>';
    };
    
    const corEtapa = (num) => {
      if (num < etapaAtual) return 'text-[#2A4A9F]';
      if (num === etapaAtual) return 'text-[#1A3A7F] font-semibold';
      return 'text-gray-400';
    };
    
    // Mostrar loading com progresso
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center p-4">
        <div class="${themes[currentTheme].card} rounded-lg p-6 max-w-2xl w-full mx-4">
          <div class="text-center mb-6">
            <i class="fas fa-robot text-6xl text-[#1A3A7F] mb-3 ${etapaAtual <= 4 ? 'animate-pulse' : ''}"></i>
            <h3 class="text-2xl font-bold ${themes[currentTheme].text} mb-2">
              ${etapaAtual === 5 ? '✅ Processamento Concluído!' : 'Processando Edital...'}
            </h3>
            <p class="${themes[currentTheme].textSecondary} text-sm">
              Tempo estimado: ${tempoEstimado}
            </p>
          </div>
          
          <!-- Barra de progresso -->
          <div class="mb-6">
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-[#122D6A] h-2 rounded-full transition-all duration-500" 
                   style="width: ${(etapaAtual / 4) * 100}%"></div>
            </div>
            <p class="text-xs text-center mt-1 ${themes[currentTheme].textSecondary}">
              Etapa ${etapaAtual} de 4
            </p>
          </div>
          
          <!-- Etapas do processo -->
          <div class="space-y-3 mb-6">
            <div class="flex items-center gap-3 p-3 rounded ${etapaAtual >= 1 ? 'bg-[#E8EDF5]' : ''}">
              ${iconeEtapa(1)}
              <span class="${corEtapa(1)}">
                1. ${temPDF ? '📄 Extraindo texto do PDF' : '📤 Enviando arquivo'}
              </span>
            </div>
            <div class="flex items-center gap-3 p-3 rounded ${etapaAtual >= 2 ? 'bg-[#E8EDF5]' : ''}">
              ${iconeEtapa(2)}
              <span class="${corEtapa(2)}">
                2. 🤖 Analisando conteúdo com IA
              </span>
            </div>
            <div class="flex items-center gap-3 p-3 rounded ${etapaAtual >= 3 ? 'bg-[#E8EDF5]' : ''}">
              ${iconeEtapa(3)}
              <span class="${corEtapa(3)}">
                3. 📚 Extraindo disciplinas e tópicos
              </span>
            </div>
            <div class="flex items-center gap-3 p-3 rounded ${etapaAtual >= 4 ? 'bg-[#E8EDF5]' : ''}">
              ${iconeEtapa(4)}
              <span class="${corEtapa(4)}">
                4. 💾 Salvando no banco de dados
              </span>
            </div>
          </div>
          
          <!-- Log de eventos -->
          <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-terminal mr-1"></i> Log de Processamento
            </h4>
            <div class="space-y-1 text-xs font-mono">
              ${logMensagens.slice(-10).map(log => `
                <div class="flex items-start gap-2 ${
                  log.tipo === 'error' ? 'text-red-600' : 
                  log.tipo === 'success' ? 'text-[#2A4A9F]' : 
                  'text-gray-600'
                }">
                  <span class="text-gray-400">[${log.timestamp}]</span>
                  <span>${log.mensagem}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Iniciar UI
  atualizarFeedbackUI(1, 'Iniciando processamento do edital...');

  try {
    // 1️⃣ Upload de arquivos
    atualizarFeedbackUI(1, `Preparando upload de ${interviewData.editais_arquivos.length} arquivo(s)...`);
    
    const formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('nome_concurso', interviewData.concurso_nome || 'Concurso');
    
    for (const file of interviewData.editais_arquivos) {
      formData.append('arquivos', file);
      atualizarFeedbackUI(1, `Adicionando arquivo: ${file.name}`);
    }

    console.log('📤 Enviando edital para backend...');
    atualizarFeedbackUI(1, 'Enviando arquivos para o servidor...');
    
    const uploadRes = await axios.post('/api/editais/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('✅ Upload concluído:', uploadRes.data);
    atualizarFeedbackUI(1, `✅ Upload concluído! ${uploadRes.data.editais.length} edital(is) recebido(s).`, 'success');
    
    // Aguardar 500ms para transição visual
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2️⃣ Processar cada edital via IA (APENAS SE NÃO FOR XLSX)
    for (const edital of uploadRes.data.editais) {
      // ✅ NOVO: Se foi XLSX, já está processado automaticamente
      if (edital.processado_automaticamente) {
        console.log(`📊 XLSX ${edital.id} já processado automaticamente (${edital.disciplinas_extraidas} disciplinas)`);
        atualizarFeedbackUI(2, `📊 XLSX detectado! ${edital.disciplinas_extraidas} disciplinas já extraídas.`, 'success');
        interviewData.edital_id = edital.id;
        
        // Pular para etapa 4 (salvar)
        atualizarFeedbackUI(4, `💾 Dados salvos automaticamente pelo XLSX.`, 'success');
        continue; // Pular processamento via IA
      }
      
      console.log(`🧠 Processando edital ID ${edital.id} com IA IA...`);
      atualizarFeedbackUI(2, `🔍 Passo 1: Buscando edital no banco de dados...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      atualizarFeedbackUI(2, `📝 Passo 2: Validando conteúdo do texto...`);
      await new Promise(resolve => setTimeout(resolve, 300));
      atualizarFeedbackUI(2, `📋 Passo 3: Localizando seção de CONTEÚDO PROGRAMÁTICO...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      atualizarFeedbackUI(2, `🤖 Passo 4: Enviando para análise com IA IA...`);
      atualizarFeedbackUI(2, `⏳ Isso pode levar 30-60 segundos...`);
      
      try {
        const processRes = await axios.post(`/api/editais/processar/${edital.id}`);
        console.log(`✅ Edital processado:`, processRes.data);
        
        // Feedback de sucesso detalhado
        const numDisciplinas = processRes.data.disciplinas?.length || 0;
        atualizarFeedbackUI(2, `✅ IA IA respondeu com sucesso!`, 'success');
        atualizarFeedbackUI(3, `📚 ${numDisciplinas} disciplinas identificadas!`, 'success');
        
        // Listar disciplinas encontradas
        if (processRes.data.disciplinas) {
          processRes.data.disciplinas.forEach((disc, i) => {
            atualizarFeedbackUI(3, `   ${i+1}. ${disc.nome} (${disc.topicos?.length || 0} tópicos)`, 'success');
          });
        }
        
        atualizarFeedbackUI(4, `💾 Salvando ${numDisciplinas} disciplinas no banco de dados...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        atualizarFeedbackUI(4, `✅ Processamento concluído com sucesso!`, 'success');
        
        // Salvar ID do edital processado
        interviewData.edital_id = edital.id;
      } catch (procError) {
        console.error(`❌ Erro ao processar edital ${edital.id}:`, procError);
        console.error(`❌ Resposta do servidor:`, procError?.response?.data);
        console.error(`❌ Status:`, procError?.response?.status);
        
        // Feedback visual de erro
        const errorMsg = procError?.response?.data?.error || 'Erro desconhecido';
        atualizarFeedbackUI(2, `❌ ERRO na Etapa 2: ${errorMsg}`, 'error');
        
        // Se for erro 400 ou 404, pode ser que já foi processado
        if (procError?.response?.status === 404) {
          console.warn(`⚠️ Edital ${edital.id} não encontrado ou já processado`);
          atualizarFeedbackUI(2, `⚠️ Edital ${edital.id} não encontrado ou já processado`, 'error');
          interviewData.edital_id = edital.id;
          continue;
        }
        
        // Se for erro 400 ou 503, mostrar mensagem específica e opção de tentar novamente
        if (procError?.response?.status === 400 || procError?.response?.status === 503) {
          const errorData = procError?.response?.data;
          const detailedError = errorData?.error || 'Erro desconhecido';
          const errorType = errorData?.errorType || 'UNKNOWN';
          const suggestion = errorData?.suggestion || '';
          const step = errorData?.step || 2;
          const stepName = errorData?.stepName || 'Processamento';
          
          atualizarFeedbackUI(step, `❌ Falha no ${stepName}: ${detailedError}`, 'error');
          
          // Mostrar sugestão do backend se disponível
          if (suggestion) {
            suggestion.split('\n').forEach(line => {
              if (line.trim()) {
                atualizarFeedbackUI(step, `💡 ${line}`, 'error');
              }
            });
          }
          
          // ✅ Mostrar tela de erro com opção de tentar novamente
          const apiErrorTypes = ['API_OVERLOADED', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE', 'AI_PROCESSING_FAILED'];
          const contentErrorTypes = ['NO_DISCIPLINES_FOUND', 'INSUFFICIENT_TEXT', 'EMPTY_TEXT', 'PARSE_ERROR', 'CONTENT_BLOCKED', 'EXTRACTION_FAILED'];
          const allHandledErrors = [...apiErrorTypes, ...contentErrorTypes];
          
          if (allHandledErrors.includes(errorType)) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Determinar ícone e cor baseado no tipo de erro
            const isApiError = apiErrorTypes.includes(errorType);
            const isNoDisciplines = errorType === 'NO_DISCIPLINES_FOUND';
            const isContentBlocked = errorType === 'CONTENT_BLOCKED';
            const isExtractionFailed = errorType === 'EXTRACTION_FAILED';
            const canContinueManually = errorData?.canContinueManually === true;
            
            const iconClass = isApiError ? 'fa-clock text-[#2A4A9F]' : 
                             isNoDisciplines || isExtractionFailed ? 'fa-search text-orange-500' :
                             isContentBlocked ? 'fa-shield-alt text-red-500' : 
                             'fa-exclamation-triangle text-orange-500';
            const titleText = isApiError ? 'API temporariamente indisponível' : 
                             isNoDisciplines || isExtractionFailed ? 'Disciplinas não encontradas automaticamente' :
                             isContentBlocked ? 'Conteúdo bloqueado' :
                             'Não foi possível processar o edital';
            
            // ✅ NOVO: Tempo reduzido para retry (30 segundos padrão)
            const retryAfter = errorData?.retryAfter || 30;
            
            // ✅ NOVO: Contador de modelos tentados para informar o usuário
            const modelsAttempted = errorData?.modelsAttempted || 5;
            
            // Sugestões específicas por tipo de erro
            let sugestoes = '';
            if (isApiError) {
              sugestoes = `
                <li>• <strong>Aguarde ${retryAfter} segundos</strong> - tentativa automática em breve</li>
                <li>• Use um <strong>arquivo XLSX</strong> com cronograma (sem usar API)</li>
                <li>• Continue sem edital e adicione disciplinas manualmente</li>
                <li>• <span class="text-xs text-gray-500">(${modelsAttempted} modelos IA testados)</span></li>
              `;
            } else if (isNoDisciplines || isExtractionFailed) {
              sugestoes = `
                <li>• <strong>✅ Continue e selecione disciplinas manualmente</strong> (mais rápido)</li>
                <li>• O texto pode não conter a seção de <strong>Conteúdo Programático</strong></li>
                <li>• Use um arquivo XLSX com cronograma de estudos</li>
                <li>• Converta o PDF para TXT em <a href="https://www.ilovepdf.com/pt/pdf_para_texto" target="_blank" class="text-[#1A3A7F] underline">ilovepdf.com</a></li>
              `;
            } else {
              sugestoes = `
                <li>• Converta o PDF para TXT em <a href="https://www.ilovepdf.com/pt/pdf_para_texto" target="_blank" class="text-[#1A3A7F] underline">ilovepdf.com</a></li>
                <li>• Use um arquivo XLSX com cronograma de estudos</li>
                <li>• Continue sem edital e adicione disciplinas manualmente</li>
              `;
            }
            
            // Determinar se pode fazer retry automático (erros de API podem)
            const canRetry = errorData?.canRetry !== false && isApiError;
            
            // ✅ NOVO: Mostrar tela de erro com CONTADOR REGRESSIVO para retry automático
            const renderErrorScreen = (countdown) => {
              const isCountdownActive = countdown > 0 && canRetry;
              
              document.getElementById('app').innerHTML = `
                <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center p-4">
                  <div class="${themes[currentTheme].card} rounded-xl p-6 max-w-lg w-full mx-4 text-center shadow-xl">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-full ${isApiError ? 'bg-[#E8EDF5]' : 'bg-[#C5D1E8]'} flex items-center justify-center relative">
                      <i class="fas ${iconClass} text-4xl"></i>
                      ${isCountdownActive ? `
                        <div class="absolute -top-1 -right-1 w-8 h-8 bg-[#122D6A] rounded-full flex items-center justify-center">
                          <span class="text-white text-sm font-bold" id="countdownBadge">${countdown}</span>
                        </div>
                      ` : ''}
                    </div>
                    <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-3">
                      ${titleText}
                    </h3>
                    <p class="text-gray-600 mb-4 text-sm">
                      ${detailedError}
                    </p>
                    
                    ${isCountdownActive ? `
                      <div class="bg-gradient-to-r from-[#E8EDF5] to-[#D0D9EB] border border-[#C5D1E8] rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-center gap-3 mb-2">
                          <i class="fas fa-sync-alt text-[#1A3A7F] animate-spin"></i>
                          <span class="text-[#0D1F4D] font-semibold">
                            Tentando novamente em <span id="countdownText" class="text-2xl font-bold text-[#122D6A]">${countdown}</span> segundos...
                          </span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div id="countdownBar" class="bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] h-2 rounded-full transition-all duration-1000" 
                               style="width: ${((retryAfter - countdown) / retryAfter) * 100}%"></div>
                        </div>
                        <p class="text-xs text-[#122D6A] mt-2">
                          <i class="fas fa-robot mr-1"></i> O sistema tentará automaticamente com diferentes modelos de IA
                        </p>
                      </div>
                    ` : (isApiError ? `
                      <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-center">
                        <i class="fas fa-check-circle text-green-500 mr-2"></i>
                        <span class="text-green-700 text-sm">
                          Pronto para tentar novamente!
                        </span>
                      </div>
                    ` : '')}
                    
                    <div class="${isApiError ? 'bg-[#E8EDF5] border-[#C5D1E8]' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4 mb-6 text-left">
                      <h4 class="font-semibold ${isApiError ? 'text-[#0D1F4D]' : 'text-yellow-800'} mb-2">💡 Enquanto aguarda:</h4>
                      <ul class="text-sm ${isApiError ? 'text-[#122D6A]' : 'text-yellow-700'} space-y-1">
                        ${sugestoes}
                      </ul>
                    </div>
                    
                    <div class="flex flex-col gap-3">
                      ${canContinueManually || isNoDisciplines || isExtractionFailed ? `
                        <button onclick="renderEntrevistaStep2()" 
                          class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition shadow-lg">
                          <i class="fas fa-check-circle mr-2"></i> Continuar e Selecionar Disciplinas
                        </button>
                      ` : ''}
                      ${canRetry ? `
                        <button id="retryButton" onclick="processarEditalAntesDeStep2()" 
                          ${isCountdownActive ? 'disabled' : ''}
                          class="w-full ${canContinueManually ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200' : 'bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] text-white shadow-lg'} py-3 rounded-xl font-semibold hover:from-[#0D1F4D] hover:to-[#122D6A] transition ${isCountdownActive ? 'opacity-60 cursor-not-allowed' : ''}">
                          <i class="fas ${isCountdownActive ? 'fa-hourglass-half' : 'fa-redo'} mr-2"></i> 
                          ${isCountdownActive ? 'Aguardando...' : 'Tentar Novamente'}
                        </button>
                      ` : ''}
                      <button onclick="renderEntrevistaStep1()" 
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition border border-gray-200">
                        <i class="fas fa-file-upload mr-2"></i> Anexar Outro Arquivo
                      </button>
                      ${!canContinueManually && !isNoDisciplines && !isExtractionFailed ? `
                        <button onclick="renderEntrevistaStep2()" 
                          class="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 py-3 rounded-xl font-medium transition border border-gray-200">
                          <i class="fas fa-arrow-right mr-2"></i> Continuar sem Edital
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>
              `;
            };
            
            // ✅ NOVO: Iniciar contador regressivo com retry automático
            if (canRetry) {
              let countdown = retryAfter;
              renderErrorScreen(countdown);
              
              const countdownInterval = setInterval(() => {
                countdown--;
                
                // Atualizar elementos do countdown (se existirem)
                const countdownText = document.getElementById('countdownText');
                const countdownBadge = document.getElementById('countdownBadge');
                const countdownBar = document.getElementById('countdownBar');
                const retryButton = document.getElementById('retryButton');
                
                if (countdownText) countdownText.textContent = countdown;
                if (countdownBadge) countdownBadge.textContent = countdown;
                if (countdownBar) countdownBar.style.width = `${((retryAfter - countdown) / retryAfter) * 100}%`;
                
                if (countdown <= 0) {
                  clearInterval(countdownInterval);
                  
                  // Atualizar UI para mostrar que está tentando novamente
                  if (retryButton) {
                    retryButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Tentando novamente...';
                    retryButton.disabled = true;
                  }
                  
                  // ✅ RETRY AUTOMÁTICO
                  console.log('🔄 Iniciando retry automático após countdown...');
                  processarEditalAntesDeStep2();
                }
              }, 1000);
              
              // Salvar referência para poder cancelar se usuário clicar em outro botão
              window.countdownInterval = countdownInterval;
            } else {
              renderErrorScreen(0);
            }
            
            return; // Não continuar, aguardar ação do usuário ou countdown
          }
          
          throw new Error(`Processamento falhou: ${detailedError}`);
        }
        
        // Erro genérico
        atualizarFeedbackUI(2, `❌ Erro inesperado: ${errorMsg}`, 'error');
        throw procError; // Re-lançar para ser capturado pelo catch externo
      }
    }

    // 3️⃣ Buscar disciplinas do edital processado (usar o ID salvo)
    if (interviewData.edital_id) {
      console.log(`✅ Usando edital ID: ${interviewData.edital_id}`);
      atualizarFeedbackUI(4, `🔍 Carregando disciplinas do edital ${interviewData.edital_id}...`);
      
      try {
        const disciplinasRes = await axios.get(`/api/editais/${interviewData.edital_id}/disciplinas`);
        interviewData.disciplinas_do_edital = disciplinasRes.data;
        
        console.log(`📚 ${disciplinasRes.data.length} disciplinas extraídas do edital`);
        console.log('📋 Disciplinas:', disciplinasRes.data.map(d => d.nome).join(', '));
        
        // Feedback detalhado das disciplinas encontradas
        atualizarFeedbackUI(4, `📚 ${disciplinasRes.data.length} disciplinas carregadas:`, 'success');
        disciplinasRes.data.slice(0, 5).forEach(disc => {
          atualizarFeedbackUI(4, `  • ${disc.nome}${disc.peso ? ` (${disc.peso} questões)` : ''}`, 'success');
        });
        if (disciplinasRes.data.length > 5) {
          atualizarFeedbackUI(4, `  ... e mais ${disciplinasRes.data.length - 5} disciplinas`, 'success');
        }
        
        // Aguardar 1s para o usuário ler
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (discError) {
        console.error('❌ Erro ao buscar disciplinas do edital:', discError);
        atualizarFeedbackUI(4, `❌ Erro ao carregar disciplinas: ${discError.message}`, 'error');
        interviewData.disciplinas_do_edital = [];
      }
    } else {
      console.warn('⚠️ Nenhum edital ID disponível');
      atualizarFeedbackUI(4, `⚠️ Nenhum edital processado. Disciplinas padrão serão exibidas.`, 'error');
      interviewData.disciplinas_do_edital = [];
    }

    // Sucesso! Ir para Step2
    atualizarFeedbackUI(5, `✅ Processamento concluído! Redirecionando...`, 'success');
    await new Promise(resolve => setTimeout(resolve, 1500));
    renderEntrevistaStep2();
    
  } catch (error) {
    // Log completo do erro para debug
    console.error('❌ Erro ao processar edital (COMPLETO):', error);
    console.error('❌ Tipo do erro:', typeof error);
    console.error('❌ Error.message:', error?.message);
    console.error('❌ Error.response:', error?.response);
    console.error('❌ Error.response.data:', error?.response?.data);
    console.error('❌ JSON do erro:', JSON.stringify(error, null, 2));
    
    // Atualizar UI com erro detalhado
    atualizarFeedbackUI(etapaAtual, `❌ ERRO CRÍTICO: ${error.message || 'Erro desconhecido'}`, 'error');
    
    // Fallback: continuar sem edital
    let errorMsg = '⚠️ Não foi possível processar o edital automaticamente.\n\n';
    let errorDetails = '';
    
    if (error.response) {
      // Erro HTTP do backend
      const backendError = error.response.data?.error || 'Erro desconhecido';
      errorDetails = `Erro do servidor: ${backendError}`;
      errorMsg += `${errorDetails}\n\n`;
      
      if (backendError.includes('Texto do edital vazio')) {
        errorMsg += '💡 Dica: O PDF pode estar protegido ou vazio. Converta para TXT antes de anexar.';
        atualizarFeedbackUI(etapaAtual, `💡 Solução: Converta o PDF para TXT usando um conversor online.`, 'error');
      } else if (backendError.includes('IA API')) {
        errorMsg += '💡 Dica: O serviço de IA pode estar temporariamente indisponível. Tente novamente.';
        atualizarFeedbackUI(etapaAtual, `💡 Solução: Aguarde alguns minutos e tente novamente.`, 'error');
      } else if (backendError.includes('não retornou JSON')) {
        errorMsg += '💡 Dica: A IA não conseguiu estruturar as disciplinas. Tente um arquivo TXT ou XLSX.';
        atualizarFeedbackUI(etapaAtual, `💡 Solução: Use um arquivo XLSX com cronograma ou converta o PDF.`, 'error');
      }
    } else if (error.message) {
      errorDetails = error.message;
      errorMsg += `Erro: ${errorDetails}\n\n`;
      atualizarFeedbackUI(etapaAtual, `Detalhes: ${errorDetails}`, 'error');
    } else {
      // Se não for um objeto Error padrão, mostrar o que é
      errorDetails = String(error);
      errorMsg += `Erro: ${errorDetails}\n\n`;
      atualizarFeedbackUI(etapaAtual, `Erro genérico: ${errorDetails}`, 'error');
    }
    
    errorMsg += '\n✅ Você pode continuar selecionando disciplinas manualmente.';
    
    // Mostrar erro na UI com opção de continuar
    atualizarFeedbackUI(etapaAtual, `⚠️ Pressione OK para continuar manualmente`, 'error');
    
    // Aguardar 2s antes do alert
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    showModal(errorMsg, { type: 'error' });
    
    renderEntrevistaStep2();
  }
}

function renderAreaGeral() {
  const areas = [
    { id: 'fiscal', nome: 'Fiscal', icon: 'fa-calculator', color: 'from-[#122D6A] to-[#2A4A9F]' },
    { id: 'policial', nome: 'Policial', icon: 'fa-shield-alt', color: 'from-[#2A4A9F] to-[#3A5AB0]' },
    { id: 'tribunais', nome: 'Tribunais', icon: 'fa-gavel', color: 'from-[#3A5AB0] to-[#4A6AC0]' },
    { id: 'administrativo', nome: 'Administrativo', icon: 'fa-building', color: 'from-gray-500 to-gray-600' },
    { id: 'saude', nome: 'Saúde', icon: 'fa-heartbeat', color: 'from-[#1A3D7A] to-[#2A4A9F]' },
    { id: 'educacao', nome: 'Educação', icon: 'fa-graduation-cap', color: 'from-[#2A4A9F] to-[#3A5AB0]' }
  ];

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-4 md:py-8">
      <div class="max-w-3xl mx-auto px-3 md:px-4">
        <div class="${themes[currentTheme].card} rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
          <!-- Header com progress visual moderno -->
          <div class="mb-6 md:mb-8">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 md:gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-sm md:text-base">1</span>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">Escolha a área</h2>
                  <p class="text-xs md:text-sm text-gray-500">Selecione sua área de interesse</p>
                </div>
              </div>
              <span class="hidden md:block text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">1/4</span>
            </div>
            
            <!-- Progress bar moderno -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 md:h-2 rounded-full transition-all duration-500" style="width: 25%"></div>
              </div>
              <div class="flex justify-between mt-1 text-[10px] md:text-xs text-gray-400">
                <span class="text-[#122D6A] font-medium">Objetivo</span>
                <span>Perfil</span>
                <span>Disciplinas</span>
                <span>Concluir</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
            ${areas.map(area => `
              <button onclick="selecionarArea('${area.id}')" 
                class="p-4 md:p-6 border-2 ${themes[currentTheme].border} rounded-xl hover:border-[#122D6A] hover:shadow-lg transition-all duration-200 group flex flex-col items-center justify-center">
                <div class="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${area.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform shadow-lg">
                  <i class="fas ${area.icon} text-xl md:text-2xl text-white"></i>
                </div>
                <h4 class="font-semibold text-sm md:text-base ${themes[currentTheme].text}">${area.nome}</h4>
              </button>
            `).join('')}
          </div>

          <button onclick="renderEntrevistaStep1()" 
            class="mt-6 md:mt-8 w-full md:w-auto px-6 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm md:text-base text-gray-600 flex items-center justify-center gap-2">
            <i class="fas fa-arrow-left text-xs"></i>
            Voltar
          </button>
        </div>
      </div>
    </div>
  `;
}

function selecionarArea(area) {
  interviewData.area_geral = area;
  renderEntrevistaStep2();
}

function renderEntrevistaStep2() {
  // ✅ Cancelar qualquer countdown ativo ao trocar de tela
  if (window.countdownInterval) {
    clearInterval(window.countdownInterval);
    window.countdownInterval = null;
  }
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-4 md:py-8">
      <div class="max-w-3xl mx-auto px-3 md:px-4">
        <div class="${themes[currentTheme].card} rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
          <!-- Header com progress visual moderno -->
          <div class="mb-6 md:mb-8">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 md:gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-sm md:text-base">2</span>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">Seu Perfil</h2>
                  <p class="text-xs md:text-sm text-gray-500">Conte-nos sobre você</p>
                </div>
              </div>
              <span class="hidden md:block text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">2/4</span>
            </div>
            
            <!-- Progress bar moderno -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 md:h-2 rounded-full transition-all duration-500" style="width: 50%"></div>
              </div>
              <div class="flex justify-between mt-1 text-[10px] md:text-xs text-gray-400">
                <span class="text-green-500"><i class="fas fa-check text-[8px]"></i></span>
                <span class="text-[#122D6A] font-medium">Perfil</span>
                <span>Disciplinas</span>
                <span>Concluir</span>
              </div>
            </div>
          </div>

          <form id="perfilForm" class="space-y-4 md:space-y-6">
            <!-- Tempo disponível -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-2 md:mb-3">
                <i class="fas fa-clock mr-1 text-[#1A3A7F]"></i>
                Tempo disponível por dia
              </label>
              <div class="grid grid-cols-3 gap-2 md:gap-3">
                ${[
                  { val: 120, label: '2h', labelFull: '2 horas', icon: 'fa-battery-quarter' },
                  { val: 240, label: '4h', labelFull: '4 horas', icon: 'fa-battery-half' },
                  { val: 360, label: '6h+', labelFull: '6+ horas', icon: 'fa-battery-full' }
                ].map(t => `
                  <label class="cursor-pointer">
                    <input type="radio" name="tempo" value="${t.val}" required class="hidden peer">
                    <div class="p-3 md:p-4 border-2 ${themes[currentTheme].border} rounded-lg md:rounded-xl text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md">
                      <i class="fas ${t.icon} text-lg md:text-xl text-[#1A3A7F] mb-1 md:mb-2 block peer-checked:text-[#0D1F4D]"></i>
                      <p class="font-semibold text-sm md:text-base ${themes[currentTheme].text}">
                        <span class="md:hidden">${t.label}</span>
                        <span class="hidden md:inline">${t.labelFull}</span>
                      </p>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- ✅ NOVO: Dias da semana disponíveis -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-2 md:mb-3">
                <i class="fas fa-calendar-week mr-1 text-[#1A3A7F]"></i>
                Quais dias da semana pode estudar?
              </label>
              <div class="grid grid-cols-7 gap-1 md:gap-2">
                ${[
                  { val: 0, label: 'D', labelFull: 'Dom' },
                  { val: 1, label: 'S', labelFull: 'Seg' },
                  { val: 2, label: 'T', labelFull: 'Ter' },
                  { val: 3, label: 'Q', labelFull: 'Qua' },
                  { val: 4, label: 'Q', labelFull: 'Qui' },
                  { val: 5, label: 'S', labelFull: 'Sex' },
                  { val: 6, label: 'S', labelFull: 'Sáb' }
                ].map(d => `
                  <label class="cursor-pointer">
                    <input type="checkbox" name="dias_semana" value="${d.val}" class="hidden peer" ${d.val >= 1 && d.val <= 5 ? 'checked' : ''}>
                    <div class="p-2 md:p-3 border-2 ${themes[currentTheme].border} rounded-lg text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md">
                      <p class="font-semibold text-xs md:text-sm ${themes[currentTheme].text}">
                        <span class="md:hidden">${d.label}</span>
                        <span class="hidden md:inline">${d.labelFull}</span>
                      </p>
                    </div>
                  </label>
                `).join('')}
              </div>
              <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-1.5">
                <i class="fas fa-info-circle mr-1"></i>
                Dias úteis já vêm selecionados. Clique para alterar.
              </p>
            </div>

            <!-- Experiência -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-2 md:mb-3">
                <i class="fas fa-graduation-cap mr-1 text-[#1A3A7F]"></i>
                Experiência em concursos
              </label>
              <div class="grid grid-cols-3 gap-2 md:gap-3">
                ${[
                  { val: 'iniciante', label: 'Iniciante', icon: 'fa-seedling', color: 'text-green-500', desc: 'Começando' },
                  { val: 'intermediario', label: 'Médio', labelFull: 'Intermediário', icon: 'fa-chart-line', color: 'text-blue-500', desc: 'Alguns meses' },
                  { val: 'avancado', label: 'Expert', labelFull: 'Avançado', icon: 'fa-trophy', color: 'text-amber-500', desc: '+1 ano' }
                ].map(e => `
                  <label class="cursor-pointer" title="${e.desc}">
                    <input type="radio" name="experiencia" value="${e.val}" required class="hidden peer">
                    <div class="p-3 md:p-4 border-2 ${themes[currentTheme].border} rounded-lg md:rounded-xl text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md">
                      <i class="fas ${e.icon} text-xl md:text-2xl ${e.color} mb-1 md:mb-2 block"></i>
                      <p class="font-semibold text-xs md:text-sm ${themes[currentTheme].text}">
                        <span class="md:hidden">${e.label}</span>
                        <span class="hidden md:inline">${e.labelFull || e.label}</span>
                      </p>
                      <p class="text-[9px] md:text-[10px] ${themes[currentTheme].textSecondary} mt-0.5">${e.desc}</p>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- Já estudou antes -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-2 md:mb-3">
                <i class="fas fa-history mr-1 text-[#1A3A7F]"></i>
                Já estudou para concursos?
              </label>
              <div class="grid grid-cols-2 gap-2 md:gap-3">
                <label class="cursor-pointer">
                  <input type="radio" name="jaEstudou" value="true" required class="hidden peer">
                  <div class="p-3 md:p-4 border-2 ${themes[currentTheme].border} rounded-lg md:rounded-xl text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md flex items-center justify-center gap-2">
                    <i class="fas fa-check-circle text-green-500"></i>
                    <p class="font-semibold text-sm md:text-base ${themes[currentTheme].text}">Sim</p>
                  </div>
                </label>
                <label class="cursor-pointer">
                  <input type="radio" name="jaEstudou" value="false" required class="hidden peer">
                  <div class="p-3 md:p-4 border-2 ${themes[currentTheme].border} rounded-lg md:rounded-xl text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md flex items-center justify-center gap-2">
                    <i class="fas fa-times-circle text-gray-400"></i>
                    <p class="font-semibold text-sm md:text-base ${themes[currentTheme].text}">Não</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Concursos prestados -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-1.5 md:mb-2">
                <i class="fas fa-list-ol mr-1 text-[#1A3A7F]"></i>
                Quantos concursos já prestou?
              </label>
              <input type="number" name="concursos_prestados" min="0" value="0"
                class="w-full px-3 md:px-4 py-2.5 md:py-3 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base">
            </div>

            <!-- Bancas Preferidas (especialmente para área geral) -->
            ${interviewData.objetivo_tipo === 'area_geral' ? `
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-2 md:mb-3">
                <i class="fas fa-landmark mr-1 text-[#1A3A7F]"></i>
                Quais bancas você prefere estudar?
              </label>
              <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mb-2">
                <i class="fas fa-info-circle mr-1"></i>
                Selecione as bancas que mais aparecem nos concursos da sua área. Questões e conteúdo serão adaptados.
              </p>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                ${[
                  { val: 'CESPE/CEBRASPE', label: 'CESPE/Cebraspe', desc: 'Certo/Errado' },
                  { val: 'FCC', label: 'FCC', desc: 'Carlos Chagas' },
                  { val: 'FGV', label: 'FGV', desc: 'Getúlio Vargas' },
                  { val: 'VUNESP', label: 'VUNESP', desc: 'São Paulo' },
                  { val: 'CESGRANRIO', label: 'CESGRANRIO', desc: 'Petrobras/CEF' },
                  { val: 'IBFC', label: 'IBFC', desc: 'Diversas' }
                ].map(b => `
                  <label class="cursor-pointer">
                    <input type="checkbox" name="bancas_preferidas" value="${b.val}" class="hidden peer">
                    <div class="p-2 md:p-3 border-2 ${themes[currentTheme].border} rounded-lg text-center peer-checked:border-[#122D6A] peer-checked:bg-gradient-to-br peer-checked:from-[#E8EDF5] peer-checked:to-[#D0D9EB] hover:border-[#8FA4CC] transition-all peer-checked:shadow-md">
                      <p class="font-semibold text-xs md:text-sm ${themes[currentTheme].text}">${b.label}</p>
                      <p class="text-[9px] md:text-[10px] ${themes[currentTheme].textSecondary}">${b.desc}</p>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
            ` : ''}

            <!-- Experiências detalhadas - Colapsável no mobile -->
            <div>
              <label class="block text-xs md:text-sm font-medium ${themes[currentTheme].text} mb-1.5 md:mb-2">
                <i class="fas fa-comment-alt mr-1 text-[#1A3A7F]"></i>
                Experiências <span class="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea name="experiencias_detalhadas" rows="3" 
                placeholder="Ex: Tenho dificuldade em Raciocínio Lógico..."
                class="w-full px-3 md:px-4 py-2 md:py-2.5 ${themes[currentTheme].input} rounded-lg md:rounded-xl border-2 border-gray-200 focus:border-[#1A3A7F] focus:ring-2 focus:ring-[#1A3A7F]/20 transition-all text-sm md:text-base resize-none"></textarea>
              <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-1">
                <i class="fas fa-magic mr-1"></i>
                Ajuda a personalizar seu plano
              </p>
            </div>

            <!-- Botões -->
            <div class="flex gap-2 md:gap-4 pt-2">
              <button type="button" onclick="voltarStep1()" 
                class="px-4 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm md:text-base text-gray-600 flex items-center gap-1 md:gap-2">
                <i class="fas fa-arrow-left text-xs"></i>
                <span class="hidden md:inline">Voltar</span>
              </button>
              <button type="submit" 
                class="flex-1 bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] text-white py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-[#0D1F4D] hover:to-[#122D6A] transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-[#122D6A]/20">
                <span>Continuar</span>
                <i class="fas fa-arrow-right text-xs"></i>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('perfilForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    interviewData.tempo_disponivel_dia = parseInt(formData.get('tempo'));
    interviewData.experiencia = formData.get('experiencia');
    interviewData.ja_estudou_antes = formData.get('jaEstudou') === 'true';
    interviewData.concursos_prestados = parseInt(formData.get('concursos_prestados')) || 0;
    interviewData.experiencias_detalhadas = formData.get('experiencias_detalhadas') || '';
    
    // ✅ NOVO: Coletar dias da semana selecionados
    const diasSemana = formData.getAll('dias_semana').map(d => parseInt(d));
    interviewData.dias_semana = diasSemana.length > 0 ? diasSemana : [1, 2, 3, 4, 5]; // Default: seg a sex
    console.log('📅 Dias da semana selecionados:', interviewData.dias_semana);
    
    // ✅ NOVO: Coletar bancas preferidas (para área geral)
    const bancasPreferidas = formData.getAll('bancas_preferidas');
    if (bancasPreferidas.length > 0) {
      interviewData.bancas_preferidas = bancasPreferidas;
      console.log('🏛️ Bancas preferidas:', interviewData.bancas_preferidas);
    }
    
    renderEntrevistaStep3();
  });
}

function voltarStep1() {
  if (interviewData.objetivo_tipo === 'concurso_especifico') {
    renderConcursoEspecifico();
  } else {
    renderAreaGeral();
  }
}

async function renderEntrevistaStep3() {
  let disciplinasFiltradas = [];
  
  // 🐛 DEBUG: Mostrar estado do interviewData
  console.log('🔍 DEBUG interviewData:', {
    edital_id: interviewData.edital_id,
    disciplinas_do_edital: interviewData.disciplinas_do_edital?.length || 0,
    tem_disciplinas: !!(interviewData.disciplinas_do_edital && interviewData.disciplinas_do_edital.length > 0)
  });
  
  // ✅ NOVA LÓGICA: Usar disciplinas do EDITAL se disponível
  if (interviewData.disciplinas_do_edital && interviewData.disciplinas_do_edital.length > 0) {
    // 🎯 USAR DISCIPLINAS DO EDITAL
    console.log(`📄 Usando ${interviewData.disciplinas_do_edital.length} disciplinas do edital processado`);
    console.log('📋 Disciplinas:', interviewData.disciplinas_do_edital.map(d => d.nome).join(', '));
    
    // Mapear para formato esperado (INCLUINDO PESO do edital)
    disciplinasFiltradas = interviewData.disciplinas_do_edital.map(d => ({
      id: d.id || 0,
      nome: d.nome,
      descricao: `Disciplina extraída do edital (${d.total_topicos || 0} tópicos)`,
      area: 'edital', // Flag especial
      peso: d.peso || null // ✅ CORREÇÃO: Incluir peso do edital
    }));
    
  } else {
    // 🔄 FALLBACK: Carregar disciplinas padrão se não houver edital
    console.log('📚 Nenhum edital processado. Carregando disciplinas padrão...');
    
    // Carregar disciplinas padrão agora
    const response = await axios.get('/api/disciplinas');
    disciplinasDisponiveis = response.data;
    
    // Filtrar disciplinas: BÁSICAS + GERAIS + ESPECÍFICAS DA ÁREA
    const disciplinasBasicas = disciplinasDisponiveis.filter(d => d.area === 'basico');
    const disciplinasGerais = disciplinasDisponiveis.filter(d => d.area === 'geral');
    
    let disciplinasArea = [];
    if (interviewData.area_geral) {
      disciplinasArea = disciplinasDisponiveis.filter(d => d.area === interviewData.area_geral);
    } else if (interviewData.cargo) {
      const areaDetectada = detectarAreaPorCargo(interviewData.cargo);
      if (areaDetectada) {
        interviewData.area_geral = areaDetectada;
        disciplinasArea = disciplinasDisponiveis.filter(d => d.area === areaDetectada);
      }
    }
    
    disciplinasFiltradas = [...disciplinasBasicas, ...disciplinasGerais, ...disciplinasArea];
  }

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-4 md:py-8">
      <div class="max-w-4xl mx-auto px-3 md:px-4">
        <div class="${themes[currentTheme].card} rounded-xl md:rounded-2xl shadow-xl p-4 md:p-8">
          <!-- Header com progress visual moderno -->
          <div class="mb-4 md:mb-6">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 md:gap-3">
                <div class="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-sm md:text-base">3</span>
                </div>
                <div>
                  <h2 class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">Disciplinas</h2>
                  <p class="text-xs md:text-sm text-gray-500">Selecione e avalie</p>
                </div>
              </div>
              <span class="hidden md:block text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full">3/4</span>
            </div>
            
            <!-- Progress bar moderno -->
            <div class="relative">
              <div class="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
                <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 md:h-2 rounded-full transition-all duration-500" style="width: 75%"></div>
              </div>
              <div class="flex justify-between mt-1 text-[10px] md:text-xs text-gray-400">
                <span class="text-green-500"><i class="fas fa-check text-[8px]"></i></span>
                <span class="text-green-500"><i class="fas fa-check text-[8px]"></i></span>
                <span class="text-[#122D6A] font-medium">Disciplinas</span>
                <span>Concluir</span>
              </div>
            </div>
          </div>

          <!-- Dica compacta no mobile, completa no desktop -->
          <div class="bg-gradient-to-r from-[#E8EDF5] to-[#F3F6FA] border border-[#C5D1E8] rounded-lg md:rounded-xl p-3 md:p-5 mb-4 md:mb-6">
            <div class="flex items-start gap-2 md:gap-4">
              <div class="w-8 h-8 md:w-10 md:h-10 bg-[#122D6A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-lightbulb text-[#1A3A7F] text-sm md:text-lg"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs md:text-sm text-gray-700">
                  <span class="font-semibold text-[#0D1F4D]">Dica:</span>
                  Selecione <span class="font-semibold text-[#122D6A]">8-15 disciplinas</span> para um estudo eficiente
                </p>
                <p class="text-[10px] md:text-xs text-gray-500 mt-1 hidden md:block">
                  Marque as disciplinas do seu edital e indique seu nível em cada uma
                </p>
              </div>
            </div>
          </div>
          
          <!-- Cabeçalho com contador e ações - Responsivo -->
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 mb-3 md:mb-4">
            <div class="flex items-center gap-2 md:gap-3">
              <span id="contador-disciplinas" class="px-2.5 md:px-3 py-1 md:py-1.5 bg-[#D0D9EB] text-[#0D1F4D] rounded-full text-xs md:text-sm font-medium">
                <span id="num-selecionadas">0</span> selecionadas
              </span>
              <span class="text-xs md:text-sm text-gray-500">de ${disciplinasFiltradas.length}</span>
            </div>
            <div class="flex gap-1.5 md:gap-2">
              <button type="button" onclick="selecionarTodasDisciplinas()" 
                class="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs bg-[#E8EDF5] text-[#1A3A7F] rounded-lg hover:bg-[#D0D9EB] transition-all">
                <i class="fas fa-check-double mr-1"></i>
                <span class="hidden md:inline">Selecionar</span> Todas
              </button>
              <button type="button" onclick="limparTodasDisciplinas()" 
                class="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all">
                <i class="fas fa-times mr-1"></i>
                Limpar
              </button>
            </div>
          </div>
          
          <!-- Legenda do peso - Compacta -->
          <div class="text-[10px] md:text-xs text-gray-500 mb-2 md:mb-3 flex items-center gap-3 md:gap-4">
            <span class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 md:w-3 md:h-3 bg-[#2A4A9F]/10 border border-green-300 rounded"></span>
              <span class="hidden md:inline">Peso do edital</span>
              <span class="md:hidden">Edital</span>
            </span>
            <span class="flex items-center gap-1">
              <span class="w-2.5 h-2.5 md:w-3 md:h-3 bg-gray-100 border border-gray-200 rounded"></span>
              Opcional
            </span>
          </div>

          <!-- ✅ DESIGN MINIMALISTA: Tudo em uma linha, sem expansão -->
          <form id="disciplinasForm" class="space-y-2">
            ${disciplinasFiltradas.map(disc => `
              <div id="card_${disc.id}" 
                   class="border ${disc.peso ? 'border-green-300 bg-green-50/30' : 'border-gray-200'} rounded-lg p-3 transition-all duration-150 hover:border-blue-400 hover:bg-[#E8EDF5]/50 cursor-pointer" 
                   data-selected="false"
                   onclick="toggleDisciplinaByCard(${disc.id})">
                
                <div class="flex items-center gap-3">
                  <!-- Checkbox -->
                  <input type="checkbox" id="select_${disc.id}" 
                    onclick="event.stopPropagation()"
                    onchange="toggleDisciplinaSelection(${disc.id})"
                    class="w-5 h-5 text-[#1A3A7F] rounded focus:ring-[#1A3A7F] flex-shrink-0">
                  
                  <!-- Nome + Tópicos -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-gray-900 truncate">${disc.nome}</span>
                      <span class="text-xs text-gray-400 flex-shrink-0">(${disc.total_topicos || disc.topicos?.length || 0} tópicos)</span>
                      ${(disc.total_topicos || disc.topicos?.length || 0) > 0 ? `
                        <button type="button" onclick="event.stopPropagation();toggleTopicos(${disc.id})" 
                          class="text-xs text-[#1A3A7F] hover:text-[#0D1F4D] flex items-center gap-1" title="Ver/editar tópicos">
                          <i class="fas fa-eye text-xs"></i>
                        </button>
                      ` : ''}
                    </div>
                    ${disc.descricao ? `<p class="text-xs text-gray-500 truncate">${disc.descricao}</p>` : ''}
                  </div>
                  
                  <!-- Peso (editável) -->
                  <div class="flex items-center gap-1 flex-shrink-0" onclick="event.stopPropagation()">
                    ${disc.peso ? `
                      <span class="text-xs text-[#2A4A9F] font-medium">Peso:</span>
                      <input type="number" id="peso_${disc.id}" 
                        min="1" max="20" 
                        value="${disc.peso}"
                        class="w-14 px-2 py-1 text-sm text-center border border-green-300 rounded bg-green-50 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        title="Peso extraído do edital (editável)">
                    ` : `
                      <span class="text-xs text-gray-400">Peso:</span>
                      <input type="number" id="peso_${disc.id}" 
                        min="1" max="20" 
                        placeholder="-"
                        class="w-14 px-2 py-1 text-sm text-center border border-gray-200 rounded focus:ring-2 focus:ring-[#1A3A7F] focus:border-[#1A3A7F]"
                        title="Informe o peso (opcional)">
                    `}
                  </div>
                </div>
                
                <!-- Slider de Nível de Domínio (0-10) -->
                <div id="avaliacao_${disc.id}" class="hidden mt-3 pt-3 border-t border-gray-100">
                  <div class="flex flex-col gap-2" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-gray-600 font-medium">
                        <i class="fas fa-brain mr-1 text-[#1A3A7F]"></i>Nível de domínio:
                      </span>
                      <span id="dominio_valor_${disc.id}" class="text-sm font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">0</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] text-red-500 font-medium w-12">Não sei</span>
                      <input type="range" 
                        id="dominio_${disc.id}" 
                        min="0" max="10" value="0" 
                        class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-dominio"
                        oninput="atualizarDominio(${disc.id}, this.value)"
                        style="accent-color: #122D6A;">
                      <span class="text-[10px] text-[#2A4A9F] font-medium w-12 text-right">Domino</span>
                    </div>
                    <div class="flex justify-between text-[9px] text-gray-400 px-12">
                      <span>0</span>
                      <span>2</span>
                      <span>4</span>
                      <span>6</span>
                      <span>8</span>
                      <span>10</span>
                    </div>
                  </div>
                </div>
                
                <!-- Seção de Tópicos (exibida ao clicar no botão de olho) -->
                <div id="topicos_${disc.id}" class="hidden mt-3 pt-3 border-t border-gray-200">
                  <div class="flex items-center justify-between mb-2">
                    <h5 class="text-sm font-semibold text-gray-700">
                      <i class="fas fa-list text-xs mr-1"></i>
                      Tópicos do Edital (${disc.topicos?.length || 0})
                    </h5>
                    <button type="button" onclick="event.stopPropagation();adicionarTopico(${disc.id})" 
                      class="text-xs text-[#2A4A9F] hover:text-green-700 flex items-center gap-1">
                      <i class="fas fa-plus-circle"></i> Adicionar
                    </button>
                  </div>
                  <div id="lista_topicos_${disc.id}" class="space-y-1.5 max-h-48 overflow-y-auto">
                    ${disc.topicos && disc.topicos.length > 0 ? disc.topicos.map((top, idx) => `
                      <div class="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded group hover:bg-[#E8EDF5]">
                        <span class="text-gray-400 font-mono">${idx + 1}.</span>
                        <input type="text" 
                          id="topico_${disc.id}_${idx}"
                          value="${top.nome || top}"
                          class="flex-1 bg-transparent border-none focus:ring-1 focus:ring-[#1A3A7F] rounded px-1"
                          onchange="atualizarTopico(${disc.id}, ${idx}, this.value)">
                        <button type="button" onclick="event.stopPropagation();removerTopico(${disc.id}, ${idx})" 
                          class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">
                          <i class="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    `).join('') : '<p class="text-xs text-gray-400 italic py-2">Nenhum tópico cadastrado</p>'}
                  </div>
                </div>
              </div>
            `).join('')}
            
            <!-- Seção de Disciplinas Personalizadas -->
            <div class="${themes[currentTheme].alert} border-2 rounded-lg p-6 mt-8">
              <h4 class="font-semibold text-blue-900 mb-2 flex items-center">
                <i class="fas fa-plus-circle mr-2"></i>
                📚 Adicionar Disciplinas Personalizadas
              </h4>
              <p class="text-sm text-[#122D6A] mb-4">
                Seu concurso/edital tem disciplinas específicas que não estão listadas acima? 
                <br>Adicione-as aqui (ex: "Conhecimentos sobre o Piauí", "Legislação Municipal", "Estatuto do Servidor")
              </p>
              
              <div class="flex gap-2 mb-4">
                <input 
                  type="text" 
                  id="nova-disciplina-input"
                  placeholder="Nome da disciplina personalizada..."
                  class="flex-1 border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#1A3A7F] focus:border-[#1A3A7F]"
                  onkeypress="if(event.key==='Enter'){event.preventDefault();adicionarDisciplinaCustom();}"
                >
                <button 
                  type="button"
                  onclick="adicionarDisciplinaCustom()"
                  class="bg-[#122D6A] text-white px-6 py-2 rounded-lg hover:bg-[#0D1F4D] font-medium flex items-center"
                >
                  <i class="fas fa-plus mr-2"></i> Adicionar
                </button>
              </div>
              
              <!-- Lista de disciplinas personalizadas -->
              <div id="disciplinas-custom-list" class="space-y-2"></div>
            </div>

            <!-- Botões - Responsivos -->
            <div class="flex gap-2 md:gap-4 pt-4 md:pt-6">
              <button type="button" onclick="renderEntrevistaStep2()" 
                class="px-4 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm md:text-base text-gray-600 flex items-center gap-1 md:gap-2">
                <i class="fas fa-arrow-left text-xs"></i>
                <span class="hidden md:inline">Voltar</span>
              </button>
              <button type="submit" 
                class="flex-1 bg-gradient-to-r from-[#122D6A] to-[#1A3A7F] text-white py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-[#0D1F4D] hover:to-[#122D6A] transition-all font-semibold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-[#122D6A]/20">
                <i class="fas fa-check-circle"></i>
                <span>Finalizar</span>
                <span class="hidden md:inline">Entrevista</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // ✅ NOVA FUNÇÃO: Clique no card inteiro para selecionar
  window.toggleDisciplinaByCard = (discId) => {
    const checkbox = document.getElementById(`select_${discId}`);
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
      toggleDisciplinaSelection(discId);
    }
  };

  // ✅ FUNÇÃO SIMPLIFICADA: Controlar seleção de disciplina
  window.toggleDisciplinaSelection = (discId) => {
    const checkbox = document.getElementById(`select_${discId}`);
    const card = document.getElementById(`card_${discId}`);
    const avaliacaoDiv = document.getElementById(`avaliacao_${discId}`);
    
    if (!checkbox || !card) return;
    
    const isSelected = checkbox.checked;
    
    // Atualizar visual do card (minimalista)
    if (isSelected) {
      card.classList.add('border-blue-500', 'bg-[#E8EDF5]', 'ring-1', 'ring-blue-200');
      card.classList.remove('border-gray-200', 'border-green-300', 'bg-green-50/30');
      card.setAttribute('data-selected', 'true');
      if (avaliacaoDiv) avaliacaoDiv.classList.remove('hidden');
    } else {
      card.classList.remove('border-blue-500', 'bg-[#E8EDF5]', 'ring-1', 'ring-blue-200');
      card.classList.add('border-gray-200');
      card.setAttribute('data-selected', 'false');
      if (avaliacaoDiv) avaliacaoDiv.classList.add('hidden');
      
      // Resetar slider de domínio quando desmarca
      const dominioSlider = document.getElementById(`dominio_${discId}`);
      const dominioValor = document.getElementById(`dominio_valor_${discId}`);
      if (dominioSlider) dominioSlider.value = 0;
      if (dominioValor) {
        dominioValor.textContent = '0';
        dominioValor.className = 'text-sm font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700';
      }
    }
    
    atualizarContador();
  };
  
  // ✅ FUNÇÃO: Atualizar visual do slider de domínio
  window.atualizarDominio = (discId, valor) => {
    const valorSpan = document.getElementById(`dominio_valor_${discId}`);
    if (!valorSpan) return;
    
    valorSpan.textContent = valor;
    
    // Cores baseadas no nível
    if (valor <= 3) {
      valorSpan.className = 'text-sm font-bold px-2 py-0.5 rounded bg-red-100 text-red-700';
    } else if (valor <= 6) {
      valorSpan.className = 'text-sm font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700';
    } else {
      valorSpan.className = 'text-sm font-bold px-2 py-0.5 rounded bg-[#2A4A9F]/10 text-green-700';
    }
  };
  
  // toggleNivel removido - layout minimalista não usa slider de nível
  
  window.atualizarContador = () => {
    const selecionadas = disciplinasFiltradas.filter(disc => {
      const selectCheckbox = document.getElementById(`select_${disc.id}`);
      return selectCheckbox && selectCheckbox.checked;
    }).length;
    
    const numSpan = document.getElementById('num-selecionadas');
    const contador = document.getElementById('contador-disciplinas');
    
    if (numSpan) numSpan.textContent = selecionadas;
    
    // Mudar cor baseado na quantidade (layout minimalista)
    if (contador) {
      if (selecionadas === 0) {
        contador.className = 'px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium';
      } else if (selecionadas <= 15) {
        contador.className = 'px-3 py-1.5 bg-[#2A4A9F]/10 text-green-800 rounded-full text-sm font-medium';
      } else {
        contador.className = 'px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium';
      }
    }
  };
  
  window.selecionarTodasDisciplinas = () => {
    const LIMITE_RECOMENDADO = 15;
    
    // Ordenar disciplinas por relevância (disciplinas específicas primeiro, depois gerais)
    const disciplinasOrdenadas = [...disciplinasFiltradas].sort((a, b) => {
      if (a.area === 'geral' && b.area !== 'geral') return 1;
      if (a.area !== 'geral' && b.area === 'geral') return -1;
      return 0;
    });
    
    // Selecionar apenas as primeiras N disciplinas (marcar checkbox de seleção)
    let contSelecionadas = 0;
    disciplinasOrdenadas.forEach(disc => {
      const selectCheckbox = document.getElementById(`select_${disc.id}`);
      
      if (contSelecionadas < LIMITE_RECOMENDADO) {
        if (selectCheckbox) {
          selectCheckbox.checked = true;
          toggleDisciplinaSelection(disc.id); // Mostrar avaliação
        }
        contSelecionadas++;
      }
    });
    
    atualizarContador();
    
    if (contSelecionadas === LIMITE_RECOMENDADO) {
      showToast(` Selecionadas as ${LIMITE_RECOMENDADO} disciplinas mais relevantes para sua área.\n\nAgora avalie seu conhecimento em cada uma delas.`);
    }
  };
  
  window.limparTodasDisciplinas = () => {
    disciplinasFiltradas.forEach(disc => {
      const selectCheckbox = document.getElementById(`select_${disc.id}`);
      
      if (selectCheckbox && selectCheckbox.checked) {
        selectCheckbox.checked = false;
        toggleDisciplinaSelection(disc.id); // Esconder avaliação e limpar
      }
    });
    atualizarContador();
  };
  
  // ✅ FUNÇÕES DE MANIPULAÇÃO DE TÓPICOS
  window.toggleTopicos = (discId) => {
    const topicosDiv = document.getElementById(`topicos_${discId}`);
    if (topicosDiv) {
      topicosDiv.classList.toggle('hidden');
    }
  };
  
  window.adicionarTopico = (discId) => {
    const disc = disciplinasFiltradas.find(d => d.id === discId);
    if (!disc) return;
    
    if (!disc.topicos) disc.topicos = [];
    
    const novoTopico = { nome: 'Novo tópico', peso: 1 };
    disc.topicos.push(novoTopico);
    
    // Recriar a lista
    renderListaTopicos(discId);
    showToast('Tópico adicionado! Edite o nome conforme necessário.', 'success');
  };
  
  window.removerTopico = (discId, idx) => {
    const disc = disciplinasFiltradas.find(d => d.id === discId);
    if (!disc || !disc.topicos) return;
    
    showConfirm('Tem certeza que deseja remover este tópico?', (confirmed) => {
      if (confirmed) {
        disc.topicos.splice(idx, 1);
        renderListaTopicos(discId);
        showToast('Tópico removido!', 'info');
      }
    });
  };
  
  window.atualizarTopico = (discId, idx, novoNome) => {
    const disc = disciplinasFiltradas.find(d => d.id === discId);
    if (!disc || !disc.topicos || !disc.topicos[idx]) return;
    
    if (typeof disc.topicos[idx] === 'string') {
      disc.topicos[idx] = novoNome.trim();
    } else {
      disc.topicos[idx].nome = novoNome.trim();
    }
    
    console.log(`✏️ Tópico ${idx + 1} atualizado:`, novoNome);
  };
  
  function renderListaTopicos(discId) {
    const disc = disciplinasFiltradas.find(d => d.id === discId);
    if (!disc) return;
    
    const listaDiv = document.getElementById(`lista_topicos_${discId}`);
    if (!listaDiv) return;
    
    const topicos = disc.topicos || [];
    
    listaDiv.innerHTML = topicos.length > 0 ? topicos.map((top, idx) => `
      <div class="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded group hover:bg-[#E8EDF5]">
        <span class="text-gray-400 font-mono">${idx + 1}.</span>
        <input type="text" 
          id="topico_${discId}_${idx}"
          value="${top.nome || top}"
          class="flex-1 bg-transparent border-none focus:ring-1 focus:ring-[#1A3A7F] rounded px-1"
          onchange="atualizarTopico(${discId}, ${idx}, this.value)">
        <button type="button" onclick="event.stopPropagation();removerTopico(${discId}, ${idx})" 
          class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">
          <i class="fas fa-trash text-xs"></i>
        </button>
      </div>
    `).join('') : '<p class="text-xs text-gray-400 italic py-2">Nenhum tópico cadastrado</p>';
  }
  
  // Adicionar listener para atualizar contador quando checkboxes mudarem
  disciplinasFiltradas.forEach(disc => {
    const checkbox = document.getElementById(`estudou_${disc.id}`);
    if (checkbox) {
      checkbox.addEventListener('change', atualizarContador);
    }
  });
  
  // Atualizar contador inicial
  atualizarContador();
  
  // Array para armazenar disciplinas personalizadas
  window.disciplinasCustom = [];
  
  // Função para adicionar disciplina personalizada
  window.adicionarDisciplinaCustom = () => {
    const input = document.getElementById('nova-disciplina-input');
    const nome = input.value.trim();
    
    if (!nome) {
      showToast('Digite o nome da disciplina', 'warning');
      return;
    }
    
    // Verificar se já existe
    if (window.disciplinasCustom.some(d => d.nome.toLowerCase() === nome.toLowerCase())) {
      showToast('Essa disciplina já foi adicionada!', 'warning');
      return;
    }
    
    // Adicionar à lista temporária
    window.disciplinasCustom.push({
      nome: nome,
      custom: true,
      area: interviewData.area_geral || 'especifica',
      ja_estudou: false,
      nivel_atual: 0,
      dificuldade: 0
    });
    
    renderDisciplinasCustomList();
    input.value = '';
    showToast('Disciplina adicionada!', 'success');
  };
  
  // Função para renderizar lista de disciplinas personalizadas
  window.renderDisciplinasCustomList = () => {
    const container = document.getElementById('disciplinas-custom-list');
    
    if (window.disciplinasCustom.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma disciplina personalizada adicionada ainda.</p>';
      return;
    }
    
    container.innerHTML = window.disciplinasCustom.map((d, idx) => `
      <div class="flex items-center justify-between bg-white border-2 border-[#C5D1E8] p-3 rounded-lg">
        <div class="flex items-center flex-1">
          <i class="fas fa-book ${c('primary').icon} mr-3"></i>
          <span class="text-sm font-medium text-gray-800">${d.nome}</span>
          <span class="ml-2 text-xs px-2 py-1 bg-[#D0D9EB] text-[#122D6A] rounded">Personalizada</span>
        </div>
        <button 
          type="button"
          onclick="removerDisciplinaCustom(${idx})"
          class="text-[#1A3A7F] hover:text-[#0D1F4D] text-sm font-medium px-3 py-1 hover:bg-[#E8EDF5] rounded"
        >
          <i class="fas fa-trash mr-1"></i> Remover
        </button>
      </div>
    `).join('');
  };
  
  // Função para remover disciplina personalizada
  window.removerDisciplinaCustom = (idx) => {
    window.disciplinasCustom.splice(idx, 1);
    renderDisciplinasCustomList();
    showToast('Disciplina removida', 'info');
  };
  
  // Inicializar lista vazia
  renderDisciplinasCustomList();

  document.getElementById('disciplinasForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ✅ NOVA LÓGICA: Mapear apenas disciplinas com checkbox "select_" marcado
    console.log('🔍 DEBUG - disciplinasFiltradas:', disciplinasFiltradas.map(d => `${d.nome} (ID: ${d.id})`));
    
    interviewData.disciplinas = disciplinasFiltradas
      .filter(disc => {
        const selectCheckbox = document.getElementById(`select_${disc.id}`);
        const isSelected = selectCheckbox?.checked;
        console.log(`  - ${disc.nome}: selecionado = ${isSelected}, ID = ${disc.id}, checkbox existe = ${!!selectCheckbox}`);
        return isSelected; // Incluir apenas se foi selecionada
      })
      .map(disc => {
        // ✅ CORREÇÃO v20.9: Validar que disc.id existe e não é null/undefined
        if (!disc.id || disc.id === 0) {
          console.error(`❌ ERRO: Disciplina "${disc.nome}" sem ID válido:`, disc);
          return null; // Será filtrado depois
        }
        
        // Buscar valores dos campos
        const dominioSlider = document.getElementById(`dominio_${disc.id}`);
        const pesoInput = document.getElementById(`peso_${disc.id}`);
        
        // ✅ NOVO: Usar slider de domínio (0-10)
        const nivel_dominio = parseInt(dominioSlider?.value || 0);
        // Derivar valores para compatibilidade
        const ja_estudou = nivel_dominio > 0; // Se conhece algo, já estudou
        const nivel_atual = nivel_dominio;
        const dificuldade = nivel_dominio <= 3; // Se domínio é baixo, tem dificuldade
        
        // Peso: usar valor do input se existir e não for readonly, senão usar peso do edital
        let peso = null;
        if (pesoInput) {
          if (pesoInput.readOnly) {
            peso = parseInt(pesoInput.value) || disc.peso || null;
          } else {
            peso = parseInt(pesoInput.value) || null;
          }
        } else {
          peso = disc.peso || null;
        }
        
        console.log(`    → Mapeado: dominio=${nivel_dominio}, peso=${peso}`);
        
        return {
          disciplina_id: disc.id,
          nivel_dominio, // ✅ NOVO: Nível de domínio 0-10
          ja_estudou,
          nivel_atual,
          dificuldade,
          peso
        };
      })
      .filter(d => d !== null); // Remover disciplinas com ID inválido
    
    // Adicionar disciplinas personalizadas (todas são selecionadas automaticamente)
    interviewData.disciplinasCustom = window.disciplinasCustom.map(disc => ({
      nome: disc.nome,
      area: disc.area,
      custom: true,
      ja_estudou: false,  // Disciplina nova, nunca estudou
      nivel_atual: 0,
      dificuldade: false
    }));
    
    // ✅ LOG DEBUG: Mostrar disciplinas que serão enviadas
    console.log('📋 FRONTEND - Disciplinas selecionadas:', interviewData.disciplinas.map(d => `ID ${d.disciplina_id}`).join(', '));
    console.log('📊 FRONTEND - Total de disciplinas:', interviewData.disciplinas.length);
    
    // Validar que pelo menos 1 disciplina foi selecionada (padrão OU personalizada)
    const totalDisciplinas = interviewData.disciplinas.length + interviewData.disciplinasCustom.length;
    if (totalDisciplinas === 0) {
      showModal(' Selecione pelo menos uma disciplina!\n\n' +
            '1. Marque a checkbox ao lado da disciplina que você quer estudar\n' +
            '2. Preencha as informações sobre seu conhecimento\n' +
            '3. Repita para todas as disciplinas desejadas\n' +
            '4. Clique em "Finalizar Entrevista"');
      return;
    }
    
    // ✅ NOVA VALIDAÇÃO: Verificar se há disciplinas com ID inválido
    const disciplinasInvalidas = interviewData.disciplinas.filter(d => !d.disciplina_id || d.disciplina_id === 0);
    if (disciplinasInvalidas.length > 0) {
      console.error('❌ Disciplinas com ID inválido:', disciplinasInvalidas);
      showModal(' Erro ao processar disciplinas!\n\nAlgumas disciplinas selecionadas têm IDs inválidos. Por favor, recarregue a página e tente novamente.');
      return;
    }
    
    // Avisar se selecionou muitas disciplinas (contar padrão + personalizadas)
    const totalDisciplinasReais = interviewData.disciplinas.length + interviewData.disciplinasCustom.length;
    if (totalDisciplinasReais > 25) {
      const confirmar = await showConfirm(
        `Você selecionou ${totalDisciplinasReais} disciplinas.\n\n` +
        `Isso é um número muito alto e pode prejudicar seu foco.\n\n` +
        `Recomendamos entre 8 e 15 disciplinas para melhor resultado.`,
        {
          title: 'Muitas Disciplinas',
          confirmText: 'Continuar assim',
          cancelText: 'Voltar e ajustar',
          type: 'warning'
        }
      );
      if (!confirmar) return;
    } else if (totalDisciplinasReais > 15) {
      const avisar = await showConfirm(
        `Você selecionou ${totalDisciplinasReais} disciplinas.\n\n` +
        `Para um estudo mais eficiente, recomendamos focar em 8 a 15 disciplinas.`,
        {
          title: 'Atenção',
          confirmText: 'Continuar',
          cancelText: 'Voltar e ajustar',
          type: 'info'
        }
      );
      if (!avisar) return;
    }

    await finalizarEntrevista();
  });
}

async function finalizarEntrevista() {
  try {
    // Validação final
    if (!interviewData.disciplinas || interviewData.disciplinas.length === 0) {
      showModal(' Por favor, selecione pelo menos uma disciplina antes de continuar.\n\nMarque "Já estudei" ou "Tenho dificuldade" em ao menos uma matéria.');
      return;
    }

    // Salvar entrevista (o backend já cria o plano automaticamente)
    const response = await axios.post('/api/interviews', interviewData);
    const { interview_id, plano_id, diagnostico } = response.data;

    console.log('✅ Entrevista e plano criados:', { interview_id, plano_id });

    // ✅ CORREÇÃO: Edital JÁ foi processado ANTES (em processarEditalAntesDeStep2)
    // Não precisa processar novamente aqui

    // ✅ NOVO: Gerar metas semanais automaticamente (começando HOJE, não próxima segunda)
    try {
      console.log('🎯 Gerando metas semanais automaticamente...');
      const hoje = new Date().toISOString().split('T')[0];
      const metasResponse = await axios.post(`/api/metas/gerar-semana/${currentUser.id}`, {
        plano_id: plano_id,
        data_inicio: hoje // ✅ CORREÇÃO: Usar data de hoje, não próxima segunda
      });
      console.log('✅ Metas semanais geradas automaticamente:', metasResponse.data);
    } catch (metasError) {
      console.error('⚠️ Erro ao gerar metas automaticamente (não crítico):', metasError);
      // Não bloqueia a finalização da entrevista
    }

    // Mostrar resultado
    renderResultadoEntrevista(diagnostico, { plano_id, interview_id });
  } catch (error) {
    console.error('Erro ao finalizar entrevista:', error);
    
    // Mensagem amigável baseada no erro
    const errorMsg = error.response?.data?.error || 'Erro ao processar entrevista';
    const errorCode = error.response?.data?.code;
    
    if (errorCode === 'NO_DISCIPLINES') {
      showModal(' Nenhuma disciplina selecionada!\n\nVolte e marque pelo menos uma disciplina antes de finalizar.');
    } else if (errorCode === 'USER_NOT_FOUND') {
      showModal(' Sessão expirada!\n\nSua sessão expirou. Faça login novamente.');
      logout();
    } else if (errorMsg.includes('FOREIGN KEY') || errorMsg.includes('constraint')) {
      showModal(' Erro ao salvar entrevista!\n\nPor favor, faça logout e login novamente.');
      setTimeout(() => logout(), 2000);
    } else {
      showModal(' ' + errorMsg + '\n\nTente novamente ou recarregue a página.');
    }
  }
}

function renderResultadoEntrevista(diagnostico, plano) {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} py-8">
      <div class="max-w-4xl mx-auto px-4">
        <div class="${themes[currentTheme].card} rounded-lg shadow-lg p-8">
          <div class="text-center mb-8">
            <i class="fas fa-check-circle text-6xl text-[#2A4A9F] mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-800 mb-2">Análise Concluída!</h2>
            <p class="${themes[currentTheme].textSecondary}">Seu plano de estudos personalizado está pronto</p>
          </div>

          <div class="space-y-6">
            <div class="bg-[#E8EDF5] border border-[#C5D1E8] rounded-lg p-6">
              <h3 class="font-semibold text-lg mb-2 flex items-center">
                <i class="fas fa-user-graduate mr-2 ${c('primary').icon}"></i>
                Seu Nível Atual
              </h3>
              <p class="text-2xl font-bold ${c('primary').text}">${diagnostico.nivel_geral}</p>
            </div>

            <div class="${themes[currentTheme].warning} border rounded-lg p-6">
              <h3 class="font-semibold text-lg mb-3 flex items-center">
                <i class="fas fa-exclamation-triangle mr-2 text-[#1A3A7F]"></i>
                Prioridades de Estudo
              </h3>
              <ul class="space-y-2">
                ${(diagnostico.prioridades && diagnostico.prioridades.length > 0) 
                  ? diagnostico.prioridades.slice(0, 5).map(p => `
                      <li class="flex items-start">
                        <i class="fas fa-arrow-right text-[#1A3A7F] mr-2 mt-1"></i>
                        <div>
                          <span class="font-semibold">${p.nome}</span>
                          <span class="text-sm text-gray-600 ml-2">(${p.razao})</span>
                        </div>
                      </li>
                    `).join('')
                  : '<li class="text-gray-500">Nenhuma prioridade identificada</li>'
                }
              </ul>
            </div>

            ${(diagnostico.lacunas && diagnostico.lacunas.length > 0) ? `
              <div class="${themes[currentTheme].error} border rounded-lg p-6">
                <h3 class="font-semibold text-lg mb-3 flex items-center">
                  <i class="fas fa-info-circle mr-2 text-[#1A3A7F]"></i>
                  Conteúdos Nunca Estudados
                </h3>
                <div class="flex flex-wrap gap-2">
                  ${diagnostico.lacunas.map(l => `
                    <span class="bg-[#D0D9EB] text-[#122D6A] px-3 py-1 rounded-full text-sm">${l}</span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="${themes[currentTheme].success} border rounded-lg p-6">
              <h3 class="font-semibold text-lg mb-2 flex items-center">
                <i class="fas fa-lightbulb mr-2 ${c('success').icon}"></i>
                Recomendação Personalizada
              </h3>
              <p class="${themes[currentTheme].text}">${diagnostico.recomendacao}</p>
            </div>
          </div>

          <button onclick="irParaDashboard()" 
            class="w-full mt-8 bg-[#122D6A] text-white py-3 rounded-lg font-semibold hover:bg-[#0D1F4D] transition">
            Ir para o Dashboard
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============== NAVBAR ==============
function renderNavbar() {
  return `
    <nav class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-3">
            <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
              <span class="text-[#7BC4FF]">IA</span>prova
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="renderDashboard()" class="p-2 hover:bg-white/20 rounded-lg transition" title="Dashboard">
              <i class="fas fa-home"></i>
            </button>
            <button onclick="renderPortfolioDisciplinas()" class="p-2 hover:bg-white/20 rounded-lg transition" title="Disciplinas">
              <i class="fas fa-book"></i>
            </button>
            <button onclick="renderMateriais()" class="p-2 hover:bg-white/20 rounded-lg transition" title="Materiais">
              <i class="fas fa-folder"></i>
            </button>
            
            <!-- Menu de Configurações -->
            <div class="relative">
              <button onclick="toggleConfigMenu()" class="p-2 hover:bg-white/20 rounded-lg transition" title="Configurações">
                <i class="fas fa-cog"></i>
              </button>
              <div id="config-menu" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-50">
                <div class="py-1">
                  <button onclick="resetTutorial(); toggleConfigMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-graduation-cap mr-2 text-[#122D6A]"></i>
                    Reativar Tutorial
                  </button>
                  <button onclick="toggleTheme(); toggleConfigMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-moon mr-2 text-[#122D6A]"></i>
                    Tema Escuro/Claro
                  </button>
                  <button onclick="iniciarEntrevista(); toggleConfigMenu()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition">
                    <i class="fas fa-plus-circle mr-2 text-[#122D6A]"></i>
                    Novo Plano
                  </button>
                  <hr class="my-1">
                  <button onclick="logout(); toggleConfigMenu()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                    <i class="fas fa-sign-out-alt mr-2"></i>
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}
window.renderNavbar = renderNavbar;

// Toggle do menu de configurações
window.toggleConfigMenu = function() {
  const menu = document.getElementById('config-menu');
  if (menu) {
    menu.classList.toggle('hidden');
    
    // Fechar ao clicar fora
    if (!menu.classList.contains('hidden')) {
      setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
          if (!e.target.closest('#config-menu') && !e.target.closest('[onclick*="toggleConfigMenu"]')) {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
          }
        });
      }, 100);
    }
  }
}

// Toggle do tema
window.toggleTheme = function() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  renderDashboard(); // Recarregar com novo tema
}

// ============== DASHBOARD ==============
async function verificarEntrevista() {
  try {
    // Registrar acesso ao entrar no sistema (ANTES de verificar tutorial)
    registrarAcesso();
    
    console.log('🔍 Verificando entrevista para usuário:', currentUser.id);
    const response = await axios.get(`/api/interviews/user/${currentUser.id}`);
    console.log('📋 Resposta da verificação:', response.data);
    
    if (response.data && response.data.length > 0) {
      console.log('✅ Entrevista encontrada, indo para dashboard...');
      renderDashboard();
    } else {
      console.log('⚠️ Sem entrevista, iniciando processo...');
      iniciarEntrevista();
    }
  } catch (error) {
    console.error('❌ Erro ao verificar entrevista:', error);
    console.log('🆕 Iniciando entrevista devido ao erro...');
    iniciarEntrevista();
  }
}

function irParaDashboard() {
  renderDashboard();
}

async function renderDashboard() {
  try {
    // Buscar dados do plano
    const planoResponse = await axios.get(`/api/planos/user/${currentUser.id}`);
    const plano = planoResponse.data;

    // ✅ VALIDAÇÃO: Verificar se plano está OK antes de continuar
    if (!plano || !plano.id || !plano.nome) {
      console.warn('⚠️ Plano não encontrado ou incompleto');
      throw new Error('Plano não disponível');
    }

    // ✅ CORREÇÃO: Buscar entrevista do PLANO ATIVO (não a última)
    let entrevista = null;
    try {
      if (plano.interview_id) {
        const entrevistaResponse = await axios.get(`/api/interviews/${plano.interview_id}`);
        entrevista = entrevistaResponse.data;
        console.log('✅ Entrevista do plano ativo carregada:', entrevista);
      }
    } catch (err) {
      console.warn('⚠️ Entrevista do plano não encontrada, buscando última...');
      try {
        const entrevistaResponse = await axios.get(`/api/interviews/user/${currentUser.id}`);
        entrevista = entrevistaResponse.data[0]; // Fallback para última
      } catch (err2) {
        console.warn('⚠️ Nenhuma entrevista encontrada');
      }
    }

    // ✅ Buscar metas do dia - PRIORIZAR metas da semana ativa
    let metas = [];
    
    // Primeiro: tentar buscar da semana ativa (fonte principal)
    try {
      const semanaRes = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`);
      if (semanaRes.data?.metas) {
        const diaHoje = new Date().getDay() || 7; // 1=seg, 7=dom
        metas = semanaRes.data.metas.filter(m => m.dia_semana === diaHoje);
        console.log(`✅ Metas do dia (semana ativa, dia ${diaHoje}):`, metas.length, 'metas');
      }
    } catch (semErr) {
      console.warn('⚠️ Erro ao buscar semana ativa:', semErr);
    }
    
    // Fallback: buscar de metas diárias se não encontrou na semana
    if (metas.length === 0) {
      try {
        const metasResponse = await axios.get(`/api/metas/hoje/${currentUser.id}`);
        metas = metasResponse.data || [];
        console.log('📋 Metas do dia (fallback metas_diarias):', metas.length);
      } catch (metErr) {
        console.warn('⚠️ Erro ao buscar metas diárias:', metErr);
        metas = [];
      }
    }

    // Buscar desempenho
    const desempenhoResponse = await axios.get(`/api/desempenho/user/${currentUser.id}`);
    const desempenho = desempenhoResponse.data;

    // Buscar calendário e estatísticas
    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();
    
    const [calendarioRes, estatisticasRes, scoreRes, viabilidadeRes, progressoRes] = await Promise.all([
      axios.get(`/api/calendario/${currentUser.id}?mes=${mes}&ano=${ano}`),
      axios.get(`/api/estatisticas/${currentUser.id}`),
      axios.get(`/api/score/${currentUser.id}`).catch(() => ({ data: { score: 0 } })),
      axios.get(`/api/planos/${plano.id}/analise-viabilidade`).catch(() => ({ data: null })),
      axios.get(`/api/planos/${plano.id}/progresso-geral`).catch(() => ({ data: { progresso_percentual: 0, total_topicos: 0, topicos_estudados: 0 } }))
    ]);

    console.log('✅ Todos os dados carregados com sucesso');
    console.log('📊 Score do usuário:', scoreRes.data);
    console.log('📋 Metas do dia carregadas:', metas.length, 'metas', metas.map(m => m.disciplina_nome));
    console.log('📈 Análise de viabilidade:', viabilidadeRes.data);
    console.log('📊 Progresso geral:', progressoRes.data);
    renderDashboardUI(plano, metas, desempenho, calendarioRes.data, estatisticasRes.data, entrevista, scoreRes.data, viabilidadeRes.data, progressoRes.data);
  } catch (error) {
    console.error('❌ Erro ao carregar dashboard:', error);
    console.log('Código de erro:', error.response?.status);
    console.log('Mensagem:', error.response?.data || error.message);
    
    // Se não houver plano ou dados estiverem incompletos, iniciar entrevista
    if (error.response?.status === 404 || error.message.includes('não disponível')) {
      console.log('🎯 Iniciando processo de criação de plano...');
      iniciarEntrevista();
    } else {
      // Outro erro, mostrar mensagem amigável
      document.getElementById('app').innerHTML = `
        <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center p-4">
          <div class="${themes[currentTheme].card} rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <i class="fas fa-exclamation-triangle text-[#2A4A9F] text-6xl mb-4"></i>
            <h2 class="text-2xl font-bold ${themes[currentTheme].text} mb-4">Erro ao Carregar Dados</h2>
            <p class="${themes[currentTheme].textSecondary} mb-6">Ocorreu um erro ao carregar seu plano de estudos.</p>
            <button 
              onclick="iniciarEntrevista()" 
              class="bg-[#122D6A] text-white px-6 py-3 rounded-lg hover:bg-[#0D1F4D] transition w-full mb-3"
            >
              <i class="fas fa-redo mr-2"></i>
              Criar Novo Plano
            </button>
            <button 
              onclick="renderDashboard()" 
              class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition w-full"
            >
              <i class="fas fa-sync-alt mr-2"></i>
              Tentar Novamente
            </button>
          </div>
        </div>
      `;
    }
  }
}

async function renderDashboardUI(plano, metas, desempenho, historico, stats, entrevista, scoreData = { score: 0 }, viabilidade = null, progressoGeral = null) {
  const metasConcluidas = metas.filter(m => m.concluida).length;
  const progressoDia = metas.length > 0 ? Math.round((metasConcluidas / metas.length) * 100) : 0;
  
  // Calcular média diária
  const mediaDiaria = stats.dias_estudados > 0 
    ? Math.round((stats.horas_totais * 60) / stats.dias_estudados) 
    : 0;

  // ✅ NOVO: Preparar informações do concurso/cargo baseado na entrevista
  let concursoInfo = {
    titulo: 'Não especificado',
    subtitulo: 'Área geral',
    icone: 'fas fa-briefcase'
  };

  if (entrevista) {
    if (entrevista.objetivo_tipo === 'concurso_especifico') {
      concursoInfo.titulo = entrevista.concurso_nome || 'Concurso não especificado';
      concursoInfo.subtitulo = entrevista.cargo || 'Cargo não especificado';
      concursoInfo.icone = 'fas fa-graduation-cap';
    } else if (entrevista.objetivo_tipo === 'area_geral') {
      const areasNomes = {
        'saude': 'Área da Saúde',
        'educacao': 'Área da Educação',
        'fiscal': 'Área Fiscal',
        'policial': 'Área Policial',
        'tribunais': 'Área de Tribunais',
        'administrativo': 'Área Administrativa'
      };
      concursoInfo.titulo = areasNomes[entrevista.area_geral] || 'Área Geral';
      concursoInfo.subtitulo = 'Preparação geral para a área';
      concursoInfo.icone = 'fas fa-th-large';
    }
  }

  // ✅ NOVO: Calcular contagem regressiva para a prova
  let contagemRegressiva = null;
  if (plano.data_prova) {
    const dataProva = new Date(plano.data_prova + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diffTime = dataProva.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      const semanas = Math.floor(diffDays / 7);
      const diasRestantes = diffDays % 7;
      
      contagemRegressiva = {
        dias: diffDays,
        semanas: semanas,
        diasRestantes: diasRestantes,
        dataFormatada: dataProva.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
        urgente: diffDays <= 30,
        muitoUrgente: diffDays <= 7
      };
    } else if (diffDays === 0) {
      contagemRegressiva = { dias: 0, hoje: true, dataFormatada: 'Hoje!' };
    } else {
      contagemRegressiva = { dias: diffDays, passada: true, dataFormatada: dataProva.toLocaleDateString('pt-BR') };
    }
  }

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg}">
      <!-- HEADER AZUL CONSISTENTE -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
        <!-- Barra Principal -->
        <div class="max-w-7xl mx-auto px-3 sm:px-4">
          <div class="flex items-center justify-between h-14">
            <!-- Logo -->
            <button onclick="renderDashboard()" class="flex items-center gap-2 hover:opacity-80 transition-all group">
              <span class="text-lg font-bold">
                <span class="text-[#7BC4FF]">IA</span><span class="text-white">prova</span>
              </span>
            </button>
            
            <!-- KPIs Pill Bar (Desktop) - Fundo transparente com texto branco -->
            <div class="hidden lg:flex items-center">
              <div class="flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/20 transition cursor-pointer" title="Sequência de dias">
                  <i class="fas fa-fire text-[#7BC4FF] text-[10px]"></i>
                  <span class="text-xs font-semibold text-white">${stats.streak_atual}</span>
                </div>
                <div class="w-px h-4 bg-white/30"></div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/20 transition cursor-pointer" title="Total de horas">
                  <i class="fas fa-clock text-[#7BC4FF] text-[10px]"></i>
                  <span class="text-xs font-semibold text-white">${stats.horas_totais}h</span>
                </div>
                <div class="w-px h-4 bg-white/30"></div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/20 transition cursor-pointer" title="Score geral">
                  <i class="fas fa-trophy text-yellow-300 text-[10px]"></i>
                  <span class="text-xs font-semibold text-white">${scoreData.score}/10</span>
                </div>
                <div class="w-px h-4 bg-white/30"></div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-white/20 transition cursor-pointer" title="Dias estudados">
                  <i class="fas fa-calendar-check text-[#7BC4FF] text-[10px]"></i>
                  <span class="text-xs font-semibold text-white">${stats.dias_estudados}d</span>
                </div>
              </div>
            </div>
            
            <!-- Ações Rápidas - Ícones brancos -->
            <div class="flex items-center gap-1.5">
              <!-- Atalhos Rápidos (apenas ícones) -->
              <div class="hidden md:flex items-center gap-1">
                <button onclick="window.renderDashboardDesempenho()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition group" title="Desempenho">
                  <i class="fas fa-chart-pie text-white text-sm group-hover:scale-110 transition-transform"></i>
                </button>
                <button onclick="window.renderDashboardSimulados()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition group" title="Simulados">
                  <i class="fas fa-edit text-white text-sm group-hover:scale-110 transition-transform"></i>
                </button>
                <button onclick="renderPortfolioDisciplinas()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition group" title="Disciplinas">
                  <i class="fas fa-book-open text-white text-sm group-hover:scale-110 transition-transform"></i>
                </button>
                <button onclick="renderCalendario()" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition group" title="Calendário">
                  <i class="fas fa-calendar-alt text-white text-sm group-hover:scale-110 transition-transform"></i>
                </button>
              </div>
              
              <div class="w-px h-6 bg-white/30 hidden md:block"></div>
              
              <!-- Botão Command Center -->
              <button 
                onclick="toggleCommandPanel()" 
                id="btn-expand-panel"
                class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white hover:bg-white/20 transition-all text-xs font-medium group"
              >
                <div class="w-5 h-5 rounded bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <i class="fas fa-th text-white text-[9px]"></i>
                </div>
                <span class="hidden sm:inline">Menu</span>
                <i class="fas fa-chevron-down text-[10px] transition-transform duration-300" id="panel-chevron"></i>
              </button>
              
              <!-- Tema Toggle -->
              <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition group"
                title="Alternar tema">
                <i class="fas ${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'} text-white text-sm group-hover:scale-110 transition-transform"></i>
              </button>
              
              <!-- Avatar -->
              <div class="relative">
                <button onclick="toggleUserMenu()" class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-xs hover:bg-white/30 hover:scale-105 transition-all">
                  ${currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </button>
                <!-- User Dropdown Moderno -->
                <div id="userMenu" class="hidden absolute right-0 mt-2 w-52 ${themes[currentTheme].card} rounded-xl shadow-2xl border ${themes[currentTheme].border} z-50 overflow-hidden backdrop-blur-xl">
                  <div class="p-3 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white">
                    <p class="font-semibold text-sm truncate">${currentUser.name || 'Usuário'}</p>
                    <p class="text-[10px] opacity-80 truncate">${currentUser.email}</p>
                  </div>
                  <div class="py-1">
                    <button onclick="abrirModalEditarPerfil()" class="w-full px-3 py-2 text-left ${themes[currentTheme].text} hover:bg-[#E8EDF5] dark:hover:bg-[#0A1839]/30 transition flex items-center gap-2 text-xs">
                      <i class="fas fa-user-edit w-4 text-[#2A4A9F]"></i> Editar Perfil
                    </button>
                    <button onclick="logout()" class="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-2 text-xs">
                      <i class="fas fa-sign-out-alt w-4"></i> Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- COMMAND CENTER - Painel Expansível Premium -->
        <div id="command-panel" class="hidden border-t border-white/20 bg-gradient-to-r from-[#0A1839] to-[#122D6A]" style="overflow: hidden;">
          <div class="max-w-7xl mx-auto px-3 sm:px-4 py-3">
            <!-- Layout Responsivo do Painel -->
            <div class="space-y-3">
              
              <!-- Seção KPIs + Ações em Grid Adaptativo -->
              <div class="stats-card grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                
                <!-- KPIs Cards Mini - Fundo escuro com texto claro -->
                <div onclick="mostrarDetalheScore()" class="group cursor-pointer bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 hover:bg-white/20 hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-fire text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-base font-bold text-white leading-tight">${stats.streak_atual}</p>
                      <p class="text-[9px] text-white/70 uppercase tracking-wide">Streak</p>
                    </div>
                  </div>
                </div>
                
                <div class="group cursor-pointer bg-white/10 backdrop-blur rounded-xl p-2.5 border border-white/20 hover:bg-white/20 hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-calendar-check text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-base font-bold ${themes[currentTheme].text} leading-tight">${stats.dias_estudados}</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Dias</p>
                    </div>
                  </div>
                </div>
                
                <!-- Novo Card de Acessos -->
                <div class="group cursor-pointer ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#4A6AC0] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4A6AC0] to-[#2A4A9F] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-eye text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p id="stats-acessos" class="text-base font-bold ${themes[currentTheme].text} leading-tight">0</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Acessos</p>
                    </div>
                  </div>
                </div>
                
                <div class="group cursor-pointer ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#122D6A] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#122D6A] to-[#0A1839] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-clock text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-base font-bold ${themes[currentTheme].text} leading-tight">${stats.horas_totais}h</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Horas</p>
                    </div>
                  </div>
                </div>
                
                <div class="group cursor-pointer ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#6BB6FF] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6BB6FF] to-[#3A5AB0] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-chart-line text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-base font-bold ${themes[currentTheme].text} leading-tight">${mediaDiaria}</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Min/dia</p>
                    </div>
                  </div>
                </div>
                
                <div onclick="mostrarDetalheScore()" class="group cursor-pointer ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#3A5AB0] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#122D6A] to-[#3A5AB0] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                      <i class="fas fa-trophy text-white text-xs"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-base font-bold text-[#2A4A9F] dark:text-blue-400 leading-tight">${scoreData.score}</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Score</p>
                    </div>
                  </div>
                </div>
                
                <!-- Ações Rápidas -->
                <button onclick="renderPortfolioDisciplinas()" class="group ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#122D6A] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-[#E8EDF5] dark:bg-[#0A1839]/50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#122D6A] transition-colors shadow-sm">
                      <i class="fas fa-book-open text-[#122D6A] dark:text-blue-400 group-hover:text-white text-xs transition-colors"></i>
                    </div>
                    <div class="min-w-0 text-left">
                      <p class="text-base font-bold ${themes[currentTheme].text} leading-tight">${plano.diagnostico.total_disciplinas}</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Disciplinas</p>
                    </div>
                  </div>
                </button>
                
                <button onclick="renderPortfolioDisciplinas()" class="group ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#6BB6FF] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-[#E8EDF5] dark:bg-[#0D1F4D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#3A5AB0] transition-colors shadow-sm">
                      <i class="fas fa-exclamation-circle text-[#3A5AB0] group-hover:text-white text-xs transition-colors"></i>
                    </div>
                    <div class="min-w-0 text-left">
                      <p class="text-base font-bold ${themes[currentTheme].text} leading-tight">${plano.diagnostico.nunca_estudadas}</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Pendentes</p>
                    </div>
                  </div>
                </button>
                
                <button onclick="renderCalendario()" class="group ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#122D6A] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-[#E8EDF5] dark:bg-[#0A1839]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#122D6A] transition-colors shadow-sm">
                      <i class="fas fa-calendar-alt text-[#122D6A] dark:text-blue-400 group-hover:text-white text-xs transition-colors"></i>
                    </div>
                    <div class="min-w-0 text-left">
                      <p class="text-xs font-semibold ${themes[currentTheme].text} leading-tight">Ver</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Calendário</p>
                    </div>
                  </div>
                </button>
                
                <button onclick="window.renderDashboardSimulados()" class="group ${themes[currentTheme].card} rounded-xl p-2.5 border ${themes[currentTheme].border} hover:border-[#4A6AC0] hover:shadow-md transition-all">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-[#E8EDF5] dark:bg-[#0D1F4D]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#6BB6FF]/50 transition-colors shadow-sm">
                      <i class="fas fa-edit text-[#3A5AB0] dark:text-[#6BB6FF] group-hover:text-white text-xs transition-colors"></i>
                    </div>
                    <div class="min-w-0 text-left">
                      <p class="text-xs font-semibold ${themes[currentTheme].text} leading-tight">Fazer</p>
                      <p class="text-[9px] ${themes[currentTheme].textSecondary} uppercase tracking-wide">Simulados</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <!-- Footer do Painel - Info + Novo Plano -->
              <div class="flex flex-wrap items-center gap-2 pt-2 border-t ${themes[currentTheme].border}">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentTheme === 'light' ? 'bg-gray-100' : 'bg-gray-800/50'} border ${themes[currentTheme].border}">
                  <i class="fas fa-trophy text-[#122D6A] dark:text-blue-400 text-[10px]"></i>
                  <span class="text-[10px] ${themes[currentTheme].text} font-medium truncate max-w-[120px]">${plano.nome}</span>
                </div>
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentTheme === 'light' ? 'bg-gray-100' : 'bg-gray-800/50'} border ${themes[currentTheme].border}">
                  <i class="${concursoInfo.icone} text-[#122D6A] dark:text-blue-400 text-[10px]"></i>
                  <span class="text-[10px] ${themes[currentTheme].text} truncate max-w-[150px]">${concursoInfo.titulo}</span>
                </div>
                <button onclick="iniciarEntrevista()" class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white text-[10px] font-medium hover:shadow-lg hover:scale-105 transition-all">
                  <i class="fas fa-plus text-[8px]"></i>
                  <span>Novo Plano</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-4">
        <!-- ✅ KPIs SUPERIORES: 4 cards em linha com visual consistente -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center shadow-md">
                <i class="fas fa-calendar-check text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Dias Estudados</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.dias_estudados || 0}</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5A9FE8] to-[#7BC4FF] flex items-center justify-center shadow-md">
                <i class="fas fa-fire text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Sequência</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.streak_atual || 0} dias</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#8DCFFF] flex items-center justify-center shadow-md">
                <i class="fas fa-clock text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Horas Totais</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.horas_totais || 0}h</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7BC4FF] to-[#A5D8FF] flex items-center justify-center shadow-md">
                <i class="fas fa-percentage text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Progresso Geral</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${progressoGeral?.progresso_percentual || 0}%</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- CARDS DE AÇÕES: Data, Disciplinas, Progresso, Simulados, Desempenho -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 mb-4">
          
          <!-- Card Contagem Regressiva / Data da Prova -->
          ${contagemRegressiva ? `
            ${contagemRegressiva.passada ? `
              <div onclick="abrirModalEditarDataProva()" class="cursor-pointer group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-gray-400 hover:shadow-xl transition-all">
                <div class="flex items-center gap-2 md:gap-4">
                  <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                    <i class="fas fa-check text-white text-sm md:text-xl"></i>
                  </div>
                  <div class="text-left flex-1 min-w-0">
                    <div class="flex items-baseline gap-1 md:gap-2">
                      <span class="text-base md:text-xl font-bold ${themes[currentTheme].text}">Prova Realizada</span>
                    </div>
                    <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1">
                      ${contagemRegressiva.dataFormatada}
                    </p>
                  </div>
                  <i class="fas fa-pen text-xs ${themes[currentTheme].textSecondary} group-hover:text-gray-500 transition-colors"></i>
                </div>
              </div>
            ` : contagemRegressiva.hoje ? `
              <div class="group ${themes[currentTheme].card} rounded-xl border-2 border-[#2A4A9F] p-2 md:p-4 hover:shadow-xl transition-all animate-pulse">
                <div class="flex items-center gap-2 md:gap-4">
                  <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center shadow-lg flex-shrink-0">
                    <i class="fas fa-trophy text-white text-sm md:text-xl"></i>
                  </div>
                  <div class="text-left flex-1 min-w-0">
                    <div class="flex items-baseline gap-1 md:gap-2">
                      <span class="text-base md:text-xl font-bold text-[#2A4A9F]">DIA DA PROVA!</span>
                    </div>
                    <p class="text-[10px] md:text-xs text-[#2A4A9F] mt-0.5 md:mt-1 font-semibold">
                      🎯 Boa sorte!
                    </p>
                  </div>
                </div>
              </div>
            ` : `
              <div onclick="abrirModalEditarDataProva()" class="cursor-pointer group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-emerald-500 hover:shadow-xl transition-all ${contagemRegressiva.muitoUrgente ? 'border-red-400' : contagemRegressiva.urgente ? 'border-amber-400' : ''}">
                <div class="flex items-center gap-2 md:gap-4">
                  <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${contagemRegressiva.muitoUrgente ? 'from-gray-700 to-gray-900' : contagemRegressiva.urgente ? 'from-[#3A5AB0] to-[#2A4A9F]' : 'from-[#122D6A] to-[#2A4A9F]'} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0 relative">
                    <span class="text-white text-sm md:text-xl font-bold">${contagemRegressiva.dias}</span>
                    ${viabilidade && viabilidade.viabilidade !== 'sem_data' ? `
                      <div class="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-white text-[8px] md:text-[10px] shadow-lg
                        ${viabilidade.viabilidade === 'confortavel' || viabilidade.viabilidade === 'adequado' ? 'bg-[#122D6A]' : 
                          viabilidade.viabilidade === 'apertado' ? 'bg-blue-500' : 
                          viabilidade.viabilidade === 'critico' ? 'bg-gray-600' : 'bg-gray-800'}"
                        title="${viabilidade.mensagem}">
                        <i class="fas ${viabilidade.viabilidade === 'confortavel' || viabilidade.viabilidade === 'adequado' ? 'fa-check' : 
                          viabilidade.viabilidade === 'apertado' ? 'fa-exclamation' : 'fa-times'}"></i>
                      </div>
                    ` : ''}
                  </div>
                  <div class="text-left flex-1 min-w-0">
                    <div class="flex items-baseline gap-1 md:gap-2 flex-wrap">
                      <span class="text-base md:text-xl font-bold ${themes[currentTheme].text}">${contagemRegressiva.muitoUrgente ? '⚠️' : contagemRegressiva.urgente ? '🔥' : '📅'} ${contagemRegressiva.semanas > 0 ? contagemRegressiva.semanas + 'sem ' + contagemRegressiva.diasRestantes + 'd' : contagemRegressiva.dias + ' dias'}</span>
                    </div>
                    <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1">
                      ${viabilidade && viabilidade.viabilidade !== 'sem_data' ? `
                        <span class="${viabilidade.viabilidade === 'confortavel' || viabilidade.viabilidade === 'adequado' ? 'text-[#2A4A9F]' : 
                          viabilidade.viabilidade === 'apertado' ? 'text-amber-600' : 
                          viabilidade.viabilidade === 'critico' ? 'text-orange-600' : 'text-red-600'}">${
                            viabilidade.viabilidade === 'confortavel' ? '✓ Tempo confortável' : 
                            viabilidade.viabilidade === 'adequado' ? '✓ Tempo adequado' : 
                            viabilidade.viabilidade === 'apertado' ? '⚡ Tempo apertado' : 
                            viabilidade.viabilidade === 'critico' ? '⚠️ Tempo crítico' : '❌ Tempo insuficiente'
                          }</span>
                        <span class="mx-1">•</span>
                      ` : ''}
                      Prova: ${contagemRegressiva.dataFormatada}
                    </p>
                  </div>
                  <i class="fas fa-pen text-xs ${themes[currentTheme].textSecondary} group-hover:text-[#2A4A9F] transition-colors"></i>
                </div>
              </div>
            `}
          ` : `
            <div onclick="abrirModalEditarDataProva()" class="cursor-pointer group ${themes[currentTheme].card} rounded-xl border-2 border-dashed ${themes[currentTheme].border} p-2 md:p-4 hover:border-emerald-500 hover:shadow-xl transition-all">
              <div class="flex items-center gap-2 md:gap-4">
                <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0 group-hover:from-emerald-500 group-hover:to-[#122D6A]">
                  <i class="fas fa-calendar-plus text-white text-sm md:text-xl"></i>
                </div>
                <div class="text-left flex-1 min-w-0">
                  <div class="flex items-baseline gap-1 md:gap-2">
                    <span class="text-base md:text-xl font-bold ${themes[currentTheme].text}">📅 Data da Prova</span>
                  </div>
                  <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1">
                    Clique para definir
                  </p>
                </div>
                <i class="fas fa-plus text-xs ${themes[currentTheme].textSecondary} group-hover:text-[#2A4A9F] transition-colors"></i>
              </div>
            </div>
          `}
          
          <!-- Botão Disciplinas -->
          <button onclick="renderPortfolioDisciplinas()" class="group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-[#122D6A] hover:shadow-xl transition-all">
            <div class="flex items-center gap-2 md:gap-4">
              <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                <i class="fas fa-book-open text-white text-sm md:text-xl"></i>
              </div>
              <div class="text-left flex-1 min-w-0">
                <div class="flex items-baseline gap-1 md:gap-2">
                  <span class="text-xl md:text-3xl font-bold ${themes[currentTheme].text}">${plano.diagnostico.total_disciplinas}</span>
                  <span class="text-[10px] md:text-sm ${themes[currentTheme].textSecondary}">disciplinas</span>
                </div>
                <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1">
                  <span class="text-[#3A5AB0] font-semibold">${plano.diagnostico.nunca_estudadas}</span> pendentes
                </p>
              </div>
              <i class="fas fa-chevron-right ${themes[currentTheme].textSecondary} group-hover:text-[#122D6A] transition-colors hidden md:block"></i>
            </div>
          </button>
          
          <!-- Card Progresso Geral -->
          <div onclick="renderPortfolioDisciplinas()" class="progresso-geral-card cursor-pointer group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-[#3A5AB0] hover:shadow-xl transition-all">
            <div class="flex items-center gap-2 md:gap-4">
              <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${
                progressoGeral?.progresso_percentual >= 70 ? 'from-[#122D6A] to-[#2A4A9F]' :
                progressoGeral?.progresso_percentual >= 50 ? 'from-[#2A4A9F] to-[#3A5AB0]' :
                progressoGeral?.progresso_percentual >= 25 ? 'from-[#3A5AB0] to-[#4A6AC0]' :
                'from-gray-400 to-gray-500'
              } flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0 relative">
                <span class="text-white text-sm md:text-lg font-bold">${progressoGeral?.progresso_percentual || 0}%</span>
              </div>
              <div class="text-left flex-1 min-w-0">
                <div class="flex items-baseline gap-1 md:gap-2">
                  <span class="text-base md:text-lg font-bold ${themes[currentTheme].text}">
                    ${progressoGeral?.tipo === 'edital' ? '📋 Progresso do Edital' : '📊 Progresso Geral'}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 md:mt-1">
                  <div class="flex-1 h-1.5 md:h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500 ${
                      progressoGeral?.progresso_percentual >= 70 ? 'bg-gradient-to-r from-[#122D6A] to-[#2A4A9F]' :
                      progressoGeral?.progresso_percentual >= 50 ? 'bg-gradient-to-r from-[#2A4A9F] to-[#3A5AB0]' :
                      progressoGeral?.progresso_percentual >= 25 ? 'bg-gradient-to-r from-[#3A5AB0] to-[#4A6AC0]' :
                      'bg-gradient-to-r from-gray-400 to-gray-500'
                    }" style="width: ${progressoGeral?.progresso_percentual || 0}%"></div>
                  </div>
                </div>
                <p class="text-[9px] md:text-[10px] ${themes[currentTheme].textSecondary} mt-0.5">
                  <span class="${
                    progressoGeral?.progresso_percentual >= 70 ? 'text-[#2A4A9F]' :
                    progressoGeral?.progresso_percentual >= 50 ? 'text-[#122D6A]' :
                    progressoGeral?.progresso_percentual >= 25 ? 'text-[#3A5AB0]' :
                    'text-[#4A6AC0]'
                  } font-medium">${progressoGeral?.topicos_estudados || 0}</span>/${progressoGeral?.total_topicos || 0} tópicos
                </p>
              </div>
              <i class="fas fa-chevron-right ${themes[currentTheme].textSecondary} group-hover:text-[#5A7AD0] transition-colors hidden md:block"></i>
            </div>
          </div>
          
          <!-- Botão Simulados -->
          <button onclick="window.renderDashboardSimulados()" class="group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-[#4A6AC0] hover:shadow-xl transition-all">
            <div class="flex items-center gap-2 md:gap-4">
              <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#3A5AB0] to-[#122D6A] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                <i class="fas fa-edit text-white text-sm md:text-xl"></i>
              </div>
              <div class="text-left flex-1 min-w-0">
                <div class="flex items-baseline gap-1 md:gap-2">
                  <span class="text-base md:text-xl font-bold ${themes[currentTheme].text}">Simulados</span>
                </div>
                <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1 truncate">
                  Rápido • Padrão • Completo
                </p>
              </div>
              <i class="fas fa-chevron-right ${themes[currentTheme].textSecondary} group-hover:text-[#4A6AC0] transition-colors hidden md:block"></i>
            </div>
          </button>
          
          <!-- Botão Dashboard de Desempenho -->
          <button onclick="window.renderDashboardDesempenho()" class="group ${themes[currentTheme].card} rounded-xl border-2 ${themes[currentTheme].border} p-2 md:p-4 hover:border-[#6BB6FF] hover:shadow-xl transition-all">
            <div class="flex items-center gap-2 md:gap-4">
              <div class="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#2A4A9F] flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg flex-shrink-0">
                <i class="fas fa-chart-pie text-white text-sm md:text-xl"></i>
              </div>
              <div class="text-left flex-1 min-w-0">
                <div class="flex items-baseline gap-1 md:gap-2">
                  <span class="text-base md:text-xl font-bold ${themes[currentTheme].text}">Desempenho</span>
                </div>
                <p class="text-[10px] md:text-xs ${themes[currentTheme].textSecondary} mt-0.5 md:mt-1 truncate">
                  Simulados • Estudos • Disciplinas
                </p>
              </div>
              <i class="fas fa-chevron-right ${themes[currentTheme].textSecondary} group-hover:text-[#6BB6FF] transition-colors hidden md:block"></i>
            </div>
          </button>
        </div>

        <!-- Grid: Calendário + Metas do Dia -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <!-- Mini Calendário do Mês -->
          <div class="calendario-mes ${themes[currentTheme].card} rounded-2xl shadow-lg border ${themes[currentTheme].border} p-4 lg:col-span-1">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold ${themes[currentTheme].text} flex items-center gap-2 text-sm">
                <i class="fas fa-calendar text-[#122D6A]"></i>
                ${new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}
              </h3>
              <div class="flex items-center gap-1 text-[9px]">
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span>Ok</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-400"></span>Parcial</span>
              </div>
            </div>
            ${gerarCalendarioCompacto(historico)}
          </div>
          
          <!-- Metas do Dia - Acesso Rápido -->
          <div class="${themes[currentTheme].card} rounded-2xl shadow-lg border ${themes[currentTheme].border} p-4 lg:col-span-2">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold ${themes[currentTheme].text} flex items-center gap-2 text-sm">
                <i class="fas fa-tasks text-[#122D6A]"></i>
                Hoje - ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h3>
              <span class="text-xs ${themes[currentTheme].textSecondary}">
                ${metas.filter(m => m.concluida).length}/${metas.length} concluídas
              </span>
            </div>
            
            <!-- Lista de Metas do Dia -->
            <div class="space-y-2 max-h-[250px] overflow-y-auto scrollbar-hide">
              ${metas.length > 0 ? metas.slice(0, 6).map(meta => `
                <div class="flex items-center gap-3 p-2 rounded-lg ${meta.concluida ? 'bg-green-50 dark:bg-green-900/20' : themes[currentTheme].bgAlt} hover:shadow-sm transition group cursor-pointer" onclick="abrirConteudo(${meta.id})">
                  <div class="w-8 h-8 rounded-lg ${meta.concluida ? 'bg-green-500' : 'bg-[#122D6A]'} flex items-center justify-center flex-shrink-0">
                    <i class="fas ${meta.concluida ? 'fa-check' : meta.tipo === 'teoria' ? 'fa-book' : meta.tipo === 'exercicios' ? 'fa-pencil-alt' : 'fa-sync'} text-white text-xs"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium ${themes[currentTheme].text} truncate ${meta.concluida ? 'line-through opacity-60' : ''}">${meta.disciplina_nome || meta.disciplina || 'Disciplina'}</p>
                    <p class="text-[10px] ${themes[currentTheme].textSecondary} truncate">${(meta.topicos_sugeridos && meta.topicos_sugeridos[0]?.nome) || meta.topico_nome || meta.topico || meta.tipo || ''}</p>
                  </div>
                  <span class="text-xs ${themes[currentTheme].textSecondary} flex-shrink-0">${meta.tempo_minutos || 30}min</span>
                  <i class="fas fa-chevron-right text-[10px] ${themes[currentTheme].textSecondary} opacity-0 group-hover:opacity-100 transition-opacity"></i>
                </div>
              `).join('') : `
                <div class="text-center py-6">
                  <i class="fas fa-clipboard-list text-3xl ${themes[currentTheme].textSecondary} mb-2"></i>
                  <p class="${themes[currentTheme].textSecondary} text-sm">Nenhuma meta para hoje</p>
                  <button onclick="gerarMetasSemana()" class="mt-2 text-xs text-[#122D6A] hover:underline">Gerar metas da semana</button>
                </div>
              `}
            </div>
            
            ${metas.length > 6 ? `<p class="text-center text-xs ${themes[currentTheme].textSecondary} mt-2">+${metas.length - 6} mais metas</p>` : ''}
          </div>
        </div>

        <!-- Calendário Semanal com Botão Gerar Metas Integrado -->
        <div id="calendario-semanal" class="mb-4"></div>

        <!-- Container para modais -->
        <div id="modal-container" class="hidden"></div>

        <!-- Gestão de Planos -->
        <div class="${themes[currentTheme].card} rounded-2xl shadow-lg p-6 border ${themes[currentTheme].border}">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] rounded-xl flex items-center justify-center">
                <i class="fas fa-layer-group text-white"></i>
              </div>
              <h2 class="text-lg font-bold ${themes[currentTheme].text}">Meus Planos</h2>
            </div>
            <button onclick="iniciarEntrevista()" 
              class="px-4 py-2 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-lg hover:shadow-lg transition flex items-center gap-2 text-sm">
              <i class="fas fa-plus"></i>
              <span>Novo</span>
            </button>
          </div>
          <div id="planos-list" class="space-y-2">
            <p class="${themes[currentTheme].textSecondary} text-center py-4 text-sm">Carregando planos...</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Verificar quais metas já têm conteúdo gerado
  setTimeout(() => {
    // Atualizar ícones de conteúdo para todas as metas
    if (typeof atualizarTodosIconesConteudo === 'function') {
      atualizarTodosIconesConteudo();
    }
    // Carregar lista de planos
    carregarPlanos();
    // Carregar semana ativa para calendário semanal
    carregarSemanaAtiva();
    // Restaurar estado do painel retrátil
    restoreCommandPanelState();
    
    // ✅ Verificar e iniciar tutorial para novos usuários
    checkAndStartTutorial();
    
    // ✅ Criar botão de ajuda flutuante
    createHelpButton();
    
    // ✅ Criar botão de configurações de IA
    createIAConfigButton();
  }, 500);
}

function gerarCalendarioCompacto(historico) {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();
  const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  // Criar mapa de histórico por dia
  const historicoMap = {};
  historico.forEach(h => {
    const dia = new Date(h.data + 'T00:00:00').getDate();
    historicoMap[dia] = h;
  });

  // Gerar grade de dias
  let diasHTML = '';
  
  // Dias em branco antes do início do mês
  for (let i = 0; i < diaSemanaInicio; i++) {
    diasHTML += '<div class=""></div>';
  }

  // Dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const hist = historicoMap[dia];
    let corClasse = 'bg-gray-200';
    let titulo = 'Não estudou';

    if (hist) {
      if (hist.status === 'completo') {
        corClasse = 'bg-[#122D6A]';
        titulo = `✅ ${hist.percentual_conclusao}% - ${Math.round(hist.tempo_estudado_minutos / 60 * 10) / 10}h`;
      } else if (hist.status === 'parcial') {
        corClasse = 'bg-blue-400';
        titulo = `⚠️ ${hist.percentual_conclusao}% - ${Math.round(hist.tempo_estudado_minutos / 60 * 10) / 10}h`;
      } else {
        corClasse = 'bg-red-300';
        titulo = '❌ Não estudou';
      }
    }

    // Marcar dia atual - tamanho responsivo
    if (dia === hoje.getDate()) {
      diasHTML += `
        <div class="w-6 h-6 md:w-8 md:h-8 ${corClasse} rounded flex items-center justify-center text-[10px] md:text-xs font-bold ring-2 ring-blue-500 cursor-pointer hover:scale-110 transition"
             title="${titulo}">
          ${dia}
        </div>
      `;
    } else {
      diasHTML += `
        <div class="w-6 h-6 md:w-8 md:h-8 ${corClasse} rounded flex items-center justify-center text-[10px] md:text-xs cursor-pointer hover:scale-110 transition"
             title="${titulo}">
          ${dia}
        </div>
      `;
    }
  }

  return `
    <div class="${themes[currentTheme].card} rounded-lg shadow-lg p-3 md:p-6 mb-6">
      <div class="flex items-center justify-between mb-3 md:mb-4">
        <h2 class="text-base md:text-xl font-bold">
          <span class="hidden md:inline">📅 Calendário de Estudos - </span>
          <span class="md:hidden">📅 </span>
          ${mesesNomes[mes - 1]}/${ano}
        </h2>
      </div>

      <!-- Legenda - Responsiva -->
      <div class="flex flex-wrap justify-center gap-2 md:gap-4 mb-3 md:mb-4 text-xs">
        <div class="flex items-center">
          <div class="w-3 h-3 bg-[#122D6A] rounded mr-1"></div>
          <span class="hidden sm:inline">Completo</span>
          <span class="sm:hidden">Ok</span>
        </div>
        <div class="flex items-center">
          <div class="w-3 h-3 bg-blue-400 rounded mr-1"></div>
          <span>Parcial</span>
        </div>
        <div class="flex items-center hidden sm:flex">
          <div class="w-3 h-3 bg-red-300 rounded mr-1"></div>
          <span>Não estudou</span>
        </div>
        <div class="flex items-center hidden sm:flex">
          <div class="w-3 h-3 bg-gray-200 rounded mr-1"></div>
          <span>Sem dados</span>
        </div>
      </div>

      <!-- Grade do calendário - Responsiva -->
      <div class="grid grid-cols-7 gap-0.5 md:gap-1 mb-2 text-center text-xs font-semibold text-gray-600">
        <div>D</div>
        <div>S</div>
        <div>T</div>
        <div>Q</div>
        <div>Q</div>
        <div>S</div>
        <div>S</div>
      </div>

      <div class="grid grid-cols-7 gap-0.5 md:gap-1 justify-items-center">
        ${diasHTML}
      </div>
    </div>
  `;
}

// Mostrar input de tempo quando checkbox é marcado
function mostrarInputTempo(metaId, tempoMeta) {
  const checkbox = document.getElementById(`check-${metaId}`);
  const inputContainer = document.getElementById(`tempo-input-${metaId}`);
  
  if (checkbox.checked) {
    // Mostrar input de tempo
    inputContainer.classList.remove('hidden');
    // Focar no input
    document.getElementById(`tempo-real-${metaId}`).focus();
  } else {
    // Ocultar input
    inputContainer.classList.add('hidden');
  }
}

// Confirmar conclusão com tempo informado
async function concluirMetaComTempo(metaId) {
  const tempoInput = document.getElementById(`tempo-real-${metaId}`);
  const tempoReal = parseInt(tempoInput.value);
  
  if (!tempoReal || tempoReal < 1) {
    showModal(' Por favor, informe um tempo válido (mínimo 1 minuto)');
    return;
  }
  
  if (tempoReal > 240) {
    showModal(' Tempo máximo: 240 minutos (4 horas)');
    return;
  }
  
  try {
    await axios.post('/api/metas/concluir', {
      meta_id: metaId,
      tempo_real_minutos: tempoReal
    });
    
    // Feedback visual
    const checkbox = document.getElementById(`check-${metaId}`);
    checkbox.disabled = true;
    
    // Recarregar dashboard
    renderDashboard();
  } catch (error) {
    console.error('Erro ao concluir meta:', error);
    showModal('Erro ao salvar. Tente novamente.');
  }
}

// Cancelar conclusão
function cancelarConclusao(metaId) {
  const checkbox = document.getElementById(`check-${metaId}`);
  const inputContainer = document.getElementById(`tempo-input-${metaId}`);
  
  // Desmarcar checkbox
  checkbox.checked = false;
  
  // Ocultar input
  inputContainer.classList.add('hidden');
}

// Marcar meta como concluída rapidamente (do calendário semanal)
async function marcarMetaConcluida(metaId) {
  // Mostrar modal para confirmar e informar tempo
  const modal = document.createElement('div');
  modal.id = 'modal-concluir-meta';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div class="text-center mb-4">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <i class="fas fa-check-circle text-emerald-500 text-3xl"></i>
        </div>
        <h3 class="text-lg font-bold text-gray-800">Concluir Meta</h3>
        <p class="text-sm text-gray-500">Quanto tempo você estudou?</p>
      </div>
      
      <div class="mb-4">
        <div class="flex items-center justify-center gap-2">
          <button onclick="setTempoRapido(15)" class="px-3 py-2 text-sm bg-gray-100 hover:bg-[#122D6A]/10 hover:text-blue-700 rounded-lg transition">15min</button>
          <button onclick="setTempoRapido(30)" class="px-3 py-2 text-sm bg-gray-100 hover:bg-[#122D6A]/10 hover:text-blue-700 rounded-lg transition">30min</button>
          <button onclick="setTempoRapido(45)" class="px-3 py-2 text-sm bg-gray-100 hover:bg-[#122D6A]/10 hover:text-blue-700 rounded-lg transition">45min</button>
          <button onclick="setTempoRapido(60)" class="px-3 py-2 text-sm bg-gray-100 hover:bg-[#122D6A]/10 hover:text-blue-700 rounded-lg transition">1h</button>
        </div>
        <div class="mt-3">
          <input type="number" id="tempo-concluir-meta" value="30" min="1" max="240" 
            class="w-full px-4 py-3 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            placeholder="Minutos">
          <p class="text-xs text-gray-400 text-center mt-1">minutos (máx. 240)</p>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button onclick="fecharModalConcluir()" class="flex-1 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
          Cancelar
        </button>
        <button onclick="confirmarConclusaoMeta(${metaId})" class="flex-1 px-4 py-3 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition flex items-center justify-center gap-2">
          <i class="fas fa-check"></i> Concluir
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Focar no input
  setTimeout(() => document.getElementById('tempo-concluir-meta').focus(), 100);
}

function setTempoRapido(minutos) {
  document.getElementById('tempo-concluir-meta').value = minutos;
}

function fecharModalConcluir() {
  const modal = document.getElementById('modal-concluir-meta');
  if (modal) modal.remove();
}

async function confirmarConclusaoMeta(metaId) {
  const tempoInput = document.getElementById('tempo-concluir-meta');
  const tempo = parseInt(tempoInput.value);
  
  if (!tempo || tempo < 1) {
    alert('Informe um tempo válido');
    return;
  }
  
  if (tempo > 240) {
    alert('Tempo máximo: 240 minutos');
    return;
  }
  
  try {
    await axios.post('/api/metas/concluir', {
      meta_id: metaId,
      tempo_real_minutos: tempo
    });
    
    fecharModalConcluir();
    
    // Recarregar calendário semanal
    await carregarSemanaAtiva();
    
    // ✅ NOVO: Atualizar estatísticas no header
    await atualizarEstatisticasHeader();
    
    // Mostrar feedback
    showModal('✅ Meta concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao concluir meta:', error);
    showModal('❌ Erro ao salvar. Tente novamente.');
  }
}

// ✅ NOVO: Função para atualizar apenas os KPIs do header sem re-renderizar tudo
async function atualizarEstatisticasHeader() {
  if (!currentUser) return;
  
  try {
    // Buscar estatísticas atualizadas
    const [estatisticasRes, scoreRes] = await Promise.all([
      axios.get(`/api/estatisticas/${currentUser.id}`),
      axios.get(`/api/score/${currentUser.id}`)
    ]);
    
    const stats = estatisticasRes.data;
    const scoreData = scoreRes.data;
    
    // Calcular média diária
    const mediaDiaria = stats.dias_estudados > 0 
      ? Math.round((stats.horas_totais * 60) / stats.dias_estudados) 
      : 0;
    
    // Atualizar elementos do header (KPIs pill bar no desktop)
    // Os elementos são dinâmicos, então vamos tentar atualizar via seletor
    const pillBar = document.querySelector('.hidden.lg\\:flex .flex.items-center.gap-0\\.5');
    if (pillBar) {
      const kpis = pillBar.querySelectorAll('.flex.items-center.gap-1\\.5');
      if (kpis.length >= 4) {
        // Streak
        const streakSpan = kpis[0].querySelector('span.text-xs');
        if (streakSpan) streakSpan.textContent = stats.streak_atual;
        
        // Horas
        const horasSpan = kpis[1].querySelector('span.text-xs');
        if (horasSpan) horasSpan.textContent = `${stats.horas_totais}h`;
        
        // Score
        const scoreSpan = kpis[2].querySelector('span.text-xs');
        if (scoreSpan) scoreSpan.textContent = `${scoreData.score}/10`;
        
        // Dias
        const diasSpan = kpis[3].querySelector('span.text-xs');
        if (diasSpan) diasSpan.textContent = `${stats.dias_estudados}d`;
      }
    }
    
    // Atualizar KPIs cards no painel expandido (se visível)
    const commandPanel = document.getElementById('command-panel');
    if (commandPanel && !commandPanel.classList.contains('hidden')) {
      const kpiCards = commandPanel.querySelectorAll('.grid > div');
      kpiCards.forEach(card => {
        const label = card.querySelector('p.text-\\[9px\\]')?.textContent?.toLowerCase();
        const valueEl = card.querySelector('p.text-base.font-bold');
        
        if (!valueEl || !label) return;
        
        switch(label) {
          case 'streak':
            valueEl.textContent = stats.streak_atual;
            break;
          case 'dias':
            valueEl.textContent = stats.dias_estudados;
            break;
          case 'horas':
            valueEl.textContent = `${stats.horas_totais}h`;
            break;
          case 'min/dia':
            valueEl.textContent = mediaDiaria;
            break;
          case 'score':
            valueEl.textContent = scoreData.score;
            break;
        }
      });
    }
    
    console.log('✅ Estatísticas atualizadas:', stats);
  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
  }
}

// Manter função antiga para compatibilidade (se existir código que a use)
async function toggleMeta(metaId) {
  mostrarInputTempo(metaId, 30);
}

// ============== PORTFÓLIO DE DISCIPLINAS ==============
async function renderPortfolioDisciplinas() {
  try {
    // Mostrar loading
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-6xl ${themes[currentTheme].text} mb-4"></i>
          <p class="${themes[currentTheme].text} text-xl">Carregando disciplinas...</p>
        </div>
      </div>
    `;
    
    // 🆕 Buscar plano ativo para filtrar disciplinas
    console.log('Buscando plano ativo...');
    const planoRes = await axios.get(`/api/planos/user/${currentUser.id}`);
    const plano = planoRes.data;
    
    // Extrair IDs de disciplinas ÚNICAS do plano atual (dos ciclos)
    const disciplinasIdPlano = [...new Set(plano.ciclos.map(c => c.disciplina_id))];
    console.log('Disciplinas no plano ativo:', disciplinasIdPlano.length);
    
    // Buscar APENAS as disciplinas do plano ativo
    console.log('Buscando disciplinas do usuário:', currentUser.id);
    const disciplinasRes = await axios.get(`/api/user-disciplinas/${currentUser.id}`);
    const todasDisciplinas = disciplinasRes.data;
    
    // 🆕 FILTRAR apenas disciplinas que estão no plano ativo
    const disciplinas = todasDisciplinas.filter(d => disciplinasIdPlano.includes(d.disciplina_id));
    console.log(`Disciplinas filtradas: ${disciplinas.length} de ${todasDisciplinas.length} (apenas do plano ativo)`);
    
    if (!disciplinas || disciplinas.length === 0) {
      document.getElementById('app').innerHTML = `
        <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
          <div class="text-center">
            <i class="fas fa-exclamation-triangle text-6xl text-[#2A4A9F] mb-4"></i>
            <p class="${themes[currentTheme].text} text-xl mb-4">Nenhuma disciplina no plano ativo</p>
            <button onclick="renderDashboard()" class="bg-[#0D1F4D] text-white px-6 py-2 rounded-lg hover:bg-[#0A1839]">
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    // Buscar conteúdos gerados para cada disciplina
    console.log('Buscando conteúdos...');
    let conteudos = [];
    try {
      const conteudosRes = await axios.get(`/api/conteudos/usuario/${currentUser.id}`);
      
      // Backend pode retornar { conteudos: [...] } ou array direto
      if (conteudosRes.data && conteudosRes.data.conteudos) {
        conteudos = conteudosRes.data.conteudos; // Formato: { conteudos: [...], total: N }
      } else if (Array.isArray(conteudosRes.data)) {
        conteudos = conteudosRes.data; // Formato: [...]
      } else {
        console.warn('⚠️ Formato inesperado de resposta:', conteudosRes.data);
        conteudos = [];
      }
      
      console.log('Conteúdos encontrados:', conteudos.length);
    } catch (conteudoError) {
      console.warn('⚠️ Erro ao buscar conteúdos (continuando sem conteúdos):', conteudoError.message);
      conteudos = [];
    }
    
    renderPortfolioDisciplinasUI(disciplinas, conteudos);
  } catch (error) {
    console.error('❌ Erro ao carregar portfólio:', error);
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
        <div class="text-center">
          <i class="fas fa-times-circle text-6xl text-[#2A4A9F] mb-4"></i>
          <p class="${themes[currentTheme].text} text-xl mb-4">Erro ao carregar disciplinas</p>
          <p class="${themes[currentTheme].textSecondary} mb-4">${error.response?.data?.error || error.message}</p>
          <button onclick="renderDashboard()" class="bg-[#122D6A] text-white px-6 py-2 rounded-lg">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

async function renderPortfolioDisciplinasUI(disciplinas, conteudos) {
  console.log('🎨 Renderizando UI do portfólio (NOVA VERSÃO - FOCO EM TÓPICOS)...', { disciplinas: disciplinas.length });
  const app = document.getElementById('app');
  
  if (!app) {
    console.error('❌ Elemento #app não encontrado!');
    return;
  }
  
  // Mostrar loading enquanto busca tópicos
  app.innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-4xl ${themes[currentTheme].text} mb-4"></i>
        <p class="${themes[currentTheme].text}">Carregando tópicos...</p>
      </div>
    </div>
  `;
  
  // Buscar tópicos de TODAS as disciplinas em paralelo
  const disciplinasComTopicos = await Promise.all(disciplinas.map(async (disc) => {
    try {
      const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${disc.disciplina_id}`);
      const topicos = topicosRes.data || [];
      
      // Calcular estatísticas
      const totalTopicos = topicos.length;
      const topicosRevisados = topicos.filter(t => t.vezes_estudado > 0).length;
      const percentualConclusao = totalTopicos > 0 ? Math.round((topicosRevisados / totalTopicos) * 100) : 0;
      
      return {
        ...disc,
        topicos,
        totalTopicos,
        topicosRevisados,
        percentualConclusao
      };
    } catch (error) {
      console.warn(`⚠️ Erro ao buscar tópicos de ${disc.nome}:`, error.message);
      return {
        ...disc,
        topicos: [],
        totalTopicos: 0,
        topicosRevisados: 0,
        percentualConclusao: 0
      };
    }
  }));
  
  // Calcular totais gerais
  const totalTopicosGeral = disciplinasComTopicos.reduce((sum, d) => sum + d.totalTopicos, 0);
  const totalRevisadosGeral = disciplinasComTopicos.reduce((sum, d) => sum + d.topicosRevisados, 0);
  const percentualGeralConclusao = totalTopicosGeral > 0 ? Math.round((totalRevisadosGeral / totalTopicosGeral) * 100) : 0;
  
  app.innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg}">
      <!-- HEADER AZUL PADRONIZADO -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between h-14">
            <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
              <i class="fas fa-arrow-left mr-2"></i>
              <span class="text-[#7BC4FF]">IA</span>prova
            </button>
            <div class="flex items-center gap-2">
              <button onclick="adicionarDisciplinaCustomGestao()" 
                class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2 text-sm font-medium">
                <i class="fas fa-plus"></i> <span class="hidden md:inline">Nova Disciplina</span>
              </button>
              <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                <i class="fas ${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <div class="max-w-7xl mx-auto p-4 md:p-6">
        <!-- Titulo da Pagina -->
        <div class="mb-6">
          <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
            <i class="fas fa-book-open mr-3 text-[#4A90D9]"></i>
            Minhas Disciplinas
          </h1>
          <p class="${themes[currentTheme].textSecondary} text-sm">
            Gerencie seus tópicos e acompanhe o progresso
          </p>
        </div>

        <!-- Campo de Pesquisa Genérica -->
        <div class="${themes[currentTheme].card} p-4 rounded-lg shadow border ${themes[currentTheme].border} mb-6">
          <div class="flex flex-col md:flex-row gap-3">
            <div class="flex-1 relative">
              <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              <input type="text" 
                id="pesquisaGeral"
                placeholder="Pesquisar em disciplinas e tópicos..." 
                class="w-full pl-10 pr-4 py-2.5 border ${themes[currentTheme].border} rounded-lg focus:ring-2 focus:ring-[#122D6A] focus:border-[#122D6A] ${themes[currentTheme].bg} ${themes[currentTheme].text}"
                onkeyup="filtrarDisciplinasTopicos(this.value)">
            </div>
            <button onclick="limparPesquisa()" 
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition flex items-center gap-2 text-sm">
              <i class="fas fa-times"></i> Limpar
            </button>
          </div>
          <p id="resultadoPesquisa" class="${themes[currentTheme].textSecondary} text-xs mt-2 hidden">
            <i class="fas fa-filter mr-1"></i>
            <span id="countResultados">0</span> resultado(s) encontrado(s)
          </p>
        </div>

        <!-- Estatísticas Gerais com novo design azul -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div class="${themes[currentTheme].card} p-3 md:p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center flex-shrink-0">
                <i class="fas fa-book text-white text-sm md:text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">${disciplinas.length}</p>
                <p class="text-xs ${themes[currentTheme].textSecondary} truncate">Disciplinas</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-3 md:p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#3A5AB0] to-[#4A90D9] flex items-center justify-center flex-shrink-0">
                <i class="fas fa-list-ul text-white text-sm md:text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-lg md:text-2xl font-bold ${themes[currentTheme].text}">${totalTopicosGeral}</p>
                <p class="text-xs ${themes[currentTheme].textSecondary} truncate">Tópicos</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-3 md:p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center flex-shrink-0">
                <i class="fas fa-check-circle text-white text-sm md:text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-lg md:text-2xl font-bold text-[#4A90D9]">${totalRevisadosGeral}</p>
                <p class="text-xs ${themes[currentTheme].textSecondary} truncate">Revisados</p>
              </div>
            </div>
          </div>
          
          <div class="${themes[currentTheme].card} p-3 md:p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#4A90D9] flex items-center justify-center flex-shrink-0">
                <i class="fas fa-chart-pie text-white text-sm md:text-lg"></i>
              </div>
              <div class="min-w-0">
                <p class="text-lg md:text-2xl font-bold text-[#4A90D9]">${percentualGeralConclusao}%</p>
                <p class="text-xs ${themes[currentTheme].textSecondary} truncate">Progresso</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Disciplinas com Tópicos -->
        <div id="lista-disciplinas" class="space-y-4">
          ${disciplinasComTopicos.map(disc => {
            // Cor da barra de progresso
            const corProgresso = disc.percentualConclusao >= 80 ? 'bg-green-500' : 
                                 disc.percentualConclusao >= 50 ? 'bg-blue-500' : 
                                 disc.percentualConclusao >= 25 ? 'bg-yellow-500' : 'bg-gray-400';
            
            return `
            <div class="${themes[currentTheme].card} rounded-xl shadow-lg border ${themes[currentTheme].border} overflow-hidden" 
                 data-disciplina-card data-disciplina-nome="${disc.nome}">
              <!-- Header da Disciplina (clicável para expandir) - RESPONSIVO -->
              <div class="p-3 md:p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                   onclick="toggleDisciplinaTopicos(${disc.disciplina_id})">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div class="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center text-white font-bold text-base md:text-lg">
                      ${disc.nome.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0 overflow-hidden">
                      <h3 class="text-sm md:text-lg font-bold ${themes[currentTheme].text} truncate">${disc.nome}</h3>
                      <div class="flex items-center gap-2 md:gap-4 mt-1 flex-wrap">
                        <span class="${themes[currentTheme].textSecondary} text-xs md:text-sm">
                          <i class="fas fa-list-ul mr-1"></i>${disc.totalTopicos} <span class="hidden sm:inline">tópicos</span>
                        </span>
                        <span class="text-[#2A4A9F] text-xs md:text-sm font-medium">
                          <i class="fas fa-check-circle mr-1"></i>${disc.topicosRevisados} <span class="hidden sm:inline">revisados</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Progresso circular e botões - RESPONSIVO -->
                  <div class="flex items-center gap-1 md:gap-3 flex-shrink-0">
                    <div class="text-center">
                      <div class="relative w-10 h-10 md:w-14 md:h-14">
                        <svg class="w-10 h-10 md:w-14 md:h-14 transform -rotate-90">
                          <circle cx="50%" cy="50%" r="40%" stroke="currentColor" stroke-width="3" fill="none" 
                                  class="text-gray-200 dark:text-gray-700"></circle>
                          <circle cx="50%" cy="50%" r="40%" stroke="currentColor" stroke-width="3" fill="none"
                                  stroke-dasharray="${disc.percentualConclusao * 1.51} 151"
                                  class="${disc.percentualConclusao >= 80 ? 'text-green-500' : disc.percentualConclusao >= 50 ? 'text-blue-500' : disc.percentualConclusao >= 25 ? 'text-yellow-500' : 'text-gray-400'}"></circle>
                        </svg>
                        <span class="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-bold ${themes[currentTheme].text}">
                          ${disc.percentualConclusao}%
                        </span>
                      </div>
                    </div>
                    <i class="fas fa-chevron-down ${themes[currentTheme].textSecondary} transition-transform text-sm" 
                       id="chevron-${disc.disciplina_id}"></i>
                  </div>
                </div>
                
                <!-- Barra de Progresso -->
                <div class="mt-3">
                  <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="${corProgresso} h-full rounded-full transition-all duration-500" 
                         style="width: ${disc.percentualConclusao}%"></div>
                  </div>
                </div>
              </div>
              
              <!-- Lista de Tópicos (expandível) -->
              <div id="topicos-${disc.disciplina_id}" class="hidden border-t ${themes[currentTheme].border}">
                <div class="p-4">
                  <!-- Botões de ação -->
                  <div class="flex justify-between items-center mb-4">
                    <h4 class="font-semibold ${themes[currentTheme].text}">
                      <i class="fas fa-list mr-2"></i>Tópicos da Disciplina
                    </h4>
                    <button onclick="event.stopPropagation(); adicionarTopicoNaDisciplina(${disc.disciplina_id}, '${disc.nome.replace(/'/g, "\\'")}')"
                            class="bg-[#122D6A] hover:bg-[#0D1F4D] text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                      <i class="fas fa-plus"></i> Novo Tópico
                    </button>
                  </div>
                  
                  ${disc.topicos.length === 0 ? `
                    <div class="text-center py-8 ${themes[currentTheme].textSecondary}">
                      <i class="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                      <p>Nenhum tópico cadastrado</p>
                      <button onclick="event.stopPropagation(); adicionarTopicoNaDisciplina(${disc.disciplina_id}, '${disc.nome.replace(/'/g, "\\'")}')"
                              class="mt-3 text-[#122D6A] hover:underline text-sm">
                        <i class="fas fa-plus mr-1"></i>Adicionar primeiro tópico
                      </button>
                    </div>
                  ` : `
                    <div class="space-y-2 max-h-96 overflow-y-auto">
                      ${disc.topicos.map((topico, index) => `
                        <div class="flex items-center gap-3 p-3 rounded-lg border ${topico.vezes_estudado > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} hover:shadow-sm transition"
                             data-topico-nome="${(topico.nome || '').replace(/"/g, '&quot;')}">
                          <!-- Checkbox de revisão -->
                          <button onclick="event.stopPropagation(); toggleRevisaoTopico(${topico.id}, ${topico.vezes_estudado > 0 ? 'false' : 'true'}, ${disc.disciplina_id})"
                                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition flex-shrink-0
                                         ${topico.vezes_estudado > 0 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}">
                            ${topico.vezes_estudado > 0 ? '<i class="fas fa-check text-xs"></i>' : ''}
                          </button>
                          
                          <!-- Info do tópico -->
                          <div class="flex-1 min-w-0">
                            <p class="${themes[currentTheme].text} truncate font-medium">
                              ${index + 1}. ${topico.nome}
                            </p>
                            <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                              ${topico.peso ? `<span class="text-xs text-gray-500">Peso: ${topico.peso}</span>` : ''}
                              ${topico.vezes_estudado > 0 ? `
                                <span class="text-xs text-[#2A4A9F] font-medium">
                                  <i class="fas fa-redo mr-1"></i>${topico.vezes_estudado}x revisado
                                </span>
                              ` : `
                                <span class="text-xs text-gray-400">
                                  <i class="fas fa-clock mr-1"></i>Não revisado
                                </span>
                              `}
                              ${topico.ultima_vez ? `
                                <span class="text-xs text-gray-500">
                                  Última: ${new Date(topico.ultima_vez).toLocaleDateString('pt-BR')}
                                </span>
                              ` : ''}
                            </div>
                          </div>
                          
                          <!-- Botões de ação -->
                          <div class="flex items-center gap-1 flex-shrink-0">
                            <button onclick="event.stopPropagation(); verMateriaisTopico(${topico.id}, '${(topico.nome || '').replace(/'/g, "\\'")}', '${disc.nome.replace(/'/g, "\\'")}')"
                                    class="p-2 text-[#2A4A9F] hover:bg-[#2A4A9F]/10 rounded-lg transition" title="Ver materiais salvos">
                              <i class="fas fa-folder-open text-sm"></i>
                            </button>
                            <button onclick="event.stopPropagation(); gerarConteudoTopico(${topico.id}, '${(topico.nome || '').replace(/'/g, "\\'")}', '${disc.nome.replace(/'/g, "\\'")}')"
                                    class="p-2 text-[#122D6A] hover:bg-[#6BB6FF]/10 rounded-lg transition" title="Gerar conteúdo com IA">
                              <i class="fas fa-magic text-sm"></i>
                            </button>
                            <button onclick="event.stopPropagation(); editarTopicoGestao(${topico.id}, '${(topico.nome || '').replace(/'/g, "\\'")}', ${topico.peso || 1})"
                                    class="p-2 text-blue-500 hover:bg-[#122D6A]/10 rounded-lg transition" title="Editar">
                              <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button onclick="event.stopPropagation(); excluirTopicoGestao(${topico.id}, ${disc.disciplina_id})"
                                    class="p-2 text-red-500 hover:bg-red-100 rounded-lg transition" title="Excluir">
                              <i class="fas fa-trash text-sm"></i>
                            </button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  `}
                </div>
              </div>
            </div>
          `}).join('')}
        </div>
        
        ${disciplinas.length === 0 ? `
          <div class="${themes[currentTheme].card} p-12 rounded-lg text-center">
            <i class="fas fa-book-open text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhuma disciplina cadastrada</h3>
            <p class="${themes[currentTheme].textSecondary} mb-4">Complete a entrevista inicial para começar</p>
            <button onclick="renderDashboard()" class="bg-[#0D1F4D] text-white px-6 py-3 rounded-lg hover:bg-[#0A1839]">
              Voltar ao Dashboard
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Função para expandir/colapsar tópicos de uma disciplina
window.toggleDisciplinaTopicos = function(disciplinaId) {
  const container = document.getElementById(`topicos-${disciplinaId}`);
  const chevron = document.getElementById(`chevron-${disciplinaId}`);
  
  if (container) {
    container.classList.toggle('hidden');
    if (chevron) {
      chevron.classList.toggle('rotate-180');
    }
  }
}

// ========== FUNÇÕES DE PESQUISA GENÉRICA ==========

// Função para filtrar disciplinas e tópicos por texto
window.filtrarDisciplinasTopicos = function(termo) {
  const termoLower = termo.toLowerCase().trim();
  const disciplinasContainer = document.getElementById('lista-disciplinas');
  
  if (!disciplinasContainer) {
    console.warn('Container de disciplinas não encontrado');
    return;
  }
  
  const cards = disciplinasContainer.querySelectorAll('[data-disciplina-card]');
  let totalResultados = 0;
  let disciplinasVisiveis = 0;
  
  cards.forEach(card => {
    const disciplinaNome = card.dataset.disciplinaNome || '';
    const topicos = card.querySelectorAll('[data-topico-nome]');
    let disciplinaMatch = disciplinaNome.toLowerCase().includes(termoLower);
    let topicosMatch = 0;
    
    // Verificar cada tópico
    topicos.forEach(topico => {
      const topicoNome = topico.dataset.topicoNome || '';
      const match = topicoNome.toLowerCase().includes(termoLower);
      
      if (termoLower === '') {
        topico.style.display = '';
        topico.style.backgroundColor = '';
      } else if (match) {
        topico.style.display = '';
        topico.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; // Highlight verde
        topicosMatch++;
      } else {
        topico.style.display = disciplinaMatch ? '' : 'none';
        topico.style.backgroundColor = '';
      }
    });
    
    // Mostrar/ocultar disciplina
    if (termoLower === '') {
      card.style.display = '';
      card.style.border = '';
    } else if (disciplinaMatch || topicosMatch > 0) {
      card.style.display = '';
      card.style.border = disciplinaMatch ? '2px solid #22C55E' : '';
      disciplinasVisiveis++;
      totalResultados += (disciplinaMatch ? 1 : 0) + topicosMatch;
      
      // Auto-expandir se houver tópicos encontrados
      if (topicosMatch > 0 && termoLower !== '') {
        const container = card.querySelector('[id^="topicos-"]');
        const chevron = card.querySelector('[id^="chevron-"]');
        if (container && container.classList.contains('hidden')) {
          container.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180');
        }
      }
    } else {
      card.style.display = 'none';
    }
  });
  
  // Atualizar contador de resultados
  const resultadoEl = document.getElementById('resultadoPesquisa');
  const countEl = document.getElementById('countResultados');
  
  if (resultadoEl && countEl) {
    if (termoLower !== '') {
      resultadoEl.classList.remove('hidden');
      countEl.textContent = `${totalResultados} em ${disciplinasVisiveis} disciplina(s)`;
    } else {
      resultadoEl.classList.add('hidden');
    }
  }
}

// Função para limpar a pesquisa
window.limparPesquisa = function() {
  const input = document.getElementById('pesquisaGeral');
  if (input) {
    input.value = '';
    filtrarDisciplinasTopicos('');
  }
}

// ========== FIM FUNÇÕES DE PESQUISA ==========

// Função para marcar/desmarcar tópico como revisado
window.toggleRevisaoTopico = async function(topicoId, marcarRevisado, disciplinaId) {
  try {
    // Atualizar no backend
    await axios.post(`/api/user-topicos/progresso`, {
      user_id: currentUser.id,
      topico_id: topicoId,
      vezes_estudado: marcarRevisado ? 1 : 0,
      nivel_dominio: marcarRevisado ? 1 : 0
    });
    
    showToast(marcarRevisado ? '✅ Tópico marcado como revisado!' : '↩️ Revisão desmarcada', 'success');
    
    // Recarregar a tela
    await renderPortfolioDisciplinas();
    
    // Reabrir a disciplina que estava aberta
    setTimeout(() => {
      const container = document.getElementById(`topicos-${disciplinaId}`);
      const chevron = document.getElementById(`chevron-${disciplinaId}`);
      if (container) {
        container.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
      }
    }, 100);
  } catch (error) {
    console.error('Erro ao atualizar revisão:', error);
    showToast('Erro ao atualizar revisão', 'error');
  }
}

// Função para ver materiais salvos do tópico
window.verMateriaisTopico = async function(topicoId, topicoNome, disciplinaNome) {
  try {
    // ✅ Guardar dados em variáveis globais para evitar problemas com escape
    window._materiaisTopicoAtual = {
      topicoId: topicoId,
      topicoNome: topicoNome,
      disciplinaNome: disciplinaNome
    };
    
    // Buscar materiais do tópico
    const response = await axios.get(`/api/materiais/${currentUser.id}?topico_id=${topicoId}`);
    const materiais = response.data.materiais || [];
    
    const tipoIcons = {
      teoria: { icon: 'fa-book', color: 'blue', label: 'Teoria' },
      exercicios: { icon: 'fa-tasks', color: 'green', label: 'Exercícios' },
      resumo: { icon: 'fa-sticky-note', color: 'yellow', label: 'Resumo' },
      flashcards: { icon: 'fa-clone', color: 'purple', label: 'Flashcards' },
      upload: { icon: 'fa-file-upload', color: 'indigo', label: 'Upload' },
      anotacao: { icon: 'fa-edit', color: 'gray', label: 'Anotação' }
    };
    
    const modalHtml = `
      <div id="modal-materiais-topico" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6 flex-shrink-0">
            <h2 class="text-xl font-bold flex items-center gap-3">
              <i class="fas fa-folder-open"></i>
              Materiais Salvos
            </h2>
            <p class="mt-1 text-sm opacity-90">${topicoNome}</p>
            <p class="text-xs opacity-75">${disciplinaNome}</p>
          </div>
          
          <!-- Conteúdo -->
          <div class="flex-1 overflow-y-auto p-6">
            ${materiais.length === 0 ? `
              <div class="text-center py-12">
                <i class="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-bold ${themes[currentTheme].text} mb-2">Nenhum material salvo ainda</h3>
                <p class="${themes[currentTheme].textSecondary} mb-4">Gere conteúdo com IA para começar</p>
                <button onclick="gerarConteudoDoMaterialModal()"
                        class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                  <i class="fas fa-magic mr-2"></i>Gerar Conteúdo
                </button>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${materiais.map(material => {
                  const tipoInfo = tipoIcons[material.tipo] || tipoIcons.anotacao;
                  const dataFormatada = new Date(material.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                  
                  return `
                    <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} overflow-hidden hover:shadow-lg transition">
                      <!-- Header do Card -->
                      <div class="bg-${tipoInfo.color}-50 p-3 border-b ${themes[currentTheme].border}">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-${tipoInfo.color}-100 flex items-center justify-center">
                              <i class="fas ${tipoInfo.icon} text-${tipoInfo.color}-600 text-sm"></i>
                            </div>
                            <div>
                              <p class="text-xs text-${tipoInfo.color}-600 font-medium">${tipoInfo.label}</p>
                              <p class="text-xs ${themes[currentTheme].textSecondary}">${dataFormatada}</p>
                            </div>
                          </div>
                          <button onclick="event.stopPropagation(); toggleFavoritoMaterial(${material.id})" 
                                  class="text-lg ${material.favorito ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 transition">
                            <i class="fas fa-star"></i>
                          </button>
                        </div>
                      </div>
                      
                      <!-- Conteúdo -->
                      <div class="p-3">
                        <h4 class="font-semibold ${themes[currentTheme].text} text-sm mb-2 line-clamp-2">${material.titulo}</h4>
                        ${material.conteudo ? `<p class="${themes[currentTheme].textSecondary} text-xs line-clamp-2">${material.conteudo.substring(0, 100)}...</p>` : ''}
                      </div>
                      
                      <!-- Footer -->
                      <div class="p-2 border-t ${themes[currentTheme].border} flex gap-2">
                        <button onclick="visualizarMaterialDireto(${material.id}, '${material.tipo}')" 
                                class="flex-1 px-3 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition text-xs">
                          <i class="fas fa-eye mr-1"></i>Ver
                        </button>
                        <button onclick="deletarMaterialDireto(${material.id})" 
                                class="px-3 py-2 border ${themes[currentTheme].border} rounded-lg hover:bg-red-50 hover:border-red-300 transition text-xs">
                          <i class="fas fa-trash text-red-500"></i>
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t ${themes[currentTheme].border} flex gap-3 justify-end flex-shrink-0">
            <button onclick="gerarConteudoDoMaterialModal()"
                    class="px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
              <i class="fas fa-magic mr-2"></i>Gerar Novo Conteúdo
            </button>
            <button onclick="document.getElementById('modal-materiais-topico').remove()"
                    class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
              <i class="fas fa-times mr-2"></i>Fechar
            </button>
          </div>
        </div>
      </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstElementChild);
    
  } catch (error) {
    console.error('Erro ao carregar materiais:', error);
    showToast('Erro ao carregar materiais do tópico', 'error');
  }
}

// Visualizar material direto (do modal de materiais)
window.visualizarMaterialDireto = async function(materialId, tipo) {
  try {
    const response = await axios.get(`/api/materiais/item/${materialId}`);
    const material = response.data.material;
    
    // Fechar modal de materiais
    document.getElementById('modal-materiais-topico')?.remove();
    
    // Abrir visualização específica por tipo
    if (tipo === 'exercicios') {
      const questoes = parseQuestoes(material.conteudo);
      if (questoes && questoes.length > 0) {
        exibirExerciciosInterativos(questoes, material.disciplina_nome, material.topico_nome);
      } else {
        showToast('Não foi possível processar as questões', 'error');
      }
    } else if (tipo === 'flashcards') {
      const flashcards = parseFlashcards(material.conteudo);
      if (flashcards && flashcards.length > 0) {
        exibirFlashcardsVisuais(flashcards, material.disciplina_nome, material.topico_nome);
      } else {
        showToast('Não foi possível processar os flashcards', 'error');
      }
    } else {
      // Teoria ou Resumo - exibir normalmente
      exibirConteudoGerado({
        topico_nome: material.topico_nome,
        disciplina_nome: material.disciplina_nome,
        tipo: material.tipo,
        conteudo: material.conteudo,
        caracteres: material.conteudo.length,
        gerado_em: material.created_at
      });
    }
  } catch (error) {
    console.error('Erro ao visualizar material:', error);
    showToast('Erro ao carregar material', 'error');
  }
}

// Deletar material direto (do modal de materiais)
window.deletarMaterialDireto = async function(materialId) {
  const confirmed = await showConfirm('Deseja realmente deletar este material?\n\nEsta ação não pode ser desfeita.', {
    title: 'Deletar Material',
    confirmText: 'Deletar',
    cancelText: 'Cancelar',
    type: 'danger'
  });
  if (!confirmed) return;
  
  try {
    await axios.delete(`/api/materiais/${materialId}`);
    showToast('✅ Material deletado com sucesso', 'success');
    // Recarregar modal
    const modalElement = document.getElementById('modal-materiais-topico');
    if (modalElement) {
      const topicoInfo = modalElement.querySelector('p.text-sm.opacity-90');
      if (topicoInfo) {
        modalElement.remove();
        // Reabrir modal atualizado - você precisaria passar os parâmetros corretos aqui
        // Por simplicidade, vamos apenas fechar e mostrar toast
      }
    }
  } catch (error) {
    console.error('Erro ao deletar material:', error);
    showToast('Erro ao deletar material', 'error');
  }
}

// Toggle favorito do material (do modal)
window.toggleFavoritoMaterial = async function(materialId) {
  try {
    const response = await axios.post(`/api/materiais/${materialId}/favorito`);
    if (response.data.success) {
      showToast(response.data.favorito ? '⭐ Favoritado' : '☆ Desfavoritado', 'success');
      // Atualizar ícone visualmente
      const button = event.target.closest('button');
      if (button) {
        const icon = button.querySelector('i');
        if (icon) {
          if (response.data.favorito) {
            button.classList.add('text-yellow-500');
            button.classList.remove('text-gray-300');
          } else {
            button.classList.add('text-gray-300');
            button.classList.remove('text-yellow-500');
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao toggle favorito:', error);
    showToast('Erro ao atualizar favorito', 'error');
  }
}

// ✅ NOVA: Função auxiliar para gerar conteúdo a partir do modal de materiais
window.gerarConteudoDoMaterialModal = function() {
  // Fechar modal de materiais
  document.getElementById('modal-materiais-topico')?.remove();
  
  // Verificar se temos os dados guardados
  const dados = window._materiaisTopicoAtual;
  if (dados) {
    console.log('🎯 Gerando conteúdo para:', dados);
    gerarConteudoTopico(dados.topicoId, dados.topicoNome, dados.disciplinaNome);
  } else {
    showToast('Erro: dados do tópico não encontrados', 'error');
  }
}

// Função para gerar conteúdo do tópico com IA
window.gerarConteudoTopico = async function(topicoId, topicoNome, disciplinaNome, metaId = null) {
  const app = document.getElementById('app');
  
  // Modal de seleção de tipo - TEMA CORRIGIDO
  const modalHtml = `
    <div id="modal-gerar-conteudo" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6">
          <h2 class="text-xl font-bold flex items-center gap-3">
            <i class="fas fa-magic"></i>
            Gerar Conteúdo com IA
          </h2>
          <p class="mt-1 text-sm opacity-90">${topicoNome}</p>
          <p class="text-xs opacity-75">${disciplinaNome}</p>
        </div>
        
        <div class="p-6">
          <p class="${themes[currentTheme].textSecondary} mb-4">Escolha o tipo de conteúdo que deseja gerar:</p>
          
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button onclick="selecionarTipoConteudo('teoria')"
                    id="btn-tipo-teoria"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#122D6A] hover:bg-[#122D6A]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#122D6A]/10 flex items-center justify-center">
                  <i class="fas fa-book text-[#122D6A]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Teoria</p>
                  <p class="text-xs text-gray-500">Conteúdo completo</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('exercicios')"
                    id="btn-tipo-exercicios"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#2A4A9F] hover:bg-[#2A4A9F]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#2A4A9F]/10 flex items-center justify-center">
                  <i class="fas fa-tasks text-[#2A4A9F]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Exercícios</p>
                  <p class="text-xs text-gray-500">Questões de concurso</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('resumo')"
                    id="btn-tipo-resumo"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#3A5AB0] hover:bg-[#3A5AB0]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#3A5AB0]/10 flex items-center justify-center">
                  <i class="fas fa-sticky-note text-[#3A5AB0]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Resumo</p>
                  <p class="text-xs text-gray-500">Esquematizado</p>
                </div>
              </div>
            </button>
            
            <button onclick="selecionarTipoConteudo('flashcards')"
                    id="btn-tipo-flashcards"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A6AC0] hover:bg-[#4A6AC0]/5 transition text-left bg-white">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-[#4A6AC0]/10 flex items-center justify-center">
                  <i class="fas fa-clone text-[#4A6AC0]"></i>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">Flashcards</p>
                  <p class="text-xs text-gray-500">Cards de revisão</p>
                </div>
              </div>
            </button>
            
            <!-- 5ª Opção: Resumo Personalizado -->
            <button onclick="selecionarTipoConteudo('resumo_personalizado')"
                    id="btn-tipo-resumo-personalizado"
                    class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#122D6A] hover:bg-[#E8EDF5] transition text-left bg-white col-span-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#122D6A]/20 to-[#2A4A9F]/20 flex items-center justify-center">
                  <i class="fas fa-file-upload text-[#122D6A]"></i>
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-gray-800">Resumo Personalizado</p>
                  <p class="text-xs text-gray-500">Upload de PDF ou documento para gerar resumo com IA</p>
                </div>
              </div>
            </button>
          </div>
          
          <!-- Seletor de quantidade (aparece para exercícios e flashcards) -->
          <div id="seletor-quantidade" class="hidden mb-4 p-4 ${themes[currentTheme].bg} border ${themes[currentTheme].border} rounded-xl">
            <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
              <i class="fas fa-hashtag mr-1"></i>
              Quantidade:
            </label>
            <div class="flex items-center gap-3">
              <input type="range" id="quantidade-slider" min="5" max="20" value="10" 
                     class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#122D6A]"
                     oninput="document.getElementById('quantidade-valor').textContent = this.value">
              <span id="quantidade-valor" class="text-xl font-bold text-[#122D6A] w-8 text-center">10</span>
            </div>
            <p class="text-xs ${themes[currentTheme].textSecondary} mt-2">
              Deslize para escolher entre 5 e 20 itens
            </p>
          </div>
          
          <!-- Botão de gerar -->
          <button id="btn-gerar-conteudo" 
                  onclick="confirmarGeracaoConteudo(${topicoId}, '${topicoNome.replace(/'/g, "\\'")}', '${disciplinaNome.replace(/'/g, "\\'")}', ${metaId || 'null'})"
                  class="hidden w-full py-3 bg-[#122D6A] text-white rounded-xl hover:bg-[#0D1F4D] transition font-semibold mb-3">
            <i class="fas fa-magic mr-2"></i>Gerar Conteúdo
          </button>
          
          <button onclick="document.getElementById('modal-gerar-conteudo').remove()"
                  class="w-full py-3 border-2 ${themes[currentTheme].border} rounded-xl ${themes[currentTheme].text} hover:bg-gray-100 transition">
            <i class="fas fa-times mr-2"></i>Cancelar
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Adicionar modal ao DOM
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
}

// Variável para armazenar tipo selecionado
let tipoConteudoSelecionado = null;

// Função para selecionar tipo de conteúdo
window.selecionarTipoConteudo = function(tipo) {
  console.log('🎯 Tipo de conteúdo selecionado:', tipo);
  tipoConteudoSelecionado = tipo;
  
  // Resetar todos os botões
  ['teoria', 'exercicios', 'resumo', 'flashcards', 'resumo_personalizado'].forEach(t => {
    const btn = document.getElementById(`btn-tipo-${t}`);
    if (btn) {
      btn.classList.remove('border-[#122D6A]', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-[#E8EDF5]');
      btn.classList.add('border-gray-200', 'dark:border-gray-700');
    }
  });
  
  // Destacar botão selecionado
  const btnSelecionado = document.getElementById(`btn-tipo-${tipo}`);
  if (btnSelecionado) {
    btnSelecionado.classList.remove('border-gray-200', 'dark:border-gray-700');
    btnSelecionado.classList.add('border-[#122D6A]');
    const colors = { 
      teoria: 'bg-blue-50', 
      exercicios: 'bg-green-50', 
      resumo: 'bg-yellow-50', 
      flashcards: 'bg-[#E8EDF5]',
      resumo_personalizado: 'bg-[#E8EDF5]'
    };
    btnSelecionado.classList.add(colors[tipo]);
  }
  
  // Mostrar/ocultar seletor de quantidade
  const seletorQtd = document.getElementById('seletor-quantidade');
  const slider = document.getElementById('quantidade-slider');
  const valorSpan = document.getElementById('quantidade-valor');
  
  if (tipo === 'exercicios' || tipo === 'flashcards') {
    seletorQtd.classList.remove('hidden');
    // Ajustar limites baseado no tipo
    if (tipo === 'exercicios') {
      slider.min = 5;
      slider.max = 30;
      slider.value = 10;
      valorSpan.textContent = '10';
    } else {
      slider.min = 5;
      slider.max = 30;
      slider.value = 15;
      valorSpan.textContent = '15';
    }
  } else {
    seletorQtd.classList.add('hidden');
  }
  
  // Mostrar botão de gerar
  document.getElementById('btn-gerar-conteudo').classList.remove('hidden');
}

// Função para confirmar e executar geração
window.confirmarGeracaoConteudo = function(topicoId, topicoNome, disciplinaNome, metaId = null) {
  console.log('📝 Confirmando geração:', { tipoConteudoSelecionado, topicoId, topicoNome, disciplinaNome, metaId });
  
  if (!tipoConteudoSelecionado) {
    showToast('Selecione um tipo de conteúdo', 'warning');
    return;
  }
  
  // Se for resumo personalizado, abrir modal de upload
  if (tipoConteudoSelecionado === 'resumo_personalizado') {
    console.log('📄 Abrindo modal de upload de resumo personalizado...');
    document.getElementById('modal-gerar-conteudo')?.remove();
    // Configurar meta para o modal de upload
    window.metaAtual = {
      topico_id: topicoId,
      topico_nome: topicoNome,
      disciplina_nome: disciplinaNome
    };
    abrirModalResumoPersonalizado(metaId || 0);
    return;
  }
  
  let quantidade = null;
  if (tipoConteudoSelecionado === 'exercicios' || tipoConteudoSelecionado === 'flashcards') {
    quantidade = parseInt(document.getElementById('quantidade-slider').value);
  }
  
  // Remover modal e executar
  document.getElementById('modal-gerar-conteudo')?.remove();
  executarGeracaoConteudo(topicoId, topicoNome, disciplinaNome, tipoConteudoSelecionado, quantidade, metaId);
}

// Função para executar a geração de conteúdo
window.executarGeracaoConteudo = async function(topicoId, topicoNome, disciplinaNome, tipo, quantidade = null, metaId = null) {
  // Remover modal de seleção
  const modal = document.getElementById('modal-gerar-conteudo');
  if (modal) modal.remove();
  
  const qtdTexto = quantidade ? ` (${quantidade} itens)` : '';
  
  // Mostrar loading - TEMA CORRIGIDO
  const loadingHtml = `
    <div id="loading-conteudo" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div class="animate-spin w-16 h-16 border-4 border-[#122D6A] border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Gerando conteúdo com IA...</h3>
        <p class="${themes[currentTheme].textSecondary}">Aguarde, estamos preparando ${
          tipo === 'teoria' ? 'a teoria completa' :
          tipo === 'exercicios' ? `${quantidade || 10} exercícios` :
          tipo === 'resumo' ? 'o resumo esquematizado' :
          `${quantidade || 15} flashcards`
        } para você.</p>
        <p class="text-sm ${themes[currentTheme].textSecondary} mt-2">Isso pode levar alguns segundos...</p>
      </div>
    </div>
  `;
  
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = loadingHtml;
  document.body.appendChild(loadingDiv.firstElementChild);
  
  try {
    // Obter configurações da IA do localStorage
    const iaConfigSaved = localStorage.getItem('iaConfig');
    const iaConfig = iaConfigSaved ? JSON.parse(iaConfigSaved) : {
      tom: 'didatico',
      temperatura: 0.5,
      intensidade: 'intermediaria',
      profundidade: 'aplicada',
      extensao: 'medio',
      extensaoCustom: 2000,
      formatoResumo: 'detalhado',
      formatoTeoria: 'completa',
      formatoFlashcards: 'objetivos',
      formatoExercicios: 'padrao'
    };
    
    console.log('🎆 Configurações de IA sendo usadas:', iaConfig);
    
    const response = await axios.post('/api/topicos/gerar-conteudo', {
      topico_id: topicoId,
      topico_nome: topicoNome,
      disciplina_nome: disciplinaNome,
      tipo: tipo,
      quantidade: quantidade,
      meta_id: metaId,
      config_ia: iaConfig  // Enviar configurações da IA
    }, {
      headers: {
        'X-User-ID': currentUser?.id || 1
      }
    });
    
    // Remover loading
    document.getElementById('loading-conteudo')?.remove();
    
    if (response.data.success) {
      // Mostrar ícone do conteúdo gerado se tiver metaId
      if (metaId && response.data.material_id) {
        console.log(`✅ Conteúdo ${tipo} gerado com sucesso! Material ID: ${response.data.material_id}, Meta ID: ${metaId}`);
        
        // Atualizar cache imediatamente
        if (!window.conteudosMetaCache[metaId]) {
          window.conteudosMetaCache[metaId] = { tipos_gerados: {}, tipos_sources: {} };
        }
        window.conteudosMetaCache[metaId].tipos_gerados[tipo] = response.data.material_id;
        window.conteudosMetaCache[metaId].tipos_sources[tipo] = { id: response.data.material_id, source: 'materiais_salvos' };
        window.conteudosMetaCache[metaId][`tem_${tipo}`] = true;
        
        // Aguardar um momento para garantir que o DOM está pronto
        setTimeout(() => {
          mostrarIconeConteudo(metaId, tipo, response.data.material_id);
          
          // Forçar atualização visual adicional
          const btn = document.getElementById(`icon-${tipo}-${metaId}`);
          if (btn) {
            console.log(`🎆 Forçando visibilidade do ícone ${tipo} para meta ${metaId}`);
            btn.style.opacity = '1';
            btn.style.filter = 'none';
            btn.classList.remove('opacity-40', 'hover:opacity-80');
            btn.classList.add('opacity-100');
          } else {
            console.warn(`⚠️ Botão icon-${tipo}-${metaId} não encontrado no DOM`);
          }
          
          // Também atualizar via API para garantir persistência
          setTimeout(() => {
            atualizarIconesConteudoMeta(metaId);
          }, 1000);
        }, 500);
      }
      
      // Exibir conteúdo baseado no tipo
      if (response.data.tipo === 'exercicios') {
        // Exercícios interativos
        exibirExerciciosInterativos(response.data);
      } else if (response.data.tipo === 'flashcards') {
        // Flashcards visuais
        exibirFlashcardsVisuais(response.data);
      } else {
        // Teoria ou Resumo - exibição padrão formatada
        exibirConteudoGerado(response.data);
      }
    } else {
      showToast('Erro ao gerar conteúdo: ' + (response.data.error || 'Erro desconhecido'), 'error');
    }
  } catch (error) {
    document.getElementById('loading-conteudo')?.remove();
    console.error('Erro ao gerar conteúdo:', error);
    
    // Mensagem mais amigável para rate limit
    const errorMsg = error.response?.data?.error || error.message;
    const errorDetails = error.response?.data?.details || '';
    
    if (error.response?.status === 429 || errorMsg.includes('rate') || errorMsg.includes('indisponível')) {
      showToast('🕐 API ocupada. Aguarde 1-2 minutos e tente novamente.', 'warning');
    } else {
      showToast('Erro ao gerar conteúdo: ' + errorMsg, 'error');
    }
  }
}

// Função para exibir o conteúdo gerado
window.exibirConteudoGerado = function(data) {
  const { topico_nome, disciplina_nome, disciplina_id, topico_id, tipo, conteudo, caracteres, gerado_em, material_id } = data;
  
  // Material já foi salvo automaticamente no backend (material_id)
  console.log('✅ Exibindo conteúdo:', { tipo, topico_nome, disciplina_nome, material_id });
  
  // Garantir que conteudo é string
  const conteudoTexto = typeof conteudo === 'string' ? conteudo : (conteudo?.texto || JSON.stringify(conteudo) || '');
  
  const tipoLabel = {
    'teoria': { label: 'Teoria Completa', icon: 'fa-book', color: 'blue' },
    'exercicios': { label: 'Exercícios', icon: 'fa-tasks', color: 'green' },
    'resumo': { label: 'Resumo Esquematizado', icon: 'fa-sticky-note', color: 'yellow' },
    'flashcards': { label: 'Flashcards', icon: 'fa-clone', color: 'purple' }
  }[tipo] || { label: 'Conteúdo', icon: 'fa-file', color: 'gray' };
  
  // Converter markdown simples para HTML
  const conteudoHtml = conteudoTexto
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-[#122D6A]">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-[#0D1F4D]">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><strong>$1.</strong> $2</li>')
    .replace(/---/g, '<hr class="my-4 border-gray-300">')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br>');
  
  // Valores opcionais com fallback
  const numCaracteres = caracteres || conteudoTexto.length || 0;
  const dataGeracao = gerado_em ? new Date(gerado_em).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  
  const modalHtml = `
    <div id="modal-conteudo-gerado" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <!-- Header fixo -->
        <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6 flex-shrink-0 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold flex items-center gap-3">
                <i class="fas ${tipoLabel.icon}"></i>
                ${tipoLabel.label}
              </h2>
              <p class="mt-1 text-sm opacity-90">${topico_nome || 'Conteúdo'}</p>
              <p class="text-xs opacity-75">${disciplina_nome || 'Material de Estudo'}</p>
            </div>
            <div class="text-right">
              <p class="text-xs opacity-75">${numCaracteres.toLocaleString()} caracteres</p>
              <p class="text-xs opacity-75">${dataGeracao}</p>
            </div>
          </div>
        </div>
        
        <!-- Conteúdo scrollável -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="${themes[currentTheme].text} prose prose-sm max-w-none">
            <p class="mb-3">${conteudoHtml}</p>
          </div>
        </div>
        
        <!-- Footer fixo -->
        <div class="p-4 border-t ${themes[currentTheme].border} flex-shrink-0 flex gap-3 justify-end">
          <button onclick="copiarConteudoGerado()"
                  class="px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition flex items-center gap-2">
            <i class="fas fa-copy"></i>Copiar
          </button>
          <button onclick="fecharModalConteudoGerado()"
                  class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2">
            <i class="fas fa-times"></i>Fechar
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Guardar conteúdo original para copiar
  window.conteudoGeradoOriginal = conteudoTexto;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
}

// Função para fechar modal de conteúdo gerado e voltar ao dashboard
window.fecharModalConteudoGerado = function() {
  document.getElementById('modal-conteudo-gerado')?.remove();
  // NÃO redesenhar o dashboard inteiro, apenas atualizar os ícones
  // Isso preserva o estado atual e mostra os ícones de conteúdo gerado
  
  // Aguardar um momento e forçar atualização dos ícones
  setTimeout(() => {
    if (typeof atualizarTodosIconesConteudo === 'function') {
      console.log('🔄 Atualizando todos os ícones de conteúdo...');
      atualizarTodosIconesConteudo();
    }
    
    // Forçar atualização visual dos ícones específicos
    document.querySelectorAll('[id^="icon-"]').forEach(icon => {
      if (icon.hasAttribute('data-conteudo-id')) {
        icon.style.opacity = '1';
        icon.classList.remove('opacity-40', 'hover:opacity-80');
        icon.classList.add('opacity-100');
      }
    });
  }, 500);
}

// Função para copiar conteúdo
window.copiarConteudoGerado = function() {
  if (window.conteudoGeradoOriginal) {
    navigator.clipboard.writeText(window.conteudoGeradoOriginal).then(() => {
      showToast('✅ Conteúdo copiado para a área de transferência!', 'success');
    }).catch(() => {
      showToast('Erro ao copiar conteúdo', 'error');
    });
  }
}

// Função para adicionar tópico em uma disciplina
window.adicionarTopicoNaDisciplina = async function(disciplinaId, disciplinaNome) {
  const nome = await showPrompt(`Adicionar tópico em "${disciplinaNome}"`, 'Nome do tópico:', '');
  if (!nome || !nome.trim()) return;
  
  const pesoStr = await showPrompt('Peso do tópico', 'Informe o peso (1-10):', '1');
  const peso = parseInt(pesoStr) || 1;
  
  try {
    await axios.post('/api/topicos/manual', {
      disciplina_id: disciplinaId,
      nome: nome.trim(),
      peso: Math.min(10, Math.max(1, peso)),
      categoria: 'Geral',
      user_id: currentUser.id // ✅ Incluir user_id para isolamento
    });
    
    showToast('✅ Tópico adicionado com sucesso!', 'success');
    
    // Recarregar e reabrir
    await renderPortfolioDisciplinas();
    setTimeout(() => {
      const container = document.getElementById(`topicos-${disciplinaId}`);
      const chevron = document.getElementById(`chevron-${disciplinaId}`);
      if (container) {
        container.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
      }
    }, 100);
  } catch (error) {
    console.error('Erro ao adicionar tópico:', error);
    showToast('Erro ao adicionar tópico: ' + (error.response?.data?.error || error.message), 'error');
  }
}

async function verDetalhesDisciplina(disciplinaId, disciplinaNome) {
  try {
    // Buscar todos os conteúdos do usuário
    const conteudosRes = await axios.get(`/api/conteudos/usuario/${currentUser.id}`);
    
    // Backend pode retornar { conteudos: [...] } ou array direto
    let todosConteudos = [];
    if (conteudosRes.data && conteudosRes.data.conteudos) {
      todosConteudos = conteudosRes.data.conteudos;
    } else if (Array.isArray(conteudosRes.data)) {
      todosConteudos = conteudosRes.data;
    }
    
    // Filtrar apenas conteúdos desta disciplina
    const conteudos = todosConteudos.filter(c => c.disciplina_id === disciplinaId);
    
    await renderDetalheDisciplina(disciplinaId, disciplinaNome, conteudos);
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    showModal('Erro ao carregar conteúdos da disciplina: ' + (error.response?.data?.error || error.message));
  }
}

async function renderDetalheDisciplina(disciplinaId, disciplinaNome, conteudos, topicoPreSelecionado = null) {
  const app = document.getElementById('app');
  
  // Buscar tópicos do edital e progresso
  let topicos = [];
  try {
    const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${disciplinaId}`);
    topicos = topicosRes.data;
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error);
  }
  
  // Se tem tópico pré-selecionado e meta atual, gerar conteúdo automaticamente
  if (topicoPreSelecionado && window.metaAtual) {
    console.log('🎯 Tópico pré-selecionado:', topicoPreSelecionado.nome);
    // Guardar para gerar conteúdo após renderizar
    window.topicoPreSelecionado = topicoPreSelecionado;
  }
  
  // Organizar conteúdos por tipo e data
  const conteudosOrganizados = {
    teoria: conteudos.filter(c => c.tipo === 'teoria').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    exercicios: conteudos.filter(c => c.tipo === 'exercicios').sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    revisao: conteudos.filter(c => c.tipo === 'revisao').sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  };
  
  app.innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg}">
      <!-- HEADER AZUL PADRONIZADO -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between h-14">
            <button onclick="renderPortfolioDisciplinas()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
              <i class="fas fa-arrow-left mr-2"></i>
              <span class="text-[#7BC4FF]">IA</span>prova
            </button>
            <div class="flex items-center gap-2">
              <span class="text-white/80 text-sm hidden sm:inline">
                <i class="fas fa-book mr-1"></i>${disciplinaNome}
              </span>
              <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                <i class="fas \${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto p-4 md:p-6">
        <!-- Titulo da Pagina -->
        <div class="mb-6">
          <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
            <i class="fas fa-book mr-3 text-[#4A90D9]"></i>
            ${disciplinaNome}
          </h1>
          <p class="${themes[currentTheme].textSecondary} text-sm">
            ${conteudos.length} conteúdo(s) gerado(s) • ${topicos.length} tópicos
          </p>
        </div>

        <!-- Tabs com novo estilo azul -->
        <div class="mb-6 flex gap-1 flex-wrap bg-blue-50 dark:bg-blue-900/20 p-1 rounded-xl border border-blue-100 dark:border-blue-800">
          <button onclick="switchTabDisciplina('topicos')" id="tab-topicos"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-[#4A90D9] text-white shadow-sm transition">
            <i class="fas fa-list-check mr-2"></i>Tópicos (${topicos.length})
          </button>
          <button onclick="switchTabDisciplina('teoria')" id="tab-teoria"
            class="px-4 py-2 text-sm font-medium rounded-lg text-[#4A90D9] hover:bg-blue-100 dark:hover:bg-blue-800/30 transition">
            <i class="fas fa-graduation-cap mr-2"></i>Teoria (${conteudosOrganizados.teoria.length})
          </button>
          <button onclick="switchTabDisciplina('exercicios')" id="tab-exercicios"
            class="px-4 py-2 text-sm font-medium rounded-lg text-[#4A90D9] hover:bg-blue-100 dark:hover:bg-blue-800/30 transition">
            <i class="fas fa-tasks mr-2"></i>Exercícios (${conteudosOrganizados.exercicios.length})
          </button>
          <button onclick="switchTabDisciplina('revisao')" id="tab-revisao"
            class="px-4 py-2 text-sm font-medium rounded-lg text-[#4A90D9] hover:bg-blue-100 dark:hover:bg-blue-800/30 transition">
            <i class="fas fa-sync mr-2"></i>Revisão (${conteudosOrganizados.revisao.length})
          </button>
        </div>

        <!-- Conteúdo da Tab -->
        <div id="conteudo-tab">
          ${renderTabTopicos(topicos)}
        </div>
      </div>
    </div>
  `;
  
  // Salvar dados globalmente para as tabs
  window.currentDisciplinaConteudos = conteudosOrganizados;
  window.currentDisciplinaTopicos = topicos;
  window.currentDisciplinaId = disciplinaId; // ✅ Para gestão de tópicos
  
  // Se tem tópico pré-selecionado, gerar conteúdo automaticamente
  if (window.topicoPreSelecionado && window.metaAtual) {
    setTimeout(async () => {
      const topico = window.topicoPreSelecionado;
      const meta = window.metaAtual;
      
      console.log('🚀 Gerando conteúdo para tópico pré-selecionado:', topico.nome);
      
      // Limpar para não repetir
      window.topicoPreSelecionado = null;
      
      // Gerar conteúdo do tópico
      await gerarConteudoMeta(meta);
    }, 500);
  }
}

function switchTabDisciplina(tipo) {
  // Atualizar estilo das tabs - novo design azul
  ['topicos', 'teoria', 'exercicios', 'revisao'].forEach(t => {
    const tab = document.getElementById(`tab-${t}`);
    if (t === tipo) {
      tab.className = 'px-4 py-2 text-sm font-medium rounded-lg bg-[#4A90D9] text-white shadow-sm transition';
    } else {
      tab.className = `px-4 py-2 text-sm font-medium rounded-lg text-[#4A90D9] hover:bg-blue-100 dark:hover:bg-blue-800/30 transition`;
    }
  });
  
  // Atualizar conteúdo
  const conteudoTab = document.getElementById('conteudo-tab');
  if (tipo === 'topicos') {
    conteudoTab.innerHTML = renderTabTopicos(window.currentDisciplinaTopicos);
  } else {
    conteudoTab.innerHTML = renderTabConteudo(tipo, window.currentDisciplinaConteudos[tipo]);
  }
}

function renderTabTopicos(topicos) {
  if (topicos.length === 0) {
    return `
      <div class="${themes[currentTheme].card} p-12 rounded-lg text-center">
        <i class="fas fa-list text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhum tópico cadastrado</h3>
        <p class="${themes[currentTheme].textSecondary} mb-4">Os tópicos do edital serão adicionados quando você processar um edital ou podem ser adicionados manualmente.</p>
        <button onclick="adicionarTopicoManual()" class="bg-[#122D6A] text-white px-6 py-3 rounded-lg hover:bg-[#0D1F4D]">
          <i class="fas fa-plus mr-2"></i>Adicionar Tópico Manualmente
        </button>
      </div>
    `;
  }
  
  // Agrupar por categoria
  const categorias = {};
  topicos.forEach(topico => {
    const cat = topico.categoria || 'Outros';
    if (!categorias[cat]) {
      categorias[cat] = [];
    }
    categorias[cat].push(topico);
  });
  
  // Calcular estatísticas gerais
  const totalTopicos = topicos.length;
  const estudados = topicos.filter(t => t.vezes_estudado > 0).length;
  const percentualConclusao = totalTopicos > 0 ? Math.round((estudados / totalTopicos) * 100) : 0;
  const nivelMedio = totalTopicos > 0 ? topicos.reduce((sum, t) => sum + t.nivel_dominio, 0) / totalTopicos : 0;
  
  console.log(`📊 Estatísticas: ${estudados}/${totalTopicos} estudados (${percentualConclusao}%), nível médio: ${nivelMedio.toFixed(1)}`);
  
  return `
    <!-- Estatísticas do Edital -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="${themes[currentTheme].card} p-4 rounded-lg shadow">
        <div class="text-center">
          <div class="text-3xl font-bold ${c('primary').text}">${totalTopicos}</div>
          <div class="${themes[currentTheme].textSecondary} text-sm">Tópicos Total</div>
        </div>
      </div>
      <div class="${themes[currentTheme].card} p-4 rounded-lg shadow">
        <div class="text-center">
          <div class="text-3xl font-bold ${c('success').text}">${estudados}</div>
          <div class="${themes[currentTheme].textSecondary} text-sm">Já Estudados</div>
        </div>
      </div>
      <div class="${themes[currentTheme].card} p-4 rounded-lg shadow">
        <div class="text-center">
          <div class="text-3xl font-bold ${c('secondary').text}">${percentualConclusao}%</div>
          <div class="${themes[currentTheme].textSecondary} text-sm">Conclusão</div>
        </div>
      </div>
      <div class="${themes[currentTheme].card} p-4 rounded-lg shadow">
        <div class="text-center">
          <div class="text-3xl font-bold ${c('warning').text}">${nivelMedio.toFixed(1)}/10</div>
          <div class="${themes[currentTheme].textSecondary} text-sm">Domínio Médio</div>
        </div>
      </div>
    </div>
    
    <!-- Barra de Progresso Geral -->
    <div class="${themes[currentTheme].card} p-6 rounded-lg shadow mb-6">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold ${themes[currentTheme].text}">Progresso Geral do Edital</h3>
        <span class="text-sm ${themes[currentTheme].textSecondary}">${estudados}/${totalTopicos} tópicos</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div class="bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] h-4 rounded-full transition-all duration-500" 
          style="width: ${percentualConclusao}%"></div>
      </div>
    </div>
    
    <!-- Tópicos por Categoria -->
    <div class="space-y-6">
      ${Object.keys(categorias).map(categoria => `
        <div class="${themes[currentTheme].card} rounded-lg shadow overflow-hidden">
          <div class="bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] p-4 flex items-center justify-between">
            <h3 class="text-lg font-bold text-white">
              <i class="fas fa-folder-open mr-2"></i>${categoria}
            </h3>
            <button onclick="adicionarTopicoCategoria('${categoria}')" 
              class="text-white hover:bg-white/20 px-3 py-1 rounded text-sm flex items-center gap-1">
              <i class="fas fa-plus"></i> Novo Tópico
            </button>
          </div>
          <div class="p-6">
            <div class="space-y-3">
              ${categorias[categoria].map(topico => {
                const percentual = topico.nivel_dominio * 10;
                const cor = topico.vezes_estudado === 0 ? 'red' : 
                           topico.nivel_dominio < 5 ? 'yellow' : 
                           topico.nivel_dominio < 8 ? 'blue' : 'green';
                
                return `
                  <div class="border ${themes[currentTheme].text === 'text-white' ? 'border-gray-700' : '${themes[currentTheme].border}'} rounded-lg p-4 hover:shadow-md transition">
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex-1">
                        <h4 class="font-semibold ${themes[currentTheme].text} mb-1">
                          ${topico.nome}
                        </h4>
                        <div class="flex items-center gap-4 text-sm ${themes[currentTheme].textSecondary}">
                          <span>
                            <i class="fas fa-redo mr-1"></i>
                            ${topico.vezes_estudado || 0}x estudado
                          </span>
                          ${topico.ultima_vez ? `
                            <span>
                              <i class="far fa-clock mr-1"></i>
                              ${new Date(topico.ultima_vez).toLocaleDateString('pt-BR')}
                            </span>
                          ` : ''}
                          <span>
                            <i class="fas fa-weight-hanging mr-1"></i>
                            Peso ${topico.peso}
                          </span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="text-center">
                          <div class="text-2xl font-bold text-${cor}-600">${topico.nivel_dominio}/10</div>
                          <div class="text-xs ${themes[currentTheme].textSecondary}">Domínio</div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Barra de Progresso do Tópico -->
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div class="bg-${cor}-500 h-2 rounded-full transition-all duration-300" 
                        style="width: ${percentual}%"></div>
                    </div>
                    
                    <!-- Botões de Ação -->
                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button onclick="editarTopicoGestao(${topico.id}, '${topico.nome.replace(/'/g, "\\'")}', ${topico.peso})" 
                        class="text-xs text-[#1A3A7F] hover:text-[#0D1F4D] flex items-center gap-1">
                        <i class="fas fa-edit"></i> Editar
                      </button>
                      <button onclick="excluirTopicoGestao(${topico.id})" 
                        class="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                        <i class="fas fa-trash"></i> Excluir
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ✅ FUNÇÕES DE GESTÃO DE TÓPICOS (MINHAS DISCIPLINAS)
window.adicionarTopicoManual = async () => {
  const nome = await showPrompt('Digite o nome do novo tópico:');
  if (!nome || !nome.trim()) return;
  
  const peso = await showPrompt('Digite o peso do tópico (1-10):', '1');
  const pesoNum = parseInt(peso) || 1;
  
  const categoria = await showPrompt('Digite a categoria (opcional):', 'Outros');
  
  try {
    // Usar disciplina atual (precisa ser passada via global)
    if (!window.currentDisciplinaId) {
      showModal('Erro: disciplina não identificada', 'error');
      return;
    }
    
    const response = await axios.post('/api/topicos/manual', {
      disciplina_id: window.currentDisciplinaId,
      nome: nome.trim(),
      peso: pesoNum,
      categoria: categoria.trim() || 'Outros',
      user_id: currentUser.id // ✅ Incluir user_id para isolamento
    });
    
    showToast('Tópico adicionado com sucesso!', 'success');
    
    // Recarregar tópicos
    const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${window.currentDisciplinaId}`);
    window.currentDisciplinaTopicos = topicosRes.data;
    document.getElementById('conteudo-tab').innerHTML = renderTabTopicos(topicosRes.data);
  } catch (error) {
    console.error('Erro ao adicionar tópico:', error);
    showModal('Erro ao adicionar tópico: ' + (error.response?.data?.error || error.message), 'error');
  }
};

window.adicionarTopicoCategoria = async (categoria) => {
  const nome = await showPrompt(`Novo tópico para categoria "${categoria}":`);
  if (!nome || !nome.trim()) return;
  
  const peso = await showPrompt('Peso do tópico (1-10):', '1');
  const pesoNum = parseInt(peso) || 1;
  
  try {
    if (!window.currentDisciplinaId) {
      showModal('Erro: disciplina não identificada', 'error');
      return;
    }
    
    const response = await axios.post('/api/topicos/manual', {
      disciplina_id: window.currentDisciplinaId,
      nome: nome.trim(),
      peso: pesoNum,
      categoria: categoria,
      user_id: currentUser.id // ✅ Incluir user_id para isolamento
    });
    
    showToast('Tópico adicionado com sucesso!', 'success');
    
    // Recarregar tópicos
    const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${window.currentDisciplinaId}`);
    window.currentDisciplinaTopicos = topicosRes.data;
    document.getElementById('conteudo-tab').innerHTML = renderTabTopicos(topicosRes.data);
  } catch (error) {
    console.error('Erro ao adicionar tópico:', error);
    showModal('Erro ao adicionar tópico: ' + (error.response?.data?.error || error.message), 'error');
  }
};

window.editarTopicoGestao = async (topicoId, nomeAtual, pesoAtual) => {
  const novoNome = await showPrompt('Editar nome do tópico:', nomeAtual);
  if (!novoNome || !novoNome.trim()) return;
  
  const novoPeso = await showPrompt('Editar peso do tópico (1-10):', String(pesoAtual || 1));
  const novoPesoNum = parseInt(novoPeso) || pesoAtual || 1;
  
  try {
    // ✅ WORKAROUND: Usar endpoint de geração para simular update
    // Buscar todos os tópicos atuais
    const topicosAtuais = window.currentDisciplinaTopicos || [];
    
    // Atualizar o tópico específico
    const topicosAtualizados = topicosAtuais.map(t => {
      if (t.id === topicoId) {
        return { ...t, nome: novoNome.trim(), peso: novoPesoNum };
      }
      return t;
    });
    
    // Regenerar todos os tópicos (workaround até endpoints estarem disponíveis)
    await axios.post(`/api/topicos/gerar/${window.currentDisciplinaId}`, {
      topicos: topicosAtualizados.map((t, idx) => ({
        nome: t.nome,
        categoria: t.categoria || 'Outros',
        ordem: idx + 1,
        peso: t.peso || 1
      })),
      user_id: currentUser.id // ✅ Incluir user_id para isolamento
    });
    
    showToast('Tópico atualizado com sucesso!', 'success');
    
    // Recarregar tópicos
    const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${window.currentDisciplinaId}`);
    window.currentDisciplinaTopicos = topicosRes.data;
    document.getElementById('conteudo-tab').innerHTML = renderTabTopicos(topicosRes.data);
  } catch (error) {
    console.error('Erro ao editar tópico:', error);
    showModal('Erro ao editar tópico: ' + (error.response?.data?.error || error.message), 'error');
  }
};

window.excluirTopicoGestao = async (topicoId) => {
  // ✅ CORREÇÃO: showConfirm retorna Promise, não usa callback
  const confirmed = await showConfirm('Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita.', {
    type: 'danger',
    title: 'Excluir Tópico',
    confirmText: 'Sim, excluir',
    cancelText: 'Cancelar'
  });
  
  if (!confirmed) return;
  
  try {
    // ✅ WORKAROUND: Usar endpoint de geração para simular delete
    // Buscar todos os tópicos atuais
    const topicosAtuais = window.currentDisciplinaTopicos || [];
    
    // Remover o tópico específico
    const topicosAtualizados = topicosAtuais.filter(t => t.id !== topicoId);
    
    // Regenerar todos os tópicos (workaround até endpoints estarem disponíveis)
    await axios.post(`/api/topicos/gerar/${window.currentDisciplinaId}`, {
      topicos: topicosAtualizados.map((t, idx) => ({
        nome: t.nome,
        categoria: t.categoria || 'Outros',
        ordem: idx + 1,
        peso: t.peso || 1
      })),
      user_id: currentUser.id // ✅ Incluir user_id para isolamento
    });
    
    showToast('Tópico excluído com sucesso!', 'info');
    
    // Recarregar tópicos
    const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${window.currentDisciplinaId}`);
    window.currentDisciplinaTopicos = topicosRes.data;
    document.getElementById('conteudo-tab').innerHTML = renderTabTopicos(topicosRes.data);
  } catch (error) {
    console.error('Erro ao excluir tópico:', error);
    showModal('Erro ao excluir tópico: ' + (error.response?.data?.error || error.message), 'error');
  }
};

// ✅ FUNÇÕES DE GESTÃO DE DISCIPLINAS (CRUD COMPLETO)
window.adicionarDisciplinaCustomGestao = async () => {
  const nome = await showPrompt('Digite o nome da nova disciplina:');
  if (!nome || !nome.trim()) return;
  
  const nivelAtual = await showPrompt('Nível de conhecimento (0-10):', '5');
  const nivelNum = parseInt(nivelAtual) || 5;
  
  try {
    // Criar disciplina padrão primeiro
    const discResponse = await axios.post('/api/disciplinas', {
      nome: nome.trim(),
      area: 'custom'
    });
    
    const disciplina_id = discResponse.data.id;
    
    // Associar ao usuário
    await axios.post('/api/user-disciplinas', {
      user_id: currentUser.id,
      disciplina_id: disciplina_id,
      nivel_atual: nivelNum,
      ja_estudou: false,
      dificuldade: false
    });
    
    showToast('Disciplina adicionada com sucesso!', 'success');
    
    // Recarregar página
    renderPortfolioDisciplinas();
  } catch (error) {
    console.error('Erro ao adicionar disciplina:', error);
    showModal('Erro ao adicionar disciplina: ' + (error.response?.data?.error || error.message), 'error');
  }
};

window.editarDisciplinaGestao = async (userDisciplinaId, disciplinaId, nomeAtual) => {
  const novoNome = await showPrompt('Editar nome da disciplina:', nomeAtual);
  if (!novoNome || !novoNome.trim()) return;
  
  const novoNivel = await showPrompt('Editar nível de conhecimento (0-10):', '5');
  const novoNivelNum = parseInt(novoNivel) || 5;
  
  try {
    // Atualizar nome da disciplina
    await axios.put(`/api/disciplinas/${disciplinaId}`, {
      nome: novoNome.trim()
    });
    
    // Atualizar nível do usuário
    await axios.put(`/api/user-disciplinas/${userDisciplinaId}`, {
      nivel_atual: novoNivelNum
    });
    
    showToast('Disciplina atualizada com sucesso!', 'success');
    
    // Recarregar página
    renderPortfolioDisciplinas();
  } catch (error) {
    console.error('Erro ao editar disciplina:', error);
    showModal('Erro ao editar disciplina: ' + (error.response?.data?.error || error.message), 'error');
  }
};

window.excluirDisciplinaGestao = async (userDisciplinaId, nome) => {
  const confirmed = await showConfirm(
    `Tem certeza que deseja excluir "${nome}"?\n\nTodos os tópicos, conteúdos e progresso desta disciplina serão perdidos permanentemente.`,
    {
      type: 'danger',
      title: 'Excluir Disciplina',
      confirmText: 'Sim, excluir tudo',
      cancelText: 'Cancelar'
    }
  );
  
  if (!confirmed) return;
  
  try {
    // Excluir associação user_disciplinas
    await axios.delete(`/api/user-disciplinas/${userDisciplinaId}`);
    
    showToast('Disciplina excluída com sucesso!', 'info');
    
    // Recarregar página
    renderPortfolioDisciplinas();
  } catch (error) {
    console.error('Erro ao excluir disciplina:', error);
    showModal('Erro ao excluir disciplina: ' + (error.response?.data?.error || error.message), 'error');
  }
};

function renderTabConteudo(tipo, conteudos) {
  if (conteudos.length === 0) {
    return `
      <div class="${themes[currentTheme].card} p-12 rounded-lg text-center">
        <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhum conteúdo de ${tipo} ainda</h3>
        <p class="${themes[currentTheme].textSecondary}">Gere conteúdos pelo Dashboard para vê-los aqui</p>
      </div>
    `;
  }
  
  return `
    <div class="space-y-4">
      ${conteudos.map(conteudo => {
        const topicos = JSON.parse(conteudo.topicos || '[]');
        const dataFormatada = new Date(conteudo.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        
        return `
          <div class="${themes[currentTheme].card} rounded-lg shadow hover:shadow-lg transition overflow-hidden">
            <div class="p-6">
              <!-- Header do Conteúdo -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-lg font-bold ${themes[currentTheme].text} mb-2">
                    ${topicos.slice(0, 2).join(' • ')}${topicos.length > 2 ? '...' : ''}
                  </h3>
                  <div class="flex items-center gap-4 text-sm ${themes[currentTheme].textSecondary}">
                    <span><i class="far fa-calendar mr-1"></i>${dataFormatada}</span>
                    <span><i class="fas fa-file mr-1"></i>${conteudo.tipo}</span>
                  </div>
                </div>
                <button 
                  onclick="visualizarConteudoPorId(${conteudo.id})"
                  class="bg-[#0D1F4D] text-white px-4 py-2 rounded-lg hover:bg-[#0A1839] transition flex items-center gap-2">
                  <i class="fas fa-eye"></i>
                  Ver Material
                </button>
              </div>
              
              <!-- Tópicos -->
              <div class="flex flex-wrap gap-2 mb-4">
                ${topicos.map(topico => `
                  <span class="px-3 py-1 bg-[#D0D9EB] text-[#122D6A] rounded-full text-xs font-semibold">
                    ${topico}
                  </span>
                `).join('')}
              </div>
              
              <!-- Objetivos -->
              ${conteudo.objetivos ? `
                <div class="border-t ${themes[currentTheme].text === 'text-white' ? 'border-gray-700' : '${themes[currentTheme].border}'} pt-4">
                  <h4 class="font-semibold ${themes[currentTheme].text} mb-2">
                    <i class="fas fa-bullseye mr-2 text-[#3A5AB0]"></i>Objetivos:
                  </h4>
                  <ul class="${themes[currentTheme].textSecondary} text-sm space-y-1">
                    ${JSON.parse(conteudo.objetivos).slice(0, 3).map(obj => `
                      <li><i class="fas fa-check text-[#2A4A9F] mr-2"></i>${obj}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Visualizar conteúdo por ID
async function visualizarConteudoPorId(conteudoId) {
  try {
    console.log('🔍 Buscando conteúdo ID:', conteudoId);
    const response = await axios.get(`/api/conteudos/${conteudoId}`);
    const data = response.data;
    
    console.log('✅ Conteúdo recebido:', {
      id: data?.id,
      tipo: data?.tipo,
      disciplina: data?.disciplina_nome,
      temConteudo: !!data?.conteudo,
      temTexto: !!data?.conteudo?.texto,
      temSecoes: !!data?.conteudo?.secoes
    });
    
    // Se o conteúdo tem formato de texto simples (gerado pela IA)
    if (data?.conteudo?.texto) {
      exibirConteudoTexto(data);
    } else if (data?.conteudo?.secoes) {
      visualizarConteudo(data);
    } else {
      // Tentar exibir como texto se conteudo for string
      if (typeof data?.conteudo === 'string') {
        exibirConteudoTexto({ ...data, conteudo: { texto: data.conteudo } });
      } else {
        showModal('Formato de conteúdo não reconhecido');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao carregar conteúdo:', error);
    console.error('❌ Detalhes do erro:', error.response?.data || error.message);
    showModal(`Erro ao carregar material de estudo\n\nID: ${conteudoId}\nErro: ${error.response?.statusText || error.message}`);
  }
}

// Exibir conteúdo de texto formatado (teoria, resumo, flashcards gerados pela IA)
function exibirConteudoTexto(data) {
  const { id, tipo, disciplina_nome, conteudo, topicos } = data;
  const texto = conteudo?.texto || '';
  const topicoNome = topicos?.[0]?.nome || 'Conteúdo';
  
  const tipoInfo = {
    'teoria': { label: 'Teoria', icon: 'fa-book', color: 'blue', bgGradient: 'from-blue-600 to-blue-800' },
    'exercicios': { label: 'Exercícios', icon: 'fa-tasks', color: 'emerald', bgGradient: 'from-emerald-600 to-emerald-800' },
    'resumo': { label: 'Resumo', icon: 'fa-file-alt', color: 'amber', bgGradient: 'from-amber-500 to-amber-700' },
    'flashcards': { label: 'Flashcards', icon: 'fa-clone', color: 'cyan', bgGradient: 'from-cyan-500 to-cyan-700' }
  }[tipo] || { label: 'Conteúdo', icon: 'fa-file', color: 'gray', bgGradient: 'from-gray-600 to-gray-800' };
  
  // Converter Markdown para HTML
  const htmlContent = texto
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-gray-800 mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    .replace(/^[\*\-] (.*)$/gim, '<li class="ml-4 mb-1">$1</li>')
    .replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 my-3">$1</ul>')
    .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
    .replace(/^\|(.+)\|$/gim, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td class="border px-3 py-2">${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/---/g, '<hr class="my-6 border-gray-200">');
  
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderNavbar()}
    
    <div class="${themes[currentTheme].bg} min-h-screen">
      <!-- Header fixo -->
      <div class="sticky top-0 z-40 bg-gradient-to-r ${tipoInfo.bgGradient} text-white shadow-lg">
        <div class="max-w-4xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button onclick="renderDashboard()" class="p-2 hover:bg-white/20 rounded-lg transition">
                <i class="fas fa-arrow-left"></i>
              </button>
              <div>
                <div class="flex items-center gap-2">
                  <i class="fas ${tipoInfo.icon}"></i>
                  <span class="font-bold">${tipoInfo.label}</span>
                </div>
                <p class="text-sm text-white/80">${disciplina_nome || 'Material de Estudo'}</p>
              </div>
            </div>
            <div class="text-right text-sm text-white/70">
              ${topicoNome}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Conteúdo -->
      <div class="max-w-4xl mx-auto px-4 py-8">
        <div class="${themes[currentTheme].card} rounded-2xl shadow-lg p-8">
          <div class="prose prose-lg max-w-none">
            <p class="mb-4 text-gray-700 leading-relaxed">${htmlContent}</p>
          </div>
        </div>
        
        <!-- Botões de ação -->
        <div class="flex items-center justify-center gap-4 mt-8">
          <button onclick="renderDashboard()" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition flex items-center gap-2">
            <i class="fas fa-home"></i> Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  `;
}
window.exibirConteudoTexto = exibirConteudoTexto;

// ============== MATERIAIS E HISTÓRICO ==============
async function renderMateriais(activeTab = 'todos') {
  const app = document.getElementById('app');
  
  try {
    // Carregar materiais e histórico do usuário
    const [materiaisRes, historicoRes] = await Promise.all([
      axios.get(`/api/materiais/${currentUser.id}`),
      axios.get(`/api/historico/conteudos/${currentUser.id}`)
    ]);
    
    const materiais = materiaisRes.data.materiais || [];
    const estatisticas = historicoRes.data.estatisticas || {};
    
    // Agrupar por tipo
    const porTipo = {
      teoria: materiais.filter(m => m.tipo === 'teoria'),
      exercicios: materiais.filter(m => m.tipo === 'exercicios'),
      resumo: materiais.filter(m => m.tipo === 'resumo'),
      flashcards: materiais.filter(m => m.tipo === 'flashcards'),
      resumo_personalizado: materiais.filter(m => m.tipo === 'resumo_personalizado'),
      upload: materiais.filter(m => m.tipo === 'upload'),
      anotacao: materiais.filter(m => m.tipo === 'anotacao')
    };
    
    const totalMateriais = materiais.length;
    const favoritos = materiais.filter(m => m.favorito).length;
    const totalIA = porTipo.teoria.length + porTipo.exercicios.length + porTipo.resumo.length + porTipo.flashcards.length + porTipo.resumo_personalizado.length;
    
    app.innerHTML = `
      <!-- HEADER AZUL PADRONIZADO -->
      <div class="min-h-screen ${themes[currentTheme].bg}">
        <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between h-14">
              <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
                <i class="fas fa-arrow-left mr-2"></i>
                <span class="text-[#7BC4FF]">IA</span>prova
              </button>
              <div class="flex items-center gap-2">
                <span class="text-white/80 text-sm hidden sm:inline">
                  <i class="fas fa-folder-open mr-1"></i>${totalMateriais} materiais
                </span>
                <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                  <i class="fas \${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                </button>
              </div>
            </div>
          </div>
        </header>
      
        <div class="max-w-7xl mx-auto py-6 px-4">
          <!-- Titulo da Pagina -->
          <div class="mb-6">
            <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
              <i class="fas fa-folder-open mr-3 text-[#4A90D9]"></i>
              Meus Materiais & Histórico
            </h1>
            <p class="${themes[currentTheme].textSecondary} text-sm">
              Visualize todos os conteúdos gerados pela IA e seus materiais salvos
            </p>
          </div>
          
          <!-- Estatísticas em Tons de Azul -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition cursor-pointer" onclick="filtrarMateriaisPorTipo('todos')">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm ${themes[currentTheme].textSecondary}">Total</p>
                  <p class="text-2xl font-bold text-[#122D6A]">${totalMateriais}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-[#122D6A]/10 flex items-center justify-center">
                  <i class="fas fa-folder text-[#122D6A] text-xl"></i>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition cursor-pointer" onclick="filtrarMateriaisPorTipo('teoria')">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm ${themes[currentTheme].textSecondary}">Teoria</p>
                  <p class="text-2xl font-bold text-[#1A3A7F]">${porTipo.teoria.length}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-[#1A3A7F]/10 flex items-center justify-center">
                  <i class="fas fa-book text-[#1A3A7F] text-xl"></i>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition cursor-pointer" onclick="filtrarMateriaisPorTipo('exercicios')">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm ${themes[currentTheme].textSecondary}">Exercícios</p>
                  <p class="text-2xl font-bold text-[#2A4A9F]">${porTipo.exercicios.length}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-[#2A4A9F]/10 flex items-center justify-center">
                  <i class="fas fa-tasks text-[#2A4A9F] text-xl"></i>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition cursor-pointer" onclick="filtrarMateriaisPorTipo('flashcards')">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm ${themes[currentTheme].textSecondary}">Flashcards</p>
                  <p class="text-2xl font-bold text-[#3A5AB0]">${porTipo.flashcards.length}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-[#3A5AB0]/10 flex items-center justify-center">
                  <i class="fas fa-clone text-[#3A5AB0] text-xl"></i>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition cursor-pointer" onclick="filtrarMateriaisPorTipo('favoritos')">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm ${themes[currentTheme].textSecondary}">Favoritos</p>
                  <p class="text-2xl font-bold text-[#4A6AC0]">${favoritos}</p>
                </div>
                <div class="w-12 h-12 rounded-full bg-[#4A6AC0]/10 flex items-center justify-center">
                  <i class="fas fa-star text-[#4A6AC0] text-xl"></i>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Abas de Navegação -->
          <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} mb-6 overflow-hidden">
            <div class="flex border-b ${themes[currentTheme].border}">
              <button onclick="mudarAbaMateriaisHistorico('todos')" id="tab-todos" 
                class="flex-1 px-4 py-3 font-medium text-sm transition ${activeTab === 'todos' ? 'bg-[#122D6A] text-white' : themes[currentTheme].text + ' hover:bg-[#E8EDF5]'}">
                <i class="fas fa-th-list mr-2"></i>Todos os Materiais
              </button>
              <button onclick="mudarAbaMateriaisHistorico('ia')" id="tab-ia"
                class="flex-1 px-4 py-3 font-medium text-sm transition ${activeTab === 'ia' ? 'bg-[#122D6A] text-white' : themes[currentTheme].text + ' hover:bg-[#E8EDF5]'}">
                <i class="fas fa-robot mr-2"></i>Gerados por IA (${totalIA})
              </button>
              <button onclick="mudarAbaMateriaisHistorico('uploads')" id="tab-uploads"
                class="flex-1 px-4 py-3 font-medium text-sm transition ${activeTab === 'uploads' ? 'bg-[#122D6A] text-white' : themes[currentTheme].text + ' hover:bg-[#E8EDF5]'}">
                <i class="fas fa-upload mr-2"></i>Uploads (${porTipo.upload.length})
              </button>
            </div>
            
            <!-- Filtros e Busca -->
            <div class="p-4">
              <div class="flex flex-wrap gap-3 items-center">
                <div class="flex-1 min-w-[200px]">
                  <input 
                    type="text" 
                    id="search-materiais"
                    placeholder="🔍 Buscar materiais..."
                    class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg ${themes[currentTheme].bg} ${themes[currentTheme].text}"
                    onkeyup="filtrarMateriais()"
                  />
                </div>
                
                <select id="filter-tipo" onchange="filtrarMateriais()" class="px-4 py-2 border ${themes[currentTheme].border} rounded-lg ${themes[currentTheme].bg} ${themes[currentTheme].text}">
                  <option value="">Todos os tipos</option>
                  <option value="teoria">📖 Teoria</option>
                  <option value="exercicios">📝 Exercícios</option>
                  <option value="resumo">📋 Resumo</option>
                  <option value="flashcards">🃏 Flashcards</option>
                  <option value="resumo_personalizado">📄 Resumo Personalizado</option>
                  <option value="upload">📤 Uploads</option>
                </select>
                
                <button onclick="filtrarMateriais('favoritos')" class="px-4 py-2 bg-[#4A6AC0] text-white rounded-lg hover:bg-[#3A5AB0] transition">
                  <i class="fas fa-star mr-2"></i>Favoritos
                </button>
                
                <button onclick="abrirModalUpload()" class="px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                  <i class="fas fa-plus mr-2"></i>Adicionar
                </button>
              </div>
            </div>
          </div>
          
          <!-- Lista de Materiais -->
          <div id="lista-materiais">
            ${renderListaMateriais(materiais)}
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Erro ao carregar materiais:', error);
    showToast('Erro ao carregar materiais', 'error');
  }
}

// Funções auxiliares para navegação de materiais
window.mudarAbaMateriaisHistorico = function(aba) {
  renderMateriais(aba);
};

window.filtrarMateriaisPorTipo = function(tipo) {
  const select = document.getElementById('filter-tipo');
  if (select && tipo !== 'todos' && tipo !== 'favoritos') {
    select.value = tipo;
  } else if (select) {
    select.value = '';
  }
  if (tipo === 'favoritos') {
    filtrarMateriais('favoritos');
  } else {
    filtrarMateriais();
  }
};

function renderListaMateriais(materiais) {
  if (materiais.length === 0) {
    return `
      <div class="${themes[currentTheme].card} p-12 rounded-xl border ${themes[currentTheme].border} text-center">
        <i class="fas fa-folder-open text-6xl text-[#C5D1E8] mb-4"></i>
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhum material encontrado</h3>
        <p class="${themes[currentTheme].textSecondary} mb-4">Comece gerando conteúdo com IA ou fazendo upload de arquivos</p>
        <button onclick="abrirModalUpload()" class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
          <i class="fas fa-plus mr-2"></i>Adicionar Primeiro Material
        </button>
      </div>
    `;
  }
  
  // Cores em tons de azul do sistema IAprova
  const tipoConfig = {
    teoria: { icon: 'fa-book', label: 'Teoria', bgClass: 'bg-[#122D6A]/10', textClass: 'text-[#122D6A]' },
    exercicios: { icon: 'fa-tasks', label: 'Exercícios', bgClass: 'bg-[#1A3A7F]/10', textClass: 'text-[#1A3A7F]' },
    resumo: { icon: 'fa-sticky-note', label: 'Resumo', bgClass: 'bg-[#2A4A9F]/10', textClass: 'text-[#2A4A9F]' },
    flashcards: { icon: 'fa-clone', label: 'Flashcards', bgClass: 'bg-[#3A5AB0]/10', textClass: 'text-[#3A5AB0]' },
    resumo_personalizado: { icon: 'fa-file-alt', label: 'Resumo PDF', bgClass: 'bg-[#4A6AC0]/10', textClass: 'text-[#4A6AC0]' },
    upload: { icon: 'fa-file-upload', label: 'Upload', bgClass: 'bg-[#5A7AD0]/10', textClass: 'text-[#5A7AD0]' },
    anotacao: { icon: 'fa-edit', label: 'Anotação', bgClass: 'bg-[#6B8AE0]/10', textClass: 'text-[#6B8AE0]' }
  };
  
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${materiais.map(material => {
        const config = tipoConfig[material.tipo] || tipoConfig.anotacao;
        const dataFormatada = new Date(material.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        
        return `
          <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} overflow-hidden hover:shadow-lg transition material-card" data-tipo="${material.tipo}" data-titulo="${(material.titulo || '').toLowerCase()}">
            <!-- Header do Card -->
            <div class="${config.bgClass} p-4 border-b ${themes[currentTheme].border}">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full ${config.bgClass} flex items-center justify-center">
                    <i class="fas ${config.icon} ${config.textClass}"></i>
                  </div>
                  <div>
                    <p class="text-xs ${config.textClass} font-medium uppercase">${config.label}</p>
                    <p class="text-xs ${themes[currentTheme].textSecondary}">${dataFormatada}</p>
                  </div>
                </div>
                <button onclick="toggleFavorito(${material.id})" class="text-xl ${material.favorito ? 'text-[#4A6AC0]' : 'text-gray-300'} hover:text-[#4A6AC0] transition">
                  <i class="fas fa-star"></i>
                </button>
              </div>
            </div>
            
            <!-- Conteúdo do Card -->
            <div class="p-4">
              <h3 class="font-bold ${themes[currentTheme].text} mb-2 line-clamp-2">${material.titulo}</h3>
              ${material.disciplina_nome ? `<p class="text-sm ${themes[currentTheme].textSecondary} mb-1"><i class="fas fa-book-open mr-1"></i>${material.disciplina_nome}</p>` : ''}
              ${material.topico_nome ? `<p class="text-sm ${themes[currentTheme].textSecondary} mb-2"><i class="fas fa-bookmark mr-1"></i>${material.topico_nome}</p>` : ''}
              
              ${material.conteudo ? `<p class="${themes[currentTheme].textSecondary} text-sm line-clamp-3 mb-3">${material.conteudo.substring(0, 150)}...</p>` : ''}
              ${material.arquivo_nome ? `
                <div class="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded">
                  <i class="fas fa-paperclip text-gray-400"></i>
                  <span class="text-sm ${themes[currentTheme].textSecondary} truncate">${material.arquivo_nome}</span>
                </div>
              ` : ''}
            </div>
            
            <!-- Footer do Card -->
            <div class="p-3 border-t ${themes[currentTheme].border} flex gap-2">
              <button onclick="visualizarMaterial(${material.id})" class="flex-1 px-3 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition text-sm">
                <i class="fas fa-eye mr-2"></i>Visualizar
              </button>
              <button onclick="deletarMaterial(${material.id})" class="px-3 py-2 border ${themes[currentTheme].border} rounded-lg hover:bg-red-50 hover:border-red-300 transition text-sm">
                <i class="fas fa-trash text-red-500"></i>
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDesempenho() {
  showToast('Módulo de Desempenho em desenvolvimento');
}

function renderRevisoes() {
  showToast('Módulo de Revisões em desenvolvimento');
}

function renderPlano() {
  showToast('Módulo de Plano Semanal em desenvolvimento');
}

// ===================================
// Dashboard de Desempenho Geral
// ===================================

// Armazena dados do progresso semanal para alternância
let progressoSemanalCache = null;

// Função para alternar entre visualização por Semana e Mês
window.toggleProgressoView = function(view) {
  if (!progressoSemanalCache) return;
  
  const container = document.getElementById('progresso-container');
  const btnSemana = document.getElementById('btn-view-semana');
  const btnMes = document.getElementById('btn-view-mes');
  
  if (!container || !btnSemana || !btnMes) return;
  
  // Atualizar botões - tons claros e azuis vibrantes
  if (view === 'semana') {
    btnSemana.className = 'px-3 py-1 text-xs font-medium rounded-md bg-[#4A90D9] text-white shadow-sm transition';
    btnMes.className = `px-3 py-1 text-xs font-medium rounded-md text-[#4A90D9] bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition`;
  } else {
    btnMes.className = 'px-3 py-1 text-xs font-medium rounded-md bg-[#4A90D9] text-white shadow-sm transition';
    btnSemana.className = `px-3 py-1 text-xs font-medium rounded-md text-[#4A90D9] bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition`;
  }
  
  // Renderizar conteúdo - cores claras e azuis vibrantes
  if (view === 'semana') {
    container.innerHTML = progressoSemanalCache.semanas.map(sem => `
      <div class="flex items-center gap-2 ${sem.isAtual ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 -mx-2 border border-blue-200 dark:border-blue-800' : ''} ${sem.isProva ? 'border-2 border-[#4A90D9] rounded-lg p-2 -mx-2 bg-blue-50/50 dark:bg-blue-900/10' : ''}">
        <span class="text-xs font-medium ${sem.isAtual ? 'text-[#4A90D9] dark:text-blue-400' : themes[currentTheme].textSecondary} w-12 flex-shrink-0">
          ${sem.label}${sem.isAtual ? ' ●' : ''}${sem.isProva ? ' 🏁' : ''}
        </span>
        <div class="flex-1 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
          ${sem.isFutura ? `
            <div class="h-full rounded-full bg-blue-200/50 dark:bg-blue-800/30 bg-stripes" style="width: 100%"></div>
          ` : `
            <div class="h-full rounded-full bg-gradient-to-r from-[#4A90D9] to-[#6BB6FF] transition-all duration-500 flex items-center justify-end pr-2"
                 style="width: ${Math.max(sem.percentual, 3)}%">
              ${sem.percentual > 15 ? `<span class="text-[9px] text-white font-medium">${sem.percentual}%</span>` : ''}
            </div>
          `}
        </div>
        <span class="text-xs font-semibold ${sem.isFutura ? 'text-gray-400' : 'text-[#4A90D9]'} w-10 text-right flex-shrink-0">
          ${sem.isFutura ? '-' : sem.percentual + '%'}
        </span>
      </div>
    `).join('');
  } else {
    container.innerHTML = progressoSemanalCache.meses.map(mes => `
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium ${themes[currentTheme].textSecondary} w-16 flex-shrink-0 capitalize">
          ${mes.label}
        </span>
        <div class="flex-1 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-[#4A90D9] to-[#6BB6FF] transition-all duration-500 flex items-center justify-end pr-2"
               style="width: ${Math.max(mes.percentual, 3)}%">
            ${mes.percentual > 15 ? `<span class="text-[9px] text-white font-medium">${mes.percentual}%</span>` : ''}
          </div>
        </div>
        <span class="text-xs font-semibold text-[#4A90D9] w-10 text-right flex-shrink-0">
          ${mes.percentual}%
        </span>
      </div>
    `).join('');
  }
};

window.renderDashboardDesempenho = async function() {
  const app = document.getElementById('app');
  
  try {
    // Primeiro buscar o plano ativo do usuário
    const planoRes = await axios.get(`/api/planos/user/${currentUser.id}`);
    const plano = planoRes.data;
    
    if (!plano || !plano.id) {
      app.innerHTML = `
        ${renderNavbar()}
        <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center p-4">
          <div class="text-center ${themes[currentTheme].card} p-8 rounded-2xl shadow-lg max-w-md">
            <i class="fas fa-chart-pie text-5xl text-[#122D6A] mb-4"></i>
            <h2 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhum plano ativo</h2>
            <p class="${themes[currentTheme].textSecondary} mb-4">Crie um plano de estudos para visualizar seu desempenho.</p>
            <button onclick="renderDashboard()" class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#2A4A9F] transition">
              <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    // Buscar dados necessários em paralelo
    const [simuladosRes, estatisticasRes, desempenhoRes, progressoRes, progressoSemanalRes] = await Promise.all([
      axios.get(`/api/simulados/historico/${currentUser.id}`),
      axios.get(`/api/estatisticas/${currentUser.id}`),
      axios.get(`/api/desempenho/user/${currentUser.id}`),
      axios.get(`/api/planos/${plano.id}/progresso-geral`),
      axios.get(`/api/estatisticas/${currentUser.id}/progresso-semanal`).catch(() => ({ data: { semanas: [], meses: [], mediaGeral: 0 } }))
    ]);
    
    const simulados = simuladosRes.data.simulados || [];
    const stats = estatisticasRes.data || {};
    const desempenho = desempenhoRes.data || [];
    const progressoGeral = progressoRes.data || {};
    const progressoSemanal = progressoSemanalRes.data || { semanas: [], meses: [], mediaGeral: 0 };
    
    // Armazenar no cache para alternância de visualização
    progressoSemanalCache = progressoSemanal;
    
    // Calcular métricas
    const mediaSimulados = simulados.length > 0 ? 
      Math.round(simulados.reduce((acc, s) => acc + s.percentual_acerto, 0) / simulados.length) : 0;
    const ultimosSimulados = simulados.slice(-5);
    const mediaUltimos = ultimosSimulados.length > 0 ? 
      Math.round(ultimosSimulados.reduce((acc, s) => acc + s.percentual_acerto, 0) / ultimosSimulados.length) : 0;
    
    // Evolução por disciplina (dados reais)
    const evolucaoDisciplinas = calcularEvolucaoDisciplinas(desempenho);
    
    // Meta do usuário
    const metaConfig = JSON.parse(localStorage.getItem('metaSimulados') || '{}');
    const metaPercentual = metaConfig.notaCorte || 70;
    
    app.innerHTML = `
      <!-- HEADER AZUL PADRONIZADO -->
      <div class="min-h-screen ${themes[currentTheme].bg}">
        <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between h-14">
              <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
                <i class="fas fa-arrow-left mr-2"></i>
                <span class="text-[#7BC4FF]">IA</span>prova
              </button>
              <div class="flex items-center gap-3">
                <div class="hidden md:flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full" title="Sequência de dias">
                    <i class="fas fa-fire text-[#7BC4FF] text-[10px]"></i>
                    <span class="text-xs font-semibold text-white">${stats.streak_atual || 0}</span>
                  </div>
                  <div class="w-px h-4 bg-white/30"></div>
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full" title="Horas totais">
                    <i class="fas fa-clock text-[#7BC4FF] text-[10px]"></i>
                    <span class="text-xs font-semibold text-white">${stats.horas_totais || 0}h</span>
                  </div>
                  <div class="w-px h-4 bg-white/30"></div>
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full" title="Progresso">
                    <i class="fas fa-chart-pie text-[#7BC4FF] text-[10px]"></i>
                    <span class="text-xs font-semibold text-white">${progressoGeral.progresso_percentual || 0}%</span>
                  </div>
                </div>
                <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                  <i class="fas \${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                </button>
              </div>
            </div>
          </div>
        </header>
      
        <div class="max-w-7xl mx-auto py-6 px-4">
          <!-- Titulo da Pagina -->
          <div class="mb-6">
            <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
              <i class="fas fa-chart-pie mr-3 text-[#4A90D9]"></i>
              Dashboard de Desempenho
            </h1>
            <p class="${themes[currentTheme].textSecondary} text-sm">
              Visão completa do seu progresso nos estudos
            </p>
          </div>
          
          <!-- KPIs Principais -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center">
                  <i class="fas fa-calendar-check text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Dias Estudados</p>
                  <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.dias_estudados || 0}</p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center">
                  <i class="fas fa-fire text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Sequência</p>
                  <p class="text-2xl font-bold text-[#4A90D9]">${stats.streak_atual || 0} dias</p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3A5AB0] to-[#4A90D9] flex items-center justify-center">
                  <i class="fas fa-clock text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Horas Totais</p>
                  <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.horas_totais || 0}h</p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#4A90D9] flex items-center justify-center">
                  <i class="fas fa-percentage text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Progresso Geral</p>
                  <p class="text-2xl font-bold text-[#4A90D9]">${progressoGeral.progresso_percentual || 0}%</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Grid de Seções -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            <!-- Seção A: Desempenho em Simulados -->
            <div class="${themes[currentTheme].card} rounded-2xl border ${themes[currentTheme].border} p-6 hover:shadow-lg transition">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold ${themes[currentTheme].text} flex items-center gap-2">
                  <i class="fas fa-edit text-[#122D6A]"></i>
                  Desempenho em Simulados
                </h2>
                <button onclick="window.renderDashboardSimulados()" class="text-xs text-[#2A4A9F] hover:underline">
                  Ver detalhes <i class="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
              
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="text-center p-3 rounded-xl bg-[#E8EDF5] dark:bg-[#0A1839]/50">
                  <p class="text-3xl font-bold text-[#122D6A] dark:text-blue-400">${mediaSimulados}%</p>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Média Geral</p>
                </div>
                <div class="text-center p-3 rounded-xl ${mediaUltimos >= metaPercentual ? 'bg-[#E8EDF5] dark:bg-[#0A1839]/50' : 'bg-[#E8EDF5] dark:bg-[#0A1839]/50'}">
                  <p class="text-3xl font-bold ${mediaUltimos >= metaPercentual ? 'text-[#2A4A9F] dark:text-blue-400' : 'text-[#3A5AB0] dark:text-blue-300'}">${mediaUltimos}%</p>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Últimos 5</p>
                </div>
              </div>
              
              <div class="flex items-center justify-between p-3 rounded-xl border ${themes[currentTheme].border}">
                <div>
                  <p class="text-sm font-medium ${themes[currentTheme].text}">Meta: ${metaPercentual}%</p>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">${mediaUltimos >= metaPercentual ? '✓ Dentro da meta' : '⚠ Abaixo da meta'}</p>
                </div>
                <div class="w-16 h-16 relative">
                  <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${currentTheme === 'light' ? '#e5e7eb' : '#374151'}" stroke-width="3"/>
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2A4A9F" stroke-width="3" stroke-dasharray="${Math.min((mediaUltimos/metaPercentual)*100, 100)}, 100"/>
                  </svg>
                  <span class="absolute inset-0 flex items-center justify-center text-xs font-bold ${themes[currentTheme].text}">${Math.round((mediaUltimos/metaPercentual)*100)}%</span>
                </div>
              </div>
              
              <p class="text-xs ${themes[currentTheme].textSecondary} mt-3 text-center">
                Total de ${simulados.length} simulados realizados
              </p>
            </div>
            
            <!-- Seção B: Cumprimento de Metas -->
            <div class="${themes[currentTheme].card} rounded-2xl border ${themes[currentTheme].border} p-6 hover:shadow-lg transition">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold ${themes[currentTheme].text} flex items-center gap-2">
                  <i class="fas fa-chart-line text-[#4A90D9]"></i>
                  Cumprimento de Metas
                </h2>
                <!-- Botões de alternância - tons claros e azuis -->
                <div class="flex gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1 border border-blue-100 dark:border-blue-800">
                  <button id="btn-view-semana" onclick="window.toggleProgressoView('semana')" 
                          class="px-3 py-1 text-xs font-medium rounded-md bg-[#4A90D9] text-white shadow-sm transition">
                    Semana
                  </button>
                  <button id="btn-view-mes" onclick="window.toggleProgressoView('mes')" 
                          class="px-3 py-1 text-xs font-medium rounded-md text-[#4A90D9] bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                    Mês
                  </button>
                </div>
              </div>
              
              ${progressoSemanal.temDataProva ? `
                <div class="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-flag-checkered text-[#4A90D9]"></i>
                    <span class="text-sm ${themes[currentTheme].text}">Prova em <strong>${new Date(progressoSemanal.dataProva).toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                  <span class="text-xs px-2 py-1 bg-[#4A90D9] text-white rounded-full shadow-sm">${progressoSemanal.semanasRestantes} semanas restantes</span>
                </div>
              ` : `
                <div class="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <i class="fas fa-infinity text-gray-400"></i>
                  <span class="text-sm ${themes[currentTheme].textSecondary}">Sem data definida - acompanhamento contínuo</span>
                </div>
              `}
              
              <!-- Container para o gráfico - cores claras e azuis vibrantes -->
              <div id="progresso-container" class="space-y-2 max-h-64 overflow-y-auto pr-2">
                ${progressoSemanal.semanas.map(sem => `
                  <div class="flex items-center gap-2 ${sem.isAtual ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 -mx-2 border border-blue-200 dark:border-blue-800' : ''} ${sem.isProva ? 'border-2 border-[#4A90D9] rounded-lg p-2 -mx-2 bg-blue-50/50 dark:bg-blue-900/10' : ''}">
                    <span class="text-xs font-medium ${sem.isAtual ? 'text-[#4A90D9] dark:text-blue-400' : themes[currentTheme].textSecondary} w-12 flex-shrink-0">
                      ${sem.label}${sem.isAtual ? ' ●' : ''}${sem.isProva ? ' 🏁' : ''}
                    </span>
                    <div class="flex-1 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                      ${sem.isFutura ? `
                        <div class="h-full rounded-full bg-blue-200/50 dark:bg-blue-800/30 bg-stripes" style="width: 100%"></div>
                      ` : `
                        <div class="h-full rounded-full bg-gradient-to-r from-[#4A90D9] to-[#6BB6FF] transition-all duration-500 flex items-center justify-end pr-2"
                             style="width: ${Math.max(sem.percentual, 3)}%">
                          ${sem.percentual > 15 ? `<span class="text-[9px] text-white font-medium">${sem.percentual}%</span>` : ''}
                        </div>
                      `}
                    </div>
                    <span class="text-xs font-semibold ${sem.isFutura ? 'text-gray-400' : 'text-[#4A90D9]'} w-10 text-right flex-shrink-0">
                      ${sem.isFutura ? '-' : sem.percentual + '%'}
                    </span>
                  </div>
                `).join('')}
              </div>
              
              <div class="mt-4 pt-4 border-t ${themes[currentTheme].border}">
                <div class="flex justify-between items-center">
                  <span class="text-sm ${themes[currentTheme].textSecondary}">Média geral:</span>
                  <span class="text-lg font-bold text-[#4A90D9]">${progressoSemanal.mediaGeral || 0}%</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                  <span class="text-xs ${themes[currentTheme].textSecondary}">Semana atual: ${progressoSemanal.semanaAtual || 1} de ${progressoSemanal.totalSemanas || 1}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Seção C: Evolução por Disciplina -->
          <div class="${themes[currentTheme].card} rounded-2xl border ${themes[currentTheme].border} p-6 hover:shadow-lg transition">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold ${themes[currentTheme].text} flex items-center gap-2">
                <i class="fas fa-book-open text-[#4A6AC0]"></i>
                Evolução por Disciplina
              </h2>
              <button onclick="renderPortfolioDisciplinas()" class="text-xs text-[#2A4A9F] hover:underline">
                Ver todas <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${evolucaoDisciplinas.slice(0, 6).map(disc => `
                <div class="p-4 rounded-xl border ${themes[currentTheme].border} hover:border-[#3A5AB0] transition">
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="font-medium ${themes[currentTheme].text} text-sm truncate" title="${disc.nome}">${disc.nome}</h3>
                    <span class="text-xs px-2 py-0.5 rounded-full ${disc.tendencia >= 0 ? 'bg-[#E8EDF5] text-[#122D6A]' : 'bg-gray-100 text-gray-600'} font-medium">
                      ${disc.tendencia >= 0 ? '↑' : '↓'} ${Math.abs(disc.tendencia)}%
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full bg-gradient-to-r from-[#122D6A] to-[#3A5AB0]" style="width: ${disc.percentual}%"></div>
                    </div>
                    <span class="text-sm font-bold text-[#2A4A9F]">${disc.percentual}%</span>
                  </div>
                  <p class="text-[10px] ${themes[currentTheme].textSecondary}">${disc.topicosEstudados}/${disc.totalTopicos} tópicos concluídos</p>
                </div>
              `).join('')}
            </div>
            
            ${evolucaoDisciplinas.length === 0 ? `
              <div class="text-center py-8">
                <i class="fas fa-chart-line text-4xl text-gray-300 mb-3"></i>
                <p class="${themes[currentTheme].textSecondary}">Comece a estudar para ver sua evolução aqui</p>
              </div>
            ` : ''}
          </div>
          
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Erro ao carregar dashboard de desempenho:', error);
    app.innerHTML = `
      ${renderNavbar()}
      <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
        <div class="text-center">
          <i class="fas fa-exclamation-triangle text-4xl text-gray-400 mb-4"></i>
          <p class="${themes[currentTheme].text}">Erro ao carregar dados</p>
          <button onclick="renderDashboard()" class="mt-4 px-4 py-2 bg-[#122D6A] text-white rounded-lg">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

// Funções auxiliares para o Dashboard de Desempenho
// ✅ CORRIGIDO: Função retorna dados do objeto passado (que vem da API)
function calcularEstudosPorSemana(dadosSemanas) {
  // Se receber dados da API, usar diretamente
  if (dadosSemanas && dadosSemanas.semanas && Array.isArray(dadosSemanas.semanas)) {
    return dadosSemanas.semanas;
  }
  
  // Fallback para quando não há dados
  return [
    { label: '4 semanas atrás', percentual: 0, diasEstudados: 0 },
    { label: '3 semanas atrás', percentual: 0, diasEstudados: 0 },
    { label: 'Semana passada', percentual: 0, diasEstudados: 0 },
    { label: 'Esta semana', percentual: 0, diasEstudados: 0 }
  ];
}

// ✅ CORRIGIDO: Usar dados reais, sem Math.random()
function calcularEvolucaoDisciplinas(desempenho) {
  if (!desempenho || desempenho.length === 0) return [];
  
  return desempenho.map(d => {
    const topicosEstudados = d.topicos_estudados || d.concluidos || 0;
    const totalTopicos = d.total_topicos || d.total || 1;
    const percentual = d.percentual_conclusao || d.progresso || Math.round((topicosEstudados / totalTopicos) * 100);
    
    return {
      nome: d.disciplina_nome || d.nome || 'Disciplina',
      percentual: percentual,
      topicosEstudados: topicosEstudados,
      totalTopicos: totalTopicos,
      tendencia: 0 // Sem tendência simulada - será calculada quando houver histórico
    };
  }).sort((a, b) => b.percentual - a.percentual);
}

// Dashboard de Acompanhamento de Simulados
window.renderDashboardSimulados = async function() {
  const app = document.getElementById('app');
  
  try {
    // Buscar histórico de simulados do usuário
    const response = await axios.get(`/api/simulados/historico/${currentUser.id}`);
    const simulados = response.data.simulados || [];
    
    // Agrupar por semana
    const simuladosPorSemana = {};
    simulados.forEach(sim => {
      const data = new Date(sim.data_realizacao);
      const semana = `Sem ${Math.ceil(data.getDate() / 7)}/${data.getMonth() + 1}`;
      
      if (!simuladosPorSemana[semana]) {
        simuladosPorSemana[semana] = [];
      }
      simuladosPorSemana[semana].push(sim);
    });
    
    // Calcular média por semana
    const semanas = Object.keys(simuladosPorSemana).sort();
    const percentuais = semanas.map(semana => {
      const sims = simuladosPorSemana[semana];
      const media = sims.reduce((acc, s) => acc + s.percentual_acerto, 0) / sims.length;
      return Math.round(media);
    });
    
    // ✅ NOVO: Meta do usuário (nota de corte) - buscar do localStorage
    const metaConfig = JSON.parse(localStorage.getItem('metaSimulados') || '{}');
    const metaPercentual = metaConfig.notaCorte || 70; // Padrão 70%
    const vagasTotal = metaConfig.vagasTotal || 100;
    const vagasDesejadas = metaConfig.vagasDesejadas || 10;
    
    // ✅ NOVO: Calcular se está dentro das vagas
    const mediaGeral = simulados.length > 0 ? 
      Math.round(simulados.reduce((acc, s) => acc + s.percentual_acerto, 0) / simulados.length) : 0;
    const ultimosSimulados = simulados.slice(-5); // Últimos 5 simulados
    const mediaUltimos = ultimosSimulados.length > 0 ? 
      Math.round(ultimosSimulados.reduce((acc, s) => acc + s.percentual_acerto, 0) / ultimosSimulados.length) : 0;
    
    // Calcular posição estimada (simplificado)
    const dentroMeta = mediaUltimos >= metaPercentual;
    const tendencia = ultimosSimulados.length >= 2 ? 
      ultimosSimulados[ultimosSimulados.length - 1].percentual_acerto - ultimosSimulados[0].percentual_acerto : 0;
    
    app.innerHTML = `
      <!-- HEADER AZUL PADRONIZADO -->
      <div class="min-h-screen ${themes[currentTheme].bg}">
        <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
          <div class="max-w-7xl mx-auto px-4">
            <div class="flex items-center justify-between h-14">
              <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
                <i class="fas fa-arrow-left mr-2"></i>
                <span class="text-[#7BC4FF]">IA</span>prova
              </button>
              <div class="flex items-center gap-3">
                <div class="hidden md:flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full" title="Total de simulados">
                    <i class="fas fa-edit text-[#7BC4FF] text-[10px]"></i>
                    <span class="text-xs font-semibold text-white">${simulados.length}</span>
                  </div>
                  <div class="w-px h-4 bg-white/30"></div>
                  <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full" title="Média geral">
                    <i class="fas fa-chart-line text-[#7BC4FF] text-[10px]"></i>
                    <span class="text-xs font-semibold text-white">${mediaGeral}%</span>
                  </div>
                </div>
                <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                  class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                  <i class="fas \${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
                </button>
              </div>
            </div>
          </div>
        </header>
      
        <div class="max-w-7xl mx-auto py-6 px-4">
          <!-- Titulo da Pagina -->
          <div class="mb-6">
            <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
              <i class="fas fa-chart-line mr-3 text-[#4A90D9]"></i>
              Dashboard de Simulados
            </h1>
            <p class="${themes[currentTheme].textSecondary} text-sm">
              Acompanhe sua evolução e performance nos simulados
            </p>
          </div>
          
          <!-- Estatísticas Rápidas com novo design -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center">
                  <i class="fas fa-clipboard-list text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Total Realizados</p>
                  <p class="text-2xl font-bold ${themes[currentTheme].text}">${simulados.length}</p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3A5AB0] to-[#4A90D9] flex items-center justify-center">
                  <i class="fas fa-chart-bar text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Média Geral</p>
                  <p class="text-2xl font-bold ${themes[currentTheme].text}">
                    ${simulados.length > 0 ? Math.round(simulados.reduce((acc, s) => acc + s.percentual_acerto, 0) / simulados.length) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center">
                  <i class="fas fa-trophy text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Melhor Resultado</p>
                  <p class="text-2xl font-bold text-[#4A90D9]">
                    ${simulados.length > 0 ? Math.max(...simulados.map(s => s.percentual_acerto)) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#4A90D9] flex items-center justify-center">
                  <i class="fas fa-bullseye text-white text-xl"></i>
                </div>
                <div>
                  <p class="text-xs ${themes[currentTheme].textSecondary}">Nota de Corte</p>
                  <p class="text-2xl font-bold text-[#4A90D9]">${metaPercentual}%</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- ✅ NOVO: Indicador de Status das Vagas -->
          <div class="${themes[currentTheme].card} p-6 rounded-xl border-2 ${dentroMeta ? 'border-green-500 bg-green-50/50' : 'border-red-500 bg-red-50/50'} mb-6">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-full ${dentroMeta ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center">
                  <i class="fas ${dentroMeta ? 'fa-check' : 'fa-exclamation'} text-white text-2xl"></i>
                </div>
                <div>
                  <h3 class="text-xl font-bold ${dentroMeta ? 'text-green-700' : 'text-red-700'}">
                    ${dentroMeta ? '✅ DENTRO DA META!' : '⚠️ ABAIXO DA META'}
                  </h3>
                  <p class="${themes[currentTheme].textSecondary}">
                    ${simulados.length === 0 ? 'Faça simulados para acompanhar seu progresso' :
                      dentroMeta ? 
                        `Sua média (${mediaUltimos}%) está acima da nota de corte (${metaPercentual}%)` :
                        `Você precisa de mais ${metaPercentual - mediaUltimos}% para atingir a nota de corte`
                    }
                  </p>
                  ${tendencia !== 0 ? `
                    <p class="text-sm mt-1 ${tendencia > 0 ? 'text-green-600' : 'text-red-600'}">
                      <i class="fas fa-arrow-${tendencia > 0 ? 'up' : 'down'} mr-1"></i>
                      Tendência: ${tendencia > 0 ? '+' : ''}${tendencia}% nos últimos simulados
                    </p>
                  ` : ''}
                </div>
              </div>
              <button onclick="configurarMetaSimulado()" class="px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                <i class="fas fa-cog mr-2"></i>Configurar Meta
              </button>
            </div>
          </div>
          
          <!-- Gráfico de Evolução -->
          <div class="${themes[currentTheme].card} p-6 rounded-xl border ${themes[currentTheme].border} mb-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-xl font-bold ${themes[currentTheme].text}">Evolução por Semana</h2>
                <p class="text-sm ${themes[currentTheme].textSecondary}">Performance ao longo do tempo com linha de meta</p>
              </div>
              <button onclick="configurarMetaSimulado()" class="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm">
                <i class="fas fa-cog mr-2"></i>Configurar Meta
              </button>
            </div>
            <div class="relative" style="height: 400px;">
              <canvas id="chart-simulados"></canvas>
            </div>
          </div>
          
          <!-- Histórico Detalhado -->
          <div class="${themes[currentTheme].card} p-6 rounded-xl border ${themes[currentTheme].border}">
            <h2 class="text-xl font-bold ${themes[currentTheme].text} mb-4">Histórico de Simulados</h2>
            
            ${simulados.length === 0 ? `
              <div class="text-center py-12">
                <i class="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-bold ${themes[currentTheme].text} mb-2">Nenhum simulado realizado ainda</h3>
                <p class="${themes[currentTheme].textSecondary} mb-4">Faça seu primeiro simulado para acompanhar sua evolução</p>
                <button onclick="abrirModalSimulado()" class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                  <i class="fas fa-plus mr-2"></i>Fazer Simulado
                </button>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b ${themes[currentTheme].border}">
                      <th class="text-left py-3 px-4 ${themes[currentTheme].text}">Data</th>
                      <th class="text-left py-3 px-4 ${themes[currentTheme].text}">Disciplinas</th>
                      <th class="text-center py-3 px-4 ${themes[currentTheme].text}">Questões</th>
                      <th class="text-center py-3 px-4 ${themes[currentTheme].text}">Acertos</th>
                      <th class="text-center py-3 px-4 ${themes[currentTheme].text}">%</th>
                      <th class="text-center py-3 px-4 ${themes[currentTheme].text}">Tempo</th>
                      <th class="text-center py-3 px-4 ${themes[currentTheme].text}">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${simulados.map(sim => {
                      const data = new Date(sim.data_realizacao).toLocaleDateString('pt-BR');
                      const percentualClass = sim.percentual_acerto >= 70 ? 'text-[#2A4A9F]' : sim.percentual_acerto >= 50 ? 'text-amber-600' : 'text-red-600';
                      
                      return `
                        <tr class="border-b ${themes[currentTheme].border} hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td class="py-3 px-4 ${themes[currentTheme].text}">${data}</td>
                          <td class="py-3 px-4 ${themes[currentTheme].textSecondary} text-sm">${sim.disciplinas || 'Múltiplas'}</td>
                          <td class="text-center py-3 px-4 ${themes[currentTheme].text}">${sim.total_questoes}</td>
                          <td class="text-center py-3 px-4 font-semibold ${themes[currentTheme].text}">${sim.acertos}</td>
                          <td class="text-center py-3 px-4 font-bold ${percentualClass}">${sim.percentual_acerto}%</td>
                          <td class="text-center py-3 px-4 ${themes[currentTheme].textSecondary}">${sim.tempo_gasto || '-'}</td>
                          <td class="text-center py-3 px-4">
                            <button onclick="verDetalhesSimulado(${sim.id})" class="text-[#122D6A] hover:text-blue-800">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="mt-4 text-center">
                <button onclick="abrirModalSimulado()" class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                  <i class="fas fa-plus mr-2"></i>Novo Simulado
                </button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    
    // Renderizar gráfico se houver dados
    if (simulados.length > 0) {
      setTimeout(() => {
        renderGraficoSimulados(semanas, percentuais, metaPercentual);
      }, 100);
    }
    
  } catch (error) {
    console.error('Erro ao carregar dashboard de simulados:', error);
    app.innerHTML = `
      ${renderNavbar()}
      <div class="${themes[currentTheme].bg} min-h-screen p-6">
        <div class="max-w-4xl mx-auto text-center">
          <i class="fas fa-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h2 class="text-2xl font-bold ${themes[currentTheme].text} mb-2">Erro ao carregar dados</h2>
          <p class="${themes[currentTheme].textSecondary} mb-4">Não foi possível carregar o histórico de simulados</p>
          <button onclick="renderDashboard()" class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D]">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    `;
  }
}

// Renderizar gráfico de simulados com Chart.js
window.renderGraficoSimulados = function(semanas, percentuais, metaPercentual) {
  const ctx = document.getElementById('chart-simulados');
  if (!ctx) return;
  
  // Linha de meta (tracejada)
  const linhaMeta = semanas.map(() => metaPercentual);
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: semanas,
      datasets: [
        {
          label: 'Percentual de Acertos',
          data: percentuais,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#8B5CF6',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Meta',
          data: linhaMeta,
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [10, 5], // Linha tracejada
          tension: 0,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              family: 'Inter'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            family: 'Inter'
          },
          bodyFont: {
            size: 13,
            family: 'Inter'
          },
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y + '%';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            font: {
              size: 11,
              family: 'Inter'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          ticks: {
            font: {
              size: 11,
              family: 'Inter'
            }
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Configurar meta do simulado (nota de corte)
window.configurarMetaSimulado = async function() {
  const metaConfig = JSON.parse(localStorage.getItem('metaSimulados') || '{}');
  
  // Criar modal de configuração
  const modal = document.createElement('div');
  modal.id = 'modal-config-meta';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6">
        <h2 class="text-xl font-bold flex items-center gap-2">
          <i class="fas fa-bullseye"></i>
          Configurar Meta de Aprovação
        </h2>
        <p class="text-[#A8D4FF] text-sm mt-1">Defina sua nota de corte esperada</p>
      </div>
      
      <div class="p-6 space-y-6">
        <!-- Nota de Corte -->
        <div>
          <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-percentage mr-2 text-[#3A5AB0]"></i>
            Nota de Corte Esperada (%)
          </label>
          <input type="number" id="input-nota-corte" min="0" max="100" value="${metaConfig.notaCorte || 70}"
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#3A5AB0] focus:ring-2 focus:ring-[#3A5AB0]/20 ${themes[currentTheme].input}">
          <p class="text-xs ${themes[currentTheme].textSecondary} mt-1">
            <i class="fas fa-info-circle mr-1"></i>
            Percentual mínimo para ser aprovado no concurso
          </p>
        </div>
        
        <!-- Informações sobre as bancas -->
        <div class="bg-[#E8EDF5] rounded-lg p-4">
          <h4 class="font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-lightbulb mr-2 text-[#3A5AB0]"></i>
            Dica: Notas de corte comuns
          </h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="flex justify-between">
              <span>CESPE (Certo/Errado):</span>
              <span class="font-medium">60-70%</span>
            </div>
            <div class="flex justify-between">
              <span>FCC:</span>
              <span class="font-medium">65-75%</span>
            </div>
            <div class="flex justify-between">
              <span>FGV:</span>
              <span class="font-medium">60-70%</span>
            </div>
            <div class="flex justify-between">
              <span>Concursos disputados:</span>
              <span class="font-medium">80%+</span>
            </div>
          </div>
        </div>
        
        <!-- Botões -->
        <div class="flex gap-3">
          <button onclick="document.getElementById('modal-config-meta').remove()" 
            class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium">
            Cancelar
          </button>
          <button onclick="salvarMetaSimulado()" 
            class="flex-1 px-4 py-3 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-xl hover:from-[#0D1F4D] hover:to-[#122D6A] transition font-medium">
            <i class="fas fa-save mr-2"></i>Salvar
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Salvar meta do simulado
window.salvarMetaSimulado = function() {
  const notaCorte = parseInt(document.getElementById('input-nota-corte').value) || 70;
  
  const metaConfig = {
    notaCorte: Math.min(100, Math.max(0, notaCorte)),
    updatedAt: new Date().toISOString()
  };
  
  localStorage.setItem('metaSimulados', JSON.stringify(metaConfig));
  document.getElementById('modal-config-meta').remove();
  
  showToast(`Nota de corte configurada para ${metaConfig.notaCorte}%`, 'success');
  renderDashboardSimulados(); // Recarregar
}

// Ver detalhes de um simulado específico
window.verDetalhesSimulado = async function(simuladoId) {
  showToast('Visualização detalhada em desenvolvimento', 'info');
}

function logout() {
  // Limpar TODOS os dados da sessão
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  
  // Limpar objeto global
  currentUser = null;
  
  // Voltar para tela de login
  renderLogin();
}

window.changeTheme = (theme) => {
  applyTheme(theme);
  renderDashboard(); // Recarregar dashboard com novo tema
};

window.openCustomThemeModal = (themeToEdit) => {
  // Usar o tema passado como parâmetro ou o atual
  const editTheme = themeToEdit || currentTheme;
  const isRgbTheme = editTheme === 'rgb';
  const currentColors = isRgbTheme ? rgbColors : customColors;
  const themeTitle = isRgbTheme ? 'Tema RGB' : 'Tema Personalizado';
  
  const modal = document.createElement('div');
  modal.id = 'customThemeModal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold ${themes[currentTheme].text} dark:text-white">
          <i class="fas fa-paint-brush mr-2"></i>
          ${themeTitle}
        </h2>
        <button onclick="closeCustomThemeModal()" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <i class="fas fa-times text-2xl"></i>
        </button>
      </div>
      
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
        ${isRgbTheme ? 'Personalize as cores do tema RGB' : 'Escolha 3 cores para criar seu tema personalizado em gradiente'}
      </p>
      
      <input type="hidden" id="editingTheme" value="${editTheme}">
      
      <div class="space-y-4 mb-6">
        <!-- Cor Primária -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i class="fas fa-circle mr-2" style="color: ${currentColors.primary}"></i>
            Cor Primária
          </label>
          <div class="flex gap-3">
            <input type="color" id="colorPrimary" value="${currentColors.primary}" 
              class="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer">
            <input type="text" id="colorPrimaryHex" value="${currentColors.primary}" 
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A3A7F] dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="#8b5cf6">
          </div>
        </div>
        
        <!-- Cor Secundária -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i class="fas fa-circle mr-2" style="color: ${currentColors.secondary}"></i>
            Cor Secundária
          </label>
          <div class="flex gap-3">
            <input type="color" id="colorSecondary" value="${currentColors.secondary}" 
              class="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer">
            <input type="text" id="colorSecondaryHex" value="${currentColors.secondary}" 
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A3A7F] dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="#ec4899">
          </div>
        </div>
        
        <!-- Cor de Destaque -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <i class="fas fa-circle mr-2" style="color: ${currentColors.accent}"></i>
            Cor de Destaque
          </label>
          <div class="flex gap-3">
            <input type="color" id="colorAccent" value="${currentColors.accent}" 
              class="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer">
            <input type="text" id="colorAccentHex" value="${currentColors.accent}" 
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A3A7F] dark:bg-gray-700 dark:text-white dark:border-gray-600"
              placeholder="#3b82f6">
          </div>
        </div>
      </div>
      
      <!-- Preview -->
      <div class="mb-6">
        <button type="button" onclick="updatePreviewManually()" 
          class="w-full mb-2 px-4 py-2 bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] hover:from-[#0D1F4D] hover:to-[#0A1839] text-white rounded-lg font-semibold transition">
          <i class="fas fa-eye mr-2"></i>
          Atualizar Preview
        </button>
        <div class="p-6 rounded-lg" id="themePreview" 
          style="background: linear-gradient(135deg, ${currentColors.primary}, ${currentColors.secondary}, ${currentColors.accent})">
          <p class="text-white font-semibold text-center text-lg">Preview do Tema</p>
          <p class="text-white/80 text-sm text-center mt-2">Suas cores personalizadas</p>
        </div>
      </div>
      
      <!-- Presets Rápidos -->
      <div class="mb-6">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Presets Rápidos:</p>
        <div class="grid grid-cols-4 gap-2">
          <button onclick="applyPreset('#8b5cf6', '#ec4899', '#3b82f6')" 
            class="h-10 rounded border-2 border-gray-300 hover:border-white transition"
            style="background: linear-gradient(135deg, #8b5cf6, #ec4899, #3b82f6)"
            title="Roxo + Rosa + Azul"></button>
          <button onclick="applyPreset('#f59e0b', '#ef4444', '#dc2626')" 
            class="h-10 rounded border-2 border-gray-300 hover:border-white transition"
            style="background: linear-gradient(135deg, #f59e0b, #ef4444, #dc2626)"
            title="Laranja + Vermelho"></button>
          <button onclick="applyPreset('#10b981', '#3b82f6', '#8b5cf6')" 
            class="h-10 rounded border-2 border-gray-300 hover:border-white transition"
            style="background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)"
            title="Verde + Azul + Roxo"></button>
          <button onclick="applyPreset('#f472b6', '#a855f7', '#6366f1')" 
            class="h-10 rounded border-2 border-gray-300 hover:border-white transition"
            style="background: linear-gradient(135deg, #f472b6, #a855f7, #6366f1)"
            title="Rosa + Roxo + Indigo"></button>
        </div>
      </div>
      
      <div class="flex gap-3">
        <button onclick="closeCustomThemeModal()" 
          class="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition">
          Cancelar
        </button>
        <button onclick="saveCustomTheme()" 
          class="flex-1 px-4 py-2 bg-[#122D6A] hover:bg-[#0D1F4D] text-white rounded-lg font-semibold transition">
          <i class="fas fa-check mr-2"></i>
          Aplicar
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Sincronizar inputs
  ['Primary', 'Secondary', 'Accent'].forEach(type => {
    const colorPicker = document.getElementById(`color${type}`);
    const hexInput = document.getElementById(`color${type}Hex`);
    
    colorPicker.addEventListener('input', (e) => {
      hexInput.value = e.target.value;
      updatePreview();
    });
    
    hexInput.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        colorPicker.value = e.target.value;
        updatePreview();
      }
    });
  });
  
  function updatePreview() {
    const primary = document.getElementById('colorPrimary').value;
    const secondary = document.getElementById('colorSecondary').value;
    const accent = document.getElementById('colorAccent').value;
    const preview = document.getElementById('themePreview');
    preview.style.background = `linear-gradient(135deg, ${primary}, ${secondary}, ${accent})`;
  }
  
  // Expor função globalmente para botão
  window.updatePreviewManually = updatePreview;
};

window.closeCustomThemeModal = () => {
  const modal = document.getElementById('customThemeModal');
  if (modal) modal.remove();
};

window.applyPreset = (primary, secondary, accent) => {
  document.getElementById('colorPrimary').value = primary;
  document.getElementById('colorPrimaryHex').value = primary;
  document.getElementById('colorSecondary').value = secondary;
  document.getElementById('colorSecondaryHex').value = secondary;
  document.getElementById('colorAccent').value = accent;
  document.getElementById('colorAccentHex').value = accent;
  
  const preview = document.getElementById('themePreview');
  preview.style.background = `linear-gradient(135deg, ${primary}, ${secondary}, ${accent})`;
};

window.saveCustomTheme = () => {
  const editingTheme = document.getElementById('editingTheme').value;
  const colors = {
    primary: document.getElementById('colorPrimary').value,
    secondary: document.getElementById('colorSecondary').value,
    accent: document.getElementById('colorAccent').value
  };
  
  // Salvar nas variáveis corretas baseado no tema sendo editado
  if (editingTheme === 'rgb') {
    rgbColors = colors;
    localStorage.setItem('rgbColors', JSON.stringify(rgbColors));
    closeCustomThemeModal();
    // Aplicar tema e re-renderizar dashboard
    applyTheme('rgb');
    renderDashboard();
  } else {
    customColors = colors;
    localStorage.setItem('customColors', JSON.stringify(customColors));
    closeCustomThemeModal();
    // Aplicar tema e re-renderizar dashboard
    applyTheme('custom');
    renderDashboard();
  }
};

// ============== GERAÇÃO AUTOMÁTICA DE METAS ==============
async function gerarMetasDia() {
  try {
    const response = await axios.post(`/api/metas/gerar/${currentUser.id}`);
    if (response.data.success) {
      showToast(` ${response.data.metas_criadas} metas geradas para hoje!`);
      renderDashboard();
    } else {
      showToast(response.data.message || 'Metas já existem para hoje');
    }
  } catch (error) {
    console.error('Erro ao gerar metas:', error);
    showModal('Erro ao gerar metas do dia');
  }
}

// ============== CALENDÁRIO DE ESTUDOS ==============
async function renderCalendario() {
  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  try {
    const [calendarioRes, estatisticasRes] = await Promise.all([
      axios.get(`/api/calendario/${currentUser.id}?mes=${mes}&ano=${ano}`),
      axios.get(`/api/estatisticas/${currentUser.id}`)
    ]);

    const historico = calendarioRes.data;
    const stats = estatisticasRes.data;

    renderCalendarioUI(historico, stats, mes, ano);
  } catch (error) {
    console.error('Erro ao carregar calendário:', error);
    showModal('Erro ao carregar calendário');
  }
}

function renderCalendarioUI(historico, stats, mes, ano) {
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const diasNoMes = ultimoDia.getDate();
  const diaSemanaInicio = primeiroDia.getDay();

  // Criar mapa de histórico por dia
  const historicoMap = {};
  historico.forEach(h => {
    const dia = new Date(h.data + 'T00:00:00').getDate();
    historicoMap[dia] = h;
  });

  // Gerar grade de dias
  let diasHTML = '';
  
  // Dias em branco antes do início do mês
  for (let i = 0; i < diaSemanaInicio; i++) {
    diasHTML += '<div class="p-2"></div>';
  }

  // Dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const hist = historicoMap[dia];
    let corClasse = 'bg-gray-100 ${themes[currentTheme].border}';
    let icone = '';
    let titulo = 'Não estudou';

    if (hist) {
      if (hist.status === 'completo') {
        corClasse = 'bg-[#2A4A9F]/10 border-green-400';
        icone = '<i class="fas fa-check text-[#2A4A9F]"></i>';
        titulo = `${hist.percentual_conclusao}% - ${Math.round(hist.tempo_estudado_minutos / 60 * 10) / 10}h`;
      } else if (hist.status === 'parcial') {
        corClasse = 'bg-[#4A90E2]/10 border-yellow-400';
        icone = '<i class="fas fa-clock text-[#1A3A7F]"></i>';
        titulo = `${hist.percentual_conclusao}% - ${Math.round(hist.tempo_estudado_minutos / 60 * 10) / 10}h`;
      } else {
        corClasse = 'bg-red-100 border-red-300';
        icone = '<i class="fas fa-times text-[#2A4A9F]"></i>';
        titulo = 'Não estudou';
      }
    }

    diasHTML += `
      <div class="p-3 border-2 rounded-lg ${corClasse} text-center cursor-pointer hover:shadow-md transition"
           title="${titulo}">
        <div class="text-sm font-semibold mb-1">${dia}</div>
        ${icone}
      </div>
    `;
  }

  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg}">
      <!-- HEADER AZUL PADRONIZADO -->
      <header class="sticky top-0 z-50 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex items-center justify-between h-14">
            <button onclick="renderDashboard()" class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition">
              <i class="fas fa-arrow-left mr-2"></i>
              <span class="text-[#7BC4FF]">IA</span>prova
            </button>
            <div class="flex items-center gap-2">
              <span class="text-white/80 text-sm hidden sm:inline">
                <i class="fas fa-calendar-alt mr-1"></i>${mesesNomes[mes - 1]} ${ano}
              </span>
              <button onclick="changeTheme(currentTheme === 'light' ? 'dark' : 'light')" 
                class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition">
                <i class="fas \${currentTheme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-6">
        <!-- Titulo -->
        <div class="mb-6">
          <h1 class="text-2xl md:text-3xl font-bold ${themes[currentTheme].text} mb-1">
            <i class="fas fa-calendar-alt mr-3 text-[#4A90D9]"></i>
            Calendário de Estudos
          </h1>
          <p class="${themes[currentTheme].textSecondary} text-sm">
            Acompanhe sua consistência e evolução diária
          </p>
        </div>
        
        <!-- Estatísticas com novo design azul -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A90D9] to-[#6BB6FF] flex items-center justify-center">
                <i class="fas fa-fire text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Streak Atual</p>
                <p class="text-2xl font-bold text-[#4A90D9]">${stats.streak_atual}</p>
              </div>
            </div>
          </div>

          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center">
                <i class="fas fa-calendar-check text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Dias Estudados</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.dias_estudados}</p>
              </div>
            </div>
          </div>

          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3A5AB0] to-[#4A90D9] flex items-center justify-center">
                <i class="fas fa-clock text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Horas Totais</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.horas_totais}h</p>
              </div>
            </div>
          </div>

          <div class="${themes[currentTheme].card} p-4 rounded-xl border ${themes[currentTheme].border} hover:shadow-lg transition">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6BB6FF] to-[#4A90D9] flex items-center justify-center">
                <i class="fas fa-chart-line text-white text-xl"></i>
              </div>
              <div>
                <p class="text-xs ${themes[currentTheme].textSecondary}">Média de Conclusão</p>
                <p class="text-2xl font-bold ${themes[currentTheme].text}">${stats.media_conclusao}%</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Calendário -->
        <div class="${themes[currentTheme].card} rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-bold mb-6 text-center">${mesesNomes[mes - 1]} ${ano}</h2>

          <!-- Legenda -->
          <div class="flex justify-center space-x-6 mb-6 text-sm">
            <div class="flex items-center">
              <div class="w-4 h-4 bg-[#2A4A9F]/10 border-2 border-green-400 rounded mr-2"></div>
              <span>Completo</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 bg-[#4A90E2]/10 border-2 border-yellow-400 rounded mr-2"></div>
              <span>Parcial</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></div>
              <span>Não estudou</span>
            </div>
            <div class="flex items-center">
              <div class="w-4 h-4 bg-gray-100 border-2 ${themes[currentTheme].border} rounded mr-2"></div>
              <span>Sem dados</span>
            </div>
          </div>

          <!-- Grade do calendário -->
          <div class="grid grid-cols-7 gap-2 mb-4">
            <div class="text-center font-semibold text-gray-600 p-2">Dom</div>
            <div class="text-center font-semibold text-gray-600 p-2">Seg</div>
            <div class="text-center font-semibold text-gray-600 p-2">Ter</div>
            <div class="text-center font-semibold text-gray-600 p-2">Qua</div>
            <div class="text-center font-semibold text-gray-600 p-2">Qui</div>
            <div class="text-center font-semibold text-gray-600 p-2">Sex</div>
            <div class="text-center font-semibold text-gray-600 p-2">Sáb</div>
          </div>

          <div class="grid grid-cols-7 gap-2">
            ${diasHTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============== CONTEÚDO DE ESTUDO GERADO POR IA ==============

// Função para abrir conteúdo de uma meta (chamada do calendário semanal e metas do dia)
// Abre a disciplina com o tópico pré-selecionado
async function abrirConteudo(metaId) {
  console.log('🎯 Abrindo conteúdo para meta ID:', metaId);
  
  // Buscar dados da meta
  let meta = null;
  
  // 1. Buscar de metas semanais (cache local)
  if (semanaAtual?.metas) {
    meta = semanaAtual.metas.find(m => m.id === metaId);
  }
  
  // 2. Se não encontrar, buscar da API
  if (!meta) {
    try {
      const semanaRes = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`);
      meta = semanaRes.data?.metas?.find(m => m.id === metaId);
    } catch (e) {
      console.warn('Erro ao buscar semana ativa:', e);
    }
  }
  
  // 3. Fallback para metas diárias
  if (!meta) {
    try {
      const metasHoje = await axios.get(`/api/metas/hoje/${currentUser.id}`);
      meta = metasHoje.data.find(m => m.id === metaId);
    } catch (e) {
      console.warn('Erro ao buscar metas diárias:', e);
    }
  }
  
  if (!meta) {
    showModal('Meta não encontrada');
    return;
  }
  
  console.log('📚 Meta encontrada:', meta.disciplina_nome, meta.topicos_sugeridos?.[0]?.nome);
  
  // Guardar meta atual para uso posterior
  window.metaAtual = meta;
  
  // Abrir disciplina com tópico pré-selecionado
  await abrirDisciplinaComTopico(meta.disciplina_id, meta.disciplina_nome, meta.topicos_sugeridos?.[0]);
}
window.abrirConteudo = abrirConteudo;

// Função para abrir disciplina com tópico pré-selecionado
// Mostra modal com 4 opções de conteúdo para o usuário escolher
async function abrirDisciplinaComTopico(disciplinaId, disciplinaNome, topico = null) {
  const topicoNome = topico?.nome || 'Conteúdo geral';
  
  // Mostrar modal com as 4 opções de conteúdo
  const modal = document.createElement('div');
  modal.id = 'modal-escolher-conteudo';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] p-4 text-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <i class="fas fa-magic"></i>
          </div>
          <div>
            <h3 class="font-bold">Gerar Conteúdo com IA</h3>
            <p class="text-sm text-white/80 truncate">${topicoNome}</p>
            <p class="text-xs text-white/60">${disciplinaNome}</p>
          </div>
        </div>
      </div>
      
      <!-- Opções -->
      <div class="p-5">
        <p class="text-gray-600 text-sm mb-4">Escolha o tipo de conteúdo que deseja gerar:</p>
        
        <div class="grid grid-cols-2 gap-3">
          <button onclick="gerarConteudoTipo('teoria')" 
            class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#122D6A] hover:bg-[#E8EDF5] transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#122D6A]/10 rounded-lg flex items-center justify-center group-hover:bg-[#122D6A] transition-colors">
                <i class="fas fa-book text-[#122D6A] group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Teoria</p>
                <p class="text-xs text-gray-500">Conteúdo completo</p>
              </div>
            </div>
          </button>
          
          <button onclick="gerarConteudoTipo('exercicios')" 
            class="p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                <i class="fas fa-tasks text-emerald-600 group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Exercícios</p>
                <p class="text-xs text-gray-500">Questões de concurso</p>
              </div>
            </div>
          </button>
          
          <button onclick="gerarConteudoTipo('resumo')" 
            class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A6AC0] hover:bg-[#E8EDF5] transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#C5D1E8] rounded-lg flex items-center justify-center group-hover:bg-[#3A5AB0] transition-colors">
                <i class="fas fa-file-alt text-[#2A4A9F] group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Resumo</p>
                <p class="text-xs text-gray-500">Esquematizado</p>
              </div>
            </div>
          </button>
          
          <button onclick="gerarConteudoTipo('flashcards')" 
            class="p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A6AC0] hover:bg-[#6BB6FF]/5 transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#6BB6FF]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6BB6FF]/50 transition-colors">
                <i class="fas fa-clone text-[#3A5AB0] group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Flashcards</p>
                <p class="text-xs text-gray-500">Cards de revisão</p>
              </div>
            </div>
          </button>
          
          <!-- 5ª Opção: Resumo Personalizado -->
          <button onclick="gerarConteudoTipo('resumo_personalizado')" 
            class="col-span-2 p-4 border-2 border-gray-200 rounded-xl hover:border-[#4A6AC0] hover:bg-[#E8EDF5] transition-all text-left group">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-[#C5D1E8] rounded-lg flex items-center justify-center group-hover:bg-[#E8EDF5]0 transition-colors">
                <i class="fas fa-file-upload text-[#3A5AB0] group-hover:text-white transition-colors"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">Resumo Personalizado</p>
                <p class="text-xs text-gray-500">Upload de PDF para gerar resumo com IA</p>
              </div>
            </div>
          </button>
        </div>
        
        <!-- Botão Cancelar -->
        <button onclick="fecharModalEscolherConteudo()" 
          class="w-full mt-4 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition flex items-center justify-center gap-2">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Guardar dados para uso posterior
  window.conteudoPendente = {
    disciplinaId,
    disciplinaNome,
    topico
  };
}
window.abrirDisciplinaComTopico = abrirDisciplinaComTopico;

// Fechar modal de escolha de conteúdo
window.fecharModalEscolherConteudo = function() {
  const modal = document.getElementById('modal-escolher-conteudo');
  if (modal) modal.remove();
  window.conteudoPendente = null;
}

// Gerar conteúdo do tipo escolhido
window.gerarConteudoTipo = async function(tipo) {
  // IMPORTANTE: Capturar dados ANTES de fechar o modal (que limpa conteudoPendente)
  const meta = window.metaAtual;
  const pendente = window.conteudoPendente;
  
  // Fechar modal apenas visualmente (não limpa os dados ainda)
  const modal = document.getElementById('modal-escolher-conteudo');
  if (modal) modal.remove();
  
  if (!meta && !pendente) {
    showModal('Erro: dados da meta não encontrados');
    return;
  }
  
  // Preparar dados para geração
  const topicoNome = meta?.topicos_sugeridos?.[0]?.nome || pendente?.topico?.nome || 'Conteúdo geral';
  const topicoId = meta?.topicos_sugeridos?.[0]?.id || pendente?.topico?.id || 0;
  const disciplinaNome = meta?.disciplina_nome || pendente?.disciplinaNome;
  const disciplinaId = meta?.disciplina_id || pendente?.disciplinaId;
  const metaId = meta?.id || null;
  
  console.log(`🎯 Gerando ${tipo} para: ${disciplinaNome} - ${topicoNome} (meta: ${metaId})`);
  
  // ✅ CORREÇÃO: Se for resumo personalizado, abrir modal de upload ao invés de gerar diretamente
  if (tipo === 'resumo_personalizado') {
    console.log('📄 Abrindo modal de upload de resumo personalizado...');
    // Configurar meta para o modal de upload
    window.metaAtual = {
      topico_id: topicoId,
      topico_nome: topicoNome,
      disciplina_nome: disciplinaNome,
      id: metaId
    };
    window.conteudoPendente = null;
    abrirModalResumoPersonalizado(metaId || 0);
    return;
  }
  
  // Limpar dados pendentes agora (modal já foi fechado)
  window.conteudoPendente = null;
  
  // Chamar função de geração com meta_id
  await window.executarGeracaoConteudo(topicoId, topicoNome, disciplinaNome, tipo, null, metaId);
  
  // Após gerar, atualizar ícones da meta (aguarda um pouco para garantir que salvou no banco)
  if (metaId) {
    setTimeout(async () => {
      await atualizarIconesConteudoMeta(metaId);
    }, 500);
  }
}

// Cache de conteúdos gerados por meta
window.conteudosMetaCache = {};

// Buscar e atualizar ícones de conteúdo de uma meta
// Ícones ficam OCULTOS por padrão, só aparecem quando conteúdo existe
async function atualizarIconesConteudoMeta(metaId) {
  try {
    const response = await axios.get(`/api/conteudos/meta/${metaId}`, {
      headers: { 'X-User-ID': currentUser?.id || localStorage.getItem('userId') }
    });
    const data = response.data;
    
    window.conteudosMetaCache[metaId] = data;
    
    const tipos = ['teoria', 'exercicios', 'resumo', 'flashcards', 'resumo_personalizado'];
    tipos.forEach(tipo => {
      const btn = document.getElementById(`icon-${tipo}-${metaId}`);
      if (btn) {
        const temConteudo = data[`tem_${tipo}`];
        if (temConteudo) {
          // Conteúdo existe - ícone opaco
          btn.classList.remove('opacity-40', 'bg-[#E8EDF5]/30', 'hover:opacity-100');
          btn.classList.add('opacity-100', 'bg-[#E8EDF5]');
          // Forçar opacidade com style inline para garantir
          btn.style.opacity = '1';
          btn.setAttribute('data-conteudo-id', data.tipos_gerados[tipo]);
          console.log(`✅ Ícone ${tipo} ativo para meta ${metaId}`);
        } else {
          // Sem conteúdo - ícone transparente
          btn.classList.add('opacity-40', 'bg-[#E8EDF5]/30', 'hover:opacity-100');
          btn.classList.remove('opacity-100', 'bg-[#E8EDF5]');
          // Remover style inline para permitir classes funcionarem
          btn.style.opacity = '';
        }
      }
    });
  } catch (error) {
    console.warn('Erro ao buscar conteúdos da meta:', error);
  }
}
window.atualizarIconesConteudoMeta = atualizarIconesConteudoMeta;

// Mostrar ícone específico após gerar conteúdo
function mostrarIconeConteudo(metaId, tipo, conteudoId) {
  const btn = document.getElementById(`icon-${tipo}-${metaId}`);
  if (btn) {
    // Tornar ícone opaco quando conteúdo é gerado
    btn.classList.remove('opacity-40', 'bg-[#E8EDF5]/30', 'hover:opacity-100');
    btn.classList.add('opacity-100', 'bg-[#E8EDF5]', 'hover:opacity-100');
    // Forçar opacidade com style inline para garantir
    btn.style.opacity = '1';
    btn.setAttribute('data-conteudo-id', conteudoId);
    btn.setAttribute('data-source', 'materiais_salvos');
    console.log(`✅ Ícone ${tipo} ativado para meta ${metaId}, conteudo_id=${conteudoId}`);
    
    // Atualizar cache
    if (!window.conteudosMetaCache[metaId]) {
      window.conteudosMetaCache[metaId] = { tipos_gerados: {}, tipos_sources: {} };
    }
    window.conteudosMetaCache[metaId].tipos_gerados[tipo] = conteudoId;
    window.conteudosMetaCache[metaId].tipos_sources[tipo] = { id: conteudoId, source: 'materiais_salvos' };
    window.conteudosMetaCache[metaId][`tem_${tipo}`] = true;
  }
}
window.mostrarIconeConteudo = mostrarIconeConteudo;

// Atualizar todos os ícones de conteúdo visíveis
async function atualizarTodosIconesConteudo() {
  const containers = document.querySelectorAll('[id^="conteudos-meta-"]');
  for (const container of containers) {
    const metaId = container.id.replace('conteudos-meta-', '');
    if (metaId && !isNaN(parseInt(metaId))) {
      await atualizarIconesConteudoMeta(parseInt(metaId));
    }
  }
}
window.atualizarTodosIconesConteudo = atualizarTodosIconesConteudo;

// Abrir modal de resumo personalizado (upload de PDF/documento)
window.abrirModalResumoPersonalizado = function(metaId) {
  console.log('🔵 ABRINDO MODAL DE RESUMO PERSONALIZADO - metaId:', metaId);
  
  // Remover qualquer modal existente para evitar conflitos
  document.querySelectorAll('.fixed.inset-0').forEach(m => {
    if (m.id !== 'loading-overlay') m.remove();
  });
  
  const meta = window.metaAtual || { topico_nome: 'Tópico', disciplina_nome: 'Disciplina' };
  console.log('📄 Meta atual:', meta);
  
  const modal = document.createElement('div');
  modal.id = 'modal-resumo-personalizado-upload';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold flex items-center gap-3">
              <i class="fas fa-file-upload text-3xl"></i>
              Resumo Personalizado
            </h2>
            <p class="text-[#A8D4FF] mt-2">Upload de documento para gerar resumo com IA</p>
          </div>
          <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <!-- Informações do contexto -->
        <div class="bg-[#E8EDF5] rounded-lg p-4 mb-6">
          <div class="flex items-center gap-3">
            <i class="fas fa-info-circle text-[#3A5AB0]"></i>
            <div>
              <p class="text-sm text-gray-700">
                <strong>Disciplina:</strong> ${meta.disciplina_nome}
              </p>
              <p class="text-sm text-gray-700">
                <strong>Tópico:</strong> ${meta.topico_nome}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Área de upload -->
        <div class="border-2 border-dashed border-[#C5D1E8] rounded-lg p-8 text-center mb-6 hover:border-[#3A5AB0] transition-all" id="dropzone">
          <input type="file" id="file-upload" accept=".pdf,.txt,.doc,.docx" class="hidden">
          
          <i class="fas fa-cloud-upload-alt text-6xl text-[#3A5AB0] opacity-50 mb-4"></i>
          
          <h3 class="text-xl font-semibold text-gray-700 mb-2">
            Arraste um arquivo ou clique para selecionar
          </h3>
          
          <p class="text-gray-500 mb-4">
            Formatos aceitos: PDF, TXT, DOC, DOCX (máx. 10MB)
          </p>
          
          <button onclick="document.getElementById('file-upload').click()" 
            class="bg-[#3A5AB0] text-white px-6 py-3 rounded-lg hover:bg-[#2A4A9F] transition font-medium">
            <i class="fas fa-folder-open mr-2"></i>
            Selecionar Arquivo
          </button>
          
          <div id="file-selected" class="hidden mt-6">
            <div class="bg-green-50 rounded-lg p-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
                <div>
                  <p class="font-medium text-gray-700" id="file-name"></p>
                  <p class="text-sm text-gray-500" id="file-size"></p>
                </div>
              </div>
              <button onclick="removerArquivo()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Configurações opcionais -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-cog text-gray-500"></i>
            Configurações do Resumo (Opcional)
          </h4>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-600 mb-1 block">Tamanho do Resumo</label>
              <select id="tamanho-resumo" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#122D6A]">
                <option value="curto">Curto (1-2 páginas)</option>
                <option value="medio" selected>Médio (2-3 páginas)</option>
                <option value="longo">Longo (3-5 páginas)</option>
              </select>
            </div>
            
            <div>
              <label class="text-sm text-gray-600 mb-1 block">Foco do Resumo</label>
              <select id="foco-resumo" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#122D6A]">
                <option value="geral" selected>Geral</option>
                <option value="conceitos">Conceitos Principais</option>
                <option value="pratico">Aplicação Prática</option>
                <option value="memorização">Memorização</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Botão de envio -->
        <button onclick="processarResumoPersonalizado(${metaId})" 
          id="btn-processar"
          disabled
          class="w-full bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-[#0D1F4D] hover:to-[#122D6A] transition flex items-center justify-center gap-3">
          <i class="fas fa-magic"></i>
          Gerar Resumo do Documento
        </button>
        
        <!-- Status de processamento -->
        <div id="processing-status" class="hidden mt-6">
          <div class="bg-[#E8EDF5] rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full border-[#3A5AB0] border-t-transparent"></div>
              <div>
                <p class="font-medium text-[#2A4A9F]">Processando documento...</p>
                <p class="text-sm text-[#4A6AC0] mt-1" id="status-message">Extraindo texto do arquivo...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Setup file upload handlers
  const fileInput = document.getElementById('file-upload');
  const dropzone = document.getElementById('dropzone');
  
  fileInput.addEventListener('change', handleFileSelect);
  
  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-[#122D6A]', 'bg-blue-50');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-[#122D6A]', 'bg-blue-50');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-[#122D6A]', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect({ target: { files } });
    }
  });
}

// Manipular seleção de arquivo
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validar tipo de arquivo
  const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|doc|docx)$/i)) {
    showToast('Tipo de arquivo não suportado. Use PDF, TXT, DOC ou DOCX.', 'error');
    return;
  }
  
  // Validar tamanho (10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('Arquivo muito grande. Máximo 10MB.', 'error');
    return;
  }
  
  // Exibir arquivo selecionado
  document.getElementById('file-selected').classList.remove('hidden');
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent = `${(file.size / 1024).toFixed(2)} KB`;
  document.getElementById('btn-processar').disabled = false;
  
  // Armazenar arquivo globalmente
  window.selectedFile = file;
}

// Remover arquivo selecionado
function removerArquivo() {
  window.selectedFile = null;
  document.getElementById('file-upload').value = '';
  document.getElementById('file-selected').classList.add('hidden');
  document.getElementById('btn-processar').disabled = true;
}

// Processar resumo personalizado
async function processarResumoPersonalizado(metaId) {
  if (!window.selectedFile) {
    showToast('Selecione um arquivo primeiro', 'error');
    return;
  }
  
  const meta = window.metaAtual || {};
  const tamanhoResumo = document.getElementById('tamanho-resumo').value;
  const focoResumo = document.getElementById('foco-resumo').value;
  
  // Mapear tamanho para extensão da IA
  const extensaoMap = { curto: 'curto', medio: 'medio', longo: 'longo' };
  
  // Mapear foco para profundidade da IA
  const profundidadeMap = { 
    geral: 'aplicada', 
    conceitos: 'conceitual', 
    pratico: 'aplicada', 
    memorização: 'conceitual' 
  };
  
  // Carregar configuração de IA do localStorage e ajustar com as opções do modal
  const savedConfig = JSON.parse(localStorage.getItem('iaConfig') || '{}');
  const configIA = {
    ...savedConfig,
    extensao: extensaoMap[tamanhoResumo] || 'medio',
    profundidade: profundidadeMap[focoResumo] || 'aplicada',
    formatoResumo: focoResumo === 'memorização' ? 'topicos' : (savedConfig.formatoResumo || 'detalhado')
  };
  
  // Preparar FormData
  const formData = new FormData();
  formData.append('file', window.selectedFile);
  formData.append('topico_id', meta.topico_id || '');
  formData.append('topico_nome', meta.topico_nome || 'Tópico');
  formData.append('disciplina_nome', meta.disciplina_nome || 'Disciplina');
  formData.append('meta_id', metaId);
  formData.append('user_id', currentUser.id);
  formData.append('tamanho_resumo', tamanhoResumo);
  formData.append('foco_resumo', focoResumo);
  formData.append('config_ia', JSON.stringify(configIA));
  
  // Mostrar status de processamento
  document.getElementById('btn-processar').disabled = true;
  document.getElementById('processing-status').classList.remove('hidden');
  
  try {
    // Atualizar status
    document.getElementById('status-message').textContent = 'Enviando arquivo...';
    
    const response = await axios.post('/api/topicos/resumo-personalizado', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-User-ID': currentUser.id
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        document.getElementById('status-message').textContent = `Enviando arquivo... ${percentCompleted}%`;
      }
    });
    
    // Atualizar status
    document.getElementById('status-message').textContent = 'Gerando resumo com IA...';
    
    if (response.data.success) {
      showToast('Resumo personalizado gerado com sucesso!', 'success');
      
      // Atualizar ícone de conteúdo
      if (response.data.material_id) {
        mostrarIconeConteudo(metaId, 'resumo_personalizado', response.data.material_id);
      }
      
      // Exibir o resumo gerado
      if (response.data.conteudo) {
        exibirConteudoGerado({
          conteudo: response.data.conteudo,
          topico_nome: meta.topico_nome,
          disciplina_nome: meta.disciplina_nome,
          tipo: 'resumo_personalizado',
          material_id: response.data.material_id
        });
      }
      
      // Fechar modal
      document.querySelector('.fixed').remove();
    } else {
      throw new Error(response.data.error || 'Erro ao gerar resumo');
    }
  } catch (error) {
    console.error('Erro ao processar resumo:', error);
    showToast(error.response?.data?.error || 'Erro ao processar documento. Tente novamente.', 'error');
    
    // Resetar botão
    document.getElementById('btn-processar').disabled = false;
    document.getElementById('processing-status').classList.add('hidden');
  }
}

// Ver conteúdo gerado - APENAS abre o conteúdo (ícone só aparece se existe)
window.verConteudoGerado = async function(metaId, tipo) {
  console.log(`👁️ Verificando ${tipo} da meta ${metaId}`);
  
  // Buscar dados do conteúdo da API
  try {
    const response = await axios.get(`/api/conteudos/meta/${metaId}`);
    const data = response.data;
    window.conteudosMetaCache[metaId] = data;
    
    const tipoInfo = data.tipos_sources?.[tipo];
    const conteudoId = data.tipos_gerados?.[tipo];
    
    if (!conteudoId) {
      // Se não tem conteúdo, gerar automaticamente
      console.log(`🆕 Conteúdo ${tipo} não existe, gerando automaticamente...`);
      
      // Buscar informações da meta
      const meta = window.metaAtual || { topico_nome: 'Tópico', disciplina_nome: 'Disciplina' };
      
      // Determinar quantidade padrão baseada no tipo
      let quantidade = null;
      if (tipo === 'exercicios') quantidade = 10;
      if (tipo === 'flashcards') quantidade = 15;
      
      // Gerar conteúdo
      await window.executarGeracaoConteudo(
        meta.topico_id || null, 
        meta.topico_nome, 
        meta.disciplina_nome, 
        tipo, 
        quantidade, 
        metaId
      );
      return;
    }
    
    const source = tipoInfo?.source || 'materiais_salvos';
    console.log(`📚 Conteúdo encontrado: ID=${conteudoId}, source=${source}`);
    
    // Estratégia: tentar materiais_salvos primeiro (mais confiável)
    // Se source for conteudo_estudo, buscar o material_id dentro do conteudo
    let material = null;
    
    if (source === 'materiais_salvos') {
      // Buscar diretamente de materiais_salvos
      try {
        const materialRes = await axios.get(`/api/materiais/ver/${conteudoId}`);
        material = materialRes.data;
      } catch (e) {
        console.warn('Material não encontrado em materiais_salvos, tentando conteudo_estudo');
      }
    }
    
    // Se não encontrou em materiais_salvos, buscar de conteudo_estudo
    if (!material && source === 'conteudo_estudo') {
      try {
        const conteudoRes = await axios.get(`/api/conteudos/${conteudoId}`);
        const conteudoData = conteudoRes.data;
        
        // Se tiver material_id dentro do conteudo, buscar de materiais_salvos
        if (conteudoData?.conteudo?.material_id) {
          const materialRes = await axios.get(`/api/materiais/ver/${conteudoData.conteudo.material_id}`);
          material = materialRes.data;
        } else if (conteudoData?.conteudo?.texto) {
          // Usar o texto diretamente
          material = {
            conteudo: conteudoData.conteudo.texto,
            topico_nome: conteudoData.topicos?.[0]?.nome || 'Conteúdo',
            disciplina_nome: conteudoData.disciplina_nome,
            tipo: conteudoData.tipo
          };
        }
      } catch (e) {
        console.error('Erro ao buscar conteudo_estudo:', e);
      }
    }
    
    if (!material) {
      showToast('Não foi possível carregar o conteúdo', 'error');
      return;
    }
    
    // Exibir baseado no tipo
    if (tipo === 'exercicios') {
      exibirExerciciosInterativos({
        conteudo: material.conteudo,
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome,
        disciplina_id: material.disciplina_id,
        topico_id: material.topico_id
      });
    } else if (tipo === 'flashcards') {
      exibirFlashcardsVisuais({
        conteudo: material.conteudo,
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome
      });
    } else {
      // Teoria ou Resumo - exibição padrão
      exibirConteudoGerado({
        conteudo: material.conteudo,
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome,
        tipo: material.tipo || tipo,
        material_id: material.id
      });
    }
  } catch (error) {
    console.error('Erro ao abrir conteúdo:', error);
    showToast('Erro ao carregar conteúdo', 'error');
  }
}

async function gerarConteudoMetaPorId(metaId) {
  try {
    // Buscar dados da meta - primeiro de metas diárias, depois de metas semanais
    let meta = null;
    
    // 1. Tentar buscar de metas diárias
    const metasHoje = await axios.get(`/api/metas/hoje/${currentUser.id}`);
    meta = metasHoje.data.find(m => m.id === metaId);
    
    // 2. Se não encontrar, buscar de metas semanais
    if (!meta && semanaAtual?.metas) {
      meta = semanaAtual.metas.find(m => m.id === metaId);
    }
    
    // 3. Se ainda não encontrar, buscar da API
    if (!meta) {
      try {
        const semanaRes = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`);
        meta = semanaRes.data?.metas?.find(m => m.id === metaId);
      } catch (e) {
        console.warn('Erro ao buscar semana ativa:', e);
      }
    }
    
    if (!meta) {
      showModal('Meta não encontrada', { type: 'error' });
      return;
    }
    
    await gerarConteudoMeta(meta);
  } catch (error) {
    console.error('Erro ao buscar meta:', error);
    showModal('Erro ao buscar informações da meta');
  }
}

async function gerarConteudoMeta(meta, forceRegenerate = false) {
  try {
    console.log('🎯 Iniciando geração de conteúdo para meta:', meta);
    
    // Verificar se já existe conteúdo gerado
    const conteudoExistente = await axios.get(`/api/conteudos/${meta.id}`).catch(() => null);
    
    if (conteudoExistente?.data && !forceRegenerate) {
      console.log('✅ Conteúdo já existe, exibindo...');
      visualizarConteudo(conteudoExistente.data, meta);
      return;
    }

    console.log('📝 Conteúdo não existe, gerando novo...');

    // Mostrar loading
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-conteudo';
    loadingDiv.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="${themes[currentTheme].card} p-8 rounded-lg text-center shadow-2xl max-w-md">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-lg font-semibold text-gray-800">Gerando conteúdo...</p>
          <p class="text-sm text-gray-600 mt-2">A IA está criando seu material de estudo personalizado</p>
          <p class="text-xs text-gray-500 mt-3">📚 ${meta.disciplina_nome}</p>
          <p class="text-xs text-gray-500">⏱️ ${meta.tempo_minutos} minutos | ${meta.tipo}</p>
        </div>
      </div>
    `;
    document.body.appendChild(loadingDiv);
    
    // Gerar conteúdo
    console.log('📡 Enviando requisição para API /api/conteudo/gerar...');
    const response = await axios.post('/api/conteudo/gerar', {
      meta_id: meta.id,
      user_id: currentUser.id,
      disciplina_id: meta.disciplina_id,
      tipo: meta.tipo,
      tempo_minutos: meta.tempo_minutos
    });

    console.log('✅ Resposta da API recebida:', response.data);
    console.log('📚 Tópicos gerados:', response.data.topicos);
    console.log('📝 Número de seções:', response.data.conteudo?.secoes?.length || 0);
    
    // Contar questões
    const totalQuestoes = (response.data.conteudo?.secoes || [])
      .reduce((sum, s) => sum + (s.conteudo?.questoes?.length || 0), 0);
    console.log('❓ Total de questões geradas:', totalQuestoes);

    const loadingEl = document.getElementById('loading-conteudo');
    if (loadingEl) document.body.removeChild(loadingEl);
    
    console.log('💻 Chamando visualizarConteudo...');
    
    // TENTAR com try/catch dentro do visualizarConteudo
    try {
      visualizarConteudo(response.data, meta);
      console.log('✅ visualizarConteudo executado sem erros aparentes');
    } catch (vizError) {
      console.error('❌ ERRO DENTRO DE visualizarConteudo:', vizError);
      console.error('Stack trace:', vizError.stack);
      showModal(' Erro ao exibir conteúdo:\n\n' + vizError.message + '\n\nVeja o console para detalhes.');
      renderDashboard();
    }
  } catch (error) {
    console.error('❌ Erro ao gerar conteúdo:', error);
    console.error('Detalhes do erro:', error.response?.data);
    const loadingEl = document.getElementById('loading-conteudo');
    if (loadingEl) document.body.removeChild(loadingEl);
    showModal(' Erro ao gerar conteúdo de estudo:\n\n' + (error.response?.data?.error || error.message) + '\n\nAbra o console (F12) para mais detalhes.');
  }
}

// Função para desmarcar conclusão de meta
async function desmarcarConclusao(metaId) {
  const confirmed = await showConfirm('Deseja realmente desmarcar esta meta como concluída?', {
    title: 'Desmarcar Meta',
    confirmText: 'Sim, desmarcar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  if (!confirmed) return;
  
  try {
    await axios.put(`/api/metas/${metaId}`, {
      concluida: false,
      tempo_estudado: 0
    });
    
    showToast(' Meta desmarcada com sucesso!');
    renderDashboard();
  } catch (error) {
    console.error('Erro ao desmarcar meta:', error);
    showModal(' Erro ao desmarcar meta');
  }
}

// Função para regerar conteúdo
async function regenerarConteudo(metaId) {
  const confirmed = await showConfirm('Deseja realmente regerar o material de estudo?\n\nO conteúdo atual será substituído.', {
    title: 'Regerar Conteúdo',
    confirmText: 'Sim, regerar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  if (!confirmed) return;
  
  try {
    const metasHoje = await axios.get(`/api/metas/hoje/${currentUser.id}`);
    const meta = metasHoje.data.find(m => m.id === metaId);
    
    if (!meta) {
      showModal('Meta não encontrada', { type: 'error' });
      return;
    }
    
    await gerarConteudoMeta(meta, true); // força regeneração
  } catch (error) {
    console.error('Erro ao regerar conteúdo:', error);
    showModal(' Erro ao regerar conteúdo');
  }
}

// Verificar se conteúdo já foi gerado e atualizar botão
async function verificarConteudoGerado(metaId) {
  try {
    const response = await axios.get(`/api/conteudos/${metaId}`).catch(() => null);
    
    if (response?.data) {
      // Conteúdo existe - mostrar ícone de "gerado" + botão regerar
      const btn = document.getElementById(`btn-gerar-${metaId}`);
      if (btn) {
        btn.outerHTML = `
          <div class="flex items-center gap-2">
            <button onclick="gerarConteudoMetaPorId(${metaId})" 
              class="bg-[#0D1F4D] text-white px-3 py-2 rounded-lg hover:bg-[#0A1839] transition text-sm flex items-center gap-2">
              <i class="fas fa-check-circle"></i>
              <span>Ver Material</span>
            </button>
            <button onclick="regenerarConteudo(${metaId})" 
              class="bg-[#3A5AB0] text-white px-3 py-2 rounded-lg hover:bg-[#2A4A9F] transition text-sm" title="Regerar material">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        `;
      }
    }
  } catch (error) {
    // Conteúdo não existe, mantém botão original
    console.log('Conteúdo não gerado para meta', metaId);
  }
}

// Gerar Simulado para uma meta específica
async function gerarSimuladoMeta(metaId, disciplinaNome) {
  const btn = document.getElementById(`btn-simulado-${metaId}`);
  if (!btn) return;
  
  // Desabilitar botão e mostrar loading
  const btnOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Gerando Simulado...';
  
  try {
    // Buscar meta com tópicos
    const metasHoje = await axios.get(`/api/metas/hoje/${currentUser.id}`);
    const meta = metasHoje.data.find(m => m.id === metaId);
    
    if (!meta) {
      showModal('Meta não encontrada', { type: 'error' });
      return;
    }
    
    // Gerar simulado (tipo = exercicios)
    const response = await axios.post('/api/conteudo/gerar', {
      user_id: currentUser.id,
      meta_id: metaId,
      disciplina_id: meta.disciplina_id,
      tipo: 'exercicios', // SEMPRE exercícios para simulado
      tempo_minutos: meta.tempo_minutos || 30,
      topicos: meta.topicos_sugeridos?.map(t => t.nome) || []
    });
    
    if (response.data.success) {
      showToast(' Simulado gerado com sucesso!');
      // Atualizar dashboard para mostrar o simulado
      renderDashboard();
    } else {
      showModal(' Erro ao gerar simulado: ' + (response.data.error || 'Erro desconhecido'));
      btn.innerHTML = btnOriginal;
      btn.disabled = false;
    }
  } catch (error) {
    console.error('Erro ao gerar simulado:', error);
    showModal(' Erro ao gerar simulado: ' + (error.response?.data?.error || error.message));
    btn.innerHTML = btnOriginal;
    btn.disabled = false;
  }
}

function visualizarConteudo(conteudo, meta = null) {
  console.log('📺 Visualizando conteúdo:', { 
    id: conteudo?.id, 
    tipo: conteudo?.tipo,
    disciplina_nome: conteudo?.disciplina_nome,
    temConteudo: !!conteudo?.conteudo,
    temSecoes: !!conteudo?.conteudo?.secoes,
    numSecoes: conteudo?.conteudo?.secoes?.length || 0
  });
  
  // Validar estrutura do conteúdo
  if (!conteudo || !conteudo.conteudo) {
    console.error('❌ Conteúdo inválido - estrutura:', Object.keys(conteudo || {}));
    console.error('❌ Objeto completo:', JSON.stringify(conteudo, null, 2));
    showModal(' Erro ao carregar o conteúdo.\n\nA estrutura do material não está completa.\nTente gerar o conteúdo novamente.');
    renderDashboard();
    return;
  }

  const { conteudo: detalhes, topicos = [], tipo, disciplina_id, disciplina_nome } = conteudo;
  const nomeDisciplina = disciplina_nome || meta?.disciplina_nome || 'Disciplina';
  const secoesValidas = Array.isArray(detalhes?.secoes) ? detalhes.secoes : [];
  
  console.log('✅ Conteúdo válido:', { seções: secoesValidas.length, tipo, disciplina: nomeDisciplina });

  // Estado do simulado
  window.respostasSimulado = {};
  window.simuladoFinalizado = false;

  // Coletar todas as teorias em um único bloco
  const todasTeorias = secoesValidas
    .map(secao => secao.conteudo?.teoria_completa || secao.teoria_completa || '')
    .filter(t => t.length > 0)
    .join('\n\n---\n\n');
  
  // Contar questões
  const totalQuestoes = secoesValidas
    .reduce((sum, s) => sum + (s.conteudo?.questoes?.length || s.questoes?.length || 0), 0);
  
  console.log('📊 Material:', { teoria: todasTeorias.length + ' caracteres', questões: totalQuestoes });
  
  // Verificação: para tipo "exercicios", teoria é opcional
  const isExercicios = tipo === 'exercicios';
  const isRevisao = tipo === 'revisao';
  
  if (!isExercicios && !isRevisao && todasTeorias.length === 0) {
    console.error('❌ ERRO: Conteúdo tipo "teoria" deve ter teoria_completa!');
    console.log('🔍 Estrutura completa do conteúdo:', JSON.stringify(conteudo, null, 2));
    showModal(' Erro: O material de estudo não foi gerado corretamente.\n\nTente gerar novamente ou recarregue a página.');
    renderDashboard();
    return;
  }
  
  if (totalQuestoes === 0 && isExercicios) {
    console.error('❌ ERRO: Conteúdo tipo "exercicios" deve ter questões!');
    showModal(' Erro: Nenhuma questão foi gerada.\n\nTente gerar novamente.');
    renderDashboard();
    return;
  }
  
  if (totalQuestoes === 0) {
    console.warn('⚠️ ATENÇÃO: Nenhuma questão foi encontrada nas seções!');
    console.log('🔍 Conteúdo das seções:', secoesValidas.map(s => ({
      titulo: s.titulo,
      temQuestoes: !!s.conteudo?.questoes,
      numQuestoes: s.conteudo?.questoes?.length || 0,
      temTeoria: !!s.conteudo?.teoria_completa
    })));
  }

  const app = document.getElementById('app');
  
  // Manter as classes do tema no app
  app.className = themes[currentTheme].bg + ' min-h-screen transition-colors duration-300';
  
  app.innerHTML = `
    <div class="min-h-screen">
      <header class="${themes[currentTheme].card} shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onclick="renderDashboard()" class="${themes[currentTheme].textSecondary} hover:${themes[currentTheme].text} flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <i class="fas fa-arrow-left"></i>
            <span>Voltar</span>
          </button>
          <h1 class="text-2xl font-bold ${themes[currentTheme].text} flex items-center gap-2">
            <i class="fas fa-book-open text-[#2A4A9F]"></i>
            ${nomeDisciplina}
          </h1>
          <button onclick="recriarConteudo(${conteudo.id}, ${conteudo.meta_id || 'null'})" class="bg-[#3A5AB0] hover:bg-[#2A4A9F] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-md">
            <i class="fas fa-redo-alt"></i>
            <span>Recriar</span>
          </button>
        </div>
      </header>

      <div class="max-w-5xl mx-auto px-4 py-8">
        ${tipo === 'exercicios' && todasTeorias.length === 0 ? `
        <!-- ALERTA: EXERCÍCIOS SEM TEORIA -->
        <div class="bg-[#E8EDF5] dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-6 mb-6 rounded-lg">
          <div class="flex items-start gap-3">
            <i class="fas fa-info-circle text-[#2A4A9F] text-2xl mt-1"></i>
            <div>
              <h3 class="font-bold text-yellow-800 dark:text-yellow-300 mb-2">Sessão de Exercícios</h3>
              <p class="text-yellow-700 dark:text-[#4A6491] text-sm">
                Esta é uma sessão prática de <strong>resolução de questões</strong>. 
                ${detalhes.introducao || 'Teste seus conhecimentos e identifique pontos de melhoria.'}
              </p>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${todasTeorias.length > 0 ? `
        <!-- CARD ÚNICO: TEORIA COMPLETA -->
        <div class="${themes[currentTheme].card} rounded-xl shadow-lg p-8 mb-6 border-l-4 border-blue-500">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold ${themes[currentTheme].text} flex items-center gap-3">
              <div class="w-10 h-10 bg-[#122D6A] rounded-lg flex items-center justify-center">
                <i class="fas fa-book text-white"></i>
              </div>
              <span>Material de Estudo</span>
            </h2>
            <div class="text-sm ${themes[currentTheme].textSecondary}">
              <i class="far fa-clock mr-1"></i>
              ${meta?.tempo_minutos || 0} minutos
            </div>
          </div>
          
          <div class="teoria-content ${themes[currentTheme].text} leading-relaxed" style="text-align: justify; white-space: pre-wrap; line-height: 1.8;">
            ${todasTeorias.split('\n').map(line => {
              // Processar markdown básico
              const trimmed = line.trim();
              
              if (trimmed.startsWith('## ')) {
                return `<h2 style="font-size: 1.8em; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; color: #2563eb;">${trimmed.substring(3)}</h2>`;
              } else if (trimmed.startsWith('### ')) {
                return `<h3 style="font-size: 1.4em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: #3b82f6;">${trimmed.substring(4)}</h3>`;
              } else if (trimmed.match(/^\d+\.\s+\*\*/)) {
                // Lista numerada com negrito
                const text = trimmed.replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>');
                return `<p style="margin-left: 1.5em; margin-top: 0.5em;">${text}</p>`;
              } else if (trimmed.startsWith('**') && trimmed.includes(':**')) {
                // Título em negrito
                const text = trimmed.replace(/\*\*/g, '<strong>').replace(/\*\*/g, '</strong>');
                return `<p style="margin-top: 1em; font-weight: 600;">${text}</p>`;
              } else if (trimmed.startsWith('-')) {
                return `<p style="margin-left: 1.5em; margin-top: 0.3em;">${trimmed}</p>`;
              } else if (trimmed === '---') {
                return `<hr style="margin: 2em 0; border-top: 2px solid #e5e7eb;" />`;
              } else if (trimmed) {
                return `<p style="margin-top: 0.8em;">${trimmed}</p>`;
              }
              return '';
            }).join('')}
          </div>
        </div>
        ` : ''}

        <!-- CARD DE SIMULADO -->
        ${secoesValidas.some(s => s.conteudo?.questoes && s.conteudo.questoes.length > 0) ? `
          <div id="simuladoCard" class="${themes[currentTheme].card} rounded-xl shadow-lg p-8 mb-6 border-l-4 border-green-500">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-2xl font-bold ${themes[currentTheme].text} flex items-center gap-3">
                <div class="w-10 h-10 bg-[#122D6A] rounded-lg flex items-center justify-center">
                  <i class="fas fa-clipboard-check text-white"></i>
                </div>
                <span>Simulado - Teste seus conhecimentos</span>
              </h2>
            </div>
            
            <div id="questoesContainer">
              ${secoesValidas.map((secao, secIdx) => {
                const questoes = secao.conteudo?.questoes || [];
                return questoes.map((q, qIdx) => `
                  <div class="questao-card bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border-l-4 border-gray-300">
                    <div class="flex items-center gap-3 mb-4">
                      <div class="w-8 h-8 bg-[#122D6A] text-white rounded-full flex items-center justify-center font-bold">
                        ${qIdx + 1}
                      </div>
                      <h3 class="font-bold ${themes[currentTheme].text} text-lg">
                        Questão ${qIdx + 1}
                      </h3>
                    </div>
                    <p class="${themes[currentTheme].text} mb-4 leading-relaxed whitespace-pre-line">${q.enunciado}</p>
                    
                    <div class="space-y-3">
                      ${q.alternativas.map((alt, altIdx) => `
                        <label class="flex items-start p-4 rounded-xl cursor-pointer bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:border-[#122D6A] hover:bg-[#122D6A]/5 dark:hover:bg-blue-900/30 transition-all duration-200 group">
                          <input type="radio" 
                            name="questao_${secIdx}_${qIdx}" 
                            value="${altIdx}"
                            onchange="salvarResposta(${secIdx}, ${qIdx}, ${altIdx})"
                            class="mt-1 mr-3 w-5 h-5 text-[#122D6A] focus:ring-[#122D6A]">
                          <span class="${themes[currentTheme].text}">
                            <strong class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#122D6A] text-white mr-2 text-sm">${String.fromCharCode(65 + altIdx)}</strong> ${alt.replace(/^[A-E]\)\s*/, '')}
                          </span>
                        </label>
                      `).join('')}
                    </div>
                    
                    <div id="explicacao_${secIdx}_${qIdx}" class="hidden mt-4 p-4 rounded-lg bg-[#E8EDF5]">
                      <p class="text-sm text-gray-800"><strong>Gabarito:</strong> ${String.fromCharCode(65 + q.gabarito)}</p>
                      <p class="text-sm text-gray-700 mt-2">${q.explicacao}</p>
                    </div>
                  </div>
                `).join('');
              }).join('')}
            </div>
            
            <div class="flex items-center justify-between mt-6">
              <button onclick="finalizarSimuladoConteudo()" 
                class="bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] text-white px-8 py-3 rounded-lg font-semibold hover:from-[#0D1F4D] hover:to-[#0A1839] transform hover:scale-105 transition">
                <i class="fas fa-check-circle mr-2"></i>
                Finalizar e Ver Resultado
              </button>
            </div>
          </div>
          
          <!-- CARD DE RESULTADO (inicialmente oculto) -->
          <div id="resultadoCard" class="hidden ${themes[currentTheme].card} rounded-xl shadow-lg p-8 border-l-4 border-yellow-500">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 bg-[#122D6A] rounded-lg flex items-center justify-center">
                <i class="fas fa-trophy text-white text-xl"></i>
              </div>
              <h2 class="text-2xl font-bold ${themes[currentTheme].text}">
                Resultado do Simulado
              </h2>
            </div>
            <div id="resultadoConteudo"></div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Funções do simulado
  window.salvarResposta = (secIdx, qIdx, altIdx) => {
    if (!window.respostasSimulado) window.respostasSimulado = {};
    window.respostasSimulado[`${secIdx}_${qIdx}`] = altIdx;
  };
  
  window.finalizarSimuladoConteudo = () => {
    if (window.simuladoFinalizado) {
      showModal('Este simulado já foi finalizado.', { type: 'warning' });
      return;
    }
    
    // Coletar todas as questões
    const todasQuestoes = [];
    secoesValidas.forEach((secao, secIdx) => {
      const questoes = secao.conteudo?.questoes || [];
      questoes.forEach((q, qIdx) => {
        todasQuestoes.push({ secIdx, qIdx, questao: q });
      });
    });
    
    if (todasQuestoes.length === 0) return;
    
    // Calcular acertos
    let acertos = 0;
    todasQuestoes.forEach(({ secIdx, qIdx, questao }) => {
      const respostaUsuario = window.respostasSimulado[`${secIdx}_${qIdx}`];
      if (respostaUsuario === questao.gabarito) {
        acertos++;
      }
      // Mostrar explicação
      const explicacaoDiv = document.getElementById(`explicacao_${secIdx}_${qIdx}`);
      if (explicacaoDiv) {
        explicacaoDiv.classList.remove('hidden');
        if (respostaUsuario === questao.gabarito) {
          explicacaoDiv.classList.add('bg-[#E8EDF5]');
          explicacaoDiv.classList.remove('bg-[#E8EDF5]');
        } else {
          explicacaoDiv.classList.add('bg-red-50');
          explicacaoDiv.classList.remove('bg-[#E8EDF5]');
        }
      }
    });
    
    const total = todasQuestoes.length;
    const percentual = Math.round((acertos / total) * 100);
    const nota = (acertos / total) * 10;
    
    // Determinar emoji e mensagem
    let emoji = '😐';
    let mensagem = 'Continue estudando!';
    let cor = 'text-[#1A3A7F]';
    
    if (percentual >= 90) {
      emoji = '🏆';
      mensagem = 'Excelente! Você domina o conteúdo!';
      cor = 'text-[#2A4A9F]';
    } else if (percentual >= 70) {
      emoji = '😊';
      mensagem = 'Muito bom! Continue assim!';
      cor = 'text-[#1A3A7F]';
    } else if (percentual >= 50) {
      emoji = '😐';
      mensagem = 'Razoável. Revise os pontos fracos.';
      cor = 'text-[#1A3A7F]';
    } else {
      emoji = '😕';
      mensagem = 'Estude mais este conteúdo.';
      cor = 'text-[#1A3A7F]';
    }
    
    // Mostrar resultado
    const resultadoCard = document.getElementById('resultadoCard');
    const resultadoConteudo = document.getElementById('resultadoConteudo');
    
    resultadoConteudo.innerHTML = `
      <div class="text-center mb-8">
        <div class="text-8xl mb-4">${emoji}</div>
        <h3 class="text-4xl font-bold ${cor} mb-2">${percentual}%</h3>
        <p class="text-xl ${themes[currentTheme].text} mb-2">Nota: ${nota.toFixed(1)}/10</p>
        <p class="${themes[currentTheme].textSecondary}">${mensagem}</p>
      </div>
      
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-[#2A4A9F]/10 rounded-lg p-4 text-center">
          <p class="text-3xl font-bold text-[#2A4A9F]">${acertos}</p>
          <p class="text-sm text-gray-600">Acertos</p>
        </div>
        <div class="bg-red-100 rounded-lg p-4 text-center">
          <p class="text-3xl font-bold text-[#1A3A7F]">${total - acertos}</p>
          <p class="text-sm text-gray-600">Erros</p>
        </div>
        <div class="bg-[#D0D9EB] rounded-lg p-4 text-center">
          <p class="text-3xl font-bold text-[#1A3A7F]">${total}</p>
          <p class="text-sm text-gray-600">Total</p>
        </div>
      </div>
      
      <div class="bg-gray-100 rounded-lg p-4">
        <h4 class="font-bold text-gray-800 mb-2">📊 Análise de Desempenho</h4>
        <div class="w-full bg-gray-300 rounded-full h-4 mb-2">
          <div class="bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] h-4 rounded-full transition-all duration-1000" style="width: ${percentual}%"></div>
        </div>
        <p class="text-sm text-gray-600">
          ${percentual >= 70 ? 
            'Você está preparado para questões deste nível. Continue praticando para manter o desempenho!' : 
            'Recomendamos revisar a teoria acima e refazer este simulado após o estudo.'}
        </p>
      </div>
    `;
    
    resultadoCard.classList.remove('hidden');
    resultadoCard.scrollIntoView({ behavior: 'smooth' });
    window.simuladoFinalizado = true;
  };
}

function renderSecaoConteudo(conteudo, tipo) {
  if (!conteudo) return '<p class="text-gray-500">Conteúdo não disponível</p>';
  
  if (tipo === 'teoria') {
    const textoIntro = conteudo.texto_introducao || '';
    const pontosChave = Array.isArray(conteudo.pontos_chave) ? conteudo.pontos_chave : [];
    const desenvolvimento = Array.isArray(conteudo.desenvolvimento) ? conteudo.desenvolvimento : [];
    const exemplos = Array.isArray(conteudo.exemplos) ? conteudo.exemplos : [];
    const dicas = Array.isArray(conteudo.dicas) ? conteudo.dicas : [];
    
    return `
      <div class="space-y-6">
        ${textoIntro ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg border-l-4 border-blue-500">
            <p class="text-gray-800 leading-relaxed">${textoIntro}</p>
          </div>
        ` : ''}
        
        ${pontosChave.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-[#122D6A]">📚 Conceitos Fundamentais</h4>
            <div class="space-y-3">
              ${pontosChave.map(p => `
                <div class="${themes[currentTheme].card} p-3 rounded border-l-4 border-blue-400">
                  <p class="text-gray-800 leading-relaxed">${p}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${desenvolvimento.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-gray-800">📖 Desenvolvimento do Conteúdo</h4>
            <div class="prose max-w-none space-y-4">
              ${desenvolvimento.map(paragrafo => `
                <p class="${themes[currentTheme].text} leading-relaxed text-justify">${paragrafo}</p>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${exemplos.length > 0 ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg">
            <h4 class="font-bold text-lg mb-3 text-green-700">💡 Exemplos Práticos</h4>
            <div class="space-y-3">
              ${exemplos.map(e => `
                <div class="${themes[currentTheme].card} p-3 rounded">
                  <p class="text-gray-800 leading-relaxed">${e}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${dicas.length > 0 ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg border-l-4 border-yellow-500">
            <h4 class="font-bold text-lg mb-3 text-yellow-700">⚡ Dicas Importantes</h4>
            <ul class="space-y-2">
              ${dicas.map(d => `
                <li class="flex items-start">
                  <i class="fas fa-star text-[#2A4A9F] mr-2 mt-1"></i>
                  <span class="text-gray-800">${d}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tipo === 'exercicios') {
    const questoes = conteudo.questoes_sugeridas || '';
    const orientacao = conteudo.orientacao_resolucao || '';
    const estrategia = Array.isArray(conteudo.estrategia) ? conteudo.estrategia : [];
    const tipoQuestoes = Array.isArray(conteudo.tipo_questoes) ? conteudo.tipo_questoes : [];
    const fontes = Array.isArray(conteudo.fontes) ? conteudo.fontes : [];
    const posResolucao = conteudo.pos_resolucao || '';
    
    return `
      <div class="space-y-6">
        <div class="bg-[#E8EDF5] p-4 rounded-lg border-l-4 border-[#4A6AC0]">
          <p class="font-bold text-lg text-[#0D1F4D] mb-2">${questoes}</p>
          ${orientacao ? `<p class="${themes[currentTheme].text} mt-2">${orientacao}</p>` : ''}
        </div>
        
        ${estrategia.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-[#122D6A]">🎯 Estratégia de Resolução</h4>
            <ol class="space-y-2">
              ${estrategia.map(e => `
                <li class="flex items-start">
                  <span class="font-semibold text-[#1A3A7F] mr-2">${e.split(':')[0]}:</span>
                  <span class="text-gray-800">${e.split(':').slice(1).join(':')}</span>
                </li>
              `).join('')}
            </ol>
          </div>
        ` : ''}
        
        ${tipoQuestoes.length > 0 ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg">
            <h4 class="font-bold text-lg mb-3 text-[#122D6A]">📝 Tipo de Questões</h4>
            <ul class="space-y-2">
              ${tipoQuestoes.map(t => `<li class="text-gray-800">${t}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${fontes.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-[#0D1F4D]">📚 Fontes Recomendadas</h4>
            <ul class="space-y-2">
              ${fontes.map(f => `
                <li class="flex items-start">
                  <i class="fas fa-book text-[#122D6A] mr-2 mt-1"></i>
                  <span class="text-gray-800">${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${posResolucao ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg border-l-4 border-green-500">
            <h4 class="font-bold text-lg mb-2 text-green-700">✅ Pós-Resolução</h4>
            <p class="text-gray-800 leading-relaxed">${posResolucao}</p>
          </div>
        ` : ''}
      </div>
    `;
  } else { // revisao
    const metodo = conteudo.metodo || '';
    const introducao = conteudo.introducao_revisao || '';
    const atividades = Array.isArray(conteudo.atividades) ? conteudo.atividades : [];
    const foco = Array.isArray(conteudo.foco) ? conteudo.foco : [];
    const tecnicas = Array.isArray(conteudo.tecnicas) ? conteudo.tecnicas : [];
    const objetivo = conteudo.objetivo_revisao || '';
    
    return `
      <div class="space-y-6">
        <div class="bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-500">
          <p class="font-bold text-lg text-indigo-700 mb-2">${metodo}</p>
          ${introducao ? `<p class="${themes[currentTheme].text} mt-2">${introducao}</p>` : ''}
        </div>
        
        ${atividades.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-[#122D6A]">📋 Roteiro de Revisão</h4>
            <ol class="space-y-3">
              ${atividades.map(a => `
                <li class="bg-white p-3 rounded border-l-4 border-blue-400">
                  <p class="text-gray-800 leading-relaxed">${a}</p>
                </li>
              `).join('')}
            </ol>
          </div>
        ` : ''}
        
        ${foco.length > 0 ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg">
            <h4 class="font-bold text-lg mb-3 text-green-700">🎯 Pontos de Foco</h4>
            <ul class="space-y-2">
              ${foco.map(f => `
                <li class="flex items-start">
                  <i class="fas fa-bullseye text-[#2A4A9F] mr-2 mt-1"></i>
                  <span class="text-gray-800">${f}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${tecnicas.length > 0 ? `
          <div>
            <h4 class="font-bold text-lg mb-3 text-[#0D1F4D]">🧠 Técnicas de Memorização</h4>
            <ul class="space-y-2">
              ${tecnicas.map(t => `
                <li class="text-gray-800">${t}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${objetivo ? `
          <div class="bg-[#E8EDF5] p-4 rounded-lg border-l-4 border-yellow-500">
            <h4 class="font-bold text-lg mb-2 text-yellow-700">🏆 Objetivo Final</h4>
            <p class="text-gray-800 leading-relaxed">${objetivo}</p>
          </div>
        ` : ''}
      </div>
    `;
  }
}

// ==========================
// GESTÃO DE PLANOS
// ==========================

async function carregarPlanos() {
  try {
    const response = await axios.get(`/api/planos/list/${currentUser.id}`);
    const planos = response.data;
    
    const planosList = document.getElementById('planos-list');
    if (!planosList) return;
    
    if (planos.length === 0) {
      planosList.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-inbox text-6xl ${themes[currentTheme].textSecondary} mb-4"></i>
          <p class="${themes[currentTheme].textSecondary}">Nenhum plano encontrado</p>
          <p class="${themes[currentTheme].textSecondary} text-sm mt-2">Clique em "Novo Plano" para começar</p>
        </div>
      `;
      return;
    }
    
    planosList.innerHTML = planos.map(plano => `
      <div class="${plano.ativo ? 'bg-gradient-to-r from-[#E8EDF5] to-blue-100 border-blue-600' : themes[currentTheme].card + ' ${themes[currentTheme].border}'} border-2 rounded-lg p-4 transition hover:shadow-md">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              ${plano.ativo ? '<span class="bg-[#0D1F4D] text-white text-xs px-2 py-1 rounded-full font-semibold">ATIVO</span>' : ''}
              <h3 class="font-bold ${themes[currentTheme].text} text-lg" id="plano-nome-${plano.id}">
                ${plano.nome || 'Sem nome'}
              </h3>
              <button onclick="editarNomePlano(${plano.id}, '${(plano.nome || '').replace(/'/g, "\\'")}')" 
                class="${themes[currentTheme].textSecondary} hover:text-[#2A4A9F] text-sm">
                <i class="fas fa-edit"></i>
              </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm ${themes[currentTheme].textSecondary}">
              <div>
                <i class="fas fa-book mr-1"></i>
                <span>${plano.total_disciplinas} disciplinas</span>
              </div>
              <div>
                <i class="fas fa-bullseye mr-1"></i>
                <span>${plano.total_metas} metas</span>
              </div>
              <div>
                <i class="fas fa-check-circle mr-1 text-[#2A4A9F]"></i>
                <span>${plano.metas_concluidas} concluídas</span>
              </div>
              <div>
                <i class="fas fa-calendar mr-1"></i>
                <span>${new Date(plano.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <p class="${themes[currentTheme].textSecondary} text-sm mt-2">
              ${plano.concurso_nome || 'Concurso não especificado'}
            </p>
          </div>
          <div class="flex flex-col gap-2 ml-4">
            ${!plano.ativo ? `
              <button onclick="ativarPlano(${plano.id})" 
                class="bg-[#0D1F4D] text-white px-3 py-1 rounded text-sm hover:bg-[#0A1839] transition whitespace-nowrap">
                <i class="fas fa-check mr-1"></i>Ativar
              </button>
            ` : ''}
            <button onclick="excluirPlano(${plano.id}, '${(plano.nome || 'este plano').replace(/'/g, "\\'")}')" 
              class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition whitespace-nowrap">
              <i class="fas fa-trash mr-1"></i>Excluir
            </button>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
    const planosList = document.getElementById('planos-list');
    if (planosList) {
      planosList.innerHTML = `
        <div class="text-center py-4">
          <p class="text-[#2A4A9F]">Erro ao carregar planos</p>
        </div>
      `;
    }
  }
}

async function editarNomePlano(planoId, nomeAtual) {
  const novoNome = prompt('Digite o novo nome do plano:', nomeAtual);
  if (!novoNome || novoNome === nomeAtual) return;
  
  try {
    await axios.put(`/api/planos/${planoId}/nome`, { nome: novoNome });
    showToast(' Plano renomeado com sucesso!');
    await carregarPlanos();
  } catch (error) {
    console.error('Erro ao renomear plano:', error);
    showModal(' Erro ao renomear plano: ' + (error.response?.data?.error || error.message));
  }
}

async function ativarPlano(planoId) {
  const confirmed = await showConfirm('Deseja ativar este plano?\n\nO plano ativo anterior será desativado.', {
    title: 'Ativar Plano',
    confirmText: 'Sim, ativar',
    cancelText: 'Cancelar',
    type: 'info'
  });
  if (!confirmed) return;
  
  try {
    await axios.post(`/api/planos/${planoId}/ativar`);
    showToast(' Plano ativado com sucesso!');
    await carregarPlanos();
    await renderDashboard(); // Recarregar dashboard com novo plano ativo
  } catch (error) {
    console.error('Erro ao ativar plano:', error);
    showModal(' Erro ao ativar plano: ' + (error.response?.data?.error || error.message));
  }
}

async function excluirPlano(planoId, nomePlano) {
  // Mostrar modal de confirmação
  mostrarModalConfirmarExclusao(planoId, nomePlano);
}

async function confirmarExclusaoPlano(planoId, nomePlano) {
  try {
    // Tentar excluir primeiro (sem force)
    await axios.delete(`/api/planos/${planoId}`);
    
    // Fechar modal
    const modal = document.getElementById('modalConfirmarExclusao');
    if (modal) modal.remove();
    
    showSuccess('✅ Plano excluído com sucesso!');
    await carregarPlanos();
    await renderDashboard(); // Recarregar dashboard
  } catch (error) {
    console.error('Erro ao excluir plano:', error);
    
    // Fechar modal de confirmação
    const modal = document.getElementById('modalConfirmarExclusao');
    if (modal) modal.remove();
    
    // Se for o último plano, mostrar modal especial
    if (error.response?.data?.code === 'ULTIMO_PLANO') {
      mostrarModalUltimoPlano(planoId, nomePlano);
    } else {
      showError('Erro ao excluir plano: ' + (error.response?.data?.error || error.message));
    }
  }
}

function mostrarModalConfirmarExclusao(planoId, nomePlano) {
  const modal = document.createElement('div');
  modal.id = 'modalConfirmarExclusao';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-md w-full p-6">
      <div class="text-center mb-6">
        <div class="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-4">
          <i class="fas fa-exclamation-triangle text-4xl text-white"></i>
        </div>
        <h2 class="text-2xl font-bold ${themes[currentTheme].text} mb-2">
          Confirmar Exclusão
        </h2>
        <p class="${themes[currentTheme].textSecondary} mb-4">
          Você está prestes a excluir o plano:
        </p>
        <p class="text-lg font-bold ${themes[currentTheme].text} mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          "${nomePlano}"
        </p>
        <p class="${themes[currentTheme].textSecondary} text-sm mb-4">
          <i class="fas fa-warning mr-1"></i>
          Esta ação não pode ser desfeita! Todas as metas e conteúdos associados serão perdidos.
        </p>
      </div>
      
      <div class="mb-6">
        <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
          Digite o nome do plano para confirmar:
        </label>
        <input 
          type="text" 
          id="inputConfirmacaoNome"
          placeholder="Digite: ${nomePlano}"
          class="w-full px-4 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-red-500 border-2 border-gray-300 dark:border-gray-600"
          autocomplete="off">
        <p class="text-xs ${themes[currentTheme].textSecondary} mt-1">
          Digite exatamente: <strong>"${nomePlano}"</strong>
        </p>
      </div>
      
      <div class="flex gap-3">
        <button 
          onclick="document.getElementById('modalConfirmarExclusao').remove()"
          class="flex-1 px-4 py-2 border-2 ${themes[currentTheme].border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${themes[currentTheme].text} font-semibold transition">
          Cancelar
        </button>
        <button 
          id="btnConfirmarExclusao"
          disabled
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition">
          Excluir Plano
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focar no input
  const input = document.getElementById('inputConfirmacaoNome');
  const btn = document.getElementById('btnConfirmarExclusao');
  
  input.focus();
  
  // Validar nome em tempo real
  input.addEventListener('input', (e) => {
    if (e.target.value === nomePlano) {
      btn.disabled = false;
      btn.classList.remove('bg-gray-400');
      btn.classList.add('bg-red-600');
    } else {
      btn.disabled = true;
      btn.classList.add('bg-gray-400');
      btn.classList.remove('bg-red-600');
    }
  });
  
  // Confirmar ao clicar no botão
  btn.addEventListener('click', () => {
    if (input.value === nomePlano) {
      confirmarExclusaoPlano(planoId, nomePlano);
    }
  });
  
  // Confirmar com Enter
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && input.value === nomePlano) {
      confirmarExclusaoPlano(planoId, nomePlano);
    }
  });
}

function mostrarModalUltimoPlano(planoId, nomePlano) {
  const modal = document.createElement('div');
  modal.id = 'modalUltimoPlano';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-lg w-full p-6">
      <div class="text-center mb-6">
        <div class="mx-auto w-16 h-16 bg-gradient-to-br from-[#122D6A] to-[#0D1F4D] rounded-full flex items-center justify-center mb-4">
          <i class="fas fa-sync-alt text-4xl text-white"></i>
        </div>
        <h2 class="text-2xl font-bold ${themes[currentTheme].text} mb-2">
          Deseja recomeçar seu plano?
        </h2>
        <p class="${themes[currentTheme].textSecondary} text-lg mb-1">
          Plano atual: "${nomePlano}"
        </p>
        <p class="${themes[currentTheme].textSecondary} text-sm">
          <i class="fas fa-info-circle mr-1"></i>Este é seu único plano de estudos
        </p>
      </div>
      
      <div class="${currentTheme === 'light' ? 'bg-[#E8EDF5] border-[#C5D1E8]' : 'bg-[#0A1839]/20 border-[#1A3A7F]'} border-2 rounded-lg p-4 mb-6">
        <p class="${themes[currentTheme].text} font-semibold mb-3">
          <i class="fas fa-check-circle mr-2 text-[#1A3A7F]"></i>
          O que vai acontecer:
        </p>
        <ul class="${themes[currentTheme].text} space-y-2 text-sm">
          <li class="flex items-start">
            <span class="text-[#1A3A7F] mr-2">1️⃣</span>
            <span>Seu plano atual será <strong>deletado</strong> (ciclos, metas e histórico)</span>
          </li>
          <li class="flex items-start">
            <span class="text-[#1A3A7F] mr-2">2️⃣</span>
            <span>Você será <strong>redirecionado para criar um novo plano</strong></span>
          </li>
          <li class="flex items-start">
            <span class="text-[#1A3A7F] mr-2">3️⃣</span>
            <span>Uma <strong>nova entrevista</strong> será iniciada para definir suas disciplinas e metas</span>
          </li>
        </ul>
      </div>
      
      <div class="${currentTheme === 'light' ? 'bg-[#E8EDF5] border-green-200' : 'bg-green-900/20 border-green-700'} border-2 rounded-lg p-3 mb-6">
        <p class="${themes[currentTheme].text} text-sm">
          <i class="fas fa-lightbulb mr-2 text-[#2A4A9F]"></i>
          <strong>Dica:</strong> Isso é útil quando você mudou de concurso ou quer reorganizar completamente seus estudos.
        </p>
      </div>
      
      <div class="flex flex-col gap-3">
        <button 
          onclick="confirmarExclusaoUltimoPlano(${planoId})" 
          class="w-full px-6 py-4 bg-gradient-to-r from-[#122D6A] to-[#0D1F4D] hover:from-[#0D1F4D] hover:to-[#0A1839] text-white rounded-lg font-bold transition shadow-lg transform hover:scale-105">
          <i class="fas fa-sync-alt mr-2"></i>
          Sim, Deletar e Criar Novo Plano
        </button>
        <button 
          onclick="fecharModalUltimoPlano()" 
          class="w-full px-4 py-3 rounded-lg font-semibold transition ${currentTheme === 'light' ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}">
          <i class="fas fa-times mr-2"></i>
          Não, Manter Plano Atual
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function fecharModalUltimoPlano() {
  const modal = document.getElementById('modalUltimoPlano');
  if (modal) {
    modal.remove();
  }
}

async function confirmarExclusaoUltimoPlano(planoId) {
  fecharModalUltimoPlano();
  
  // Mostrar loading
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-6xl ${themes[currentTheme].text} mb-4"></i>
        <p class="${themes[currentTheme].text} text-xl mb-2">Deletando plano atual...</p>
        <p class="${themes[currentTheme].textSecondary}">Preparando nova entrevista...</p>
      </div>
    </div>
  `;
  
  try {
    // Excluir com force=true
    await axios.delete(`/api/planos/${planoId}?force=true`);
    
    console.log('✅ Plano deletado, iniciando nova entrevista...');
    
    // Aguardar 500ms para dar feedback visual
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Redirecionar para criar novo plano (iniciar entrevista)
    iniciarEntrevista();
  } catch (error) {
    console.error('Erro ao excluir último plano:', error);
    showModal(' Erro ao excluir plano: ' + (error.response?.data?.error || error.message));
    renderDashboard(); // Voltar ao dashboard em caso de erro
  }
}

// ==========================
// VISUALIZAÇÃO E DOWNLOAD DE CONTEÚDO
// ==========================

async function baixarConteudo(conteudoId, disciplinaNome, tipo) {
  try {
    const response = await axios.get(`/api/conteudos/${conteudoId}?format=txt`, {
      responseType: 'blob'
    });
    
    // Criar nome do arquivo
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `${disciplinaNome}_${tipo}_${dataAtual}.txt`;
    
    // Criar link de download
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/plain; charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    showToast(' Conteúdo baixado como TXT com sucesso!');
  } catch (error) {
    console.error('Erro ao baixar conteúdo:', error);
    showModal(' Erro ao baixar conteúdo: ' + (error.response?.data?.error || error.message));
  }
}

// Toggle User Menu Dropdown
function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Toggle Command Panel com animação suave
function toggleCommandPanel() {
  const panel = document.getElementById('command-panel');
  const chevron = document.getElementById('panel-chevron');
  const btn = document.getElementById('btn-expand-panel');
  
  if (panel) {
    const isHidden = panel.classList.contains('hidden');
    
    if (isHidden) {
      // Abrir painel com animação
      panel.classList.remove('hidden');
      panel.style.maxHeight = '0px';
      panel.style.opacity = '0';
      panel.style.overflow = 'hidden';
      
      requestAnimationFrame(() => {
        panel.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out';
        panel.style.maxHeight = '500px';
        panel.style.opacity = '1';
      });
      
      // Rotacionar chevron
      if (chevron) {
        chevron.style.transform = 'rotate(180deg)';
      }
      if (btn) {
        btn.classList.add('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/50');
      }
      
      // Salvar estado
      localStorage.setItem('commandPanelOpen', 'true');
    } else {
      // Fechar painel com animação
      panel.style.transition = 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in';
      panel.style.maxHeight = '0px';
      panel.style.opacity = '0';
      
      setTimeout(() => {
        panel.classList.add('hidden');
        panel.style.overflow = '';
      }, 300);
      
      // Reset chevron
      if (chevron) {
        chevron.style.transform = 'rotate(0deg)';
      }
      if (btn) {
        btn.classList.remove('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/50');
      }
      
      // Salvar estado
      localStorage.setItem('commandPanelOpen', 'false');
    }
  }
}

// Restaurar estado do painel ao carregar
function restoreCommandPanelState() {
  const shouldBeOpen = localStorage.getItem('commandPanelOpen') === 'true';
  const panel = document.getElementById('command-panel');
  const chevron = document.getElementById('panel-chevron');
  const btn = document.getElementById('btn-expand-panel');
  
  if (shouldBeOpen && panel) {
    panel.classList.remove('hidden');
    panel.style.maxHeight = '500px';
    panel.style.opacity = '1';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
    if (btn) btn.classList.add('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/50');
  }
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(event) {
  const menu = document.getElementById('userMenu');
  const button = event.target.closest('button[onclick="toggleUserMenu()"]');
  
  if (menu && !menu.contains(event.target) && !button) {
    menu.classList.add('hidden');
  }
});

// ✅ NOVO: Modal para editar data da prova
async function abrirModalEditarDataProva() {
  // Buscar plano ativo para obter a data atual
  let dataAtual = '';
  let planoId = null;
  
  try {
    const response = await axios.get(`/api/planos/ativo/${currentUser.id}`);
    if (response.data && response.data.id) {
      planoId = response.data.id;
      dataAtual = response.data.data_prova || '';
    }
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
  }
  
  if (!planoId) {
    showToast('Nenhum plano ativo encontrado. Crie um plano primeiro.', 'warning');
    return;
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'modalEditarDataProva';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} rounded-xl shadow-2xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold ${themes[currentTheme].text}">
          <i class="fas fa-calendar-alt mr-2 text-[#1A3A7F]"></i>
          Data da Prova
        </h2>
        <button onclick="fecharModalEditarDataProva()" class="${themes[currentTheme].textSecondary} hover:${themes[currentTheme].text}">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-sm ${themes[currentTheme].textSecondary} mb-4">
        Defina a data da sua prova para acompanhar a contagem regressiva e manter o foco nos estudos.
      </p>
      
      <form id="formEditarDataProva" class="space-y-4">
        <div>
          <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-calendar-day mr-2"></i>Data da Prova
          </label>
          <input 
            type="date" 
            id="inputDataProva" 
            value="${dataAtual}" 
            min="${new Date().toISOString().split('T')[0]}"
            class="w-full px-4 py-3 border ${themes[currentTheme].border} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] ${themes[currentTheme].card} ${themes[currentTheme].text}"
          />
          <p class="text-xs ${themes[currentTheme].textSecondary} mt-1">
            <i class="fas fa-info-circle mr-1"></i>
            Deixe em branco para remover a data
          </p>
        </div>
        
        <input type="hidden" id="planoIdDataProva" value="${planoId}" />
        
        <div class="flex gap-3 mt-6">
          <button 
            type="submit" 
            class="flex-1 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white px-6 py-3 rounded-lg hover:from-[#0D1F4D] hover:to-[#122D6A] transition font-semibold shadow-lg"
          >
            <i class="fas fa-save mr-2"></i>Salvar
          </button>
          <button 
            type="button" 
            onclick="fecharModalEditarDataProva()" 
            class="px-6 py-3 border ${themes[currentTheme].border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition ${themes[currentTheme].text}"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handler do formulário
  document.getElementById('formEditarDataProva').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const novaData = document.getElementById('inputDataProva').value;
    const planoId = document.getElementById('planoIdDataProva').value;
    
    try {
      const response = await axios.put(`/api/planos/${planoId}/data-prova`, {
        data_prova: novaData || null,
        user_id: currentUser.id
      });
      
      if (response.data.success) {
        showToast(response.data.message, 'success');
        fecharModalEditarDataProva();
        renderDashboard(); // Recarregar dashboard para mostrar a contagem atualizada
      } else {
        showToast(response.data.error || 'Erro ao salvar data', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar data da prova:', error);
      showToast(error.response?.data?.error || 'Erro ao salvar data da prova', 'error');
    }
  });
}

function fecharModalEditarDataProva() {
  const modal = document.getElementById('modalEditarDataProva');
  if (modal) {
    modal.remove();
  }
}

// Abrir Modal de Editar Perfil
function abrirModalEditarPerfil() {
  // Fechar menu
  document.getElementById('userMenu')?.classList.add('hidden');
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'modalEditarPerfil';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-md w-full p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold ${themes[currentTheme].text}">
          <i class="fas fa-user-edit mr-2 text-[#1A3A7F]"></i>
          Editar Perfil
        </h2>
        <button onclick="fecharModalEditarPerfil()" class="${themes[currentTheme].textSecondary} hover:${themes[currentTheme].text}">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="formEditarPerfil" class="space-y-4">
        <div>
          <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-user mr-2"></i>Nome Completo
          </label>
          <input 
            type="text" 
            id="editNome" 
            value="${currentUser.name || ''}" 
            class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] ${themes[currentTheme].card} ${themes[currentTheme].text}"
            placeholder="Seu nome completo"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-envelope mr-2"></i>Email
          </label>
          <input 
            type="email" 
            id="editEmail" 
            value="${currentUser.email}" 
            class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] ${themes[currentTheme].card} ${themes[currentTheme].text}"
            placeholder="seu@email.com"
            required
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium ${themes[currentTheme].text} mb-2">
            <i class="fas fa-lock mr-2"></i>Nova Senha (opcional)
          </label>
          <input 
            type="password" 
            id="editSenha" 
            class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg focus:ring-2 focus:ring-[#1A3A7F] ${themes[currentTheme].card} ${themes[currentTheme].text}"
            placeholder="Deixe em branco para manter a senha atual"
          />
        </div>
        
        <div class="flex gap-3 mt-6">
          <button 
            type="submit" 
            class="flex-1 bg-[#122D6A] text-white px-6 py-3 rounded-lg hover:bg-[#0D1F4D] transition font-semibold"
          >
            <i class="fas fa-save mr-2"></i>Salvar Alterações
          </button>
          <button 
            type="button" 
            onclick="fecharModalEditarPerfil()" 
            class="px-6 py-3 border ${themes[currentTheme].border} rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition ${themes[currentTheme].text}"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Adicionar evento de submit
  document.getElementById('formEditarPerfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarPerfilEditado();
  });
}

// Fechar Modal de Editar Perfil
function fecharModalEditarPerfil() {
  const modal = document.getElementById('modalEditarPerfil');
  if (modal) {
    modal.remove();
  }
}

// Salvar Perfil Editado
async function salvarPerfilEditado() {
  const nome = document.getElementById('editNome').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const senha = document.getElementById('editSenha').value;
  
  if (!nome || !email) {
    showModal(' Nome e email são obrigatórios!');
    return;
  }
  
  try {
    const payload = { name: nome, email: email };
    if (senha) {
      payload.password = senha;
    }
    
    const response = await axios.put(`/api/users/${currentUser.id}`, payload);
    
    // Atualizar currentUser
    currentUser.name = nome;
    currentUser.email = email;
    
    // Salvar no localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showToast(' Perfil atualizado com sucesso!');
    fecharModalEditarPerfil();
    
    // Recarregar dashboard para mostrar novos dados
    renderDashboard();
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    showModal(' Erro ao atualizar perfil: ' + (error.response?.data?.error || error.message));
  }
}

// ============== CHATBOT IA ==============
let chatOpen = false;
let chatHistory = [];

function toggleChat() {
  chatOpen = !chatOpen;
  const chatContainer = document.getElementById('chatContainer');
  const chatButton = document.getElementById('chatButton');
  const fabContainer = document.getElementById('unified-fab-container');
  
  // Verificar se é mobile (largura < 768px)
  const isMobile = window.innerWidth < 768;
  
  if (chatOpen) {
    chatContainer.classList.remove('hidden');
    if (chatButton) chatButton.innerHTML = '<i class="fas fa-times text-2xl"></i>';
    
    // ✅ Esconder FAB no mobile quando chat está aberto para não sobrepor o input
    if (isMobile && fabContainer) {
      fabContainer.style.display = 'none';
    }
  } else {
    chatContainer.classList.add('hidden');
    if (chatButton) chatButton.innerHTML = '<i class="fas fa-comments text-2xl"></i>';
    
    // Mostrar FAB novamente quando chat é fechado
    if (fabContainer) {
      fabContainer.style.display = 'block';
    }
  }
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Adicionar mensagem do usuário
  addChatMessage('user', message);
  input.value = '';
  
  // Mostrar loading
  const loadingId = 'loading-' + Date.now();
  addChatMessage('assistant', '<i class="fas fa-spinner fa-spin"></i> Pensando...', loadingId);
  
  try {
    const response = await axios.post('/api/chat', {
      message: message,
      user_id: currentUser.id
    });
    
    // Remover loading
    document.getElementById(loadingId)?.remove();
    
    // Adicionar resposta
    addChatMessage('assistant', response.data.reply);
    
  } catch (error) {
    console.error('Erro no chat:', error);
    document.getElementById(loadingId)?.remove();
    addChatMessage('assistant', '😅 Ops! Tive um probleminha. Pode tentar de novo?');
  }
}

function addChatMessage(role, content, id = null) {
  const messagesDiv = document.getElementById('chatMessages');
  const messageId = id || 'msg-' + Date.now();
  
  const isUser = role === 'user';
  // Estilos diferentes para usuário e Lilu
  const bgColor = isUser 
    ? 'bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-2xl rounded-tr-sm' 
    : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-purple-100';
  const alignment = isUser ? 'ml-auto' : 'mr-auto';
  
  const messageHtml = `
    <div id="${messageId}" class="mb-3 ${alignment} max-w-[80%]">
      <div class="${bgColor} px-4 py-2 shadow-md">
        <p class="text-sm whitespace-pre-wrap">${content}</p>
      </div>
    </div>
  `;
  
  messagesDiv.insertAdjacentHTML('beforeend', messageHtml);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  chatHistory.push({ role, content });
}

function renderChatButton() {
  // Não criar botão separado, usar o FAB unificado
  const chatHtml = `
    
    <!-- Container do Chat - Responsivo -->
    <div 
      id="chatContainer"
      class="hidden fixed z-50 flex flex-col overflow-hidden border-2 ${themes[currentTheme].border}
             bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl
             md:bottom-28 md:right-8 md:left-auto md:w-96 md:h-[500px] md:rounded-2xl
             bg-white shadow-2xl">
      
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
            <span class="text-2xl">👩‍🏫</span>
          </div>
          <div>
            <h3 class="font-bold text-lg">Lilu</h3>
            <p class="text-xs text-white/80">Sua assistente de estudos</p>
          </div>
        </div>
        <button onclick="toggleChat()" class="hover:bg-white/20 rounded-full w-8 h-8">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <!-- Mensagens -->
      <div id="chatMessages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#E8EDF5] to-white">
        <div class="mr-auto max-w-[80%]">
          <div class="bg-white text-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-blue-100">
            <p class="text-sm">
              👋 Oi! Eu sou a <b>Lilu</b>, sua assistente de estudos! <br><br>
              Estou aqui para te ajudar com:<br>
              💡 Dúvidas sobre o sistema<br>
              📚 Suas disciplinas e planos<br>
              🎯 Dicas de estudo<br>
              ✨ O que você precisar!
            </p>
          </div>
        </div>
      </div>
      
      <!-- Input -->
      <div class="p-4 bg-white border-t border-blue-100">
        <div class="flex gap-2">
          <input 
            id="chatInput"
            type="text" 
            placeholder="Pergunte algo para Lilu..."
            class="flex-1 px-4 py-2 border border-blue-200 rounded-full focus:ring-2 focus:ring-[#122D6A] focus:outline-none focus:border-[#122D6A]"
            onkeypress="if(event.key === 'Enter') sendChatMessage()"
          />
          <button 
            onclick="sendChatMessage()"
            class="px-4 py-2 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-full hover:opacity-90 transition shadow-md">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Adicionar ao body se não existir
  if (!document.getElementById('chatButton')) {
    document.body.insertAdjacentHTML('beforeend', chatHtml);
  }
}

// Adicionar chatbot e FAB unificado ao carregar dashboard
const originalRenderDashboard = renderDashboard;
renderDashboard = async function() {
  await originalRenderDashboard();
  renderChatButton();
  // Criar FAB unificado com todos os botões
  setTimeout(() => {
    createUnifiedFAB();
  }, 100);
};

// ============== SISTEMA DE METAS SEMANAIS ==============

// Variável global para armazenar a semana atual
let semanaAtual = null

// Nomes dos dias da semana
const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const diasSemanaCompletos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// Cores por tipo de meta
const coresTipo = {
  teoria: { bg: 'bg-[#D0D9EB] dark:bg-[#0A1839]/30', border: 'border-[#8FA4CC] dark:border-[#1A3A7F]', text: 'text-[#122D6A] dark:text-[#6B83B5]', icon: '📖' },
  exercicios: { bg: 'bg-[#2A4A9F]/10 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300', icon: '✏️' },
  revisao: { bg: 'bg-[#6BB6FF]/10 dark:bg-[#0D1F4D]/30', border: 'border-[#A8D4FF] dark:border-[#0D1F4D]', text: 'text-[#0D1F4D] dark:text-[#7BC4FF]', icon: '🔄' }
}

// ✅ NOVO: Função para abrir modal de semanas anteriores
async function abrirSemanasAnteriores() {
  if (!currentUser) return;
  
  try {
    showLoading('Carregando histórico...');
    
    // Buscar todas as semanas do usuário
    const response = await axios.get(`/api/metas/semanas/${currentUser.id}`);
    const semanas = response.data || [];
    
    hideLoading();
    
    // Criar modal com lista de semanas
    const modalContainer = document.getElementById('modal-container') || document.createElement('div');
    modalContainer.id = 'modal-container';
    if (!document.getElementById('modal-container')) {
      document.body.appendChild(modalContainer);
    }
    
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="fecharModalSemanas()">
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] p-4 text-white">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <i class="fas fa-history text-xl"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold">Semanas Anteriores</h2>
                  <p class="text-xs opacity-80">Visualize e edite seu histórico de metas</p>
                </div>
              </div>
              <button onclick="fecharModalSemanas()" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          
          <!-- Lista de Semanas -->
          <div class="p-4 max-h-[60vh] overflow-y-auto">
            ${semanas.length === 0 ? `
              <div class="text-center py-8">
                <i class="fas fa-calendar-times text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Nenhuma semana encontrada</p>
                <p class="text-xs text-gray-400 mt-1">Gere metas para criar seu histórico</p>
              </div>
            ` : semanas.map((sem, idx) => {
              const dataInicio = new Date(sem.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              const dataFim = new Date(sem.data_fim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              const percentual = sem.metas_totais > 0 ? Math.round((sem.metas_concluidas / sem.metas_totais) * 100) : 0;
              const isAtiva = sem.status === 'ativa';
              
              return `
                <div class="flex items-center gap-3 p-3 rounded-xl ${isAtiva ? 'bg-[#E8EDF5] border-2 border-[#122D6A]' : 'bg-gray-50 hover:bg-gray-100'} mb-2 transition cursor-pointer group" 
                     onclick="carregarSemanaAnterior(${sem.id})">
                  <div class="w-12 h-12 rounded-xl ${isAtiva ? 'bg-[#122D6A]' : 'bg-gray-200'} flex items-center justify-center flex-shrink-0">
                    <span class="${isAtiva ? 'text-white' : 'text-gray-600'} font-bold">${sem.numero_semana}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-semibold text-gray-800">${dataInicio} - ${dataFim}</p>
                      ${isAtiva ? '<span class="text-[10px] bg-[#122D6A] text-white px-2 py-0.5 rounded-full">ATUAL</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <div class="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div class="h-full ${percentual === 100 ? 'bg-emerald-500' : percentual >= 50 ? 'bg-[#122D6A]' : percentual > 0 ? 'bg-amber-400' : 'bg-gray-300'} rounded-full" style="width: ${percentual}%"></div>
                      </div>
                      <span class="text-xs text-gray-500">${sem.metas_concluidas}/${sem.metas_totais}</span>
                    </div>
                  </div>
                  <i class="fas fa-chevron-right text-gray-400 group-hover:text-[#122D6A] transition"></i>
                </div>
              `;
            }).join('')}
          </div>
          
          <!-- Footer com aviso -->
          <div class="p-4 bg-amber-50 border-t border-amber-200">
            <p class="text-xs text-amber-700 flex items-start gap-2">
              <i class="fas fa-info-circle mt-0.5"></i>
              <span>Clique em uma semana para visualizar e editar suas metas. A semana atual está destacada em azul.</span>
            </p>
          </div>
        </div>
      </div>
    `;
    
    modalContainer.classList.remove('hidden');
  } catch (error) {
    hideLoading();
    console.error('Erro ao carregar semanas anteriores:', error);
    showToast('Erro ao carregar histórico de semanas', 'error');
  }
}

// Fechar modal de semanas
window.fecharModalSemanas = function() {
  const modal = document.getElementById('modal-container');
  if (modal) {
    modal.innerHTML = '';
    modal.classList.add('hidden');
  }
}

// Carregar uma semana específica para visualização/edição
window.carregarSemanaAnterior = async function(semanaId) {
  try {
    fecharModalSemanas();
    showLoading('Carregando semana...');
    
    // Buscar metas dessa semana específica
    const response = await axios.get(`/api/metas/semana/${semanaId}`);
    
    if (response.data) {
      semanaAtual = response.data;
      renderCalendarioSemanal();
      showToast(`Semana ${response.data.semana.numero_semana} carregada`, 'success');
    }
    
    hideLoading();
  } catch (error) {
    hideLoading();
    console.error('Erro ao carregar semana:', error);
    showToast('Erro ao carregar semana', 'error');
  }
}

// 1. Gerar metas semanais
async function gerarMetasSemana() {
  if (!currentUser) return

  try {
    // Verificar se já existe semana ativa
    const checkSemana = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`)
    if (checkSemana.data.semana && checkSemana.data.metas && checkSemana.data.metas.length > 0) {
      // Modal de confirmação moderno
      const confirmar = await mostrarModalConfirmacao(
        'Atenção: Já existe uma semana ativa!',
        `Você já tem ${checkSemana.data.metas.length} metas geradas para esta semana. Gerar novas metas pode afetar seu histórico de acompanhamento. Deseja continuar?`,
        'Gerar Nova Semana',
        'Cancelar'
      )
      if (!confirmar) return
    }

    showLoading('Gerando metas da semana...')

    // Buscar plano ativo
    const responsePlano = await axios.get(`/api/planos/ativo/${currentUser.id}`)
    if (!responsePlano.data) {
      showModal('Você precisa ter um plano de estudos ativo para gerar metas semanais.')
      return
    }

    const plano = responsePlano.data

    // ✅ CORREÇÃO: Usar HOJE como data de início, não próxima segunda
    // Se o usuário gera metas na quinta, as metas serão de quinta a domingo
    // Na próxima semana, será de segunda a domingo normalmente
    const hoje = new Date()
    const dataInicio = hoje.toISOString().split('T')[0]
    const diaSemanaHoje = hoje.getDay() // 0=Dom, 1=Seg, ...
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    console.log(`📅 Gerando metas começando hoje (${nomesDias[diaSemanaHoje]}, ${dataInicio})`)

    // Gerar metas
    const response = await axios.post(`/api/metas/gerar-semana/${currentUser.id}`, {
      plano_id: plano.id,
      data_inicio: dataInicio
    })

    console.log('✅ Metas semanais geradas:', response.data)
    
    // Sincronizar metas do dia atual
    await sincronizarMetasDia()
    
    hideLoading()
    showSuccess('Metas da semana geradas com sucesso!')
    
    // Recarregar dashboard
    await carregarSemanaAtiva()
    await renderDashboard() // Recarregar para mostrar metas diárias

  } catch (error) {
    console.error('Erro ao gerar metas semanais:', error)
    hideLoading()
    showError('Erro ao gerar metas da semana. Tente novamente.')
  }
}

// 2. Carregar semana ativa
async function carregarSemanaAtiva() {
  console.log('🔄 [DEBUG] carregarSemanaAtiva() iniciou')
  
  if (!currentUser) {
    console.log('❌ [DEBUG] currentUser não existe!')
    return
  }
  
  console.log('✅ [DEBUG] currentUser:', currentUser)

  try {
    console.log(`🌐 [DEBUG] Fazendo GET /api/metas/semana-ativa/${currentUser.id}`)
    const response = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`)
    semanaAtual = response.data

    console.log('📅 [DEBUG] Response.data recebido:', response.data)
    console.log('📅 [DEBUG] semanaAtual atribuído:', semanaAtual)
    console.log('📅 [DEBUG] semanaAtual.semana:', semanaAtual?.semana)
    console.log('📅 [DEBUG] semanaAtual.metas length:', semanaAtual?.metas?.length)

    // Renderizar calendário semanal
    console.log('🎨 [DEBUG] Chamando renderCalendarioSemanal()...')
    renderCalendarioSemanal()
    
    // Atualizar ícones de conteúdo após renderização
    setTimeout(() => {
      if (typeof atualizarTodosIconesConteudo === 'function') {
        atualizarTodosIconesConteudo();
      }
    }, 500);

  } catch (error) {
    console.error('❌ [DEBUG] Erro ao carregar semana ativa:', error)
  }
}

// 2b. Sincronizar metas semanais → diárias (hoje)
async function sincronizarMetasDia() {
  if (!currentUser) return

  try {
    console.log('🔄 Sincronizando metas do dia...')
    const response = await axios.post(`/api/metas/sincronizar-dia/${currentUser.id}`)
    
    if (response.data.criadas > 0) {
      console.log(`✅ ${response.data.criadas} metas diárias criadas`)
    } else {
      console.log('ℹ️  Metas diárias já existem para hoje')
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar metas:', error)
  }
}

// 3. Renderizar calendário semanal
function renderCalendarioSemanal() {
  console.log('🎨 [DEBUG] renderCalendarioSemanal() iniciou')
  console.log('🎨 [DEBUG] semanaAtual:', semanaAtual)
  
  const container = document.getElementById('calendario-semanal')
  if (!container) {
    console.log('❌ [DEBUG] Container calendario-semanal NÃO encontrado!')
    return
  }
  console.log('✅ [DEBUG] Container encontrado')

  if (!semanaAtual || !semanaAtual.semana) {
    console.log('⚠️ [DEBUG] Sem semana ativa, mostrando botão de gerar')
    container.innerHTML = `
      <div class="${themes[currentTheme].card} rounded-lg shadow-lg p-8 text-center">
        <i class="fas fa-calendar-week text-6xl ${themes[currentTheme].textSecondary} mb-4"></i>
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-2">Nenhuma semana ativa</h3>
        <p class="${themes[currentTheme].textSecondary} mb-4">Gere suas metas semanais para começar a estudar</p>
        <button onclick="gerarMetasSemana()" class="bg-[#122D6A] text-white px-6 py-3 rounded-lg hover:bg-[#0D1F4D] transition">
          <i class="fas fa-calendar-plus mr-2"></i>Gerar Metas da Semana
        </button>
      </div>
    `
    return
  }

  const { semana, metas } = semanaAtual
  console.log('✅ [DEBUG] Semana ativa encontrada:', semana)
  console.log('✅ [DEBUG] Metas encontradas:', metas ? metas.length : 0)

  // Agrupar metas por disciplina e dia
  const estruturaPlanilha = {}
  
  metas.forEach(meta => {
    if (!estruturaPlanilha[meta.disciplina_nome]) {
      estruturaPlanilha[meta.disciplina_nome] = {
        disciplina_id: meta.disciplina_id,
        dias: {}
      }
    }
    
    if (!estruturaPlanilha[meta.disciplina_nome].dias[meta.dia_semana]) {
      estruturaPlanilha[meta.disciplina_nome].dias[meta.dia_semana] = []
    }
    
    estruturaPlanilha[meta.disciplina_nome].dias[meta.dia_semana].push(meta)
  })

  const disciplinasOrdenadas = Object.keys(estruturaPlanilha).sort()
  
  // ✅ LOG DEBUG: Mostrar disciplinas exibidas no cronograma
  console.log(`📊 CRONOGRAMA - Disciplinas exibidas (${disciplinasOrdenadas.length}):`, disciplinasOrdenadas.join(', '))
  console.log(`📊 CRONOGRAMA - Total de metas:`, metas.length)
  
  const dataInicioFormatada = new Date(semana.data_inicio).toLocaleDateString('pt-BR')
  const dataFimFormatada = new Date(semana.data_fim).toLocaleDateString('pt-BR')
  const diasSemanaAbrev = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  container.innerHTML = `
    <div class="semana-resumo-card ${themes[currentTheme].card} rounded-xl shadow-md p-3 mb-3 border ${themes[currentTheme].border}">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] flex items-center justify-center">
            <i class="fas fa-calendar-week text-white"></i>
          </div>
          <div>
            <h2 class="text-sm font-bold ${themes[currentTheme].text}">
              Semana ${semana.numero_semana} • ${dataInicioFormatada} a ${dataFimFormatada}
            </h2>
            <p class="${themes[currentTheme].textSecondary} text-xs">
              ${semana.metas_concluidas}/${semana.metas_totais} concluídas
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- ✅ NOVO: Botão Semanas Anteriores -->
          <button onclick="abrirSemanasAnteriores()" class="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all" title="Ver semanas anteriores">
            <i class="fas fa-history"></i>
            <span class="hidden sm:inline">Anteriores</span>
          </button>
          <button onclick="gerarMetasSemana()" class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-lg text-xs font-medium hover:shadow-lg hover:scale-105 transition-all">
            <i class="fas fa-magic"></i>
            <span>Gerar Metas</span>
          </button>
        </div>
      </div>
      <div class="mt-2">
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] h-1.5 rounded-full transition-all" 
               style="width: ${semana.metas_totais > 0 ? (semana.metas_concluidas / semana.metas_totais * 100) : 0}%">
          </div>
        </div>
      </div>
    </div>

    <!-- Calendário Semanal Compacto - Design UX Moderno -->
    <div class="calendario-semanal ${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} shadow-sm overflow-hidden">
      ${[1, 2, 3, 4, 5, 6, 7].map(diaSemana => {
        const metasDoDia = metas.filter(m => m.dia_semana === diaSemana)
        const metasConcluidasDia = metasDoDia.filter(m => m.concluida).length
        const percentualDia = metasDoDia.length > 0 ? Math.round((metasConcluidasDia / metasDoDia.length) * 100) : 0
        
        const hoje = new Date()
        const diaSemanaAtual = hoje.getDay() === 0 ? 7 : hoje.getDay()
        const isHoje = diaSemana === diaSemanaAtual
        
        // Nomes completos dos dias
        const diasNomes = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
        
        // Cores do progresso - usando padrão do sistema
        const progressColor = percentualDia === 100 ? 'bg-emerald-500' : percentualDia >= 50 ? 'bg-[#122D6A]' : percentualDia > 0 ? 'bg-amber-400' : 'bg-gray-200'
        const progressTextColor = percentualDia === 100 ? 'text-emerald-600' : percentualDia >= 50 ? 'text-[#122D6A]' : percentualDia > 0 ? 'text-amber-600' : 'text-gray-400'
        
        return `
          <div class="${isHoje ? 'bg-[#E8EDF5] border-l-4 border-l-[#122D6A]' : themes[currentTheme].card} ${diaSemana < 7 ? 'border-b ' + themes[currentTheme].border : ''} p-3 hover:bg-[#E8EDF5]/50 transition-colors">
            <!-- Header do Dia -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <span class="w-10 h-10 rounded-xl ${isHoje ? 'bg-[#122D6A] text-white shadow-lg' : 'bg-gray-100 text-gray-600'} flex items-center justify-center text-sm font-bold">
                    ${diasSemanaAbrev[diaSemana - 1]}
                  </span>
                  <div>
                    <p class="text-sm font-semibold ${themes[currentTheme].text}">${diasNomes[diaSemana - 1]}</p>
                    <p class="text-[10px] ${themes[currentTheme].textSecondary}">${metasDoDia.length} ${metasDoDia.length === 1 ? 'meta' : 'metas'} ${isHoje ? '• <span class="text-[#122D6A] font-semibold">HOJE</span>' : ''}</p>
                  </div>
                </div>
              </div>
              
              <!-- Progresso do Dia -->
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-24 bg-gray-200 rounded-full h-2">
                    <div class="${progressColor} h-2 rounded-full transition-all duration-500" style="width: ${percentualDia}%"></div>
                  </div>
                  <span class="text-sm font-bold ${progressTextColor} min-w-[40px] text-right">${percentualDia}%</span>
                </div>
                <span class="text-xs ${themes[currentTheme].textSecondary} bg-gray-100 px-2 py-1 rounded-full">${metasConcluidasDia}/${metasDoDia.length}</span>
              </div>
            </div>
            
            <!-- Cards das Metas - Layout Responsivo e Espaçado -->
            ${metasDoDia.length > 0 ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                ${metasDoDia.map(meta => {
                  const tipoIcon = meta.tipo === 'teoria' ? 'fa-book' : meta.tipo === 'exercicios' ? 'fa-pencil-alt' : 'fa-sync'
                  const tipoBg = meta.tipo === 'teoria' ? 'bg-[#E8EDF5] text-[#122D6A]' : meta.tipo === 'exercicios' ? 'bg-[#6BB6FF]/10 text-[#2A4A9F]' : 'bg-amber-100 text-amber-700'
                  const tipoLabel = meta.tipo === 'teoria' ? 'Teoria' : meta.tipo === 'exercicios' ? 'Exercícios' : 'Revisão'
                  
                  return `
                    <div class="meta-card group relative flex flex-col p-3 rounded-xl border-2 transition-all cursor-pointer ${meta.concluida 
                      ? 'bg-emerald-50 border-emerald-300 hover:border-emerald-400' 
                      : 'bg-white border-gray-200 hover:border-[#122D6A] hover:shadow-md'}"
                      style="min-width: 0;">
                      
                      <!-- Status Badge -->
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoBg}">
                          <i class="fas ${tipoIcon} text-[8px]"></i>
                          ${tipoLabel}
                        </span>
                        ${meta.concluida 
                          ? '<span class="flex items-center gap-1 text-[10px] text-emerald-600 font-medium"><i class="fas fa-check-circle"></i>Feito</span>' 
                          : `<span class="text-[10px] text-gray-500">${meta.tempo_minutos || 60}min</span>`}
                      </div>
                      
                      <!-- Disciplina -->
                      <p class="text-sm font-semibold text-gray-800 mb-1 line-clamp-2 ${meta.concluida ? 'line-through opacity-70' : ''}">${meta.disciplina_nome}</p>
                      
                      <!-- Tópico se existir -->
                      ${(meta.topicos_sugeridos && meta.topicos_sugeridos[0]?.nome) ? `<p class="text-xs text-gray-500 line-clamp-1 mb-2">${meta.topicos_sugeridos[0].nome}</p>` : '<div class="mb-2"></div>'}
                      
                      <!-- Ações -->
                      <div class="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100 group/actions">
                        ${meta.concluida ? `
                          <button onclick="event.stopPropagation(); abrirConteudo(${meta.id})" class="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition">
                            <i class="fas fa-eye text-[10px]"></i> Ver
                          </button>
                        ` : `
                          <button onclick="event.stopPropagation(); abrirConteudo(${meta.id})" class="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-[#122D6A] hover:bg-[#0D1F4D] rounded-lg transition shadow-sm">
                            <i class="fas fa-play text-[10px]"></i> Estudar
                          </button>
                        `}
                        
                        <!-- Ícones de conteúdo - sempre visíveis (opacidade indica se tem conteúdo) -->
                        <div class="flex items-center gap-0.5" id="conteudos-meta-${meta.id}">
                          <button onclick="event.stopPropagation(); window.metaAtual = { id: ${meta.id}, topico_nome: '${meta.topico_nome?.replace(/'/g, "\\'") || ''}', disciplina_nome: '${meta.disciplina_nome?.replace(/'/g, "\\'") || ''}', topico_id: ${meta.topico_id || 'null'} }; verConteudoGerado(${meta.id}, 'teoria')" 
                            class="w-6 h-6 rounded flex items-center justify-center bg-[#E8EDF5] hover:bg-[#122D6A] hover:text-white transition-all cursor-pointer" 
                            title="Teoria - Clique para ver ou gerar" data-tipo="teoria" id="icon-teoria-${meta.id}">
                            <i class="fas fa-book text-[10px] text-[#122D6A] hover:text-white"></i>
                          </button>
                          <button onclick="event.stopPropagation(); window.metaAtual = { id: ${meta.id}, topico_nome: '${meta.topico_nome?.replace(/'/g, "\\'") || ''}', disciplina_nome: '${meta.disciplina_nome?.replace(/'/g, "\\'") || ''}', topico_id: ${meta.topico_id || 'null'} }; verConteudoGerado(${meta.id}, 'exercicios')" 
                            class="w-6 h-6 rounded flex items-center justify-center bg-[#E8EDF5] hover:bg-[#2A4A9F] hover:text-white transition-all cursor-pointer" 
                            title="Exercícios - Clique para ver ou gerar" data-tipo="exercicios" id="icon-exercicios-${meta.id}">
                            <i class="fas fa-tasks text-[10px] text-[#2A4A9F] hover:text-white"></i>
                          </button>
                          <button onclick="event.stopPropagation(); window.metaAtual = { id: ${meta.id}, topico_nome: '${meta.topico_nome?.replace(/'/g, "\\'") || ''}', disciplina_nome: '${meta.disciplina_nome?.replace(/'/g, "\\'") || ''}', topico_id: ${meta.topico_id || 'null'} }; verConteudoGerado(${meta.id}, 'resumo')" 
                            class="w-6 h-6 rounded flex items-center justify-center bg-[#E8EDF5] hover:bg-[#3A5AB0] hover:text-white transition-all cursor-pointer" 
                            title="Resumo - Clique para ver ou gerar" data-tipo="resumo" id="icon-resumo-${meta.id}">
                            <i class="fas fa-file-alt text-[10px] text-[#3A5AB0] hover:text-white"></i>
                          </button>
                          <button onclick="event.stopPropagation(); window.metaAtual = { id: ${meta.id}, topico_nome: '${meta.topico_nome?.replace(/'/g, "\\'") || ''}', disciplina_nome: '${meta.disciplina_nome?.replace(/'/g, "\\'") || ''}', topico_id: ${meta.topico_id || 'null'} }; verConteudoGerado(${meta.id}, 'flashcards')" 
                            class="w-6 h-6 rounded flex items-center justify-center bg-[#E8EDF5] hover:bg-[#4A6AC0] hover:text-white transition-all cursor-pointer" 
                            title="Flashcards - Clique para ver ou gerar" data-tipo="flashcards" id="icon-flashcards-${meta.id}">
                            <i class="fas fa-clone text-[10px] text-[#4A6AC0] hover:text-white"></i>
                          </button>
                          <button onclick="event.stopPropagation(); window.metaAtual = { id: ${meta.id}, topico_nome: '${meta.topico_nome?.replace(/'/g, "\\'") || ''}', disciplina_nome: '${meta.disciplina_nome?.replace(/'/g, "\\'") || ''}', topico_id: ${meta.topico_id || 'null'} }; abrirModalResumoPersonalizado(${meta.id})" 
                            class="w-6 h-6 rounded flex items-center justify-center bg-[#E8EDF5] hover:bg-[#8B5CF6] hover:text-white transition-all cursor-pointer" 
                            title="Resumo Personalizado - Upload de PDF/Documento" data-tipo="resumo_personalizado" id="icon-resumo-personalizado-${meta.id}">
                            <i class="fas fa-file-upload text-[10px] text-[#8B5CF6] hover:text-white"></i>
                          </button>
                        </div>
                        
                        ${!meta.concluida ? `
                          <button onclick="event.stopPropagation(); marcarMetaConcluida(${meta.id})" class="flex items-center justify-center w-7 h-7 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition" title="Marcar como concluída">
                            <i class="fas fa-check text-[10px]"></i>
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `
                }).join('')}
              </div>
            ` : `
              <div class="flex items-center justify-center py-3 ${themes[currentTheme].textSecondary}">
                <i class="fas fa-coffee mr-2"></i>
                <span class="text-xs">Dia livre</span>
              </div>
            `}
          </div>
        `
      }).join('')}
    </div>
  `
}
function renderGraficosProgresso() {
  if (!semanaAtual || !semanaAtual.semana || !semanaAtual.metas) return

  const { semana, metas } = semanaAtual

  // === GRÁFICO 1: Progresso Diário ===
  const ctxDiario = document.getElementById('chart-progresso-diario')
  if (ctxDiario) {
    // Agrupar por dia da semana
    const metasPorDia = {}
    const metasConcluidasPorDia = {}
    
    for (let i = 1; i <= 7; i++) {
      metasPorDia[i] = 0
      metasConcluidasPorDia[i] = 0
    }

    metas.forEach(meta => {
      metasPorDia[meta.dia_semana]++
      if (meta.concluida) {
        metasConcluidasPorDia[meta.dia_semana]++
      }
    })

    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const dataTotal = [1, 2, 3, 4, 5, 6, 7].map(dia => metasPorDia[dia])
    const dataConcluidas = [1, 2, 3, 4, 5, 6, 7].map(dia => metasConcluidasPorDia[dia])

    // Destruir gráfico anterior se existir
    if (window.chartProgressoDiario) {
      window.chartProgressoDiario.destroy()
    }

    window.chartProgressoDiario = new Chart(ctxDiario, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Metas Totais',
            data: dataTotal,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2
          },
          {
            label: 'Concluídas',
            data: dataConcluidas,
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 10 }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { size: 10 }
            }
          },
          x: {
            ticks: {
              font: { size: 10 }
            }
          }
        }
      }
    })
  }

  // === GRÁFICO 2: Tempo por Disciplina ===
  const ctxDisciplina = document.getElementById('chart-tempo-disciplina')
  if (ctxDisciplina) {
    // Agrupar tempo por disciplina
    const tempoPorDisciplina = {}
    
    metas.forEach(meta => {
      if (!tempoPorDisciplina[meta.disciplina_nome]) {
        tempoPorDisciplina[meta.disciplina_nome] = 0
      }
      tempoPorDisciplina[meta.disciplina_nome] += meta.tempo_minutos
    })

    // Ordenar por tempo (top 5)
    const disciplinasOrdenadas = Object.entries(tempoPorDisciplina)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const labels = disciplinasOrdenadas.map(d => {
      const nome = d[0]
      return nome.length > 20 ? nome.substring(0, 17) + '...' : nome
    })
    const data = disciplinasOrdenadas.map(d => d[1])

    // Cores variadas
    const cores = [
      'rgba(59, 130, 246, 0.7)',  // Azul
      'rgba(34, 197, 94, 0.7)',   // Verde
      'rgba(168, 85, 247, 0.7)',  // Roxo
      'rgba(251, 146, 60, 0.7)',  // Laranja
      'rgba(236, 72, 153, 0.7)'   // Rosa
    ]

    // Destruir gráfico anterior se existir
    if (window.chartTempoDisciplina) {
      window.chartTempoDisciplina.destroy()
    }

    window.chartTempoDisciplina = new Chart(ctxDisciplina, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: cores,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { size: 9 },
              padding: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || ''
                const value = context.parsed || 0
                const total = context.dataset.data.reduce((a, b) => a + b, 0)
                const percent = ((value / total) * 100).toFixed(1)
                return `${label}: ${value}min (${percent}%)`
              }
            }
          }
        }
      }
    })
  }
}

// ===== NOVA FUNÇÃO: Renderizar célula da tabela semanal =====
function renderCelulaMeta(meta, mobile = false) {
  // Ícones e cores por tipo
  const tipoConfig = {
    teoria: { icone: '📖', cor: 'blue', label: 'Teoria' },
    exercicios: { icone: '📝', cor: 'purple', label: 'Exercícios' },
    revisao: { icone: '🎯', cor: 'orange', label: 'Revisão' }
  }
  
  const config = tipoConfig[meta.tipo] || tipoConfig.teoria
  
  // Estados visuais - CORES HARMONIZADAS tema claro
  const estadoVisual = meta.concluida 
    ? {
        bg: 'bg-green-50',
        border: 'border-green-400',
        text: 'text-green-800',
        badge: 'bg-[#122D6A]',
        badgeIcon: 'fa-check-circle'
      }
    : meta.conteudo_gerado 
    ? {
        bg: 'bg-[#E8EDF5]',
        border: 'border-blue-400',
        text: 'text-[#0D1F4D]',
        badge: 'bg-[#122D6A]',
        badgeIcon: 'fa-file-check'
      }
    : {
        bg: 'bg-white',
        border: 'border-[#8FA4CC]',
        text: 'text-[#0D1F4D]',
        badge: 'bg-[#122D6A]',
        badgeIcon: 'fa-clock'
      }
  
  const tempoFormatado = meta.tempo_minutos >= 60 
    ? `${Math.floor(meta.tempo_minutos / 60)}h${meta.tempo_minutos % 60 > 0 ? meta.tempo_minutos % 60 : ''}`
    : `${meta.tempo_minutos}min`

  // Tópicos para tooltip (já vem como array da API)
  let topicos = []
  if (meta.topicos_sugeridos) {
    // Se vier como string, parseia; se vier como array, usa direto
    topicos = typeof meta.topicos_sugeridos === 'string' 
      ? JSON.parse(meta.topicos_sugeridos) 
      : meta.topicos_sugeridos
  }
  const tituloTooltip = topicos.length > 0 
    ? `📚 ${topicos.map(t => t.nome).join(' | ')}`
    : 'Sem tópicos definidos'

  if (mobile) {
    // Versão mobile: ícone compacto
    return `
      <div 
        class="relative w-8 h-8 rounded-lg ${estadoVisual.bg} ${estadoVisual.border} border flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm"
        onclick="abrirDetalhesMetaCelula(${meta.id})"
        title="${config.label} - ${tempoFormatado}">
        <span class="text-base">${config.icone}</span>
        ${meta.concluida || meta.conteudo_gerado ? `
          <div class="absolute -top-0.5 -right-0.5 w-3 h-3 ${estadoVisual.badge} rounded-full border border-white shadow-sm flex items-center justify-center">
            <i class="fas ${estadoVisual.badgeIcon} text-white text-[6px]"></i>
          </div>
        ` : ''}
      </div>
    `
  }

  // Versão desktop: card SUPER COMPACTO com tópico SEMPRE visível
  return `
    <div 
      class="relative ${estadoVisual.bg} ${estadoVisual.border} border rounded-md p-1 hover:shadow-lg transition-all group cursor-pointer mb-0.5"
      onclick="abrirDetalhesMetaCelula(${meta.id})"
      style="min-height: 42px;">
      
      <!-- Ícone + Badge -->
      <div class="flex flex-col items-center justify-center mb-0.5">
        <span class="text-xl">${config.icone}</span>
        <span class="text-[7px] font-bold ${estadoVisual.text} mt-0.5">⏱️ ${tempoFormatado}</span>
        ${topicos.length > 0 ? `
          <div class="absolute top-1 right-1 bg-[#122D6A] text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm" title="${tituloTooltip}">
            <i class="fas fa-book text-[8px]"></i>
          </div>
        ` : ''}
      </div>
      
      <!-- Tópico SEMPRE visível -->
      ${topicos.length > 0 ? `
        <div class="text-[8px] ${estadoVisual.text} text-center font-medium px-0.5 leading-tight line-clamp-2" title="${tituloTooltip}">
          ${topicos.map(t => t.nome).join(', ')}
        </div>
      ` : `
        <div class="text-[8px] text-gray-400 dark:text-gray-500 text-center italic px-0.5">
          Sem tópico
        </div>
      `}

      <!-- Botões de ação compactos (hover) -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity mt-1 space-y-1">
        <!-- Botão Estudar - leva para Minhas Disciplinas -->
        <button 
          onclick="event.stopPropagation(); irParaDisciplinaComTopico(${meta.disciplina_id}, '${(meta.disciplina_nome || '').replace(/'/g, "\\'")}', ${topicos.length > 0 && topicos[0].id ? topicos[0].id : 0})"
          class="w-full text-[10px] bg-[#122D6A] hover:bg-[#0D1F4D] text-white py-1 px-2 rounded flex items-center justify-center gap-1"
          title="Estudar tópico">
          <i class="fas fa-book-open text-[9px]"></i>
          <span>Estudar</span>
        </button>
        
        <button 
          onclick="event.stopPropagation(); toggleMetaSemanal(${meta.id})"
          class="w-full text-[10px] ${meta.concluida ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#122D6A] hover:bg-[#0D1F4D]'} text-white py-1 px-2 rounded flex items-center justify-center gap-1">
          <i class="fas ${meta.concluida ? 'fa-undo' : 'fa-check-circle'} text-[9px]"></i>
          <span>${meta.concluida ? 'Reabrir' : 'OK'}</span>
        </button>
      </div>

      <!-- Badge de status compacto -->
      ${meta.concluida || meta.conteudo_gerado ? `
        <div class="absolute -top-1 -right-1 w-4 h-4 ${estadoVisual.badge} rounded-full border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center">
          <i class="fas ${estadoVisual.badgeIcon} text-white text-[8px]"></i>
        </div>
      ` : ''}
    </div>
  `
}

// 4. Renderizar card individual de meta (draggable)
function renderCardMeta(meta) {
  const cores = coresTipo[meta.tipo] || coresTipo.teoria
  
  return `
    <div 
      class="${cores.bg} ${cores.border} border rounded-lg p-2 cursor-move transition hover:shadow-md"
      data-meta-id="${meta.id}"
      draggable="true"
      ondragstart="handleDragStart(event)"
      ondragend="handleDragEnd(event)">
      
      <!-- Checkbox e Disciplina -->
      <div class="flex items-start gap-2 mb-1">
        <input 
          type="checkbox" 
          ${meta.concluida ? 'checked' : ''}
          onchange="toggleMetaSemanal(${meta.id}, ${meta.tempo_minutos})"
          class="mt-1 w-4 h-4 rounded border-gray-300 text-[#1A3A7F] focus:ring-[#1A3A7F] cursor-pointer"
          onclick="event.stopPropagation()">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-xs ${cores.text} truncate" title="${meta.disciplina_nome}">
            ${cores.icon} ${meta.disciplina_nome}
          </div>
          <div class="text-xs ${themes[currentTheme].textSecondary}">
            ${meta.tempo_minutos} min
          </div>
        </div>
      </div>

      <!-- Ações (mostrar no hover) -->
      <div class="flex gap-1 mt-2 pt-2 border-t ${cores.border} opacity-0 group-hover:opacity-100 transition">
        ${meta.conteudo_gerado ? `
          <button 
            onclick="visualizarConteudoPorId(${meta.conteudo_id}); event.stopPropagation()"
            class="flex-1 text-xs bg-[#122D6A] text-white px-2 py-1 rounded hover:bg-[#0D1F4D]"
            title="Ver conteúdo">
            <i class="fas fa-eye"></i>
          </button>
        ` : `
          <button 
            onclick="gerarConteudoMetaSemanal(${meta.id}); event.stopPropagation()"
            class="flex-1 text-xs bg-[#122D6A] text-white px-2 py-1 rounded hover:bg-[#0D1F4D]"
            title="Gerar conteúdo">
            <i class="fas fa-magic"></i>
          </button>
        `}
        <button 
          onclick="abrirModalEditar(${meta.id}); event.stopPropagation()"
          class="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
          title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button 
          onclick="excluirMetaSemanal(${meta.id}); event.stopPropagation()"
          class="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
          title="Excluir">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
}

// 4b. Renderizar card compacto para mobile
function renderCardMetaMobile(meta) {
  const cores = coresTipo[meta.tipo] || coresTipo.teoria
  
  return `
    <div 
      class="${cores.bg} ${cores.border} border rounded-lg p-2 transition"
      data-meta-id="${meta.id}">
      
      <!-- Header compacto -->
      <div class="flex items-center gap-2 mb-2">
        <input 
          type="checkbox" 
          ${meta.concluida ? 'checked' : ''}
          onchange="toggleMetaSemanal(${meta.id}, ${meta.tempo_minutos})"
          class="w-4 h-4 rounded border-gray-300 text-[#1A3A7F] focus:ring-[#1A3A7F] cursor-pointer">
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-xs ${cores.text} truncate">
            ${cores.icon} ${meta.disciplina_nome}
          </div>
        </div>
        <div class="text-xs ${themes[currentTheme].textSecondary}">
          ${meta.tempo_minutos}m
        </div>
      </div>

      <!-- Ações sempre visíveis em mobile -->
      <div class="flex gap-1">
        ${meta.conteudo_gerado ? `
          <button 
            onclick="visualizarConteudoPorId(${meta.conteudo_id})"
            class="flex-1 text-xs bg-[#122D6A] text-white px-2 py-1.5 rounded hover:bg-[#0D1F4D]"
            title="Ver conteúdo">
            <i class="fas fa-eye mr-1"></i>Ver
          </button>
        ` : `
          <button 
            onclick="gerarConteudoMetaSemanal(${meta.id})"
            class="flex-1 text-xs bg-[#122D6A] text-white px-2 py-1.5 rounded hover:bg-[#0D1F4D]"
            title="Gerar conteúdo">
            <i class="fas fa-magic mr-1"></i>Gerar
          </button>
        `}
        <button 
          onclick="abrirModalEditar(${meta.id})"
          class="text-xs bg-gray-500 text-white px-2 py-1.5 rounded hover:bg-gray-600">
          <i class="fas fa-edit"></i>
        </button>
        <button 
          onclick="excluirMetaSemanal(${meta.id})"
          class="text-xs bg-red-500 text-white px-2 py-1.5 rounded hover:bg-red-600">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
}

// 5. Toggle meta semanal (concluir/desmarcar)
async function toggleMetaSemanal(metaId, tempoMinutos) {
  try {
    const meta = semanaAtual.metas.find(m => m.id === metaId)
    
    if (meta.concluida) {
      // Desmarcar
      await axios.put(`/api/metas/desmarcar/${metaId}`)
      showSuccess('Meta desmarcada')
    } else {
      // Marcar como concluída - Modal moderno
      const tempoReal = await mostrarModalTempoEstudo(meta.disciplina_nome, tempoMinutos)
      if (!tempoReal) return
      
      await axios.put(`/api/metas/concluir/${metaId}`, {
        tempo_real_minutos: parseInt(tempoReal)
      })
      showSuccess('Meta concluída! 🎉')
    }

    // Recarregar
    await carregarSemanaAtiva()

  } catch (error) {
    console.error('Erro ao toggle meta:', error)
    showError('Erro ao atualizar meta')
  }
}

// 6. Gerar conteúdo para meta semanal
// Recriar conteúdo (apaga o antigo e gera novo)
async function recriarConteudo(conteudoId, metaId) {
  const confirmed = await showConfirm('Deseja recriar este conteúdo?\n\nO material atual será substituído por um novo.', {
    title: 'Recriar Conteúdo',
    confirmText: 'Sim, recriar',
    cancelText: 'Cancelar',
    type: 'warning'
  });
  if (!confirmed) return;
  
  try {
    showLoading('Recriando conteúdo...');
    
    // Buscar dados da meta
    const response = await axios.get(`/api/metas/semana-ativa/${currentUser.id}`);
    const meta = response.data.metas.find(m => m.id === metaId);
    
    if (!meta) {
      throw new Error('Meta não encontrada');
    }
    
    // Deletar conteúdo antigo
    await axios.delete(`/api/conteudos/${conteudoId}`);
    
    // Gerar novo conteúdo
    const novoConteudo = await axios.post('/api/conteudo/gerar', {
      meta_id: metaId,
      user_id: currentUser.id,
      disciplina_id: meta.disciplina_id,
      tipo: meta.tipo,
      tempo_minutos: meta.tempo_minutos,
      topicos: meta.topicos_sugeridos || []
    });
    
    hideLoading();
    showSuccess('✅ Conteúdo recriado com sucesso!');
    
    // Recarregar o novo conteúdo
    await visualizarConteudoPorId(novoConteudo.data.id);
    
  } catch (error) {
    console.error('Erro ao recriar conteúdo:', error);
    hideLoading();
    showError('❌ Erro ao recriar conteúdo: ' + (error.response?.data?.erro || error.message));
  }
}

async function gerarConteudoMetaSemanal(metaId) {
  try {
    showLoading('Gerando conteúdo...')
    
    const meta = semanaAtual.metas.find(m => m.id === metaId)
    if (!meta) return

    const response = await axios.post('/api/conteudo/gerar', {
      meta_id: metaId,
      user_id: currentUser.id,
      disciplina_id: meta.disciplina_id,
      tipo: meta.tipo,
      tempo_minutos: meta.tempo_minutos,
      topicos: meta.topicos_sugeridos || []
    })

    hideLoading()
    showSuccess('Conteúdo gerado com sucesso!')
    await carregarSemanaAtiva()

  } catch (error) {
    console.error('Erro ao gerar conteúdo:', error)
    hideLoading()
    showError('Erro ao gerar conteúdo')
  }
}

// 7. Excluir meta semanal
async function excluirMetaSemanal(metaId) {
  const confirmed = await showConfirm('Deseja realmente excluir esta meta?\n\nEsta ação não pode ser desfeita.', {
    title: 'Excluir Meta',
    confirmText: 'Sim, excluir',
    cancelText: 'Cancelar',
    type: 'danger'
  });
  if (!confirmed) return

  try {
    await axios.delete(`/api/metas/excluir/${metaId}`)
    showSuccess('Meta excluída')
    await carregarSemanaAtiva()
  } catch (error) {
    console.error('Erro ao excluir meta:', error)
    showError('Erro ao excluir meta')
  }
}

// ============== DRAG AND DROP ==============

let metaArrastada = null

function handleDragStart(event) {
  metaArrastada = {
    id: event.target.dataset.metaId,
    diaOrigem: event.target.closest('[data-dia]').dataset.dia
  }
  event.target.style.opacity = '0.4'
  event.dataTransfer.effectAllowed = 'move'
}

function handleDragEnd(event) {
  event.target.style.opacity = '1'
}

function handleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  const coluna = event.currentTarget
  coluna.classList.add('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/20')
}

function handleDragLeave(event) {
  const coluna = event.currentTarget
  coluna.classList.remove('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/20')
}

async function handleDrop(event) {
  event.preventDefault()
  
  const coluna = event.currentTarget
  coluna.classList.remove('bg-[#E8EDF5]', 'dark:bg-[#0A1839]/20')
  
  if (!metaArrastada) return
  
  const novoDia = parseInt(coluna.dataset.dia)
  const novaData = coluna.dataset.data
  const diaOrigem = parseInt(metaArrastada.diaOrigem)
  
  // Se não mudou de dia, não faz nada
  if (novoDia === diaOrigem) return
  
  try {
    // Remanejar meta no backend
    await axios.put(`/api/metas/remanejar/${metaArrastada.id}`, {
      novo_dia_semana: novoDia,
      nova_data: novaData,
      nova_ordem: 0
    })
    
    showSuccess(`Meta movida para ${diasSemanaCompletos[novoDia % 7]}`)
    
    // Recarregar calendário
    await carregarSemanaAtiva()
    
  } catch (error) {
    console.error('Erro ao remanejar meta:', error)
    showError('Erro ao mover meta')
  }
  
  metaArrastada = null
}

// ============== MODAIS ==============

// Modal de Detalhes da Meta Célula
async function abrirDetalhesMetaCelula(metaId) {
  const modal = document.getElementById('modal-container')
  if (!modal) return

  // Buscar dados da meta
  const meta = semanaAtual.metas.find(m => m.id === metaId)
  if (!meta) {
    showModal('Meta não encontrada', { type: 'error' })
    return
  }

  const topicos = meta.topicos_sugeridos ? JSON.parse(meta.topicos_sugeridos) : []
  const tempoFormatado = meta.tempo_minutos >= 60 
    ? `${Math.floor(meta.tempo_minutos / 60)}h ${meta.tempo_minutos % 60 > 0 ? meta.tempo_minutos % 60 + 'min' : ''}`
    : `${meta.tempo_minutos} minutos`

  const iconesTipo = {
    teoria: '📖 Teoria',
    exercicios: '📝 Exercícios',
    revisao: '🎯 Revisão'
  }

  modal.innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="fecharModal(event)">
      <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        
        <!-- Header -->
        <div class="bg-[#122D6A] text-white p-4 rounded-t-lg">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold">📋 Detalhes da Meta</h3>
            <button onclick="fecharModal()" class="text-white hover:text-gray-200">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          
          <!-- Disciplina -->
          <div>
            <label class="text-sm font-semibold ${themes[currentTheme].textSecondary}">Disciplina</label>
            <div class="text-lg font-bold ${themes[currentTheme].text}">${meta.disciplina_nome}</div>
          </div>

          <!-- Tipo e Tempo -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold ${themes[currentTheme].textSecondary}">Tipo</label>
              <div class="font-bold ${themes[currentTheme].text}">${iconesTipo[meta.tipo] || meta.tipo}</div>
            </div>
            <div>
              <label class="text-sm font-semibold ${themes[currentTheme].textSecondary}">Tempo</label>
              <div class="font-bold ${themes[currentTheme].text}">${tempoFormatado}</div>
            </div>
          </div>

          <!-- Data -->
          <div>
            <label class="text-sm font-semibold ${themes[currentTheme].textSecondary}">Data</label>
            <div class="font-bold ${themes[currentTheme].text}">${new Date(meta.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
          </div>

          <!-- Tópicos -->
          ${topicos.length > 0 ? `
            <div>
              <label class="text-sm font-semibold ${themes[currentTheme].textSecondary} mb-2 block">Tópicos Sugeridos</label>
              <ul class="space-y-2">
                ${topicos.map((t, idx) => `
                  <li class="flex items-center gap-2 ${themes[currentTheme].text} p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <i class="fas fa-book text-[#1A3A7F]"></i>
                    <span class="text-sm flex-1">${t.nome}</span>
                    <button 
                      onclick="irParaTopicoNaDisciplina(${meta.disciplina_id}, '${meta.disciplina_nome.replace(/'/g, "\\'")}', ${t.id || 0}); fecharModal()"
                      class="text-xs bg-[#122D6A] text-white px-2 py-1 rounded hover:bg-[#0D1F4D] transition"
                      title="Ver tópico em Minhas Disciplinas">
                      <i class="fas fa-external-link-alt"></i>
                    </button>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- Status -->
          <div>
            <label class="text-sm font-semibold ${themes[currentTheme].textSecondary}">Status</label>
            <div class="flex items-center gap-2 mt-1">
              ${meta.concluida ? `
                <span class="inline-flex items-center gap-2 bg-[#2A4A9F]/10 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                  <i class="fas fa-check-circle"></i>
                  Concluída
                </span>
              ` : meta.conteudo_gerado ? `
                <span class="inline-flex items-center gap-2 bg-[#D0D9EB] dark:bg-[#0A1839]/30 text-[#122D6A] dark:text-[#4A6491] px-3 py-1 rounded-full text-sm font-semibold">
                  <i class="fas fa-file-alt"></i>
                  Conteúdo Gerado
                </span>
              ` : `
                <span class="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-400 px-3 py-1 rounded-full text-sm font-semibold">
                  <i class="fas fa-clock"></i>
                  Pendente
                </span>
              `}
            </div>
          </div>

          <!-- Ações -->
          <div class="pt-4 border-t ${themes[currentTheme].border} space-y-2">
            
            <!-- Botão para ir para a disciplina -->
            <button 
              onclick="irParaTopicoNaDisciplina(${meta.disciplina_id}, '${meta.disciplina_nome.replace(/'/g, "\\'")}'); fecharModal()"
              class="w-full bg-[#122D6A] text-white py-3 px-4 rounded-lg hover:bg-[#0D1F4D] transition font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-book-open"></i>
              Ver Tópicos da Disciplina
            </button>
            
            <!-- Botão para ajustar tópico estudado -->
            ${topicos.length > 0 ? `
              <button 
                onclick="ajustarTopicoEstudado(${meta.id}, ${meta.disciplina_id}, '${meta.disciplina_nome.replace(/'/g, "\\'")}'); fecharModal()"
                class="w-full bg-amber-500 text-white py-3 px-4 rounded-lg hover:bg-amber-600 transition font-semibold flex items-center justify-center gap-2">
                <i class="fas fa-exchange-alt"></i>
                Ajustar Tópico Estudado
              </button>
            ` : ''}
            

            
            <button 
              onclick="toggleMetaSemanalComTopico(${meta.id}, ${meta.tempo_minutos}, '${JSON.stringify(topicos).replace(/'/g, "\\'")}'); fecharModal()"
              class="w-full ${meta.concluida ? 'bg-gray-500' : 'bg-[#122D6A]'} text-white py-3 px-4 rounded-lg hover:opacity-80 transition font-semibold flex items-center justify-center gap-2">
              <i class="fas ${meta.concluida ? 'fa-undo' : 'fa-check'}"></i>
              ${meta.concluida ? 'Marcar como Pendente' : 'Marcar como Concluída'}
            </button>

            <button 
              onclick="excluirMetaSemanal(${meta.id}); fecharModal()"
              class="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-semibold flex items-center justify-center gap-2">
              <i class="fas fa-trash"></i>
              Excluir Meta
            </button>
          </div>

        </div>
      </div>
    </div>
  `

  modal.classList.remove('hidden')
}

// Fechar Modal
function fecharModal(event) {
  if (event && event.target !== event.currentTarget) return
  const modal = document.getElementById('modal-container')
  if (modal) {
    modal.classList.add('hidden')
    modal.innerHTML = ''
  }
}

// Função simplificada para ir direto à disciplina com tópico (usado no card do cronograma)
window.irParaDisciplinaComTopico = async function(disciplinaId, disciplinaNome, topicoId = null) {
  await irParaTopicoNaDisciplina(disciplinaId, disciplinaNome, topicoId);
}

// Função para ir para o tópico em "Minhas Disciplinas"
window.irParaTopicoNaDisciplina = async function(disciplinaId, disciplinaNome, topicoId = null) {
  // Renderizar a tela de disciplinas
  await renderPortfolioDisciplinas();
  
  // Aguardar renderização e expandir a disciplina específica
  setTimeout(() => {
    const container = document.getElementById(`topicos-${disciplinaId}`);
    const chevron = document.getElementById(`chevron-${disciplinaId}`);
    
    if (container) {
      container.classList.remove('hidden');
      if (chevron) chevron.classList.add('rotate-180');
      
      // Scroll até a disciplina
      container.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Se tiver um tópico específico, destacar ele
      if (topicoId) {
        setTimeout(() => {
          const topicoElement = document.querySelector(`[data-topico-id="${topicoId}"]`);
          if (topicoElement) {
            topicoElement.classList.add('ring-2', 'ring-[#122D6A]', 'ring-offset-2');
            topicoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
    
    showToast(`📚 Disciplina: ${disciplinaNome}`, 'info');
  }, 500);
}

// Função para ajustar o tópico estudado (trocar por outro da disciplina)
window.ajustarTopicoEstudado = async function(metaId, disciplinaId, disciplinaNome) {
  try {
    // Buscar todos os tópicos da disciplina
    const response = await axios.get(`/api/user-topicos/${currentUser.id}/${disciplinaId}`);
    const todosTopicos = response.data || [];
    
    if (todosTopicos.length === 0) {
      showModal('Nenhum tópico encontrado para esta disciplina', { type: 'warning' });
      return;
    }
    
    // Criar modal de seleção
    const modal = document.getElementById('modal-container');
    if (!modal) return;
    
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="fecharModal(event)">
        <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onclick="event.stopPropagation()">
          
          <!-- Header -->
          <div class="bg-amber-500 text-white p-4 rounded-t-lg">
            <h3 class="text-lg font-bold flex items-center gap-2">
              <i class="fas fa-exchange-alt"></i>
              Ajustar Tópico Estudado
            </h3>
            <p class="text-sm opacity-90 mt-1">${disciplinaNome}</p>
          </div>
          
          <!-- Body -->
          <div class="p-4">
            <p class="${themes[currentTheme].textSecondary} text-sm mb-4">
              Selecione o tópico que você realmente estudou:
            </p>
            
            <div class="space-y-2 max-h-[50vh] overflow-y-auto">
              ${todosTopicos.map(t => `
                <button 
                  onclick="confirmarTrocaTopico(${metaId}, ${t.id}, '${t.nome.replace(/'/g, "\\'")}')"
                  class="w-full text-left p-3 rounded-lg border ${t.vezes_estudado > 0 ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'} hover:border-[#122D6A] hover:bg-[#E8EDF5] transition">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full ${t.vezes_estudado > 0 ? 'bg-green-500' : 'bg-gray-300'} flex items-center justify-center">
                      <i class="fas ${t.vezes_estudado > 0 ? 'fa-check' : 'fa-book'} text-white text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium ${themes[currentTheme].text} truncate">${t.nome}</p>
                      <p class="text-xs ${themes[currentTheme].textSecondary}">
                        ${t.vezes_estudado > 0 ? `✓ Revisado ${t.vezes_estudado}x` : 'Não revisado ainda'}
                        ${t.peso ? ` • Peso: ${t.peso}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              `).join('')}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t ${themes[currentTheme].border}">
            <button 
              onclick="fecharModal()"
              class="w-full py-2 border ${themes[currentTheme].border} rounded-lg ${themes[currentTheme].text} hover:bg-gray-100 transition">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error);
    showError('Erro ao carregar tópicos da disciplina');
  }
}

// Função para confirmar troca de tópico e marcar como estudado
window.confirmarTrocaTopico = async function(metaId, topicoId, topicoNome) {
  try {
    // Atualizar o tópico sugerido na meta
    await axios.put(`/api/metas/atualizar-topico/${metaId}`, {
      topico_id: topicoId,
      topico_nome: topicoNome
    });
    
    fecharModal();
    showSuccess(`✅ Tópico ajustado para: ${topicoNome}`);
    
    // Recarregar semana
    await carregarSemanaAtiva();
    
  } catch (error) {
    console.error('Erro ao trocar tópico:', error);
    showError('Erro ao atualizar tópico');
  }
}

// Função toggle meta com sincronização do progresso do tópico
window.toggleMetaSemanalComTopico = async function(metaId, tempoMinutos, topicosJson) {
  try {
    const meta = semanaAtual.metas.find(m => m.id === metaId);
    let topicos = [];
    
    try {
      topicos = typeof topicosJson === 'string' ? JSON.parse(topicosJson) : topicosJson;
    } catch (e) {
      topicos = [];
    }
    
    if (meta.concluida) {
      // Desmarcar meta
      await axios.put(`/api/metas/desmarcar/${metaId}`);
      
      // Desmarcar progresso dos tópicos associados
      for (const topico of topicos) {
        if (topico.id) {
          await axios.post('/api/user-topicos/progresso', {
            user_id: currentUser.id,
            topico_id: topico.id,
            vezes_estudado: 0,
            nivel_dominio: 0
          });
        }
      }
      
      showSuccess('Meta desmarcada');
    } else {
      // Marcar como concluída
      const tempoReal = await mostrarModalTempoEstudo(meta.disciplina_nome, tempoMinutos);
      if (!tempoReal) return;
      
      await axios.put(`/api/metas/concluir/${metaId}`, {
        tempo_real_minutos: parseInt(tempoReal)
      });
      
      // Marcar progresso dos tópicos associados como estudados
      for (const topico of topicos) {
        if (topico.id) {
          // Buscar progresso atual para incrementar vezes_estudado
          try {
            const progressoAtual = await axios.get(`/api/user-topicos/${currentUser.id}/${meta.disciplina_id}`);
            const topicoData = progressoAtual.data.find(t => t.id === topico.id);
            const vezesAtual = topicoData?.vezes_estudado || 0;
            
            await axios.post('/api/user-topicos/progresso', {
              user_id: currentUser.id,
              topico_id: topico.id,
              vezes_estudado: vezesAtual + 1,
              nivel_dominio: Math.min(10, (topicoData?.nivel_dominio || 0) + 1)
            });
          } catch (e) {
            // Se não conseguir buscar, apenas marca como estudado 1x
            await axios.post('/api/user-topicos/progresso', {
              user_id: currentUser.id,
              topico_id: topico.id,
              vezes_estudado: 1,
              nivel_dominio: 1
            });
          }
        }
      }
      
      showSuccess('Meta concluída! 🎉 Progresso do tópico atualizado!');
    }

    // Recarregar
    await carregarSemanaAtiva();

  } catch (error) {
    console.error('Erro ao toggle meta:', error);
    showError('Erro ao atualizar meta');
  }
}

// Modal de Adicionar Meta
function abrirModalAdicionar(semanaId, diaSemana, data) {
  const modal = document.getElementById('modal-container')
  if (!modal) return

  // Buscar disciplinas do usuário
  axios.get(`/api/user_disciplinas/${currentUser.id}`)
    .then(response => {
      const disciplinas = response.data

      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="fecharModal()">
          <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
            <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-4">
              ➕ Adicionar Meta - ${diasSemanaCompletos[diaSemana % 7]}
            </h3>

            <form onsubmit="salvarNovaMeta(event, ${semanaId}, ${diaSemana}, '${data}')">
              <!-- Disciplina -->
              <div class="mb-4">
                <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Disciplina</label>
                <select id="nova-disciplina" required
                        class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]">
                  <option value="">Selecione...</option>
                  ${disciplinas.map(d => `<option value="${d.disciplina_id}">${d.disciplina_nome}</option>`).join('')}
                </select>
              </div>

              <!-- Tipo -->
              <div class="mb-4">
                <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Tipo</label>
                <select id="novo-tipo" required
                        class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]">
                  <option value="teoria">📖 Teoria</option>
                  <option value="exercicios">✏️ Exercícios</option>
                  <option value="revisao">🔄 Revisão</option>
                </select>
              </div>

              <!-- Tempo -->
              <div class="mb-4">
                <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Tempo (minutos)</label>
                <input type="number" id="novo-tempo" value="60" min="15" max="240" required
                       class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]">
              </div>

              <!-- Botões -->
              <div class="flex gap-2 mt-6">
                <button type="button" onclick="fecharModal()" 
                        class="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 ${themes[currentTheme].text} rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition">
                  Cancelar
                </button>
                <button type="submit" 
                        class="flex-1 px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
                  <i class="fas fa-plus mr-2"></i>Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      `
      modal.classList.remove('hidden')
    })
    .catch(error => {
      console.error('Erro ao buscar disciplinas:', error)
      showError('Erro ao carregar disciplinas')
    })
}

async function salvarNovaMeta(event, semanaId, diaSemana, data) {
  event.preventDefault()

  const disciplinaId = document.getElementById('nova-disciplina').value
  const tipo = document.getElementById('novo-tipo').value
  const tempoMinutos = document.getElementById('novo-tempo').value

  try {
    await axios.post('/api/metas/adicionar', {
      semana_id: semanaId,
      user_id: currentUser.id,
      disciplina_id: parseInt(disciplinaId),
      dia_semana: diaSemana,
      data: data,
      tipo: tipo,
      tempo_minutos: parseInt(tempoMinutos),
      topicos_sugeridos: []
    })

    showSuccess('Meta adicionada com sucesso!')
    fecharModal()
    await carregarSemanaAtiva()

  } catch (error) {
    console.error('Erro ao adicionar meta:', error)
    showError('Erro ao adicionar meta')
  }
}

// Modal de Editar Meta
function abrirModalEditar(metaId) {
  const meta = semanaAtual.metas.find(m => m.id === metaId)
  if (!meta) return

  const modal = document.getElementById('modal-container')
  if (!modal) return

  modal.innerHTML = `
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="fecharModal()">
      <div class="${themes[currentTheme].card} rounded-lg shadow-2xl max-w-md w-full p-6" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold ${themes[currentTheme].text} mb-4">
          ✏️ Editar Meta
        </h3>

        <form onsubmit="salvarEdicaoMeta(event, ${metaId})">
          <!-- Disciplina (readonly) -->
          <div class="mb-4">
            <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Disciplina</label>
            <input type="text" value="${meta.disciplina_nome}" readonly
                   class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg bg-gray-100 dark:bg-gray-800 cursor-not-allowed">
          </div>

          <!-- Tipo -->
          <div class="mb-4">
            <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Tipo</label>
            <select id="editar-tipo" required
                    class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]">
              <option value="teoria" ${meta.tipo === 'teoria' ? 'selected' : ''}>📖 Teoria</option>
              <option value="exercicios" ${meta.tipo === 'exercicios' ? 'selected' : ''}>✏️ Exercícios</option>
              <option value="revisao" ${meta.tipo === 'revisao' ? 'selected' : ''}>🔄 Revisão</option>
            </select>
          </div>

          <!-- Tempo -->
          <div class="mb-4">
            <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Tempo (minutos)</label>
            <input type="number" id="editar-tempo" value="${meta.tempo_minutos}" min="15" max="240" required
                   class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]">
          </div>

          <!-- Observações -->
          <div class="mb-4">
            <label class="block ${themes[currentTheme].text} text-sm font-semibold mb-2">Observações (opcional)</label>
            <textarea id="editar-obs" rows="2"
                      class="w-full px-3 py-2 ${themes[currentTheme].input} rounded-lg focus:ring-2 focus:ring-[#1A3A7F]"
                      placeholder="Adicione notas ou lembretes...">${meta.observacoes || ''}</textarea>
          </div>

          <!-- Botões -->
          <div class="flex gap-2 mt-6">
            <button type="button" onclick="fecharModal()" 
                    class="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 ${themes[currentTheme].text} rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition">
              Cancelar
            </button>
            <button type="submit" 
                    class="flex-1 px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
              <i class="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  modal.classList.remove('hidden')
}

async function salvarEdicaoMeta(event, metaId) {
  event.preventDefault()

  const tipo = document.getElementById('editar-tipo').value
  const tempoMinutos = document.getElementById('editar-tempo').value
  const observacoes = document.getElementById('editar-obs').value

  try {
    await axios.put(`/api/metas/editar/${metaId}`, {
      tipo: tipo,
      tempo_minutos: parseInt(tempoMinutos),
      observacoes: observacoes
    })

    showSuccess('Meta atualizada com sucesso!')
    fecharModal()
    await carregarSemanaAtiva()

  } catch (error) {
    console.error('Erro ao editar meta:', error)
    showError('Erro ao editar meta')
  }
}

// ============== FUNÇÕES AUXILIARES ==============

function showSuccess(message) {
  // Implementação simples de toast
  const toast = document.createElement('div')
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
  toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

function showError(message) {
  const toast = document.createElement('div')
  toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
  toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

function showLoading(message) {
  const loading = document.createElement('div')
  loading.id = 'loading-overlay'
  loading.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center'
  loading.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p class="text-gray-800 dark:text-gray-200">${message}</p>
    </div>
  `
  document.body.appendChild(loading)
}

function mostrarModalConfirmacao(titulo, mensagem, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar') {
  return new Promise((resolve) => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all border border-gray-200">
        <div class="text-center mb-6">
          <div class="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 border-2 border-amber-200 mb-4">
            <i class="fas fa-exclamation-triangle text-amber-500 text-2xl"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">${titulo}</h3>
          <p class="text-gray-600 text-sm">${mensagem}</p>
        </div>
        <div class="flex gap-3">
          <button id="btn-cancelar" class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition border border-gray-200">
            ${textoCancelar}
          </button>
          <button id="btn-confirmar" class="flex-1 px-4 py-3 bg-[#122D6A] text-white rounded-xl font-semibold hover:bg-[#0D1F4D] transition shadow-lg">
            ${textoConfirmar}
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    
    document.getElementById('btn-confirmar').onclick = () => {
      modal.remove()
      resolve(true)
    }
    document.getElementById('btn-cancelar').onclick = () => {
      modal.remove()
      resolve(false)
    }
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove()
        resolve(false)
      }
    }
  })
}

function mostrarModalTempoEstudo(disciplina, tempoSugerido) {
  return new Promise((resolve) => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4'
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div class="text-center mb-6">
          <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#2A4A9F]/10 dark:bg-green-900/30 mb-4">
            <i class="fas fa-clock text-[#2A4A9F] dark:text-green-400 text-3xl"></i>
          </div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Parabéns! 🎉</h3>
          <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">${disciplina}</p>
        </div>
        
        <div class="mb-6">
          <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Quanto tempo você estudou? (minutos)
          </label>
          <input 
            type="number" 
            id="input-tempo" 
            value="${tempoSugerido}"
            min="1"
            class="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#1A3A7F] focus:border-[#1A3A7F] dark:bg-gray-700 dark:text-white text-lg text-center font-bold"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            Tempo sugerido: ${tempoSugerido} minutos
          </p>
        </div>
        
        <div class="flex gap-3">
          <button id="btn-cancelar-tempo" class="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Cancelar
          </button>
          <button id="btn-confirmar-tempo" class="flex-1 px-4 py-3 bg-[#122D6A] text-white rounded-lg font-semibold hover:bg-[#0D1F4D] transition">
            <i class="fas fa-check mr-2"></i>Concluir
          </button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    
    const input = document.getElementById('input-tempo')
    input.focus()
    input.select()
    
    const confirmar = () => {
      const tempo = input.value
      if (tempo && tempo > 0) {
        modal.remove()
        resolve(tempo)
      }
    }
    
    document.getElementById('btn-confirmar-tempo').onclick = confirmar
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') confirmar()
    })
    
    document.getElementById('btn-cancelar-tempo').onclick = () => {
      modal.remove()
      resolve(null)
    }
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove()
        resolve(null)
      }
    }
  })
}

function hideLoading() {
  const loading = document.getElementById('loading-overlay')
  if (loading) loading.remove()
}

// ============== FUNÇÕES DE SCORE E EXERCÍCIOS INTERATIVOS ==============

// Variável global para guardar dados do score
let scoreDataGlobal = { score: 0, detalhes: { disciplinas: 0, por_disciplina: [] } };

// Função para mostrar detalhes do score
window.mostrarDetalheScore = async function() {
  try {
    // Buscar score atualizado
    const response = await axios.get(`/api/score/${currentUser.id}`);
    scoreDataGlobal = response.data;
    
    const { score, detalhes } = scoreDataGlobal;
    const disciplinas = detalhes.por_disciplina || [];
    
    const getScoreColor = (s) => s >= 7 ? 'green' : s >= 4 ? 'amber' : 'red';
    const getScoreLabel = (s) => s >= 8 ? 'Excelente!' : s >= 6 ? 'Bom progresso' : s >= 4 ? 'Continue estudando' : 'Precisa de atenção';
    
    const modalHtml = `
      <div id="modal-score-detalhe" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold flex items-center gap-3">
                  <i class="fas fa-trophy"></i>
                  Seu Score de Conhecimento
                </h2>
                <p class="mt-1 text-sm opacity-90">Calculado com base em progresso, exercícios e pesos do edital</p>
              </div>
              <div class="text-right">
                <div class="text-5xl font-bold">${score}<span class="text-2xl opacity-75">/10</span></div>
                <p class="text-sm opacity-90 mt-1">${getScoreLabel(score)}</p>
              </div>
            </div>
          </div>
          
          <!-- Metodologia -->
          <div class="p-4 border-b ${themes[currentTheme].border} bg-blue-50 dark:bg-blue-900/20">
            <div class="flex items-start gap-3">
              <i class="fas fa-info-circle text-[#122D6A] mt-0.5"></i>
              <div class="text-sm ${themes[currentTheme].textSecondary}">
                <strong class="${themes[currentTheme].text}">Como calculamos:</strong>
                <span class="block mt-1">35% Progresso em tópicos • 25% Nível de domínio • 35% Média em exercícios • Bônus se já estudou • Ponderado por peso do edital</span>
              </div>
            </div>
          </div>
          
          <!-- Disciplinas -->
          <div class="flex-1 overflow-y-auto p-6">
            <h3 class="font-bold ${themes[currentTheme].text} mb-4">
              <i class="fas fa-chart-bar mr-2"></i>Detalhes por Disciplina
            </h3>
            
            <div class="space-y-3">
              ${disciplinas.map(disc => {
                const color = getScoreColor(disc.score);
                const progressPercent = disc.total_topicos > 0 ? Math.round((disc.topicos_estudados / disc.total_topicos) * 100) : 0;
                return `
                  <div class="${themes[currentTheme].card} border ${themes[currentTheme].border} rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center">
                          <span class="text-${color}-600 dark:text-${color}-400 font-bold">${disc.score}</span>
                        </div>
                        <div>
                          <p class="font-semibold ${themes[currentTheme].text}">${disc.nome}</p>
                          <p class="text-xs ${themes[currentTheme].textSecondary}">Peso ${disc.peso}x no edital</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-600 dark:bg-${color}-900/30 dark:text-${color}-400">
                          ${disc.score}/10
                        </span>
                      </div>
                    </div>
                    
                    <!-- Progresso visual -->
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div class="h-full bg-${color}-500 rounded-full transition-all" style="width: ${progressPercent}%"></div>
                    </div>
                    
                    <div class="flex justify-between text-xs ${themes[currentTheme].textSecondary}">
                      <span><i class="fas fa-book-open mr-1"></i>${disc.topicos_estudados}/${disc.total_topicos} tópicos</span>
                      <span><i class="fas fa-tasks mr-1"></i>${disc.exercicios_feitos} exercícios (${disc.media_exercicios}%)</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            ${disciplinas.length === 0 ? `
              <div class="text-center py-8">
                <i class="fas fa-chart-line text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                <p class="${themes[currentTheme].textSecondary}">Nenhuma disciplina encontrada.</p>
                <p class="text-sm ${themes[currentTheme].textSecondary} mt-1">Adicione disciplinas ao seu plano para ver o score.</p>
              </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t ${themes[currentTheme].border} flex-shrink-0">
            <button onclick="document.getElementById('modal-score-detalhe').remove()"
                    class="w-full py-3 bg-[#122D6A] text-white rounded-xl hover:bg-[#0D1F4D] transition font-semibold">
              <i class="fas fa-check mr-2"></i>Entendi
            </button>
          </div>
        </div>
      </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstElementChild);
    
  } catch (error) {
    console.error('Erro ao carregar score:', error);
    showToast('Erro ao carregar detalhes do score', 'error');
  }
}

// ============== EXERCÍCIOS INTERATIVOS ==============

// Variável global para armazenar estado do exercício
let exercicioAtual = {
  questoes: [],
  respostas: {},
  verificadas: {}, // NOVO: rastrear quais questões foram verificadas
  disciplinaId: null,
  topicoId: null,
  topicoNome: '',
  disciplinaNome: '',
  tempoInicio: null
};

// Função para processar e exibir exercícios de forma interativa
window.exibirExerciciosInterativos = function(data) {
  const { topico_nome, disciplina_nome, conteudo, disciplina_id, topico_id } = data;
  
  // Parsear questões do conteúdo
  const questoes = parseQuestoes(conteudo);
  
  if (questoes.length === 0) {
    showToast('Não foi possível processar as questões', 'error');
    return;
  }
  
  // Inicializar estado
  exercicioAtual = {
    questoes,
    respostas: {},
    verificadas: {}, // Inicializar objeto de verificação
    disciplinaId: disciplina_id,
    topicoId: topico_id,
    topicoNome: topico_nome,
    disciplinaNome: disciplina_nome,
    tempoInicio: Date.now()
  };
  
  renderExercicioModal(0);
}

// NOVA FUNÇÃO: Verificar resposta da questão atual
window.verificarResposta = function(questaoIndex) {
  const questao = exercicioAtual.questoes[questaoIndex];
  const respostaUsuario = exercicioAtual.respostas[questao.id];
  
  if (!respostaUsuario) {
    showToast('Selecione uma alternativa primeiro', 'warning');
    return;
  }
  
  // Marcar como verificada
  if (!exercicioAtual.verificadas) {
    exercicioAtual.verificadas = {};
  }
  exercicioAtual.verificadas[questao.id] = true;
  
  // Re-renderizar para mostrar feedback
  renderExercicioModal(questaoIndex);
}

// Parser de questões do texto gerado pela IA - VERSÃO ROBUSTA V2
function parseQuestoes(texto) {
  console.log('📝 Iniciando parse de questões...');
  console.log('Texto recebido (primeiros 500 chars):', texto.substring(0, 500));
  
  const questoes = [];
  
  // MÉTODO 1: Separar por marcador --- (separador entre questões)
  let blocos = texto.split(/\n\s*---+\s*\n/);
  console.log('Blocos encontrados (separador ---):', blocos.length);
  
  // Se só encontrou 1 bloco, tentar separar por **Questão X**
  if (blocos.length <= 1) {
    blocos = texto.split(/(?=\*{2}Questão\s*\d+\*{2})/i);
    console.log('Blocos encontrados (**Questão X**):', blocos.length);
  }
  
  // Se ainda só tem 1 bloco, tentar separar por "Questão X." no início de linha
  if (blocos.length <= 1) {
    blocos = texto.split(/(?=\nQuestão\s*\d+[\.:\)])/i);
    console.log('Blocos encontrados (Questão X.):', blocos.length);
  }
  
  // Se ainda só tem 1 bloco, tentar separar por número + ponto no início de linha
  if (blocos.length <= 1) {
    blocos = texto.split(/(?=\n\s*\d+\.\s+(?!\d))/);
    console.log('Blocos encontrados (número.espaço):', blocos.length);
  }
  
  for (const bloco of blocos) {
    if (!bloco.trim() || bloco.length < 30) continue;
    
    console.log('\\n--- Processando bloco ---');
    console.log('Bloco (primeiros 200 chars):', bloco.substring(0, 200));
    
    // Separar gabarito/comentário do resto
    const gabaritoSplit = bloco.split(/\n\s*\*{0,2}(?:Gabarito|Resposta\s+correta)[:\s*]*/i);
    const questaoTexto = gabaritoSplit[0];
    const gabaritoEComentario = gabaritoSplit.slice(1).join(' ');
    
    // Extrair pergunta - tudo antes da primeira alternativa
    const linhas = questaoTexto.split('\n');
    const linhasPergunta = [];
    
    for (const linha of linhas) {
      // Verificar se é alternativa
      if (/^\s*\*{0,2}\s*[a-eA-E][\.\)]\s*/i.test(linha)) break;
      
      // Limpar linha de cabeçalho
      let linhaLimpa = linha.trim()
        .replace(/^\*{2}Questão\s*\d+\*{2}/i, '')
        .replace(/^Questão\s*\d+[\.:\)]/i, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .replace(/\(Nível:\s*[^)]+\)/gi, '')
        .replace(/\*+/g, '')
        .trim();
      
      if (linhaLimpa.length > 3) {
        linhasPergunta.push(linhaLimpa);
      }
    }
    
    const pergunta = linhasPergunta.join(' ').trim();
    if (pergunta.length < 10) {
      console.log('Pergunta muito curta, pulando bloco');
      continue;
    }
    
    // Extrair alternativas
    const alternativas = [];
    const regexAlternativa = /^\s*\*{0,2}\s*([a-eA-E])[\.\)]\s*\*{0,2}\s*(.+)/i;
    
    for (const linha of linhas) {
      const match = linha.match(regexAlternativa);
      if (match) {
        let textoAlt = match[2].trim()
          .replace(/\*+/g, '')
          .replace(/\s*Gabarito.*$/i, '')
          .replace(/\s*\(correta\).*$/i, '')
          .trim();
        
        if (textoAlt.length > 0) {
          alternativas.push({
            letra: match[1].toLowerCase(),
            texto: textoAlt
          });
        }
      }
    }
    
    console.log('Alternativas encontradas:', alternativas.length);
    
    if (alternativas.length < 2) {
      console.log('Menos de 2 alternativas, pulando bloco');
      continue;
    }
    
    // Extrair resposta correta
    let respostaCorreta = '';
    
    // Buscar no texto do gabarito
    if (gabaritoEComentario) {
      const matchGab = gabaritoEComentario.match(/(?:Letra\s+)?([A-Ea-e])(?:\s|\.|\)|$)/i);
      if (matchGab) {
        respostaCorreta = matchGab[1].toLowerCase();
      }
    }
    
    // Buscar no bloco original
    if (!respostaCorreta) {
      const matchGabBloco = bloco.match(/Gabarito[:\s*]*(?:Letra\s+)?([A-Ea-e])(?:\s|\.|\)|$)/i);
      if (matchGabBloco) {
        respostaCorreta = matchGabBloco[1].toLowerCase();
      }
    }
    
    // Buscar padrão "Resposta: X"
    if (!respostaCorreta) {
      const matchResp = bloco.match(/Resposta[:\s*]*(?:Letra\s+)?([A-Ea-e])(?:\s|\.|\)|$)/i);
      if (matchResp) {
        respostaCorreta = matchResp[1].toLowerCase();
      }
    }
    
    // Fallback
    if (!respostaCorreta) {
      respostaCorreta = 'a';
      console.log('Usando fallback para resposta: a');
    }
    
    console.log('Resposta correta:', respostaCorreta);
    
    // Extrair comentário/explicação
    let explicacao = '';
    const matchComentario = bloco.match(/(?:Comentário|Explicação)[:\s*]*(.+?)(?=\n\s*---+|\n\s*\*{2}Questão|$)/is);
    if (matchComentario) {
      explicacao = matchComentario[1].trim()
        .replace(/\*+/g, '')
        .replace(/^Letra\s+[A-E][\s\.:]*/i, '')
        .trim();
    }
    
    questoes.push({
      id: questoes.length + 1,
      pergunta,
      alternativas,
      correta: respostaCorreta,
      explicacao,
      verificada: false
    });
    
    console.log('✅ Questão', questoes.length, 'adicionada');
  }
  
  console.log('\\n📊 Total de questões parseadas:', questoes.length);
  return questoes;
}

// Renderizar modal de exercício
function renderExercicioModal(questaoIndex) {
  const questao = exercicioAtual.questoes[questaoIndex];
  const total = exercicioAtual.questoes.length;
  const respondidas = Object.keys(exercicioAtual.respostas).length;
  const respostaAtual = exercicioAtual.respostas[questao.id];
  const jaVerificada = exercicioAtual.verificadas?.[questao.id];
  const acertouQuestao = jaVerificada && respostaAtual === questao.correta;
  
  const progressPercent = Math.round((respondidas / total) * 100);
  const verificadasCount = Object.keys(exercicioAtual.verificadas || {}).length;
  
  // Remover modal anterior se existir
  document.getElementById('modal-exercicios')?.remove();
  
  const modalHtml = `
    <div id="modal-exercicios" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <!-- Header -->
        <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-4 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm opacity-75">${exercicioAtual.disciplinaNome}</p>
              <h2 class="text-lg font-bold">${exercicioAtual.topicoNome}</h2>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="text-2xl font-bold">${questaoIndex + 1}<span class="text-base opacity-75">/${total}</span></p>
                <p class="text-xs opacity-75">${verificadasCount} verificadas</p>
              </div>
              <button onclick="fecharExercicios()" class="p-2 hover:bg-white/20 rounded-lg transition" title="Fechar">
                <i class="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
          <!-- Barra de progresso -->
          <div class="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div class="h-full bg-white rounded-full transition-all" style="width: ${Math.round((verificadasCount / total) * 100)}%"></div>
          </div>
        </div>
        
        <!-- Questão -->
        <div class="flex-1 overflow-y-auto p-6 ${themes[currentTheme].bg}">
          <div class="mb-6">
            <span class="inline-block px-3 py-1 bg-[#122D6A] text-white rounded-full text-sm font-medium mb-3">
              Questão ${questao.id}
            </span>
            <p class="text-lg ${themes[currentTheme].text} leading-relaxed">${questao.pergunta}</p>
          </div>
          
          <!-- Alternativas com tema correto -->
          <div class="space-y-3" id="alternativas-container">
            ${questao.alternativas.map((alt, idx) => {
              let btnClass = 'bg-white border-gray-200 hover:border-[#122D6A] hover:bg-[#122D6A]/5';
              let circleClass = 'bg-gray-100 text-gray-700';
              let textClass = 'text-gray-800';
              
              if (respostaAtual === alt.letra && !jaVerificada) {
                // Selecionada mas não verificada ainda
                btnClass = 'bg-blue-50 border-[#122D6A]';
                circleClass = 'bg-[#122D6A] text-white';
              } else if (jaVerificada) {
                if (alt.letra === questao.correta) {
                  // Alternativa correta (sempre verde após verificar)
                  btnClass = 'bg-green-50 border-green-500';
                  circleClass = 'bg-green-500 text-white';
                  textClass = 'text-green-800';
                } else if (respostaAtual === alt.letra) {
                  // Usuário marcou esta, mas está errada
                  btnClass = 'bg-red-50 border-red-500';
                  circleClass = 'bg-red-500 text-white';
                  textClass = 'text-red-800';
                }
              }
              
              return `
                <button 
                  onclick="${jaVerificada ? '' : `selecionarAlternativa(${questao.id}, '${alt.letra}')`}"
                  id="alt-${questao.id}-${alt.letra}"
                  class="w-full p-4 border-2 rounded-xl text-left transition-all flex items-start gap-3 ${btnClass} ${jaVerificada ? 'cursor-default' : 'cursor-pointer'}">
                  <span class="flex-shrink-0 w-8 h-8 rounded-full ${circleClass} flex items-center justify-center font-bold uppercase">
                    ${jaVerificada && alt.letra === questao.correta ? '<i class="fas fa-check text-sm"></i>' : 
                      jaVerificada && respostaAtual === alt.letra && alt.letra !== questao.correta ? '<i class="fas fa-times text-sm"></i>' : 
                      alt.letra}
                  </span>
                  <span class="${textClass}">${alt.texto}</span>
                </button>
              `;
            }).join('')}
          </div>
          
          <!-- Feedback após verificar -->
          ${jaVerificada ? `
            <div class="mt-4 p-4 rounded-xl ${acertouQuestao ? 'bg-[#2A4A9F]/10 border border-green-300' : 'bg-red-100 border border-red-300'}">
              <div class="flex items-center gap-2 mb-2">
                <i class="fas ${acertouQuestao ? 'fa-check-circle text-[#2A4A9F]' : 'fa-times-circle text-red-600'}"></i>
                <span class="font-bold ${acertouQuestao ? 'text-green-700' : 'text-red-700'}">
                  ${acertouQuestao ? 'Parabéns! Você acertou! 🎉' : 'Resposta incorreta'}
                </span>
              </div>
              ${questao.explicacao ? `
                <p class="text-sm text-gray-700 mt-2">
                  <i class="fas fa-lightbulb text-yellow-500 mr-1"></i>
                  ${questao.explicacao}
                </p>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <!-- Footer - Navegação -->
        <div class="p-4 border-t ${themes[currentTheme].border} flex-shrink-0 ${themes[currentTheme].card}">
          <div class="flex gap-3">
            ${questaoIndex > 0 ? `
              <button onclick="navegarQuestaoExercicio(${questaoIndex - 1})"
                      class="px-5 py-3 border-2 ${themes[currentTheme].border} rounded-xl ${themes[currentTheme].text} hover:bg-gray-100 transition font-medium">
                <i class="fas fa-chevron-left mr-2"></i>Anterior
              </button>
            ` : ''}
            
            <div class="flex-1"></div>
            
            <!-- Botão Verificar Resposta -->
            ${!jaVerificada && respostaAtual ? `
              <button onclick="verificarResposta(${questaoIndex})"
                      class="px-5 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition font-medium">
                <i class="fas fa-search mr-2"></i>Verificar Resposta
              </button>
            ` : ''}
            
            ${questaoIndex < total - 1 ? `
              <button onclick="navegarQuestaoExercicio(${questaoIndex + 1})"
                      class="px-5 py-3 bg-[#122D6A] text-white rounded-xl hover:bg-[#0D1F4D] transition font-medium">
                Próxima<i class="fas fa-chevron-right ml-2"></i>
              </button>
            ` : `
              <button onclick="finalizarExercicios()"
                      class="px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium ${verificadasCount < total ? 'opacity-60' : ''}">
                <i class="fas fa-flag-checkered mr-2"></i>Finalizar
              </button>
            `}
          </div>
          
          <!-- Indicadores de questões -->
          <div class="flex flex-wrap gap-2 mt-4 justify-center">
            ${exercicioAtual.questoes.map((q, i) => {
              const verificada = exercicioAtual.verificadas?.[q.id];
              const acertou = verificada && exercicioAtual.respostas[q.id] === q.correta;
              const atual = i === questaoIndex;
              
              let indicatorClass = 'bg-gray-200 text-gray-600';
              if (verificada) {
                indicatorClass = acertou ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
              } else if (exercicioAtual.respostas[q.id]) {
                indicatorClass = 'bg-[#122D6A] text-white';
              }
              
              return `
                <button onclick="navegarQuestaoExercicio(${i})"
                  class="w-8 h-8 rounded-full text-sm font-medium transition-all ${indicatorClass}
                    ${atual ? 'ring-2 ring-[#122D6A] ring-offset-2' : ''}">
                  ${verificada ? (acertou ? '✓' : '✗') : (i + 1)}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
}

// Selecionar alternativa
window.selecionarAlternativa = function(questaoId, letra) {
  exercicioAtual.respostas[questaoId] = letra;
  
  // Re-renderizar para atualizar visual
  const questaoIndex = exercicioAtual.questoes.findIndex(q => q.id === questaoId);
  renderExercicioModal(questaoIndex);
}

// Navegar entre questões (exercícios gerados)
window.navegarQuestaoExercicio = function(index) {
  if (index >= 0 && index < exercicioAtual.questoes.length) {
    renderExercicioModal(index);
  }
}

// Fechar modal de exercícios e atualizar ícones
window.fecharExercicios = function() {
  document.getElementById('modal-exercicios')?.remove();
  // NÃO redesenhar o dashboard inteiro, apenas atualizar os ícones
  if (typeof atualizarTodosIconesConteudo === 'function') {
    atualizarTodosIconesConteudo();
  }
}

// Finalizar exercícios e mostrar gabarito
window.finalizarExercicios = async function() {
  const { questoes, respostas, disciplinaId, topicoId, topicoNome, disciplinaNome, tempoInicio } = exercicioAtual;
  
  // Calcular resultado
  let acertos = 0;
  const resultados = [];
  
  for (const questao of questoes) {
    const respostaUsuario = respostas[questao.id] || '';
    const acertou = respostaUsuario === questao.correta;
    if (acertou) acertos++;
    
    resultados.push({
      ...questao,
      respostaUsuario,
      acertou
    });
  }
  
  const percentual = Math.round((acertos / questoes.length) * 100);
  const tempoSegundos = Math.round((Date.now() - tempoInicio) / 1000);
  
  // Salvar resultado no banco
  try {
    await axios.post('/api/exercicios/resultado', {
      user_id: currentUser.id,
      disciplina_id: disciplinaId,
      topico_id: topicoId,
      total_questoes: questoes.length,
      acertos,
      tempo_segundos: tempoSegundos
    });
    console.log('✅ Resultado salvo no banco');
  } catch (error) {
    console.error('Erro ao salvar resultado:', error);
  }
  
  // Mostrar tela de resultado
  renderResultadoExercicios(resultados, acertos, questoes.length, percentual, tempoSegundos);
}

// Renderizar tela de resultado com gabarito
function renderResultadoExercicios(resultados, acertos, total, percentual, tempoSegundos) {
  document.getElementById('modal-exercicios')?.remove();
  
  const minutos = Math.floor(tempoSegundos / 60);
  const segundos = tempoSegundos % 60;
  
  const getResultColor = (p) => p >= 70 ? 'green' : p >= 50 ? 'amber' : 'red';
  const getResultMsg = (p) => p >= 90 ? '🏆 Excelente!' : p >= 70 ? '👏 Muito bom!' : p >= 50 ? '💪 Continue assim!' : '📚 Continue estudando!';
  const color = getResultColor(percentual);
  
  const modalHtml = `
    <div id="modal-resultado-exercicios" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-4xl my-4">
        <!-- Header com resultado -->
        <div class="bg-gradient-to-r from-${color}-600 to-${color}-500 text-white p-8 rounded-t-2xl text-center">
          <div class="text-6xl mb-4">${percentual >= 70 ? '🎉' : percentual >= 50 ? '👍' : '📖'}</div>
          <h2 class="text-3xl font-bold mb-2">${getResultMsg(percentual)}</h2>
          <p class="text-lg opacity-90">${exercicioAtual.topicoNome}</p>
          
          <div class="flex justify-center gap-8 mt-6">
            <div class="text-center">
              <div class="text-4xl font-bold">${percentual}%</div>
              <div class="text-sm opacity-75">Aproveitamento</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold">${acertos}/${total}</div>
              <div class="text-sm opacity-75">Acertos</div>
            </div>
            <div class="text-center">
              <div class="text-4xl font-bold">${minutos}:${segundos.toString().padStart(2, '0')}</div>
              <div class="text-sm opacity-75">Tempo</div>
            </div>
          </div>
        </div>
        
        <!-- Gabarito detalhado -->
        <div class="p-6 max-h-[50vh] overflow-y-auto">
          <h3 class="font-bold ${themes[currentTheme].text} mb-4 flex items-center gap-2">
            <i class="fas fa-clipboard-check"></i>
            Gabarito Detalhado
          </h3>
          
          <div class="space-y-4">
            ${resultados.map((r, idx) => `
              <div class="border ${r.acertou ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'} rounded-xl p-4">
                <div class="flex items-start gap-3 mb-3">
                  <span class="flex-shrink-0 w-8 h-8 rounded-full ${r.acertou ? 'bg-green-500' : 'bg-red-500'} text-white flex items-center justify-center">
                    ${r.acertou ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'}
                  </span>
                  <div class="flex-1">
                    <p class="font-medium ${themes[currentTheme].text}">Questão ${idx + 1}</p>
                    <p class="text-sm ${themes[currentTheme].textSecondary} mt-1">${r.pergunta}</p>
                  </div>
                </div>
                
                <div class="ml-11 space-y-2">
                  ${r.respostaUsuario ? `
                    <div class="flex items-center gap-2 text-sm">
                      <span class="${r.acertou ? 'text-[#2A4A9F]' : 'text-red-600'} font-medium">
                        Sua resposta: ${r.respostaUsuario.toUpperCase()}) ${r.alternativas.find(a => a.letra === r.respostaUsuario)?.texto || ''}
                      </span>
                    </div>
                  ` : '<p class="text-sm text-gray-500 italic">Não respondida</p>'}
                  
                  ${!r.acertou ? `
                    <div class="flex items-center gap-2 text-sm text-[#2A4A9F]">
                      <i class="fas fa-check-circle"></i>
                      <span class="font-medium">Correta: ${r.correta.toUpperCase()}) ${r.alternativas.find(a => a.letra === r.correta)?.texto || ''}</span>
                    </div>
                  ` : ''}
                  
                  ${r.explicacao ? `
                    <div class="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg text-sm ${themes[currentTheme].textSecondary}">
                      <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                      ${r.explicacao}
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t ${themes[currentTheme].border} flex gap-3">
          <button onclick="refazerExercicios()"
                  class="flex-1 py-3 border-2 ${themes[currentTheme].border} rounded-xl ${themes[currentTheme].text} hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium">
            <i class="fas fa-redo mr-2"></i>Refazer
          </button>
          <button onclick="document.getElementById('modal-resultado-exercicios').remove(); atualizarTodosIconesConteudo()"
                  class="flex-1 py-3 bg-[#122D6A] text-white rounded-xl hover:bg-[#0D1F4D] transition font-medium">
            <i class="fas fa-home mr-2"></i>Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
}

// Refazer exercícios
window.refazerExercicios = function() {
  document.getElementById('modal-resultado-exercicios')?.remove();
  exercicioAtual.respostas = {};
  exercicioAtual.verificadas = {}; // Limpar verificações também
  exercicioAtual.tempoInicio = Date.now();
  renderExercicioModal(0);
}

// ============== FLASHCARDS FORMATADOS ==============

// Função para exibir flashcards de forma visual
window.exibirFlashcardsVisuais = function(data) {
  const { topico_nome, disciplina_nome, conteudo } = data;
  
  // Parsear flashcards do conteúdo
  const flashcards = parseFlashcards(conteudo);
  
  if (flashcards.length === 0) {
    // Fallback para exibição simples se não conseguir parsear
    exibirConteudoGerado(data);
    return;
  }
  
  renderFlashcardsModal(flashcards, topico_nome, disciplina_nome, 0);
}

// Parser de flashcards - VERSÃO ROBUSTA V2
function parseFlashcards(texto) {
  console.log('🎴 Iniciando parse de flashcards...');
  console.log('Texto recebido (primeiros 500 chars):', texto.substring(0, 500));
  
  const flashcards = [];
  
  // MÉTODO 1: Separar por --- (separador entre flashcards)
  let blocos = texto.split(/\n\s*---+\s*\n/);
  console.log('Blocos encontrados (separador ---):', blocos.length);
  
  // Se só encontrou 1 bloco, tentar separar por **Flashcard X**
  if (blocos.length <= 1) {
    blocos = texto.split(/(?=\*{2}Flashcard\s*\d+\*{2})/i);
    console.log('Blocos encontrados (**Flashcard X**):', blocos.length);
  }
  
  // Tentar separar por número no início de linha
  if (blocos.length <= 1) {
    blocos = texto.split(/(?=\n\s*\d+[\.\)]\s+)/);
    console.log('Blocos encontrados (número.):', blocos.length);
  }
  
  for (const bloco of blocos) {
    if (!bloco.trim() || bloco.length < 20) continue;
    
    console.log('Processando bloco flashcard:', bloco.substring(0, 100));
    
    // Buscar FRENTE e VERSO no formato esperado
    // Padrões: **FRENTE:** ou FRENTE: ou **Frente:**
    const frenteMatch = bloco.match(/\*{0,2}\s*(?:FRENTE|Frente|Front|Pergunta|Question)[:\s*]*\*{0,2}\s*(.+?)(?=\*{0,2}\s*(?:VERSO|Verso|Back|Resposta|Answer)[:\s*])/is);
    const versoMatch = bloco.match(/\*{0,2}\s*(?:VERSO|Verso|Back|Resposta|Answer)[:\s*]*\*{0,2}\s*(.+?)(?=\n\s*\*{2}Flashcard|\n\s*---+|$)/is);
    
    if (frenteMatch && versoMatch) {
      const frente = frenteMatch[1].trim().replace(/\*+/g, '').replace(/\n+/g, ' ').trim();
      const verso = versoMatch[1].trim().replace(/\*+/g, '').replace(/\n+/g, ' ').trim();
      
      if (frente.length > 3 && verso.length > 3) {
        flashcards.push({
          id: flashcards.length + 1,
          frente,
          verso
        });
        console.log('✅ Flashcard', flashcards.length, 'adicionado');
        continue;
      }
    }
    
    // Fallback: tentar outros formatos no mesmo bloco
    // Formato Q: ... A: ... ou P: ... R: ...
    const qaMatch = bloco.match(/(?:Q|P|Pergunta)[:\.\)]\s*(.+?)\s*(?:A|R|Resposta)[:\.\)]\s*(.+?)$/is);
    if (qaMatch) {
      const frente = qaMatch[1].trim().replace(/\*+/g, '').trim();
      const verso = qaMatch[2].trim().replace(/\*+/g, '').trim();
      
      if (frente.length > 3 && verso.length > 3) {
        flashcards.push({
          id: flashcards.length + 1,
          frente,
          verso
        });
        console.log('✅ Flashcard (Q/A)', flashcards.length, 'adicionado');
      }
    }
  }
  
  // Se não encontrou nada, tentar método linha por linha
  if (flashcards.length === 0) {
    console.log('Tentando método linha por linha...');
    const linhas = texto.split('\n');
    let frenteAtual = '';
    
    for (const linha of linhas) {
      const linhaLimpa = linha.trim();
      
      // Detectar frente
      const fMatch = linhaLimpa.match(/^\*{0,2}\s*(?:FRENTE|Frente|Q|Pergunta)[:\.\)]\s*\*{0,2}\s*(.+)/i);
      if (fMatch) {
        frenteAtual = fMatch[1].replace(/\*+/g, '').trim();
        continue;
      }
      
      // Detectar verso
      const vMatch = linhaLimpa.match(/^\*{0,2}\s*(?:VERSO|Verso|A|R|Resposta)[:\.\)]\s*\*{0,2}\s*(.+)/i);
      if (vMatch && frenteAtual) {
        flashcards.push({
          id: flashcards.length + 1,
          frente: frenteAtual,
          verso: vMatch[1].replace(/\*+/g, '').trim()
        });
        frenteAtual = '';
        console.log('✅ Flashcard (linha)', flashcards.length, 'adicionado');
      }
    }
  }
  
  console.log('📊 Total de flashcards parseados:', flashcards.length);
  return flashcards;
}

// Renderizar modal de flashcards - VISUAL MELHORADO
function renderFlashcardsModal(flashcards, topicoNome, disciplinaNome, cardIndex) {
  const card = flashcards[cardIndex];
  const total = flashcards.length;
  
  document.getElementById('modal-flashcards')?.remove();
  
  // Guardar flashcards no window para navegação
  window._currentFlashcards = flashcards;
  window._currentFlashcardTopic = topicoNome;
  window._currentFlashcardDiscipline = disciplinaNome;
  
  const modalHtml = `
    <div id="modal-flashcards" class="fixed inset-0 bg-gradient-to-br from-cyan-900/90 via-indigo-900/90 to-blue-900/90 flex items-center justify-center z-50 p-4">
      <div class="w-full max-w-2xl">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center gap-2 px-4 py-1 bg-white/10 rounded-full backdrop-blur mb-2">
            <i class="fas fa-clone text-[#7BC4FF]"></i>
            <span class="text-[#A8D4FF] text-sm">Flashcards</span>
          </div>
          <h2 class="text-white text-2xl font-bold">${topicoNome}</h2>
          <p class="text-white/60 text-sm mt-1">${disciplinaNome}</p>
        </div>
        
        <!-- Progress Bar -->
        <div class="flex items-center gap-3 mb-6">
          <span class="text-white/60 text-sm">${cardIndex + 1}</span>
          <div class="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] rounded-full transition-all duration-300" style="width: ${Math.round(((cardIndex + 1) / total) * 100)}%"></div>
          </div>
          <span class="text-white/60 text-sm">${total}</span>
        </div>
        
        <!-- Flashcard com animação 3D -->
        <div id="flashcard-container" class="perspective-1000 cursor-pointer" onclick="flipFlashcard()">
          <div id="flashcard" class="relative w-full h-80 transition-transform duration-500 transform-style-preserve-3d">
            <!-- Frente (TERMO/CONCEITO) -->
            <div class="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 backface-hidden flex flex-col justify-center items-center text-center border-4 border-cyan-200">
              <div class="absolute top-4 right-4">
                <span class="px-3 py-1 bg-[#6BB6FF]/10 text-[#122D6A] rounded-full text-xs font-semibold">
                  <i class="fas fa-tag mr-1"></i>Conceito
                </span>
              </div>
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mb-4 shadow-lg">
                <i class="fas fa-lightbulb text-[#122D6A] text-2xl"></i>
              </div>
              <p class="text-2xl md:text-3xl text-[#122D6A] leading-relaxed font-bold">${card.frente}</p>
              <p class="text-xs text-gray-400 mt-4 uppercase tracking-wider">O que significa?</p>
              <p class="text-sm text-gray-400 mt-4 flex items-center gap-2">
                <i class="fas fa-hand-pointer animate-bounce"></i>
                Toque para ver a definição
              </p>
            </div>
            
            <!-- Verso (DEFINIÇÃO) -->
            <div class="absolute inset-0 bg-gradient-to-br from-[#E8EDF5] to-white rounded-3xl shadow-2xl p-8 backface-hidden rotate-y-180 flex flex-col justify-center items-center text-center border-4 border-[#122D6A]/20">
              <div class="absolute top-4 right-4">
                <span class="px-3 py-1 bg-[#E8EDF5] text-[#122D6A] rounded-full text-xs font-semibold">
                  <i class="fas fa-book-open mr-1"></i>Definição
                </span>
              </div>
              <div class="w-16 h-16 rounded-full bg-gradient-to-br from-[#122D6A]/10 to-[#2A4A9F]/10 flex items-center justify-center mb-4 shadow-lg">
                <i class="fas fa-check text-[#122D6A] text-2xl"></i>
              </div>
              <p class="text-sm text-[#122D6A] font-semibold mb-2 uppercase tracking-wider">${card.frente}</p>
              <p class="text-lg text-gray-800 leading-relaxed">${card.verso}</p>
              <p class="text-sm text-gray-400 mt-4 flex items-center gap-2">
                <i class="fas fa-redo"></i>
                Toque para voltar
              </p>
            </div>
          </div>
        </div>
        
        <!-- Navegação -->
        <div class="flex justify-center gap-3 mt-6">
          ${cardIndex > 0 ? `
            <button onclick="navegarFlashcardSimples(${cardIndex - 1})"
                    class="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition font-medium backdrop-blur flex items-center gap-2">
              <i class="fas fa-chevron-left"></i>
              <span class="hidden sm:inline">Anterior</span>
            </button>
          ` : '<div class="w-24"></div>'}
          
          <button onclick="fecharModalFlashcards()"
                  class="px-6 py-3 bg-gray-600/80 text-white rounded-xl hover:bg-gray-700 transition font-medium backdrop-blur">
            <i class="fas fa-times mr-2"></i>Fechar
          </button>
          
          ${cardIndex < total - 1 ? `
            <button onclick="navegarFlashcardSimples(${cardIndex + 1})"
                    class="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition font-medium backdrop-blur flex items-center gap-2">
              <span class="hidden sm:inline">Próximo</span>
              <i class="fas fa-chevron-right"></i>
            </button>
          ` : `
            <button onclick="fecharModalFlashcards(); showToast('🎉 Parabéns! Você completou todos os flashcards!', 'success')"
                    class="px-6 py-3 bg-[#122D6A]/80 text-white rounded-xl hover:bg-[#122D6A] transition font-medium backdrop-blur flex items-center gap-2">
              <i class="fas fa-trophy"></i>
              <span>Concluir</span>
            </button>
          `}
        </div>
        
        <!-- Indicadores de navegação -->
        <div class="flex justify-center gap-1.5 mt-4">
          ${flashcards.map((_, i) => `
            <button onclick="navegarFlashcardSimples(${i})"
                    class="w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === cardIndex ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/50'}"></button>
          `).join('')}
        </div>
        
        <!-- Atalhos de teclado -->
        <p class="text-center text-white/40 text-xs mt-4">
          <i class="fas fa-keyboard mr-1"></i>
          Use ← → para navegar, Espaço para virar
        </p>
      </div>
    </div>
    
    <style>
      .perspective-1000 { perspective: 1000px; }
      .transform-style-preserve-3d { transform-style: preserve-3d; }
      .backface-hidden { backface-visibility: hidden; }
      .rotate-y-180 { transform: rotateY(180deg); }
      .flipped { transform: rotateY(180deg); }
      #flashcard-container:hover #flashcard:not(.flipped) {
        transform: rotateY(5deg);
      }
    </style>
  `;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHtml;
  document.body.appendChild(modalDiv.firstElementChild);
  
  // Adicionar listener de teclado
  const handleKeyboard = (e) => {
    if (!document.getElementById('modal-flashcards')) {
      document.removeEventListener('keydown', handleKeyboard);
      return;
    }
    
    if (e.key === 'ArrowLeft' && cardIndex > 0) {
      navegarFlashcardSimples(cardIndex - 1);
    } else if (e.key === 'ArrowRight' && cardIndex < total - 1) {
      navegarFlashcardSimples(cardIndex + 1);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipFlashcard();
    } else if (e.key === 'Escape') {
      fecharModalFlashcards();
    }
  };
  
  document.addEventListener('keydown', handleKeyboard);
}

// Navegação simplificada de flashcards
window.navegarFlashcardSimples = function(index) {
  if (window._currentFlashcards && window._currentFlashcardTopic && window._currentFlashcardDiscipline) {
    document.getElementById('modal-flashcards')?.remove();
    renderFlashcardsModal(window._currentFlashcards, window._currentFlashcardTopic, window._currentFlashcardDiscipline, index);
  }
}

// Virar flashcard
window.flipFlashcard = function() {
  const card = document.getElementById('flashcard');
  if (card) {
    card.classList.toggle('flipped');
  }
}

// Fechar modal de flashcards e voltar ao dashboard
window.fecharModalFlashcards = function() {
  document.getElementById('modal-flashcards')?.remove();
  // NÃO redesenhar o dashboard inteiro, apenas atualizar os ícones
  if (typeof atualizarTodosIconesConteudo === 'function') {
    atualizarTodosIconesConteudo();
  }
}

// ============== SIMULADOS ==============

// Estado do simulado
let simuladoConfig = {
  disciplinasSelecionadas: [],
  topicosSelecionados: [],
  quantidadeQuestoes: 20
};

// Abrir modal de configuração do simulado
window.abrirModalSimulado = async function() {
  try {
    // Buscar disciplinas do usuário
    const disciplinasRes = await axios.get(`/api/user-disciplinas/${currentUser.id}`);
    const disciplinas = disciplinasRes.data || [];
    
    // Resetar config
    simuladoConfig = {
      disciplinasSelecionadas: [],
      topicosSelecionados: [],
      quantidadeQuestoes: 20
    };
    
    const modalHtml = `
      <div id="modal-simulado" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-3xl my-4">
          <!-- Header -->
          <div class="bg-gradient-to-r from-[#122D6A] to-cyan-500 text-white p-6 rounded-t-2xl">
            <h2 class="text-2xl font-bold flex items-center gap-3">
              <i class="fas fa-clipboard-list"></i>
              Criar Simulado
            </h2>
            <p class="mt-1 text-sm opacity-90">Selecione disciplinas e tópicos para gerar seu simulado personalizado</p>
          </div>
          
          <!-- Conteúdo -->
          <div class="p-6 max-h-[60vh] overflow-y-auto">
            <!-- Quantidade de questões -->
            <div class="mb-6 p-4 bg-[#E8EDF5] rounded-xl">
              <label class="block text-sm font-semibold ${themes[currentTheme].text} mb-3">
                <i class="fas fa-hashtag mr-2"></i>Quantidade de questões:
              </label>
              <div class="flex items-center gap-4">
                <input type="range" id="simulado-quantidade" min="10" max="50" value="20" step="5"
                       class="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#122D6A]"
                       oninput="document.getElementById('simulado-qtd-valor').textContent = this.value; simuladoConfig.quantidadeQuestoes = parseInt(this.value);">
                <span id="simulado-qtd-valor" class="text-2xl font-bold text-[#122D6A] w-12 text-center">20</span>
              </div>
              <div class="flex justify-between text-xs text-gray-500 mt-1">
                <span>10 questões</span>
                <span>50 questões</span>
              </div>
            </div>
            
            <!-- Disciplinas -->
            <div class="mb-4">
              <h3 class="font-semibold ${themes[currentTheme].text} mb-3 flex items-center gap-2">
                <i class="fas fa-book"></i>
                Selecione as disciplinas:
              </h3>
              
              ${disciplinas.length === 0 ? `
                <p class="text-gray-500 text-center py-4">Nenhuma disciplina encontrada. Adicione disciplinas ao seu plano primeiro.</p>
              ` : `
                <div class="space-y-2" id="lista-disciplinas-simulado">
                  ${disciplinas.map(disc => `
                    <div class="border-2 ${themes[currentTheme].border} rounded-xl overflow-hidden ${themes[currentTheme].card}">
                      <button onclick="toggleDisciplinaSimulado(${disc.disciplina_id}, '${disc.nome.replace(/'/g, "\\'")}')"
                              id="disc-simulado-${disc.disciplina_id}"
                              class="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                          <div class="w-6 h-6 rounded border-2 ${themes[currentTheme].border} flex items-center justify-center" id="check-disc-${disc.disciplina_id}">
                            <!-- Checkmark será adicionado via JS -->
                          </div>
                          <span class="font-medium ${themes[currentTheme].text}">${disc.nome}</span>
                        </div>
                        <i class="fas fa-chevron-down ${themes[currentTheme].textSecondary} transition-transform" id="chevron-disc-${disc.disciplina_id}"></i>
                      </button>
                      
                      <!-- Tópicos (colapsado por padrão) -->
                      <div id="topicos-simulado-${disc.disciplina_id}" class="hidden border-t ${themes[currentTheme].border} ${themes[currentTheme].bg} p-4">
                        <p class="text-sm ${themes[currentTheme].textSecondary} mb-2">Carregando tópicos...</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
            
            <!-- Resumo da seleção -->
            <div id="resumo-simulado" class="p-4 ${themes[currentTheme].bg} border ${themes[currentTheme].border} rounded-xl hidden">
              <h4 class="font-semibold ${themes[currentTheme].text} mb-2">
                <i class="fas fa-check-circle text-green-500 mr-2"></i>Seleção atual:
              </h4>
              <p id="resumo-texto" class="text-sm ${themes[currentTheme].textSecondary}"></p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="p-4 border-t ${themes[currentTheme].border} flex gap-3">
            <button onclick="document.getElementById('modal-simulado').remove()"
                    class="flex-1 py-3 border-2 ${themes[currentTheme].border} rounded-xl ${themes[currentTheme].text} hover:bg-gray-100 transition font-medium">
              <i class="fas fa-times mr-2"></i>Cancelar
            </button>
            <button onclick="gerarSimulado()"
                    id="btn-gerar-simulado"
                    class="flex-1 py-3 bg-[#122D6A] text-white rounded-xl hover:bg-[#0D1F4D] transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled>
              <i class="fas fa-magic mr-2"></i>Gerar Simulado
            </button>
          </div>
        </div>
      </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv.firstElementChild);
    
  } catch (error) {
    console.error('Erro ao abrir modal de simulado:', error);
    showToast('Erro ao carregar disciplinas', 'error');
  }
}

// Toggle seleção de disciplina
window.toggleDisciplinaSimulado = async function(disciplinaId, disciplinaNome) {
  const checkDiv = document.getElementById(`check-disc-${disciplinaId}`);
  const topicosDiv = document.getElementById(`topicos-simulado-${disciplinaId}`);
  const chevron = document.getElementById(`chevron-disc-${disciplinaId}`);
  
  const index = simuladoConfig.disciplinasSelecionadas.findIndex(d => d.id === disciplinaId);
  
  if (index === -1) {
    // Adicionar disciplina
    simuladoConfig.disciplinasSelecionadas.push({ id: disciplinaId, nome: disciplinaNome });
    checkDiv.innerHTML = '<i class="fas fa-check text-[#122D6A] text-sm"></i>';
    checkDiv.classList.add('bg-[#6BB6FF]/10', 'border-[#122D6A]');
    
    // Carregar e mostrar tópicos
    topicosDiv.classList.remove('hidden');
    chevron.classList.add('rotate-180');
    
    try {
      const topicosRes = await axios.get(`/api/user-topicos/${currentUser.id}/${disciplinaId}`);
      const topicos = topicosRes.data || [];
      
      if (topicos.length === 0) {
        topicosDiv.innerHTML = '<p class="text-sm text-gray-500">Nenhum tópico encontrado.</p>';
      } else {
        topicosDiv.innerHTML = `
          <div class="flex flex-wrap gap-2">
            ${topicos.slice(0, 15).map(t => `
              <button onclick="toggleTopicoSimulado(${t.id}, '${t.nome.replace(/'/g, "\\'")}', ${disciplinaId})"
                      id="topico-simulado-${t.id}"
                      class="px-3 py-1.5 text-sm rounded-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-[#4A6AC0] hover:bg-[#6BB6FF]/5 dark:hover:bg-[#0D1F4D]/30 transition">
                ${t.nome.length > 30 ? t.nome.substring(0, 30) + '...' : t.nome}
              </button>
            `).join('')}
            ${topicos.length > 15 ? `<span class="text-xs text-gray-500 self-center">+${topicos.length - 15} mais</span>` : ''}
          </div>
          <p class="text-xs text-gray-500 mt-2">Clique nos tópicos para incluí-los especificamente (opcional)</p>
        `;
      }
    } catch (error) {
      topicosDiv.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar tópicos.</p>';
    }
  } else {
    // Remover disciplina
    simuladoConfig.disciplinasSelecionadas.splice(index, 1);
    // Remover tópicos dessa disciplina
    simuladoConfig.topicosSelecionados = simuladoConfig.topicosSelecionados.filter(t => t.disciplinaId !== disciplinaId);
    
    checkDiv.innerHTML = '';
    checkDiv.classList.remove('bg-[#6BB6FF]/10', 'border-[#122D6A]');
    topicosDiv.classList.add('hidden');
    chevron.classList.remove('rotate-180');
  }
  
  atualizarResumoSimulado();
}

// Toggle seleção de tópico
window.toggleTopicoSimulado = function(topicoId, topicoNome, disciplinaId) {
  const btn = document.getElementById(`topico-simulado-${topicoId}`);
  const index = simuladoConfig.topicosSelecionados.findIndex(t => t.id === topicoId);
  
  if (index === -1) {
    simuladoConfig.topicosSelecionados.push({ id: topicoId, nome: topicoNome, disciplinaId });
    btn.classList.add('border-[#122D6A]', 'bg-[#6BB6FF]/10', 'dark:bg-[#0D1F4D]/50', 'text-[#0D1F4D]');
    btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
  } else {
    simuladoConfig.topicosSelecionados.splice(index, 1);
    btn.classList.remove('border-[#122D6A]', 'bg-[#6BB6FF]/10', 'dark:bg-[#0D1F4D]/50', 'text-[#0D1F4D]');
    btn.classList.add('border-gray-300', 'dark:border-gray-600', 'text-gray-700', 'dark:text-gray-300');
  }
  
  atualizarResumoSimulado();
}

// Atualizar resumo da seleção
function atualizarResumoSimulado() {
  const resumoDiv = document.getElementById('resumo-simulado');
  const resumoTexto = document.getElementById('resumo-texto');
  const btnGerar = document.getElementById('btn-gerar-simulado');
  
  const numDisc = simuladoConfig.disciplinasSelecionadas.length;
  const numTop = simuladoConfig.topicosSelecionados.length;
  const qtd = simuladoConfig.quantidadeQuestoes;
  
  if (numDisc === 0) {
    resumoDiv.classList.add('hidden');
    btnGerar.disabled = true;
  } else {
    resumoDiv.classList.remove('hidden');
    
    let texto = `${numDisc} disciplina(s)`;
    if (numTop > 0) {
      texto += ` com ${numTop} tópico(s) específico(s)`;
    }
    texto += ` • ${qtd} questões`;
    
    const nomes = simuladoConfig.disciplinasSelecionadas.map(d => d.nome).join(', ');
    resumoTexto.innerHTML = `<strong>${texto}</strong><br><span class="text-xs">${nomes}</span>`;
    
    btnGerar.disabled = false;
  }
}

// Gerar simulado
window.gerarSimulado = async function() {
  const { disciplinasSelecionadas, topicosSelecionados, quantidadeQuestoes } = simuladoConfig;
  
  if (disciplinasSelecionadas.length === 0) {
    showToast('Selecione pelo menos uma disciplina', 'warning');
    return;
  }
  
  // Fechar modal
  document.getElementById('modal-simulado')?.remove();
  
  // Mostrar loading
  const loadingHtml = `
    <div id="loading-simulado" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div class="animate-spin w-16 h-16 border-4 border-[#122D6A] border-t-transparent rounded-full mx-auto mb-4"></div>
        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gerando seu Simulado...</h3>
        <p class="text-gray-600 dark:text-gray-300">Criando ${quantidadeQuestoes} questões de ${disciplinasSelecionadas.length} disciplina(s)</p>
        <p class="text-sm text-gray-400 mt-2">Isso pode levar até 1 minuto...</p>
        <div id="progresso-simulado" class="mt-4 text-sm text-[#122D6A]"></div>
      </div>
    </div>
  `;
  
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = loadingHtml;
  document.body.appendChild(loadingDiv.firstElementChild);
  
  try {
    // Chamar API de geração de simulado
    const response = await axios.post('/api/simulado/gerar', {
      user_id: currentUser.id,
      disciplinas: disciplinasSelecionadas.map(d => d.id),
      topicos: topicosSelecionados.map(t => t.id),
      quantidade: quantidadeQuestoes
    });
    
    document.getElementById('loading-simulado')?.remove();
    
    if (response.data.success) {
      // Exibir simulado como exercício interativo
      exibirExerciciosInterativos({
        topico_nome: 'Simulado Personalizado',
        disciplina_nome: disciplinasSelecionadas.map(d => d.nome).join(', '),
        conteudo: response.data.conteudo,
        disciplina_id: null,
        topico_id: null
      });
      
      showToast(`✅ Simulado gerado com ${response.data.questoes_geradas} questões!`, 'success');
    } else {
      showToast('Erro ao gerar simulado: ' + (response.data.error || 'Erro desconhecido'), 'error');
    }
  } catch (error) {
    document.getElementById('loading-simulado')?.remove();
    console.error('Erro ao gerar simulado:', error);
    showToast('Erro ao gerar simulado: ' + (error.response?.data?.error || error.message), 'error');
  }
}

// Version: 1764888006

// ============== FUNÇÕES DE MATERIAIS ==============

window.filtrarMateriais = async function(tipo) {
  const search = document.getElementById('search-materiais')?.value.toLowerCase() || '';
  const filterTipo = tipo === 'favoritos' ? '' : (document.getElementById('filter-tipo')?.value || '');
  
  try {
    const params = new URLSearchParams();
    if (filterTipo) params.append('tipo', filterTipo);
    if (tipo === 'favoritos') params.append('favorito', '1');
    if (search) params.append('search', search);
    
    const response = await axios.get(`/api/materiais/${currentUser.id}?${params}`);
    const materiais = response.data.materiais || [];
    
    document.getElementById('lista-materiais').innerHTML = renderListaMateriais(materiais);
  } catch (error) {
    console.error('Erro ao filtrar materiais:', error);
    showToast('Erro ao filtrar materiais', 'error');
  }
}

window.toggleFavorito = async function(materialId) {
  try {
    await axios.post(`/api/materiais/${materialId}/favorito`);
    showToast('✅ Favorito atualizado', 'success');
    renderMateriais(); // Recarregar
  } catch (error) {
    console.error('Erro ao toggle favorito:', error);
    showToast('Erro ao atualizar favorito', 'error');
  }
}

window.deletarMaterial = async function(materialId) {
  const confirmed = await showConfirm('Tem certeza que deseja deletar este material?\n\nEsta ação não pode ser desfeita.', {
    title: 'Deletar Material',
    confirmText: 'Sim, deletar',
    cancelText: 'Cancelar',
    type: 'danger'
  });
  if (!confirmed) return;
  
  try {
    await axios.delete(`/api/materiais/${materialId}`);
    showToast('✅ Material deletado', 'success');
    renderMateriais(); // Recarregar
  } catch (error) {
    console.error('Erro ao deletar material:', error);
    showToast('Erro ao deletar material', 'error');
  }
}

window.visualizarMaterial = async function(materialId) {
  try {
    const response = await axios.get(`/api/materiais/item/${materialId}`);
    const material = response.data.material;
    
    if (!material) {
      showToast('Material não encontrado', 'error');
      return;
    }
    
    // Exibir conforme o tipo
    if (material.tipo === 'exercicios') {
      // Usar o sistema de exercícios interativos
      exibirExerciciosInterativos({
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome || 'Geral',
        conteudo: material.conteudo,
        disciplina_id: material.disciplina_id,
        topico_id: material.topico_id
      });
    } else if (material.tipo === 'flashcards') {
      // Usar o sistema de flashcards visuais
      exibirFlashcardsVisuais({
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome || 'Geral',
        conteudo: material.conteudo
      });
    } else if (material.arquivo_url) {
      // Abrir arquivo em nova aba
      window.open(material.arquivo_url, '_blank');
    } else {
      // Exibir conteúdo em modal
      exibirConteudoGerado({
        topico_nome: material.topico_nome || material.titulo,
        disciplina_nome: material.disciplina_nome || 'Geral',
        tipo: material.tipo,
        conteudo: material.conteudo,
        caracteres: material.conteudo?.length || 0,
        gerado_em: material.created_at
      });
    }
  } catch (error) {
    console.error('Erro ao visualizar material:', error);
    showToast('Erro ao visualizar material', 'error');
  }
}

window.abrirModalUpload = function() {
  const modalHtml = `
    <div id="modal-upload" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="${themes[currentTheme].card} rounded-2xl shadow-2xl w-full max-w-lg">
        <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white p-6 rounded-t-2xl">
          <h2 class="text-xl font-bold flex items-center gap-3">
            <i class="fas fa-cloud-upload-alt"></i>
            Adicionar Material
          </h2>
          <p class="mt-1 text-sm opacity-90">Upload de arquivos ou criar anotação</p>
        </div>
        
        <div class="p-6">
          <!-- Tabs -->
          <div class="flex mb-4 border-b ${themes[currentTheme].border}">
            <button onclick="switchUploadTab('upload')" id="tab-upload" class="px-4 py-2 border-b-2 border-[#122D6A] font-medium text-[#122D6A]">
              <i class="fas fa-upload mr-2"></i>Upload
            </button>
            <button onclick="switchUploadTab('anotacao')" id="tab-anotacao" class="px-4 py-2 border-b-2 border-transparent font-medium ${themes[currentTheme].textSecondary}">
              <i class="fas fa-edit mr-2"></i>Anotação
            </button>
          </div>
          
          <!-- Upload Tab -->
          <div id="content-upload">
            <p class="${themes[currentTheme].textSecondary} text-sm mb-4">
              <i class="fas fa-info-circle mr-1"></i>
              Funcionalidade de upload em desenvolvimento. Em breve você poderá fazer upload de PDFs, imagens e outros arquivos.
            </p>
            <div class="border-2 border-dashed ${themes[currentTheme].border} rounded-lg p-8 text-center">
              <i class="fas fa-cloud-upload-alt text-4xl text-gray-300 mb-3"></i>
              <p class="${themes[currentTheme].textSecondary}">Arraste arquivos aqui ou clique para selecionar</p>
              <button class="mt-3 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
                Em breve
              </button>
            </div>
          </div>
          
          <!-- Anotação Tab -->
          <div id="content-anotacao" class="hidden">
            <input 
              type="text" 
              id="anotacao-titulo"
              placeholder="Título da anotação"
              class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg mb-3 ${themes[currentTheme].bg} ${themes[currentTheme].text}"
            />
            <textarea 
              id="anotacao-conteudo"
              placeholder="Digite sua anotação..."
              rows="6"
              class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg mb-3 ${themes[currentTheme].bg} ${themes[currentTheme].text}"
            ></textarea>
            <select id="anotacao-disciplina" class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg mb-3 ${themes[currentTheme].bg} ${themes[currentTheme].text}">
              <option value="">Sem disciplina</option>
            </select>
            <input 
              type="text" 
              id="anotacao-tags"
              placeholder="Tags (separadas por vírgula)"
              class="w-full px-4 py-2 border ${themes[currentTheme].border} rounded-lg ${themes[currentTheme].bg} ${themes[currentTheme].text}"
            />
          </div>
          
          <div class="flex gap-3 mt-4">
            <button onclick="document.getElementById('modal-upload').remove()" class="flex-1 px-4 py-2 border-2 ${themes[currentTheme].border} rounded-lg ${themes[currentTheme].text} hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button onclick="salvarAnotacao()" id="btn-salvar-anotacao" class="flex-1 px-4 py-2 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
              <i class="fas fa-save mr-2"></i>Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Carregar disciplinas
  carregarDisciplinasAnotacao();
}

window.switchUploadTab = function(tab) {
  // Atualizar tabs
  document.getElementById('tab-upload').className = tab === 'upload' 
    ? 'px-4 py-2 border-b-2 border-[#122D6A] font-medium text-[#122D6A]'
    : `px-4 py-2 border-b-2 border-transparent font-medium ${themes[currentTheme].textSecondary}`;
  
  document.getElementById('tab-anotacao').className = tab === 'anotacao'
    ? 'px-4 py-2 border-b-2 border-[#122D6A] font-medium text-[#122D6A]'
    : `px-4 py-2 border-b-2 border-transparent font-medium ${themes[currentTheme].textSecondary}`;
  
  // Mostrar/ocultar conteúdo
  document.getElementById('content-upload').classList.toggle('hidden', tab !== 'upload');
  document.getElementById('content-anotacao').classList.toggle('hidden', tab !== 'anotacao');
  
  // Mostrar/ocultar botão salvar
  document.getElementById('btn-salvar-anotacao').classList.toggle('hidden', tab !== 'anotacao');
}

async function carregarDisciplinasAnotacao() {
  try {
    const response = await axios.get(`/api/user-disciplinas/${currentUser.id}`);
    const disciplinas = response.data || [];
    
    const select = document.getElementById('anotacao-disciplina');
    if (select) {
      disciplinas.forEach(disc => {
        const option = document.createElement('option');
        option.value = disc.disciplina_id;
        option.textContent = disc.nome;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar disciplinas:', error);
  }
}

window.salvarAnotacao = async function() {
  const titulo = document.getElementById('anotacao-titulo')?.value;
  const conteudo = document.getElementById('anotacao-conteudo')?.value;
  const disciplina_id = document.getElementById('anotacao-disciplina')?.value;
  const tags = document.getElementById('anotacao-tags')?.value;
  
  if (!titulo || !conteudo) {
    showToast('Preencha título e conteúdo', 'warning');
    return;
  }
  
  try {
    await axios.post('/api/materiais', {
      user_id: currentUser.id,
      disciplina_id: disciplina_id ? parseInt(disciplina_id) : null,
      topico_id: null,
      tipo: 'anotacao',
      titulo,
      conteudo,
      tags
    });
    
    showToast('✅ Anotação salva com sucesso!', 'success');
    document.getElementById('modal-upload')?.remove();
    renderMateriais(); // Recarregar
  } catch (error) {
    console.error('Erro ao salvar anotação:', error);
    showToast('Erro ao salvar anotação', 'error');
  }
}

// ============== SIMULADOS ==============
window.renderDashboardSimulados = async function() {
  try {
    // Buscar histórico de simulados do usuário
    const response = await axios.get(`/api/simulados/historico/${currentUser.id}`);
    const simulados = response.data?.simulados || [];
    
    // Calcular estatísticas
    const totalSimulados = simulados.length;
    const simuladosCompletos = simulados.filter(s => s.status === 'concluido').length;
    const acertoMedio = simulados.length > 0 
      ? Math.round(simulados.reduce((sum, s) => sum + (s.percentual_acerto || 0), 0) / simulados.length) 
      : 0;
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen ${themes[currentTheme].bg} p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-3xl font-bold ${themes[currentTheme].text} mb-1">
                <i class="fas fa-chart-line text-[#122D6A] mr-3"></i>
                Dashboard de Simulados
              </h1>
              <p class="${themes[currentTheme].textSecondary}">
                Acompanhe seu desempenho e evolução nos simulados
              </p>
            </div>
            <button onclick="renderDashboard()" 
              class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition flex items-center gap-2">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
          
          <!-- Estatísticas -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="${themes[currentTheme].card} p-6 rounded-lg shadow border ${themes[currentTheme].border}">
              <div class="flex items-center justify-between mb-2">
                <div class="w-12 h-12 bg-[#6BB6FF]/10 rounded-lg flex items-center justify-center">
                  <i class="fas fa-clipboard-list text-[#122D6A] text-xl"></i>
                </div>
                <span class="text-3xl font-bold ${themes[currentTheme].text}">${totalSimulados}</span>
              </div>
              <p class="${themes[currentTheme].textSecondary} text-sm">Total de Simulados</p>
            </div>
            
            <div class="${themes[currentTheme].card} p-6 rounded-lg shadow border ${themes[currentTheme].border}">
              <div class="flex items-center justify-between mb-2">
                <div class="w-12 h-12 bg-[#2A4A9F]/10 rounded-lg flex items-center justify-center">
                  <i class="fas fa-check-circle text-[#2A4A9F] text-xl"></i>
                </div>
                <span class="text-3xl font-bold ${themes[currentTheme].text}">${simuladosCompletos}</span>
              </div>
              <p class="${themes[currentTheme].textSecondary} text-sm">Simulados Completos</p>
            </div>
            
            <div class="${themes[currentTheme].card} p-6 rounded-lg shadow border ${themes[currentTheme].border}">
              <div class="flex items-center justify-between mb-2">
                <div class="w-12 h-12 bg-[#122D6A]/10 rounded-lg flex items-center justify-center">
                  <i class="fas fa-percentage text-[#122D6A] text-xl"></i>
                </div>
                <span class="text-3xl font-bold ${themes[currentTheme].text}">${acertoMedio}%</span>
              </div>
              <p class="${themes[currentTheme].textSecondary} text-sm">Taxa Média de Acerto</p>
            </div>
          </div>
          
          <!-- Ações -->
          <div class="${themes[currentTheme].card} p-6 rounded-lg shadow border ${themes[currentTheme].border} mb-6">
            <h2 class="text-xl font-bold ${themes[currentTheme].text} mb-4">
              <i class="fas fa-play-circle text-[#122D6A] mr-2"></i>
              Novo Simulado
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onclick="iniciarSimulado('rapido')" 
                class="p-4 border-2 border-cyan-200 rounded-xl hover:bg-[#6BB6FF]/5 hover:border-cyan-400 transition-all group">
                <i class="fas fa-bolt text-[#4A6AC0] text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <h3 class="font-semibold ${themes[currentTheme].text}">Simulado Rápido</h3>
                <p class="${themes[currentTheme].textSecondary} text-sm mt-1">10 questões • 15 minutos</p>
              </button>
              
              <button onclick="iniciarSimulado('padrao')" 
                class="p-4 border-2 border-[#122D6A]/30 rounded-xl hover:bg-[#E8EDF5] hover:border-[#122D6A] transition-all group">
                <i class="fas fa-clock text-[#122D6A] text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <h3 class="font-semibold ${themes[currentTheme].text}">Simulado Padrão</h3>
                <p class="${themes[currentTheme].textSecondary} text-sm mt-1">30 questões • 45 minutos</p>
              </button>
              
              <button onclick="iniciarSimulado('completo')" 
                class="p-4 border-2 border-amber-200 rounded-xl hover:bg-amber-50 hover:border-amber-400 transition-all group">
                <i class="fas fa-trophy text-amber-500 text-2xl mb-2 group-hover:scale-110 transition-transform"></i>
                <h3 class="font-semibold ${themes[currentTheme].text}">Simulado Completo</h3>
                <p class="${themes[currentTheme].textSecondary} text-sm mt-1">50 questões • 90 minutos</p>
              </button>
            </div>
          </div>
          
          <!-- Histórico de Simulados -->
          <div class="${themes[currentTheme].card} p-6 rounded-lg shadow border ${themes[currentTheme].border}">
            <h2 class="text-xl font-bold ${themes[currentTheme].text} mb-4">
              <i class="fas fa-history text-[#122D6A] mr-2"></i>
              Histórico de Simulados
            </h2>
            <div class="overflow-x-auto">
              ${simulados.length > 0 ? `
                <table class="w-full">
                  <thead>
                    <tr class="border-b ${themes[currentTheme].border}">
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Data</th>
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Tipo</th>
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Questões</th>
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Acertos</th>
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Tempo</th>
                      <th class="text-left py-2 px-4 ${themes[currentTheme].text}">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${simulados.slice(0, 10).map(simulado => `
                      <tr class="border-b ${themes[currentTheme].border} hover:bg-gray-50">
                        <td class="py-2 px-4 ${themes[currentTheme].textSecondary}">
                          ${new Date(simulado.data_realizacao).toLocaleDateString('pt-BR')}
                        </td>
                        <td class="py-2 px-4">
                          <span class="px-2 py-1 bg-[#6BB6FF]/10 text-[#0D1F4D] rounded-full text-xs">
                            ${simulado.tipo || 'Padrão'}
                          </span>
                        </td>
                        <td class="py-2 px-4 ${themes[currentTheme].text}">
                          ${simulado.total_questoes || 0}
                        </td>
                        <td class="py-2 px-4">
                          <span class="${simulado.percentual_acerto >= 70 ? 'text-[#2A4A9F]' : simulado.percentual_acerto >= 50 ? 'text-[#4A90E2]' : 'text-red-600'} font-semibold">
                            ${simulado.percentual_acerto || 0}%
                          </span>
                        </td>
                        <td class="py-2 px-4 ${themes[currentTheme].textSecondary}">
                          ${simulado.tempo_gasto || '00:00'}
                        </td>
                        <td class="py-2 px-4">
                          <button onclick="verDetalhesSimulado(${simulado.id})" 
                            class="text-[#122D6A] hover:text-[#0A1838]">
                            <i class="fas fa-eye"></i> Ver
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="text-center py-8">
                  <i class="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
                  <p class="${themes[currentTheme].textSecondary}">Nenhum simulado realizado ainda</p>
                  <p class="${themes[currentTheme].textSecondary} text-sm mt-2">
                    Clique em um dos botões acima para começar seu primeiro simulado!
                  </p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar dashboard de simulados:', error);
    showModal('❌ Erro ao carregar simulados. Por favor, tente novamente.');
  }
}

// Estado do simulado
let simuladoAtual = {
  questoes: [],
  respostas: {},
  questaoAtual: 0,
  tempoInicio: null,
  tempoLimite: 0,
  tipo: '',
  finalizado: false,
  timerInterval: null
};

// Função para iniciar um novo simulado
window.iniciarSimulado = async function(tipo) {
  const config = {
    'rapido': { nome: 'Rápido', questoes: 10, tempo: 15 },
    'padrao': { nome: 'Padrão', questoes: 30, tempo: 45 },
    'completo': { nome: 'Completo', questoes: 50, tempo: 90 }
  };
  
  const cfg = config[tipo];
  
  // Mostrar loading
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} flex items-center justify-center">
      <div class="text-center">
        <i class="fas fa-spinner fa-spin text-6xl text-[#122D6A] mb-4"></i>
        <p class="${themes[currentTheme].text} text-xl mb-2">Gerando ${cfg.questoes} questões...</p>
        <p class="${themes[currentTheme].textSecondary}">Simulado ${cfg.nome} • ${cfg.tempo} minutos</p>
        <p class="${themes[currentTheme].textSecondary} text-sm mt-4">Isso pode levar alguns segundos...</p>
      </div>
    </div>
  `;
  
  try {
    const response = await axios.post('/api/simulados/gerar-questoes', {
      user_id: currentUser.id,
      tipo: tipo
    });
    
    if (response.data.questoes && response.data.questoes.length > 0) {
      // Inicializar estado do simulado
      simuladoAtual = {
        questoes: response.data.questoes,
        respostas: {},
        questaoAtual: 0,
        tempoInicio: Date.now(),
        tempoLimite: response.data.tempo_minutos * 60 * 1000,
        tipo: tipo,
        finalizado: false,
        timerInterval: null
      };
      
      // Renderizar simulado
      renderSimuladoQuestao();
    } else {
      throw new Error('Nenhuma questão gerada');
    }
  } catch (error) {
    console.error('Erro ao gerar simulado:', error);
    showModal('❌ Erro ao gerar questões. Tente novamente.');
    setTimeout(() => window.renderDashboardSimulados(), 2000);
  }
}

// Renderizar questão atual do simulado
function renderSimuladoQuestao() {
  const questao = simuladoAtual.questoes[simuladoAtual.questaoAtual];
  const totalQuestoes = simuladoAtual.questoes.length;
  const questaoNum = simuladoAtual.questaoAtual + 1;
  const respostaSelecionada = simuladoAtual.respostas[simuladoAtual.questaoAtual];
  
  // Calcular progresso
  const respondidas = Object.keys(simuladoAtual.respostas).length;
  const progresso = Math.round((respondidas / totalQuestoes) * 100);
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg}">
      <!-- Header fixo -->
      <div class="sticky top-0 z-50 ${themes[currentTheme].card} shadow-lg border-b ${themes[currentTheme].border}">
        <div class="max-w-4xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button onclick="confirmarSairSimulado()" 
                class="text-gray-500 hover:text-red-500 transition">
                <i class="fas fa-times text-xl"></i>
              </button>
              <div>
                <h1 class="font-bold ${themes[currentTheme].text}">Simulado ${simuladoAtual.tipo.charAt(0).toUpperCase() + simuladoAtual.tipo.slice(1)}</h1>
                <p class="${themes[currentTheme].textSecondary} text-sm">${respondidas}/${totalQuestoes} respondidas</p>
              </div>
            </div>
            
            <!-- Timer -->
            <div id="timer-simulado" class="flex items-center gap-2 bg-[#6BB6FF]/10 dark:bg-[#0D1F4D]/30 px-4 py-2 rounded-lg">
              <i class="fas fa-clock text-[#122D6A]"></i>
              <span class="font-mono font-bold text-[#122D6A]" id="tempo-restante">--:--</span>
            </div>
          </div>
          
          <!-- Barra de progresso -->
          <div class="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-[#122D6A] transition-all duration-300" style="width: ${progresso}%"></div>
          </div>
        </div>
      </div>
      
      <!-- Conteúdo da questão -->
      <div class="max-w-4xl mx-auto px-4 py-6">
        <!-- Info da questão -->
        <div class="flex items-center justify-between mb-4">
          <span class="px-3 py-1 bg-[#6BB6FF]/10 dark:bg-[#0D1F4D]/30 text-[#0D1F4D] dark:text-[#7BC4FF] rounded-full text-sm font-medium">
            ${questao.disciplina}
          </span>
          <span class="px-3 py-1 ${questao.dificuldade === 'facil' ? 'bg-[#2A4A9F]/10 text-green-700' : questao.dificuldade === 'dificil' ? 'bg-red-100 text-red-700' : 'bg-[#4A90E2]/10 text-yellow-700'} rounded-full text-xs">
            ${questao.dificuldade === 'facil' ? 'Fácil' : questao.dificuldade === 'dificil' ? 'Difícil' : 'Médio'}
          </span>
        </div>
        
        <!-- Número e enunciado -->
        <div class="${themes[currentTheme].card} p-6 rounded-xl shadow-lg border ${themes[currentTheme].border} mb-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 bg-[#122D6A] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
              ${questaoNum}
            </div>
            <p class="${themes[currentTheme].text} text-lg leading-relaxed">${questao.enunciado}</p>
          </div>
        </div>
        
        <!-- Alternativas -->
        <div class="space-y-3 mb-6">
          ${Object.entries(questao.alternativas).map(([letra, texto]) => `
            <button onclick="selecionarResposta('${letra}')" 
              class="w-full text-left p-4 rounded-xl border-2 transition-all ${respostaSelecionada === letra 
                ? 'border-[#122D6A] bg-[#122D6A]/10 dark:bg-blue-900/40 shadow-md' 
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-[#122D6A] hover:bg-[#122D6A]/5 dark:hover:bg-blue-900/20'}">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${respostaSelecionada === letra 
                  ? 'bg-[#122D6A] text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-600 border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200'}">
                  ${letra}
                </div>
                <span class="text-gray-800 dark:text-gray-100 font-normal">${texto}</span>
              </div>
            </button>
          `).join('')}
        </div>
        
        <!-- Navegação entre questões -->
        <div class="flex items-center justify-between">
          <button onclick="navegarQuestao(-1)" 
            ${simuladoAtual.questaoAtual === 0 ? 'disabled' : ''}
            class="px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all ${simuladoAtual.questaoAtual === 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
              : 'bg-white text-[#122D6A] border-2 border-[#122D6A] hover:bg-[#122D6A] hover:text-white'}">
            <i class="fas fa-arrow-left"></i> Anterior
          </button>
          
          <div class="flex gap-1.5 overflow-x-auto max-w-[200px] md:max-w-none">
            ${simuladoAtual.questoes.slice(Math.max(0, simuladoAtual.questaoAtual - 3), Math.min(totalQuestoes, simuladoAtual.questaoAtual + 4)).map((q, idx) => {
              const realIdx = Math.max(0, simuladoAtual.questaoAtual - 3) + idx;
              const respondida = simuladoAtual.respostas[realIdx] !== undefined;
              const atual = realIdx === simuladoAtual.questaoAtual;
              return `
                <button onclick="irParaQuestao(${realIdx})" 
                  class="w-9 h-9 rounded-full text-sm font-bold transition-all shadow-sm ${atual 
                    ? 'bg-[#122D6A] text-white ring-2 ring-cyan-300' 
                    : respondida 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white border-2 border-gray-300 text-gray-600 hover:border-[#122D6A] hover:text-[#122D6A]'}">
                  ${realIdx + 1}
                </button>
              `;
            }).join('')}
          </div>
          
          ${simuladoAtual.questaoAtual === totalQuestoes - 1 ? `
            <button onclick="finalizarSimulado()" 
              class="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
              Finalizar <i class="fas fa-check"></i>
            </button>
          ` : `
            <button onclick="navegarQuestao(1)" 
              class="px-4 py-2 bg-[#122D6A] text-white rounded-lg flex items-center gap-2 hover:bg-[#0D1F4D]">
              Próxima <i class="fas fa-arrow-right"></i>
            </button>
          `}
        </div>
        
        <!-- Grade de questões (mobile toggle) -->
        <div class="mt-6">
          <button onclick="toggleGradeQuestoes()" 
            class="w-full py-2 text-center ${themes[currentTheme].textSecondary} text-sm">
            <i class="fas fa-th mr-2"></i> Ver todas as questões
          </button>
          <div id="grade-questoes" class="hidden mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border ${themes[currentTheme].border} shadow-lg">
            <div class="grid grid-cols-10 gap-2">
              ${simuladoAtual.questoes.map((q, idx) => {
                const respondida = simuladoAtual.respostas[idx] !== undefined;
                const atual = idx === simuladoAtual.questaoAtual;
                return `
                  <button onclick="irParaQuestao(${idx})" 
                    class="w-8 h-8 rounded text-xs font-bold transition-all ${atual 
                      ? 'bg-[#122D6A] text-white ring-2 ring-cyan-300 shadow-md' 
                      : respondida 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-[#6BB6FF]/10 hover:text-[#122D6A]'}">
                    ${idx + 1}
                  </button>
                `;
              }).join('')}
            </div>
            <div class="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs">
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-[#122D6A]"></span> Atual</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-500"></span> Respondida</span>
              <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-gray-200"></span> Pendente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Iniciar timer
  iniciarTimerSimulado();
}

// Selecionar resposta
window.selecionarResposta = function(letra) {
  simuladoAtual.respostas[simuladoAtual.questaoAtual] = letra;
  renderSimuladoQuestao();
}

// Navegar entre questões
window.navegarQuestao = function(direcao) {
  const novaQuestao = simuladoAtual.questaoAtual + direcao;
  if (novaQuestao >= 0 && novaQuestao < simuladoAtual.questoes.length) {
    simuladoAtual.questaoAtual = novaQuestao;
    renderSimuladoQuestao();
  }
}

// Ir para questão específica
window.irParaQuestao = function(idx) {
  if (idx >= 0 && idx < simuladoAtual.questoes.length) {
    simuladoAtual.questaoAtual = idx;
    renderSimuladoQuestao();
  }
}

// Toggle grade de questões
window.toggleGradeQuestoes = function() {
  const grade = document.getElementById('grade-questoes');
  grade.classList.toggle('hidden');
}

// Timer do simulado
function iniciarTimerSimulado() {
  if (simuladoAtual.timerInterval) {
    clearInterval(simuladoAtual.timerInterval);
  }
  
  function atualizarTimer() {
    const agora = Date.now();
    const decorrido = agora - simuladoAtual.tempoInicio;
    const restante = Math.max(0, simuladoAtual.tempoLimite - decorrido);
    
    const minutos = Math.floor(restante / 60000);
    const segundos = Math.floor((restante % 60000) / 1000);
    
    const timerEl = document.getElementById('tempo-restante');
    if (timerEl) {
      timerEl.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
      
      // Alertas visuais
      if (restante < 60000) {
        timerEl.parentElement.classList.add('bg-red-100', 'dark:bg-red-900/30');
        timerEl.parentElement.classList.remove('bg-[#6BB6FF]/10', 'dark:bg-[#0D1F4D]/30');
        timerEl.classList.add('text-red-600');
        timerEl.classList.remove('text-[#122D6A]');
      } else if (restante < 300000) {
        timerEl.parentElement.classList.add('bg-[#4A90E2]/10', 'dark:bg-yellow-900/30');
        timerEl.parentElement.classList.remove('bg-[#6BB6FF]/10', 'dark:bg-[#0D1F4D]/30');
        timerEl.classList.add('text-[#4A90E2]');
        timerEl.classList.remove('text-[#122D6A]');
      }
    }
    
    // Tempo esgotado
    if (restante <= 0 && !simuladoAtual.finalizado) {
      clearInterval(simuladoAtual.timerInterval);
      showModal('⏰ Tempo esgotado! O simulado será finalizado automaticamente.');
      setTimeout(() => finalizarSimulado(true), 2000);
    }
  }
  
  atualizarTimer();
  simuladoAtual.timerInterval = setInterval(atualizarTimer, 1000);
}

// Confirmar saída do simulado com modal personalizado
window.confirmarSairSimulado = function() {
  const modal = document.createElement('div');
  modal.id = 'modal-sair-simulado';
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div class="text-center mb-5">
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-exclamation-triangle text-amber-500 text-3xl"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Sair do Simulado?</h3>
        <p class="text-gray-600">Seu progresso <strong class="text-red-500">NÃO será salvo</strong>.</p>
        <p class="text-gray-500 text-sm mt-1">Você terá que começar novamente.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="fecharModalSairSimulado()" 
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
          Continuar
        </button>
        <button onclick="executarSairSimulado()" 
          class="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition flex items-center justify-center gap-2">
          <i class="fas fa-sign-out-alt"></i> Sair
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.fecharModalSairSimulado = function() {
  const modal = document.getElementById('modal-sair-simulado');
  if (modal) modal.remove();
}

window.executarSairSimulado = function() {
  fecharModalSairSimulado();
  if (simuladoAtual.timerInterval) {
    clearInterval(simuladoAtual.timerInterval);
  }
  window.renderDashboardSimulados();
}

// Finalizar simulado
window.finalizarSimulado = async function(tempoEsgotado = false) {
  if (simuladoAtual.finalizado) return;
  
  const totalQuestoes = simuladoAtual.questoes.length;
  const respondidas = Object.keys(simuladoAtual.respostas).length;
  
  if (!tempoEsgotado && respondidas < totalQuestoes) {
    const naoRespondidas = totalQuestoes - respondidas;
    // Mostrar modal de confirmação
    mostrarModalFinalizarSimulado(naoRespondidas);
    return;
  }
  
  executarFinalizacaoSimulado();
}

// Modal para confirmar finalização com questões não respondidas
window.mostrarModalFinalizarSimulado = function(naoRespondidas) {
  const modal = document.createElement('div');
  modal.id = 'modal-finalizar-simulado';
  modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
      <div class="text-center mb-5">
        <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-question-circle text-amber-500 text-3xl"></i>
        </div>
        <h3 class="text-xl font-bold text-gray-800 mb-2">Finalizar Simulado?</h3>
        <p class="text-gray-600">Você ainda tem <strong class="text-[#122D6A]">${naoRespondidas}</strong> questão(ões) não respondida(s).</p>
        <p class="text-gray-500 text-sm mt-2">Questões em branco serão consideradas erradas.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="fecharModalFinalizarSimulado()" 
          class="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
          Continuar
        </button>
        <button onclick="confirmarFinalizacaoSimulado()" 
          class="flex-1 px-4 py-3 text-sm font-medium text-white bg-[#122D6A] hover:bg-[#0D1F4D] rounded-xl transition flex items-center justify-center gap-2">
          <i class="fas fa-check"></i> Finalizar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.fecharModalFinalizarSimulado = function() {
  const modal = document.getElementById('modal-finalizar-simulado');
  if (modal) modal.remove();
}

window.confirmarFinalizacaoSimulado = function() {
  fecharModalFinalizarSimulado();
  executarFinalizacaoSimulado();
}

window.executarFinalizacaoSimulado = async function() {
  simuladoAtual.finalizado = true;
  if (simuladoAtual.timerInterval) {
    clearInterval(simuladoAtual.timerInterval);
  }
  
  // Definir totalQuestoes localmente
  const totalQuestoes = simuladoAtual.questoes.length;
  
  // Calcular resultado
  let acertos = 0;
  const detalhes = [];
  
  simuladoAtual.questoes.forEach((questao, idx) => {
    const resposta = simuladoAtual.respostas[idx] || null;
    const correto = resposta === questao.resposta_correta;
    if (correto) acertos++;
    
    detalhes.push({
      numero: idx + 1,
      disciplina: questao.disciplina,
      resposta_usuario: resposta,
      resposta_correta: questao.resposta_correta,
      correto
    });
  });
  
  const percentual = Math.round((acertos / totalQuestoes) * 100);
  const tempoGasto = Math.round((Date.now() - simuladoAtual.tempoInicio) / 1000);
  const minutos = Math.floor(tempoGasto / 60);
  const segundos = tempoGasto % 60;
  const tempoFormatado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  
  // Salvar resultado no banco
  try {
    await axios.post('/api/simulados/salvar', {
      user_id: currentUser.id,
      disciplinas: [...new Set(simuladoAtual.questoes.map(q => q.disciplina))],
      topicos: [],
      total_questoes: totalQuestoes,
      acertos,
      percentual_acerto: percentual,
      tempo_gasto: tempoFormatado,
      questoes_detalhes: detalhes
    });
  } catch (error) {
    console.error('Erro ao salvar resultado:', error);
  }
  
  // Mostrar resultado
  renderResultadoSimulado(acertos, totalQuestoes, percentual, tempoFormatado, detalhes);
}

// Renderizar resultado do simulado
function renderResultadoSimulado(acertos, total, percentual, tempo, detalhes) {
  const emoji = percentual >= 70 ? '🎉' : percentual >= 50 ? '👍' : '📚';
  const mensagem = percentual >= 70 ? 'Excelente!' : percentual >= 50 ? 'Bom trabalho!' : 'Continue estudando!';
  const cor = percentual >= 70 ? 'green' : percentual >= 50 ? 'yellow' : 'red';
  
  // Agrupar por disciplina
  const porDisciplina = {};
  detalhes.forEach(d => {
    if (!porDisciplina[d.disciplina]) {
      porDisciplina[d.disciplina] = { acertos: 0, total: 0 };
    }
    porDisciplina[d.disciplina].total++;
    if (d.correto) porDisciplina[d.disciplina].acertos++;
  });
  
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} p-4 md:p-8">
      <div class="max-w-4xl mx-auto">
        <!-- Card principal do resultado -->
        <div class="${themes[currentTheme].card} rounded-2xl shadow-xl border ${themes[currentTheme].border} overflow-hidden mb-6">
          <!-- Header colorido -->
          <div class="bg-gradient-to-r ${cor === 'green' ? 'from-green-500 to-emerald-600' : cor === 'yellow' ? 'from-yellow-500 to-amber-600' : 'from-red-500 to-rose-600'} p-8 text-center text-white">
            <div class="text-6xl mb-4">${emoji}</div>
            <h1 class="text-3xl font-bold mb-2">${mensagem}</h1>
            <p class="opacity-90">Simulado ${simuladoAtual.tipo.charAt(0).toUpperCase() + simuladoAtual.tipo.slice(1)} finalizado</p>
          </div>
          
          <!-- Estatísticas -->
          <div class="p-6">
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="text-center p-4 ${themes[currentTheme].bgAlt} rounded-xl">
                <div class="text-3xl font-bold ${cor === 'green' ? 'text-[#2A4A9F]' : cor === 'yellow' ? 'text-[#4A90E2]' : 'text-red-600'}">${percentual}%</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Aproveitamento</div>
              </div>
              <div class="text-center p-4 ${themes[currentTheme].bgAlt} rounded-xl">
                <div class="text-3xl font-bold ${themes[currentTheme].text}">${acertos}/${total}</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Acertos</div>
              </div>
              <div class="text-center p-4 ${themes[currentTheme].bgAlt} rounded-xl">
                <div class="text-3xl font-bold ${themes[currentTheme].text}">${tempo}</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Tempo</div>
              </div>
            </div>
            
            <!-- Desempenho por disciplina -->
            <h3 class="font-bold ${themes[currentTheme].text} mb-3">
              <i class="fas fa-chart-bar mr-2 text-[#122D6A]"></i>
              Desempenho por Disciplina
            </h3>
            <div class="space-y-3 mb-6">
              ${Object.entries(porDisciplina).map(([disc, stats]) => {
                const pct = Math.round((stats.acertos / stats.total) * 100);
                const barCor = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
                return `
                  <div>
                    <div class="flex justify-between mb-1">
                      <span class="${themes[currentTheme].text} text-sm">${disc}</span>
                      <span class="${themes[currentTheme].textSecondary} text-sm">${stats.acertos}/${stats.total} (${pct}%)</span>
                    </div>
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full ${barCor} transition-all" style="width: ${pct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            
            <!-- Botões de ação -->
            <div class="flex flex-col sm:flex-row gap-3">
              <button onclick="verGabaritoSimulado()" 
                class="flex-1 px-4 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition flex items-center justify-center gap-2">
                <i class="fas fa-list-check"></i> Ver Gabarito Completo
              </button>
              <button onclick="window.renderDashboardSimulados()" 
                class="flex-1 px-4 py-3 border ${themes[currentTheme].border} ${themes[currentTheme].text} rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center justify-center gap-2">
                <i class="fas fa-arrow-left"></i> Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Ver gabarito completo
window.verGabaritoSimulado = function() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen ${themes[currentTheme].bg} p-4 md:p-8">
      <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold ${themes[currentTheme].text}">
            <i class="fas fa-list-check text-[#122D6A] mr-2"></i>
            Gabarito Completo
          </h1>
          <button onclick="window.renderDashboardSimulados()" 
            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
            <i class="fas fa-arrow-left mr-2"></i>Voltar
          </button>
        </div>
        
        <!-- Lista de questões -->
        <div class="space-y-4">
          ${simuladoAtual.questoes.map((questao, idx) => {
            const resposta = simuladoAtual.respostas[idx] || null;
            const correto = resposta === questao.resposta_correta;
            
            return `
              <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} overflow-hidden">
                <!-- Header da questão -->
                <div class="p-4 ${correto ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'} border-b ${themes[currentTheme].border}">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full ${correto ? 'bg-green-500' : 'bg-red-500'} text-white flex items-center justify-center font-bold">
                        ${idx + 1}
                      </div>
                      <div>
                        <span class="font-medium ${themes[currentTheme].text}">${questao.disciplina}</span>
                        <span class="ml-2 px-2 py-0.5 text-xs rounded ${questao.dificuldade === 'facil' ? 'bg-[#2A4A9F]/10 text-green-700' : questao.dificuldade === 'dificil' ? 'bg-red-100 text-red-700' : 'bg-[#4A90E2]/10 text-yellow-700'}">
                          ${questao.dificuldade === 'facil' ? 'Fácil' : questao.dificuldade === 'dificil' ? 'Difícil' : 'Médio'}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      ${correto 
                        ? '<span class="text-[#2A4A9F] font-medium"><i class="fas fa-check-circle mr-1"></i>Correta</span>' 
                        : '<span class="text-red-600 font-medium"><i class="fas fa-times-circle mr-1"></i>Incorreta</span>'}
                    </div>
                  </div>
                </div>
                
                <!-- Enunciado -->
                <div class="p-4">
                  <p class="${themes[currentTheme].text} mb-4">${questao.enunciado}</p>
                  
                  <!-- Alternativas -->
                  <div class="space-y-2 mb-4">
                    ${Object.entries(questao.alternativas).map(([letra, texto]) => {
                      const isCorreta = letra === questao.resposta_correta;
                      const isResposta = letra === resposta;
                      let classe = themes[currentTheme].bgAlt;
                      if (isCorreta) classe = 'bg-[#2A4A9F]/10 dark:bg-green-900/30 border-green-500';
                      else if (isResposta && !isCorreta) classe = 'bg-red-100 dark:bg-red-900/30 border-red-500';
                      
                      return `
                        <div class="p-3 rounded-lg border ${isCorreta || isResposta ? 'border-2' : themes[currentTheme].border} ${classe}">
                          <div class="flex items-start gap-2">
                            <span class="font-bold ${isCorreta ? 'text-[#2A4A9F]' : isResposta ? 'text-red-600' : themes[currentTheme].text}">${letra})</span>
                            <span class="${themes[currentTheme].text}">${texto}</span>
                            ${isCorreta ? '<i class="fas fa-check text-[#2A4A9F] ml-auto"></i>' : ''}
                            ${isResposta && !isCorreta ? '<i class="fas fa-times text-red-600 ml-auto"></i>' : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                  
                  <!-- Explicação -->
                  <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div class="flex items-start gap-2">
                      <i class="fas fa-lightbulb text-blue-500 mt-1"></i>
                      <div>
                        <span class="font-medium text-blue-700 dark:text-blue-300">Explicação:</span>
                        <p class="${themes[currentTheme].text} text-sm mt-1">${questao.explicacao}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        
        <!-- Botão voltar -->
        <div class="mt-6 text-center">
          <button onclick="window.renderDashboardSimulados()" 
            class="px-6 py-3 bg-[#122D6A] text-white rounded-lg hover:bg-[#0D1F4D] transition">
            <i class="fas fa-arrow-left mr-2"></i>Voltar ao Dashboard de Simulados
          </button>
        </div>
      </div>
    </div>
  `;
}

// Função para ver detalhes de um simulado histórico
window.verDetalhesSimulado = async function(simuladoId) {
  try {
    const response = await axios.get(`/api/simulados/detalhes/${simuladoId}`);
    const simulado = response.data.simulado;
    
    if (!simulado) {
      showModal('❌ Simulado não encontrado');
      return;
    }
    
    const detalhes = JSON.parse(simulado.questoes_detalhes || '[]');
    const disciplinas = JSON.parse(simulado.disciplinas || '[]');
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen ${themes[currentTheme].bg} p-4 md:p-8">
        <div class="max-w-4xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h1 class="text-2xl font-bold ${themes[currentTheme].text}">
                <i class="fas fa-chart-bar text-[#122D6A] mr-2"></i>
                Detalhes do Simulado
              </h1>
              <p class="${themes[currentTheme].textSecondary}">
                ${new Date(simulado.data_realizacao).toLocaleDateString('pt-BR')} às ${new Date(simulado.data_realizacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
              </p>
            </div>
            <button onclick="window.renderDashboardSimulados()" 
              class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
              <i class="fas fa-arrow-left mr-2"></i>Voltar
            </button>
          </div>
          
          <!-- Estatísticas -->
          <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} p-6 mb-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-3xl font-bold ${simulado.percentual_acerto >= 70 ? 'text-[#2A4A9F]' : simulado.percentual_acerto >= 50 ? 'text-[#4A90E2]' : 'text-red-600'}">${simulado.percentual_acerto}%</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Aproveitamento</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold ${themes[currentTheme].text}">${simulado.acertos}/${simulado.total_questoes}</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Acertos</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold ${themes[currentTheme].text}">${simulado.tempo_gasto || '--:--'}</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Tempo</div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold ${themes[currentTheme].text}">${disciplinas.length}</div>
                <div class="${themes[currentTheme].textSecondary} text-sm">Disciplinas</div>
              </div>
            </div>
          </div>
          
          <!-- Disciplinas -->
          <div class="${themes[currentTheme].card} rounded-xl border ${themes[currentTheme].border} p-6">
            <h3 class="font-bold ${themes[currentTheme].text} mb-4">Disciplinas Abordadas</h3>
            <div class="flex flex-wrap gap-2">
              ${disciplinas.map(d => `
                <span class="px-3 py-1 bg-[#6BB6FF]/10 dark:bg-[#0D1F4D]/30 text-[#0D1F4D] dark:text-[#7BC4FF] rounded-full text-sm">${d}</span>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erro ao carregar detalhes:', error);
    showModal('❌ Erro ao carregar detalhes do simulado');
  }
}

// ============================================================================
// 🎯 SISTEMA DE TUTORIAL INTERATIVO (ONBOARDING)
// ============================================================================

// Configuração dos passos do tutorial
const tutorialSteps = [
  {
    id: 'welcome',
    title: '👋 Bem-vindo ao IAprova!',
    content: 'Vou te guiar por todas as funcionalidades do sistema para você aproveitar ao máximo sua preparação para concursos.',
    target: null, // Sem elemento específico (tela de boas-vindas)
    position: 'center',
    showSkip: true,
    showPrev: false
  },
  {
    id: 'countdown',
    title: '📅 Contagem Regressiva',
    content: 'Aqui você vê quantos dias faltam para sua prova. O sistema calcula automaticamente se você tem tempo suficiente para estudar todo o conteúdo.',
    target: '[onclick*="abrirModalEditarDataProva"]',
    position: 'bottom',
    highlight: true,
    arrow: 'top'
  },
  {
    id: 'disciplines',
    title: '📚 Suas Disciplinas',
    content: 'Acesse todas as disciplinas do seu edital. Veja o progresso, nível de domínio e gerencie os tópicos de estudo.',
    target: '[onclick="renderPortfolioDisciplinas()"]',
    position: 'bottom',
    highlight: true,
    arrow: 'top'
  },
  {
    id: 'progress',
    title: '📊 Progresso Geral',
    content: 'Acompanhe seu avanço geral no edital. A barra mostra o percentual de tópicos já estudados considerando o peso de cada disciplina.',
    target: '.progresso-geral-card',
    position: 'bottom',
    highlight: true,
    arrow: 'top'
  },
  {
    id: 'simulados',
    title: '✍️ Simulados',
    content: 'Teste seus conhecimentos com simulados personalizados. O sistema acompanha sua evolução e identifica pontos de melhoria.',
    target: '[onclick*="renderDashboardSimulados"]',
    position: 'bottom',
    highlight: true,
    arrow: 'top'
  },
  {
    id: 'weekly-goals',
    title: '🎯 Metas Semanais',
    content: 'O sistema gera automaticamente metas de estudo distribuídas ao longo da semana, respeitando seu tempo disponível e dias de estudo.',
    target: '.semana-resumo-card',
    position: 'top',
    highlight: true,
    arrow: 'bottom'
  },
  {
    id: 'generate-goals',
    title: '✨ Gerar Metas',
    content: 'Clique aqui para gerar suas metas semanais. O sistema cria um cronograma personalizado baseado no seu perfil e tempo até a prova.',
    target: '[onclick="gerarMetasSemana()"]',
    position: 'left',
    highlight: true,
    arrow: 'right'
  },
  {
    id: 'daily-goals',
    title: '📋 Metas Diárias',
    content: 'Cada dia tem metas específicas de teoria, exercícios e revisão. Marque como concluída ao estudar o conteúdo.',
    target: '.meta-card',
    position: 'top',
    highlight: true,
    arrow: 'bottom',
    fallbackTarget: '.calendario-semanal'
  },
  {
    id: 'calendar',
    title: '📆 Calendário Mensal',
    content: 'Visualize seu histórico de estudos. Cores indicam o status: verde (100% concluído), amarelo (parcial) e cinza (não estudado).',
    target: '.calendario-mes',
    position: 'left',
    highlight: true,
    arrow: 'right'
  },
  {
    id: 'daily-stats',
    title: '📈 Estatísticas Diárias',
    content: 'Acompanhe suas métricas: tempo de estudo, metas concluídas e desempenho em exercícios.',
    target: '.stats-card',
    position: 'top',
    highlight: true,
    arrow: 'bottom'
  },
  {
    id: 'new-plan',
    title: '🚀 Criar Novo Plano',
    content: 'Quando quiser estudar para outro concurso ou atualizar seu plano, clique aqui para iniciar uma nova entrevista inteligente.',
    target: '[onclick="iniciarEntrevista()"]',
    position: 'left',
    highlight: true,
    arrow: 'right'
  },
  {
    id: 'tips',
    title: '💡 Dicas Importantes',
    content: `
      <ul class="text-left space-y-2">
        <li>📌 <b>Consistência é chave:</b> Estude um pouco todos os dias</li>
        <li>🎯 <b>Siga as metas:</b> O sistema otimiza seu tempo disponível</li>
        <li>📊 <b>Faça simulados:</b> Identifique seus pontos fracos</li>
        <li>🔄 <b>Revise sempre:</b> A revisão consolida o aprendizado</li>
      </ul>
    `,
    target: null,
    position: 'center',
    showNext: false,
    showFinish: true
  }
];

// Estado do tutorial
let tutorialState = {
  currentStep: 0,
  isActive: false,
  hasCompleted: localStorage.getItem('tutorialCompleted') === 'true',
  overlay: null,
  tooltip: null
};

// Função para iniciar o tutorial
window.startTutorial = function(forceStart = false) {
  // Não inicia se já foi completado (exceto se forçado)
  if (tutorialState.hasCompleted && !forceStart) {
    return;
  }
  
  // Só inicia se estiver no dashboard
  if (!document.querySelector('.dashboard-container') && !document.querySelector('[onclick="renderPortfolioDisciplinas()"]')) {
    console.log('Tutorial aguardando dashboard...');
    return;
  }
  
  tutorialState.isActive = true;
  tutorialState.currentStep = 0;
  createTutorialElements();
  showTutorialStep(0);
}

// Criar elementos do tutorial
function createTutorialElements() {
  // Remover elementos antigos se existirem
  if (tutorialState.overlay) {
    tutorialState.overlay.remove();
  }
  if (tutorialState.tooltip) {
    tutorialState.tooltip.remove();
  }
  
  // Criar overlay (fundo escuro com buraco para spotlight)
  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'fixed inset-0 z-[9998] pointer-events-none transition-all duration-300';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <svg class="absolute inset-0 w-full h-full">
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white"/>
          <rect id="spotlight-hole" x="0" y="0" width="0" height="0" rx="8" fill="black"/>
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="black" mask="url(#spotlight-mask)" opacity="0.6"/>
    </svg>
  `;
  document.body.appendChild(overlay);
  tutorialState.overlay = overlay;
  
  // Criar tooltip
  const tooltip = document.createElement('div');
  tooltip.id = 'tutorial-tooltip';
  tooltip.className = 'fixed z-[9999] pointer-events-auto';
  document.body.appendChild(tooltip);
  tutorialState.tooltip = tooltip;
  
  // Adicionar estilos CSS
  if (!document.querySelector('#tutorial-styles')) {
    const styles = document.createElement('style');
    styles.id = 'tutorial-styles';
    styles.innerHTML = `
      @keyframes tutorialPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.9; }
      }
      
      @keyframes tutorialBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      
      @keyframes tutorialSlideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .tutorial-highlight {
        animation: tutorialPulse 2s ease-in-out infinite;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3);
        position: relative;
        z-index: 9997;
      }
      
      .tutorial-tooltip-arrow {
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
      }
      
      .tutorial-tooltip-arrow.top {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 0 12px 12px 12px;
        border-color: transparent transparent white transparent;
      }
      
      .tutorial-tooltip-arrow.bottom {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 12px 12px 0 12px;
        border-color: white transparent transparent transparent;
      }
      
      .tutorial-tooltip-arrow.left {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-width: 12px 12px 12px 0;
        border-color: transparent white transparent transparent;
      }
      
      .tutorial-tooltip-arrow.right {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
        border-width: 12px 0 12px 12px;
        border-color: transparent transparent transparent white;
      }
      
      .tutorial-progress-dot {
        transition: all 0.3s ease;
      }
      
      .tutorial-progress-dot.active {
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        transform: scale(1.2);
      }
      
      .tutorial-progress-dot.completed {
        background: #10b981;
      }
      
      #tutorial-tooltip {
        animation: tutorialSlideIn 0.5s ease-out;
      }
    `;
    document.head.appendChild(styles);
  }
}

// Mostrar passo do tutorial
function showTutorialStep(stepIndex) {
  const step = tutorialSteps[stepIndex];
  if (!step) return;
  
  // Limpar highlight anterior
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
  
  // Encontrar elemento alvo
  let targetElement = null;
  if (step.target) {
    targetElement = document.querySelector(step.target);
    // Se não encontrar, tentar target alternativo
    if (!targetElement && step.fallbackTarget) {
      targetElement = document.querySelector(step.fallbackTarget);
    }
  }
  
  // Configurar spotlight
  const spotlightHole = document.querySelector('#spotlight-hole');
  if (targetElement && step.highlight) {
    const rect = targetElement.getBoundingClientRect();
    const padding = 10;
    spotlightHole.setAttribute('x', rect.left - padding);
    spotlightHole.setAttribute('y', rect.top - padding);
    spotlightHole.setAttribute('width', rect.width + (padding * 2));
    spotlightHole.setAttribute('height', rect.height + (padding * 2));
    
    // Adicionar classe de highlight
    targetElement.classList.add('tutorial-highlight');
    
    // Scroll suave até o elemento
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    // Sem spotlight (tela cheia)
    spotlightHole.setAttribute('width', '0');
    spotlightHole.setAttribute('height', '0');
  }
  
  // Configurar tooltip
  const tooltip = tutorialState.tooltip;
  tooltip.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-md p-6 ${step.position === 'center' ? 'w-[90vw] md:w-[500px]' : 'w-[320px]'}">
      <!-- Seta -->
      ${step.arrow ? `<div class="tutorial-tooltip-arrow ${step.arrow}"></div>` : ''}
      
      <!-- Header -->
      <div class="mb-4">
        <h3 class="text-xl font-bold text-gray-800 mb-1">${step.title}</h3>
        <div class="flex gap-1 mt-2">
          ${tutorialSteps.map((_, i) => `
            <div class="tutorial-progress-dot w-2 h-2 rounded-full bg-gray-300 ${
              i === stepIndex ? 'active' : i < stepIndex ? 'completed' : ''
            }"></div>
          `).join('')}
        </div>
      </div>
      
      <!-- Conteúdo -->
      <div class="text-gray-600 text-sm leading-relaxed mb-6">
        ${step.content}
      </div>
      
      <!-- Botões -->
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          ${step.showSkip !== false ? `
            <button onclick="skipTutorial()" class="text-gray-400 hover:text-gray-600 text-sm transition">
              Pular tour
            </button>
          ` : ''}
        </div>
        <div class="flex gap-2">
          ${step.showPrev !== false && stepIndex > 0 ? `
            <button onclick="prevTutorialStep()" class="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition">
              <i class="fas fa-chevron-left mr-1"></i> Anterior
            </button>
          ` : ''}
          ${step.showNext !== false && stepIndex < tutorialSteps.length - 1 ? `
            <button onclick="nextTutorialStep()" class="px-4 py-2 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-lg hover:shadow-lg transition">
              Próximo <i class="fas fa-chevron-right ml-1"></i>
            </button>
          ` : ''}
          ${step.showFinish ? `
            <button onclick="finishTutorial()" class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition">
              <i class="fas fa-check mr-2"></i> Concluir
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Posicionar tooltip
  positionTooltip(tooltip, targetElement, step.position);
}

// Posicionar tooltip em relação ao elemento
function positionTooltip(tooltip, targetElement, position) {
  // Reset posição
  tooltip.style.left = '';
  tooltip.style.top = '';
  tooltip.style.right = '';
  tooltip.style.bottom = '';
  tooltip.style.transform = '';
  
  if (!targetElement || position === 'center') {
    // Centro da tela
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }
  
  const rect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const spacing = 20;
  
  switch (position) {
    case 'top':
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltip.style.top = `${rect.top - tooltipRect.height - spacing}px`;
      break;
    case 'bottom':
      tooltip.style.left = `${rect.left + (rect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltip.style.top = `${rect.bottom + spacing}px`;
      break;
    case 'left':
      tooltip.style.left = `${rect.left - tooltipRect.width - spacing}px`;
      tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
      break;
    case 'right':
      tooltip.style.left = `${rect.right + spacing}px`;
      tooltip.style.top = `${rect.top + (rect.height / 2) - (tooltipRect.height / 2)}px`;
      break;
  }
  
  // Ajustar se sair da tela
  const finalRect = tooltip.getBoundingClientRect();
  if (finalRect.left < 10) {
    tooltip.style.left = '10px';
  }
  if (finalRect.right > window.innerWidth - 10) {
    tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
  }
  if (finalRect.top < 10) {
    tooltip.style.top = '10px';
  }
  if (finalRect.bottom > window.innerHeight - 10) {
    tooltip.style.top = `${window.innerHeight - tooltipRect.height - 10}px`;
  }
}

// Navegação do tutorial
window.nextTutorialStep = function() {
  if (tutorialState.currentStep < tutorialSteps.length - 1) {
    tutorialState.currentStep++;
    showTutorialStep(tutorialState.currentStep);
  }
}

window.prevTutorialStep = function() {
  if (tutorialState.currentStep > 0) {
    tutorialState.currentStep--;
    showTutorialStep(tutorialState.currentStep);
  }
}

window.skipTutorial = function() {
  finishTutorial(false);
}

window.finishTutorial = function(completed = true) {
  // Limpar elementos
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight');
  });
  
  if (tutorialState.overlay) {
    tutorialState.overlay.style.opacity = '0';
    setTimeout(() => {
      tutorialState.overlay?.remove();
      tutorialState.overlay = null;
    }, 300);
  }
  
  if (tutorialState.tooltip) {
    tutorialState.tooltip.style.opacity = '0';
    setTimeout(() => {
      tutorialState.tooltip?.remove();
      tutorialState.tooltip = null;
    }, 300);
  }
  
  // Marcar como completado
  if (completed) {
    localStorage.setItem('tutorialCompleted', 'true');
    tutorialState.hasCompleted = true;
    
    // Mostrar mensagem de conclusão
    showSuccess('🎉 Tutorial concluído! Você pode revê-lo a qualquer momento no menu de configurações.');
  }
  
  tutorialState.isActive = false;
}

// Iniciar tutorial automaticamente APENAS no primeiro login
window.checkAndStartTutorial = function() {
  // Verificar dados de acesso
  const dadosAcesso = localStorage.getItem('dadosAcesso');
  const acessos = dadosAcesso ? JSON.parse(dadosAcesso) : null;
  const primeiroLogin = !acessos || acessos.totalAcessos === 1;
  
  // Verificar se o tutorial já foi visto
  const tutorialJaVisto = localStorage.getItem('tutorialCompleted') === 'true';
  tutorialState.hasCompleted = tutorialJaVisto;
  
  console.log('🎓 Verificando tutorial:', { 
    primeiroLogin, 
    totalAcessos: acessos?.totalAcessos || 0,
    tutorialJaVisto, 
    isActive: tutorialState.isActive 
  });
  
  // ✅ NOVO: Mostrar tutorial APENAS se for o primeiro login E nunca viu o tutorial
  if (primeiroLogin && !tutorialJaVisto && currentUser && !tutorialState.isActive) {
    // Aguardar o dashboard carregar completamente
    setTimeout(() => {
      if (document.querySelector('[onclick="renderPortfolioDisciplinas()"]')) {
        console.log('🎓 Iniciando tutorial para primeiro login');
        startTutorial();
        // Marcar como completado para não mostrar novamente
        localStorage.setItem('tutorialCompleted', 'true');
        tutorialState.hasCompleted = true;
      }
    }, 1500);
  }
  
  // Atualizar contador de acessos após renderizar o dashboard
  setTimeout(() => {
    atualizarExibicaoAcessos();
  }, 100);
}

// Adicionar opção de reiniciar tutorial no menu
window.resetTutorial = function() {
  localStorage.removeItem('tutorialCompleted');
  tutorialState.hasCompleted = false;
  startTutorial(true);
}

// ============================================================================
// 🎯 BOTÃO FLUTUANTE DE AJUDA/TUTORIAL
// ============================================================================

// Criar botão de ajuda flutuante no canto inferior direito
window.createHelpButton = function() {
  // Remover botão existente se houver
  const existingButton = document.getElementById('help-button-container');
  if (existingButton) {
    existingButton.remove();
  }
  
  // Criar botão flutuante de ajuda (lado direito, acima do chat)
  const helpContainer = document.createElement('div');
  helpContainer.id = 'help-button-container';
  helpContainer.innerHTML = `
    <!-- Botão Principal de Ajuda - Posicionado no lado direito, acima do chat -->
    <button 
      id="help-button"
      onclick="toggleHelpMenu()"
      class="fixed bottom-24 right-6 z-[9990] w-14 h-14 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 group hover:scale-110 flex items-center justify-center"
      title="Central de Ajuda"
    >
      <i class="fas fa-question text-white text-xl group-hover:rotate-12 transition-transform"></i>
    </button>
    
    <!-- Menu de Opções de Ajuda - Abre acima do botão -->
    <div id="help-menu" class="hidden fixed bottom-44 right-6 z-[9991] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-3 min-w-[260px] border border-gray-200 dark:border-gray-700" style="animation: slideUp 0.3s ease-out;">
      <div class="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-bold text-[#122D6A] dark:text-blue-400 flex items-center gap-2">
          <i class="fas fa-life-ring"></i> Central de Ajuda
        </h3>
      </div>
      <div class="space-y-1">
        <button 
          onclick="startTutorial(true); toggleHelpMenu()"
          class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-xl transition-all group"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <i class="fas fa-graduation-cap text-white text-sm"></i>
          </div>
          <div class="text-left">
            <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Tour Guiado</p>
            <p class="text-xs text-gray-500">Aprenda a usar o sistema</p>
          </div>
        </button>
        
        <button 
          onclick="openFAQ(); toggleHelpMenu()"
          class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-xl transition-all group"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-[#2A4A9F] to-[#3A5AB0] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <i class="fas fa-question-circle text-white text-sm"></i>
          </div>
          <div class="text-left">
            <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Perguntas Frequentes</p>
            <p class="text-xs text-gray-500">Dúvidas comuns</p>
          </div>
        </button>
        
        <button 
          onclick="window.abrirModalAjuda && window.abrirModalAjuda(); toggleHelpMenu()"
          class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-xl transition-all group"
        >
          <div class="w-10 h-10 bg-gradient-to-br from-[#122D6A] to-[#1A3A7F] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
            <i class="fas fa-book-open text-white text-sm"></i>
          </div>
          <div class="text-left">
            <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Documentação</p>
            <p class="text-xs text-gray-500">Como usar cada recurso</p>
          </div>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(helpContainer);
  
  // Adicionar estilos CSS
  if (!document.querySelector('#help-button-styles')) {
    const styles = document.createElement('style');
    styles.id = 'help-button-styles';
    styles.innerHTML = `
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #help-button:hover { transform: scale(1.1); }
    `;
    document.head.appendChild(styles);
  }
}

// Toggle do menu de ajuda
window.toggleHelpMenu = function() {
  const menu = document.getElementById('help-menu');
  const button = document.getElementById('help-button');
  const badge = document.getElementById('help-badge');
  const container = document.getElementById('help-button-container');
  
  if (menu) {
    menu.classList.toggle('hidden');
    
    // Marcar como clicado
    if (!localStorage.getItem('helpButtonClicked')) {
      localStorage.setItem('helpButtonClicked', 'true');
      if (badge) badge.classList.add('hidden');
      if (container) container.classList.add('clicked');
    }
    
    // Rotação do ícone
    if (!menu.classList.contains('hidden')) {
      button.querySelector('i').classList.add('rotate-180');
      
      // Fechar ao clicar fora
      setTimeout(() => {
        document.addEventListener('click', function closeHelpMenu(e) {
          if (!e.target.closest('#help-button-container')) {
            menu.classList.add('hidden');
            button.querySelector('i').classList.remove('rotate-180');
            document.removeEventListener('click', closeHelpMenu);
          }
        });
      }, 100);
    } else {
      button.querySelector('i').classList.remove('rotate-180');
    }
  }
}

// Função para expandir/colapsar itens do FAQ
window.toggleFAQItem = function(button) {
  // Procurar pela div com classe hidden que contém o conteúdo
  const contentDiv = button.querySelector('.flex-1');
  const content = contentDiv.querySelector('.hidden, .mt-2');
  const icon = button.querySelector('i.fa-chevron-right');
  
  if (content) {
    if (content.classList.contains('hidden')) {
      content.classList.remove('hidden');
      if (icon) {
        icon.style.transform = 'rotate(90deg)';
      }
    } else {
      content.classList.add('hidden');
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
      }
    }
  }
}

window.openFAQ = function() {
  // Criar modal de FAQ
  const modalFAQ = document.createElement('div');
  modalFAQ.id = 'modal-faq';
  modalFAQ.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4';
  modalFAQ.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] p-6 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <i class="fas fa-question-circle text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold">Perguntas Frequentes</h2>
              <p class="text-sm opacity-80">Tire suas dúvidas sobre o IAprova</p>
            </div>
          </div>
          <button onclick="document.getElementById('modal-faq').remove()" 
            class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Conteúdo do FAQ -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <div class="space-y-4">
          
          <!-- Categoria: Começando -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-[#122D6A] mb-3 flex items-center gap-2">
              <i class="fas fa-rocket"></i> Começando
            </h3>
            
            <div class="space-y-3">
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Como faço meu primeiro plano de estudos?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>1. Clique em "Novo Plano" no dashboard</p>
                      <p>2. Complete a entrevista em 4 passos:</p>
                      <p class="ml-4">• Escolha a área e cargo desejado</p>
                      <p class="ml-4">• Informe seu perfil (tempo disponível, experiência)</p>
                      <p class="ml-4">• Selecione as disciplinas do edital</p>
                      <p class="ml-4">• Defina a data da prova</p>
                      <p>3. O sistema criará automaticamente seu plano personalizado!</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">O que significam os ícones ao lado das metas?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>📖 <strong>Livro:</strong> Teoria do conteúdo</p>
                      <p>✏️ <strong>Tarefas:</strong> Exercícios práticos</p>
                      <p>📝 <strong>Arquivo:</strong> Resumo esquematizado</p>
                      <p>🎴 <strong>Cards:</strong> Flashcards para memorização</p>
                      <p class="mt-2">• <strong>Ícone transparente:</strong> Conteúdo ainda não gerado</p>
                      <p>• <strong>Ícone opaco:</strong> Conteúdo já foi gerado e está disponível</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Categoria: Metas e Estudos -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-[#122D6A] mb-3 flex items-center gap-2">
              <i class="fas fa-calendar-check"></i> Metas e Estudos
            </h3>
            
            <div class="space-y-3">
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Como gero conteúdo de estudo?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>1. Clique no botão <strong>"Estudar"</strong> em qualquer meta</p>
                      <p>2. Escolha o tipo de conteúdo desejado:</p>
                      <p class="ml-4">• Teoria completa</p>
                      <p class="ml-4">• Exercícios práticos</p>
                      <p class="ml-4">• Resumo esquematizado</p>
                      <p class="ml-4">• Flashcards</p>
                      <p>3. A IA gerará conteúdo personalizado para o tópico</p>
                      <p>4. Após gerar, os ícones ficarão ativos para acesso rápido</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Como funciona a geração de metas semanais?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>• O sistema distribui os tópicos ao longo da semana</p>
                      <p>• Considera apenas os dias que você pode estudar</p>
                      <p>• Respeita seu tempo disponível por dia</p>
                      <p>• Prioriza disciplinas com maior peso no concurso</p>
                      <p>• Se começar no meio da semana, gera metas só para os dias restantes</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Posso editar minhas metas?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>Sim! Você pode:</p>
                      <p>• Marcar metas como concluídas com o botão ✓</p>
                      <p>• Ver semanas anteriores clicando em "Anteriores"</p>
                      <p>• Gerar nova semana quando quiser com "Gerar Metas"</p>
                      <p>• Ajustar seu plano em "Meus Planos"</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Categoria: Simulados -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-[#122D6A] mb-3 flex items-center gap-2">
              <i class="fas fa-tasks"></i> Simulados
            </h3>
            
            <div class="space-y-3">
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Como funcionam os simulados?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>• <strong>Rápido:</strong> 10 questões em 15 minutos</p>
                      <p>• <strong>Padrão:</strong> 30 questões em 45 minutos</p>
                      <p>• <strong>Completo:</strong> 50 questões em 90 minutos</p>
                      <p class="mt-2">As questões são geradas por IA baseadas nas suas disciplinas</p>
                      <p>Ao finalizar, você recebe:</p>
                      <p class="ml-4">• Percentual de acertos</p>
                      <p class="ml-4">• Tempo gasto</p>
                      <p class="ml-4">• Gabarito comentado</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Categoria: Análise de Viabilidade -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-[#122D6A] mb-3 flex items-center gap-2">
              <i class="fas fa-chart-line"></i> Análise e Progresso
            </h3>
            
            <div class="space-y-3">
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">O que significa a análise de viabilidade?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>A viabilidade indica se você tem tempo suficiente para estudar todo o conteúdo:</p>
                      <p>• <strong class="text-[#122D6A]">✓ Tempo confortável:</strong> Sobra tempo para revisões</p>
                      <p>• <strong class="text-[#122D6A]">✓ Tempo adequado:</strong> Tempo justo para cobrir tudo</p>
                      <p>• <strong class="text-gray-600">⚠️ Tempo apertado:</strong> Precisa otimizar estudos</p>
                      <p>• <strong class="text-gray-800">⚠️ Tempo crítico:</strong> Foque nos tópicos principais</p>
                    </div>
                  </div>
                </button>
              </div>
              
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Como acompanho meu progresso?</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>• <strong>Card de Progresso:</strong> Mostra % de tópicos estudados</p>
                      <p>• <strong>Calendário Semanal:</strong> Visualize metas diárias</p>
                      <p>• <strong>Estatísticas:</strong> Horas estudadas, dias ativos</p>
                      <p>• <strong>Mini Calendário:</strong> Histórico mensal de estudos</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Categoria: Dicas -->
          <div class="mb-6">
            <h3 class="text-lg font-bold text-[#122D6A] mb-3 flex items-center gap-2">
              <i class="fas fa-lightbulb"></i> Dicas de Uso
            </h3>
            
            <div class="space-y-3">
              <div class="bg-[#E8EDF5]/30 rounded-xl p-4 border border-[#122D6A]/10">
                <button onclick="toggleFAQItem(this)" class="w-full text-left flex items-start gap-3">
                  <i class="fas fa-chevron-right text-[#122D6A] mt-1 transition-transform"></i>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">Melhores práticas para estudar</p>
                    <div class="hidden mt-2 text-sm text-gray-600 space-y-2">
                      <p>✅ <strong>Seja realista:</strong> Informe seu tempo real disponível</p>
                      <p>✅ <strong>Siga a ordem:</strong> Estude os tópicos na sequência sugerida</p>
                      <p>✅ <strong>Use todos os recursos:</strong> Teoria, exercícios, resumos e flashcards</p>
                      <p>✅ <strong>Marque conclusões:</strong> Registre seu progresso diariamente</p>
                      <p>✅ <strong>Faça simulados:</strong> Teste seus conhecimentos regularmente</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalFAQ);
}

// Funções removidas - openSupport e openVideoTutorial não são mais necessárias

// Função para adicionar botão de ajuda no header
function addHelpToHeader() {
  // Procurar o container do menu do usuário no header
  const userMenuContainer = document.querySelector('.flex.items-center.gap-2');
  if (!userMenuContainer) return;
  
  // Verificar se já existe
  if (document.getElementById('header-help-button')) return;
  
  // Criar container posicionado relativamente
  const helpContainer = document.createElement('div');
  helpContainer.className = 'relative';
  helpContainer.id = 'header-help-container';
  
  // Criar botão de ajuda
  const helpBtn = document.createElement('button');
  helpBtn.id = 'header-help-button';
  helpBtn.onclick = function(e) {
    e.stopPropagation();
    const menu = document.getElementById('header-help-menu');
    if (menu) {
      menu.classList.toggle('hidden');
      
      // Fechar ao clicar fora
      if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
          document.addEventListener('click', function closeMenuOnOutside(event) {
            if (!event.target.closest('#header-help-container')) {
              menu.classList.add('hidden');
              document.removeEventListener('click', closeMenuOnOutside);
            }
          });
        }, 100);
      }
    }
  };
  helpBtn.className = 'group p-2.5 hover:bg-[#E8EDF5] dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center';
  helpBtn.innerHTML = `
    <i class="fas fa-question-circle text-[#122D6A] dark:text-blue-400 text-xl group-hover:scale-110 transition-transform"></i>
  `;
  helpBtn.title = 'Ajuda e FAQ';
  
  // Criar menu dropdown de ajuda
  const helpMenu = document.createElement('div');
  helpMenu.id = 'header-help-menu';
  helpMenu.className = 'hidden absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden';
  helpMenu.innerHTML = `
    <div class="p-3">
      <div class="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-bold text-[#122D6A] dark:text-blue-400 flex items-center gap-2">
          <i class="fas fa-life-ring"></i> Central de Ajuda
        </h3>
      </div>
      <button 
        onclick="startTutorial(true); document.getElementById('header-help-menu').classList.add('hidden');"
        class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-lg transition-all group"
      >
        <div class="w-10 h-10 bg-gradient-to-br from-[#122D6A] to-[#2A4A9F] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="fas fa-graduation-cap text-white text-sm"></i>
        </div>
        <div class="text-left">
          <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Tour Guiado</p>
          <p class="text-xs text-gray-500">Aprenda a usar o sistema</p>
        </div>
      </button>
      
      <button 
        onclick="openFAQ(); document.getElementById('header-help-menu').classList.add('hidden');"
        class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-lg transition-all group"
      >
        <div class="w-10 h-10 bg-gradient-to-br from-[#2A4A9F] to-[#3A5AB0] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="fas fa-question-circle text-white text-sm"></i>
        </div>
        <div class="text-left">
          <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Perguntas Frequentes</p>
          <p class="text-xs text-gray-500">Dúvidas comuns</p>
        </div>
      </button>
      
      <button 
        onclick="window.abrirModalAjuda && window.abrirModalAjuda(); document.getElementById('header-help-menu').classList.add('hidden');"
        class="w-full flex items-center gap-3 px-3 py-3 hover:bg-[#122D6A]/10 dark:hover:bg-gray-700 rounded-lg transition-all group"
      >
        <div class="w-10 h-10 bg-gradient-to-br from-[#1A3A7F] to-[#2A4A9F] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <i class="fas fa-book-open text-white text-sm"></i>
        </div>
        <div class="text-left">
          <p class="font-semibold text-gray-800 dark:text-gray-200 text-sm">Documentação</p>
          <p class="text-xs text-gray-500">Como usar cada recurso</p>
        </div>
      </button>
    </div>
  `;
  
  // Montar estrutura
  helpContainer.appendChild(helpBtn);
  helpContainer.appendChild(helpMenu);
  
  // Inserir antes do menu do usuário
  userMenuContainer.insertBefore(helpContainer, userMenuContainer.firstChild);
}

// Atualizar toggleHelpMenu para trabalhar com o novo menu no header
window.toggleHelpMenu = function() {
  const menu = document.getElementById('header-help-menu') || document.getElementById('help-menu');
  if (menu) {
    menu.classList.toggle('hidden');
    
    // Fechar ao clicar fora
    if (!menu.classList.contains('hidden')) {
      setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
          if (!e.target.closest('#header-help-button') && !e.target.closest('#help-button-container')) {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
          }
        });
      }, 100);
    }
  }
}

// ============================================================================
// 🎨 SISTEMA DE PERSONALIZAÇÃO DE CONTEÚDO IA
// ============================================================================

// Configurações padrão de personalização
const defaultIAConfig = {
  tom: 'didatico', // formal, tecnico, didatico, direto, casual
  temperatura: 0.5, // 0.1 a 1.0 (baixo = objetivo, alto = criativo)
  intensidade: 'intermediaria', // superficial, intermediaria, aprofundada
  profundidade: 'aplicada', // conceitual, aplicada, analitica
  extensao: 'medio', // curto, medio, longo, personalizado
  extensaoCustom: 2000, // caracteres quando extensao = personalizado
  formatoResumo: 'detalhado', // curto, detalhado
  formatoTeoria: 'completa', // basica, completa, avancada
  formatoFlashcards: 'objetivos', // objetivos, aprofundados
  formatoExercicios: 'padrao', // simples, padrao, complexo
};

// Carregar configurações salvas ou usar padrão
let iaConfig = JSON.parse(localStorage.getItem('iaConfig')) || defaultIAConfig;

// Função para salvar configurações
function salvarConfigIA() {
  localStorage.setItem('iaConfig', JSON.stringify(iaConfig));
  showToast('Configurações salvas com sucesso!', 'success');
}

// Função para resetar configurações
function resetarConfigIA() {
  iaConfig = { ...defaultIAConfig };
  salvarConfigIA();
  atualizarInterfaceConfig();
}

// Atualizar interface com configurações atuais
function atualizarInterfaceConfig() {
  // Tom
  document.querySelectorAll('[name="config-tom"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.tom;
  });
  
  // Temperatura
  const tempSlider = document.getElementById('config-temperatura');
  const tempValue = document.getElementById('temp-value');
  if (tempSlider) {
    tempSlider.value = iaConfig.temperatura;
    if (tempValue) {
      tempValue.textContent = Math.round(iaConfig.temperatura * 100) + '%';
    }
  }
  
  // Intensidade
  document.querySelectorAll('[name="config-intensidade"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.intensidade;
  });
  
  // Profundidade
  document.querySelectorAll('[name="config-profundidade"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.profundidade;
  });
  
  // Extensão
  document.querySelectorAll('[name="config-extensao"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.extensao;
  });
  
  // Extensão customizada
  const customChars = document.getElementById('config-extensao-custom');
  if (customChars) {
    customChars.value = iaConfig.extensaoCustom;
    customChars.style.display = iaConfig.extensao === 'personalizado' ? 'block' : 'none';
  }
  
  // Formatos
  document.querySelectorAll('[name="config-formato-resumo"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.formatoResumo;
  });
  document.querySelectorAll('[name="config-formato-teoria"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.formatoTeoria;
  });
  document.querySelectorAll('[name="config-formato-flashcards"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.formatoFlashcards;
  });
  document.querySelectorAll('[name="config-formato-exercicios"]').forEach(radio => {
    radio.checked = radio.value === iaConfig.formatoExercicios;
  });
}

// Criar botão de configurações de IA
function createIAConfigButton() {
  // Não criar botão separado, usar o FAB unificado
  // Esta função agora é chamada junto com o FAB
  return;
}

// Abrir modal de configurações
window.openIAConfig = function() {
  const modalConfig = document.createElement('div');
  modalConfig.id = 'modal-ia-config';
  modalConfig.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4';
  modalConfig.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] p-6 text-white">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <i class="fas fa-sliders-h text-2xl"></i>
            </div>
            <div>
              <h2 class="text-2xl font-bold">Personalização da IA</h2>
              <p class="text-sm opacity-80">Configure como a IA gera seu conteúdo</p>
            </div>
          </div>
          <button onclick="document.getElementById('modal-ia-config').remove()" 
            class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <!-- Conteúdo -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Coluna 1: Tom e Temperatura -->
          <div class="space-y-6">
            
            <!-- Tom do Conteúdo -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-microphone"></i> Tom do Conteúdo
              </h3>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-tom" value="formal" 
                    onchange="iaConfig.tom = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Formal</p>
                    <p class="text-sm text-gray-600">Linguagem acadêmica e protocolar</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-tom" value="tecnico"
                    onchange="iaConfig.tom = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Técnico</p>
                    <p class="text-sm text-gray-600">Termos específicos e precisos</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-tom" value="didatico" checked
                    onchange="iaConfig.tom = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Didático</p>
                    <p class="text-sm text-gray-600">Explicativo e pedagógico</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-tom" value="direto"
                    onchange="iaConfig.tom = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Direto</p>
                    <p class="text-sm text-gray-600">Objetivo e sem rodeios</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-tom" value="casual"
                    onchange="iaConfig.tom = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Casual</p>
                    <p class="text-sm text-gray-600">Conversacional e amigável</p>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Temperatura/Criatividade -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-thermometer-half"></i> Criatividade
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between text-sm text-gray-600">
                  <span>Objetivo</span>
                  <span id="temp-value" class="font-bold text-[#122D6A]">50%</span>
                  <span>Criativo</span>
                </div>
                <input 
                  type="range" 
                  id="config-temperatura"
                  min="0.1" 
                  max="1.0" 
                  step="0.1" 
                  value="0.5"
                  onchange="iaConfig.temperatura = parseFloat(this.value); document.getElementById('temp-value').textContent = Math.round(this.value * 100) + '%'"
                  class="w-full accent-[#122D6A]"
                >
                <p class="text-xs text-gray-500">
                  Baixo: Respostas mais previsíveis e consistentes<br>
                  Alto: Respostas mais variadas e criativas
                </p>
              </div>
            </div>
            
            <!-- Intensidade -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-layer-group"></i> Intensidade
              </h3>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-intensidade" value="superficial"
                    onchange="iaConfig.intensidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Superficial</p>
                    <p class="text-sm text-gray-600">Visão geral e básica</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-intensidade" value="intermediaria" checked
                    onchange="iaConfig.intensidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Intermediária</p>
                    <p class="text-sm text-gray-600">Equilíbrio entre básico e avançado</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-intensidade" value="aprofundada"
                    onchange="iaConfig.intensidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Aprofundada</p>
                    <p class="text-sm text-gray-600">Detalhado e completo</p>
                  </div>
                </label>
              </div>
            </div>
            
          </div>
          
          <!-- Coluna 2: Profundidade e Extensão -->
          <div class="space-y-6">
            
            <!-- Profundidade Teórica -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-brain"></i> Profundidade Teórica
              </h3>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-profundidade" value="conceitual"
                    onchange="iaConfig.profundidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Conceitual</p>
                    <p class="text-sm text-gray-600">Foco em definições e conceitos</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-profundidade" value="aplicada" checked
                    onchange="iaConfig.profundidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Aplicada</p>
                    <p class="text-sm text-gray-600">Teoria com exemplos práticos</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-profundidade" value="analitica"
                    onchange="iaConfig.profundidade = this.value"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Analítica</p>
                    <p class="text-sm text-gray-600">Análise crítica e comparativa</p>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Extensão do Conteúdo -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-ruler-horizontal"></i> Extensão do Conteúdo
              </h3>
              <div class="space-y-3">
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-extensao" value="curto"
                    onchange="iaConfig.extensao = this.value; document.getElementById('config-extensao-custom').style.display = 'none'"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Curto</p>
                    <p class="text-sm text-gray-600">Até 500 caracteres</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-extensao" value="medio" checked
                    onchange="iaConfig.extensao = this.value; document.getElementById('config-extensao-custom').style.display = 'none'"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Médio</p>
                    <p class="text-sm text-gray-600">500-2000 caracteres</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-extensao" value="longo"
                    onchange="iaConfig.extensao = this.value; document.getElementById('config-extensao-custom').style.display = 'none'"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Longo</p>
                    <p class="text-sm text-gray-600">2000-5000 caracteres</p>
                  </div>
                </label>
                <label class="flex items-start gap-3 cursor-pointer group">
                  <input type="radio" name="config-extensao" value="personalizado"
                    onchange="iaConfig.extensao = this.value; document.getElementById('config-extensao-custom').style.display = 'block'"
                    class="mt-1 text-[#122D6A] focus:ring-[#122D6A]">
                  <div>
                    <p class="font-semibold group-hover:text-[#122D6A]">Personalizado</p>
                    <p class="text-sm text-gray-600">Defina o limite de caracteres</p>
                  </div>
                </label>
                <input 
                  type="number" 
                  id="config-extensao-custom"
                  min="100" 
                  max="10000" 
                  value="2000"
                  placeholder="Número de caracteres"
                  onchange="iaConfig.extensaoCustom = parseInt(this.value)"
                  class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-[#122D6A] focus:ring-[#122D6A] hidden"
                  style="display: none;"
                >
              </div>
            </div>
            
            <!-- Formatos Preferidos -->
            <div class="bg-[#E8EDF5]/30 rounded-xl p-5 border border-[#122D6A]/10">
              <h3 class="text-lg font-bold text-[#122D6A] mb-4 flex items-center gap-2">
                <i class="fas fa-file-alt"></i> Formatos Preferidos
              </h3>
              <div class="space-y-4">
                
                <!-- Formato Resumo -->
                <div>
                  <p class="font-semibold text-gray-700 mb-2">Resumos:</p>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-resumo" value="curto"
                        onchange="iaConfig.formatoResumo = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Curto</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-resumo" value="detalhado" checked
                        onchange="iaConfig.formatoResumo = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Detalhado</span>
                    </label>
                  </div>
                </div>
                
                <!-- Formato Teoria -->
                <div>
                  <p class="font-semibold text-gray-700 mb-2">Teoria:</p>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-teoria" value="basica"
                        onchange="iaConfig.formatoTeoria = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Básica</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-teoria" value="completa" checked
                        onchange="iaConfig.formatoTeoria = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Completa</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-teoria" value="avancada"
                        onchange="iaConfig.formatoTeoria = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Avançada</span>
                    </label>
                  </div>
                </div>
                
                <!-- Formato Flashcards -->
                <div>
                  <p class="font-semibold text-gray-700 mb-2">Flashcards:</p>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-flashcards" value="objetivos" checked
                        onchange="iaConfig.formatoFlashcards = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Objetivos</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-flashcards" value="aprofundados"
                        onchange="iaConfig.formatoFlashcards = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Aprofundados</span>
                    </label>
                  </div>
                </div>
                
                <!-- Formato Exercícios -->
                <div>
                  <p class="font-semibold text-gray-700 mb-2">Exercícios:</p>
                  <div class="flex gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-exercicios" value="simples"
                        onchange="iaConfig.formatoExercicios = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Simples</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-exercicios" value="padrao" checked
                        onchange="iaConfig.formatoExercicios = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Padrão</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="config-formato-exercicios" value="complexo"
                        onchange="iaConfig.formatoExercicios = this.value"
                        class="text-[#122D6A] focus:ring-[#122D6A]">
                      <span class="text-sm">Complexo</span>
                    </label>
                  </div>
                </div>
                
              </div>
            </div>
            
          </div>
        </div>
      </div>
      
      <!-- Footer com botões -->
      <div class="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
        <button 
          onclick="resetarConfigIA()"
          class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
        >
          <i class="fas fa-undo mr-2"></i>
          Restaurar Padrões
        </button>
        <div class="flex gap-3">
          <button 
            onclick="document.getElementById('modal-ia-config').remove()"
            class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button 
            onclick="salvarConfigIA(); document.getElementById('modal-ia-config').remove()"
            class="px-6 py-2 bg-gradient-to-r from-[#122D6A] to-[#2A4A9F] text-white rounded-lg hover:shadow-lg transition"
          >
            <i class="fas fa-save mr-2"></i>
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalConfig);
  atualizarInterfaceConfig();
}

// Função para gerar prompt personalizado baseado nas configurações
function gerarPromptPersonalizado(tipo, conteudoBase) {
  const config = iaConfig;
  
  // Mapeamento de configurações para instruções
  const tomInstrucoes = {
    formal: 'Use linguagem formal, acadêmica e protocolar.',
    tecnico: 'Use terminologia técnica específica e precisa.',
    didatico: 'Seja explicativo e pedagógico, facilitando o entendimento.',
    direto: 'Seja objetivo e direto ao ponto, sem rodeios.',
    casual: 'Use linguagem conversacional e amigável.'
  };
  
  const intensidadeInstrucoes = {
    superficial: 'Forneça uma visão geral básica do conteúdo.',
    intermediaria: 'Equilibre conceitos básicos com aprofundamentos moderados.',
    aprofundada: 'Seja detalhado e completo, cobrindo todos os aspectos.'
  };
  
  const profundidadeInstrucoes = {
    conceitual: 'Foque em definições e conceitos teóricos.',
    aplicada: 'Combine teoria com exemplos práticos e aplicações.',
    analitica: 'Inclua análise crítica, comparações e diferentes perspectivas.'
  };
  
  const extensaoLimites = {
    curto: 'máximo 500 caracteres',
    medio: 'entre 500 e 2000 caracteres',
    longo: 'entre 2000 e 5000 caracteres',
    personalizado: `exatamente ${config.extensaoCustom} caracteres`
  };
  
  // Construir prompt personalizado
  let promptPersonalizado = `
    CONFIGURAÇÕES DE PERSONALIZAÇÃO (OBRIGATÓRIO SEGUIR):
    
    1. TOM: ${tomInstrucoes[config.tom]}
    2. CRIATIVIDADE: ${Math.round(config.temperatura * 100)}% (${config.temperatura < 0.4 ? 'seja mais objetivo e previsível' : config.temperatura > 0.7 ? 'seja mais criativo e variado' : 'equilibre objetividade e criatividade'})
    3. INTENSIDADE: ${intensidadeInstrucoes[config.intensidade]}
    4. PROFUNDIDADE: ${profundidadeInstrucoes[config.profundidade]}
    5. EXTENSÃO: Limite de ${extensaoLimites[config.extensao]}
    `;
  
  // Adicionar instruções específicas por tipo de conteúdo
  if (tipo === 'resumo') {
    if (config.formatoResumo === 'curto') {
      promptPersonalizado += '\n6. FORMATO: Resumo CURTO com pontos-chave apenas.';
    } else {
      promptPersonalizado += '\n6. FORMATO: Resumo DETALHADO com explicações completas.';
    }
  } else if (tipo === 'teoria') {
    if (config.formatoTeoria === 'basica') {
      promptPersonalizado += '\n6. FORMATO: Teoria BÁSICA com conceitos fundamentais.';
    } else if (config.formatoTeoria === 'avancada') {
      promptPersonalizado += '\n6. FORMATO: Teoria AVANÇADA com detalhes técnicos complexos.';
    } else {
      promptPersonalizado += '\n6. FORMATO: Teoria COMPLETA cobrindo todos os aspectos.';
    }
  } else if (tipo === 'flashcards') {
    if (config.formatoFlashcards === 'objetivos') {
      promptPersonalizado += '\n6. FORMATO: Flashcards OBJETIVOS - apenas conceito e definição direta.';
    } else {
      promptPersonalizado += '\n6. FORMATO: Flashcards APROFUNDADOS - conceito, explicação detalhada e exemplo.';
    }
  } else if (tipo === 'exercicios') {
    if (config.formatoExercicios === 'simples') {
      promptPersonalizado += '\n6. FORMATO: Exercícios SIMPLES de nível básico.';
    } else if (config.formatoExercicios === 'complexo') {
      promptPersonalizado += '\n6. FORMATO: Exercícios COMPLEXOS que exigem raciocínio avançado.';
    } else {
      promptPersonalizado += '\n6. FORMATO: Exercícios de nível PADRÃO/intermediário.';
    }
  }
  
  promptPersonalizado += '\n\n' + conteudoBase;
  
  return promptPersonalizado;
}

// Função para verificar token de email
async function verifyEmailToken(token) {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br ${c('primary').gradient}">
      <div class="${themes[currentTheme].card} p-8 rounded-lg shadow-2xl w-full max-w-md text-center">
        <i class="fas fa-spinner fa-spin text-6xl ${c('primary').icon} mb-4"></i>
        <h2 class="text-xl font-bold ${themes[currentTheme].text}">Verificando email...</h2>
      </div>
    </div>
  `;
  
  try {
    const response = await axios.get(`/api/verify-email/${token}`);
    
    // Limpar token da URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    showModal(response.data.message, { 
      type: response.data.success ? 'success' : 'info',
      title: response.data.success ? '✅ Email Verificado!' : 'ℹ️ Aviso'
    });
    
    // Redirecionar para login após 3 segundos
    setTimeout(() => {
      renderLogin();
    }, 3000);
    
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    const errorMsg = error.response?.data?.error || 'Token inválido ou expirado';
    
    showModal(errorMsg, { type: 'error' });
    
    // Mostrar opção de reenvio
    setTimeout(() => {
      renderEmailVerification('', errorMsg, true);
    }, 3000);
  }
}

// Adicionar estilos de animação
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  .animate-fade-in { animation: fadeIn 0.3s ease-out; }
  .animate-fade-out { animation: fadeOut 0.3s ease-out; }
`;
document.head.appendChild(styleSheet);

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 IAprova iniciando...');
  
  // Verificar parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const verificationToken = urlParams.get('token');
  const pathname = window.location.pathname;
  
  // Se está na página de reset de senha
  if (pathname === '/resetar-senha' && verificationToken) {
    resetPasswordWithToken(verificationToken);
  }
  // Se tem token de verificação de email
  else if (pathname === '/verificar-email' && verificationToken) {
    verifyEmailToken(verificationToken);
  }
  // Rota normal
  else {
    // Verificar se há usuário salvo
    const savedUser = localStorage.getItem('userId');
    if (savedUser) {
      currentUser = {
        id: parseInt(savedUser),
        email: localStorage.getItem('userEmail'),
        name: localStorage.getItem('userName')
      };
      renderDashboard();
    } else {
      renderLogin();
    }
  }
  
  // Criar botão de ajuda após um tempo
  setTimeout(createHelpButton, 1000);
});

// Mostrar banca detectada após upload
function mostrarBancaDetectada(banca) {
  if (!banca) return;
  
  const alertDiv = document.createElement('div');
  alertDiv.className = 'fixed top-4 right-4 bg-[#2A4A9F]/10 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg z-50';
  alertDiv.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-check-circle mr-2"></i>
      <div>
        <p class="font-bold">Banca Identificada!</p>
        <p class="text-sm">Conteúdo será adaptado para: <strong>${banca}</strong></p>
      </div>
    </div>
  `;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}


// Função melhorada para mostrar tooltip
function mostrarTooltipOpcao(event, tooltip) {
  const button = event.currentTarget;
  
  if (tooltip && button) {
    tooltip.classList.remove('hidden');
    
    // Posicionar tooltip
    const btnRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Calcular posição
    let left = btnRect.left + (btnRect.width / 2) - (tooltipRect.width / 2);
    let top = btnRect.bottom + 8;
    
    // Ajustar se sair da tela pela esquerda
    if (left < 10) {
      left = 10;
    }
    // Ajustar se sair da tela pela direita
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.zIndex = '9999';
  }
}

// Modal de Ajuda
window.abrirModalAjuda = function() {
  const modal = document.createElement('div');
  modal.id = 'modal-ajuda';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
            <i class="fas fa-question-circle text-blue-500 mr-2"></i>
            Central de Ajuda
          </h2>
          <button onclick="document.getElementById('modal-ajuda').remove()" 
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
      
      <div class="p-6 space-y-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-blue-800 dark:text-blue-300">
            <i class="fas fa-info-circle mr-2"></i>Como usar o IAprova?
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Faça o upload do edital do seu concurso</li>
            <li>• Preencha a entrevista inicial com seus dados</li>
            <li>• Receba um plano de estudos personalizado</li>
            <li>• Gere conteúdos com IA para cada tópico</li>
          </ul>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-green-800 dark:text-green-300">
            <i class="fas fa-graduation-cap mr-2"></i>Recursos Disponíveis
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• <strong>Teoria:</strong> Conteúdo completo do tópico</li>
            <li>• <strong>Exercícios:</strong> Questões no estilo da banca</li>
            <li>• <strong>Resumo:</strong> Síntese do conteúdo</li>
            <li>• <strong>Flashcards:</strong> Cards para memorização</li>
            <li>• <strong>Resumo Personalizado:</strong> Upload de PDF para resumo</li>
          </ul>
        </div>
        
        <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <h3 class="font-bold text-lg mb-2 text-yellow-800 dark:text-yellow-300">
            <i class="fas fa-lightbulb mr-2"></i>Dicas Importantes
          </h3>
          <ul class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>• Configure a IA no menu para personalizar o conteúdo</li>
            <li>• Use o tema escuro para estudar à noite</li>
            <li>• Acompanhe seu progresso no dashboard</li>
            <li>• Revise regularmente com flashcards</li>
          </ul>
        </div>
        
        <div class="text-center pt-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Precisa de mais ajuda? Entre em contato pelo suporte.
          </p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Funções do Menu de Ajuda
window.toggleHelpMenu = function() {
  const menu = document.getElementById('help-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

window.showHelpTopic = function(topic) {
  const helps = {
    inicio: {
      title: 'Como Começar',
      content: `
        <ol class="space-y-2 text-sm">
          <li>1. Faça seu cadastro ou login</li>
          <li>2. Faça upload do edital do concurso</li>
          <li>3. Preencha a entrevista inicial</li>
          <li>4. Receba seu plano personalizado</li>
          <li>5. Comece a estudar com IA!</li>
        </ol>
      `
    },
    edital: {
      title: 'Upload de Edital',
      content: `
        <div class="space-y-2 text-sm">
          <p>📄 Formatos aceitos: PDF, TXT</p>
          <p>⚠️ Se o PDF der erro, converta para TXT em:</p>
          <p class="text-blue-600">ilovepdf.com/pt/pdf_para_texto</p>
          <p>✅ A IA analisará automaticamente o conteúdo</p>
        </div>
      `
    },
    conteudo: {
      title: 'Gerar Conteúdo com IA',
      content: `
        <div class="space-y-2 text-sm">
          <p><strong>5 tipos disponíveis:</strong></p>
          <p>📘 Teoria - Explicação completa</p>
          <p>📝 Exercícios - Questões práticas</p>
          <p>📋 Resumo - Síntese do conteúdo</p>
          <p>🎯 Flashcards - Memorização</p>
          <p>📄 Resumo Personalizado - Upload PDF</p>
        </div>
      `
    },
    plano: {
      title: 'Plano de Estudos',
      content: `
        <div class="space-y-2 text-sm">
          <p>📅 Cronograma semanal personalizado</p>
          <p>⏰ Baseado no seu tempo disponível</p>
          <p>📊 Acompanhe seu progresso</p>
          <p>🎯 Foco nas matérias do seu cargo</p>
        </div>
      `
    }
  };
  
  const help = helps[topic];
  if (help) {
    showHelpModal(help.title, help.content);
  }
}

window.showFullHelp = function() {
  const content = `
    <div class="space-y-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">🚀 Início Rápido</h3>
        <ol class="space-y-1 text-sm">
          <li>1. Cadastre-se com seu email</li>
          <li>2. Faça upload do edital (PDF ou TXT)</li>
          <li>3. Complete a entrevista inicial</li>
          <li>4. Explore seu plano de estudos</li>
          <li>5. Gere conteúdos com IA</li>
        </ol>
      </div>
      
      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">💡 Dicas Importantes</h3>
        <ul class="space-y-1 text-sm">
          <li>• Configure a IA no menu (3 pontinhos)</li>
          <li>• Use tema escuro para estudar à noite</li>
          <li>• Revise com flashcards diariamente</li>
          <li>• Acompanhe progresso no dashboard</li>
        </ul>
      </div>
      
      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
        <h3 class="font-bold mb-2">⚠️ Problemas Comuns</h3>
        <ul class="space-y-1 text-sm">
          <li>• PDF não funciona? Converta para TXT</li>
          <li>• IA lenta? Aguarde 30-60 segundos</li>
          <li>• Email não chega? Verifique spam</li>
        </ul>
      </div>
    </div>
  `;
  
  showHelpModal('Central de Ajuda Completa', content);
}

window.showHelpModal = function(title, content) {
  // Fechar menu dropdown
  document.getElementById('help-menu')?.classList.add('hidden');
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-800 dark:text-white">
          <i class="fas fa-question-circle text-blue-500 mr-2"></i>
          ${title}
        </h2>
        <button onclick="document.getElementById('help-modal').remove()" 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="p-6">
        ${content}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Fechar menu ao clicar fora
document.addEventListener('click', function(e) {
  const helpButton = document.querySelector('#help-button-container button');
  const helpMenu = document.getElementById('help-menu');
  if (helpMenu && !helpButton.contains(e.target) && !helpMenu.contains(e.target)) {
    helpMenu.classList.add('hidden');
  }
});
