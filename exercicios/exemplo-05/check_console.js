const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let logs = [];
    page.on('console', msg => {
        logs.push(`[${msg.type()}] ${msg.text()}`);
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', error => {
        logs.push(`[pageerror] ${error.message}`);
        console.log(`[pageerror] ${error.message}`);
    });

    await page.goto('http://127.0.0.1:8081', { waitUntil: 'networkidle0' });

    // Inject console.log inside aiService to trace content length
    await page.evaluate(() => {
        const originalCreate = LanguageModel.create;
        LanguageModel.create = async function (args) {
            console.log("Creating LM session with args:", JSON.stringify(args));
            const session = await originalCreate.call(this, args);
            const originalPrompt = session.promptStreaming;
            session.promptStreaming = async function (prompts, opts) {
                console.log("promptStreaming called with length:", JSON.stringify(prompts).length);
                return originalPrompt.call(session, prompts, opts);
            };
            return session;
        }
    });

    await page.type('#question', 'O que tem no texto?');

    const fs = require('fs');
    const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000346 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n435\n%%EOF\n';
    fs.writeFileSync('dummy.pdf', pdfContent);

    const inputUploadHandle = await page.$('input[type=file]');
    await inputUploadHandle.uploadFile('dummy.pdf');

    await page.click('#ask-button');

    await new Promise(r => setTimeout(r, 6000));

    await browser.close();
})();
