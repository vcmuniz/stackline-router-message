import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Divider,
  Chip,
  useTheme,
  alpha,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Download,
  ContentCopy,
  Code,
  Webhook as WebhookIcon,
  Send,
  Schedule,
  Image as ImageIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function ApiDocs() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const baseUrl = window.location.origin.replace(':5173', ':4000');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadPostman = () => {
    const collection = {
      info: {
        name: 'Stackline Router Messages API',
        description: 'API completa para envio de mensagens multicanal',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: {
        type: 'apikey',
        apikey: [
          { key: 'key', value: 'X-API-Key', type: 'string' },
          { key: 'value', value: '{{apiKey}}', type: 'string' },
          { key: 'in', value: 'header', type: 'string' },
        ],
      },
      variable: [
        { key: 'baseUrl', value: 'https://hub.stackline.com.br', type: 'string' },
        { key: 'apiKey', value: 'sk_sua_chave_aqui', type: 'string' },
        { key: 'integrationId', value: '', type: 'string' },
      ],
      item: [
        {
          name: 'Mensagens',
          item: [
            {
              name: 'Enviar Mensagem (Imediato)',
              request: {
                method: 'POST',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    integrationId: '{{integrationId}}',
                    phone: '+5521999999999',
                    message: 'Olá! Mensagem enviada via API',
                    forceImmediate: true,
                  }, null, 2),
                },
                url: {
                  raw: '{{baseUrl}}/v1/messages/send',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'messages', 'send'],
                },
              },
            },
            {
              name: 'Enviar Mensagem (Fila)',
              request: {
                method: 'POST',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    integrationId: '{{integrationId}}',
                    phone: '+5521999999999',
                    message: 'Mensagem processada pelo cron',
                  }, null, 2),
                },
                url: {
                  raw: '{{baseUrl}}/v1/messages/send',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'messages', 'send'],
                },
              },
            },
            {
              name: 'Enviar Mensagem Agendada',
              request: {
                method: 'POST',
                header: [{ key: 'Content-Type', value: 'application/json' }],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    integrationId: '{{integrationId}}',
                    phone: '+5521999999999',
                    message: 'Mensagem agendada',
                    scheduledAt: '2025-11-10T09:00:00-03:00',
                  }, null, 2),
                },
                url: {
                  raw: '{{baseUrl}}/v1/messages/send',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'messages', 'send'],
                },
              },
            },
            {
              name: 'Listar Mensagens',
              request: {
                method: 'GET',
                url: {
                  raw: '{{baseUrl}}/v1/messages?limit=50&offset=0',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'messages'],
                  query: [
                    { key: 'limit', value: '50' },
                    { key: 'offset', value: '0' },
                  ],
                },
              },
            },
            {
              name: 'Obter Estatísticas',
              request: {
                method: 'GET',
                url: {
                  raw: '{{baseUrl}}/v1/messages/stats',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'messages', 'stats'],
                },
              },
            },
          ],
        },
        {
          name: 'Contatos',
          item: [
            {
              name: 'Listar Contatos',
              request: {
                method: 'GET',
                url: {
                  raw: '{{baseUrl}}/v1/contacts?limit=50',
                  host: ['{{baseUrl}}'],
                  path: ['v1', 'contacts'],
                  query: [{ key: 'limit', value: '50' }],
                },
              },
            },
          ],
        },
      ],
    };

    const blob = new Blob([JSON.stringify(collection, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Stackline-API.postman_collection.json';
    a.click();
  };

  const CodeBlock = ({ code, language = 'bash' }: { code: string; language?: string }) => (
    <Paper
      sx={{
        p: 2,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        position: 'relative',
      }}
    >
      <IconButton
        size="small"
        sx={{ position: 'absolute', top: 8, right: 8 }}
        onClick={() => copyToClipboard(code)}
      >
        <ContentCopy fontSize="small" />
      </IconButton>
      <pre
        style={{
          margin: 0,
          fontSize: '0.85rem',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
      >
        {code}
      </pre>
    </Paper>
  );

  return (
    <Layout>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
              Documentação da API
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Integre o sistema com suas aplicações externas
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={downloadPostman}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Download Postman Collection
          </Button>
        </Box>

        <Paper sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            <Tab label="Envio de Mensagens" />
            <Tab label="Webhooks" />
            <Tab label="Autenticação" />
          </Tabs>

          {/* Tab: Envio de Mensagens */}
          <TabPanel value={tab} index={0}>
            <Box p={3}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Endpoint: POST /v1/messages/send
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Envie mensagens via WhatsApp, Email, SMS ou Telegram
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Base URL:</strong> https://hub.stackline.com.br
              </Alert>

              {/* Envio Imediato */}
              <Box mb={4}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Send color="primary" />
                  <Typography variant="h6">Envio Imediato (forceImmediate)</Typography>
                  <Chip label="Recomendado" size="small" color="success" />
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Envia a mensagem instantaneamente sem passar pela fila
                </Typography>
                <CodeBlock
                  code={`curl -X POST https://hub.stackline.com.br/v1/messages/send \\
  -H "X-API-Key: sk_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "integrationId": "SEU_ID_INTEGRACAO",
    "phone": "+5521999999999",
    "message": "Olá! Mensagem enviada imediatamente 🚀",
    "forceImmediate": true
  }'`}
                />
              </Box>

              {/* Mensagem Agendada */}
              <Box mb={4}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Schedule color="warning" />
                  <Typography variant="h6">Mensagem Agendada</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Agende o envio para uma data/hora específica
                </Typography>
                <CodeBlock
                  code={`curl -X POST https://hub.stackline.com.br/v1/messages/send \\
  -H "X-API-Key: sk_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "integrationId": "SEU_ID_INTEGRACAO",
    "phone": "+5521999999999",
    "message": "Mensagem agendada para amanhã às 9h",
    "scheduledAt": "2025-11-10T09:00:00-03:00"
  }'`}
                />
              </Box>

              {/* Com Mídia */}
              <Box mb={4}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <ImageIcon color="secondary" />
                  <Typography variant="h6">Mensagem com Mídia</Typography>
                </Box>
                <CodeBlock
                  code={`curl -X POST https://hub.stackline.com.br/v1/messages/send \\
  -H "X-API-Key: sk_sua_chave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "integrationId": "SEU_ID_INTEGRACAO",
    "phone": "+5521999999999",
    "message": "Veja esta imagem!",
    "mediaUrl": "https://exemplo.com/imagem.jpg",
    "mediaType": "image",
    "forceImmediate": true
  }'`}
                />
              </Box>

              {/* Parâmetros */}
              <Typography variant="h6" fontWeight="bold" gutterBottom mt={4}>
                Parâmetros
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Campo</strong></TableCell>
                      <TableCell><strong>Tipo</strong></TableCell>
                      <TableCell><strong>Obrigatório</strong></TableCell>
                      <TableCell><strong>Descrição</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>integrationId</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Sim" size="small" color="error" /></TableCell>
                      <TableCell>ID da integração (WhatsApp, Email, etc)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>phone</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Sim*" size="small" color="warning" /></TableCell>
                      <TableCell>Telefone no formato internacional (+5521...)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>message</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Sim" size="small" color="error" /></TableCell>
                      <TableCell>Conteúdo da mensagem</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>forceImmediate</code></TableCell>
                      <TableCell>boolean</TableCell>
                      <TableCell><Chip label="Não" size="small" /></TableCell>
                      <TableCell>true = envia na hora, false = fila (padrão)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>scheduledAt</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Não" size="small" /></TableCell>
                      <TableCell>Data/hora ISO 8601 (ex: 2025-11-10T09:00:00-03:00)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>mediaUrl</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Não" size="small" /></TableCell>
                      <TableCell>URL da mídia (imagem, vídeo, etc)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>mediaType</code></TableCell>
                      <TableCell>string</TableCell>
                      <TableCell><Chip label="Não" size="small" /></TableCell>
                      <TableCell>image, video, audio, document</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>priority</code></TableCell>
                      <TableCell>number</TableCell>
                      <TableCell><Chip label="Não" size="small" /></TableCell>
                      <TableCell>Prioridade 1-10 (padrão: 5)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Alert severity="warning" sx={{ mt: 2 }}>
                * Um dos campos <code>phone</code>, <code>email</code> ou <code>telegramId</code> é obrigatório
              </Alert>
            </Box>
          </TabPanel>

          {/* Tab: Webhooks */}
          <TabPanel value={tab} index={1}>
            <Box p={3}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Webhooks Outbound
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure webhooks para receber notificações de eventos em tempo real
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Configure seus webhooks em: <strong>/webhooks</strong>
              </Alert>

              {/* Eventos */}
              <Typography variant="h6" fontWeight="bold" gutterBottom mt={3}>
                Eventos Disponíveis
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mb={3}>
                <Chip label="message.sent" color="success" />
                <Chip label="message.delivered" color="info" />
                <Chip label="message.read" color="primary" />
                <Chip label="message.failed" color="error" />
                <Chip label="message.received" color="success" />
              </Box>

              {/* Formato do Payload */}
              <Typography variant="h6" fontWeight="bold" gutterBottom mt={3}>
                Formato do Payload
              </Typography>
              <CodeBlock
                language="json"
                code={`{
  "event": "message.sent",
  "data": {
    "messageId": "abc-123-def",
    "integrationId": "integration-456",
    "contact": {
      "name": "João Silva",
      "phoneNumber": "5521999999999"
    },
    "content": "Mensagem enviada"
  },
  "timestamp": "2025-11-09T21:30:00.000Z"
}`}
              />

              {/* Validação HMAC */}
              <Typography variant="h6" fontWeight="bold" gutterBottom mt={4}>
                Validação de Segurança (HMAC SHA-256)
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Todos os webhooks incluem um header <code>X-Webhook-Signature</code> com assinatura HMAC
              </Typography>
              <CodeBlock
                language="python"
                code={`import hmac
import hashlib

# Seu secret (disponível na tela de webhooks)
secret = "seu_secret_aqui"

# Payload recebido (JSON string)
payload = request.body

# Calcular assinatura
signature = hmac.new(
    secret.encode(),
    payload.encode(),
    hashlib.sha256
).hexdigest()

# Verificar
if signature == request.headers['X-Webhook-Signature']:
    print("✅ Webhook autêntico!")
else:
    print("❌ Webhook inválido!")`}
              />
            </Box>
          </TabPanel>

          {/* Tab: Autenticação */}
          <TabPanel value={tab} index={2}>
            <Box p={3}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Autenticação via API Key
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Todas as requisições para a API pública requerem uma API Key
              </Typography>

              <Alert severity="warning" sx={{ mb: 3 }}>
                <strong>Como obter:</strong> Acesse <strong>/api-keys</strong> e crie uma nova chave
              </Alert>

              <Typography variant="h6" fontWeight="bold" gutterBottom mt={3}>
                Header de Autenticação
              </Typography>
              <CodeBlock code={`X-API-Key: sk_sua_chave_de_64_caracteres_aqui`} />

              <Typography variant="h6" fontWeight="bold" gutterBottom mt={4}>
                Rate Limiting
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Cada API Key tem um limite de requisições por minuto (padrão: 60 req/min)
              </Typography>
              <CodeBlock
                language="json"
                code={`// Response quando exceder o limite
{
  "error": "Rate limit exceeded",
  "limit": 60,
  "resetIn": 45
}`}
              />

              <Typography variant="h6" fontWeight="bold" gutterBottom mt={4}>
                Permissões
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Chip label="messages:send - Enviar mensagens" />
                <Chip label="messages:read - Listar mensagens" />
                <Chip label="contacts:read - Listar contatos" />
                <Chip label="integrations:read - Listar integrações" />
              </Box>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Layout>
  );
}
