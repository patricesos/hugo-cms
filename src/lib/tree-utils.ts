import type { TreeNode } from '$lib/server/types';

/** Aplatit recursivement un arbre de nœuds en une liste plate (fichiers seulement). */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
	const result: TreeNode[] = [];
	for (const n of nodes) {
		if (n.type === 'file') result.push(n);
		if (n.children) result.push(...flattenTree(n.children));
	}
	return result;
}
