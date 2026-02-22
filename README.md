# Projeto Backend e Frontend

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

A documentação Swagger/OpenAPI fica em `http://localhost:3001/docs`.

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

## Endpoints (Backend)

- `POST /auth/register` — cadastro interno (email + senha)
- `POST /auth/login` — autenticação e geração de JWT
- `GET /users` — listar usuários
- `POST /users` — criar usuário
- `PUT /users/:id` — atualizar usuário
- `DELETE /users/:id` — remover usuário
- `GET /products` — listar produtos (nome, estoque, preço)
- `POST /products` — criar produto
- `PUT /products/:id` — atualizar produto
- `DELETE /products/:id` — remover produto
- `GET /categories` — listar categorias e quantidade de produtos
- `POST /categories` — criar categoria
- `GET /audits` — auditoria de ações (login/criação/edição/remoção)
- `GET /api-keys` — listar chaves de API
- `POST /api-keys` — criar chave de API (retorna `apiKey` + `apiSecret`)
- `PUT /api-keys/:id` — atualizar nome/limite/ativo
- `DELETE /api-keys/:id` — revogar chave de API
- `GET /api-keys/:id/requests` — listar últimas requisições da chave

### API pública com Key/Secret

- `GET /api/products` — lista produtos usando headers `x-api-key` e `x-api-secret`
- `GET /api/categories` — lista categorias usando headers `x-api-key` e `x-api-secret`

Todos os endpoints (exceto `/auth/*`) exigem `Authorization: Bearer <token>`.

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
- Frontend: `http://localhost:3000`

## CI/CD

O workflow em `.github/workflows/ci.yml` executa lint e build para backend e frontend via GitHub Actions.
