import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import productRoutes from './product.routes.js';
import comparisonRoutes from './comparison.routes.js';
import assistantRoutes from './assistant.routes.js';

const router = Router();

router.get('/health', getHealth);
router.use('/products', productRoutes);
router.use('/compare', comparisonRoutes);
router.use('/assistant', assistantRoutes);

export default router;
