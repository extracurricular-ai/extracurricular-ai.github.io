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
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageWidth: z.number().int().positive().default(1672),
    imageHeight: z.number().int().positive().default(941),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
