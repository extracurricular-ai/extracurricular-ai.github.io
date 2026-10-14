import { getCollection } from 'astro:content';
import { terminalCopy } from '../components/terminal-copy';
import type { TerminalFile } from './terminal';
import { fetchProjects, localize } from './github';
import { t, localizedPath, type Locale } from '../i18n/index';
export async function terminalFiles(locale: Locale): Promise<TerminalFile[]> {
const [projects, allPosts] = await Promise.all([fetchProjects(), getCollection('blog')]);
const copy = terminalCopy[locale];
const posts = allPosts.filter((post) => post.data.locale === locale)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
const files: TerminalFile[] = [
  { path: '/', title: 'ExAI', body: '', directory: true, href: localizedPath('/', locale) },
  { path: '/blog', title: t(locale, 'nav.blog'), body: '', directory: true, href: localizedPath('/blog', locale) },
  { path: '/projects', title: t(locale, 'nav.projects'), body: '', directory: true, href: localizedPath('/projects', locale) },
  { path: '/about', title: t(locale, 'nav.about'), body: '', directory: true, href: localizedPath('/about', locale) },
  { path: '/get-involved', title: t(locale, 'nav.getInvolved'), body: '', directory: true, href: localizedPath('/get-involved', locale) },
  { path: '/games', title: copy.arcade, body: '', directory: true },
  { path: '/README.md', title: 'Hello, world.', body: `# Extracurricular AI\n\n${t(locale, 'home.heroSubtitle')}\n\n${copy.hint}\n\nls blog/\nls projects/\nplay invaders`, href: localizedPath('/about', locale) },
  { path: '/about/README.md', title: t(locale, 'nav.about'), body: `${t(locale, 'about.heroSubtitle')}\n\n${t(locale, 'about.originP1')}\n\n${t(locale, 'about.originP2')}\n\n${t(locale, 'about.originP3')}`, href: localizedPath('/about', locale) },
  { path: '/get-involved/README.md', title: t(locale, 'nav.getInvolved'), body: `${t(locale, 'getInvolved.heroSubtitle')}\n\n${t(locale, 'getInvolved.card1Title')}\n${t(locale, 'getInvolved.card1Body')}\n\n${t(locale, 'getInvolved.card2Title')}\n${t(locale, 'getInvolved.card2Body')}\n\n${t(locale, 'getInvolved.card3Title')}\n${t(locale, 'getInvolved.card3Body')}`, href: localizedPath('/get-involved', locale) },
  { path: '/games/invaders', title: copy.arcade, body: `${copy.gameIntro}\n\n${copy.manuals.play}\n${copy.gameHint}` },
  { path: '/.secret', title: 'psst…', body: copy.secret },
  ...posts.map((post) => {
    const slug = post.id.split('/').pop()!.replace(/\.md$/, '');
    return { path: `/blog/${slug}.md`, title: post.data.title, body: `# ${post.data.title}\n${post.data.pubDate.toISOString().slice(0, 10)} · ${post.data.author}\n\n${post.body}`, href: localizedPath(`/blog/${slug}`, post.data.locale) };
  }),
  ...projects.map((project) => {
    const localized = localize(project, locale);
    return { path: `/projects/${project.slug}.md`, title: localized.name, body: `# ${localized.name}\n\n${localized.description}\n\n${project.topics.join(' · ')}\n${project.href}`, href: project.href };
  }),
];
return files;
}
