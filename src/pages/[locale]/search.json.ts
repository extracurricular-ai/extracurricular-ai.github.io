import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { locales, localizedPath, t, type Locale } from '../../i18n/index';
import { fetchProjects, localize } from '../../lib/github';
import { plainText, type SearchDocument } from '../../lib/site-search';

export const prerender = true;
export function getStaticPaths() { return locales.map(locale => ({ params: { locale } })); }

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale as Locale;
  const [posts, projects] = await Promise.all([getCollection('blog'), fetchProjects()]);
  const pages = [
    { path: '/', title: 'nav.home', keys: ['home.heroTitle', 'home.heroTitleAccent', 'home.heroSubtitle', 'home.valuesSubtitle'] },
    { path: '/projects', title: 'nav.projects', keys: ['projects.heroSubtitle', 'projects.contributeBody'] },
    { path: '/blog', title: 'nav.blog', keys: ['blog.heroSubtitle'] },
    { path: '/about', title: 'nav.about', keys: ['about.heroSubtitle', 'about.originP1', 'about.originP2', 'about.originP3'] },
    { path: '/get-involved', title: 'nav.getInvolved', keys: ['getInvolved.heroSubtitle', 'getInvolved.card1Body', 'getInvolved.card2Body', 'getInvolved.card3Body'] },
  ];
  const documents: SearchDocument[] = [
    ...pages.map(page => ({ title: t(locale, page.title), description: t(locale, page.keys[0]), text: page.keys.map(key => t(locale, key)).join(' '), href: localizedPath(page.path, locale), kind: 'page' as const, locale })),
    ...projects.map(project => {
      const translated = localize(project, locale);
      return { title: translated.name, description: translated.description ?? '', text: `${project.slug} ${project.topics.join(' ')} ${project.language ?? ''}`, href: `${localizedPath('/projects', locale)}#project-${project.slug}`, kind: 'project' as const, locale };
    }),
    ...posts.map(post => ({
      title: post.data.title, description: post.data.description,
      text: `${post.data.tags.join(' ')} ${plainText(post.body ?? '')}`,
      href: localizedPath(`/blog/${post.id.split('/').pop()!.replace(/\.md$/, '')}`, post.data.locale),
      kind: 'article' as const, locale: post.data.locale,
    })),
  ];
  return new Response(JSON.stringify(documents), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
