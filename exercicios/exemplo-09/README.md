# Exemplo 09 - Alumnus Observability Stack

Exemplo de observabilidade com aplicacao Node.js instrumentada e stack local (Grafana, Prometheus, Loki, Tempo e OpenTelemetry).

## Estrutura

- `alumnus/`: projeto principal com orquestracao e documentacao.
- `alumnus/_alumnus/`: aplicacao demo instrumentada.
- `alumnus/infra/`: infraestrutura docker para monitoramento.

## Execucao rapida

```bash
cd alumnus
npm install
npm run docker:infra:up
npm run start
```

## Requisitos

- Docker e Docker Compose
- Node.js 22+

## Observacoes

- A aplicacao depende de PostgreSQL na porta `5433` (fornecido pela infra docker).
- Sem a infraestrutura ativa, o `npm run start` falha por conexao recusada ao banco.

## Changelog

### 2026-03-13
- Docs: README criado para o novo exemplo.