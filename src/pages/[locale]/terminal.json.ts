import type { APIRoute } from 'astro';
import { locales, type Locale } from '../../i18n/index';
import { terminalFiles } from '../../lib/terminal-files';

export const prerender = true;
export function getStaticPaths() { return locales.map(locale => ({ params: { locale } })); }

// Keep article bodies out of every page's island props. Fetch only on opening
// the terminal; the endpoint is still a static file on GitHub Pages.
export const GET: APIRoute = async ({ params }) => new Response(
  JSON.stringify(await terminalFiles(params.locale as Locale)),
  { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
);
