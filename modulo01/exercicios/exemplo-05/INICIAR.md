## 1. Configuração do Navegador (Google Chrome)
Como o projeto usa IA nativa rodando na sua GPU/CPU, o navegador precisa estar preparado:

### A. Ativar Flags de IA
1. Acesse `chrome://flags/` no seu navegador.
2. Pesquise e ative (**Enabled**) as seguintes flags:
   - `#prompt-api-for-gemini-nano`: Ativa a API de chat.
   - `#optimization-guide-on-device-model`: Defina como **Enabled BypassPerfRequirement** (isso força a ativação mesmo em máquinas mais simples).
   - `#translation-api`: Ativa a tradução local.
   - `#language-detector-api`: Ativa a detecção de idioma local.
3. Clique no botão **Relaunch** para reiniciar o Chrome.

### B. Verificar Download do Modelo (Gemini Nano)
O Chrome precisa baixar o "cérebro" da IA (cerca de 1.5GB):
1. Acesse `chrome://components/`
2. Procure por **Optimization Guide On Device Model**.
3. Clique em **Check for update**.
4. O status deve ser **Component updated** ou **Up-to-date**. Se estiver em `0.0.0.0`, aguarde o download terminar.

---

## 2. Iniciar o Banco de Dados (ChromaDB)
O banco de dados armazena o conhecimento dos seus PDFs.
1. Abra um terminal na pasta do projeto `exemplo-05`.
2. Se houver um ambiente virtual ativo (`.venv`), desative-o com o comando `deactivate`.
3. Execute o script de inicialização do banco:
   ```powershell
   python run_chroma.py
   ```
> **Atenção:** Mantenha este terminal aberto enquanto usa o site.

---

## 3. Iniciar o Servidor Web
1. Abra um **segundo** terminal na pasta do projeto `exemplo-05`.
2. Execute o comando para subir o site:
   ```powershell
   npm start
   ```
3. O terminal indicará um endereço (geralmente `http://localhost:8080`).

---

## 4. Como testar
1. Acesse o endereço do servidor web no Chrome.
2. Escolha um arquivo **PDF** no botão lateral.
3. Observe o console e o painel de mensagens: o texto será extraído e processado localmente.
4. Faça perguntas sobre o conteúdo do PDF na caixa de texto.

---

## 🛠 Solução de Problemas
- **Erro "Failed to fetch":** Verifique se o terminal do Python (ChromaDB) está aberto e sem erros.
- **IA não responde:** Certifique-se de que o Chrome não está "baixando" o modelo (isso acontece na primeira execução e pode demorar). Verifique `chrome://components` e procure por `Optimization Guide On Device Model`.
