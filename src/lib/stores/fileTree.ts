import { writable, derived, get } from 'svelte/store';
import type { TreeNode } from '$lib/server/types';
import { flattenTree } from '$lib/tree-utils';
import { editorStore } from './editor';

export interface FileTreeState {
	tree: TreeNode[];
	assetTree: TreeNode[];
	archetypeTree: TreeNode[];
	configTree: TreeNode[];
	siteTree: TreeNode[];
	archetypes: { name: string; label: string }[];
}

const initialState: FileTreeState = {
	tree: [],
	assetTree: [],
	archetypeTree: [],
	configTree: [],
	siteTree: [],
	archetypes: [],
};

function create() {
	const store = writable<FileTreeState>(initialState);
	const { subscribe, set, update } = store;

	return {
		subscribe,

		tree: derived(store, s => s.tree),
		assetTree: derived(store, s => s.assetTree),
		archetypeTree: derived(store, s => s.archetypeTree),
		configTree: derived(store, s => s.configTree),
		siteTree: derived(store, s => s.siteTree),
		archetypes: derived(store, s => s.archetypes),

		directories: derived(store, s =>
			s.tree.filter(n => n.type === 'directory').map(n => ({ slug: n.slug, name: n.name }))
		),

		searchEntries: derived(store, s =>
			flattenTree(s.tree).map(n => ({
				slug: n.slug,
				title: (n.frontmatter?.title as string) || n.name.replace(/\.md$/, ''),
				type: n.type as 'file' | 'directory',
			}))
		),

		async loadTree() {
			const res = await fetch('/api/content?tree=true');
			const tree = await res.json() as TreeNode[];
			update(state => ({ ...state, tree }));
		},

		async loadAssetTree() {
			try {
				const res = await fetch('/api/assets?tree=true');
				const assetTree = await res.json() as TreeNode[];
				update(state => ({ ...state, assetTree }));
			} catch { /* ignore */ }
		},

		async loadArchetypes() {
			try {
				const [flatRes, treeRes] = await Promise.all([
					fetch('/api/archetypes'),
					fetch('/api/archetypes?tree=true'),
				]);
				const archetypes = await flatRes.json() as { name: string; label: string }[];
				const archetypeTree = await treeRes.json() as TreeNode[];
				update(state => ({ ...state, archetypes, archetypeTree }));
			} catch {
				update(state => ({ ...state, archetypes: [], archetypeTree: [] }));
			}
		},

		async loadConfigTree() {
			try {
				const res = await fetch('/api/config?tree=true');
				const configTree = await res.json() as TreeNode[];
				update(state => ({ ...state, configTree }));
			} catch {
				update(state => ({ ...state, configTree: [] }));
			}
		},

		async loadSiteTree() {
			try {
				const res = await fetch('/api/site');
				const siteTree = await res.json() as TreeNode[];
				update(state => ({ ...state, siteTree }));
			} catch {
				update(state => ({ ...state, siteTree: [] }));
			}
		},

		updateTreeFrontmatter(slug: string, fm: Record<string, unknown>) {
			update(state => ({
				...state,
				tree: (function visit(nodes: TreeNode[]): TreeNode[] {
					return nodes.map(n => {
						if (n.slug === slug && n.type === 'file') {
							return { ...n, frontmatter: { ...n.frontmatter, ...fm } };
						}
						if (n.children) return { ...n, children: visit(n.children) };
						return n;
					});
				})(state.tree)
			}));
		},
	};
}

export const fileTreeStore = create();
