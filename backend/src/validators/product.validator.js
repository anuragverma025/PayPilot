import { z } from 'zod';

export const getProductsQuerySchema = z.object({
  search: z.string().optional().default(''),
  minBudget: z.coerce.number().nonnegative().optional(),
  maxBudget: z.coerce.number().positive().optional(),
  minRam: z.coerce.number().positive().optional(),
  brand: z.string().optional(),
  gpuType: z.enum(['dedicated', 'integrated', 'any']).optional().default('any'),
  upgradableOnly: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  audience: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'ram_desc', 'weight_asc', 'battery_desc']).optional().default('price_asc')
});

export const compareRequestSchema = z.object({
  productIds: z
    .array(
      z.union([
        z.string().min(1, 'Product ID cannot be empty'),
        z.object({ id: z.string().min(1) }).transform((obj) => obj.id)
      ])
    )
    .min(2, 'At least 2 products are required for comparison')
    .max(3, 'At most 3 products can be compared simultaneously')
});

export const rankRequestSchema = z.object({
  maxBudget: z.number().positive().optional().default(100000),
  minRam: z.number().positive().optional().default(16),
  prioritizeBattery: z.boolean().optional().default(false),
  prioritizePortability: z.boolean().optional().default(false),
  prioritizeGpu: z.boolean().optional().default(false),
  prioritizeUpgradability: z.boolean().optional().default(false),
  targetUseCase: z.enum(['coding', 'ai-ml', 'college', 'everyday']).optional().default('coding')
});
