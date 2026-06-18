export interface TreeNodeData {
	type: 'file' | 'directory';
	name: string;
	slug: string;
	path: string;
	children?: TreeNodeData[];
	frontmatter?: Record<string, unknown>;
}
