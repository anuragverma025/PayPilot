import { ComparisonService } from '../services/comparison.service.js';
import { compareRequestSchema } from '../validators/product.validator.js';

export const compareProducts = async (req, res, next) => {
  try {
    const { productIds } = compareRequestSchema.parse(req.body);
    const comparisonResult = await ComparisonService.compareProducts(productIds);

    res.status(200).json({
      success: true,
      data: comparisonResult
    });
  } catch (error) {
    next(error);
  }
};
