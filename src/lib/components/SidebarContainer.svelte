<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { confirmStore } from '$lib/stores/confirm.svelte';
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
	const { tree, assetTree, archetypeTree, configTree, siteTree, loadConfigTree, loadSiteTree } = fileTreeStore;

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

	// Charge l'arbre approprié quand la vue change (évite un arbre vide → pas de bouton créer)
	$effect(() => {
		const v = $layout.sidebarView;
		if (v === 'config') loadConfigTree();
		if (v === 'site') loadSiteTree();
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
		uiStore.updateDialogs({ createFolderParent: slug, createFolderIsSite: $layout.sidebarView === 'site' });
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

	function handleSelectSite(slug: string) {
		const ext = slug.split('.').pop()?.toLowerCase() ?? '';
		const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif', 'ico'];
		const binaryExts = ['woff', 'woff2', 'ttf', 'otf', 'eot', 'zip', 'tar', 'gz', '7z', 'rar', 'mp3', 'wav', 'ogg', 'flac', 'mp4', 'webm', 'avi', 'pdf', 'exe', 'dll', 'so', 'ico'];
		const editableExts = ['json', 'toml', 'yaml', 'yml', 'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'js', 'ts', 'mjs', 'cjs', 'txt', 'md', 'sh', 'bat', 'ps1', 'csv', 'env', 'gitignore'];
		const isImage = imageExts.includes(ext);
		const isBinary = binaryExts.includes(ext);
		const isEditable = editableExts.includes(ext) || !ext;
		const isMd = ext === 'md';
		const isInContent = slug.startsWith('content/');

		if (isMd && isInContent) {
			const contentSlug = slug.slice('content/'.length).replace(/\.md$/, '');
			onLoadFile(contentSlug);
		} else if (isImage && slug.startsWith('static/')) {
			const staticSlug = slug.slice('static/'.length);
			handleSelectAsset(staticSlug);
		} else if (isEditable && !isBinary) {
			editorStore.openKindTab(slug, 'site');
			editorStore.switchToTab(slug);
		} else {
			window.open(`/api/site/raw/${slug}`, '_blank');
		}
	}

	function handleViewChange(v: 'all' | 'archetypes' | 'config' | 'content' | 'site' | 'static') {
		settingsStore.updateLayout({ sidebarView: v });
		if (v === 'config') loadConfigTree();
		if (v === 'site') loadSiteTree();
	}

	/** Renommage/déplacement dans la vue Site (agit sur hugoSitePath). */
	async function handleRenameSite(oldSlug: string, newSlug: string) {
		await fetch('/api/site/rename', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ oldSlug, newSlug }),
		});
		loadSiteTree();
	}

	/** Suppression d'un dossier dans la vue Site (API site, pas content). */
	async function handleDeleteSiteFolder(slug: string) {
		const ok = await confirmStore.confirm('Supprimer le dossier', `Supprimer le dossier "${slug}" ?\n\nTout son contenu sera supprimé.`);
		if (!ok) return;
		await fetch(`/api/site/raw/${slug}`, { method: 'DELETE' });
		loadSiteTree();
	}

	/** Suppression d'un fichier dans la vue Site (API site, pas content). */
	async function handleDeleteSiteFile(slug: string) {
		const ok = await confirmStore.confirm('Supprimer le fichier', `Supprimer "${slug}" ?`);
		if (!ok) return;
		await fetch(`/api/site/raw/${slug}`, { method: 'DELETE' });
		loadSiteTree();
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
			<GitSidebarComp
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
				siteTree={$siteTree}
				currentSlug={$currentSlug}
				sidebarView={$layout.sidebarView}
				expandedSlugs={new Set($layout.expandedSlugs)}
				onLoadFile={onLoadFile}
				onCreateFileInFolder={handleCreateFileInFolder}
				onCreateFolderInFolder={handleCreateFolderInFolder}
				onDeleteFile={onDelete}
				onDeleteSiteFile={handleDeleteSiteFile}
				onDeleteFolder={onDeleteFolder}
				onDeleteSiteFolder={handleDeleteSiteFolder}
				onRenameFile={onRenameFile}
				onRenameSite={handleRenameSite}
				onDuplicateFile={onDuplicateFile}
				onSelectAsset={handleSelectAsset}
				onSelectArchetype={handleSelectArchetype}
				onSelectConfig={handleSelectConfig}
				onSelectSite={handleSelectSite}
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
