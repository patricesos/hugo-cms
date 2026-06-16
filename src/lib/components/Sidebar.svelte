<script lang="ts">
	import { Image, FileText, FileCode } from '@lucide/svelte';
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
		archetypeTree = [] as TreeNodeData[],
		currentSlug = '',
		sidebarView = 'content',
		onLoadFile,
		onCreateFileInFolder,
		onCreateFolderInFolder,
		onDeleteFile,
		onDeleteFolder,
		onRenameFile,
		onDuplicateFile,
		onSelectAsset,
		onSelectArchetype,
		onViewChange,
	}: {
		tree: TreeNodeData[];
		assetTree: TreeNodeData[];
		archetypeTree: TreeNodeData[];
		currentSlug: string | null;
		sidebarView?: 'content' | 'static' | 'archetypes';
		onLoadFile: (slug: string) => void;
		onCreateFileInFolder?: (slug: string) => void;
		onCreateFolderInFolder?: (slug: string) => void;
		onDeleteFile?: (slug: string) => void;
		onDeleteFolder?: (slug: string) => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onSelectAsset?: (path: string) => void;
		onSelectArchetype?: (slug: string) => void;
		onViewChange?: (view: 'content' | 'static' | 'archetypes') => void;
	} = $props();

	function setView(view: 'content' | 'static' | 'archetypes') {
		onViewChange?.(view);
	}
</script>

<aside class="sidebar">
	<div class="view-tabs">
		<button class="view-tab" class:active={sidebarView === 'content'} onclick={() => setView('content')}>
			<FileText size={14} />
			<span>Content</span>
		</button>
		<button class="view-tab" class:active={sidebarView === 'static'} onclick={() => setView('static')}>
			<Image size={14} />
			<span>Static</span>
		</button>
		<button class="view-tab" class:active={sidebarView === 'archetypes'} onclick={() => setView('archetypes')}>
			<FileCode size={14} />
			<span>Archétypes</span>
		</button>
	</div>

	<nav class="file-tree">
		{#if sidebarView === 'content'}
			{#each tree as node}
				<TreeNode {node} depth={0} {currentSlug} {onLoadFile} {onDeleteFile} {onDeleteFolder} {onRenameFile} {onDuplicateFile} {onCreateFileInFolder} {onCreateFolderInFolder} />
			{/each}
		{:else if sidebarView === 'static'}
			{#each assetTree as node}
				<TreeNode {node} depth={0} currentSlug="" onLoadFile={(slug) => onSelectAsset?.(slug)} />
			{/each}
		{:else}
			{#each archetypeTree as node}
				<TreeNode {node} depth={0} currentSlug="" onLoadFile={(slug) => onSelectArchetype?.(slug)} />
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
