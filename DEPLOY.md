# Deploy em Produção - Stackline Hub

## Pré-requisitos

- Docker Swarm configurado
- Registry GitLab configurado
- Rede `vortex-main` criada
- Traefik configurado

## Build das Imagens

```bash
# Admin
docker build -t registry.gitlab.com/groupvortex/stackline-hub/admin:latest -f apps/admin/Dockerfile .

# API
docker build -t registry.gitlab.com/groupvortex/stackline-hub/api:latest -f apps/api/Dockerfile .

# Realtime
docker build -t registry.gitlab.com/groupvortex/stackline-hub/realtime:latest -f apps/realtime/Dockerfile .
```

## Push para Registry

```bash
docker push registry.gitlab.com/groupvortex/stackline-hub/admin:latest
docker push registry.gitlab.com/groupvortex/stackline-hub/api:latest
docker push registry.gitlab.com/groupvortex/stackline-hub/realtime:latest
```

## Deploy no Swarm

```bash
# Deploy inicial
docker stack deploy -c docker-compose.prod.yml stackline-hub

# Atualizar services
docker service update --image registry.gitlab.com/groupvortex/stackline-hub/admin:latest stackline-hub_admin-hub
docker service update --image registry.gitlab.com/groupvortex/stackline-hub/api:latest stackline-hub_api-hub
docker service update --image registry.gitlab.com/groupvortex/stackline-hub/realtime:latest stackline-hub_realtime-hub
```

## Verificar Status

```bash
# Ver services
docker service ls | grep stackline-hub

# Logs
docker service logs -f stackline-hub_api-hub
docker service logs -f stackline-hub_realtime-hub
docker service logs -f stackline-hub_admin-hub

# Verificar migrations
docker service logs stackline-hub_db-migrate-hub
```

## Configurações Importantes

### Senhas e Secrets

⚠️ **ALTERE** as senhas no `docker-compose.prod.yml` antes do deploy:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `JWT_SECRET`
- Redis password

### Variáveis de Ambiente

Configure no `docker-compose.prod.yml`:

- `WEBHOOK_BASE_URL` - URL base para webhooks (https://hub.clubfacts.com.br)
- `DATABASE_URL` - String de conexão do banco
- `CORS_ORIGIN` - Domínios permitidos

### Volumes

Os dados são persistidos em:
- `mariadb_hub_data` - Banco de dados
- `redis_hub_data` - Cache do Redis

## URLs de Acesso

- **Admin:** https://hub.clubfacts.com.br
- **API:** https://hub.clubfacts.com.br/api
- **API Pública:** https://hub.clubfacts.com.br/v1
- **Webhooks:** https://hub.clubfacts.com.br/webhook
- **Realtime:** wss://hub.clubfacts.com.br/realtime

## Escalabilidade

```bash
# Aumentar réplicas da API
docker service scale stackline-hub_api-hub=3

# Ver distribuição
docker service ps stackline-hub_api-hub
```

## Rollback

```bash
# Voltar versão anterior
docker service rollback stackline-hub_api-hub
```

## Troubleshooting

### Service não inicia

```bash
docker service ps stackline-hub_api-hub --no-trunc
```

### Erro de conexão com banco

```bash
# Verificar se MariaDB está rodando
docker service ls | grep mariadb-hub

# Testar conexão
docker exec -it $(docker ps -q -f name=mariadb-hub) mariadb -uroot -p
```

### Migrations não aplicadas

```bash
# Forçar migrations
docker service update --force stackline-hub_db-migrate-hub
```
