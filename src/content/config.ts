import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('ExAI Team'),
    tags: z.array(z.string()).default([]),
    locale: z.enum(['en', 'zh', 'es', 'fr']).default('en'),
    slug: z.string().optional(),
    image: image().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
  }).refine(data => !data.updatedDate || data.updatedDate >= data.pubDate, {
    message: 'updatedDate must not precede pubDate', path: ['updatedDate'],
  }),
});

export const collections = { blog };
