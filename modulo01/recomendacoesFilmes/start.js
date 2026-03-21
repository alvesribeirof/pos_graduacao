import { spawn } from 'child_process';
import { chromium } from 'playwright';

console.log('Iniciando o servidor estático (serve)...');

// Inicia o servidor estático usando o pacote 'serve'
const serverProcess = spawn('npx', ['serve', '.', '-l', '8080'], {
    stdio: 'inherit',
    shell: true
});

console.log('Iniciando o ChromaDB na porta 8000...');
// Inicia o servidor ChromaDB usando o executável do .venv
const chromaProcess = spawn('.venv\\Scripts\\chroma.exe', ['run', '--path', './chroma_data', '--port', '8000'], {
    stdio: 'inherit',
    shell: true
});

// Aguarda um pouco para o ChromaDB subir antes de iniciar o proxy
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('Iniciando o Proxy de CORS...');
// Inicia o proxy para o ChromaDB
const proxyProcess = spawn('node', ['proxy.js'], {
    stdio: 'inherit',
    shell: true
});

setTimeout(async () => {
    try {
        console.log('Abrindo o navegador...');
        const browser = await chromium.launch({
            headless: false,
            // Argumentos para evitar barra amarela de controle automático
            args: ['--start-maximized', '--disable-infobars']
        });

        const context = await browser.newContext({ viewport: null });
        const page = await context.newPage();

        await page.goto('http://localhost:8080');

        console.log('Navegador aberto! Se você fechá-lo, este processo será encerrado.');

        // Quando o navegador for fechado pelo usuário
        browser.on('disconnected', () => {
            console.log('\nNavegador fechado. Encerrando o processo Node...');
            serverProcess.kill();
            proxyProcess.kill();
            chromaProcess.kill();
            process.exit(0);
        });
    } catch (error) {
        console.error('Erro ao abrir o navegador com Playwright:', error);
        serverProcess.kill();
        process.exit(1);
    }
}, 1500); // Aguarda 1.5s para garantir que o server online
