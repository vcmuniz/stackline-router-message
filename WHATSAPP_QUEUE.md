# Sistema de Fila de Mensagens WhatsApp

## Visão Geral

O VortexPay implementa um sistema robusto de fila para envio de mensagens WhatsApp, garantindo entregas confiáveis, rastreamento completo e proteção contra spam.

## Arquitetura

### Componentes Principais

1. **WhatsAppQueue** (Banco de Dados)
   - Armazena mensagens pendentes e seu estado
   - Rastreia tentativas, agendamentos e intervalos

2. **WhatsAppAttempt** (Banco de Dados)
   - Registra cada tentativa de envio com timestamp
   - Armazena códigos de resposta e motivos de falha
   - Mantém histórico completo para auditoria

3. **WhatsAppQueueService** (Backend)
   - Gerencia ciclo de vida das mensagens
   - Implementa lógica de retry e intervalo
   - Integra com Evolution API

4. **Cron Job** (Processador)
   - Executa **a cada minuto**
   - Processa até 50 mensagens por execução
   - Limpa mensagens antigas diariamente

5. **Evolution API** (Provedor)
   - Serviço externo para envio real das mensagens
   - Retorna confirmação e ID de rastreamento

## Fluxo de Envio

```
┌─────────────────┐
│   Aplicação     │
│  (criar msg)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WhatsAppQueue   │◄─── Status: PENDING
│   (database)    │
└────────┬────────┘
         │
         ▼ (aguarda cron - 1 min)
┌─────────────────┐
│   Cron Job      │
│ (a cada minuto) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ getReadyMessages│
│  - Verifica se está em horário permitido (06:00-22:00)
│  - Checa intervalo mínimo desde último envio
│  - Previne múltiplas msgs para mesmo user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ logAttempt()    │◄─── Registra tentativa PENDING
│ (attempt #1)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Evolution API   │
│  sendMessage()  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  SUCESSO   FALHA
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ SENT  │ │FAILED │
│logAtt │ │logAtt │
│ #1    │ │ #1    │
└───────┘ └───┬───┘
              │
              ▼ (retry após 1 min)
         ┌─────────┐
         │tentativa│
         │   #2    │
         └─────────┘
```

## Estados da Mensagem

### Status do WhatsAppQueue

| Status | Descrição | Próximo Passo |
|--------|-----------|---------------|
| `PENDING` | Aguardando processamento | Será enviada no próximo cron |
| `SCHEDULED` | Agendada para data futura | Enviada quando `scheduledAt` chegar |
| `SENT` | Enviada com sucesso | Nenhum (final) |
| `FAILED` | Todas tentativas falharam | Nenhum (final) |
| `CANCELLED` | Cancelada manualmente | Nenhum (final) |

### Status do WhatsAppAttempt

| Status | Descrição |
|--------|-----------|
| `PENDING` | Tentativa iniciada, aguardando resposta |
| `SENT` | Tentativa bem-sucedida |
| `FAILED` | Tentativa falhou |

## Regras de Negócio

### 1. Horário Permitido

**Envios apenas entre 06:00 e 22:00**

- Mensagens criadas fora deste horário são automaticamente agendadas para 06:00 do dia seguinte
- Esta regra previne envios em horários inconvenientes

```typescript
// Exemplo: Mensagem criada às 23:30
// Será agendada para: amanhã às 06:00
```

### 2. Intervalo Mínimo

**Padrão: 5 minutos (300 segundos)**

- Previne envio de múltiplas mensagens para o mesmo usuário em curto período
- Configurável por mensagem via campo `minInterval`

```typescript
// Última mensagem enviada: 10:00
// minInterval: 300 segundos (5 min)
// Próxima mensagem permitida: 10:05
```

### 3. Prevenção de Duplicatas

**Máximo 1 mensagem por usuário por execução do cron**

- Mesmo que existam 5 mensagens pendentes para um usuário
- Apenas 1 será enviada por minuto
- As outras aguardam a próxima execução

### 4. Sistema de Retry

**Máximo de tentativas: 3 (padrão)**

- Configurável via campo `maxRetries`
- Delay de 1 minuto entre tentativas
- Após esgotar tentativas, status muda para `FAILED`

```
Tentativa 1: 10:00 → Falha
Tentativa 2: 10:01 → Falha
Tentativa 3: 10:02 → Falha
Status final: FAILED
```

## Rastreamento de Tentativas

Cada tentativa é registrada com:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `attemptNumber` | Número sequencial da tentativa | 1, 2, 3 |
| `createdAt` | Quando a tentativa foi iniciada | 2025-01-09 10:00:00 |
| `sentAt` | Quando foi enviada (se sucesso) | 2025-01-09 10:00:02 |
| `responseCode` | Código HTTP da Evolution API | 200, 500 |
| `responseMessage` | Mensagem de resposta | "OK", "Timeout" |
| `failureReason` | Motivo da falha | "Número inválido" |
| `evolutionId` | ID retornado pela Evolution | "msg_abc123" |
| `evolutionData` | JSON completo da resposta | {...} |

## Modo de Desenvolvimento

**NODE_ENV !== 'production'**

Quando em desenvolvimento:
- Mensagens são **simuladas** (não chamam Evolution API)
- Status marcado como `SENT` com ID simulado
- Logs indicam `[DEV MODE]`
- Evita envios reais durante testes

```typescript
// Development
result = {
  success: true,
  message: 'Simulado em desenvolvimento',
  data: { id: 'sim_1736428800000' }
}
```

## API Endpoints

### Criar Mensagem

```http
POST /whatsapp/send-text
Authorization: Bearer {token}
Content-Type: application/json

{
  "phone": "+5511999999999",
  "message": "Sua mensagem aqui",
  "scheduledAt": "2025-01-10T09:00:00Z" // Opcional
}
```

### Listar Fila

```http
GET /whatsapp/queue?status=PENDING&limit=50&offset=0
Authorization: Bearer {token}

# Admins: veem todas as mensagens
# Usuários: veem apenas suas mensagens
```

### Obter Histórico de Tentativas

```http
GET /whatsapp/queue/{messageId}/attempts
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "att_123",
      "attemptNumber": 1,
      "status": "SENT",
      "sentAt": "2025-01-09T10:00:02Z",
      "responseCode": 200,
      "evolutionId": "msg_abc123"
    }
  ]
}
```

### Cancelar Mensagem

```http
POST /whatsapp/queue/{messageId}/cancel
Authorization: Bearer {token}

# Apenas mensagens PENDING ou SCHEDULED podem ser canceladas
```

### Estatísticas da Fila

```http
GET /whatsapp/queue/stats
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "pending": 5,
    "scheduled": 2,
    "sent": 150,
    "failed": 3,
    "cancelled": 1
  }
}
```

## Admin Dashboard

Acessível em: `/admin/whatsapp-queue`

### Recursos

- **Estatísticas em tempo real**
  - Pendentes, agendadas, enviadas, falhadas, canceladas

- **Tabela de mensagens**
  - Formato de linha (não coluna)
  - Filtros por telefone e status
  - Paginação

- **Modal de detalhes**
  - Informações completas da mensagem
  - Histórico de tentativas com timeline
  - Códigos de resposta coloridos
  - Motivos de falha destacados
  - Botão de cancelamento (se aplicável)

## Limpeza Automática

**Executada às 03:00 AM diariamente**

- Remove mensagens com mais de 30 dias
- Libera espaço no banco de dados
- Mantém apenas histórico recente

```typescript
// Mensagens criadas antes de: hoje - 30 dias
// São deletadas automaticamente
```

## Notificações de Erro

Se o cron falhar:
- Admins recebem notificação no sistema
- Erro é logado no console
- Permite diagnóstico rápido

## Integração com Sistema de Bônus

Quando um bônus é liberado:

```typescript
await WhatsAppQueueService.createQueueMessage({
  userId: bonusUser.id,
  phone: bonusUser.phone,
  message: `🎉 Você recebeu um bônus de ${formatCurrency(amount)}!`,
  metadata: {
    type: 'bonus_notification',
    bonusId: bonus.id,
    bonusType: bonus.type,
    amount: bonus.amount
  }
})
```

A mensagem é automaticamente enfileirada e será enviada no próximo minuto.

## Monitoramento

### Logs do Cron

```bash
# Verificar logs do cron
docker logs vortex-pay-cron -f

# Exemplo de saída:
📨 [WhatsApp Queue Job] Iniciando processamento da fila...
[msg_123] Enviando para +5511999999999...
✅ [msg_123] Enviada com sucesso
📊 Resumo do processamento:
   Total processado: 5
   Enviadas: 4
   Falhadas: 1
```

### Banco de Dados

```sql
-- Mensagens pendentes
SELECT COUNT(*) FROM whatsapp_queue WHERE status = 'PENDING';

-- Taxa de sucesso
SELECT
  status,
  COUNT(*) as total
FROM whatsapp_queue
GROUP BY status;

-- Tentativas por mensagem
SELECT
  q.id,
  q.phone,
  COUNT(a.id) as attempts
FROM whatsapp_queue q
LEFT JOIN whatsapp_attempt a ON a.queueId = q.id
GROUP BY q.id;
```

## Boas Práticas

### 1. Sempre use a fila

❌ **Não fazer:**
```typescript
await EvolutionService.sendTextMessage({ ... })
```

✅ **Fazer:**
```typescript
await WhatsAppQueueService.createQueueMessage({ ... })
```

### 2. Configure intervalos adequados

- Mensagens críticas: `minInterval: 60` (1 min)
- Mensagens normais: `minInterval: 300` (5 min) - padrão
- Mensagens promocionais: `minInterval: 3600` (1 hora)

### 3. Use metadata para rastreamento

```typescript
metadata: {
  type: 'bonus_notification',
  referenceId: bonus.id,
  userId: user.id
}
```

### 4. Monitore falhas

- Verifique mensagens `FAILED` regularmente
- Analise `failureReason` para identificar padrões
- Ajuste `maxRetries` se necessário

## Troubleshooting

### Mensagem não está sendo enviada

1. Verifique o status: `SELECT * FROM whatsapp_queue WHERE id = 'xxx'`
2. Confira se está em horário permitido (06:00-22:00)
3. Verifique intervalo mínimo desde último envio
4. Confira se o cron está rodando: `docker logs vortex-pay-cron`

### Muitas falhas

1. Verifique conectividade com Evolution API
2. Valide formato dos números de telefone (E.164)
3. Confira configuração da Evolution API em `.env`
4. Analise `evolutionData` das tentativas falhadas

### Performance lenta

- Aumente limite do cron de 50 para 100 mensagens
- Reduza frequência do cron (ex: a cada 2 minutos)
- Verifique índices do banco de dados

## Configuração

### Variáveis de Ambiente

```env
# Evolution API
EVOLUTION_API_URL=https://evolution.exemplo.com
EVOLUTION_API_KEY=sua_chave_aqui
EVOLUTION_INSTANCE=vortexpay

# Ambiente
NODE_ENV=production # ou 'development' para simular envios
```

### Ajustar Frequência do Cron

```typescript
// apps/cron/src/jobs/whatsapp-queue.ts
schedule: '* * * * *', // Cada minuto
schedule: '*/2 * * * *', // Cada 2 minutos
schedule: '*/5 * * * *', // Cada 5 minutos
```

## Segurança

- ✅ Autenticação JWT obrigatória em todos endpoints
- ✅ Usuários só veem suas próprias mensagens
- ✅ Admins podem ver e gerenciar todas mensagens
- ✅ Cancelamento requer autorização
- ✅ Validação de números de telefone
- ✅ Rate limiting via intervalo mínimo

## Roadmap Futuro

- [ ] Suporte a mensagens com mídia (imagens, vídeos)
- [ ] Suporte a mensagens com botões
- [ ] Templates de mensagens pré-configurados
- [ ] Webhooks de status de entrega
- [ ] Dashboard de analytics
- [ ] Exportação de relatórios
- [ ] Integração com outras APIs de WhatsApp

---

**Última atualização:** Janeiro 2025
**Versão:** 1.0.0
