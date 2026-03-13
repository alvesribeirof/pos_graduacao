# 🧠 Exemplo 00 - Classificação com TensorFlow.js

Este projeto demonstra a criação e treinamento de uma rede neural simples utilizando **TensorFlow.js** em ambiente Node.js para classificar usuários em categorias (Premium, Medium, Basic) com base em seus perfis.

## 🎯 Objetivo

Aprender os conceitos fundamentais de Machine Learning com JS:
- Normalização de dados.
- Arquitetura de camadas (`dense`).
- Funções de ativação (`relu`, `softmax`).
- Processo de treinamento (`fit`) e predição.

## 🏗️ Arquitetura da Rede

- **Input Shape**: 7 dimensões (Idade, Cores, Cidade).
- **Hidden Layer**: 80 neurônios com ativação ReLU.
- **Output Layer**: 3 neurônios (categorias) com ativação Softmax para probabilidade.

## 🚀 Como Executar

Certifique-se de ter o Node.js instalado.

```bash
# Instalar dependências
npm install

# Executar o script
node index.js
```

## 📊 Estrutura de Entrada

Os dados são normalizados para o intervalo [0, 1] antes de serem alimentados na rede, garantindo maior estabilidade no treinamento.
