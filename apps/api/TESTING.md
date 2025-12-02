# 🧪 Guia de Testes - API

## Quick Start

```bash
# Navegar até a pasta da API
cd apps/api

# Rodar todos os testes
npm test

# Rodar testes em modo watch
npm run test:watch

# Ver cobertura de testes
npm run test:coverage
```

## Scripts Disponíveis

### `npm test`
Executa todos os testes uma única vez.

```bash
npm test
npm run test
```

### `npm run test:watch`
Executa os testes em modo watch, que detecta mudanças e reroda os testes automaticamente.

```bash
npm run test:watch
```

Ótimo para desenvolvimento, você verá os testes passando/falhando conforme faz mudanças.

### `npm run test:coverage`
Gera um relatório de cobertura de testes mostrando qual percentual do código está sendo testado.

```bash
npm run test:coverage
```

## Estrutura de Testes

```
apps/api/src/__tests__/
├── setup.ts                         # Configuração compartilhada
├── auth.test.ts                     # Testes de autenticação
├── contacts.test.ts                 # Testes de contatos
├── messages.test.ts                 # Testes de mensagens
├── integrations.test.ts             # Testes de integrações
├── apiKeys.test.ts                  # Testes de chaves de API
├── dashboard.test.ts                # Testes do dashboard
├── health.test.ts                   # Health check
├── messageQueueService.test.ts      # Testes de fila de mensagens
├── webhookService.test.ts           # Testes de webhooks
├── smtpService.test.ts              # Testes de SMTP
├── queueService.test.ts             # Testes de queue
└── evolutionApi.test.ts             # Testes da API Evolution
```

**Total:** 50+ testes

## Tipos de Testes

### Tests de Routes (Integração)
Testam os endpoints HTTP completos:
- Autenticação
- CRUD operations
- Códigos HTTP
- Validações

Exemplo:
```typescript
describe('GET /api/contacts', () => {
  it('should return 401 without auth token', async () => {
    const response = await request(app).get('/api/contacts');
    expect(response.status).toBe(401);
  });
});
```

### Tests de Services (Unitários)
Testam a lógica de negócio isoladamente:
- Validações
- Transformações
- Acesso ao banco (com mocks)
- Tratamento de erros

Exemplo:
```typescript
describe('ContactService', () => {
  it('should return error for non-existent contact', async () => {
    const contact = await ContactService.getContactById(
      'user123',
      'non-existent'
    );
    expect(contact).toBeNull();
  });
});
```

## Opções de Linha de Comando

### Rodar teste específico
```bash
npm test -- auth.test.ts
npm test -- contacts.test.ts
```

### Rodar com padrão de nome
```bash
npm test -- --testNamePattern="login"
npm test -- --testNamePattern="should list"
```

### Modo verbose
```bash
npm test -- --verbose
```

### Parar no primeiro erro
```bash
npm test -- --bail
```

### Watch mode com pattern
```bash
npm run test:watch -- auth.test.ts
```

### Coverage detalhado
```bash
npm run test:coverage -- --verbose
```

## Configuração (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',              // Usa ts-jest para TypeScript
  testEnvironment: 'node',        // Ambiente Node.js
  roots: ['<rootDir>/src'],       // Raiz dos testes
  testMatch: [
    '**/__tests__/**/*.ts',       // Testes em pastas __tests__
    '**/?(*.)+(spec|test).ts'     // Arquivos .test.ts ou .spec.ts
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',                // Coleta cobertura de src
    '!src/**/*.d.ts',             // Excluir tipos
    '!src/index.ts'               // Excluir entry point
  ]
};
```

## Exemplos de Testes

### Teste de Autenticação
```typescript
describe('POST /auth/login', () => {
  it('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Credenciais inválidas');
  });
});
```

### Teste de CRUD
```typescript
describe('GET /api/contacts/:id', () => {
  it('should return 404 for non-existent contact', async () => {
    const response = await request(app)
      .get('/api/contacts/non-existent')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(404);
  });
});
```

### Teste de Service
```typescript
describe('ContactService', () => {
  it('should list contacts with filters', async () => {
    const result = await ContactService.listContacts('user123', {
      search: 'john',
      page: 1,
      limit: 20
    });

    expect(result.contacts).toBeDefined();
    expect(result.pagination).toBeDefined();
  });
});
```

## Debugging

### Ver mais detalhes
```bash
npm test -- --verbose
```

### Ver logs do console
```bash
npm test -- --no-coverage
```

### Rodar teste específico com debug
```bash
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.ts
```

## Boas Práticas

### ✅ Faça
- Mantenha testes simples e focados
- Use mocks para dependências externas
- Teste casos de sucesso e erro
- Nomeie testes descritivamente
- Execute testes antes de commit
- Atualize testes quando mudar código

### ❌ Não Faça
- Não faça testes que dependem de banco de dados real
- Não ignore testes falhando
- Não escreva testes muito complexos
- Não teste implementação, teste comportamento
- Não deixe testes quebrados no git

## Troubleshooting

### Jest não encontra os testes
Certifique-se de que:
- Está na pasta `apps/api`
- Os arquivos estão em `src/__tests__/`
- Nomes terminam com `.test.ts`

### Testes falhando por timeout
```bash
# Aumentar timeout
npm test -- --testTimeout=10000
```

### Módulos não encontrados
```bash
# Limpar cache
npm test -- --clearCache
```

### Prisma mock não funciona
- Certifique-se de que o mock está antes do import
- Use `jest.mock()` no topo do arquivo
- Verifique se o módulo está correto

## CI/CD Integration

Para rodar testes em CI/CD:

```yaml
# GitHub Actions example
- name: Run tests
  run: |
    cd apps/api
    npm test -- --coverage --watchAll=false
```

## Performance

Para acelerar os testes:
```bash
# Rodar testes em paralelo (padrão)
npm test

# Rodar com menos paralelo
npm test -- --maxWorkers=2

# Rodar sequencial
npm test -- --runInBand
```

## Próximas Melhorias

- [ ] Adicionar testes para controllers
- [ ] Aumentar cobertura para 80%+
- [ ] Adicionar e2e tests
- [ ] Setup de testes com banco de dados de teste
- [ ] Integration com coverage reports

## Referências

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/visionmedia/supertest)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
