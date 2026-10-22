import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import productRoutes from './product.routes.js';
import comparisonRoutes from './comparison.routes.js';
import assistantRoutes from './assistant.routes.js';
import orderRoutes from './order.routes.js';
import paypalRoutes from './paypal.routes.js';

const router = Router();

router.get('/health', getHealth);
router.use('/products', productRoutes);
router.use('/compare', comparisonRoutes);
router.use('/assistant', assistantRoutes);
router.use('/orders', orderRoutes);
router.use('/paypal', paypalRoutes);

export default router;
