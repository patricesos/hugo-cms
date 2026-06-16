<script lang="ts">
	import { FileText, RefreshCw, FilePlus, Search, PanelLeftClose, Map } from '@lucide/svelte';
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
		onDeleteFile,
		onSearch,
		onToggle,
		onRenameFile,
		onDuplicateFile,
		onToggleSitemap,
	}: {
		tree: TreeNodeData[];
		currentSlug: string | null;
		onLoadFile: (slug: string) => void;
		onRefresh: () => void;
		onCreateFile?: () => void;
		onDeleteFile?: (slug: string) => void;
		onSearch?: () => void;
		onToggle?: () => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onToggleSitemap?: () => void;
	} = $props();
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<div class="sidebar-brand">
			<FileText size={18} color="var(--c-primary)" />
			<h2>Hugo CMS</h2>
		</div>
		<div class="header-actions">
			{#if onSearch}
				<button class="icon-btn" onclick={onSearch} title="Rechercher (Ctrl+P)">
					<Search size={16} />
				</button>
			{/if}
			{#if onCreateFile}
				<button class="icon-btn" onclick={onCreateFile} title="Nouveau fichier">
					<FilePlus size={16} />
				</button>
			{/if}
			<button class="icon-btn" onclick={onRefresh} title="Rafraîchir">
				<RefreshCw size={16} />
			</button>
			{#if onToggleSitemap}
				<button class="icon-btn" onclick={onToggleSitemap} title="Sitemap visuel">
					<Map size={16} />
				</button>
			{/if}
			{#if onToggle}
				<button class="icon-btn" onclick={onToggle} title="Réduire la sidebar">
					<PanelLeftClose size={16} />
				</button>
			{/if}
		</div>
	</div>

	<nav class="file-tree">
		{#each tree as node}
			<TreeNode {node} depth={0} {currentSlug} {onLoadFile} {onDeleteFile} {onRenameFile} {onDuplicateFile} />
		{/each}
	</nav>
</aside>

<style>
	.sidebar {
		width: 280px;
		min-width: 280px;
		height: 100%;
		border-right: 1px solid var(--c-border);
		background: var(--c-bg-sidebar);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.sidebar::-webkit-scrollbar {
		display: none;
	}

	.sidebar-header {
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		display: flex;
		flex-direction: column;
		gap: 10px;
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
		justify-content: center;
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
		padding: 6px 0 6px 16px;
		flex: 1;
	}
</style>
