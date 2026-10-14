const en = {
  title: 'Search ExAI', label: 'Search this site', placeholder: 'Try Rewind, Cursor, or a project name', button: 'Search',
  scope: 'Search extracurricular.ai · Articles in all languages, plus pages and software in your current language.',
  intro: 'A small search engine for a curious community. Find an article, discover a tool, or get involved.',
  addressHint: 'Enter keywords to search this site, or an HTTPS website address.',
  loading: 'Searching this site…', count: '{count} results for “{query}”', empty: 'No matches. Try fewer words, a project name, or another language.',
  failed: 'The search index could not be loaded. Check your connection and try again.', prompt: 'Enter a few words to explore this site.',
  page: 'Page', project: 'Software', article: 'Article', invalid: 'Enter search keywords or an HTTPS website address without a username or password.',
};
export const searchCopy: Record<string, typeof en> = {
  en,
  zh: {
    title: '搜索 ExAI', label: '搜索本站', placeholder: '试试「回退」、Cursor 或软件名称', button: '搜索',
    scope: '仅搜索 extracurricular.ai · 包含各语言文章，以及当前语言的页面与软件介绍。',
    intro: '给好奇心准备的小小搜索引擎。找一篇文章，发现一个工具，或认识这个社区。',
    addressHint: '输入关键词搜索本站，或输入 HTTPS 网站地址。',
    loading: '正在搜索本站……', count: '“{query}”的搜索结果：{count} 条', empty: '没有找到匹配内容。试试减少关键词、输入软件名称，或换一种语言。',
    failed: '暂时无法加载搜索内容。请检查网络后重试。', prompt: '输入几个关键词，探索本站内容。',
    page: '页面', project: '软件', article: '文章', invalid: '请输入搜索关键词或 HTTPS 网站地址，网址不能包含用户名或密码。',
  },
  es: {
    title: 'Buscar en ExAI', label: 'Buscar en este sitio', placeholder: 'Prueba Rewind, Cursor o el nombre de un proyecto', button: 'Buscar',
    scope: 'Solo extracurricular.ai · Artículos en todos los idiomas, páginas y programas en tu idioma actual.',
    intro: 'Un pequeño buscador para una comunidad curiosa. Encuentra un artículo, descubre una herramienta o participa.',
    addressHint: 'Introduce palabras para buscar en este sitio o una dirección HTTPS.',
    loading: 'Buscando en este sitio…', count: '{count} resultados para «{query}»', empty: 'Sin resultados. Prueba menos palabras, un nombre de proyecto u otro idioma.',
    failed: 'No se pudo cargar el índice. Comprueba la conexión e inténtalo de nuevo.', prompt: 'Introduce palabras para explorar este sitio.',
    page: 'Página', project: 'Programa', article: 'Artículo', invalid: 'Introduce palabras de búsqueda o una dirección HTTPS sin nombre de usuario ni contraseña.',
  },
  fr: {
    title: 'Rechercher dans ExAI', label: 'Rechercher sur ce site', placeholder: 'Essayez Rewind, Cursor ou un nom de projet', button: 'Rechercher',
    scope: 'Uniquement extracurricular.ai · Articles dans toutes les langues, pages et logiciels dans votre langue actuelle.',
    intro: 'Un petit moteur de recherche pour une communauté curieuse. Trouvez un article, découvrez un outil ou participez.',
    addressHint: 'Saisissez des mots pour rechercher sur ce site ou une adresse HTTPS.',
    loading: 'Recherche sur ce site…', count: '{count} résultats pour « {query} »', empty: 'Aucun résultat. Essayez moins de mots, un nom de projet ou une autre langue.',
    failed: 'Impossible de charger l’index. Vérifiez votre connexion et réessayez.', prompt: 'Saisissez quelques mots pour explorer ce site.',
    page: 'Page', project: 'Logiciel', article: 'Article', invalid: 'Saisissez des mots de recherche ou une adresse HTTPS sans identifiant ni mot de passe.',
  },
};
export type SearchCopy = typeof en;
