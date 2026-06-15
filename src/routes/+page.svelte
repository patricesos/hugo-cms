<script lang="ts">
	import { onMount } from 'svelte';
	import Editor from '$lib/components/Editor.svelte';
	import StatusBar from '$lib/components/StatusBar.svelte';
	import FrontMatterEditor from '$lib/components/FrontMatterEditor.svelte';

	interface ContentMeta {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
		frontmatter?: Record<string, unknown>;
	}

	let files = $state<ContentMeta[]>([]);
	let currentDir = $state('');
	let currentSlug = $state<string | null>(null);
	let currentFrontmatter = $state<Record<string, unknown>>({});
	let editorContent = $state('');
	let wordCount = $state(0);
	let charCount = $state(0);
	let saveState = $state<'saved' | 'unsaved' | 'saving'>('saved');
	let loading = $state(false);
	let fmOpen = $state(true);

	onMount(() => { loadFiles(); });

	async function loadFiles(dir = '') {
		currentDir = dir;
		const qs = dir ? `?dir=${encodeURIComponent(dir)}` : '';
		const res = await fetch(`/api/content${qs}`);
		files = await res.json();
	}

	function navigateDir(dir: string) {
		const path = currentDir ? `${currentDir}/${dir}` : dir;
		loadFiles(path);
	}

	function goUp() {
		if (!currentDir) return;
		const parent = currentDir.includes('/') ? currentDir.substring(0, currentDir.lastIndexOf('/')) : '';
		loadFiles(parent);
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

	function isDraft(fm?: Record<string, unknown>): boolean {
		return fm?.draft === true;
	}

	function fileIcon(name: string): string {
		if (name.endsWith('.md')) return '📄';
		return '📁';
	}
</script>

<div class="cms-layout">
	<aside class="sidebar">
		<div class="sidebar-header">
			<h2>Hugo CMS</h2>
			<button class="refresh-btn" onclick={() => loadFiles(currentDir)} title="Rafraîchir">↻</button>
		</div>
		<div class="breadcrumb">
			<button class="bread-link" onclick={() => loadFiles('')}>root</button>
			{#each currentDir.split('/').filter(Boolean) as part, i}
				{@const path = currentDir.split('/').slice(0, i + 1).join('/')}
				<span class="bread-sep">/</span>
				<button class="bread-link" onclick={() => loadFiles(path)}>{part}</button>
			{/each}
		</div>
		<nav class="file-tree">
			{#if currentDir}
				<button class="file-item directory" onclick={goUp}>
					<span class="icon">⬆</span>
					<span class="name">..</span>
				</button>
			{/if}
			{#each files as item}
				<button
					class="file-item"
					class:active={currentSlug === item.slug}
					class:directory={item.type === 'directory'}
					onclick={() => item.type === 'directory' ? navigateDir(item.name) : loadFile(item.slug)}
				>
					<span class="icon">{fileIcon(item.name)}</span>
					<span class="name">{item.name}</span>
					{#if isDraft(item.frontmatter)}
						<span class="badge-draft">DRAFT</span>
					{/if}
				</button>
			{/each}
		</nav>
	</aside>

	<main class="editor-panel">
		{#if !currentSlug}
			<div class="empty-state">
				<h2>Bienvenue dans Hugo CMS</h2>
				<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
			</div>
		{:else if loading}
			<div class="loading-state">
				<p>Chargement…</p>
			</div>
		{:else}
			<div class="editor-header">
				<span class="filename">{currentSlug}.md</span>
				<div class="header-actions">
					<button class="fm-toggle" onclick={() => fmOpen = !fmOpen}>
						{fmOpen ? '►' : '◄'}
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
					<aside class="fm-sidebar">
						<FrontMatterEditor
							frontmatter={currentFrontmatter}
							onChange={handleFrontmatterChange}
						/>
					</aside>
				{/if}
			</div>
			<StatusBar {wordCount} {charCount} {saveState} />
		{/if}
	</main>
</div>

<style>
	.cms-layout {
		display: flex;
		height: 100vh;
		overflow: hidden;
	}

	.sidebar {
		width: 260px;
		min-width: 260px;
		border-right: 1px solid #e5e7eb;
		background: #f9fafb;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.sidebar-header {
		padding: 14px 16px;
		border-bottom: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sidebar-header h2 {
		font-size: 16px;
		font-weight: 600;
		color: #1f2937;
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 12px;
		font-size: 12px;
		border-bottom: 1px solid #e5e7eb;
		overflow-x: auto;
		white-space: nowrap;
	}

	.bread-link {
		background: none;
		border: none;
		color: #6366f1;
		cursor: pointer;
		font-size: 12px;
		padding: 1px 4px;
		border-radius: 3px;
	}

	.bread-link:hover { background: #e0e7ff; }

	.bread-sep {
		color: #9ca3af;
	}

	.refresh-btn {
		padding: 2px 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 14px;
		color: #6b7280;
	}

	.refresh-btn:hover {
		background: #e5e7eb;
	}

	.file-tree {
		display: flex;
		flex-direction: column;
		padding: 8px;
		gap: 1px;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 6px;
		text-align: left;
		padding: 6px 10px;
		border: none;
		background: transparent;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		color: #374151;
		transition: background 0.12s;
	}

	.file-item:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.file-item.active {
		background: #e0e7ff;
		color: #4338ca;
	}

	.file-item:disabled {
		opacity: 0.6;
		cursor: default;
		font-weight: 600;
		color: #6b7280;
	}

	.icon { font-size: 15px; }
	.name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

	.badge-draft {
		font-size: 10px;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 4px;
		background: #fef3c7;
		color: #92400e;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.editor-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		border-bottom: 1px solid #e5e7eb;
		background: #f9fafb;
		flex-shrink: 0;
	}

	.filename {
		font-size: 13px;
		font-weight: 500;
		color: #6b7280;
		font-family: ui-monospace, 'SF Mono', monospace;
	}

	.fm-toggle {
		padding: 2px 6px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 12px;
		color: #6b7280;
	}

	.fm-toggle:hover {
		background: #e5e7eb;
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
		border-left: 1px solid #e5e7eb;
		background: #f9fafb;
		overflow-y: auto;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
	}

	.empty-state h2 {
		font-size: 20px;
		margin-bottom: 8px;
		color: #6b7280;
	}

	.loading-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
	}
</style>
