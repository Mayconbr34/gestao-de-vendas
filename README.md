# Projeto Integrador

Sistema web com backend em NestJS e frontend em Next.js, usando PostgreSQL em nuvem, autenticação JWT, documentação Swagger/OpenAPI, conteinerização com Docker e pipeline CI/CD com GitHub Actions.

## Estrutura

- `backend` — API NestJS com JWT, Swagger e PostgreSQL.
- `frontend` — Interface Next.js para consumir a API.
- `docker-compose.yml` — orquestração local dos serviços.

## Requisitos

- Node.js 20+
- PostgreSQL externo (cloud)

## Configuração

1. Configure o backend:

```bash
cd backend
cp .env.example .env
```

Preencha as variáveis de banco e JWT no arquivo `.env`.

2. Instale e rode o backend:

```bash
npm install
npm run start:dev
```

O JSON OpenAPI fica em `http://localhost:3001/docs-json`.

3. Configure o frontend:

```bash
cd ../frontend
cp .env.example .env
```

4. Instale e rode o frontend:

```bash
npm install
npm run dev
```

A documentação Swagger/UI fica em `http://localhost:3000/docs` (apenas logado).

## Endpoints (Backend)

### Auth
- `POST /auth/register` — cadastro interno (email + senha)
- `POST /auth/login` — autenticação e geração de JWT
- `GET /auth/session` — dados da sessão atual (ip, user-agent, localização)
- `POST /auth/request-reset` — solicita reset de senha (retorna link quando email ativo)
- `POST /auth/reset-password` — redefine senha via token

### Usuários
- `GET /users` — lista usuários (super admin pode filtrar com `?companyId=...`)
- `GET /users/me` — perfil do usuário autenticado
- `PUT /users/me` — atualiza perfil do usuário autenticado
- `POST /users/me/avatar` — upload de avatar (multipart/form-data)
- `POST /users/me/change-password` — troca de senha do usuário autenticado
- `POST /users` — cria usuário
- `POST /users/:id/reset-password` — gera link de reset (admin/super admin)
- `PUT /users/:id` — atualiza usuário
- `DELETE /users/:id` — remove usuário

### Empresas
- `GET /companies` — lista empresas (super admin)
- `GET /companies/me` — dados da empresa do usuário
- `GET /companies/:id` — detalhes da empresa (super admin)
- `POST /companies` — cria empresa (super admin)
- `PUT /companies/me` — atualiza empresa do usuário
- `PUT /companies/:id` — atualiza empresa (super admin)
- `POST /companies/me/logo` — upload do logo da empresa do usuário (multipart/form-data)
- `POST /companies/:id/logo` — upload do logo da empresa (super admin)

### Plataforma
- `GET /platform-settings` — configurações da plataforma
- `PUT /platform-settings` — atualiza configurações (super admin)
- `POST /platform-settings/favicon` — upload de favicon (super admin)
- `GET /platform-settings/public` — dados públicos da plataforma

### Produtos
- `GET /products` — lista produtos (super admin pode filtrar com `?companyId=...`)
- `GET /products/:id` — detalhe do produto
- `POST /products` — cria produto
- `PUT /products/:id` — atualiza produto
- `DELETE /products/:id` — remove produto
- `POST /products/:id/image` — upload de imagem do produto (multipart/form-data)

### Categorias
- `GET /categories` — lista categorias e quantidade de produtos
- `POST /categories` — cria categoria
- `PUT /categories/:id` — atualiza o nome da categoria

### Impostos
- `GET /tax-profiles` — lista perfis fiscais (super admin pode filtrar com `?companyId=...`)
- `POST /tax-profiles` — cria perfil fiscal
- `PUT /tax-profiles/:id` — atualiza perfil fiscal
- `DELETE /tax-profiles/:id` — remove perfil fiscal
- `GET /fiscal-rules` — lista regras fiscais (super admin pode filtrar com `?companyId=...`)
- `POST /fiscal-rules` — cria regra fiscal
- `PUT /fiscal-rules/:id` — atualiza regra fiscal
- `DELETE /fiscal-rules/:id` — remove regra fiscal
- `POST /fiscal-rules/resolve` — resolve regra fiscal para uma operação
- `GET /icms-rates` — lista alíquotas de ICMS (super admin pode filtrar com `?companyId=...`)
- `POST /icms-rates` — cria alíquota de ICMS
- `PUT /icms-rates/:id` — atualiza alíquota de ICMS
- `DELETE /icms-rates/:id` — remove alíquota de ICMS

### Auditoria
- `GET /audits` — auditoria de ações (login/criação/edição/remoção)

### API Keys
- `GET /api-keys` — lista chaves de API
- `POST /api-keys` — cria chave de API (retorna `apiKey` + `apiSecret`)
- `PUT /api-keys/:id` — atualiza nome/limite/ativo
- `DELETE /api-keys/:id` — revoga chave de API
- `GET /api-keys/:id/requests?limit=50` — lista últimas requisições da chave

### API pública com Key/Secret
- `GET /api/products` — lista produtos usando headers `x-api-key` e `x-api-secret`
- `GET /api/categories` — lista categorias usando headers `x-api-key` e `x-api-secret`

Todos os endpoints (exceto `/auth/*`, `/platform-settings/public` e `/api/*`) exigem `Authorization: Bearer <token>`.

## Observações de Dados

- Um bootstrap automático cria as tabelas e um usuário admin no primeiro start do backend (apenas uma vez). Login: `admin@admin.com` / senha: `123456`.
- Para localizar o IP no login, configure `GEOIP_API_URL` (ex.: `https://ipapi.co/{ip}/json/`). Sem isso, a auditoria grava apenas o IP.
- `API_RATE_LIMIT_DEFAULT` define o limite padrão de requisições por minuto para novas chaves de API.

## Docker

Com o backend configurado em `backend/.env`:

```bash
docker compose up --build
```

  - Backend: `http://localhost:3001`
  - Frontend: `http://localhost:3002`
  - Swagger/UI: `http://localhost:3002/docs` (apenas logado)
