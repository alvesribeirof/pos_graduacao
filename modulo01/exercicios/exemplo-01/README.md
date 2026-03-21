# Exemplo 01 - Recomendacao de Produtos

Aplicacao web de e-commerce para selecao de usuarios, visualizacao de produtos e registro de compras, preparada para evolucao com recomendacao usando TensorFlow.js.

## Objetivo

- Exibir perfis de usuario e historico de compras.
- Listar produtos e registrar interacoes.
- Organizar arquitetura em controller, service e view.

## Requisitos

- Node.js 18+
- npm 9+

## Como Executar

```bash
npm install
npm start
```

Abra no navegador em http://localhost:8080.

## Estrutura Principal

- index.html: interface base.
- src/index.js: ponto de entrada da aplicacao.
- src/controller: controle de fluxo da interface e treinamento.
- src/service: regras de negocio e manipulacao de dados.
- src/view: componentes visuais e templates.
- data: base de usuarios e produtos em JSON.

## Proximos Passos

- Integrar recomendacao com TensorFlow.js.
- Aprimorar ranking por similaridade de usuarios.
