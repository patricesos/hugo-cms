<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { untrack } from 'svelte';
	import { PenLine, Save, X, Trash2, Loader2 } from '@lucide/svelte';

	let {
		slug,
		onClose,
		onDelete,
	}: {
		slug: string | null;
		onClose: () => void;
		onDelete: (slug: string) => void;
	} = $props();

	let source = $state('');
	let label = $state('');
	let loading = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let error = $state('');
	let dirty = $state(false);

	$effect(() => {
		if (slug) {
			if (untrack(() => dirty) && !window.confirm('Des modifications non sauvegardées vont être perdues. Continuer ?')) return;
			loadArchetype(slug);
			untrack(() => { dirty = false; });
		}
	});

	function markDirty() {
		dirty = true;
	}

	async function loadArchetype(name: string) {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/archetypes/${name}`);
			if (!res.ok) throw new Error('Erreur chargement');
			const data = await res.json();
			source = data.source;
			label = data.label;
			editing = false;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function handleSave() {
		if (!slug) return;
		saving = true;
		error = '';
		try {
			const res = await fetch(`/api/archetypes/${slug}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ source }),
			});
			if (!res.ok) throw new Error('Erreur sauvegarde');
			editing = false;
		} catch (e) {
			error = (e as Error).message;
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		if (slug) loadArchetype(slug);
		editing = false;
	}

	async function handleDelete() {
		if (!slug) return;
		if (!confirm(`Supprimer l'archetype "${label}" ?`)) return;
		try {
			const res = await fetch(`/api/archetypes/${slug}`, { method: 'DELETE' });
			if (!res.ok) throw new Error('Erreur suppression');
			onDelete(slug);
		} catch (e) {
			error = (e as Error).message;
		}
	}
</script>

{#if !slug}
	<div class="empty-state" transition:fade={{ duration: 200 }}>
		<h2>Archétypes</h2>
		<p>Sélectionnez un archétype dans la sidebar pour voir ou modifier son contenu.</p>
	</div>
{:else if loading}
	<div class="loading-state" transition:fade={{ duration: 200 }}>
		<div class="skeleton-block"></div>
		<div class="skeleton-block short"></div>
		<div class="skeleton-block"></div>
	</div>
{:else}
	<div class="archetype-view" transition:fade={{ duration: 150 }}>
		<div class="archetype-header">
			<div class="header-left">
				<PenLine size={14} color="var(--c-text-muted)" />
				<span class="filename">{label}</span>
				<span class="file-slug">{slug}.md</span>
			</div>
			<div class="header-actions">
				{#if error}
					<span class="error-msg">{error}</span>
				{/if}
				{#if editing}
					<button class="icon-btn" onclick={handleCancel} title="Annuler" disabled={saving}>
						<X size={15} />
					</button>
					<button class="icon-btn save-btn" onclick={handleSave} title="Enregistrer" disabled={saving}>
						{#if saving}
							<Loader2 size={15} class="spin" />
						{:else}
							<Save size={15} />
						{/if}
					</button>
				{:else}
					<button class="icon-btn" onclick={() => editing = true} title="Éditer">
						<PenLine size={15} />
					</button>
					<button class="icon-btn delete-btn" onclick={handleDelete} title="Supprimer">
						<Trash2 size={15} />
					</button>
				{/if}
			</div>
		</div>

		<div class="archetype-body">
			{#if editing}
				<textarea
					class="source-editor"
					value={source}
					oninput={(e) => { source = e.currentTarget.value; markDirty(); }}
					spellcheck="false"
				></textarea>
			{:else}
				<pre class="source-display"><code>{source}</code></pre>
			{/if}
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
		gap: 8px;
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

	.archetype-view {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.archetype-header {
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
	}

	.file-slug {
		font-size: 12px;
		color: var(--c-text-muted);
		font-family: var(--font-mono);
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
		background: #fef2f2;
		color: var(--c-danger);
		border-color: #fecaca;
	}

	.icon-btn.save-btn {
		color: var(--c-primary);
		border-color: var(--c-primary-light);
	}

	.icon-btn.save-btn:hover {
		background: var(--c-primary-light);
	}

	.archetype-body {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.source-display {
		flex: 1;
		margin: 0;
		padding: 20px 24px;
		overflow: auto;
		background: var(--c-bg);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		color: var(--c-text);
		tab-size: 2;
	}

	.source-display code {
		font-family: inherit;
	}

	.source-editor {
		flex: 1;
		margin: 0;
		padding: 20px 24px;
		border: none;
		border-radius: 0;
		background: var(--c-bg);
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		color: var(--c-text);
		resize: none;
		outline: none;
		tab-size: 2;
	}
</style>
