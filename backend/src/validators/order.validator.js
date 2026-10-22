import { z } from 'zod';

export const createOrderDraftSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required.' }).min(1, 'Product ID cannot be empty.'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1.').max(10, 'Maximum quantity is 10.').default(1),
  buyer: z
    .object({
      name: z.string().optional(),
      email: z.string().email('Please provide a valid email address.').optional().or(z.literal('')),
      notes: z.string().optional()
    })
    .optional(),
  approvalConfirmed: z.boolean().optional().default(false),
  currency: z.enum(['USD', 'INR']).optional()
});

export const createPayPalOrderSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string({ required_error: 'Product ID is required.' }).min(1, 'Product ID cannot be empty.'),
  quantity: z.number().int().min(1).max(10).default(1),
  buyer: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      notes: z.string().optional()
    })
    .optional(),
  approvalConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Explicit buyer approval is required to create a PayPal Sandbox order.' })
  }),
  currency: z.enum(['USD', 'INR']).optional()
});

export const capturePayPalOrderSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required.' }).min(1),
  paypalOrderId: z.string({ required_error: 'PayPal Order ID is required.' }).min(1)
});

export const cancelPayPalOrderSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required.' }).min(1),
  paypalOrderId: z.string().optional(),
  reason: z.string().optional()
});
