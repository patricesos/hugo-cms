<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { gitStore } from '$lib/stores/git.svelte';
	import { fileTreeStore } from '$lib/stores/fileTree.svelte';
	import { startSidebarResize } from '$lib/resize';
	import Sidebar from './Sidebar.svelte';

	// Destructuration des stores
	const { layout } = settingsStore;
	const { currentSlug, tabs } = editorStore;
	const { dialogs } = uiStore;
	const { status: gitStatus, loading: gitLoading, initialized: gitInitialized } = gitStore;
	const { tree, assetTree, archetypeTree, configTree, loadConfigTree } = fileTreeStore;

	// Props : uniquement les callbacks métier que le parent doit fournir
	let {
		onLoadFile,
		onDelete,
		onDeleteFolder,
		onRenameFile,
		onDuplicateFile,
	}: {
		onLoadFile: (slug: string) => void;
		onDelete: (slug?: string) => void;
		onDeleteFolder: (slug: string) => void;
		onRenameFile: (oldSlug: string, newSlug: string) => void;
		onDuplicateFile: (slug: string) => void;
	} = $props();

	// Lazy-import GitSidebar
	let GitSidebarComp = $state<any>(null);
	$effect(() => {
		if ($layout.showGit && !GitSidebarComp)
			import('./GitSidebar.svelte').then(m => GitSidebarComp = m.default);
	});

	// Redimensionnement
	const startResize = startSidebarResize(
		() => $layout.sidebarWidth,
		(w) => settingsStore.updateLayout({ sidebarWidth: w }),
	);

	// Callbacks internes (utilisent les stores directement)
	function handleCreateFileInFolder(slug: string) {
		uiStore.updateDialogs({ createFileSection: slug });
		uiStore.updateDialogs({ showCreateDialog: true });
	}

	function handleCreateFolderInFolder(slug: string) {
		uiStore.updateDialogs({ createFolderParent: slug });
		uiStore.updateDialogs({ showCreateFolderDialog: true });
	}

	function handleToggleFolder(slug: string) {
		settingsStore.toggleExpandedSlug(slug);
	}

	function handleSelectAsset(path: string) {
		const ext = path.split('.').pop()?.toLowerCase();
		if (ext && /^(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(ext)) {
			editorStore.openKindTab(path, 'static');
			editorStore.switchToTab(path);
		} else {
			window.open(`/api/assets/${path}`, '_blank');
		}
	}

	function handleSelectArchetype(slug: string) {
		editorStore.openKindTab(slug, 'archetype');
		editorStore.switchToTab(slug);
	}

	function handleSelectConfig(slug: string) {
		editorStore.openKindTab(slug, 'config');
		editorStore.switchToTab(slug);
	}

	function handleViewChange(v: 'archetypes' | 'config' | 'content' | 'static') {
		settingsStore.updateLayout({ sidebarView: v });
		if (v === 'config') loadConfigTree();
	}

	// Git callbacks
	async function refreshGitStatus() {
		await gitStore.refresh();
	}

	async function handleGitInit() {
		await gitStore.init();
	}

	async function handleGitPush() {
		await gitStore.push();
	}
</script>

{#if $layout.sidebarOpen}
	<div class="sidebar-wrap" style="width: {$layout.sidebarWidth}px">
		{#if $layout.showGit && GitSidebarComp}
			<svelte:component
				this={GitSidebarComp}
				status={$gitStatus}
				loading={$gitLoading}
				onRefresh={refreshGitStatus}
				onCommit={() => uiStore.updateDialogs({ showCommitDialog: true })}
				onPush={handleGitPush}
				onInit={handleGitInit}
			/>
		{:else}
			<Sidebar
				tree={$tree}
				assetTree={$assetTree}
				archetypeTree={$archetypeTree}
				configTree={$configTree}
				currentSlug={$currentSlug}
				sidebarView={$layout.sidebarView}
				expandedSlugs={new Set($layout.expandedSlugs)}
				onLoadFile={onLoadFile}
				onCreateFileInFolder={handleCreateFileInFolder}
				onCreateFolderInFolder={handleCreateFolderInFolder}
				onDeleteFile={onDelete}
				onDeleteFolder={onDeleteFolder}
				onRenameFile={onRenameFile}
				onDuplicateFile={onDuplicateFile}
				onSelectAsset={handleSelectAsset}
				onSelectArchetype={handleSelectArchetype}
				onSelectConfig={handleSelectConfig}
				onViewChange={handleViewChange}
				onToggleFolder={handleToggleFolder}
			/>
		{/if}
	</div>
	<div class="resize-handle" role="presentation" onmousedown={startResize}></div>
{/if}

<style>
	.sidebar-wrap {
		flex-shrink: 0;
		overflow: hidden;
		height: 100%;
		display: flex;
	}

	.resize-handle {
		width: 5px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.resize-handle::before {
		content: '';
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 2px;
		width: 1px;
		background: var(--c-border);
		transition: background 0.15s;
	}

	.resize-handle:hover,
	.resize-handle:active {
		background: var(--c-primary);
	}

	.resize-handle:hover::before,
	.resize-handle:active::before {
		background: var(--c-primary);
	}
</style>
