import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Avatar,
  Tooltip,
  LinearProgress,
  TablePagination,
  Menu,
  MenuItem,
  ListItemIcon,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Edit,
  Delete,
  Message,
  WhatsApp,
  Email,
  Sms,
  Telegram,
  FilterList,
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { contactsApi } from '../services/api';

interface Contact {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  telegramId?: string;
  avatar?: string;
  tags?: string;
  createdAt: string;
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

export default function Contacts() {
  const theme = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [integrationFilter, setIntegrationFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadContacts();
  }, [search, integrationFilter, page, rowsPerPage]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data } = await contactsApi.list(integrationFilter || undefined);
      setContacts(data.contacts || data);
      setTotal(data.pagination?.total || data.length);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este contato?')) return;
    try {
      await contactsApi.delete(id);
      loadContacts();
    } catch (error) {
      console.error('Erro ao deletar contato:', error);
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

  return (
    <Layout>
      <Box>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
              Contatos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie todos os contatos das suas integrações
            </Typography>
          </Box>
        </Box>

        {/* Filtros */}
        <Box display="flex" gap={2} mb={3}>
          <TextField
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por Integração</InputLabel>
            <Select
              value={integrationFilter}
              label="Filtrar por Integração"
              onChange={(e) => setIntegrationFilter(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterList />
                </InputAdornment>
              }
            >
              <MenuItem value="">Todas</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Tabela */}
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
                <TableCell>Contato</TableCell>
                <TableCell>Integração</TableCell>
                <TableCell align="center">Mensagens</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      Nenhum contato encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow
                    key={contact.id}
                    hover
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                      },
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          {contact.name?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {contact.name || 'Sem nome'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {contact.phoneNumber || contact.email || contact.telegramId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getIntegrationIcon(contact.integration.type)}
                        <Typography variant="body2">{contact.integration.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {(contact._count.sentMessages + contact._count.receivedMessages).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ↑{contact._count.receivedMessages} ↓{contact._count.sentMessages}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {contact.tags ? (
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {contact.tags.split(',').slice(0, 2).map((tag, i) => (
                            <Chip key={i} label={tag.trim()} size="small" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" gap={1} justifyContent="center">
                        <Tooltip title="Enviar Mensagem">
                          <IconButton size="small" color="primary">
                            <Message fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton size="small">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deletar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(contact.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </TableContainer>
      </Box>
    </Layout>
  );
}
