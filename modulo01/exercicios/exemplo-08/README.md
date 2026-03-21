# Exemplo 08 - Next.js com Better Auth

Exemplo de autenticacao com Next.js App Router, Better Auth, GitHub OAuth e SQLite.

## Estrutura

- `prompt.md`: prompt utilizado para gerar o projeto demo.
- `nextjs-better-auth-demo/`: aplicacao Next.js completa.

## Execucao

```bash
cd nextjs-better-auth-demo
npm install
npx @better-auth/cli migrate
npm run dev
```

## Observacoes

- Configure `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no `.env.local`.
- O banco local e `better-auth.sqlite`.

## Validacao

- Build de producao deve executar via `npm run build` dentro de `nextjs-better-auth-demo`.

## Changelog

### 2026-03-13
- Docs: README criado para o novo exemplo.
- Maintenance: ajuste de tipagem para `better-sqlite3` no projeto demo.