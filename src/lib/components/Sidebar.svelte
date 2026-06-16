<script lang="ts">
	import { Image, FileText, FileCode, Settings, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import TreeNode from './TreeNode.svelte';

	interface TreeNodeData {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNodeData[];
		frontmatter?: Record<string, unknown>;
	}

	const views: { key: 'archetypes' | 'config' | 'content' | 'static'; label: string; icon: typeof FileText }[] = [
		{ key: 'archetypes', label: 'Archétypes', icon: FileCode },
		{ key: 'config', label: 'Config', icon: Settings },
		{ key: 'content', label: 'Content', icon: FileText },
		{ key: 'static', label: 'Static', icon: Image },
	];

	let {
		tree = [] as TreeNodeData[],
		assetTree = [] as TreeNodeData[],
		archetypeTree = [] as TreeNodeData[],
		configTree = [] as TreeNodeData[],
		currentSlug = '',
		sidebarView = 'content',
		expandedSlugs = new Set<string>(),
		onLoadFile,
		onCreateFileInFolder,
		onCreateFolderInFolder,
		onDeleteFile,
		onDeleteFolder,
		onRenameFile,
		onDuplicateFile,
		onSelectAsset,
		onSelectArchetype,
		onSelectConfig,
		onViewChange,
		onToggleFolder,
	}: {
		tree: TreeNodeData[];
		assetTree: TreeNodeData[];
		archetypeTree: TreeNodeData[];
		configTree: TreeNodeData[];
		currentSlug: string | null;
		sidebarView?: 'content' | 'static' | 'archetypes' | 'config';
		expandedSlugs?: Set<string>;
		onLoadFile: (slug: string) => void;
		onCreateFileInFolder?: (slug: string) => void;
		onCreateFolderInFolder?: (slug: string) => void;
		onDeleteFile?: (slug: string) => void;
		onDeleteFolder?: (slug: string) => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onSelectAsset?: (path: string) => void;
		onSelectArchetype?: (slug: string) => void;
		onSelectConfig?: (slug: string) => void;
		onViewChange?: (view: 'content' | 'static' | 'archetypes' | 'config') => void;
		onToggleFolder?: (slug: string) => void;
	} = $props();

	let dropdownOpen = $state(false);

	const currentView = $derived(views.find((v) => v.key === sidebarView) ?? views[2]);

	function setView(view: 'content' | 'static' | 'archetypes' | 'config') {
		onViewChange?.(view);
		dropdownOpen = false;
	}
</script>

<aside class="sidebar">
	<div class="view-select" role="combobox" aria-haspopup="listbox" aria-expanded={dropdownOpen}>
		<button class="view-dropdown-trigger" onclick={() => dropdownOpen = !dropdownOpen} onblur={() => setTimeout(() => dropdownOpen = false, 150)}>
			<ChevronLeft size={12} class="chev-left" />
			<svelte:component this={currentView.icon} size={14} />
			<span>{currentView.label}</span>
			<ChevronRight size={12} class="chev-right" />
		</button>
		{#if dropdownOpen}
			<div class="view-dropdown-menu" transition:slide={{ duration: 120 }} role="listbox">
				{#each views as v}
					<button class="view-dropdown-item" class:active={v.key === sidebarView} onmousedown={() => setView(v.key)} role="option" aria-selected={v.key === sidebarView}>
						<svelte:component this={v.icon} size={14} />
						<span>{v.label}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<nav class="file-tree">
		{#if sidebarView === 'content'}
			{#each tree as node}
				<TreeNode {node} depth={0} {currentSlug} {expandedSlugs} {onToggleFolder} {onLoadFile} {onDeleteFile} {onDeleteFolder} {onRenameFile} {onDuplicateFile} {onCreateFileInFolder} {onCreateFolderInFolder} />
			{/each}
		{:else if sidebarView === 'static'}
			{#each assetTree as node}
				<TreeNode {node} depth={0} {currentSlug} {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectAsset?.(slug)} />
			{/each}
		{:else if sidebarView === 'config'}
			{#each configTree as node}
				<TreeNode {node} depth={0} currentSlug="" {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectConfig?.(slug)} />
			{/each}
		{:else}
			{#each archetypeTree as node}
				<TreeNode {node} depth={0} currentSlug="" {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectArchetype?.(slug)} />
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

	.view-select {
		position: relative;
		padding: 8px 12px;
		border-bottom: 1px solid var(--c-border);
		flex-shrink: 0;
		z-index: 10;
	}

	.view-dropdown-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 100%;
		padding: 5px 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--c-border);
		background: var(--c-bg-input);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		outline: none;
		position: relative;
	}

	.view-dropdown-trigger:focus {
		border-color: var(--c-primary);
	}

	.view-dropdown-trigger .chev-left,
	.view-dropdown-trigger .chev-right {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}

	.view-dropdown-trigger .chev-left {
		left: 8px;
	}

	.view-dropdown-trigger .chev-right {
		right: 8px;
	}



	.view-dropdown-menu {
		position: absolute;
		top: 100%;
		left: 12px;
		right: 12px;
		margin-top: 2px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--c-border);
		background: var(--c-bg);
		box-shadow: 0 4px 12px rgba(0,0,0,0.15);
		overflow: hidden;
	}

	.view-dropdown-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 6px 10px;
		border: none;
		background: transparent;
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}

	.view-dropdown-item:hover {
		background: var(--c-bg-muted);
	}

	.view-dropdown-item.active {
		color: var(--c-primary);
		background: var(--c-primary-light);
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
