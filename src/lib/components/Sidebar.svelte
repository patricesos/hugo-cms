<script lang="ts">
	import { FileText, RefreshCw, FilePlus } from '@lucide/svelte';
	import TreeNode from './TreeNode.svelte';

	interface TreeNodeData {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNodeData[];
		frontmatter?: Record<string, unknown>;
	}

	let {
		tree = [] as TreeNodeData[],
		currentSlug = '',
		onLoadFile,
		onRefresh,
		onCreateFile,
	}: {
		tree: TreeNodeData[];
		currentSlug: string | null;
		onLoadFile: (slug: string) => void;
		onRefresh: () => void;
		onCreateFile?: () => void;
	} = $props();
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<div class="sidebar-brand">
			<FileText size={18} color="var(--c-primary)" />
			<h2>Hugo CMS</h2>
		</div>
		<div class="header-actions">
			{#if onCreateFile}
				<button class="icon-btn" onclick={onCreateFile} title="Nouveau fichier">
					<FilePlus size={16} />
				</button>
			{/if}
			<button class="icon-btn" onclick={onRefresh} title="Rafraîchir">
				<RefreshCw size={16} />
			</button>
		</div>
	</div>

	<nav class="file-tree">
		{#each tree as node}
			<TreeNode {node} depth={0} {currentSlug} {onLoadFile} />
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		width: 280px;
		min-width: 280px;
		border-right: 1px solid var(--c-border);
		background: var(--c-bg-sidebar);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.sidebar-brand h2 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		cursor: pointer;
		color: var(--c-text-secondary);
		transition: all 0.15s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.file-tree {
		display: flex;
		flex-direction: column;
		padding: 6px 0;
		flex: 1;
	}
</style>
