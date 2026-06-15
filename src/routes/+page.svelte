<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { PanelRightOpen, PanelRightClose, PenLine, FileText, Trash2, Search, PanelLeftClose, PanelLeftOpen } from '@lucide/svelte';
	import Editor from '$lib/components/Editor.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import FrontMatterEditor from '$lib/components/FrontMatterEditor.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import CreateFileDialog from '$lib/components/CreateFileDialog.svelte';
	import SearchDialog from '$lib/components/SearchDialog.svelte';
	import ShortcutsHelp from '$lib/components/ShortcutsHelp.svelte';

	interface TreeNode {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		children?: TreeNode[];
		frontmatter?: Record<string, unknown>;
	}

	let tree = $state<TreeNode[]>([]);
	let currentSlug = $state<string | null>(null);
	let currentFrontmatter = $state<Record<string, unknown>>({});
	let editorContent = $state('');
	let wordCount = $state(0);
	let charCount = $state(0);
	let saveState = $state<'saved' | 'unsaved' | 'saving'>('saved');
	let loading = $state(false);
	let fmOpen = $state(true);
	let showCreateDialog = $state(false);
	let showSearch = $state(false);
	let showShortcuts = $state(false);
	let sidebarOpen = $state(true);

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
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				showSearch = true;
			}
			if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
				showShortcuts = true;
			}
		}
		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	async function loadTree() {
		const res = await fetch('/api/content?tree=true');
		tree = await res.json();
	}

	async function loadFile(slug: string) {
		loading = true;
		currentSlug = slug;
		const res = await fetch(`/api/content/${slug}`);
		const data = await res.json();
		editorContent = data.body || '';
		currentFrontmatter = (data.frontmatter as Record<string, unknown>) || {};
		loading = false;
	}

	async function handleSave(markdown: string) {
		if (!currentSlug) return;
		await fetch(`/api/content/${currentSlug}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: markdown, frontmatter: currentFrontmatter }),
		});
	}

	function handleFrontmatterChange(fm: Record<string, unknown>) {
		currentFrontmatter = fm;
		saveState = 'unsaved';
	}

	async function handleCreate(title: string, section: string) {
		const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		const fullSlug = section ? `${section}/${slug}` : slug;
		const frontmatter = { title, date: new Date().toISOString().split('T')[0], draft: true };
		await fetch(`/api/content/${fullSlug}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body: '', frontmatter }),
		});
		showCreateDialog = false;
		await loadTree();
		await loadFile(fullSlug);
	}

	async function handleDelete(slug?: string) {
		const target = slug || currentSlug;
		if (!target) return;
		if (!window.confirm(`Supprimer "${target}" ?\n\nLe fichier sera déplacé dans _trash/.`)) return;
		await fetch(`/api/content/${target}`, { method: 'DELETE' });
		if (slug || currentSlug === target) {
			currentSlug = null;
			editorContent = '';
			currentFrontmatter = {};
		}
		await loadTree();
	}
</script>

<div class="cms-layout" class:sidebar-collapsed={!sidebarOpen}>
	{#if sidebarOpen}
		<Sidebar
			tree={tree}
			{currentSlug}
			onRefresh={loadTree}
			onLoadFile={loadFile}
			onCreateFile={() => showCreateDialog = true}
			onDeleteFile={handleDelete}
			onSearch={() => showSearch = true}
			onToggle={() => sidebarOpen = !sidebarOpen}
		/>
	{/if}

	<main class="editor-panel">
		{#if !sidebarOpen}
			<button class="sidebar-reopen" onclick={() => sidebarOpen = true} title="Afficher la sidebar">
				<PanelLeftOpen size={18} />
			</button>
		{/if}
		{#if !currentSlug}
			<div class="empty-state" transition:fade={{ duration: 200 }}>
				<FileText size={48} color="var(--c-text-muted)" strokeWidth={1} />
				<h2>Hugo CMS</h2>
				<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
			</div>
		{:else if loading}
			<div class="loading-state" transition:fade={{ duration: 150 }}>
				<div class="skeleton-block"></div>
				<div class="skeleton-block short"></div>
				<div class="skeleton-block"></div>
			</div>
		{:else}
			<div class="editor-header" transition:fade={{ duration: 150 }}>
				<div class="header-left">
					<PenLine size={14} color="var(--c-text-muted)" />
					<span class="filename">{currentSlug}.md</span>
				</div>
				<div class="header-actions">
					<button class="icon-btn delete-btn" onclick={handleDelete} title="Supprimer">
						<Trash2 size={15} />
					</button>
					<button class="icon-btn fm-toggle" onclick={() => fmOpen = !fmOpen} title={fmOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}>
						{#if fmOpen}
							<PanelRightClose size={15} />
						{:else}
							<PanelRightOpen size={15} />
						{/if}
					</button>
				</div>
			</div>
			<div class="editor-body" class:with-fm={fmOpen}>
				<div class="editor-area">
					<Editor
						content={editorContent}
						onSave={handleSave}
						onStats={(s) => { wordCount = s.words; charCount = s.chars; }}
						onSaveState={(s) => { saveState = s; }}
					/>
				</div>
				{#if fmOpen}
					<aside class="fm-sidebar" transition:slide={{ duration: 200, axis: 'x' }}>
						<FrontMatterEditor
							frontmatter={currentFrontmatter}
							onChange={handleFrontmatterChange}
						/>
					</aside>
				{/if}
			</div>
			<StatusBar {wordCount} {charCount} {saveState} onHelp={() => showShortcuts = true} />
		{/if}
	</main>
</div>

<CreateFileDialog
	show={showCreateDialog}
	{directories}
	onClose={() => showCreateDialog = false}
	onCreate={handleCreate}
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
	.cms-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.editor-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.sidebar-reopen {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 1px solid var(--c-border);
		background: var(--c-bg);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--c-text-muted);
		box-shadow: var(--shadow-sm);
		transition: all 0.12s;
	}

	.sidebar-reopen:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
		border-color: var(--c-border);
	}

	.cms-layout :global(.sidebar) {
		transition: width 0s;
	}

	.cms-layout.sidebar-collapsed :global(.sidebar) {
		display: none;
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

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

	.editor-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.fm-sidebar {
		width: 280px;
		min-width: 280px;
		border-left: 1px solid var(--c-border);
		background: var(--c-bg-sidebar);
		overflow-y: auto;
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

	.empty-state h2 {
		font-size: 18px;
		color: var(--c-text-secondary);
		margin-top: 8px;
	}

	.empty-state p {
		font-size: 14px;
	}

	.loading-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 48px;
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
