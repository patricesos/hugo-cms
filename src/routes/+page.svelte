<script lang="ts">
	import { onMount } from 'svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import RestartBanner from '$lib/components/RestartBanner.svelte';
	import SidebarContainer from '$lib/components/SidebarContainer.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import ActionBar from '$lib/components/ActionBar.svelte';
	import EditorPanelContainer from '$lib/components/EditorPanelContainer.svelte';
	import SetupOverlay from '$lib/components/SetupOverlay.svelte';
	import { hugoStore } from '$lib/stores/hugo.svelte';
	import { gitStore } from '$lib/stores/git.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { settingsStore, settingsData } from '$lib/stores/settings.svelte';
	import type { SettingsData } from '$lib/stores/settings.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { startConflictPoll, stopConflictPoll, handleVisibilityChange } from '$lib/conflict';
	import { fileTreeStore } from '$lib/stores/fileTree.svelte';
	import { restoreAppState as restoreState } from '$lib/restore';
	import { getClientConfig, getServerConfig } from '$lib/client-config';

	// Stores source de vérité unique
	const { tabs, currentSlug, editorContent, currentFrontmatter, currentFmFormat, wordCount, charCount, saveState, saveRequest, loading, currentArchetype, currentConfigSlug, conflictSlug, currentTab } = editorStore;
	const { settings, layout } = settingsStore;
	const { dialogs } = uiStore;
	const { status: gitStatus } = gitStore;

	// Arbres (store dedie)
	const { tree, assetTree, archetypeTree, configTree, archetypes, directories, searchEntries, loadTree, loadAssetTree, loadArchetypes, loadConfigTree, loadSiteTree } = fileTreeStore;

	// Injection des getters editor dans settingsStore pour le persist (evite l'import direct)
	settingsStore.setEditorGetters(
		() => $tabs,
		() => $currentSlug
	);

	// References composants lazy-loaded
	let CreateFileDialogComp = $state<any>(null);
	let CreateFolderDialogComp = $state<any>(null);
	let SearchDialogComp = $state<any>(null);
	let ShortcutsHelpComp = $state<any>(null);
	let HugoConsoleComp = $state<any>(null);
	let SettingsDialogComp = $state<any>(null);
	let CommitDialogComp = $state<any>(null);
	let NewSiteDialogComp = $state<any>(null);
	let ThemeSelectorComp = $state<any>(null);
	let AboutDialogComp = $state<any>(null);

	// Etat one-time (serveur, hydratation)
	let clientCfg = $state<{ externalPollInterval: number; fmSaveDelay: number; appTitle: string; trashDir: string } | null>(null);
	let serverConfig = $state<import('$lib/client-config').ServerConfig | null>(null);
	let hydrated = $state(false);
	let siteValid = $state(true);
	let editorPanelRef = $state<any>(null);

	// Snapshots settings pour detecter les changements dans SettingsDialog
	let savedPathConfig = $state({ useDotEnv: true, customPath: '' });
	let savedTrashDir = $state('_trash');
	let savedCmsPort = $state(1703);

	// --- Fonctions Hugo ---
	async function checkHugoStatus() {
		await hugoStore.check();
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
		};
	});

	// Lazy-imports declenches par l'etat des stores
	$effect(() => { if ($dialogs.showCreateDialog && !CreateFileDialogComp) import('$lib/components/CreateFileDialog.svelte').then(m => CreateFileDialogComp = m.default); });
	$effect(() => { if ($dialogs.showCreateFolderDialog && !CreateFolderDialogComp) import('$lib/components/CreateFolderDialog.svelte').then(m => CreateFolderDialogComp = m.default); });
	$effect(() => { if ($dialogs.showSearch && !SearchDialogComp) import('$lib/components/SearchDialog.svelte').then(m => SearchDialogComp = m.default); });
	$effect(() => { if ($dialogs.showShortcuts && !ShortcutsHelpComp) import('$lib/components/ShortcutsHelp.svelte').then(m => ShortcutsHelpComp = m.default); });
	$effect(() => { if ($layout.showConsole && !HugoConsoleComp) import('$lib/components/HugoConsole.svelte').then(m => HugoConsoleComp = m.default); });
	$effect(() => { if ($dialogs.showSettings && !SettingsDialogComp) import('$lib/components/SettingsDialog.svelte').then(m => SettingsDialogComp = m.default); });
	$effect(() => { if ($dialogs.showCommitDialog && !CommitDialogComp) import('$lib/components/CommitDialog.svelte').then(m => CommitDialogComp = m.default); });
	$effect(() => { if ($dialogs.showNewSiteDialog && !NewSiteDialogComp) import('$lib/components/NewSiteDialog.svelte').then(m => NewSiteDialogComp = m.default); });
	$effect(() => { if ($dialogs.showThemeSelector && !ThemeSelectorComp) import('$lib/components/ThemeSelector.svelte').then(m => ThemeSelectorComp = m.default); });
	$effect(() => { if ($dialogs.showAbout && !AboutDialogComp) import('$lib/components/AboutDialog.svelte').then(m => AboutDialogComp = m.default); });

	// Theme (base sur $settings.theme)
	$effect(() => {
		const t = $settings.theme;
		const unsub = settingsStore.applyTheme(t);
		return () => { if (unsub) unsub(); };
	});

	// --- Fonctions editeur ---
	async function loadFile(slug: string) {
		await editorStore.loadFile(slug, loadTree);
		if ($currentSlug === slug && $layout.sidebarView !== 'all' && $layout.sidebarView !== 'site') {
			settingsStore.updateLayout({ sidebarView: 'content' });
		}
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
		try {
			if ($dialogs.createFolderIsSite) {
				const fullSlug = parent ? `${parent}/${folderName}` : folderName;
				const res = await fetch(`/api/site/mkdir/${fullSlug}`, { method: 'POST' });
				if (res.ok) await loadSiteTree();
			} else {
				await editorStore.handleCreateFolder(folderName, parent, loadTree);
			}
		} finally {
			uiStore.closeCreateFolderDialog();
		}
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

	// --- Fonctions Git ---
	async function refreshGitStatus() {
		await gitStore.refresh();
	}

	async function handleGitCommit(message: string, files: string[]) {
		await gitStore.commit(message, files);
	}

	// --- Restauration d'etat ---
	async function restoreAppState() {
		const { activeSlug, shouldInitGit } = await restoreState();
		if (activeSlug) await editorStore.switchToTab(activeSlug);
		if (shouldInitGit) {
			gitStore.initialized.set(true);
			await refreshGitStatus();
		}
		hydrated = true;
		settingsStore.setHydrated();
	}
</script>

<div class="app-shell">
	<AppHeader />
	{#if $dialogs.showRestartBanner}
		<RestartBanner />
	{/if}
	{#if !siteValid}
	<SetupOverlay />
	{/if}
	<ActionBar />
	<div class="app-body" class:sidebar-collapsed={!$layout.sidebarOpen}>
	<SidebarContainer
		onLoadFile={loadFile}
		onDelete={handleDelete}
		onDeleteFolder={handleDeleteFolder}
		onRenameFile={handleRename}
		onDuplicateFile={handleDuplicate}
	/>

	<EditorPanelContainer onLoadFile={loadFile} bind:this={editorPanelRef} />
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
				editorPanelRef?.bumpRemountKey?.();
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

<ConfirmDialog />

{#if ThemeSelectorComp}
	<ThemeSelectorComp
		show={$dialogs.showThemeSelector}
		onClose={() => uiStore.updateDialogs({ showThemeSelector: false })}
	/>
{/if}

{#if AboutDialogComp}
	<AboutDialogComp
		show={$dialogs.showAbout}
		onClose={() => uiStore.updateDialogs({ showAbout: false })}
	/>
{/if}

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		overflow: hidden;
	}

	.app-body {
		display: flex;
		flex: 1;
		overflow: hidden;
		min-height: 0;
	}
	.app-body :global(.sidebar) {
		width: 100%;
		min-width: 0;
	}

	.app-body.sidebar-collapsed :global(.sidebar) {
		display: none;
	}

</style>
