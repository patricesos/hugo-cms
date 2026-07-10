<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { X } from '@lucide/svelte';
	import { getClientConfigSync } from '$lib/client-config';
	import { fileTreeStore } from '$lib/stores/fileTree';

	interface Archetype {
		name: string;
		label: string;
	}

	interface TreeNode {
		type: 'file' | 'directory';
		name: string;
		slug: string;
		path: string;
	}

	let {
		show = false,
		directories: propDirectories = [] as { slug: string; name: string }[],
		archetypes: propArchetypes = [] as Archetype[],
		presetSection = '',
		onClose,
		onCreate,
	}: {
		show: boolean;
		directories: { slug: string; name: string }[];
		archetypes?: Archetype[];
		presetSection?: string;
		onClose: () => void;
		onCreate: (title: string, section: string, archetype?: string) => void;
	} = $props();

	/* Les props peuvent arriver vides via le lazy-import dynamique.
	   On souscrit directement au store pour garantir la réactivité. */
	let archetypes = $derived(
		propArchetypes.length > 0 ? propArchetypes : $fileTreeStore.archetypes
	);
	let directories = $derived(
		propDirectories.length > 0
			? propDirectories
			: $fileTreeStore.tree
				.filter((n: TreeNode) => n.type === 'directory')
				.map((n: TreeNode) => ({ slug: n.slug, name: n.name }))
	);

	let title = $state('');
	let section = $state('');

	let selectedArchetype = $state(getClientConfigSync()?.defaultArchetype ?? 'default');
	let inputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (show) {
			if (presetSection && directories.find(d => d.slug === presetSection)) {
				section = presetSection;
			} else if (directories.length > 0 && !directories.find(d => d.slug === section)) {
				section = directories[0].slug;
			}
		}
	});

	onMount(() => {
		inputEl?.focus();
	});
	let slugPreview = $derived(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || '');

	function handleSubmit() {
		if (!title.trim()) return;
		onCreate(title.trim(), section, selectedArchetype);
		title = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'Enter' && title.trim()) handleSubmit();
	}
</script>

{#if show}
	<div class="overlay" tabindex="-1" transition:fade={{ duration: 120 }} onclick={onClose} onkeydown={handleKeydown} role="dialog" aria-modal="true">
		<div class="dialog" role="presentation" transition:fly={{ duration: 180, y: 12 }} onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
			<div class="dialog-header">
				<h3>Nouveau fichier</h3>
				<button class="icon-btn" onclick={onClose} title="Fermer"><X size={16} /></button>
			</div>

			<div class="dialog-body">
				<label class="field">
					<span class="label">Titre</span>
					<input
						type="text"
						bind:this={inputEl}
						bind:value={title}
						placeholder="Mon super article"
					/>
				</label>

				{#if archetypes.length > 0}
					<label class="field">
						<span class="label">Archetype</span>
						<select bind:value={selectedArchetype}>
							{#each archetypes as a (a.name)}
								<option value={a.name}>{a.label}</option>
							{/each}
						</select>
					</label>
				{/if}

				<label class="field">
					<span class="label">Section</span>
					<select bind:value={section}>
						{#each directories as d (d.slug)}
							<option value={d.slug}>{d.name}</option>
						{/each}
						<option value="">(racine)</option>
					</select>
				</label>

				{#if slugPreview}
					<div class="slug-preview">
						<span class="label">Slug</span>
						<code>{section ? `${section}/` : ''}{slugPreview}.md</code>
					</div>
				{/if}
			</div>

			<div class="dialog-footer">
				<button class="btn secondary" onclick={onClose}>Annuler</button>
				<button class="btn-primary" onclick={handleSubmit} disabled={!title.trim()}>Créer</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.dialog {
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: 400px;
		max-width: 90vw;
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
	}

	.dialog-header h3 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
	}

	.dialog-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.label {
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	select, input[type="text"] {
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		font-size: 14px;
		font-family: inherit;
		color: var(--c-text);
		background: var(--c-bg);
		outline: none;
		transition: border-color 0.15s;
	}

	select:focus, input[type="text"]:focus {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px var(--c-primary-light);
	}

	.slug-preview {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.slug-preview code {
		font-size: 13px;
		font-family: var(--font-mono);
		color: var(--c-text-secondary);
		background: var(--c-bg-muted);
		padding: 6px 10px;
		border-radius: var(--radius-md);
	}

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--c-border);
	}

	.btn {
		padding: 8px 16px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		border: 1px solid var(--c-border);
		transition: all 0.12s;
	}

	.btn.secondary {
		background: var(--c-bg);
		color: var(--c-text);
	}

	.btn.secondary:hover {
		background: var(--c-bg-muted);
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-secondary);
		transition: all 0.12s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}
</style>
