import { Router } from 'express';
import {
  createOrderDraft,
  getOrder,
  getOrders,
  hideOrder,
  claimGuestOrders
} from '../controllers/order.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(optionalAuth);

router.get('/', getOrders);
router.post('/draft', createOrderDraft);
router.post('/claim', requireAuth, claimGuestOrders);
router.patch('/:id/hide', hideOrder);
router.get('/:id', getOrder);

export default router;
