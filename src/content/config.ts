import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('ExAI Team'),
    tags: z.array(z.string()).default([]),
    locale: z.enum(['en', 'zh', 'es', 'fr']).default('en'),
    slug: z.string().optional(),
  }),
});

export const collections = { blog };
