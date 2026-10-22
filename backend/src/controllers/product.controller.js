import { CatalogService } from '../services/catalog.service.js';
import { RankingService } from '../services/ranking.service.js';
import { getProductsQuerySchema, rankRequestSchema } from '../validators/product.validator.js';

export const getProducts = async (req, res, next) => {
  try {
    const validatedQuery = getProductsQuerySchema.parse(req.query);
    const products = await CatalogService.getProducts(validatedQuery);
    const meta = await CatalogService.getCatalogMeta();

    res.status(200).json({
      success: true,
      count: products.length,
      totalCatalog: meta.totalProducts,
      isSampleData: true,
      sampleDataNotice: meta.sampleDataNotice,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await CatalogService.getProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Product with ID '${id}' was not found in the catalog.`
        }
      });
    }

    res.status(200).json({
      success: true,
      isSampleData: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const getCatalogMeta = async (req, res, next) => {
  try {
    const meta = await CatalogService.getCatalogMeta();
    res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    next(error);
  }
};

export const rankProducts = async (req, res, next) => {
  try {
    const requirements = rankRequestSchema.parse(req.body);
    const products = await CatalogService.getProducts({});
    const ranked = RankingService.rankProducts(products, requirements);

    res.status(200).json({
      success: true,
      count: ranked.length,
      requirementsApplied: requirements,
      isDeterministic: true,
      data: ranked
    });
  } catch (error) {
    next(error);
  }
};
