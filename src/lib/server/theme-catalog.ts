export interface ThemeCatalogEntry {
	id: string;
	name: string;
	repo: string;
	description: string;
	previewUrl?: string;
	tags: string[];
	minHugoVersion?: string;
	/** Shortcodes fournis par ce thème, pour détection de conflit avant installation. */
	providedShortcodes: string[];
}

/**
 * Catalogue statique de thèmes Hugo pré-testés.
 *
 * Chaque thème est ajouté après vérification manuelle de la compatibilité
 * avec les shortcodes custom du projet cible.
 * Ne JAMAIS ajouter un thème sans l'avoir testé avec `hugo server --themesDir ...`
 * sur un site équipé des vrais shortcodes.
 */
export const THEME_CATALOG: ThemeCatalogEntry[] = [
	{
		id: 'hugo-coder',
		name: 'Hugo Coder',
		repo: 'https://github.com/luizdepra/hugo-coder',
		description: 'A simple and clean blog theme with a minimal sidebar.',
		previewUrl: 'https://raw.githubusercontent.com/luizdepra/hugo-coder/main/images/screenshot.png',
		tags: ['blog', 'minimal', 'responsive'],
		minHugoVersion: '0.128.0',
		providedShortcodes: [],
	},
	{
		id: 'hugo-paper',
		name: 'Paper',
		repo: 'https://github.com/nanxiaobei/hugo-paper',
		description: 'A simple, clean, flexible Hugo theme, ported from Hexo Paper.',
		previewUrl: 'https://raw.githubusercontent.com/nanxiaobei/hugo-paper/main/images/screenshot.png',
		tags: ['blog', 'minimal', 'card'],
		providedShortcodes: [],
	},
	{
		id: 'hugo-theme-stack',
		name: 'Stack',
		repo: 'https://github.com/CaiJimmy/hugo-theme-stack',
		description: 'A modern, feature-rich card-based blog theme with multiple layouts.',
		previewUrl: 'https://raw.githubusercontent.com/CaiJimmy/hugo-theme-stack/main/images/screenshot.png',
		tags: ['blog', 'card', 'modern', 'multi-language'],
		minHugoVersion: '0.128.0',
		providedShortcodes: [],
	},
	{
		id: 'ananke',
		name: 'Ananke',
		repo: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
		description: 'A comprehensive theme with social integration, a11y, and localization.',
		previewUrl: 'https://raw.githubusercontent.com/theNewDynamic/gohugo-theme-ananke/master/images/screenshot.png',
		tags: ['blog', 'business', 'a11y', 'i18n'],
		minHugoVersion: '0.120.0',
		providedShortcodes: [],
	},
	{
		id: 'hugo-theme-terminal',
		name: 'Terminal',
		repo: 'https://github.com/panr/hugo-theme-terminal',
		description: 'A simple, retro terminal-inspired theme with monospace feel.',
		previewUrl: 'https://raw.githubusercontent.com/panr/hugo-theme-terminal/main/images/screenshot.png',
		tags: ['blog', 'terminal', 'retro', 'minimal'],
		minHugoVersion: '0.121.0',
		providedShortcodes: [],
	},
	{
		id: 'blowfish',
		name: 'Blowfish',
		repo: 'https://github.com/nunocoracao/blowfish',
		description: 'A powerful, lightweight theme with Tailwind CSS. Supports multiple content types, diagrams, and advanced shortcodes.',
		previewUrl: 'https://raw.githubusercontent.com/nunocoracao/blowfish/main/images/screenshot.png',
		tags: ['blog', 'portfolio', 'tailwind', 'docs', 'multi-language'],
		minHugoVersion: '0.130.0',
		providedShortcodes: [
			'alert', 'article', 'badge', 'button', 'card', 'chart',
			'codeimporter', 'compare', 'crosstab', 'details', 'dimsum',
			'diagram', 'echarts', 'figure', 'gallery', 'gitlab',
			'icon', 'img', 'import', 'include', 'item', 'karaoke',
			'keyword', 'lead', 'list', 'lottie', 'mermaid',
			'pdf', 'people', 'pill', 'pirati', 'qrcode', 'quote',
			'recipe', 'redirect', 'screenshot', 'section',
			'shepherd', 'step', 'swiper', 'tabs', 'taglist',
			'timeline', 'typeit', 'video', 'vimeo', 'youtube',
		],
	},
	{
		id: 'hugo-book',
		name: 'Hugo Book',
		repo: 'https://github.com/alex-shpak/hugo-book',
		description: 'Documentation-oriented theme with sidebar navigation, search, and multi-level menus.',
		previewUrl: 'https://raw.githubusercontent.com/alex-shpak/hugo-book/main/images/screenshot.png',
		tags: ['docs', 'book', 'sidebar', 'search'],
		providedShortcodes: [
			'columns', 'details', 'expand', 'hint', 'katex',
			'button', 'mermaid', 'tabs',
		],
	},
	{
		id: 'hugo-clarity',
		name: 'Clarity',
		repo: 'https://github.com/chipzoller/hugo-clarity',
		description: 'A technology-minded blog theme with dark mode, diagrams, and rich shortcodes.',
		previewUrl: 'https://raw.githubusercontent.com/chipzoller/hugo-clarity/master/images/screenshot.png',
		tags: ['blog', 'tech', 'dark-mode', 'docs'],
		minHugoVersion: '0.121.0',
		providedShortcodes: [
			'alert', 'attachments', 'badge', 'button', 'cookieless',
			'details', 'expand', 'icon', 'img', 'include',
			'mermaid', 'notice', 'quote', 'tabs', 'youtube',
		],
	},
	{
		id: 'hugo-theme-m10c',
		name: 'M10C',
		repo: 'https://github.com/vaga/hugo-theme-m10c',
		description: 'A minimal, monospace, responsive blog theme inspired by the 80s.',
		previewUrl: 'https://raw.githubusercontent.com/vaga/hugo-theme-m10c/main/images/screenshot.png',
		tags: ['blog', 'minimal', 'monospace', 'retro'],
		providedShortcodes: [],
	},
	{
		id: 'mainroad',
		name: 'Mainroad',
		repo: 'https://github.com/Vimux/Mainroad',
		description: 'A responsive, clean, minimalist blog theme with widget sidebar.',
		previewUrl: 'https://raw.githubusercontent.com/Vimux/Mainroad/master/images/screenshot.png',
		tags: ['blog', 'minimal', 'widgets', 'responsive'],
		providedShortcodes: [],
	},
];
