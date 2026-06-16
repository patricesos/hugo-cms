export interface ContentMeta {
	type: 'file' | 'directory';
	name: string;
	slug: string;
	path: string;
	frontmatter?: Record<string, unknown>;
	children?: TreeNode[];
}

export interface TreeNode extends ContentMeta {
	children: TreeNode[];
}

export interface ContentItem {
	frontmatter: Record<string, unknown>;
	body: string;
	slug: string;
	mtimeMs: number;
}
