import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  Paper,
  useTheme,
  alpha,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Webhook as WebhookIcon,
  PlayArrow as TestIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { webhooksApi } from '../services/api';

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  totalSent: number;
  totalFailed: number;
  lastSentAt: string | null;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  event: string;
  url: string;
  payload: any;
  response: any;
  statusCode: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  { value: 'message.sent', label: 'Mensagem Enviada' },
  { value: 'message.delivered', label: 'Mensagem Entregue' },
  { value: 'message.read', label: 'Mensagem Lida' },
  { value: 'message.failed', label: 'Mensagem Falhada' },
  { value: 'message.received', label: 'Mensagem Recebida' },
  { value: 'integration.connected', label: 'Integração Conectada' },
  { value: 'integration.disconnected', label: 'Integração Desconectada' },
];

export default function Webhooks() {
  const theme = useTheme();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [logsDialog, setLogsDialog] = useState(false);
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<WebhookLog[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await webhooksApi.list();
      setWebhooks(response.data);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      showSnackbar('Erro ao carregar webhooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (webhook?: Webhook) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setFormData({
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
      });
    } else {
      setEditingWebhook(null);
      setFormData({
        name: '',
        url: '',
        events: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWebhook(null);
  };

  const handleSave = async () => {
    try {
      if (editingWebhook) {
        await webhooksApi.update(editingWebhook.id, formData);
        showSnackbar('Webhook atualizado com sucesso', 'success');
      } else {
        await webhooksApi.create(formData);
        showSnackbar('Webhook criado com sucesso', 'success');
      }
      handleCloseDialog();
      loadWebhooks();
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      showSnackbar('Erro ao salvar webhook', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este webhook?')) return;

    try {
      await webhooksApi.delete(id);
      showSnackbar('Webhook deletado com sucesso', 'success');
      loadWebhooks();
    } catch (error) {
      console.error('Erro ao deletar webhook:', error);
      showSnackbar('Erro ao deletar webhook', 'error');
    }
  };

  const handleTest = async (id: string) => {
    try {
      await webhooksApi.test(id);
      showSnackbar('Webhook de teste enviado com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      showSnackbar('Erro ao testar webhook', 'error');
    }
  };

  const handleViewLogs = async (webhookId: string) => {
    try {
      const response = await webhooksApi.getLogs(webhookId);
      setSelectedWebhookLogs(response.data);
      setLogsDialog(true);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      showSnackbar('Erro ao carregar logs', 'error');
    }
  };

  const handleToggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }));
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Layout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Webhooks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure webhooks para receber notificações de eventos em tempo real
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            Novo Webhook
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.background.default }}>
                <TableCell>Nome</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Eventos</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estatísticas</TableCell>
                <TableCell>Último Envio</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Carregando...</TableCell>
                </TableRow>
              ) : webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box py={4}>
                      <WebhookIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">
                        Nenhum webhook configurado ainda
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                webhooks.map((webhook) => (
                  <TableRow key={webhook.id} hover>
                    <TableCell>
                      <Typography fontWeight="500">{webhook.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {webhook.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {webhook.events.slice(0, 2).map((event) => (
                          <Chip
                            key={event}
                            label={event.split('.')[1]}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {webhook.events.length > 2 && (
                          <Chip
                            label={`+${webhook.events.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={webhook.enabled ? 'Ativo' : 'Inativo'}
                        color={webhook.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Chip
                          icon={<SuccessIcon />}
                          label={webhook.totalSent}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        {webhook.totalFailed > 0 && (
                          <Chip
                            icon={<ErrorIcon />}
                            label={webhook.totalFailed}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {webhook.lastSentAt
                          ? new Date(webhook.lastSentAt).toLocaleString('pt-BR')
                          : 'Nunca enviado'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver Logs">
                        <IconButton
                          size="small"
                          onClick={() => handleViewLogs(webhook.id)}
                          color="info"
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Testar">
                        <IconButton
                          size="small"
                          onClick={() => handleTest(webhook.id)}
                          color="success"
                        >
                          <TestIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(webhook)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(webhook.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog de Criação/Edição */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={3} pt={2}>
              <TextField
                label="Nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                fullWidth
                required
                placeholder="https://seu-site.com/webhook"
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Eventos para Notificar
                </Typography>
                <FormGroup>
                  {AVAILABLE_EVENTS.map((event) => (
                    <FormControlLabel
                      key={event.value}
                      control={
                        <Checkbox
                          checked={formData.events.includes(event.value)}
                          onChange={() => handleToggleEvent(event.value)}
                        />
                      }
                      label={event.label}
                    />
                  ))}
                </FormGroup>
              </Box>

              {!editingWebhook && (
                <Alert severity="info">
                  Um secret será gerado automaticamente para validação HMAC das requisições.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.name || !formData.url || formData.events.length === 0}
            >
              {editingWebhook ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog de Logs */}
        <Dialog
          open={logsDialog}
          onClose={() => setLogsDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Logs do Webhook</DialogTitle>
          <DialogContent>
            {selectedWebhookLogs.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">
                  Nenhum log disponível
                </Typography>
              </Box>
            ) : (
              <List>
                {selectedWebhookLogs.map((log) => (
                  <ListItem
                    key={log.id}
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      mb: 1,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" width="100%" mb={1}>
                      <Box display="flex" gap={1} alignItems="center">
                        {log.success ? (
                          <SuccessIcon color="success" fontSize="small" />
                        ) : (
                          <ErrorIcon color="error" fontSize="small" />
                        )}
                        <Typography variant="body2" fontWeight="500">
                          {log.event}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${log.statusCode}`}
                        size="small"
                        color={log.success ? 'success' : 'error'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                    {log.errorMessage && (
                      <Alert severity="error" sx={{ mt: 1, width: '100%' }}>
                        {log.errorMessage}
                      </Alert>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLogsDialog(false)}>Fechar</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}
