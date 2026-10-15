import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { locales, localizedPath } from '../i18n/index';

export const prerender = true;

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}[char]!));

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('https://extracurricular.ai');
  // Keep these shared routes aligned with the localized page templates.
  // Root-level English aliases are omitted in favor of their canonical URLs.
  const sharedPaths = ['/', '/about/', '/blog/', '/projects/', '/get-involved/'];
  const paths = locales.flatMap((locale) => sharedPaths.map((path) => localizedPath(path, locale)));
  const modifiedDates = new Map<string, string>();
  for (const post of await getCollection('blog')) {
    // Match [locale]/blog/[slug].astro's actual route construction.
    const slug = post.id.split('/').pop()?.replace(/\.md$/, '') ?? post.id;
    const path = localizedPath(`/blog/${slug}/`, post.data.locale);
    paths.push(path);
    modifiedDates.set(path, (post.data.updatedDate ?? post.data.pubDate).toISOString());
  }
  const entries = [...new Set(paths)].sort().map((path) =>
    `  <url><loc>${escapeXml(new URL(path, origin).href)}</loc>${modifiedDates.has(path) ? `<lastmod>${modifiedDates.get(path)}</lastmod>` : ''}</url>`
  );
  // No synthetic lastmod: rebuild time is not the time content was changed.
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
