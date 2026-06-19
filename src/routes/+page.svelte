<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { PanelRightOpen, PanelRightClose, PenLine, Search, PanelLeftClose, PanelLeftOpen, Save, Loader2, CheckCircle2, RefreshCw, AlertTriangle, Eye, FileText, FilePlus, FolderPlus, Map, Terminal, GitBranch, Settings, ExternalLink, Play, Square, Globe, Lock, FolderOpen, Plus } from '@lucide/svelte';
	import SitemapView from '$lib/components/SitemapView.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import FrontMatterEditor from '$lib/components/FrontMatterEditor.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
		import { hugoStore, hugoStatus, hugoUrl, hugoLive, hugoTogglingLive, previewReloadKey } from '$lib/stores/hugo.svelte';
	import { gitStore } from '$lib/stores/git.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
import { settingsStore, settingsData } from '$lib/stores/settings.svelte';
import type { SettingsData } from '$lib/stores/settings.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { startSidebarResize, startFmResize, startPreviewResize, cleanupAllResize } from '$lib/resize';
	import { startConflictPoll, stopConflictPoll, resolveConflict, handleVisibilityChange } from '$lib/conflict';
	import { fileTreeStore } from '$lib/stores/fileTree.svelte';
	import { restoreAppState as restoreState } from '$lib/restore';
	import { getClientConfig, getServerConfig } from '$lib/client-config';

	// Stores source de vérité unique
	const { tabs, currentSlug, editorContent, currentFrontmatter, currentFmFormat, wordCount, charCount, saveState, saveRequest, loading, currentArchetype, currentConfigSlug, conflictSlug, conflictServerMtimeMs, currentTab } = editorStore;
	const { settings, layout } = settingsStore;
	const { dialogs } = uiStore;
	const { status: gitStatus, loading: gitLoading, initialized: gitInitialized } = gitStore;

	// Arbres (store dedie)
	const { tree, assetTree, archetypeTree, configTree, archetypes, directories, searchEntries, loadTree, loadAssetTree, loadArchetypes, loadConfigTree } = fileTreeStore;

	// Injection des getters editor dans settingsStore pour le persist (evite l'import direct)
	settingsStore.setEditorGetters(
		() => $tabs,
		() => $currentSlug
	);

	// Timers internes (pas reactifs)
	let fmSaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// References composants lazy-loaded
	let EditorComp = $state<any>(null);
	let CreateFileDialogComp = $state<any>(null);
	let CreateFolderDialogComp = $state<any>(null);
	let SearchDialogComp = $state<any>(null);
	let ShortcutsHelpComp = $state<any>(null);
	let HugoPreviewComp = $state<any>(null);
	let HugoConsoleComp = $state<any>(null);
	let ArchetypeViewComp = $state<any>(null);
	let ConfigViewComp = $state<any>(null);
	let ImageViewComp = $state<any>(null);
	let SettingsDialogComp = $state<any>(null);
	let GitSidebarComp = $state<any>(null);
	let CommitDialogComp = $state<any>(null);
	let NewSiteDialogComp = $state<any>(null);

	// Etat one-time (serveur, hydratation)
	let clientCfg = $state<{ externalPollInterval: number; fmSaveDelay: number; appTitle: string; trashDir: string } | null>(null);
	let serverConfig = $state<import('$lib/client-config').ServerConfig | null>(null);
	let hydrated = $state(false);
	let siteValid = $state(true);
	let settingsKey = $state(0);

	// Snapshots settings pour detecter les changements dans SettingsDialog
	let savedPathConfig = $state({ useDotEnv: true, customPath: '' });
	let savedTrashDir = $state('_trash');
	let savedCmsPort = $state(1703);

	// --- Fonctions Hugo ---
	function reloadPreview() {
		hugoStore.reloadPreview();
		if (!$layout.showPreview) settingsStore.updateLayout({ showPreview: true });
	}

	async function startHugoServer() {
		await hugoStore.start();
	}

	async function stopHugoServer() {
		await hugoStore.stop();
	}

	async function checkHugoStatus() {
		await hugoStore.check();
	}

	async function toggleHugoLive() {
		await hugoStore.toggleLive();
	}

	function openPreviewInTab() {
		hugoStore.openPreviewInTab();
	}

	// --- Persistance ---
	$effect(() => {
		if ($dialogs.showSettings) {
			savedPathConfig = { useDotEnv: $settings.hugoSitePathUseDotEnv, customPath: $settings.hugoSitePathCustom };
			savedTrashDir = $settings.trashDir;
			savedCmsPort = $settings.cmsPort;
		}
	});

	// Sauvegarde les tabs dans localStorage à chaque changement (fermeture, etc.)
	$effect(() => {
		$tabs; // track
		settingsStore.persist();
	});

	// --- Conflit : polling modifications externes ---
	$effect(() => {
		if ($currentSlug) {
			startConflictPoll($currentSlug, clientCfg?.externalPollInterval ?? 5000);
		} else {
			stopConflictPoll();
		}
	});

	// --- Redimensionnement ---
	const startResize = startSidebarResize(
		() => $layout.sidebarWidth,
		(w) => settingsStore.updateLayout({ sidebarWidth: w })
	);
	const startFmResizeHandler = startFmResize(
		() => $layout.fmWidth,
		(w) => settingsStore.updateLayout({ fmWidth: w })
	);
	const startPreviewResizeHandler = startPreviewResize(
		() => $layout.previewWidth,
		(w) => settingsStore.updateLayout({ previewWidth: w })
	);



	// --- Mount ---
	onMount(() => {
		getClientConfig().then(cfg => { clientCfg = cfg; });
		getServerConfig().then(async cfg => {
			serverConfig = cfg;
			siteValid = cfg.siteValid;
			if (cfg.siteValid) {
				await Promise.all([loadTree(), loadAssetTree(), loadArchetypes(), loadConfigTree()]);
				await restoreAppState();
				checkHugoStatus();
			}
		});
		import('$lib/components/Editor.svelte').then(m => EditorComp = m.default);
		function handleKeydown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && !e.shiftKey && e.code === 'KeyP') {
				e.preventDefault();
				uiStore.updateDialogs({ showSearch: true });
			}
			if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
				uiStore.updateDialogs({ showShortcuts: true });
			}
			if (mod && e.shiftKey && e.code === 'KeyP') {
				e.preventDefault();
				settingsStore.updateLayout({ showPreview: !$layout.showPreview });
			}
			if (mod && e.code === 'Backquote') {
				e.preventDefault();
				settingsStore.updateLayout({ showConsole: !$layout.showConsole });
			}
		}
		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			stopConflictPoll();
			cleanupAllResize();
			if (fmSaveTimeout) clearTimeout(fmSaveTimeout);
		};
	});

	// Lazy-imports declenches par l'etat des stores
	$effect(() => { if ($dialogs.showCreateDialog && !CreateFileDialogComp) import('$lib/components/CreateFileDialog.svelte').then(m => CreateFileDialogComp = m.default); });
	$effect(() => { if ($dialogs.showCreateFolderDialog && !CreateFolderDialogComp) import('$lib/components/CreateFolderDialog.svelte').then(m => CreateFolderDialogComp = m.default); });
	$effect(() => { if ($dialogs.showSearch && !SearchDialogComp) import('$lib/components/SearchDialog.svelte').then(m => SearchDialogComp = m.default); });
	$effect(() => { if ($dialogs.showShortcuts && !ShortcutsHelpComp) import('$lib/components/ShortcutsHelp.svelte').then(m => ShortcutsHelpComp = m.default); });
	$effect(() => { if ($layout.showPreview && !HugoPreviewComp) import('$lib/components/HugoPreview.svelte').then(m => HugoPreviewComp = m.default); });
	$effect(() => { if ($layout.showConsole && !HugoConsoleComp) import('$lib/components/HugoConsole.svelte').then(m => HugoConsoleComp = m.default); });
	$effect(() => { if ($dialogs.showSettings && !SettingsDialogComp) import('$lib/components/SettingsDialog.svelte').then(m => SettingsDialogComp = m.default); });
	$effect(() => { if ($currentTab?.kind === 'archetype' && !ArchetypeViewComp) import('$lib/components/ArchetypeView.svelte').then(m => ArchetypeViewComp = m.default); });
	$effect(() => { if ($currentTab?.kind === 'config' && !ConfigViewComp) import('$lib/components/ConfigView.svelte').then(m => ConfigViewComp = m.default); });
	$effect(() => { if ($currentTab?.kind === 'static' && !ImageViewComp) import('$lib/components/ImageView.svelte').then(m => ImageViewComp = m.default); });
	$effect(() => { if ($layout.showGit && !GitSidebarComp) import('$lib/components/GitSidebar.svelte').then(m => GitSidebarComp = m.default); });
	$effect(() => { if ($dialogs.showCommitDialog && !CommitDialogComp) import('$lib/components/CommitDialog.svelte').then(m => CommitDialogComp = m.default); });
	$effect(() => { if ($dialogs.showNewSiteDialog && !NewSiteDialogComp) import('$lib/components/NewSiteDialog.svelte').then(m => NewSiteDialogComp = m.default); });

	// Theme (base sur $settings.theme)
	$effect(() => {
		const t = $settings.theme;
		const unsub = settingsStore.applyTheme(t);
		return () => { if (unsub) unsub(); };
	});

	// --- Fonctions editeur ---
	async function loadFile(slug: string) {
		await editorStore.loadFile(slug, loadTree);
		if ($currentSlug === slug) {
			settingsStore.updateLayout({ sidebarView: 'content' });
		}
	}

	async function switchToTab(slug: string) {
		await editorStore.switchToTab(slug);
		const tab = $tabs.find(t => t.slug === slug);
		if (tab) {
			let v: 'content' | 'static' | 'archetypes' | 'config' = 'content';
			if (tab.kind === 'archetype') v = 'archetypes';
			else if (tab.kind === 'config') v = 'config';
			else if (tab.kind === 'static') v = 'static';
			settingsStore.updateLayout({ sidebarView: v });
		}
	}

	async function handleSave(markdown: string) {
		await editorStore.handleSave(markdown);
	}

	function handleFrontmatterChange(fm: Record<string, unknown>) {
		editorStore.handleFrontmatterChange(fm);
		if ($currentSlug) fileTreeStore.updateTreeFrontmatter($currentSlug, fm);
		if (fmSaveTimeout) clearTimeout(fmSaveTimeout);
		const delay = clientCfg?.fmSaveDelay ?? 2000;
		fmSaveTimeout = setTimeout(() => { editorStore.saveRequest.update(r => r + 1); }, delay);
	}

	async function handleCreate(title: string, section: string, archetype?: string) {
		await editorStore.handleCreate(title, section, loadTree, $settings.draftByDefault, archetype);
		uiStore.closeCreateDialog();
	}

	async function handleDeleteFolder(slug: string) {
		const trashDirName = clientCfg?.trashDir ?? '_trash';
		await editorStore.handleDeleteFolder(slug, trashDirName, loadTree);
	}

	async function handleCreateFolder(folderName: string, parent: string) {
		await editorStore.handleCreateFolder(folderName, parent, loadTree);
		uiStore.closeCreateFolderDialog();
	}

	async function handleDelete(slug?: string) {
		const trashDirName = clientCfg?.trashDir ?? '_trash';
		await editorStore.handleDelete(slug, trashDirName, loadTree);
	}

	async function handleRename(oldSlug: string, newSlug: string) {
		await editorStore.handleRename(oldSlug, newSlug, loadTree);
	}

	async function handleDuplicate(slug: string) {
		await editorStore.handleDuplicate(slug, $tree, loadTree);
	}

	function handleCloseTab(slug: string) {
		editorStore.handleCloseTab(slug);
	}

	// --- Fonctions Git ---
	async function refreshGitStatus() {
		await gitStore.refresh();
	}

	async function handleGitInit() {
		await gitStore.init();
	}

	async function handleGitCommit(message: string, files: string[]) {
		await gitStore.commit(message, files);
	}

	async function handleGitPush() {
		await gitStore.push();
	}

	function toggleGit() {
		settingsStore.updateLayout({ showGit: !$layout.showGit });
		if ($layout.showGit && !$gitStatus && !$gitInitialized) {
			gitStore.initialized.set(true);
			refreshGitStatus();
		}
	}

	// --- Restauration d'etat ---
	async function restoreAppState() {
		const { activeSlug, shouldInitGit } = await restoreState();
		if (activeSlug) await switchToTab(activeSlug);
		if (shouldInitGit) {
			gitStore.initialized.set(true);
			await refreshGitStatus();
		}
		hydrated = true;
		settingsStore.setHydrated();
	}
</script>

<div class="app-shell">
	<header class="app-header">
		<div class="header-brand">
			<img src="/favicon.svg" alt="Hugo" class="header-logo" />
			<h2>Hugo CMS</h2>
		</div>
	</header>
	{#if $dialogs.showRestartBanner}
	<div class="restart-banner">
		<span>Chemin du site modifié. Redémarrez le serveur pour appliquer.</span>
		<button class="restart-banner-close" onclick={() => uiStore.updateDialogs({ showRestartBanner: false })}>✕</button>
	</div>
	{/if}
	{#if !siteValid}
	<div class="setup-overlay">
		<div class="setup-card">
			<img src="/favicon.svg" alt="Hugo" class="setup-logo" />
			<h2>Bienvenue dans Hugo CMS</h2>
			<p class="setup-desc">Aucun site Hugo configuré. Choisissez un dossier existant ou créez-en un nouveau.</p>
			<div class="setup-actions">
				<button class="btn-primary" onclick={() => uiStore.updateDialogs({ showSettings: true })}>
					<FolderOpen size={16} />
					Ouvrir un dossier existant
				</button>
				<button class="btn-secondary" onclick={() => uiStore.updateDialogs({ showNewSiteDialog: true })}>
					<Plus size={16} />
					Créer un nouveau site
				</button>
			</div>
		</div>
	</div>
	{/if}
	<div class="action-bar">
		<div class="action-bar-left">
			<button class="icon-btn" onclick={() => settingsStore.updateLayout({ sidebarOpen: !$layout.sidebarOpen })} title={$layout.sidebarOpen ? 'Réduire la sidebar' : 'Afficher la sidebar'}>
				{#if $layout.sidebarOpen}
					<PanelLeftClose size={16} />
				{:else}
					<PanelLeftOpen size={16} />
				{/if}
			</button>
		</div>
		<div class="action-bar-center">
			<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSearch: true })} title="Rechercher (Ctrl+P)">
				<Search size={16} />
			</button>
			<button class="icon-btn" onclick={() => { uiStore.updateDialogs({ createFileSection: '' }); uiStore.updateDialogs({ showCreateDialog: true }); }} title="Nouveau fichier">
				<FilePlus size={16} />
			</button>
			<button class="icon-btn" onclick={() => { uiStore.updateDialogs({ createFolderParent: '' }); uiStore.updateDialogs({ showCreateFolderDialog: true }); }} title="Nouveau dossier">
				<FolderPlus size={16} />
			</button>
			<button class="icon-btn" onclick={() => { loadTree(); loadAssetTree(); loadConfigTree(); }} title="Rafraîchir">
				<RefreshCw size={16} />
			</button>
			<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSitemap: !$dialogs.showSitemap })} title="Sitemap visuel">
				<Map size={16} />
			</button>
			<button class="icon-btn" class:active={$layout.showPreview} onclick={() => settingsStore.updateLayout({ showPreview: !$layout.showPreview })} title="Aperçu Hugo (Cmd+Shift+P)">
				<Eye size={16} />
			</button>
			<button class="icon-btn" class:active={$layout.showConsole} onclick={() => settingsStore.updateLayout({ showConsole: !$layout.showConsole })} title="Console Hugo">
				<Terminal size={16} />
			</button>
			<button class="icon-btn" class:active={$layout.showGit} onclick={toggleGit} title="Git">
				<GitBranch size={16} />
			</button>
		</div>
		<div class="action-bar-right">
			<button
				class="icon-btn network-toggle"
				class:active={$hugoLive}
				onclick={toggleHugoLive}
				disabled={$hugoTogglingLive}
				title={$hugoLive ? 'Restreindre au local' : 'Exposer sur le réseau'}
			>
				{#if $hugoTogglingLive}
					<Loader2 size={13} class="spin" />
				{:else if $hugoLive}
					<Globe size={13} />
					<span class="toggle-label">Réseau</span>
				{:else}
					<Lock size={13} />
					<span class="toggle-label">Local</span>
				{/if}
			</button>
			<button
				class="hugo-indicator"
				class:running={$hugoStatus === 'running'}
				class:loading={$hugoStatus === 'loading'}
				class:error={$hugoStatus === 'error'}
				onclick={$hugoStatus === 'running' ? stopHugoServer : $hugoStatus === 'stopped' || $hugoStatus === 'error' ? startHugoServer : undefined}
				disabled={$hugoStatus === 'loading'}
				title={$hugoStatus === 'running' ? 'Arrêter le serveur' : $hugoStatus === 'loading' ? 'Démarrage…' : $hugoStatus === 'error' ? 'Relancer le serveur' : 'Démarrer le serveur'}
			>
				<span class="hugo-indicator-dot"></span>
				<span class="hugo-indicator-label">
					{ $hugoStatus === 'running' ? 'Actif' : $hugoStatus === 'loading' ? 'Démarrage…' : $hugoStatus === 'error' ? 'Erreur' : 'Arrêté' }
				</span>
			</button>
			{#if $hugoStatus === 'running'}
				<button class="icon-btn" onclick={openPreviewInTab} title="Ouvrir dans un onglet">
					<ExternalLink size={14} />
				</button>
				<button class="icon-btn" onclick={reloadPreview} title="Recharger">
					<RefreshCw size={15} />
				</button>
			{/if}
			<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSettings: true })} title="Paramètres">
				<Settings size={16} />
			</button>
		</div>
	</div>
	<div class="app-body" class:sidebar-collapsed={!$layout.sidebarOpen}>
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
					currentSlug={$currentSlug}
					sidebarView={$layout.sidebarView}
					expandedSlugs={new Set($layout.expandedSlugs)}
					onLoadFile={loadFile}
					onCreateFileInFolder={(slug) => { uiStore.updateDialogs({ createFileSection: slug }); uiStore.updateDialogs({ showCreateDialog: true }); }}
					onCreateFolderInFolder={(slug) => { uiStore.updateDialogs({ createFolderParent: slug }); uiStore.updateDialogs({ showCreateFolderDialog: true }); }}
					onDeleteFile={handleDelete}
					onDeleteFolder={handleDeleteFolder}
					onRenameFile={handleRename}
					onDuplicateFile={handleDuplicate}
					onToggleFolder={(slug) => {
						settingsStore.toggleExpandedSlug(slug);
					}}
					onSelectAsset={(path) => {
						const ext = path.split('.').pop()?.toLowerCase();
						if (ext && /^(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(ext)) {
							editorStore.openKindTab(path, 'static');
							switchToTab(path);
						} else {
							window.open(`/api/assets/${path}`, '_blank');
						}
					}}
					onSelectArchetype={(slug) => { editorStore.openKindTab(slug, 'archetype'); switchToTab(slug); }}
					onSelectConfig={(slug) => { editorStore.openKindTab(slug, 'config'); switchToTab(slug); }}
					onViewChange={(v) => { settingsStore.updateLayout({ sidebarView: v }); if (v === 'config') loadConfigTree(); }}
				/>
			{/if}
		</div>
		<div class="resize-handle" role="presentation" onmousedown={startResize}></div>
	{/if}

	<main class="editor-panel">
		{#if $currentSlug || $tabs.length > 0}
			<TabBar tabs={$tabs} activeSlug={$currentSlug ?? ''} showFilenameInTabs={$settings.showFilenameInTabs} 						onSelect={(slug) => { switchToTab(slug); }} onClose={handleCloseTab} />
		{/if}
		<div class="editor-panel-body">
			<div class="editor-panel-content">
				{#if $currentTab?.kind === 'archetype'}
					{#if ArchetypeViewComp}
						<ArchetypeViewComp
							slug={$currentArchetype}
							onClose={() => { editorStore.tabs.set($tabs.filter(t => t.slug !== $currentSlug)); editorStore.currentArchetype.set(null); editorStore.currentSlug.set(null); }}
							onDelete={(s: string) => { loadArchetypes(); editorStore.tabs.set($tabs.filter(t => t.slug !== s)); editorStore.currentArchetype.set(null); editorStore.currentSlug.set(null); }}
						/>
					{/if}
				{:else if $currentTab?.kind === 'config'}
					{#if ConfigViewComp}
						<ConfigViewComp
							slug={$currentConfigSlug}
							onClose={() => { editorStore.tabs.set($tabs.filter(t => t.slug !== $currentSlug)); editorStore.currentConfigSlug.set(null); editorStore.currentSlug.set(null); }}
							onDelete={(s: string) => { loadConfigTree(); editorStore.tabs.set($tabs.filter(t => t.slug !== s)); editorStore.currentConfigSlug.set(null); editorStore.currentSlug.set(null); }}
						/>
					{/if}
				{:else if $dialogs.showSitemap && !$currentSlug}
					<SitemapView tree={$tree} currentSlug={$currentSlug} onLoadFile={(slug) => { loadFile(slug); uiStore.updateDialogs({ showSitemap: false }); }} onRefresh={loadTree} />
				{:else if !$currentSlug}
					{#if !$dialogs.showSitemap}
						<div class="empty-state" transition:fade={{ duration: 200 }}>
							<img class="hugo-logo" src="/hugo-cms.svg" alt="Hugo CMS" />
							<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
						</div>
					{/if}
				{:else if $currentTab?.kind === 'static'}
					<div class="editor-fixed-wrap">
						<div class="editor-header">
							<div class="header-left">
								<PenLine size={14} color="var(--c-text-muted)" />
								<span class="filename">{$currentSlug}</span>
							</div>
						</div>
						{#key $currentSlug}
							{#if ImageViewComp}
								<ImageViewComp slug={$currentSlug} assetUrl={`/api/assets/${$currentSlug}`} />
							{/if}
						{/key}
					</div>
				{:else}
					<div class="editor-fixed-wrap">
						{#if $loading}
							<div class="loading-overlay">
								<div class="skeleton-block"></div>
								<div class="skeleton-block short"></div>
								<div class="skeleton-block"></div>
							</div>
						{/if}
						{#if $conflictSlug === $currentSlug}
							<div class="conflict-banner" transition:slide={{ duration: 200, axis: 'y' }}>
								<span class="conflict-icon"><AlertTriangle size={14} /></span>
								<span class="conflict-text">Fichier modifié en externe</span>
								<button class="conflict-btn" onclick={() => resolveConflict('reload')}>Recharger</button>
								<button class="conflict-btn primary" onclick={() => resolveConflict('overwrite')}>Écraser</button>
							</div>
						{/if}
						<div class="editor-header">
							<div class="header-left">
								<PenLine size={14} color="var(--c-text-muted)" />
								<span class="filename">{$currentSlug}.md</span>
								<button
									class="save-btn"
									class:saved={$saveState === 'saved'}
									class:unsaved={$saveState === 'unsaved'}
									class:saving={$saveState === 'saving'}
									onclick={() => editorStore.saveRequest.update(n => n + 1)}
									title={$saveState === 'saving' ? 'Sauvegarde…' : $saveState === 'unsaved' ? 'Enregistrer' : 'Enregistré'}
								>
									{#if $saveState === 'saving'}
										<Loader2 size={13} class="spin" />
									{:else if $saveState === 'unsaved'}
										<Save size={13} />
									{:else}
										<CheckCircle2 size={13} />
									{/if}
								</button>
							</div>
							<div class="header-right">
								<button class="icon-btn fm-toggle" onclick={() => settingsStore.updateLayout({ fmOpen: !$layout.fmOpen })} title={$layout.fmOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}>
									{#if $layout.fmOpen}
										<PanelRightClose size={14} />
									{:else}
										<PanelRightOpen size={14} />
									{/if}
								</button>
							</div>
						</div>
						<div class="editor-body" class:with-fm={$layout.fmOpen}>
							<div class="editor-main">
								<div class="editor-area">
									{#key settingsKey}
									{#if EditorComp}
										<EditorComp
											content={$editorContent}
											frontmatter={$currentFrontmatter}
											frontmatterFormat={$currentFmFormat}
											rawMode={$currentTab?.rawMode ?? $settings.defaultRawMode}
											showBubbleMenu={$settings.showBubbleMenu}
											showSlashMenu={$settings.showSlashMenu}
											autoSaveDelay={$settings.autoSaveDelay}
											editorFont={$settings.editorFont}
											editorFontSize={$settings.editorFontSize}
											editorMaxWidth={$settings.editorMaxWidth}
											editorMaxWidthCustom={$settings.editorMaxWidthCustom}
											historyDepth={$settings.historyDepth}
											saveRequest={$saveRequest}
											getContent={(fn: () => string) => { editorStore.setEditorGetContent(fn); }}
											onSetContent={(fn: (content: string) => void) => { editorStore.setEditorSetContent(fn); }}
											onSave={handleSave}
											onFrontmatterChange={(fm: Record<string, unknown>) => { editorStore.handleFrontmatterChange(fm); if ($currentSlug) fileTreeStore.updateTreeFrontmatter($currentSlug, fm); }}
											onStats={(s: { words: number; chars: number }) => { $wordCount = s.words; $charCount = s.chars; }}
											onSaveState={(s: 'saved' | 'unsaved' | 'saving') => { editorStore.saveState.set(s); }}
											onRawModeChange={(mode: boolean) => { if ($currentSlug) editorStore.updateTabRawMode($currentSlug, mode); }}
										/>
									{:else}
										<div class="editor-loading">
											<div class="skeleton-block"></div>
											<div class="skeleton-block short"></div>
											<div class="skeleton-block"></div>
										</div>
									{/if}
									{/key}
								</div>
								{#if $layout.fmOpen}
									<div class="fm-resize-handle" role="presentation" onmousedown={startFmResizeHandler}></div>
									<aside class="fm-sidebar" style="width: {$layout.fmWidth}px; min-width: {$layout.fmWidth}px;" transition:slide={{ duration: 200, axis: 'x' }}>
										<FrontMatterEditor
											frontmatter={$currentFrontmatter}
											format={$currentFmFormat}
											fmRawMode={$layout.fmRawMode}
											onChange={handleFrontmatterChange}
										/>
									</aside>
								{/if}
							</div>
						</div>
						<StatusBar wordCount={$wordCount} charCount={$charCount} saveState={$saveState} onHelp={() => uiStore.updateDialogs({ showShortcuts: true })} />
					</div>
				{/if}
			</div>
			{#if $layout.showPreview}
				<div class="preview-resize-handle" role="presentation" onpointerdown={startPreviewResizeHandler}></div>
				{#if HugoPreviewComp}
				<HugoPreviewComp
						show={$layout.showPreview}
						onClose={() => settingsStore.updateLayout({ showPreview: false })}
						onStatusChange={(s: 'loading' | 'running' | 'stopped' | 'error') => hugoStore.update(v => ({ ...v, status: s }))}
						onUrlChange={(u: string | null) => hugoStore.update(v => ({ ...v, url: u }))}
						onLiveChange={(v: boolean) => hugoStore.update(s => ({ ...s, live: v }))}
						reloadKey={$previewReloadKey}
						style="width:{$layout.previewWidth}px;min-width:{$layout.previewWidth}px"
					/>
				{/if}
			{/if}
		</div>
	</main>
	</div>
</div>

{#if HugoConsoleComp}
	<HugoConsoleComp show={$layout.showConsole} bind:consoleHeight={$layout.consoleHeight} onClose={() => settingsStore.updateLayout({ showConsole: false })} />
{/if}

{#if CreateFileDialogComp}
	<CreateFileDialogComp
		show={$dialogs.showCreateDialog}
		{directories}
		{archetypes}
		presetSection={$dialogs.createFileSection}
		onClose={() => uiStore.updateDialogs({ showCreateDialog: false })}
		onCreate={handleCreate}
	/>
{/if}

{#if CreateFolderDialogComp}
	<CreateFolderDialogComp
		show={$dialogs.showCreateFolderDialog}
		parentSlug={$dialogs.createFolderParent}
		onClose={() => uiStore.updateDialogs({ showCreateFolderDialog: false })}
		onCreate={handleCreateFolder}
	/>
{/if}

{#if SearchDialogComp}
	<SearchDialogComp
		show={$dialogs.showSearch}
		entries={searchEntries}
		onSelect={loadFile}
		onClose={() => uiStore.updateDialogs({ showSearch: false })}
	/>
{/if}

{#if ShortcutsHelpComp}
	<ShortcutsHelpComp
		show={$dialogs.showShortcuts}
		onClose={() => uiStore.updateDialogs({ showShortcuts: false })}
	/>
{/if}

{#if CommitDialogComp}
	<CommitDialogComp
		show={$dialogs.showCommitDialog}
		status={$gitStatus}
		onClose={() => uiStore.updateDialogs({ showCommitDialog: false })}
		onCommit={handleGitCommit}
	/>
{/if}

{#if SettingsDialogComp}
	<SettingsDialogComp
		show={$dialogs.showSettings}
		settings={$settingsData}
		{serverConfig}
		onClose={() => uiStore.updateDialogs({ showSettings: false })}
		onConfirm={() => {
			if (!siteValid) {
				setTimeout(() => window.location.reload(), 200);
				return;
			}
			if ($settings.hugoSitePathUseDotEnv !== savedPathConfig.useDotEnv || $settings.hugoSitePathCustom !== savedPathConfig.customPath || $settings.trashDir !== savedTrashDir || $settings.cmsPort !== savedCmsPort) {
				uiStore.updateDialogs({ showRestartBanner: true });
			}
		}}
		onSave={(s: SettingsData) => {
			if (s.defaultRawMode !== $settings.defaultRawMode || s.showBubbleMenu !== $settings.showBubbleMenu || s.showSlashMenu !== $settings.showSlashMenu || s.historyDepth !== $settings.historyDepth) {
				const captured = editorStore.snapshot().editorContent;
				if (captured) editorStore.editorContent.set(captured.replace(/^(?:---|\+\+\+)[\s\S]*?(?:---|\+\+\+)\n*/, ''));
				settingsKey++;
			}
			settingsStore.updateSettings({
				defaultRawMode: s.defaultRawMode,
				showBubbleMenu: s.showBubbleMenu,
				showSlashMenu: s.showSlashMenu,
				draftByDefault: s.draftByDefault,
				autoSaveDelay: s.autoSaveDelay,
				theme: s.theme,
				editorFont: s.editorFont,
				editorFontSize: s.editorFontSize,
				editorMaxWidth: s.editorMaxWidth,
				editorMaxWidthCustom: s.editorMaxWidthCustom,
				historyDepth: s.historyDepth,
				showFilenameInTabs: s.showFilenameInTabs,
				gitRemote: s.gitRemote,
				gitBranch: s.gitBranch,
				hugoSitePathUseDotEnv: s.hugoSitePathUseDotEnv,
				hugoSitePathCustom: s.hugoSitePathCustom,
				hugoBindAddress: s.hugoBindAddress,
				hugoPort: s.hugoPort,
				cmsBindAddress: s.cmsBindAddress,
				cmsPort: s.cmsPort,
				trashDir: s.trashDir,
			});
			settingsStore.updateLayout({
				sidebarOpen: s.sidebarOpen,
				sidebarWidth: s.sidebarWidth,
				fmOpen: s.fmOpen,
				fmWidth: s.fmWidth,
				fmRawMode: s.fmRawMode,
				sidebarView: s.sidebarView,
				showConsole: s.showConsole,
				showPreview: s.showPreview,
				showGit: s.showGit,
			});
		}}
	/>
{/if}

{#if NewSiteDialogComp}
	<NewSiteDialogComp
		show={$dialogs.showNewSiteDialog}
		onClose={() => uiStore.updateDialogs({ showNewSiteDialog: false })}
		onSiteCreated={() => {
			uiStore.updateDialogs({ showNewSiteDialog: false });
			window.location.reload();
		}}
	/>
{/if}

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg);
		flex-shrink: 0;
		height: 48px;
	}

	.action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 12px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
		height: 34px;
	}

	.action-bar-left,
	.action-bar-right {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.action-bar-center {
		display: flex;
		align-items: center;
		gap: 2px;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-logo {
		height: 24px;
		width: auto;
	}

	.header-brand h2 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
	}

	.hugo-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
		margin-right: 4px;
		white-space: nowrap;
	}

	.hugo-indicator:hover:not(:disabled) {
		background: var(--c-bg-muted);
	}

	.hugo-indicator:disabled {
		cursor: default;
		opacity: 0.8;
	}

	.hugo-indicator.running {
		color: var(--c-success);
		border-color: var(--c-success-border);
	}

	.hugo-indicator.running:hover:not(:disabled) {
		background: var(--c-danger-bg);
		color: var(--c-danger);
		border-color: var(--c-danger-border);
	}

	.hugo-indicator.error {
		color: var(--c-danger);
		border-color: var(--c-danger-border);
	}

	.hugo-indicator.loading {
		color: var(--c-warning);
		border-color: var(--c-warning-border);
	}

	.hugo-indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		transition: all 0.3s;
	}

	.hugo-indicator:not(.running):not(.loading):not(.error) .hugo-indicator-dot {
		background: var(--c-text-muted);
	}

	.hugo-indicator.running .hugo-indicator-dot {
		background: var(--c-success);
		box-shadow: 0 0 6px var(--c-success);
	}

	.hugo-indicator.running:hover:not(:disabled) .hugo-indicator-dot {
		background: var(--c-danger);
		box-shadow: 0 0 6px var(--c-danger);
	}

	.hugo-indicator.loading .hugo-indicator-dot {
		background: var(--c-warning);
		box-shadow: 0 0 6px var(--c-warning);
		animation: hugo-pulse 0.8s ease-in-out infinite;
	}

	.hugo-indicator.error .hugo-indicator-dot {
		background: var(--c-danger);
		box-shadow: 0 0 6px var(--c-danger);
		animation: hugo-pulse 0.4s ease-in-out infinite;
	}

	@keyframes hugo-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.app-body {
		display: flex;
		flex: 1;
		overflow: hidden;
		min-height: 0;
	}


	.action-bar .icon-btn {
		width: 26px;
		height: 26px;
		border: none;
		background: transparent;
		color: var(--c-text-muted);
	}

	.action-bar .icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.action-bar .icon-btn.network-toggle {
		width: auto;
		gap: 4px;
		padding: 0 6px;
		font-size: 11px;
	}

	.action-bar .toggle-label {
		font-weight: 500;
		white-space: nowrap;
	}

	.action-bar .icon-btn.network-toggle.active {
		background: var(--c-success-bg);
		color: var(--c-success);
	}

	.action-bar .icon-btn.network-toggle.active:hover {
		background: var(--c-success-border);
	}

	.action-bar .icon-btn.network-toggle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.editor-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.editor-panel-body {
		flex: 1;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		min-height: 0;
	}

	.editor-panel-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.editor-fixed-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		z-index: 20;
		background: var(--c-bg);
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 48px;
	}

	.conflict-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: var(--c-warning-bg);
		border-bottom: 1px solid var(--c-warning);
		flex-shrink: 0;
		font-size: 13px;
		color: var(--c-warning);
	}

	.conflict-icon {
		display: flex;
		flex-shrink: 0;
	}

	.conflict-text {
		flex: 1;
		font-weight: 500;
	}

	.conflict-btn {
		padding: 4px 12px;
		border: 1px solid var(--c-warning);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: var(--c-warning);
		transition: all 0.12s;
	}

	.conflict-btn:hover {
		background: var(--c-warning);
		color: white;
	}

	.conflict-btn.primary {
		background: var(--c-warning);
		color: white;
	}

	.conflict-btn.primary:hover {
		background: var(--c-warning);
		opacity: 0.85;
	}

	.app-body :global(.sidebar) {
		width: 100%;
		min-width: 0;
	}

	.app-body.sidebar-collapsed :global(.sidebar) {
		display: none;
	}

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

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.header-right .icon-btn {
		width: 26px;
		height: 26px;
		border: none;
		background: transparent;
		color: var(--c-text-muted);
	}

	.header-right .icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.filename {
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text-secondary);
		font-family: var(--font-mono);
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;
		transition: all 0.12s;
		color: var(--c-text-muted);
	}

	.save-btn.saved { color: var(--c-text-muted); cursor: default; }
	.save-btn.saved:hover { background: transparent; }

	.save-btn.unsaved { color: var(--c-text-secondary); }
	.save-btn.unsaved:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.save-btn.saving { color: var(--c-primary); pointer-events: none; }
	.save-btn.saving :global(.spin) { animation: spin 0.8s linear infinite; }

	@keyframes spin { to { transform: rotate(360deg); } }

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

	.icon-btn.active {
		background: var(--c-primary-bg);
		color: var(--c-primary);
		border-color: var(--c-primary-light);
	}

	.editor-body {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.editor-main {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-width: 0;
	}

	.editor-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.fm-sidebar {
		border-left: 1px solid var(--c-border);
		background: var(--c-bg-sidebar);
		overflow-y: auto;
		flex-shrink: 0;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.fm-sidebar::-webkit-scrollbar {
		display: none;
	}

	.fm-resize-handle {
		width: 5px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.fm-resize-handle::before {
		content: '';
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 2px;
		width: 1px;
		background: var(--c-border);
		transition: background 0.15s;
	}

	.fm-resize-handle:hover,
	.fm-resize-handle:active {
		background: var(--c-primary);
	}

	.fm-resize-handle:hover::before,
	.fm-resize-handle:active::before {
		background: var(--c-primary);
	}

	.preview-resize-handle {
		width: 7px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.12s;
	}

	.preview-resize-handle:hover,
	.preview-resize-handle:active {
		background: var(--c-primary);
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		color: var(--c-text-muted);
	}

	.empty-state .hugo-logo {
		width: 260px;
		max-width: 85%;
		opacity: 0.8;
	}

	.empty-state p {
		font-size: 14px;
	}

	.skeleton-block {
		height: 16px;
		background: linear-gradient(90deg, var(--c-border-light) 25%, var(--c-border) 50%, var(--c-border-light) 75%);
		background-size: 200% 100%;
		border-radius: var(--radius-sm);
		animation: shimmer 1.5s ease-in-out infinite;
	}

	.skeleton-block.short {
		width: 60%;
	}

	.editor-loading {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 48px;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.restart-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--c-warning-bg);
		color: var(--c-warning);
		font-size: 13px;
		border-bottom: 1px solid var(--c-warning);
		flex-shrink: 0;
	}

	.restart-banner-close {
		border: none;
		background: transparent;
		color: var(--c-warning);
		cursor: pointer;
		font-size: 14px;
		padding: 2px 6px;
		line-height: 1;
	}

	.restart-banner-close:hover {
		opacity: 0.7;
	}

	.setup-overlay {
		position: fixed;
		inset: 0;
		background: var(--c-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.setup-card {
		text-align: center;
		max-width: 400px;
		padding: 32px;
	}
	.setup-logo {
		width: 80px;
		margin-bottom: 16px;
		opacity: 0.9;
	}
	.setup-card h2 {
		margin: 0 0 8px;
		font-size: 20px;
		color: var(--c-text);
	}
	.setup-desc {
		margin: 0 0 28px;
		font-size: 14px;
		color: var(--c-text-secondary);
		line-height: 1.5;
	}
	.setup-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 20px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
	}
	.btn-secondary:hover {
		background: var(--c-bg-muted);
	}
</style>
