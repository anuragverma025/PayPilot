import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getCatalogMeta,
  rankProducts
} from '../controllers/product.controller.js';

const router = Router();

router.get('/', getProducts);
router.get('/meta', getCatalogMeta);
router.post('/rank', rankProducts);
router.get('/:id', getProductById);

export default router;
