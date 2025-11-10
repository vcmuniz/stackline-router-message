import React, { useState, useEffect, useRef } from 'react';
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
  Tooltip,
  Chip,
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
import { io } from 'socket.io-client';

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
  lastMessage?: {
    content?: string;
    createdAt: string;
    direction: string;
  };
  unreadCount?: number;
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RECEIVED';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  scheduledAt?: string;
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
  const selectedContactRef = useRef(selectedContact);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Manter ref atualizada
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Auto-scroll para o fim quando mensagens mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadIntegrations();
    loadContacts();

    // Socket.io para updates em tempo real
    const socket = io('http://localhost:4500');

    socket.on('connect', () => {
      console.log('✅ Socket conectado');
    });

    socket.on('message:new', (newMsg) => {
      console.log('📨 Nova mensagem via socket:', newMsg);

      // Atualizar lista de contatos sempre
      loadContacts();

      // Se estiver vendo conversa desse contato, recarregar mensagens
      const currentContact = selectedContactRef.current;
      if (currentContact) {
        const isForThisContact =
          newMsg.fromContactId === currentContact.id ||
          newMsg.toContactId === currentContact.id;

        console.log('Verificando contato:', {
          currentContactId: currentContact.id,
          fromContactId: newMsg.fromContactId,
          toContactId: newMsg.toContactId,
          isForThisContact
        });

        if (isForThisContact) {
          // Recarregar todas as mensagens para garantir ordem correta
          loadMessages(currentContact.id);

          // Se for mensagem recebida, marcar como lida automaticamente
          if (newMsg.direction === 'INBOUND' && newMsg.status === 'RECEIVED') {
            messagesApi.updateStatus(newMsg.id, 'READ').catch(err =>
              console.error('Erro ao marcar como lida:', err)
            );
          }
        }
      }
    });

    return () => socket.disconnect();
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
      setMessagesPage(1);
      setMessages([]);
      setHasMoreMessages(true);
      loadMessages(selectedContact.id, 1);

      // Marcar mensagens como lidas
      markMessagesAsRead(selectedContact.id);
    }
  }, [selectedContact]);

  // Detectar scroll no topo para carregar mais
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop === 0 && hasMoreMessages && !loadingMessages && selectedContact) {
        const nextPage = messagesPage + 1;
        setMessagesPage(nextPage);
        loadMoreMessages(selectedContact.id, nextPage);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messagesPage, hasMoreMessages, loadingMessages, selectedContact]);

  const markMessagesAsRead = async (contactId: string) => {
    try {
      // Buscar mensagens não lidas deste contato
      const unreadMessages = await messagesApi.list({
        contactId,
        direction: 'INBOUND',
        status: 'RECEIVED'
      });

      // Marcar todas como lidas
      const msgs = unreadMessages.data.messages || unreadMessages.data;
      for (const msg of msgs) {
        await messagesApi.updateStatus(msg.id, 'READ');
      }

      // Atualizar contador
      loadContacts();
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error);
    }
  };

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

  const loadMessages = async (contactId: string, page: number = 1) => {
    try {
      setLoadingMessages(true);
      const { data } = await messagesApi.list({ contactId, page, limit: 20 });
      const msgs = data.messages || data;

      // Backend já retorna ordenado (antigas → novas)
      setMessages(msgs);

      // Verificar se tem mais páginas
      setHasMoreMessages(data.pagination && data.pagination.page < data.pagination.pages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadMoreMessages = async (contactId: string, page: number) => {
    try {
      setLoadingMessages(true);

      // Salvar altura atual do scroll antes de adicionar mensagens
      const container = messagesContainerRef.current;
      const oldScrollHeight = container?.scrollHeight || 0;
      const oldScrollTop = container?.scrollTop || 0;

      const { data } = await messagesApi.list({ contactId, page, limit: 20 });
      const msgs = data.messages || data;

      if (msgs.length > 0) {
        // Adicionar mensagens antigas NO INÍCIO (prepend)
        setMessages(prev => [...msgs, ...prev]);
        setHasMoreMessages(data.pagination && data.pagination.page < data.pagination.pages);

        // Aguardar render e restaurar posição do scroll
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const heightDiff = newScrollHeight - oldScrollHeight;
            container.scrollTop = oldScrollTop + heightDiff;
          }
        }, 0);
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage chamado!', { newMessage, selectedContact, newConversationMode });

    if (!newMessage.trim()) {
      console.log('Mensagem vazia, abortando');
      return;
    }

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
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" fontWeight={600}>
                              {contact.name || 'Sem nome'}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              {contact.lastMessage && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {format(new Date(contact.lastMessage.createdAt), 'HH:mm')}
                                </Typography>
                              )}
                              {(contact.unreadCount ?? 0) > 0 && (
                                <Badge
                                  badgeContent={contact.unreadCount}
                                  color="primary"
                                  max={99}
                                  sx={{
                                    '& .MuiBadge-badge': {
                                      position: 'static',
                                      transform: 'none',
                                      fontSize: '0.65rem',
                                      height: 18,
                                      minWidth: 18,
                                      padding: '0 5px'
                                    }
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box>
                            {contact.lastMessage && (
                              <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 200 }}>
                                {contact.lastMessage.direction === 'OUTBOUND' ? '✓ ' : ''}
                                {contact.lastMessage.content || '(mídia)'}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontSize: '0.7rem' }}>
                              {contact.phoneNumber || contact.email}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', opacity: 0.7 }}>
                              {contact.integration.name}
                            </Typography>
                          </Box>
                        }
                      />
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
                {newConversationMode ? (
                  <Box width="100%">
                    <Typography variant="body1" fontWeight={600} mb={2}>
                      Nova Mensagem
                    </Typography>
                    <Box display="flex" gap={2}>
                      <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel>Selecione a Integração</InputLabel>
                        <Select
                          value={newConversationIntegration}
                          label="Selecione a Integração"
                          onChange={(e) => setNewConversationIntegration(e.target.value)}
                        >
                          {integrations.filter(i => i.status === 'ACTIVE').map((integration) => (
                            <MenuItem key={integration.id} value={integration.id}>
                              {integration.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        placeholder="Número de telefone"
                        value={newConversationPhone}
                        onChange={(e) => setNewConversationPhone(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Box>
                ) : (
                  <>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {selectedContact?.name?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedContact?.name || 'Sem nome'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedContact?.phoneNumber || selectedContact?.email} • {selectedContact?.integration.name}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton>
                      <MoreVert />
                    </IconButton>
                  </>
                )}
              </Box>

              {/* Mensagens */}
              <Box
                ref={messagesContainerRef}
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
                          {message.scheduledAt && message.status === 'PENDING' && (
                            <Chip
                              icon={<Schedule fontSize="small" />}
                              label={`Agendada para ${format(new Date(message.scheduledAt), 'dd/MM HH:mm')}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ mb: 1, fontSize: '0.7rem' }}
                            />
                          )}
                          <Typography variant="body2">{message.content}</Typography>

                          {/* Mostrar timestamps diferentes de criação */}
                          {message.direction === 'OUTBOUND' && message.sentAt && message.sentAt !== message.createdAt && (
                            <Typography variant="caption" display="block" sx={{ opacity: 0.6, fontSize: '0.65rem', mt: 0.5 }}>
                              Enviada: {format(new Date(message.sentAt), 'dd/MM HH:mm:ss')}
                            </Typography>
                          )}
                          {message.deliveredAt && (
                            <Typography variant="caption" display="block" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                              Entregue: {format(new Date(message.deliveredAt), 'dd/MM HH:mm:ss')}
                            </Typography>
                          )}

                          <Tooltip
                            title={
                              <Box>
                                <Typography variant="caption" display="block">
                                  Criada: {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                                </Typography>
                                {message.sentAt && (
                                  <Typography variant="caption" display="block">
                                    Enviada: {format(new Date(message.sentAt), 'dd/MM/yyyy HH:mm:ss')}
                                  </Typography>
                                )}
                                {message.deliveredAt && (
                                  <Typography variant="caption" display="block">
                                    Entregue: {format(new Date(message.deliveredAt), 'dd/MM/yyyy HH:mm:ss')}
                                  </Typography>
                                )}
                                {message.readAt && (
                                  <Typography variant="caption" display="block">
                                    Lida: {format(new Date(message.readAt), 'dd/MM/yyyy HH:mm:ss')}
                                  </Typography>
                                )}
                              </Box>
                            }
                            arrow
                          >
                            <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5} mt={0.5}>
                              <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                {message.status === 'PENDING' && message.scheduledAt
                                  ? format(new Date(message.scheduledAt), 'HH:mm')
                                  : format(new Date(message.createdAt), 'HH:mm')}
                              </Typography>
                              {getStatusIcon(message)}
                            </Box>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                    {/* Elemento invisível para scroll automático */}
                    <div ref={messagesEndRef} />
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
