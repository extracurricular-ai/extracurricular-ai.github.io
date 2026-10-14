export interface SearchDocument {
  title: string;
  description: string;
  text: string;
  href: string;
  kind: 'page' | 'project' | 'article';
  locale: string;
}

export function plainText(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^ {0,3}(?:`{3,}|~{3,})[^\n]*$/gm, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#*`|>~]/g, ' ').replace(/\s+/g, ' ').trim();
}

const normalize = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

/** All terms must match; titles and summaries rank above matches in article text. */
export function searchSite(documents: SearchDocument[], query: string, locale: string): SearchDocument[] {
  const phrase = normalize(query.trim().slice(0, 200));
  const terms = [...new Set(phrase.split(/\s+/).filter(Boolean))].slice(0, 12);
  if (!terms.length) return [];
  return documents.map(document => {
    const title = normalize(document.title);
    const summary = normalize(document.description);
    const text = normalize(document.text);
    if (!terms.every(term => `${title} ${summary} ${text}`.includes(term))) return { document, score: 0 };
    const score = 1 + (document.locale === locale ? 3 : 0) + (title.includes(phrase) ? 20 : 0)
      + terms.reduce((total, term) => total + (title.includes(term) ? 8 : summary.includes(term) ? 4 : 1), 0);
    return { document, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score)
    .map(result => result.document);
}
