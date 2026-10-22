import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly search for backend/.env first, then root .env, then process.cwd()
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const cleanEnv = (val, defaultVal = '') => {
  if (!val) return defaultVal;
  return val.trim().replace(/^["']|["']$/g, '');
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paypilot',
  ai: {
    provider: cleanEnv(process.env.AI_PROVIDER, 'gemini'),
    apiKey: cleanEnv(process.env.AI_API_KEY, ''),
    model: cleanEnv(process.env.AI_MODEL, 'gemini-3-flash-preview')
  },
  paypal: {
    mode: cleanEnv(process.env.PAYPAL_MODE, 'sandbox'),
    baseUrl: cleanEnv(process.env.PAYPAL_BASE_URL, 'https://api-m.sandbox.paypal.com'),
    clientId: cleanEnv(process.env.PAYPAL_CLIENT_ID, ''),
    clientSecret: cleanEnv(process.env.PAYPAL_CLIENT_SECRET, ''),
    currency: cleanEnv(process.env.PAYPAL_CURRENCY, 'USD')
  }
};
