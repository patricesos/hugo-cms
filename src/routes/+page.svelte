<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { PanelRightOpen, PanelRightClose, PenLine, Search, PanelLeftClose, PanelLeftOpen, Save, Loader2, CheckCircle2, RefreshCw, AlertTriangle, Eye, FileText, FilePlus, FolderPlus, Map } from '@lucide/svelte';
	import Editor from '$lib/components/Editor.svelte';
	import SitemapView from '$lib/components/SitemapView.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import FrontMatterEditor from '$lib/components/FrontMatterEditor.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import CreateFileDialog from '$lib/components/CreateFileDialog.svelte';
	import CreateFolderDialog from '$lib/components/CreateFolderDialog.svelte';
	import SearchDialog from '$lib/components/SearchDialog.svelte';
	import ShortcutsHelp from '$lib/components/ShortcutsHelp.svelte';
	import HugoPreview from '$lib/components/HugoPreview.svelte';
	import ArchetypeView from '$lib/components/ArchetypeView.svelte';

	interface TreeNode {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNode[];
		frontmatter?: Record<string, unknown>;
	}

	interface Tab {
		slug: string;
		title: string;
		content: string;
		frontmatter: Record<string, unknown>;
		mtimeMs: number;
		frontmatterLanguage?: 'yaml' | 'toml';
	}

	let tree = $state<TreeNode[]>([]);
	let assetTree = $state<TreeNode[]>([]);
	let archetypeTree = $state<TreeNode[]>([]);
	let tabs = $state<Tab[]>([]);
	let currentSlug = $state<string | null>(null);
	let currentFrontmatter = $state<Record<string, unknown>>({});
	let currentFmFormat = $state<'yaml' | 'toml'>('yaml');
	let editorContent = $state('');
	let editorGetContent = $state<(() => string) | null>(null);
	let editorSetContent = $state<((content: string) => void) | null>(null);
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
	let sidebarOpen = $state(true);
	let sidebarView = $state<'content' | 'static' | 'archetypes'>('content');
	let currentArchetype = $state<string | null>(null);
	let sidebarWidth = $state(260);
	let showSitemap = $state(false);
	let showPreview = $state(false);
	let fmWidth = $state(280);
	let archetypes = $state<{ name: string; label: string }[]>([]);
	let conflictSlug = $state<string | null>(null);
	let conflictServerMtimeMs = $state(0);

	let conflictPollTimer: ReturnType<typeof setInterval> | null = null;

	function startConflictPoll() {
		stopConflictPoll();
		conflictPollTimer = setInterval(checkExternalChanges, 5000);
	}

	function stopConflictPoll() {
		if (conflictPollTimer) {
			clearInterval(conflictPollTimer);
			conflictPollTimer = null;
		}
	}

	async function checkExternalChanges() {
		if (!currentSlug || saveState === 'unsaved') return;
		const tab = tabs.find(t => t.slug === currentSlug);
		if (!tab) return;
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

	function resolveConflict(action: 'reload' | 'overwrite') {
		if (!conflictSlug) return;
		const tab = tabs.find(t => t.slug === conflictSlug);
		if (!tab) { conflictSlug = null; return; }
		if (action === 'reload') {
			reloadFileFromDisk(tab);
		}
		conflictSlug = null;
	}

	async function reloadFileFromDisk(tab: Tab) {
		try {
			const res = await fetch(`/api/content/${tab.slug}`);
			const data = await res.json();
			tab.content = data.body || '';
			tab.frontmatter = (data.frontmatter as Record<string, unknown>) || {};
			tab.mtimeMs = data.mtimeMs;
			tab.frontmatterLanguage = data.frontmatterLanguage ?? 'yaml';
			tab.title = (data.frontmatter?.title as string) || tab.slug.split('/').pop() || '';
			if (currentSlug === tab.slug) {
				editorContent = tab.content;
				currentFrontmatter = { ...tab.frontmatter };
				currentFmFormat = tab.frontmatterLanguage;
				editorSetContent?.(tab.content);
			}
		} catch {
			// ignore
		}
	}

	function startResize(e: MouseEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = sidebarWidth;
		function onMove(ev: MouseEvent) {
			const newWidth = Math.max(180, Math.min(500, startWidth + ev.clientX - startX));
			sidebarWidth = newWidth;
		}
		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	function startFmResize(e: MouseEvent) {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = fmWidth;
		function onMove(ev: MouseEvent) {
			const newWidth = Math.max(200, Math.min(500, startWidth - (ev.clientX - startX)));
			fmWidth = newWidth;
		}
		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}

	let directories = $derived(
		tree.filter((n) => n.type === 'directory').map((n) => ({ slug: n.slug, name: n.name }))
	);

	let searchEntries = $derived(
		flattenTree(tree).map((n) => ({
			slug: n.slug,
			title: (n.frontmatter?.title as string) || n.name.replace(/\.md$/, ''),
			type: n.type as 'file' | 'directory',
		}))
	);

	function flattenTree(nodes: TreeNode[]): TreeNode[] {
		const result: TreeNode[] = [];
		for (const n of nodes) {
			if (n.type === 'file') result.push(n);
			if (n.children) result.push(...flattenTree(n.children));
		}
		return result;
	}

	onMount(() => {
		loadTree();
		loadAssetTree();
		loadArchetypes();
		startConflictPoll();
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
		}
		document.addEventListener('keydown', handleKeydown);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			stopConflictPoll();
		};
	});

	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
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

	async function loadFile(slug: string) {
		const existing = tabs.find(t => t.slug === slug);
		if (existing) {
			await switchToTab(slug);
			return;
		}
		loading = true;
		const res = await fetch(`/api/content/${slug}`);
		const data = await res.json();
		const tab: Tab = {
			slug,
			title: (data.frontmatter?.title as string) || slug.split('/').pop() || '',
			content: data.body || '',
			frontmatter: (data.frontmatter as Record<string, unknown>) || {},
			mtimeMs: data.mtimeMs ?? 0,
			frontmatterLanguage: data.frontmatterLanguage ?? 'yaml',
		};
		tabs = [...tabs, tab];
		await switchToTab(slug);
		loading = false;
	}

	async function switchToTab(slug: string) {
		if (editorGetContent && currentSlug) {
			const currentTab = tabs.find(t => t.slug === currentSlug);
			if (currentTab) {
				currentTab.content = editorGetContent();
				currentTab.frontmatter = { ...currentFrontmatter };
			}
		}
		const tab = tabs.find(t => t.slug === slug);
		if (!tab) return;
		currentSlug = tab.slug;
		editorContent = tab.content;
		currentFrontmatter = { ...tab.frontmatter };
		currentFmFormat = tab.frontmatterLanguage ?? 'yaml';
		editorSetContent?.(tab.content);
	}

	async function handleSave(markdown: string) {
		if (!currentSlug) return;
		const tab = tabs.find(t => t.slug === currentSlug);
		if (!tab) return;
		const expectedMtimeMs = tab.mtimeMs;
		tab.content = markdown;
		tab.frontmatter = { ...currentFrontmatter };
		const res = await fetch(`/api/content/${currentSlug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: markdown, frontmatter: currentFrontmatter, expectedMtimeMs, frontmatterLanguage: tab.frontmatterLanguage ?? 'yaml' }),
		});
		if (res.status === 409) {
			const { serverMtimeMs } = await res.json();
			conflictSlug = currentSlug;
			conflictServerMtimeMs = serverMtimeMs;
			return;
		}
		if (res.ok) {
			const data = await res.json();
			tab.mtimeMs = data.mtimeMs ?? tab.mtimeMs;
		}
	}

	function handleFrontmatterChange(fm: Record<string, unknown>) {
		currentFrontmatter = fm;
		saveState = 'unsaved';
		if (currentSlug) {
			const tab = tabs.find(t => t.slug === currentSlug);
			if (tab) tab.frontmatter = fm;
			updateTreeFrontmatter(currentSlug, fm);
		}
	}

	function updateTreeFrontmatter(slug: string, fm: Record<string, unknown>) {
		function walk(nodes: TreeNode[]): boolean {
			for (const n of nodes) {
				if (n.slug === slug) {
					n.frontmatter = fm;
					return true;
				}
				if (n.children && walk(n.children)) return true;
			}
			return false;
		}
		walk(tree);
		tree = tree; // trigger reactivity
	}

	async function handleCreate(title: string, section: string, archetype?: string) {
		const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		const fullSlug = section ? `${section}/${slug}` : slug;
		const frontmatter = { title, date: new Date().toISOString().split('T')[0], draft: true };
		const body: string = await fetch(`/api/content/${fullSlug}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: '', frontmatter, archetype: archetype || 'default' }),
		}).then(r => r.json()).then(d => d.body || '');
		showCreateDialog = false;
		await loadTree();
		await loadFile(fullSlug);
	}

	async function handleDeleteFolder(slug: string) {
		if (!window.confirm(`Supprimer le dossier "${slug}" ?\n\nTout son contenu sera déplacé dans _trash/.`)) return;
		await fetch(`/api/directory/${slug}`, { method: 'DELETE' });
		tabs = tabs.filter(t => t.slug !== slug && !t.slug.startsWith(slug + '/'));
		if (tabs.length === 0) {
			currentSlug = null;
			editorContent = '';
		} else if (!tabs.find(t => t.slug === currentSlug)) {
			currentSlug = tabs[tabs.length - 1].slug;
			const tab = tabs.find(t => t.slug === currentSlug)!;
			editorContent = tab.content;
		}
		await loadTree();
	}

	async function handleCreateFolder(folderName: string, parent: string) {
		const fullSlug = parent ? `${parent}/${folderName}` : folderName;
		await fetch(`/api/directory/${fullSlug}`, { method: 'POST' });
		showCreateFolderDialog = false;
		await loadTree();
	}

	async function handleDelete(slug?: string) {
		const target = slug || currentSlug;
		if (!target) return;
		if (!window.confirm(`Supprimer "${target}" ?\n\nLe fichier sera déplacé dans _trash/.`)) return;
		await fetch(`/api/content/${target}`, { method: 'DELETE' });
		tabs = tabs.filter(t => t.slug !== target);
		if (slug || currentSlug === target) {
			currentSlug = tabs.length > 0 ? tabs[tabs.length - 1].slug : null;
			if (currentSlug) {
				const tab = tabs.find(t => t.slug === currentSlug)!;
				editorContent = tab.content;
				currentFrontmatter = { ...tab.frontmatter };
			} else {
				editorContent = '';
				currentFrontmatter = {};
			}
		}
		await loadTree();
	}

	async function handleRename(oldSlug: string, newSlug: string) {
		const res = await fetch(`/api/content/${oldSlug}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ newSlug }),
		});
		if (!res.ok) return;
		tabs = tabs.map(t => t.slug === oldSlug ? { ...t, slug: newSlug, title: newSlug.split('/').pop() || newSlug } : t);
		if (currentSlug === oldSlug) {
			currentSlug = newSlug;
		}
		await loadTree();
	}

	async function handleDuplicate(slug: string) {
		let content: string;
		let frontmatter: Record<string, unknown>;

		const existingTab = tabs.find(t => t.slug === slug);
		if (existingTab) {
			content = existingTab.content;
			frontmatter = { ...existingTab.frontmatter };
		} else {
			const res = await fetch(`/api/content/${slug}`);
			const data = await res.json();
			content = data.body || '';
			frontmatter = (data.frontmatter as Record<string, unknown>) || {};
		}

		const allSlugs = new Set([
			...tabs.map(t => t.slug),
			...flattenTree(tree).map(n => n.slug),
		]);

		const baseSlug = slug.replace(/\.md$/, '') + '-copy';
		let newSlug = baseSlug;
		let counter = 0;

		while (allSlugs.has(newSlug)) {
			counter++;
			newSlug = `${baseSlug}-${counter + 1}`;
		}

		const newTitle = (frontmatter.title as string) ? `${frontmatter.title} (copie)` : slug.split('/').pop() || '';
		const newFrontmatter = { ...frontmatter, title: newTitle, date: new Date().toISOString().split('T')[0] };

		await fetch(`/api/content/${newSlug}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: content, frontmatter: newFrontmatter }),
		});

		await loadTree();
		await loadFile(newSlug);
	}

	function handleCloseTab(slug: string) {
		const idx = tabs.findIndex(t => t.slug === slug);
		if (idx === -1) return;
		tabs = tabs.filter(t => t.slug !== slug);
		if (currentSlug === slug) {
			const nextTab = tabs[Math.min(idx, tabs.length - 1)];
			if (nextTab) {
				currentSlug = nextTab.slug;
				editorContent = nextTab.content;
				currentFrontmatter = { ...nextTab.frontmatter };
				editorSetContent?.(nextTab.content);
			} else {
				currentSlug = null;
				editorContent = '';
				currentFrontmatter = {};
			}
		}
	}
</script>

<div class="app-shell">
	<header class="app-header">
		<div class="header-brand">
			<FileText size={20} color="var(--c-primary)" />
			<h2>Hugo CMS</h2>
		</div>
	</header>
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
			<button class="icon-btn" onclick={() => { loadTree(); loadAssetTree(); }} title="Rafraîchir">
				<RefreshCw size={16} />
			</button>
			<button class="icon-btn" onclick={() => showSitemap = !showSitemap} title="Sitemap visuel">
				<Map size={16} />
			</button>
			<button class="icon-btn" class:active={showPreview} onclick={() => showPreview = !showPreview} title="Aperçu Hugo (Cmd+Shift+P)">
				<Eye size={16} />
			</button>
		</div>
		<div class="action-bar-right">
			<button class="icon-btn fm-toggle" onclick={() => fmOpen = !fmOpen} title={fmOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}>
				{#if fmOpen}
					<PanelRightClose size={16} />
				{:else}
					<PanelRightOpen size={16} />
				{/if}
			</button>
		</div>
	</div>
	<div class="app-body" class:sidebar-collapsed={!sidebarOpen}>
	{#if sidebarOpen}
		<div class="sidebar-wrap" style="width: {sidebarWidth}px">
			<Sidebar
				tree={tree}
				{assetTree}
				{archetypeTree}
				{currentSlug}
				{sidebarView}
				onLoadFile={loadFile}
				onCreateFileInFolder={(slug) => { createFileSection = slug; showCreateDialog = true; }}
				onCreateFolderInFolder={(slug) => { createFolderParent = slug; showCreateFolderDialog = true; }}
				onDeleteFile={handleDelete}
				onDeleteFolder={handleDeleteFolder}
				onRenameFile={handleRename}
				onDuplicateFile={handleDuplicate}
				onSelectAsset={(path) => window.open(`/api/assets/${path}`, '_blank')}
				onSelectArchetype={(slug) => { currentArchetype = slug; }}
				onViewChange={(v) => { sidebarView = v; if (v !== 'archetypes') currentArchetype = null; }}
			/>
		</div>
		<div class="resize-handle" role="presentation" onmousedown={startResize}></div>
	{/if}

	<main class="editor-panel">
		{#if currentSlug || tabs.length > 0}
			<TabBar {tabs} activeSlug={currentSlug ?? ''} onSelect={loadFile} onClose={handleCloseTab} />
		{/if}
		{#if sidebarView === 'archetypes'}
			<ArchetypeView
				slug={currentArchetype}
				onClose={() => currentArchetype = null}
				onDelete={(s) => { loadArchetypes(); currentArchetype = null; }}
			/>
		{:else if showSitemap && !currentSlug}
			<SitemapView {tree} {currentSlug} onLoadFile={(slug) => { loadFile(slug); showSitemap = false; }} onRefresh={loadTree} />
		{:else if !currentSlug}
			{#if !showSitemap}
				<div class="empty-state" transition:fade={{ duration: 200 }}>
					<img class="hugo-logo" src="/hugo-logo.svg" alt="Hugo logo" />
					<h2>Hugo CMS</h2>
					<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
				</div>
			{/if}
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
				</div>
				<div class="editor-body" class:with-fm={fmOpen} class:with-preview={showPreview}>
					<div class="editor-main">
						<div class="editor-area">
							<Editor
								content={editorContent}
								frontmatter={currentFrontmatter}
								frontmatterFormat={currentFmFormat}
								{saveRequest}
								getContent={(fn) => { editorGetContent = fn; }}
								onSetContent={(fn) => { editorSetContent = fn; }}
								onSave={handleSave}
								onFrontmatterChange={(fm) => { currentFrontmatter = fm; }}
								onStats={(s) => { wordCount = s.words; charCount = s.chars; }}
								onSaveState={(s) => { saveState = s; }}
							/>
						</div>
						{#if fmOpen}
							<div class="fm-resize-handle" role="presentation" onmousedown={startFmResize}></div>
							<aside class="fm-sidebar" style="width: {fmWidth}px; min-width: {fmWidth}px;" transition:slide={{ duration: 200, axis: 'x' }}>
								<FrontMatterEditor
									frontmatter={currentFrontmatter}
									format={currentFmFormat}
									onChange={handleFrontmatterChange}
								/>
							</aside>
						{/if}
					</div>
					{#if showPreview}
						<HugoPreview show={showPreview} onClose={() => showPreview = false} />
					{/if}
				</div>
				<StatusBar {wordCount} {charCount} {saveState} onHelp={() => showShortcuts = true} />
			</div>
		{/if}
	</main>
	</div>
</div>

<CreateFileDialog
	show={showCreateDialog}
	{directories}
	{archetypes}
	presetSection={createFileSection}
	onClose={() => showCreateDialog = false}
	onCreate={handleCreate}
/>

<CreateFolderDialog
	show={showCreateFolderDialog}
	parentSlug={createFolderParent}
	onClose={() => showCreateFolderDialog = false}
	onCreate={handleCreateFolder}
/>

<SearchDialog
	show={showSearch}
	entries={searchEntries}
	onSelect={loadFile}
	onClose={() => showSearch = false}
/>

<ShortcutsHelp
	show={showShortcuts}
	onClose={() => showShortcuts = false}
/>

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

	.header-brand h2 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
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

	.editor-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
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
		background: #fef3c7;
		border-bottom: 1px solid #f59e0b;
		flex-shrink: 0;
		font-size: 13px;
		color: #92400e;
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
		border: 1px solid #f59e0b;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: #92400e;
		transition: all 0.12s;
	}

	.conflict-btn:hover {
		background: #f59e0b;
		color: white;
	}

	.conflict-btn.primary {
		background: #f59e0b;
		color: white;
	}

	.conflict-btn.primary:hover {
		background: #d97706;
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
		width: 4px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.resize-handle:hover,
	.resize-handle:active {
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

	.icon-btn.delete-btn:hover {
		background: #fef2f2;
		color: var(--c-danger);
		border-color: #fecaca;
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

	.editor-body.with-preview .editor-main {
		width: 50%;
		min-width: 320px;
		flex-shrink: 0;
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
		width: 4px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.fm-resize-handle:hover,
	.fm-resize-handle:active {
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
		width: 360px;
		max-width: 80%;
		opacity: 0.3;
	}

	.empty-state h2 {
		font-size: 18px;
		color: var(--c-text-secondary);
		margin-top: 8px;
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

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}
</style>
