import { z } from 'zod';

export const chatRequestSchema = z.object({
  message: z
    .string({ required_error: 'A message or shopping goal is required.' })
    .trim()
    .min(3, 'Shopping goal must be at least 3 characters long.')
    .max(1000, 'Shopping goal cannot exceed 1,000 characters.'),
  forceRecommend: z.boolean().optional()
});
