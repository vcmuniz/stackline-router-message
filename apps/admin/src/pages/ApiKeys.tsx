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
  InputAdornment,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { apiKeysApi } from '../services/api';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  rateLimit: number;
  enabled: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { value: 'messages:read', label: 'Ler Mensagens' },
  { value: 'messages:write', label: 'Enviar Mensagens' },
  { value: 'contacts:read', label: 'Ler Contatos' },
  { value: 'contacts:write', label: 'Gerenciar Contatos' },
  { value: 'integrations:read', label: 'Ler Integrações' },
  { value: 'integrations:write', label: 'Gerenciar Integrações' },
];

export default function ApiKeys() {
  const theme = useTheme();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState({
    name: '',
    permissions: [] as string[],
    rateLimit: 60,
    expiresAt: '',
  });

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await apiKeysApi.list();
      setApiKeys(response.data);
    } catch (error) {
      console.error('Erro ao carregar API Keys:', error);
      showSnackbar('Erro ao carregar API Keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (key?: ApiKey) => {
    if (key) {
      setEditingKey(key);
      setFormData({
        name: key.name,
        permissions: key.permissions,
        rateLimit: key.rateLimit,
        expiresAt: key.expiresAt ? key.expiresAt.split('T')[0] : '',
      });
    } else {
      setEditingKey(null);
      setFormData({
        name: '',
        permissions: [],
        rateLimit: 60,
        expiresAt: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingKey(null);
  };

  const handleSave = async () => {
    try {
      if (editingKey) {
        await apiKeysApi.update(editingKey.id, formData);
        showSnackbar('API Key atualizada com sucesso', 'success');
      } else {
        await apiKeysApi.create(formData);
        showSnackbar('API Key criada com sucesso', 'success');
      }
      handleCloseDialog();
      loadApiKeys();
    } catch (error) {
      console.error('Erro ao salvar API Key:', error);
      showSnackbar('Erro ao salvar API Key', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta API Key?')) return;

    try {
      await apiKeysApi.delete(id);
      showSnackbar('API Key deletada com sucesso', 'success');
      loadApiKeys();
    } catch (error) {
      console.error('Erro ao deletar API Key:', error);
      showSnackbar('Erro ao deletar API Key', 'error');
    }
  };

  const handleTogglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    showSnackbar('Chave copiada para área de transferência', 'success');
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 10)}${'*'.repeat(20)}${key.substring(key.length - 10)}`;
  };

  return (
    <Layout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              API Keys
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerencie suas chaves de API para integração externa
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
            Nova API Key
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.background.default }}>
                <TableCell>Nome</TableCell>
                <TableCell>Chave</TableCell>
                <TableCell>Permissões</TableCell>
                <TableCell>Rate Limit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Último Uso</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">Carregando...</TableCell>
                </TableRow>
              ) : apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box py={4}>
                      <KeyIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                      <Typography color="text.secondary">
                        Nenhuma API Key criada ainda
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id} hover>
                    <TableCell>
                      <Typography fontWeight="500">{apiKey.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                          }}
                        >
                          {showKey === apiKey.id ? apiKey.key : maskKey(apiKey.key)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                        >
                          {showKey === apiKey.id ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyKey(apiKey.key)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {apiKey.permissions.slice(0, 2).map((perm) => (
                          <Chip
                            key={perm}
                            label={perm.split(':')[1]}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {apiKey.permissions.length > 2 && (
                          <Chip
                            label={`+${apiKey.permissions.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{apiKey.rateLimit}/min</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={apiKey.enabled ? 'Ativa' : 'Inativa'}
                        color={apiKey.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {apiKey.lastUsedAt
                          ? new Date(apiKey.lastUsedAt).toLocaleString('pt-BR')
                          : 'Nunca usado'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(apiKey)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(apiKey.id)}
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

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingKey ? 'Editar API Key' : 'Nova API Key'}
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
                label="Rate Limit (req/min)"
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })}
                fullWidth
                required
              />

              <TextField
                label="Data de Expiração"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Permissões
                </Typography>
                <FormGroup>
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <FormControlLabel
                      key={perm.value}
                      control={
                        <Checkbox
                          checked={formData.permissions.includes(perm.value)}
                          onChange={() => handleTogglePermission(perm.value)}
                        />
                      }
                      label={perm.label}
                    />
                  ))}
                </FormGroup>
              </Box>

              {!editingKey && (
                <Alert severity="info">
                  A chave será gerada automaticamente após a criação. Copie e guarde em local seguro.
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.name || formData.permissions.length === 0}
            >
              {editingKey ? 'Salvar' : 'Criar'}
            </Button>
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
