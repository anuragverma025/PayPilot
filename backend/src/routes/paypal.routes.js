import { Router } from 'express';
import {
  getPayPalConfig,
  createOrder,
  captureOrder,
  cancelOrder
} from '../controllers/paypal.controller.js';

const router = Router();

router.get('/config', getPayPalConfig);
router.post('/create-order', createOrder);
router.post('/capture-order', captureOrder);
router.post('/cancel-order', cancelOrder);

export default router;
