# Stackline Router Messages

Sistema de roteamento e gerenciamento de mensagens multicanal (WhatsApp, Email, SMS, Telegram).

## Estrutura

**Apps:**
- `api` - Backend REST (Express + Prisma + MariaDB)
- `realtime` - WebSocket server (Socket.IO + cron jobs)
- `admin` - Dashboard administrativo (React + Vite + MUI)

**Packages:**
- `database` - Prisma client + Services compartilhados

## Iniciar com Docker

```bash
docker compose up -d
```

O cloudflared inicia automaticamente e expõe a API em `https://hub.stackline.com.br`.

**URLs disponíveis:**
- Admin: http://localhost:5173
- API: http://localhost:4000
- Realtime: http://localhost:4500
- Evolution API: http://localhost:8080
- Adminer (DB): http://localhost:8082
- MariaDB: localhost:3306 (root/root)
- Redis: localhost:6380

## Login no Admin

- **Email:** admin@messagehub.com
- **Senha:** admin123

## Como criar integração WhatsApp Evolution

1. Acesse http://localhost:5173/integrations
2. Clique em "Nova Integração"
3. Preencha:
   - **Nome:** WhatsApp Atendimento
   - **Tipo:** WhatsApp Evolution API
   - **URL da Evolution API:** `https://******`
   - **API Key:** `******`
   - **Nome da Instância:** `principal` (use nome único, sem espaços)
4. Clique em "Criar"
5. Após criada, clique em "Conectar"
6. Clique em "Ver QR Code" e escaneie com WhatsApp
7. Aguarde conectar (status muda para ACTIVE)

**Observações:**
- Cada instância precisa de um `instanceName` único
- Não use o mesmo número do WhatsApp em múltiplas instâncias
- O webhook é configurado automaticamente ao conectar
- Se der erro ao criar instância, reinicie a Evolution API: `docker compose restart evolution-api`
