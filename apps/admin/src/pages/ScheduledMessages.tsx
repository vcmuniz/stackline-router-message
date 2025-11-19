import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  useTheme,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Autocomplete,
} from '@mui/material';
import {
  Schedule,
  Cancel,
  Refresh,
  WhatsApp,
  Email,
  Sms,
  Telegram,
  Send as SendIcon,
  Add,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { messagesApi, integrationsApi, contactsApi } from '../services/api';
import { format, addDays, startOfDay } from 'date-fns';

interface ScheduledMessage {
  id: string;
  content: string;
  scheduledAt: string;
  status: string;
  priority: number;
  integration: {
    name: string;
    type: string;
  };
  toContact?: {
    name?: string;
    phoneNumber?: string;
    email?: string;
  };
}

export default function ScheduledMessages() {
  const theme = useTheme();
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    integrationId: '',
    phone: '',
    message: '',
    scheduledAt: '',
  });

  useEffect(() => {
    loadScheduledMessages();
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data } = await integrationsApi.list();
      setIntegrations(data.filter((i: any) => i.status === 'ACTIVE'));
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    }
  };

  const loadContacts = async (integrationId: string) => {
    try {
      const { data } = await contactsApi.list(integrationId);
      setContacts(data.contacts || data);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  const loadScheduledMessages = async () => {
    try {
      setLoading(true);
      const { data } = await messagesApi.list({ status: 'PENDING', limit: 100 });
      const msgs = data.messages || data;
      // Filtrar apenas agendadas (que têm scheduledAt)
      const scheduled = msgs.filter((m: any) => m.scheduledAt);
      setMessages(scheduled);
    } catch (error) {
      console.error('Erro ao carregar mensagens agendadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar esta mensagem agendada?')) return;
    try {
      await messagesApi.updateStatus(id, 'FAILED', 'Cancelada pelo usuário');
      loadScheduledMessages();
    } catch (error) {
      console.error('Erro ao cancelar:', error);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm('Enviar esta mensagem agora?')) return;
    try {
      // Remover scheduledAt via update
      await messagesApi.updateStatus(id, 'PENDING');
      loadScheduledMessages();
    } catch (error) {
      console.error('Erro ao enviar:', error);
    }
  };

  const handleSchedule = async () => {
    try {
      await messagesApi.send({
        integrationId: formData.integrationId,
        toContact: { phoneNumber: formData.phone },
        content: formData.message,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        forceImmediate: false
      });
      setOpenDialog(false);
      setFormData({ integrationId: '', phone: '', message: '', scheduledAt: '' });
      loadScheduledMessages();
    } catch (error) {
      console.error('Erro ao agendar:', error);
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP_EVOLUTION':
      case 'WHATSAPP_BAILEYS':
        return <WhatsApp fontSize="small" />;
      case 'SMTP':
        return <Email fontSize="small" />;
      case 'SMS_TWILIO':
      case 'SMS_ZENVIA':
        return <Sms fontSize="small" />;
      case 'TELEGRAM':
        return <Telegram fontSize="small" />;
      default:
        return null;
    }
  };

  // Agrupar por dia
  const groupedByDay = messages.reduce((acc: any, msg) => {
    const day = format(new Date(msg.scheduledAt), 'yyyy-MM-dd');
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  const days = Object.keys(groupedByDay).sort();

  return (
    <Layout>
      <Box>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
              Mensagens Agendadas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {messages.length} mensagens programadas para envio
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadScheduledMessages}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
            >
              Agendar Mensagem
            </Button>
          </Box>
        </Box>

        {/* Calendário de dias */}
        <Box display="flex" gap={1} mb={3} overflow="auto" pb={1}>
          {[...Array(7)].map((_, i) => {
            const day = addDays(startOfDay(new Date()), i);
            const dayKey = format(day, 'yyyy-MM-dd');
            const count = groupedByDay[dayKey]?.length || 0;

            return (
              <Paper
                key={dayKey}
                sx={{
                  p: 2,
                  minWidth: 100,
                  textAlign: 'center',
                  cursor: count > 0 ? 'pointer' : 'default',
                  border: `2px solid ${
                    count > 0 ? theme.palette.primary.main : theme.palette.divider
                  }`,
                  backgroundColor:
                    count > 0
                      ? alpha(theme.palette.primary.main, 0.1)
                      : theme.palette.background.paper,
                  '&:hover': count > 0 ? {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  } : {},
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  {format(day, 'EEE')}
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {format(day, 'dd')}
                </Typography>
                {count > 0 && (
                  <Chip
                    label={count}
                    size="small"
                    color="primary"
                    sx={{ mt: 0.5, fontSize: '0.7rem' }}
                  />
                )}
              </Paper>
            );
          })}
        </Box>

        {/* Lista por dia */}
        {days.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Nenhuma mensagem agendada
            </Typography>
          </Paper>
        ) : (
          days.map((day) => (
            <Box key={day} mb={3}>
              <Typography variant="h6" fontWeight="bold" color="white" mb={2}>
                {format(new Date(day), "EEEE, dd 'de' MMMM")}
              </Typography>

              <TableContainer
                component={Paper}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                      <TableCell>Horário</TableCell>
                      <TableCell>Destinatário</TableCell>
                      <TableCell>Mensagem</TableCell>
                      <TableCell>Canal</TableCell>
                      <TableCell>Prioridade</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedByDay[day]
                      .sort(
                        (a: any, b: any) =>
                          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                      )
                      .map((message: any) => (
                        <TableRow
                          key={message.id}
                          hover
                          sx={{
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.03),
                            },
                          }}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Schedule fontSize="small" color="warning" />
                              <Typography variant="body2" fontWeight={600}>
                                {format(new Date(message.scheduledAt), 'HH:mm')}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {message.toContact?.name || 'Sem nome'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {message.toContact?.phoneNumber || message.toContact?.email}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {message.content}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getIntegrationIcon(message.integration.type)}
                              <Typography variant="body2">{message.integration.name}</Typography>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={`P${message.priority}`}
                              size="small"
                              color={message.priority >= 7 ? 'error' : message.priority >= 5 ? 'warning' : 'default'}
                            />
                          </TableCell>

                          <TableCell align="center">
                            <Box display="flex" gap={1} justifyContent="center">
                              <Tooltip title="Enviar Agora">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSendNow(message.id)}
                                >
                                  <SendIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancelar">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancel(message.id)}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))
        )}

        {/* Dialog Agendar Mensagem */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.paper,
              zIndex: 1400,
            }
          }}
          BackdropProps={{
            sx: {
              marginTop: 0,
            }
          }}
        >
          <DialogTitle>Agendar Nova Mensagem</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <FormControl fullWidth>
                <InputLabel>Integração</InputLabel>
                <Select
                  value={formData.integrationId}
                  onChange={(e) => {
                    const intId = e.target.value;
                    setFormData({ ...formData, integrationId: intId, phone: '' });
                    setSelectedContact(null);
                    loadContacts(intId);
                  }}
                  label="Integração"
                >
                  {integrations.map((int) => (
                    <MenuItem key={int.id} value={int.id}>
                      {int.name} ({int.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.integrationId && (
                <Autocomplete
                  options={contacts}
                  getOptionLabel={(option) => option.name || option.phoneNumber || option.email || ''}
                  value={selectedContact}
                  onChange={(e, value) => {
                    setSelectedContact(value);
                    setFormData({
                      ...formData,
                      phone: value?.phoneNumber || value?.email || value?.telegramId || ''
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecione um contato (ou digite manualmente abaixo)"
                      placeholder="Buscar contato..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {option.name || 'Sem nome'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.phoneNumber || option.email}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  fullWidth
                />
              )}

              <TextField
                label="Telefone/Grupo (ou selecione contato acima)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="5511999999999 ou 120363...@g.us"
                fullWidth
                helperText="Digite manualmente ou selecione um contato acima"
              />

              <TextField
                label="Mensagem"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                multiline
                rows={4}
                fullWidth
              />

              <TextField
                label="Data e Hora"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSchedule}
              variant="contained"
              disabled={!formData.integrationId || !formData.phone || !formData.message || !formData.scheduledAt}
            >
              Agendar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
