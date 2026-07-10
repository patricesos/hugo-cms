<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Save, Trash2, Loader2, FileCode } from '@lucide/svelte';
	import RawEditor from './RawEditor.svelte';
	import type { EditorLang } from './RawEditor.svelte';
	import { editorStore } from '$lib/stores/editor';

	const { currentTab } = editorStore;

	function detectLang(slug: string): EditorLang {
		const ext = slug.split('.').pop()?.toLowerCase() ?? '';
		switch (ext) {
			case 'json': return 'json';
			case 'yaml':
			case 'yml': return 'yaml';
			case 'xml': return 'xml';
			case 'html':
			case 'htm': return 'html';
			case 'css':
			case 'scss':
			case 'sass':
			case 'less': return 'css';
			case 'js':
			case 'ts':
			case 'mjs':
			case 'cjs':
			case 'jsx':
			case 'tsx': return 'javascript';
			case 'md': return 'markdown';
			default: return 'markdown';
		}
	}

	let {
		slug,
		onClose,
		onDelete,
	}: {
		slug: string | null;
		onClose: () => void;
		onDelete: (slug: string) => void;
	} = $props();

	let loading = $state(false);
	let saving = $state(false);
	let error = $state('');

	let lang = $derived(slug ? detectLang(slug) : 'markdown');
	let content = $derived($currentTab?.content ?? '');

	$effect(() => {
		if (slug) loadSiteFile(slug);
	});

	async function loadSiteFile(name: string) {
		loading = true;
		error = '';
		try {
			await editorStore.loadSiteFile(name);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function handleContentChange(val: string) {
		if (slug) editorStore.updateTabContent(slug, val);
	}

	async function handleSave() {
		if (!slug) return;
		saving = true;
		error = '';
		try {
			await editorStore.saveSiteFile(slug);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!slug) return;
		if (!confirm(`Supprimer "${slug}" ?`)) return;
		try {
			const res = await fetch(`/api/site/raw/${slug}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Erreur suppression');
			onDelete(slug);
		} catch (e) {
			error = (e as Error).message;
		}
	}
</script>

{#if !slug}
	<div class="empty-state" transition:fade={{ duration: 200 }}>
		<FileCode size={32} opacity={0.3} />
		<h2>Fichier site</h2>
		<p>Sélectionnez un fichier dans la vue Site.</p>
	</div>
{:else if loading}
	<div class="loading-state" transition:fade={{ duration: 200 }}>
		<div class="skeleton-block"></div>
		<div class="skeleton-block short"></div>
		<div class="skeleton-block"></div>
	</div>
{:else}
	<div class="sitefile-view" transition:fade={{ duration: 150 }}>
		<div class="sitefile-header">
			<div class="header-left">
				<FileCode size={14} color="var(--c-text-muted)" />
				<span class="filename">{slug}</span>
			</div>
			<div class="header-actions">
				{#if error}
					<span class="error-msg">{error}</span>
				{/if}
				<button class="icon-btn save-btn" onclick={handleSave} title="Enregistrer" disabled={saving}>
					{#if saving}
						<Loader2 size={15} class="spin" />
					{:else}
						<Save size={15} />
					{/if}
				</button>
				<button class="icon-btn delete-btn" onclick={handleDelete} title="Supprimer">
					<Trash2 size={15} />
				</button>
			</div>
		</div>

		<div class="sitefile-body">
			<RawEditor
				content={content}
				lang={lang}
				active={true}
				onchange={handleContentChange}
			/>
		</div>
	</div>
{/if}

<style>
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

	.sitefile-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sitefile-header {
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
		min-width: 0;
	}

	.filename {
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text-secondary);
		font-family: var(--font-mono);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.error-msg {
		font-size: 12px;
		color: var(--c-danger);
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

	.icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.icon-btn.delete-btn:hover {
		background: var(--c-danger-bg);
		color: var(--c-danger);
		border-color: var(--c-danger-border);
	}

	.icon-btn.save-btn {
		color: var(--c-primary);
		border-color: var(--c-primary-light);
	}

	.icon-btn.save-btn:hover {
		background: var(--c-primary-light);
	}

	.sitefile-body {
		flex: 1;
		display: flex;
		overflow: hidden;
	}
</style>