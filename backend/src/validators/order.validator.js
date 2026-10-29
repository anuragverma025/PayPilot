import { z } from 'zod';

export const shippingAddressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name must be at least 2 characters.').max(300),
  addressLine1: z.string().min(3, 'Address line 1 is required.').max(300),
  addressLine2: z.string().max(300).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required.').max(120),
  state: z.string().min(1, 'State/region is required.').max(120),
  postalCode: z.string().min(1, 'Postal code is required.').max(20),
  countryCode: z.string().length(2, 'Country code must be exactly 2 characters (ISO 3166-1 alpha-2).').toUpperCase()
});

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
  shippingAddress: shippingAddressSchema.optional(),
  approvalConfirmed: z.boolean().optional().default(false),
  currency: z.enum(['USD', 'INR']).optional(),
  guestToken: z.string().min(16).max(128).optional()
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
  shippingAddress: shippingAddressSchema.optional(),
  approvalConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Explicit buyer approval is required to create a PayPal Sandbox order.' })
  }),
  currency: z.enum(['USD', 'INR']).optional(),
  guestToken: z.string().min(16).max(128).optional()
});

export const capturePayPalOrderSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required.' }).min(1),
  paypalOrderId: z.string({ required_error: 'PayPal Order ID is required.' }).min(1),
  guestToken: z.string().min(16).max(128).optional()
});

export const cancelPayPalOrderSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required.' }).min(1),
  paypalOrderId: z.string().optional(),
  reason: z.string().optional(),
  guestToken: z.string().min(16).max(128).optional()
});
