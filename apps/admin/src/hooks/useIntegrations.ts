import { useState, useEffect } from 'react';
import { integrationsApi } from '../services/api';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  webhookUrl?: string;
  config: any;
  lastSync?: string;
  messagesSent: number;
  messagesReceived: number;
  messagesDelivered: number;
  messagesFailed: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
    contacts: number;
  };
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar integrações
  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsApi.list();
      setIntegrations(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar integrações');
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar integração
  const createIntegration = async (data: {
    name: string;
    type: string;
    config: any;
  }) => {
    try {
      const response = await integrationsApi.create(data);
      setIntegrations([response.data, ...integrations]);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao criar integração');
    }
  };

  // Atualizar integração
  const updateIntegration = async (id: string, data: any) => {
    try {
      const response = await integrationsApi.update(id, data);
      setIntegrations(integrations.map(i =>
        i.id === id ? response.data : i
      ));
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao atualizar integração');
    }
  };

  // Deletar integração
  const deleteIntegration = async (id: string) => {
    try {
      await integrationsApi.delete(id);
      setIntegrations(integrations.filter(i => i.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao deletar integração');
    }
  };

  // Toggle integração
  const toggleIntegration = async (id: string) => {
    try {
      const response = await integrationsApi.toggle(id);
      setIntegrations(integrations.map(i =>
        i.id === id ? response.data : i
      ));
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao alternar integração');
    }
  };

  // Obter QR Code
  const getQRCode = async (id: string) => {
    try {
      const response = await integrationsApi.getQRCode(id);
      return response.data.qrcode;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao obter QR Code');
    }
  };

  // Obter estatísticas
  const getStats = async (id: string) => {
    try {
      const response = await integrationsApi.getStats(id);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Erro ao obter estatísticas');
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  return {
    integrations,
    loading,
    error,
    refresh: fetchIntegrations,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    toggleIntegration,
    getQRCode,
    getStats
  };
}