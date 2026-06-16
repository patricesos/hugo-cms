<script lang="ts">
	import { FileText, RefreshCw, FilePlus, Search, PanelLeftClose, Map, FolderPlus, Image } from '@lucide/svelte';
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
		assetTree = [] as TreeNodeData[],
		currentSlug = '',
		sidebarView = 'content',
		onLoadFile,
		onRefresh,
		onCreateFile,
		onCreateFolder,
		onCreateFileInFolder,
		onCreateFolderInFolder,
		onDeleteFile,
		onDeleteFolder,
		onSearch,
		onToggle,
		onRenameFile,
		onDuplicateFile,
		onToggleSitemap,
		onSelectAsset,
		onViewChange,
	}: {
		tree: TreeNodeData[];
		assetTree: TreeNodeData[];
		currentSlug: string | null;
		sidebarView?: 'content' | 'static';
		onLoadFile: (slug: string) => void;
		onRefresh: () => void;
		onCreateFile?: () => void;
		onCreateFolder?: () => void;
		onCreateFileInFolder?: (slug: string) => void;
		onCreateFolderInFolder?: (slug: string) => void;
		onDeleteFile?: (slug: string) => void;
		onDeleteFolder?: (slug: string) => void;
		onSearch?: () => void;
		onToggle?: () => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onToggleSitemap?: () => void;
		onSelectAsset?: (path: string) => void;
		onViewChange?: (view: 'content' | 'static') => void;
	} = $props();

	function setView(view: 'content' | 'static') {
		onViewChange?.(view);
	}
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
			{#if sidebarView === 'content' && onCreateFile}
				<button class="icon-btn" onclick={onCreateFile} title="Nouveau fichier">
					<FilePlus size={16} />
				</button>
			{/if}
			{#if sidebarView === 'content' && onCreateFolder}
				<button class="icon-btn" onclick={onCreateFolder} title="Nouveau dossier">
					<FolderPlus size={16} />
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

	<div class="view-tabs">
		<button class="view-tab" class:active={sidebarView === 'content'} onclick={() => setView('content')}>
			<FileText size={14} />
			<span>Content</span>
		</button>
		<button class="view-tab" class:active={sidebarView === 'static'} onclick={() => setView('static')}>
			<Image size={14} />
			<span>Static</span>
		</button>
	</div>

	<nav class="file-tree">
		{#if sidebarView === 'content'}
			{#each tree as node}
				<TreeNode {node} depth={0} {currentSlug} {onLoadFile} {onDeleteFile} {onDeleteFolder} {onRenameFile} {onDuplicateFile} {onCreateFileInFolder} {onCreateFolderInFolder} />
			{/each}
		{:else}
			{#each assetTree as node}
				<TreeNode {node} depth={0} currentSlug="" onLoadFile={(slug) => onSelectAsset?.(slug)} />
			{/each}
		{/if}
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
		flex-shrink: 0;
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
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-muted);
		transition: all 0.12s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.view-tabs {
		display: flex;
		gap: 2px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--c-border);
		flex-shrink: 0;
	}

	.view-tab {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		font-weight: 500;
		color: var(--c-text-muted);
		font-family: inherit;
		transition: all 0.12s;
		flex: 1;
		justify-content: center;
	}

	.view-tab:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.view-tab.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.file-tree {
		display: flex;
		flex-direction: column;
		padding: 6px 0 6px 16px;
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}
</style>
