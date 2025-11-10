// Runtime configuration - detecta automaticamente baseado no domínio
window.APP_CONFIG = {
  API_URL: window.location.origin + '/api',
  WS_URL: window.location.origin.replace('http', 'ws') + '/realtime'
};
