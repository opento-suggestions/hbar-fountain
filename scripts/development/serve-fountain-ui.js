/**
 * Simple HTTP Server for Fountain Protocol UI
 * Serves the docs/ directory for local browser testing
 */

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCS_DIR = join(__dirname, 'docs');
const PORT = 3000;

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

async function serveFile(filePath, res) {
    try {
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
            const content = await readFile(filePath);
            const ext = extname(filePath);
            const mimeType = MIME_TYPES[ext] || 'text/plain';
            
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': content.length,
                'Cache-Control': 'no-cache'
            });
            res.end(content);
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

const server = createServer(async (req, res) => {
    let urlPath = req.url;
    
    // Remove query string
    const queryIndex = urlPath.indexOf('?');
    if (queryIndex !== -1) {
        urlPath = urlPath.substring(0, queryIndex);
    }
    
    // Default to fountain-ui.html
    if (urlPath === '/') {
        urlPath = '/fountain-ui.html';
    }
    
    const filePath = join(DOCS_DIR, urlPath);
    
    // Security check - ensure file is within docs directory
    if (!filePath.startsWith(DOCS_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    
    console.log(`📄 Serving: ${urlPath}`);
    
    // Try to serve the requested file
    const served = await serveFile(filePath, res);
    
    if (!served) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <head><title>404 - Not Found</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h1>🌊 Fountain Protocol</h1>
                    <h2>404 - File Not Found</h2>
                    <p>The file <code>${urlPath}</code> could not be found.</p>
                    <p><a href="/fountain-ui.html">Go to Fountain Protocol UI</a></p>
                </body>
            </html>
        `);
    }
});

server.listen(PORT, () => {
    console.log('🌊 FOUNTAIN PROTOCOL - LOCAL SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📱 Fountain UI: http://localhost:${PORT}/fountain-ui.html`);
    console.log(`📂 Serving from: ${DOCS_DIR}`);
    console.log('='.repeat(50));
    console.log('🎯 BROWSER WALKTHROUGH:');
    console.log('1. Open your browser to: http://localhost:3000');
    console.log('2. You\'ll see the Fountain Protocol welcome page');
    console.log('3. Click "Connect Wallet" to test wallet integration');
    console.log('4. Choose "Test Mode" to simulate user interactions');
    console.log('5. Explore the dashboard with real protocol data!');
    console.log('='.repeat(50));
    console.log('Press Ctrl+C to stop the server');
});