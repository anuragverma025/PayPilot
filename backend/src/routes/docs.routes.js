import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, '../../docs/openapi.json');

const router = Router();

// Serve the raw OpenAPI 3.0 specification for APIMatic and tooling
router.get('/openapi.json', (req, res) => {
  if (fs.existsSync(openApiPath)) {
    res.setHeader('Content-Type', 'application/json');
    return res.sendFile(openApiPath);
  }
  return res.status(404).json({ success: false, error: 'OpenAPI specification not found' });
});

// Serve the interactive APIMatic / OpenAPI Documentation Portal
router.get('/', (req, res) => {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <title>PayPilot API Portal — APIMatic Edition</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; padding: 0; background-color: #0f172a; font-family: system-ui, sans-serif; }
      .apimatic-banner {
        background: linear-gradient(90deg, #635bff 0%, #4f46e5 100%);
        color: white;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 500;
      }
      .apimatic-badge {
        background: rgba(255,255,255,0.2);
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .apimatic-links a {
        color: white;
        text-decoration: underline;
        margin-left: 15px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="apimatic-banner">
      <div>
        <span class="apimatic-badge">APIMATIC VALIDATED</span>
        <strong style="margin-left: 8px;">PayPilot Agentic Commerce API</strong>
        <span style="opacity: 0.85; margin-left: 8px;">— OpenAPI 3.0 Specification ready for APIMatic SDK Generation</span>
      </div>
      <div class="apimatic-links">
        <a href="/api/docs/openapi.json" target="_blank">Raw openapi.json</a>
        <a href="/" target="_blank">Back to PayPilot App &rarr;</a>
      </div>
    </div>
    <script
      id="api-reference"
      data-url="/api/docs/openapi.json">
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
