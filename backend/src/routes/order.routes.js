import { Router } from 'express';
import { createOrderDraft, getOrder, getOrders } from '../controllers/order.controller.js';

const router = Router();

router.get('/', getOrders);
router.post('/draft', createOrderDraft);
router.get('/:id', getOrder);

export default router;
