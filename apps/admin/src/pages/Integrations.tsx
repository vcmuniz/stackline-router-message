import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Fab,
  Badge,
  LinearProgress,
  alpha,
  useTheme,
  Switch,
  FormControlLabel,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  WhatsApp,
  Email,
  Sms,
  MoreVert,
  CheckCircle,
  Error,
  Warning,
  Settings,
  Delete,
  Edit,
  Cable,
  Telegram,
  ContentCopy,
  Visibility,
  VisibilityOff,
  Link as LinkIcon,
  QrCode2,
  Refresh,
  PowerSettingsNew,
  Speed,
  Message,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { integrationsApi } from '../services/api';

interface Integration {
  id: string;
  name: string;
  type: 'WHATSAPP_EVOLUTION' | 'WHATSAPP_BAILEYS' | 'SMTP' | 'SMS_TWILIO' | 'SMS_ZENVIA' | 'TELEGRAM';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  webhookUrl?: string;
  config: any;
  lastSync?: string;
  messagesSent?: number;
  messagesReceived?: number;
  messagesDelivered?: number;
  messagesFailed?: number;
  _count?: {
    messages: number;
    contacts: number;
  };
}

export default function Integrations() {
  const theme = useTheme();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'WHATSAPP_EVOLUTION',
    config: {},
  });
  const [qrcodeDialog, setQrcodeDialog] = useState(false);
  const [qrcodeData, setQrcodeData] = useState<any>(null);
  const [loadingQrcode, setLoadingQrcode] = useState(false);
  const [currentQrcodeIntegrationId, setCurrentQrcodeIntegrationId] = useState<string>('');

  // Carregar integrações
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { data } = await integrationsApi.list();
      setIntegrations(data);
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP_EVOLUTION':
      case 'WHATSAPP_BAILEYS':
        return <WhatsApp />;
      case 'SMTP':
        return <Email />;
      case 'SMS_TWILIO':
      case 'SMS_ZENVIA':
        return <Sms />;
      case 'TELEGRAM':
        return <Telegram />;
      default:
        return <Cable />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      case 'ERROR':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'ERROR':
        return <Error sx={{ fontSize: 16 }} />;
      case 'PENDING':
        return <Warning sx={{ fontSize: 16 }} />;
      default:
        return null;
    }
  };

  const handleAddIntegration = () => {
    setEditingIntegration(null);
    setFormData({ name: '', type: 'WHATSAPP_EVOLUTION', config: {} });
    setOpenDialog(true);
  };

  const handleEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      config: integration.config,
    });
    setOpenDialog(true);
  };

  const handleSaveIntegration = async () => {
    try {
      if (editingIntegration) {
        // Atualizar
        await integrationsApi.update(editingIntegration.id, formData);
      } else {
        // Criar
        await integrationsApi.create(formData);
      }
      setOpenDialog(false);
      loadIntegrations();
    } catch (error) {
      console.error('Erro ao salvar integração:', error);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta integração?')) return;
    try {
      await integrationsApi.delete(id);
      loadIntegrations();
    } catch (error) {
      console.error('Erro ao deletar integração:', error);
    }
  };

  const handleToggleIntegration = async (id: string) => {
    try {
      await integrationsApi.toggle(id);
      loadIntegrations();
    } catch (error) {
      console.error('Erro ao alternar integração:', error);
    }
  };

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const handleShowQRCode = async (integrationId: string) => {
    try {
      setCurrentQrcodeIntegrationId(integrationId);
      setLoadingQrcode(true);
      setQrcodeDialog(true);
      const { data } = await integrationsApi.getQRCode(integrationId);
      setQrcodeData(data);
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      setQrcodeDialog(false);
    } finally {
      setLoadingQrcode(false);
    }
  };

  return (
    <Layout>
      <Box>
        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
              Integrações
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie todos os seus canais de comunicação em um só lugar
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddIntegration}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
              }
            }}
          >
            Nova Integração
          </Button>
        </Box>

        {/* Stats Overview */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha('#4caf50', 0.1)} 0%, ${alpha('#4caf50', 0.05)} 100%)`,
              border: `1px solid ${alpha('#4caf50', 0.3)}`,
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Integrações Ativas
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#4caf50">
                      {integrations.filter(i => i.status === 'active').length}
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: '#4caf50', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha('#2196f3', 0.1)} 0%, ${alpha('#2196f3', 0.05)} 100%)`,
              border: `1px solid ${alpha('#2196f3', 0.3)}`,
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total de Mensagens
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#2196f3">
                      5.2K
                    </Typography>
                  </Box>
                  <Message sx={{ fontSize: 40, color: '#2196f3', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha('#ff9800', 0.1)} 0%, ${alpha('#ff9800', 0.05)} 100%)`,
              border: `1px solid ${alpha('#ff9800', 0.3)}`,
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Aguardando Configuração
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#ff9800">
                      {integrations.filter(i => i.status === 'pending').length}
                    </Typography>
                  </Box>
                  <Warning sx={{ fontSize: 40, color: '#ff9800', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{
              background: `linear-gradient(135deg, ${alpha('#f44336', 0.1)} 0%, ${alpha('#f44336', 0.05)} 100%)`,
              border: `1px solid ${alpha('#f44336', 0.3)}`,
            }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Com Erro
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="#f44336">
                      {integrations.filter(i => i.status === 'error').length}
                    </Typography>
                  </Box>
                  <Error sx={{ fontSize: 40, color: '#f44336', opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Integration Widgets */}
        <Grid container spacing={3}>
          {integrations.map((integration) => (
            <Grid item xs={12} md={6} lg={4} key={integration.id}>
              <Card
                sx={{
                  height: '100%',
                  minHeight: 280,
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                    '& .integration-actions': {
                      opacity: 1,
                    }
                  },
                }}
              >
                {/* Status Indicator Line */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: integration.status === 'active'
                      ? `linear-gradient(90deg, #4caf50 0%, #81c784 100%)`
                      : integration.status === 'error'
                      ? `linear-gradient(90deg, #f44336 0%, #ef5350 100%)`
                      : integration.status === 'pending'
                      ? `linear-gradient(90deg, #ff9800 0%, #ffb74d 100%)`
                      : '#667085',
                  }}
                />

                <CardContent sx={{ pt: 3 }}>
                  {/* Widget Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight="600" gutterBottom>
                        {integration.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={integration.status === 'active' ? 'Ativo' :
                                 integration.status === 'error' ? 'Erro' :
                                 integration.status === 'pending' ? 'Conectando' : 'Inativo'}
                          size="small"
                          color={getStatusColor(integration.status) as any}
                          sx={{ height: 24 }}
                        />
                        <Chip
                          label={integration.type.toUpperCase()}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24 }}
                        />
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      className="integration-actions"
                      sx={{
                        opacity: 0,
                        transition: 'opacity 0.3s'
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Widget Stats Grid */}
                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Enviadas
                        </Typography>
                        <Typography variant="h5" fontWeight="600">
                          {integration.messagesSent?.toLocaleString() || '0'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Taxa de Entrega
                        </Typography>
                        <Typography variant="h5" fontWeight="600">
                          {integration.messagesSent && integration.messagesSent > 0
                            ? `${((integration.messagesDelivered! / integration.messagesSent) * 100).toFixed(1)}%`
                            : '0%'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Webhook URL */}
                  {integration.webhookUrl && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 1,
                        mb: 2,
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Webhook URL
                        </Typography>
                        <Tooltip title="Copiar URL">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyWebhook(integration.webhookUrl!)}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                          display: 'block',
                          mt: 0.5,
                        }}
                      >
                        {integration.webhookUrl}
                      </Typography>
                    </Box>
                  )}

                  {/* Performance Metrics */}
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 1,
                      mb: 2,
                    }}
                  >
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Speed sx={{ fontSize: 20, color: theme.palette.primary.main, mb: 0.5 }} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            Recebidas
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {integration.messagesReceived?.toLocaleString() || '0'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Message sx={{ fontSize: 20, color: theme.palette.success.main, mb: 0.5 }} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            Total
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {integration._count?.messages?.toLocaleString() || '0'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box textAlign="center">
                          <Refresh sx={{ fontSize: 20, color: theme.palette.warning.main, mb: 0.5 }} />
                          <Typography variant="caption" color="text.secondary" display="block">
                            Falhas
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {integration.messagesFailed?.toLocaleString() || '0'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Progress Bar for pending */}
                  {integration.status === 'pending' && (
                    <Box>
                      <LinearProgress sx={{ borderRadius: 1 }} />
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Estabelecendo conexão...
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Box display="flex" width="100%" gap={1}>
                    {integration.status === 'ACTIVE' ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<PowerSettingsNew />}
                        color="error"
                        onClick={() => handleToggleIntegration(integration.id)}
                      >
                        Desconectar
                      </Button>
                    ) : integration.status === 'PENDING' ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        startIcon={<QrCode2 />}
                        onClick={() => handleShowQRCode(integration.id)}
                      >
                        Ver QR Code
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        startIcon={<Cable />}
                        color="success"
                        onClick={() => handleToggleIntegration(integration.id)}
                      >
                        Conectar
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleEditIntegration(integration)}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                      }}
                    >
                      <Settings fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteIntegration(integration.id)}
                      sx={{
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                      }}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}

          {/* Add New Integration Card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card
              sx={{
                height: '100%',
                minHeight: 320,
                background: 'transparent',
                border: `2px dashed ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: theme.palette.primary.main,
                  background: alpha(theme.palette.primary.main, 0.05),
                },
              }}
              onClick={handleAddIntegration}
            >
              <Box textAlign="center">
                <Fab
                  size="large"
                  sx={{
                    background: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    mb: 2,
                  }}
                >
                  <Add />
                </Fab>
                <Typography variant="h6" color="text.secondary">
                  Adicionar Integração
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure um novo canal
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Add/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: theme.palette.background.paper,
            },
          }}
        >
          <DialogTitle>
            {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Nome da Integração"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 3 }}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Tipo de Canal</InputLabel>
                <Select
                  value={formData.type}
                  label="Tipo de Canal"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, config: {} })}
                >
                  <MenuItem value="WHATSAPP_EVOLUTION">
                    <Box display="flex" alignItems="center" gap={1}>
                      <WhatsApp /> WhatsApp Evolution API
                    </Box>
                  </MenuItem>
                  <MenuItem value="SMTP">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Email /> Email SMTP
                    </Box>
                  </MenuItem>
                  <MenuItem value="SMS_TWILIO">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Sms /> SMS Twilio
                    </Box>
                  </MenuItem>
                  <MenuItem value="TELEGRAM">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Telegram /> Telegram
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* Dynamic Config Fields */}
              {formData.type === 'WHATSAPP_EVOLUTION' && (
                <>
                  <TextField
                    fullWidth
                    label="URL da Evolution API"
                    placeholder="http://evolution-api:8080"
                    value={formData.config.apiUrl || ''}
                    onChange={(e) => setFormData({ ...formData, config: { ...formData.config, apiUrl: e.target.value } })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="API Key"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.config.apiKey || ''}
                    onChange={(e) => setFormData({ ...formData, config: { ...formData.config, apiKey: e.target.value } })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Nome da Instância"
                    placeholder="instance-01"
                    value={formData.config.instanceName || ''}
                    onChange={(e) => setFormData({ ...formData, config: { ...formData.config, instanceName: e.target.value } })}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              {formData.type === 'SMTP' && (
                <>
                  <TextField
                    fullWidth
                    label="Servidor SMTP"
                    placeholder="smtp.gmail.com"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Porta"
                    type="number"
                    placeholder="587"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    placeholder="contato@empresa.com"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Usar TLS/SSL"
                  />
                </>
              )}

              {formData.type === 'sms' && (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Provedor</InputLabel>
                    <Select label="Provedor">
                      <MenuItem value="twilio">Twilio</MenuItem>
                      <MenuItem value="zenvia">Zenvia</MenuItem>
                      <MenuItem value="clicksend">ClickSend</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Account SID / API Key"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Auth Token / API Secret"
                    type={showPassword ? 'text' : 'password'}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Número de Telefone"
                    placeholder="+5511999999999"
                  />
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSaveIntegration}>
              {editingIntegration ? 'Salvar' : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog
          open={qrcodeDialog}
          onClose={() => setQrcodeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Conectar WhatsApp
          </DialogTitle>
          <DialogContent>
            {loadingQrcode ? (
              <Box display="flex" justifyContent="center" p={4}>
                <LinearProgress sx={{ width: '100%' }} />
              </Box>
            ) : qrcodeData?.qrcode ? (
              <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={2}>
                <img
                  src={qrcodeData.qrcode.base64}
                  alt="QR Code"
                  style={{ width: '100%', maxWidth: 400, borderRadius: 8 }}
                />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Abra o WhatsApp no seu celular e escaneie este código
                </Typography>
                {qrcodeData.qrcode.pairingCode && (
                  <Box textAlign="center">
                    <Typography variant="caption" color="text.secondary">
                      Ou use o código de pareamento:
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>
                      {qrcodeData.qrcode.pairingCode}
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : qrcodeData?.status === 'CONNECTED' ? (
              <Alert severity="success">WhatsApp já está conectado!</Alert>
            ) : qrcodeData?.status === 'DISCONNECTED' ? (
              <Alert severity="warning">
                WhatsApp desconectado. Clique em "Atualizar" para gerar um novo QR Code.
              </Alert>
            ) : (
              <Alert severity="error">Erro ao buscar QR Code. Detalhes: {JSON.stringify(qrcodeData)}</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrcodeDialog(false)}>Fechar</Button>
            <Button
              onClick={() => handleShowQRCode(currentQrcodeIntegrationId)}
              startIcon={<Refresh />}
            >
              Atualizar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}