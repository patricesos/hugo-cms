<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { PanelRightOpen, PanelRightClose, PenLine, Search, PanelLeftClose, PanelLeftOpen, Save, Loader2, CheckCircle2, RefreshCw, AlertTriangle, Eye, FileText, FilePlus, FolderPlus, Map, Terminal, GitBranch, Settings, ExternalLink, Play, Square, Globe, Lock, FolderOpen, Plus } from '@lucide/svelte';
	import SitemapView from '$lib/components/SitemapView.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import FrontMatterEditor from '$lib/components/FrontMatterEditor.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { TreeNode } from '$lib/server/types';
	import { hugoStore } from '$lib/stores/hugo.svelte';
	import { gitStore } from '$lib/stores/git.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import type { Tab as EditorTab } from '$lib/stores/editor.svelte';
	import { startSidebarResize, startFmResize, startPreviewResize, cleanupAllResize } from '$lib/resize';

	type TabKind = 'content' | 'static' | 'archetype' | 'config';

	interface Tab {
		slug: string;
		title: string;
		content: string;
		frontmatter: Record<string, unknown>;
		mtimeMs: number;
		frontmatterLanguage?: 'yaml' | 'toml';
		kind: TabKind;
	}

	let tree = $state<TreeNode[]>([]);
	let assetTree = $state<TreeNode[]>([]);
	let archetypeTree = $state<TreeNode[]>([]);
	let tabs = $state<Tab[]>([]);
	let currentSlug = $state<string | null>(null);
	let currentFrontmatter = $state<Record<string, unknown>>({});
	let currentFmFormat = $state<'yaml' | 'toml'>('yaml');
	let editorContent = $state('');
	let wordCount = $state(0);
	let charCount = $state(0);
	let saveState = $state<'saved' | 'unsaved' | 'saving'>('saved');
	let saveRequest = $state(0);
	let loading = $state(false);
	let fmOpen = $state(true);
	let showCreateDialog = $state(false);
	let createFileSection = $state('');
	let showCreateFolderDialog = $state(false);
	let createFolderParent = $state('');
	let showSearch = $state(false);
	let showShortcuts = $state(false);
	let fmSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let sidebarOpen = $state(true);
	let sidebarView = $state<'content' | 'static' | 'archetypes' | 'config'>('content');
	let showGit = $state(false);
	let gitRemote = $state('origin');
	let gitBranch = $state('main');
	let hugoSitePathUseDotEnv = $state(true);
	let hugoSitePathCustom = $state('');
	let hugoBindAddress = $state('127.0.0.1');
	let hugoPort = $state(1313);
	let cmsBindAddress = $state('127.0.0.1');
	let cmsPort = $state(1703);
	let trashDir = $state('_trash');
	let savedPathConfig = $state({ useDotEnv: true, customPath: '' });
	let showRestartBanner = $state(false);
	let showSettings = $state(false);

	function reloadPreview() {
		hugoStore.reloadPreview();
		if (!showPreview) showPreview = true;
	}

	async function startHugoServer() {
		await hugoStore.start();
		const s = hugoStore.snapshot();
		hugoStatus = s.status;
		hugoUrl = s.url;
		hugoLive = s.live;
		previewReloadKey = s.previewReloadKey;
	}

	async function stopHugoServer() {
		await hugoStore.stop();
		const s = hugoStore.snapshot();
		hugoStatus = s.status;
		hugoUrl = s.url;
		hugoLive = s.live;
	}

	async function checkHugoStatus() {
		await hugoStore.check();
		const s = hugoStore.snapshot();
		hugoStatus = s.status;
		hugoUrl = s.url;
		hugoLive = s.live;
	}

	async function toggleHugoLive() {
		await hugoStore.toggleLive();
		const s = hugoStore.snapshot();
		hugoStatus = s.status;
		hugoUrl = s.url;
		hugoLive = s.live;
		hugoTogglingLive = s.togglingLive;
		previewReloadKey = s.previewReloadKey;
	}

	function openPreviewInTab() {
		hugoStore.openPreviewInTab();
	}
	let defaultRawMode = $state(false);
	let showBubbleMenu = $state(true);
	let showSlashMenu = $state(true);
	let draftByDefault = $state(true);
	let autoSaveDelay = $state(2000);
	let theme = $state('system');
	let editorFont = $state('serif');
	let editorFontSize = $state('normal');
	let editorMaxWidth = $state('720px');
	let editorMaxWidthCustom = $state(720);
	let historyDepth = $state(250);
	let showFilenameInTabs = $state(false);
	let settingsKey = $state(0);
	let gitStatus = $state<{ branch: string; modified: string[]; added: string[]; deleted: string[]; renamed: string[]; staged: string[]; untracked: string[]; ahead: number; behind: number } | null>(null);
	let gitLoading = $state(false);
	let showCommitDialog = $state(false);
	let GitSidebarComp = $state<any>(null);
	let CommitDialogComp = $state<any>(null);
	let currentArchetype = $state<string | null>(null);
	let sidebarWidth = $state(260);
	let showSitemap = $state(false);
	let showPreview = $state(false);
	let showConsole = $state(false);
	let consoleHeight = $state(200);
	let fmWidth = $state(280);
	let fmRawMode = $state(false);
	let previewWidth = $state(480);
	let archetypes = $state<{ name: string; label: string }[]>([]);
	let configTree = $state<TreeNode[]>([]);
	let currentConfigSlug = $state<string | null>(null);
	let conflictSlug = $state<string | null>(null);
	let conflictServerMtimeMs = $state(0);
	let expandedSlugs = $state<Set<string>>(new Set());
	let hugoStatus = $state<'loading' | 'running' | 'stopped' | 'error'>('stopped');
	let hugoUrl = $state<string | null>(null);
	let hugoLive = $state(false);
	let hugoTogglingLive = $state(false);
	let previewReloadKey = $state(0);
	let hydrated = $state(false);
	let siteValid = $state(true);
	let showNewSiteDialog = $state(false);
	let NewSiteDialogComp = $state<any>(null);

	let savedTrashDir = $state('_trash');
	let savedCmsPort = $state(1703);

	$effect(() => {
		if (showSettings) {
			savedPathConfig = { useDotEnv: hugoSitePathUseDotEnv, customPath: hugoSitePathCustom };
			savedTrashDir = trashDir;
			savedCmsPort = cmsPort;
		}
	});

	// Lazy-loaded component references
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

	import { getClientConfig, getServerConfig } from '$lib/client-config';

	const STORAGE_KEY = 'hugo-cms-state';

	function saveAppState() {
		if (!hydrated) return;
		const state = {
			tabs: tabs.map(t => ({ slug: t.slug, title: t.title, frontmatterLanguage: t.frontmatterLanguage, kind: t.kind })),
			currentSlug,
			sidebarOpen,
			sidebarView,
			sidebarWidth,
			fmOpen,
			showPreview,
			showConsole,
			showGit,
			consoleHeight,
			fmWidth,
			previewWidth,
			expandedSlugs: [...expandedSlugs],
			settings: { defaultRawMode, showBubbleMenu, showSlashMenu, draftByDefault, autoSaveDelay, theme, editorFont, editorFontSize, editorMaxWidth, editorMaxWidthCustom, historyDepth, sidebarOpen, sidebarWidth, fmOpen, fmWidth, fmRawMode, sidebarView, showConsole, showPreview, showGit, gitRemote, gitBranch, hugoSitePathUseDotEnv, hugoSitePathCustom, showFilenameInTabs, hugoBindAddress, hugoPort, cmsBindAddress, cmsPort, trashDir },
		};
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
		fetch('/api/user-settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(state.settings),
		}).catch(() => {});
	}

	async function restoreAppState() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const state = JSON.parse(raw);
				sidebarOpen = state.sidebarOpen ?? true;
				sidebarView = state.sidebarView ?? 'content';
				sidebarWidth = state.sidebarWidth ?? 260;
				fmOpen = state.fmOpen ?? true;
				showPreview = state.showPreview ?? false;
				showConsole = state.showConsole ?? false;
				showGit = state.showGit ?? false;
				if (showGit) {
					gitInitialized = true;
					await refreshGitStatus();
				}
				consoleHeight = state.consoleHeight ?? 200;
				fmWidth = state.fmWidth ?? 280;
				previewWidth = state.previewWidth ?? 480;
				if (state.settings) {
					defaultRawMode = state.settings.defaultRawMode ?? false;
					showBubbleMenu = state.settings.showBubbleMenu ?? true;
					showSlashMenu = state.settings.showSlashMenu ?? true;
					draftByDefault = state.settings.draftByDefault ?? true;
					showFilenameInTabs = state.settings.showFilenameInTabs ?? false;
					theme = state.settings.theme ?? 'system';
					editorFont = state.settings.editorFont ?? 'serif';
					editorFontSize = state.settings.editorFontSize ?? 'normal';
					editorMaxWidth = state.settings.editorMaxWidth ?? '720px';
					editorMaxWidthCustom = state.settings.editorMaxWidthCustom ?? 720;
					historyDepth = state.settings.historyDepth ?? 250;
					autoSaveDelay = state.settings.autoSaveDelay ?? 2000;
					gitRemote = state.settings.gitRemote ?? 'origin';
					gitBranch = state.settings.gitBranch ?? 'main';
					fmRawMode = state.settings.fmRawMode ?? false;
				hugoSitePathUseDotEnv = state.settings.hugoSitePathUseDotEnv ?? true;
				hugoSitePathCustom = state.settings.hugoSitePathCustom ?? '';
				hugoBindAddress = state.settings.hugoBindAddress ?? '127.0.0.1';
				hugoPort = state.settings.hugoPort ?? 1313;
				cmsBindAddress = state.settings.cmsBindAddress ?? '127.0.0.1';
				cmsPort = state.settings.cmsPort ?? 1703;
				trashDir = state.settings.trashDir ?? '_trash';
			}
				if (state.expandedSlugs) expandedSlugs = new Set(state.expandedSlugs);
				if (state.tabs && state.currentSlug) {
					const restored: Tab[] = state.tabs.map((t: { slug: string; title: string; frontmatterLanguage?: string; kind?: TabKind; isImage?: boolean }) => {
						const kind: TabKind = t.kind ?? (t.isImage ? 'static' : 'content');
						return { slug: t.slug, title: t.title, content: '', frontmatter: {}, mtimeMs: 0, frontmatterLanguage: (t.frontmatterLanguage ?? 'yaml') as 'yaml' | 'toml', kind };
					});
					tabs = restored;
					currentSlug = state.currentSlug;
					const contentTabs = restored.filter(t => t.kind === 'content');
					await Promise.all(contentTabs.map(async (t) => {
						try {
							const res = await fetch(`/api/content/${t.slug}`);
							const data = await res.json();
							t.content = data.body || '';
							t.frontmatter = (data.frontmatter as Record<string, unknown>) || {};
							t.mtimeMs = data.mtimeMs ?? 0;
							t.frontmatterLanguage = data.frontmatterLanguage ?? 'yaml';
						} catch { /* ignore */ }
					}));
					const active = restored.find(t => t.slug === state.currentSlug);
					if (active) {
						if (active.kind === 'content') {
							editorContent = active.content;
							currentFrontmatter = { ...active.frontmatter };
							currentFmFormat = active.frontmatterLanguage ?? 'yaml';
							editorStore.setEditorSetContent?.(active.content);
						}
						switchToTab(state.currentSlug);
					}
				}
			}
			hydrated = true;
		} catch {
			hydrated = true;
		}
		// fetch user settings from file system (overrides localStorage + defaults)
		try {
			const res = await fetch('/api/user-settings');
			if (res.ok) {
				const s = await res.json() as Record<string, unknown>;
				if (s.defaultRawMode !== undefined) defaultRawMode = s.defaultRawMode as boolean;
				if (s.showBubbleMenu !== undefined) showBubbleMenu = s.showBubbleMenu as boolean;
				if (s.showSlashMenu !== undefined) showSlashMenu = s.showSlashMenu as boolean;
				if (s.draftByDefault !== undefined) draftByDefault = s.draftByDefault as boolean;
				if (s.autoSaveDelay !== undefined) autoSaveDelay = s.autoSaveDelay as number;
				if (s.theme !== undefined) theme = s.theme as string;
				if (s.editorFont !== undefined) editorFont = s.editorFont as string;
				if (s.editorFontSize !== undefined) editorFontSize = s.editorFontSize as string;
				if (s.editorMaxWidth !== undefined) editorMaxWidth = s.editorMaxWidth as string;
				if (s.editorMaxWidthCustom !== undefined) editorMaxWidthCustom = s.editorMaxWidthCustom as number;
				if (s.historyDepth !== undefined) historyDepth = s.historyDepth as number;
				if (s.fmRawMode !== undefined) fmRawMode = s.fmRawMode as boolean;
				if (s.sidebarOpen !== undefined) sidebarOpen = s.sidebarOpen as boolean;
				if (s.fmOpen !== undefined) fmOpen = s.fmOpen as boolean;
				if (s.showConsole !== undefined) showConsole = s.showConsole as boolean;
				if (s.showPreview !== undefined) showPreview = s.showPreview as boolean;
				if (s.showGit !== undefined) showGit = s.showGit as boolean;
				if (s.gitRemote !== undefined) gitRemote = s.gitRemote as string;
				if (s.gitBranch !== undefined) gitBranch = s.gitBranch as string;
				if (s.hugoSitePathUseDotEnv !== undefined) hugoSitePathUseDotEnv = s.hugoSitePathUseDotEnv as boolean;
				if (s.hugoSitePathCustom !== undefined) hugoSitePathCustom = s.hugoSitePathCustom as string;
				if (s.hugoBindAddress !== undefined) hugoBindAddress = s.hugoBindAddress as string;
				if (s.hugoPort !== undefined) hugoPort = s.hugoPort as number;
				if (s.cmsBindAddress !== undefined) cmsBindAddress = s.cmsBindAddress as string;
				if (s.cmsPort !== undefined) cmsPort = s.cmsPort as number;
				if (s.trashDir !== undefined) trashDir = s.trashDir as string;
				if (s.showFilenameInTabs !== undefined) showFilenameInTabs = s.showFilenameInTabs as boolean;
			}
		} catch {}
	}
	$effect(() => {
		tabs;
		currentSlug;
		sidebarOpen;
		sidebarView;
		sidebarWidth;
		fmOpen;
		fmWidth;
		fmRawMode;
		expandedSlugs;
		showPreview;
		showConsole;
		showGit;
		gitRemote;
		gitBranch;
		consoleHeight;
		defaultRawMode;
		showBubbleMenu;
		showSlashMenu;
		draftByDefault;
		autoSaveDelay;
		theme;
		editorFont;
		editorFontSize;
		editorMaxWidth;
		editorMaxWidthCustom;
		historyDepth;
		hugoSitePathUseDotEnv;
		hugoSitePathCustom;
		hugoBindAddress;
		hugoPort;
		cmsBindAddress;
		cmsPort;
		trashDir;
		previewWidth;
		saveAppState();
	});

	let currentTab = $derived(tabs.find(t => t.slug === currentSlug));

	let clientCfg = $state<{ externalPollInterval: number; fmSaveDelay: number; appTitle: string; trashDir: string } | null>(null);
	let serverConfig = $state<import('$lib/client-config').ServerConfig | null>(null);
	let conflictPollTimer: ReturnType<typeof setInterval> | null = null;

	function startConflictPoll() {
		stopConflictPoll();
		if (!currentSlug) return;
		const interval = clientCfg?.externalPollInterval ?? 5000;
		conflictPollTimer = setInterval(checkExternalChanges, interval);
	}

	function stopConflictPoll() {
		if (conflictPollTimer) {
			clearInterval(conflictPollTimer);
			conflictPollTimer = null;
		}
	}

	$effect(() => {
		currentSlug;
		if (currentSlug) {
			startConflictPoll();
		} else {
			stopConflictPoll();
		}
	});

	async function checkExternalChanges() {
		if (!currentSlug || saveState === 'unsaved') return;
		const tab = tabs.find(t => t.slug === currentSlug);
		if (!tab || tab.kind !== 'content') return;
		try {
			const res = await fetch(`/api/content/${currentSlug}`);
			if (!res.ok) return;
			const data = await res.json();
			const serverMtime: number = data.mtimeMs;
			if (Math.abs(serverMtime - tab.mtimeMs) > 1) {
				conflictSlug = currentSlug;
				conflictServerMtimeMs = serverMtime;
			}
		} catch {
			// ignore fetch errors
		}
	}

	function syncEditor() {
		const s = editorStore.snapshot();
		tabs = s.tabs;
		currentSlug = s.currentSlug;
		editorContent = s.editorContent;
		currentFrontmatter = s.currentFrontmatter;
		currentFmFormat = s.currentFmFormat;
		wordCount = s.wordCount;
		charCount = s.charCount;
		saveState = s.saveState;
		saveRequest = s.saveRequest;
		loading = s.loading;
		currentArchetype = s.currentArchetype;
		currentConfigSlug = s.currentConfigSlug;
		conflictSlug = s.conflictSlug;
		conflictServerMtimeMs = s.conflictServerMtimeMs;
		currentTab = s.currentTab;
	}

	function resolveConflict(action: 'reload' | 'overwrite') {
		if (!conflictSlug) return;
		const tab = tabs.find(t => t.slug === conflictSlug);
		if (!tab) { editorStore.conflictSlug.set(null); conflictSlug = null; return; }
		if (action === 'reload') {
			editorStore.reloadFileFromDisk(tab).then(syncEditor);
		}
		editorStore.conflictSlug.set(null);
		conflictSlug = null;
	}

	const startResize = startSidebarResize(() => sidebarWidth, (w) => { sidebarWidth = w; });
	const startFmResizeHandler = startFmResize(() => fmWidth, (w) => { fmWidth = w; });
	const startPreviewResizeHandler = startPreviewResize(() => previewWidth, (w) => { previewWidth = w; });

	let directories = $derived(
		tree.filter((n) => n.type === 'directory').map((n) => ({ slug: n.slug, name: n.name }))
	);

	let searchEntries = $derived(
		editorStore.flattenTree(tree).map((n) => ({
			slug: n.slug,
			title: (n.frontmatter?.title as string) || n.name.replace(/\.md$/, ''),
			type: n.type as 'file' | 'directory',
		}))
	);

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
		// Lazy-load Editor on mount (not needed during SSR)
		import('$lib/components/Editor.svelte').then(m => EditorComp = m.default);
		function handleKeydown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			if (mod && !e.shiftKey && e.code === 'KeyP') {
				e.preventDefault();
				showSearch = true;
			}
			if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
				showShortcuts = true;
			}
			if (mod && e.shiftKey && e.code === 'KeyP') {
				e.preventDefault();
				showPreview = !showPreview;
			}
			if (mod && e.code === 'Backquote') {
				e.preventDefault();
				showConsole = !showConsole;
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

	// Lazy-import dialogs/panels when they become visible
	$effect(() => { if (showCreateDialog && !CreateFileDialogComp) import('$lib/components/CreateFileDialog.svelte').then(m => CreateFileDialogComp = m.default); });
	$effect(() => { if (showCreateFolderDialog && !CreateFolderDialogComp) import('$lib/components/CreateFolderDialog.svelte').then(m => CreateFolderDialogComp = m.default); });
	$effect(() => { if (showSearch && !SearchDialogComp) import('$lib/components/SearchDialog.svelte').then(m => SearchDialogComp = m.default); });
	$effect(() => { if (showShortcuts && !ShortcutsHelpComp) import('$lib/components/ShortcutsHelp.svelte').then(m => ShortcutsHelpComp = m.default); });
	$effect(() => { if (showPreview && !HugoPreviewComp) import('$lib/components/HugoPreview.svelte').then(m => HugoPreviewComp = m.default); });
	$effect(() => { if (showConsole && !HugoConsoleComp) import('$lib/components/HugoConsole.svelte').then(m => HugoConsoleComp = m.default); });
	$effect(() => { if (showSettings && !SettingsDialogComp) import('$lib/components/SettingsDialog.svelte').then(m => SettingsDialogComp = m.default); });
	$effect(() => { if (currentTab?.kind === 'archetype' && !ArchetypeViewComp) import('$lib/components/ArchetypeView.svelte').then(m => ArchetypeViewComp = m.default); });
	$effect(() => { if (currentTab?.kind === 'config' && !ConfigViewComp) import('$lib/components/ConfigView.svelte').then(m => ConfigViewComp = m.default); });
	$effect(() => { if (currentTab?.kind === 'static' && !ImageViewComp) import('$lib/components/ImageView.svelte').then(m => ImageViewComp = m.default); });
	$effect(() => { if (showGit && !GitSidebarComp) import('$lib/components/GitSidebar.svelte').then(m => GitSidebarComp = m.default); });
	$effect(() => { if (showCommitDialog && !CommitDialogComp) import('$lib/components/CommitDialog.svelte').then(m => CommitDialogComp = m.default); });
	$effect(() => { if (showNewSiteDialog && !NewSiteDialogComp) import('$lib/components/NewSiteDialog.svelte').then(m => NewSiteDialogComp = m.default); });

	$effect(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		function apply() {
			if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
			else if (theme === 'light') document.documentElement.dataset.theme = 'light';
			else document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
		}
		apply();
		mq.addEventListener('change', apply);
		return () => mq.removeEventListener('change', apply);
	});

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible' && currentSlug) {
			checkExternalChanges();
		}
	}

	async function loadTree() {
		const res = await fetch('/api/content?tree=true');
		tree = await res.json();
	}

	async function loadAssetTree() {
		try {
			const res = await fetch('/api/assets?tree=true');
			assetTree = await res.json();
		} catch {}
	}

	async function loadArchetypes() {
		try {
			const [flatRes, treeRes] = await Promise.all([
				fetch('/api/archetypes'),
				fetch('/api/archetypes?tree=true'),
			]);
			archetypes = await flatRes.json();
			archetypeTree = await treeRes.json();
		} catch {
			archetypes = [];
			archetypeTree = [];
		}
	}

	async function loadConfigTree() {
		try {
			const res = await fetch('/api/config?tree=true');
			configTree = await res.json();
		} catch {
			configTree = [];
		}
	}

	async function loadFile(slug: string) {
		await editorStore.loadFile(slug, loadTree);
		syncEditor();
		if (editorStore.snapshot().currentSlug === slug) {
			sidebarView = 'content';
		}
	}

	async function switchToTab(slug: string) {
		await editorStore.switchToTab(slug);
		syncEditor();
		const tab = tabs.find(t => t.slug === slug);
		if (tab) {
			if (tab.kind === 'archetype') sidebarView = 'archetypes';
			else if (tab.kind === 'config') sidebarView = 'config';
			else if (tab.kind === 'static') sidebarView = 'static';
			else sidebarView = 'content';
		}
	}

	async function handleSave(markdown: string) {
		await editorStore.handleSave(markdown);
		syncEditor();
	}

	function handleFrontmatterChange(fm: Record<string, unknown>) {
		currentFrontmatter = fm;
		editorStore.currentFrontmatter.set(fm);
		saveState = 'unsaved';
		editorStore.saveState.set('unsaved');
		if (currentSlug) {
			const tab = tabs.find(t => t.slug === currentSlug);
			if (tab) tab.frontmatter = fm;
			tree = editorStore.updateTreeFrontmatter(tree, currentSlug, fm);
		}
		if (fmSaveTimeout) clearTimeout(fmSaveTimeout);
		const delay = clientCfg?.fmSaveDelay ?? 2000;
		fmSaveTimeout = setTimeout(() => { saveRequest++; editorStore.saveRequest.update(r => r + 1); }, delay);
	}

	async function handleCreate(title: string, section: string, archetype?: string) {
		const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		const fullSlug = section ? `${section}/${slug}` : slug;
		const frontmatter: Record<string, unknown> = { title, date: new Date().toISOString().split('T')[0] };
		if (draftByDefault) frontmatter.draft = true;
		await fetch(`/api/content/${fullSlug}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: '', frontmatter, archetype: archetype || 'default' }),
		});
		showCreateDialog = false;
		await loadTree();
		await loadFile(fullSlug);
	}

	async function handleDeleteFolder(slug: string) {
		const trashDirName = clientCfg?.trashDir ?? '_trash';
		await editorStore.handleDeleteFolder(slug, trashDirName, loadTree);
		syncEditor();
	}

	async function handleCreateFolder(folderName: string, parent: string) {
		await editorStore.handleCreateFolder(folderName, parent, loadTree);
		showCreateFolderDialog = false;
	}

	async function handleDelete(slug?: string) {
		const trashDirName = clientCfg?.trashDir ?? '_trash';
		await editorStore.handleDelete(slug, trashDirName, loadTree);
		syncEditor();
	}

	async function handleRename(oldSlug: string, newSlug: string) {
		await editorStore.handleRename(oldSlug, newSlug, loadTree);
		syncEditor();
	}

	async function handleDuplicate(slug: string) {
		await editorStore.handleDuplicate(slug, tree, loadTree);
		syncEditor();
	}

	function handleCloseTab(slug: string) {
		editorStore.handleCloseTab(slug);
		syncEditor();
	}

	async function refreshGitStatus() {
		await gitStore.refresh();
		const s = gitStore.snapshot();
		gitStatus = s.status;
		gitLoading = s.loading;
	}

	async function handleGitInit() {
		await gitStore.init();
		const s = gitStore.snapshot();
		gitStatus = s.status;
		gitLoading = s.loading;
		gitInitialized = s.initialized;
	}

	async function handleGitCommit(message: string, files: string[]) {
		await gitStore.commit(message, files);
		const s = gitStore.snapshot();
		gitStatus = s.status;
		gitLoading = s.loading;
	}

	async function handleGitPush() {
		await gitStore.push();
		const s = gitStore.snapshot();
		gitStatus = s.status;
		gitLoading = s.loading;
	}

	let gitInitialized = $state(false);

	function toggleGit() {
		showGit = !showGit;
		if (showGit && !gitStatus && !gitInitialized) {
			gitInitialized = true;
			refreshGitStatus();
		}
	}

</script>

<div class="app-shell">
	<header class="app-header">
		<div class="header-brand">
			<img src="/favicon.svg" alt="Hugo" class="header-logo" />
			<h2>Hugo CMS</h2>
		</div>
	</header>
	{#if showRestartBanner}
	<div class="restart-banner">
		<span>Chemin du site modifié. Redémarrez le serveur pour appliquer.</span>
		<button class="restart-banner-close" onclick={() => showRestartBanner = false}>✕</button>
	</div>
	{/if}
	{#if !siteValid}
	<div class="setup-overlay">
		<div class="setup-card">
			<img src="/favicon.svg" alt="Hugo" class="setup-logo" />
			<h2>Bienvenue dans Hugo CMS</h2>
			<p class="setup-desc">Aucun site Hugo configuré. Choisissez un dossier existant ou créez-en un nouveau.</p>
			<div class="setup-actions">
				<button class="btn-primary" onclick={() => showSettings = true}>
					<FolderOpen size={16} />
					Ouvrir un dossier existant
				</button>
				<button class="btn-secondary" onclick={() => showNewSiteDialog = true}>
					<Plus size={16} />
					Créer un nouveau site
				</button>
			</div>
		</div>
	</div>
	{/if}
	<div class="action-bar">
		<div class="action-bar-left">
			<button class="icon-btn" onclick={() => sidebarOpen = !sidebarOpen} title={sidebarOpen ? 'Réduire la sidebar' : 'Afficher la sidebar'}>
				{#if sidebarOpen}
					<PanelLeftClose size={16} />
				{:else}
					<PanelLeftOpen size={16} />
				{/if}
			</button>
		</div>
		<div class="action-bar-center">
			<button class="icon-btn" onclick={() => showSearch = true} title="Rechercher (Ctrl+P)">
				<Search size={16} />
			</button>
			<button class="icon-btn" onclick={() => { createFileSection = ''; showCreateDialog = true; }} title="Nouveau fichier">
				<FilePlus size={16} />
			</button>
			<button class="icon-btn" onclick={() => { createFolderParent = ''; showCreateFolderDialog = true; }} title="Nouveau dossier">
				<FolderPlus size={16} />
			</button>
			<button class="icon-btn" onclick={() => { loadTree(); loadAssetTree(); loadConfigTree(); }} title="Rafraîchir">
				<RefreshCw size={16} />
			</button>
			<button class="icon-btn" onclick={() => showSitemap = !showSitemap} title="Sitemap visuel">
				<Map size={16} />
			</button>
			<button class="icon-btn" class:active={showPreview} onclick={() => showPreview = !showPreview} title="Aperçu Hugo (Cmd+Shift+P)">
				<Eye size={16} />
			</button>
			<button class="icon-btn" class:active={showConsole} onclick={() => showConsole = !showConsole} title="Console Hugo">
				<Terminal size={16} />
			</button>
			<button class="icon-btn" class:active={showGit} onclick={toggleGit} title="Git">
				<GitBranch size={16} />
			</button>
		</div>
		<div class="action-bar-right">
			<button
				class="icon-btn network-toggle"
				class:active={hugoLive}
				onclick={toggleHugoLive}
				disabled={hugoTogglingLive}
				title={hugoLive ? 'Restreindre au local' : 'Exposer sur le réseau'}
			>
				{#if hugoTogglingLive}
					<Loader2 size={13} class="spin" />
				{:else if hugoLive}
					<Globe size={13} />
					<span class="toggle-label">Réseau</span>
				{:else}
					<Lock size={13} />
					<span class="toggle-label">Local</span>
				{/if}
			</button>
			<button
				class="hugo-indicator"
				class:running={hugoStatus === 'running'}
				class:loading={hugoStatus === 'loading'}
				class:error={hugoStatus === 'error'}
				onclick={hugoStatus === 'running' ? stopHugoServer : hugoStatus === 'stopped' || hugoStatus === 'error' ? startHugoServer : undefined}
				disabled={hugoStatus === 'loading'}
				title={hugoStatus === 'running' ? 'Arrêter le serveur' : hugoStatus === 'loading' ? 'Démarrage…' : hugoStatus === 'error' ? 'Relancer le serveur' : 'Démarrer le serveur'}
			>
				<span class="hugo-indicator-dot"></span>
				<span class="hugo-indicator-label">
					{ hugoStatus === 'running' ? 'Actif' : hugoStatus === 'loading' ? 'Démarrage…' : hugoStatus === 'error' ? 'Erreur' : 'Arrêté' }
				</span>
			</button>
			{#if hugoStatus === 'running'}
				<button class="icon-btn" onclick={openPreviewInTab} title="Ouvrir dans un onglet">
					<ExternalLink size={14} />
				</button>
				<button class="icon-btn" onclick={reloadPreview} title="Recharger">
					<RefreshCw size={15} />
				</button>
			{/if}
			<button class="icon-btn" onclick={() => showSettings = true} title="Paramètres">
				<Settings size={16} />
			</button>
		</div>
	</div>
	<div class="app-body" class:sidebar-collapsed={!sidebarOpen}>
	{#if sidebarOpen}
		<div class="sidebar-wrap" style="width: {sidebarWidth}px">
			{#if showGit && GitSidebarComp}
				<GitSidebarComp
					status={gitStatus}
					loading={gitLoading}
					onRefresh={refreshGitStatus}
					onCommit={() => showCommitDialog = true}
					onPush={handleGitPush}
					onInit={handleGitInit}
				/>
			{:else}
				<Sidebar
					tree={tree}
					{assetTree}
					{archetypeTree}
					{configTree}
					{currentSlug}
					{sidebarView}
					{expandedSlugs}
					onLoadFile={loadFile}
					onCreateFileInFolder={(slug) => { createFileSection = slug; showCreateDialog = true; }}
					onCreateFolderInFolder={(slug) => { createFolderParent = slug; showCreateFolderDialog = true; }}
					onDeleteFile={handleDelete}
					onDeleteFolder={handleDeleteFolder}
					onRenameFile={handleRename}
					onDuplicateFile={handleDuplicate}
					onToggleFolder={(slug) => {
						const next = new Set(expandedSlugs);
						if (next.has(slug)) next.delete(slug); else next.add(slug);
						expandedSlugs = next;
					}}
					onSelectAsset={(path) => {
						const ext = path.split('.').pop()?.toLowerCase();
						if (ext && /^(png|jpg|jpeg|gif|svg|webp|avif|ico)$/i.test(ext)) {
							const slug = path;
							const existing = tabs.find(t => t.slug === slug);
							if (existing) { switchToTab(slug); return; }
							const tab: Tab = {
								slug,
								title: slug.split('/').pop() || slug,
								content: '',
								frontmatter: {},
								mtimeMs: 0,
								kind: 'static',
							};
							tabs = [...tabs, tab];
							switchToTab(slug);
						} else {
							window.open(`/api/assets/${path}`, '_blank');
						}
					}}
					onSelectArchetype={(slug) => {
						const existing = tabs.find(t => t.slug === slug);
						if (existing) { switchToTab(slug); return; }
						tabs = [...tabs, {
							slug, title: slug.split('/').pop() || slug,
							content: '', frontmatter: {}, mtimeMs: 0, kind: 'archetype',
						}];
						currentArchetype = slug;
						switchToTab(slug);
					}}
					onSelectConfig={(slug) => {
						const existing = tabs.find(t => t.slug === slug);
						if (existing) { switchToTab(slug); return; }
						tabs = [...tabs, {
							slug, title: slug.split('/').pop() || slug,
							content: '', frontmatter: {}, mtimeMs: 0, kind: 'config',
						}];
						currentConfigSlug = slug;
						switchToTab(slug);
					}}
					onViewChange={(v) => { sidebarView = v; if (v === 'config') loadConfigTree(); }}
				/>
			{/if}
		</div>
		<div class="resize-handle" role="presentation" onmousedown={startResize}></div>
	{/if}

	<main class="editor-panel">
		{#if currentSlug || tabs.length > 0}
			<TabBar {tabs} activeSlug={currentSlug ?? ''} {showFilenameInTabs} onSelect={(slug) => { const t = tabs.find(tab => tab.slug === slug); if (t?.kind === 'content') loadFile(slug); else switchToTab(slug); }} onClose={handleCloseTab} />
		{/if}
		<div class="editor-panel-body">
			<div class="editor-panel-content">
				{#if currentTab?.kind === 'archetype'}
					{#if ArchetypeViewComp}
						<ArchetypeViewComp
							slug={currentArchetype}
							onClose={() => { tabs = tabs.filter(t => t.slug !== currentSlug); currentArchetype = null; currentSlug = null; }}
							onDelete={(s: string) => { loadArchetypes(); tabs = tabs.filter(t => t.slug !== s); currentArchetype = null; currentSlug = null; }}
						/>
					{/if}
				{:else if currentTab?.kind === 'config'}
					{#if ConfigViewComp}
						<ConfigViewComp
							slug={currentConfigSlug}
							onClose={() => { tabs = tabs.filter(t => t.slug !== currentSlug); currentConfigSlug = null; currentSlug = null; }}
							onDelete={(s: string) => { loadConfigTree(); tabs = tabs.filter(t => t.slug !== s); currentConfigSlug = null; currentSlug = null; }}
						/>
					{/if}
				{:else if showSitemap && !currentSlug}
					<SitemapView {tree} {currentSlug} onLoadFile={(slug) => { loadFile(slug); showSitemap = false; }} onRefresh={loadTree} />
				{:else if !currentSlug}
					{#if !showSitemap}
						<div class="empty-state" transition:fade={{ duration: 200 }}>
							<img class="hugo-logo" src="/hugo-cms.svg" alt="Hugo CMS" />
							<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
						</div>
					{/if}
				{:else if currentTab?.kind === 'static'}
					<div class="editor-fixed-wrap">
						<div class="editor-header">
							<div class="header-left">
								<PenLine size={14} color="var(--c-text-muted)" />
								<span class="filename">{currentSlug}</span>
							</div>
						</div>
						{#key currentSlug}
							{#if ImageViewComp}
								<ImageViewComp slug={currentSlug} assetUrl={`/api/assets/${currentSlug}`} />
							{/if}
						{/key}
					</div>
				{:else}
					<div class="editor-fixed-wrap">
						{#if loading}
							<div class="loading-overlay">
								<div class="skeleton-block"></div>
								<div class="skeleton-block short"></div>
								<div class="skeleton-block"></div>
							</div>
						{/if}
						{#if conflictSlug === currentSlug}
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
								<span class="filename">{currentSlug}.md</span>
								<button
									class="save-btn"
									class:saved={saveState === 'saved'}
									class:unsaved={saveState === 'unsaved'}
									class:saving={saveState === 'saving'}
									onclick={() => saveRequest++}
									title={saveState === 'saving' ? 'Sauvegarde…' : saveState === 'unsaved' ? 'Enregistrer' : 'Enregistré'}
								>
									{#if saveState === 'saving'}
										<Loader2 size={13} class="spin" />
									{:else if saveState === 'unsaved'}
										<Save size={13} />
									{:else}
										<CheckCircle2 size={13} />
									{/if}
								</button>
							</div>
							<div class="header-right">
								<button class="icon-btn fm-toggle" onclick={() => fmOpen = !fmOpen} title={fmOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}>
									{#if fmOpen}
										<PanelRightClose size={14} />
									{:else}
										<PanelRightOpen size={14} />
									{/if}
								</button>
							</div>
						</div>
						<div class="editor-body" class:with-fm={fmOpen}>
							<div class="editor-main">
								<div class="editor-area">
									{#key settingsKey}
									{#if EditorComp}
										<EditorComp
											content={editorContent}
											frontmatter={currentFrontmatter}
											frontmatterFormat={currentFmFormat}
											rawMode={defaultRawMode}
											{showBubbleMenu}
											{showSlashMenu}
											{autoSaveDelay}
											{editorFont}
											{editorFontSize}
											{editorMaxWidth}
											{editorMaxWidthCustom}
											{historyDepth}
											{saveRequest}
											getContent={(fn: () => string) => { editorStore.setEditorGetContent(fn); }}
											onSetContent={(fn: (content: string) => void) => { editorStore.setEditorSetContent(fn); }}
											onSave={handleSave}
											onFrontmatterChange={(fm: Record<string, unknown>) => { currentFrontmatter = fm; if (currentSlug) { const tab = tabs.find(t => t.slug === currentSlug); if (tab) tab.frontmatter = fm; updateTreeFrontmatter(currentSlug, fm); } }}
											onStats={(s: { words: number; chars: number }) => { wordCount = s.words; charCount = s.chars; }}
											onSaveState={(s: 'saved' | 'unsaved' | 'saving') => { saveState = s; }}
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
								{#if fmOpen}
									<div class="fm-resize-handle" role="presentation" onmousedown={startFmResizeHandler}></div>
									<aside class="fm-sidebar" style="width: {fmWidth}px; min-width: {fmWidth}px;" transition:slide={{ duration: 200, axis: 'x' }}>
										<FrontMatterEditor
											frontmatter={currentFrontmatter}
											format={currentFmFormat}
											{fmRawMode}
											onChange={handleFrontmatterChange}
										/>
									</aside>
								{/if}
							</div>
						</div>
						<StatusBar {wordCount} {charCount} {saveState} onHelp={() => showShortcuts = true} />
					</div>
				{/if}
			</div>
			{#if showPreview}
				<div class="preview-resize-handle" role="presentation" onpointerdown={startPreviewResizeHandler}></div>
				{#if HugoPreviewComp}
				<HugoPreviewComp
						show={showPreview}
						onClose={() => showPreview = false}
						onStatusChange={(s: 'loading' | 'running' | 'stopped' | 'error') => hugoStatus = s}
						onUrlChange={(u: string | null) => hugoUrl = u}
						onLiveChange={(v: boolean) => hugoLive = v}
						reloadKey={previewReloadKey}
						style="width:{previewWidth}px;min-width:{previewWidth}px"
					/>
				{/if}
			{/if}
		</div>
	</main>
	</div>
</div>

{#if HugoConsoleComp}
	<HugoConsoleComp show={showConsole} bind:consoleHeight onClose={() => showConsole = false} />
{/if}

{#if CreateFileDialogComp}
	<CreateFileDialogComp
		show={showCreateDialog}
		{directories}
		{archetypes}
		presetSection={createFileSection}
		onClose={() => showCreateDialog = false}
		onCreate={handleCreate}
	/>
{/if}

{#if CreateFolderDialogComp}
	<CreateFolderDialogComp
		show={showCreateFolderDialog}
		parentSlug={createFolderParent}
		onClose={() => showCreateFolderDialog = false}
		onCreate={handleCreateFolder}
	/>
{/if}

{#if SearchDialogComp}
	<SearchDialogComp
		show={showSearch}
		entries={searchEntries}
		onSelect={loadFile}
		onClose={() => showSearch = false}
	/>
{/if}

{#if ShortcutsHelpComp}
	<ShortcutsHelpComp
		show={showShortcuts}
		onClose={() => showShortcuts = false}
	/>
{/if}

{#if CommitDialogComp}
	<CommitDialogComp
		show={showCommitDialog}
		status={gitStatus}
		onClose={() => showCommitDialog = false}
		onCommit={handleGitCommit}
	/>
{/if}

{#if SettingsDialogComp}
	<SettingsDialogComp
		show={showSettings}
		settings={{ defaultRawMode, showBubbleMenu, showSlashMenu, draftByDefault, autoSaveDelay, theme, editorFont, editorFontSize, editorMaxWidth, editorMaxWidthCustom, historyDepth, sidebarOpen, sidebarWidth, fmOpen, fmWidth, fmRawMode, sidebarView, showConsole, showPreview, showGit, gitRemote, gitBranch, hugoSitePathUseDotEnv, hugoSitePathCustom, showFilenameInTabs, hugoBindAddress, hugoPort, cmsBindAddress, cmsPort, trashDir }}
		{serverConfig}
		onClose={() => showSettings = false}
		onConfirm={() => {
			if (!siteValid) {
				setTimeout(() => window.location.reload(), 200);
				return;
			}
			if (hugoSitePathUseDotEnv !== savedPathConfig.useDotEnv || hugoSitePathCustom !== savedPathConfig.customPath || trashDir !== savedTrashDir || cmsPort !== savedCmsPort) {
				showRestartBanner = true;
			}
		}}
		onSave={(s: { defaultRawMode: boolean; showBubbleMenu: boolean; showSlashMenu: boolean; draftByDefault: boolean; autoSaveDelay: number; theme: string; editorFont: string; editorFontSize: string; editorMaxWidth: string; editorMaxWidthCustom: number; historyDepth: number; sidebarOpen: boolean; sidebarWidth: number; fmOpen: boolean; fmWidth: number; fmRawMode: boolean; sidebarView: 'content' | 'static' | 'archetypes' | 'config'; showConsole: boolean; showPreview: boolean; showGit: boolean; showFilenameInTabs: boolean; gitRemote: string; gitBranch: string; hugoSitePathUseDotEnv: boolean; hugoSitePathCustom: string; hugoBindAddress: string; hugoPort: number; cmsBindAddress: string; cmsPort: number; trashDir: string }) => {
			if (s.defaultRawMode !== defaultRawMode || s.showBubbleMenu !== showBubbleMenu || s.showSlashMenu !== showSlashMenu || s.historyDepth !== historyDepth) {
				const captured = editorStore.snapshot().editorContent;
				if (captured) editorStore.editorContent.set(captured.replace(/^(?:---|\+\+\+)[\s\S]*?(?:---|\+\+\+)\n*/, ''));
				settingsKey++;
			}
			defaultRawMode = s.defaultRawMode;
			showBubbleMenu = s.showBubbleMenu;
			showSlashMenu = s.showSlashMenu;
			draftByDefault = s.draftByDefault;
			autoSaveDelay = s.autoSaveDelay;
			theme = s.theme;
			editorFont = s.editorFont;
			editorFontSize = s.editorFontSize;
			editorMaxWidth = s.editorMaxWidth;
			editorMaxWidthCustom = s.editorMaxWidthCustom;
			historyDepth = s.historyDepth;
			sidebarOpen = s.sidebarOpen;
			sidebarWidth = s.sidebarWidth;
			fmOpen = s.fmOpen;
			fmWidth = s.fmWidth;
			fmRawMode = s.fmRawMode;
			showConsole = s.showConsole;
			showPreview = s.showPreview;
			showGit = s.showGit;
			showFilenameInTabs = s.showFilenameInTabs;
			gitRemote = s.gitRemote;
			gitBranch = s.gitBranch;
			hugoSitePathUseDotEnv = s.hugoSitePathUseDotEnv;
			hugoSitePathCustom = s.hugoSitePathCustom;
			hugoBindAddress = s.hugoBindAddress;
			hugoPort = s.hugoPort;
			cmsBindAddress = s.cmsBindAddress;
			cmsPort = s.cmsPort;
			trashDir = s.trashDir;
		}}
	/>
{/if}

{#if NewSiteDialogComp}
	<NewSiteDialogComp
		show={showNewSiteDialog}
		onClose={() => showNewSiteDialog = false}
		onSiteCreated={() => {
			showNewSiteDialog = false;
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

