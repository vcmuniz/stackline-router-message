import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  LinearProgress,
  Badge,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Send,
  AttachFile,
  MoreVert,
  CheckCircle,
  DoneAll,
  Schedule,
  Error as ErrorIcon,
  WhatsApp,
  Email,
  Sms,
  Telegram,
  Cable,
  Add,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { contactsApi, messagesApi, integrationsApi } from '../services/api';
import { format } from 'date-fns';

interface Contact {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  avatar?: string;
  integration: {
    id: string;
    name: string;
    type: string;
  };
  _count: {
    sentMessages: number;
    receivedMessages: number;
  };
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  fromContact?: { name?: string };
  toContact?: { name?: string };
}

export default function Messages() {
  const theme = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newConversationMode, setNewConversationMode] = useState(false);
  const [newConversationIntegration, setNewConversationIntegration] = useState('');
  const [newConversationPhone, setNewConversationPhone] = useState('');

  useEffect(() => {
    loadIntegrations();
    loadContacts();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [selectedIntegration]);

  const loadIntegrations = async () => {
    try {
      const { data } = await integrationsApi.list();
      setIntegrations(data);
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await contactsApi.list(selectedIntegration || undefined);
      setContacts(data.contacts || data);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      setLoadingMessages(true);
      const { data } = await messagesApi.list({ contactId });
      setMessages(data.messages || data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (newConversationMode) {
        // Nova conversa
        if (!newConversationIntegration || !newConversationPhone) {
          alert('Selecione uma integração e digite um número');
          return;
        }

        await messagesApi.send({
          integrationId: newConversationIntegration,
          toContact: {
            phoneNumber: newConversationPhone,
            name: newConversationPhone
          },
          content: newMessage
        });

        setNewMessage('');
        setNewConversationMode(false);
        setNewConversationIntegration('');
        setNewConversationPhone('');
        loadContacts();
      } else {
        // Conversa existente
        if (!selectedContact) return;

        await messagesApi.send({
          integrationId: selectedContact.integration.id,
          toContact: {
            phoneNumber: selectedContact.phoneNumber,
            email: selectedContact.email,
            name: selectedContact.name
          },
          content: newMessage
        });

        setNewMessage('');
        loadMessages(selectedContact.id);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const getStatusIcon = (message: Message) => {
    if (message.direction === 'INBOUND') return null;

    switch (message.status) {
      case 'READ':
        return <DoneAll fontSize="small" sx={{ color: theme.palette.info.main }} />;
      case 'DELIVERED':
        return <DoneAll fontSize="small" sx={{ color: theme.palette.text.secondary }} />;
      case 'SENT':
        return <CheckCircle fontSize="small" sx={{ color: theme.palette.text.secondary }} />;
      case 'PENDING':
        return <Schedule fontSize="small" sx={{ color: theme.palette.warning.main }} />;
      case 'FAILED':
        return <ErrorIcon fontSize="small" sx={{ color: theme.palette.error.main }} />;
      default:
        return null;
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <Box display="flex" height="calc(100vh - 120px)" gap={0}>
        {/* Lista de Conversas */}
        <Paper
          sx={{
            width: 380,
            height: '100%',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header da lista */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold" color="white">
                Conversas
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setNewConversationMode(true);
                  setSelectedContact(null);
                }}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': { bgcolor: theme.palette.primary.dark },
                }}
              >
                <Add />
              </IconButton>
            </Box>

            {/* Filtro de Integração */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Integração</InputLabel>
              <Select
                value={selectedIntegration}
                label="Integração"
                onChange={(e) => {
                  setSelectedIntegration(e.target.value);
                  setSelectedContact(null);
                }}
              >
                <MenuItem value="">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Cable fontSize="small" />
                    <span>Todas as integrações</span>
                  </Box>
                </MenuItem>
                {integrations.map((integration) => (
                  <MenuItem key={integration.id} value={integration.id}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {integration.type === 'WHATSAPP_EVOLUTION' || integration.type === 'WHATSAPP_BAILEYS' ? (
                        <WhatsApp fontSize="small" />
                      ) : integration.type === 'SMTP' ? (
                        <Email fontSize="small" />
                      ) : integration.type.startsWith('SMS') ? (
                        <Sms fontSize="small" />
                      ) : integration.type === 'TELEGRAM' ? (
                        <Telegram fontSize="small" />
                      ) : (
                        <Cable fontSize="small" />
                      )}
                      <span>{integration.name}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Busca */}
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar contatos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Lista de contatos */}
          {loading ? (
            <LinearProgress />
          ) : (
            <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
              {filteredContacts.length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography variant="body2" color="text.secondary">
                    Nenhum contato encontrado
                  </Typography>
                </Box>
              ) : (
                filteredContacts.map((contact) => (
                  <ListItem key={contact.id} disablePadding>
                    <ListItemButton
                      selected={selectedContact?.id === contact.id}
                      onClick={() => setSelectedContact(contact)}
                      sx={{
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          borderLeft: `3px solid ${theme.palette.primary.main}`,
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            contact.integration.type === 'WHATSAPP_EVOLUTION' || contact.integration.type === 'WHATSAPP_BAILEYS' ? (
                              <WhatsApp sx={{ fontSize: 14, bgcolor: '#25D366', borderRadius: '50%', p: 0.3, color: 'white' }} />
                            ) : contact.integration.type === 'SMTP' ? (
                              <Email sx={{ fontSize: 14, bgcolor: theme.palette.error.main, borderRadius: '50%', p: 0.3, color: 'white' }} />
                            ) : contact.integration.type.startsWith('SMS') ? (
                              <Sms sx={{ fontSize: 14, bgcolor: theme.palette.warning.main, borderRadius: '50%', p: 0.3, color: 'white' }} />
                            ) : (
                              <Telegram sx={{ fontSize: 14, bgcolor: theme.palette.info.main, borderRadius: '50%', p: 0.3, color: 'white' }} />
                            )
                          }
                        >
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                            {contact.name?.[0]?.toUpperCase() || '?'}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight={600}>
                              {contact.name || 'Sem nome'}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" noWrap>
                              {contact.phoneNumber || contact.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              {contact.integration.name}
                            </Typography>
                          </Box>
                        }
                      />
                      <Box textAlign="right">
                        <Badge badgeContent={contact._count.receivedMessages} color="primary" max={99}>
                          <Typography variant="caption" color="text.secondary">
                            {contact._count.sentMessages + contact._count.receivedMessages}
                          </Typography>
                        </Badge>
                      </Box>
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Paper>

        {/* Área de Chat */}
        <Paper
          sx={{
            flex: 1,
            height: '100%',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {selectedContact || newConversationMode ? (
            <>
              {/* Header do chat */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    {selectedContact.name?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedContact.name || 'Sem nome'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedContact.phoneNumber || selectedContact.email} • {selectedContact.integration.name}
                    </Typography>
                  </Box>
                </Box>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </Box>

              {/* Mensagens */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  backgroundColor: alpha(theme.palette.background.default, 0.3),
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
                  backgroundSize: '100% 20px',
                }}
              >
                {loadingMessages ? (
                  <LinearProgress />
                ) : messages.length === 0 ? (
                  <Box textAlign="center" py={8}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma mensagem ainda
                    </Typography>
                  </Box>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          justifyContent: message.direction === 'OUTBOUND' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor:
                              message.direction === 'OUTBOUND'
                                ? theme.palette.primary.main
                                : theme.palette.background.paper,
                            color: message.direction === 'OUTBOUND' ? 'white' : 'inherit',
                            border: message.direction === 'INBOUND' ? `1px solid ${theme.palette.divider}` : 'none',
                          }}
                        >
                          {message.mediaType && (
                            <Box
                              component="img"
                              src={message.mediaUrl}
                              alt="Media"
                              sx={{
                                maxWidth: '100%',
                                borderRadius: 1,
                                mb: message.content ? 1 : 0,
                              }}
                            />
                          )}
                          <Typography variant="body2">{message.content}</Typography>
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5} mt={0.5}>
                            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                              {format(new Date(message.createdAt), 'HH:mm')}
                            </Typography>
                            {getStatusIcon(message)}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              {/* Input de mensagem */}
              <Box
                sx={{
                  p: 2,
                  borderTop: `1px solid ${theme.palette.divider}`,
                  backgroundColor: theme.palette.background.paper,
                }}
              >
                <Box display="flex" gap={1} alignItems="center">
                  <IconButton>
                    <AttachFile />
                  </IconButton>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    multiline
                    maxRows={4}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                      },
                      '&:disabled': {
                        bgcolor: alpha(theme.palette.primary.main, 0.3),
                      },
                    }}
                  >
                    <Send />
                  </IconButton>
                </Box>
              </Box>
            </>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              flexDirection="column"
              gap={2}
            >
              <Typography variant="h6" color="text.secondary">
                Selecione uma conversa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Escolha um contato na lista ao lado para visualizar as mensagens
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
}
