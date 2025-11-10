import axios from 'axios';

// Runtime config (dinâmico baseado no domínio)
declare global {
  interface Window {
    APP_CONFIG?: {
      API_URL: string;
      WS_URL: string;
    };
  }
}

// Criar instância do axios (baseURL vazio, será setado no interceptor)
const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para setar baseURL dinamicamente
api.interceptors.request.use((config) => {
  // Usar runtime config se disponível, senão usar env, senão localhost
  const baseURL = window.APP_CONFIG?.API_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
  config.baseURL = baseURL;
  return config;
});

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// APIs de Integração
export const integrationsApi = {
  // Listar todas
  list: () => api.get('/api/integrations'),

  // Buscar por ID
  get: (id: string) => api.get(`/api/integrations/${id}`),

  // Criar nova
  create: (data: {
    name: string;
    type: string;
    config: any;
  }) => api.post('/api/integrations', data),

  // Atualizar
  update: (id: string, data: any) =>
    api.put(`/api/integrations/${id}`, data),

  // Deletar
  delete: (id: string) =>
    api.delete(`/api/integrations/${id}`),

  // Toggle (conectar/desconectar)
  toggle: (id: string) =>
    api.post(`/api/integrations/${id}/toggle`),

  // Obter QR Code
  getQRCode: (id: string) =>
    api.get(`/api/integrations/${id}/qrcode`),

  // Estatísticas
  getStats: (id: string) =>
    api.get(`/api/integrations/${id}/stats`)
};

// APIs de Mensagens
export const messagesApi = {
  // Listar com filtros
  list: (params?: {
    integrationId?: string;
    status?: string;
    direction?: string;
    contactId?: string;
    page?: number;
    limit?: number;
  }) => api.get('/api/messages', { params }),

  // Buscar por ID
  get: (id: string) => api.get(`/api/messages/${id}`),

  // Enviar mensagem
  send: (data: {
    integrationId: string;
    toContact: {
      phoneNumber?: string;
      email?: string;
      telegramId?: string;
      name?: string;
    };
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    replyToId?: string;
    threadId?: string;
  }) => api.post('/api/messages/send', data),

  // Atualizar status
  updateStatus: (id: string, status: string, errorMessage?: string) =>
    api.patch(`/api/messages/${id}/status`, { status, errorMessage }),

  // Deletar
  delete: (id: string) =>
    api.delete(`/api/messages/${id}`),

  // Buscar thread
  getThread: (contactId: string, integrationId: string) =>
    api.get(`/api/messages/threads/${contactId}`, {
      params: { integrationId }
    })
};

// APIs de Contatos
export const contactsApi = {
  // Listar
  list: (integrationId?: string) =>
    api.get('/api/contacts', {
      params: integrationId ? { integrationId } : {}
    }),

  // Buscar por ID
  get: (id: string) => api.get(`/api/contacts/${id}`),

  // Criar/Atualizar
  upsert: (data: {
    integrationId: string;
    phoneNumber?: string;
    email?: string;
    telegramId?: string;
    name?: string;
    tags?: string;
  }) => api.post('/api/contacts', data),

  // Deletar
  delete: (id: string) =>
    api.delete(`/api/contacts/${id}`)
};

// APIs de Dashboard
export const dashboardApi = {
  // Estatísticas gerais
  getStats: () => api.get('/dashboard'),

  // Gráficos
  getChartData: (period: 'day' | 'week' | 'month' = 'week') =>
    api.get('/dashboard/charts', { params: { period } })
};

// APIs de API Keys
export const apiKeysApi = {
  // Listar todas
  list: () => api.get('/api/api-keys'),

  // Criar nova
  create: (data: {
    name: string;
    permissions: string[];
    rateLimit?: number;
    expiresAt?: string;
  }) => api.post('/api/api-keys', data),

  // Atualizar
  update: (id: string, data: {
    name?: string;
    permissions?: string[];
    rateLimit?: number;
    enabled?: boolean;
    expiresAt?: string;
  }) => api.put(`/api/api-keys/${id}`, data),

  // Deletar
  delete: (id: string) => api.delete(`/api/api-keys/${id}`)
};

// APIs de Webhooks
export const webhooksApi = {
  // Listar todos
  list: () => api.get('/api/webhooks'),

  // Criar novo
  create: (data: {
    name: string;
    url: string;
    events: string[];
  }) => api.post('/api/webhooks', data),

  // Atualizar
  update: (id: string, data: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
  }) => api.put(`/api/webhooks/${id}`, data),

  // Deletar
  delete: (id: string) => api.delete(`/api/webhooks/${id}`),

  // Testar webhook
  test: (id: string) => api.post(`/api/webhooks/${id}/test`),

  // Obter logs
  getLogs: (id: string) => api.get(`/api/webhooks/${id}/logs`)
};

// APIs de Autenticação
export const authApi = {
  // Login
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  // Registro
  register: (data: {
    email: string;
    password: string;
    name?: string;
  }) => api.post('/auth/register', data),

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

export default api;