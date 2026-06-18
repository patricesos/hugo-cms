import { writable, derived, get } from 'svelte/store';
import type { TreeNode } from '$lib/server/types';
import { editorStore } from './editor.svelte';

export interface FileTreeState {
	tree: TreeNode[];
	assetTree: TreeNode[];
	archetypeTree: TreeNode[];
	configTree: TreeNode[];
	archetypes: { name: string; label: string }[];
}

const initialState: FileTreeState = {
	tree: [],
	assetTree: [],
	archetypeTree: [],
	configTree: [],
	archetypes: [],
};

function create() {
	const store = writable<FileTreeState>(initialState);
	const { subscribe, set, update } = store;

	function flattenTreeImpl(nodes: TreeNode[]): TreeNode[] {
		const result: TreeNode[] = [];
		for (const n of nodes) {
			if (n.type === 'file') result.push(n);
			if (n.children) result.push(...flattenTreeImpl(n.children));
		}
		return result;
	}

	return {
		subscribe,

		tree: derived(store, s => s.tree),
		assetTree: derived(store, s => s.assetTree),
		archetypeTree: derived(store, s => s.archetypeTree),
		configTree: derived(store, s => s.configTree),
		archetypes: derived(store, s => s.archetypes),

		directories: derived(store, s =>
			s.tree.filter(n => n.type === 'directory').map(n => ({ slug: n.slug, name: n.name }))
		),

		searchEntries: derived(store, s =>
			flattenTreeImpl(s.tree).map(n => ({
				slug: n.slug,
				title: (n.frontmatter?.title as string) || n.name.replace(/\.md$/, ''),
				type: n.type as 'file' | 'directory',
			}))
		),

		async loadTree() {
			const res = await fetch('/api/content?tree=true');
			update(state => ({ ...state, tree: await res.json() }));
		},

		async loadAssetTree() {
			try {
				const res = await fetch('/api/assets?tree=true');
				update(state => ({ ...state, assetTree: await res.json() }));
			} catch { /* ignore */ }
		},

		async loadArchetypes() {
			try {
				const [flatRes, treeRes] = await Promise.all([
					fetch('/api/archetypes'),
					fetch('/api/archetypes?tree=true'),
				]);
				update(state => ({
					...state,
					archetypes: await flatRes.json(),
					archetypeTree: await treeRes.json(),
				}));
			} catch {
				update(state => ({ ...state, archetypes: [], archetypeTree: [] }));
			}
		},

		async loadConfigTree() {
			try {
				const res = await fetch('/api/config?tree=true');
				update(state => ({ ...state, configTree: await res.json() }));
			} catch {
				update(state => ({ ...state, configTree: [] }));
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
