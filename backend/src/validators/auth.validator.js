import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().email('Invalid email address').max(100),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const claimGuestOrdersSchema = z.object({
  guestToken: z.string().trim().min(16, 'Valid guest token is required to claim orders')
});

