import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(30),
  VITE_DEFAULT_TAX_PERCENTAGE: z.coerce.number().default(13),
});

export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:1234',
  VITE_IDLE_TIMEOUT_MINUTES: import.meta.env.VITE_IDLE_TIMEOUT_MINUTES || 30,
  VITE_DEFAULT_TAX_PERCENTAGE: import.meta.env.VITE_DEFAULT_TAX_PERCENTAGE || 13,
});
