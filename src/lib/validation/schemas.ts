import { z } from 'zod';

/** Homepage destination directory cards (src/data/home-destinations.json). */
export const HomeDestinationSchema = z.object({
  href: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  label: z.string().min(1),
  art: z.string().min(1),
  featured: z.boolean(),
  linkText: z.string().optional(),
});
