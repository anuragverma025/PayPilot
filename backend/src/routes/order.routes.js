import { Router } from 'express';
import { createOrderDraft, getOrder } from '../controllers/order.controller.js';

const router = Router();

router.post('/draft', createOrderDraft);
router.get('/:id', getOrder);

export default router;
