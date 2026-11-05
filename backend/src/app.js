import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-token']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (sanitized, no secrets)
app.use((req, res, next) => {
  if (config.env !== 'test') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
  }
  next();
});

// API Routes
app.use('/api', routes);

// Serve static images and assets from frontend/public and frontend/dist
app.use(express.static(path.resolve(__dirname, '../../frontend/public')));
app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));

// 404 Route Catch-all
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested endpoint '${req.originalUrl}' does not exist on PayPilot API.`
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
