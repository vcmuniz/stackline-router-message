// Runtime configuration - detecta automaticamente baseado no domínio
(function() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    // Desenvolvimento: portas específicas
    window.APP_CONFIG = {
      API_URL: 'http://localhost:4000',
      WS_URL: 'http://localhost:4500'
    };
  } else {
    // Produção: baseado no domínio atual
    window.APP_CONFIG = {
      API_URL: window.location.origin + '/api',
      WS_URL: window.location.origin.replace('http', 'ws') + '/realtime'
    };
  }
})();
