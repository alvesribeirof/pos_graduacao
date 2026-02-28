import http from 'http';

const PROXY_PORT = 8001;
const TARGET_PORT = 8000;
const TARGET_HOST = 'localhost';

const server = http.createServer((req, res) => {
    // Adicionar headers de CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Tratar requisição OPTIONS (Preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`[Proxy] ${req.method} ${req.url}`);

    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers
    };

    // Remover header de host original para evitar problemas no alvo
    delete options.headers.host;

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error(`[Proxy Error] ${err.message}`);
        res.writeHead(502);
        res.end('Bad Gateway');
    });

    req.pipe(proxyReq, { end: true });
});

server.listen(PROXY_PORT, () => {
    console.log(`✅ Proxy de CORS rodando em http://localhost:${PROXY_PORT}`);
    console.log(`➡️ Encaminhando para http://${TARGET_HOST}:${TARGET_PORT}`);
});
