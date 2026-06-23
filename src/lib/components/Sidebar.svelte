<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Image, FileText, FileCode, Settings, Layers, FolderTree, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import TreeNode from './TreeNode.svelte';
	import type { TreeNodeData } from '$lib/types';

	const views: { key: 'all' | 'archetypes' | 'config' | 'content' | 'site' | 'static'; label: string; icon: typeof FileText }[] = [
		{ key: 'all', label: 'Tout', icon: Layers },
		{ key: 'content', label: 'Content', icon: FileText },
		{ key: 'static', label: 'Static', icon: Image },
		{ key: 'archetypes', label: 'Archétypes', icon: FileCode },
		{ key: 'config', label: 'Config', icon: Settings },
		{ key: 'site', label: 'Site', icon: FolderTree },
	];

	let {
		tree = [] as TreeNodeData[],
		assetTree = [] as TreeNodeData[],
		archetypeTree = [] as TreeNodeData[],
		configTree = [] as TreeNodeData[],
		siteTree = [] as TreeNodeData[],
		currentSlug = '',
		sidebarView = 'content',
		expandedSlugs = new Set<string>(),
		onLoadFile,
		onCreateFileInFolder,
		onCreateFolderInFolder,
		onDeleteFile,
		onDeleteSiteFile,
		onDeleteFolder,
		onDeleteSiteFolder,
		onRenameFile,
		onRenameSite,
		onDuplicateFile,
		onSelectAsset,
		onSelectArchetype,
		onSelectConfig,
		onSelectSite,
		onViewChange,
		onToggleFolder,
	}: {
		tree?: TreeNodeData[];
		assetTree?: TreeNodeData[];
		archetypeTree?: TreeNodeData[];
		configTree?: TreeNodeData[];
		siteTree?: TreeNodeData[];
		currentSlug?: string | null;
		sidebarView?: 'all' | 'content' | 'site' | 'static' | 'archetypes' | 'config';
		expandedSlugs?: Set<string>;
		onLoadFile?: (slug: string) => void;
		onCreateFileInFolder?: (slug: string) => void;
		onCreateFolderInFolder?: (slug: string) => void;
		onDeleteFile?: (slug: string) => void;
		onDeleteSiteFile?: (slug: string) => void;
		onDeleteFolder?: (slug: string) => void;
		onDeleteSiteFolder?: (slug: string) => void;
		onRenameFile?: (oldSlug: string, newSlug: string) => void;
		onRenameSite?: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile?: (slug: string) => void;
		onSelectAsset?: (path: string) => void;
		onSelectArchetype?: (slug: string) => void;
		onSelectConfig?: (slug: string) => void;
		onSelectSite?: (slug: string) => void;
		onViewChange?: (view: 'all' | 'content' | 'site' | 'static' | 'archetypes' | 'config') => void;
		onToggleFolder?: (slug: string) => void;
	} = $props();

	let dropdownOpen = $state(false);
	let blurTimeout: ReturnType<typeof setTimeout> | null = null;

	onDestroy(() => {
		if (blurTimeout) clearTimeout(blurTimeout);
	});

	const currentView = $derived(views.find((v) => v.key === sidebarView) ?? views[1]);

	function setView(view: 'all' | 'content' | 'site' | 'static' | 'archetypes' | 'config') {
		onViewChange?.(view);
		dropdownOpen = false;
	}

	function handleBlur() {
		blurTimeout = setTimeout(() => dropdownOpen = false, 150);
	}

	function handleRootDrop(e: DragEvent) {
		if (sidebarView !== 'site') return;
		e.preventDefault();
		const sourceSlug = e.dataTransfer?.getData('text/plain');
		if (!sourceSlug || !onRenameSite) return;
		const fileName = sourceSlug.includes('/') ? sourceSlug.split('/').pop()! : sourceSlug;
		if (fileName !== sourceSlug) {
			onRenameSite(sourceSlug, fileName);
		}
	}
</script>

<aside class="sidebar">
	<div class="view-select" role="combobox" aria-label="Vue" aria-haspopup="listbox" aria-expanded={dropdownOpen} aria-controls="view-dropdown-menu">
		<button class="view-dropdown-trigger" onclick={() => dropdownOpen = !dropdownOpen} onblur={handleBlur}>
			<ChevronLeft size={12} />
			{#if currentView.icon === FileText}
				<FileText size={14} />
			{:else if currentView.icon === FileCode}
				<FileCode size={14} />
			{:else if currentView.icon === Settings}
				<Settings size={14} />
			{:else if currentView.icon === Image}
				<Image size={14} />
			{:else if currentView.icon === Layers}
				<Layers size={14} />
			{:else if currentView.icon === FolderTree}
				<FolderTree size={14} />
			{/if}
			<span>{currentView.label}</span>
			<ChevronRight size={12} />
		</button>
		{#if dropdownOpen}
			<div id="view-dropdown-menu" class="view-dropdown-menu" transition:slide={{ duration: 120 }} role="listbox">
				{#each views as v}
					<button class="view-dropdown-item" class:active={v.key === sidebarView} onmousedown={() => setView(v.key)} role="option" aria-selected={v.key === sidebarView}>
						{#if v.icon === FileText}
							<FileText size={14} />
						{:else if v.icon === FileCode}
							<FileCode size={14} />
						{:else if v.icon === Settings}
							<Settings size={14} />
						{:else if v.icon === Image}
							<Image size={14} />
						{:else if v.icon === Layers}
							<Layers size={14} />
						{:else if v.icon === FolderTree}
							<FolderTree size={14} />
						{/if}
						<span>{v.label}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<nav class="file-tree" ondragover={(e) => { if (sidebarView === 'site') e.preventDefault(); }} ondrop={handleRootDrop}>
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
		{:else if sidebarView === 'all'}
			<div class="all-section">
				<div class="section-header">Content</div>
				{#each tree as node}
					<TreeNode {node} depth={0} {currentSlug} {expandedSlugs} {onToggleFolder} {onLoadFile} {onDeleteFile} {onDeleteFolder} {onRenameFile} {onDuplicateFile} {onCreateFileInFolder} {onCreateFolderInFolder} />
				{/each}
			</div>
			<div class="all-section">
				<div class="section-header">Static</div>
				{#each assetTree as node}
					<TreeNode {node} depth={0} {currentSlug} {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectAsset?.(slug)} />
				{/each}
			</div>
			<div class="all-section">
				<div class="section-header">Archétypes</div>
				{#each archetypeTree as node}
					<TreeNode {node} depth={0} currentSlug="" {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectArchetype?.(slug)} />
				{/each}
			</div>
			<div class="all-section">
				<div class="section-header">Config</div>
				{#each configTree as node}
					<TreeNode {node} depth={0} currentSlug="" {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectConfig?.(slug)} />
				{/each}
			</div>
		{:else if sidebarView === 'site'}
			{#each siteTree as node}
				<TreeNode {node} depth={0} currentSlug="" {expandedSlugs} {onToggleFolder} onLoadFile={(slug) => onSelectSite?.(slug)} {onCreateFileInFolder} {onCreateFolderInFolder} onDeleteFile={onDeleteSiteFile} onDeleteFolder={onDeleteSiteFolder} onRenameFile={onRenameSite} {onDuplicateFile} />
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
		width: 100%;
		min-width: 0;
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

	.all-section {
		margin-bottom: 4px;
	}

	.all-section:not(:last-child)::after {
		content: '';
		display: block;
		margin: 6px 0 6px -16px;
		border-bottom: 1px solid var(--c-border);
	}

	.section-header {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--c-text-muted);
		padding: 4px 0 2px;
		margin: 0 0 2px;
	}
</style>
