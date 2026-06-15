export interface ContentMeta {
	type: 'file' | 'directory';
	name: string;
	slug: string;
	path: string;
	frontmatter?: Record<string, unknown>;
}

export interface ContentItem {
	frontmatter: Record<string, unknown>;
	body: string;
	slug: string;
}
