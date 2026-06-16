<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	let {
		show = false,
		parentSlug = '',
		onClose,
		onCreate,
	}: {
		show: boolean;
		parentSlug?: string;
		onClose: () => void;
		onCreate: (folderName: string, parent: string) => void;
	} = $props();

	let folderName = $state('');
	let inputEl = $state<HTMLInputElement | null>(null);

	onMount(() => {
		inputEl?.focus();
	});

	function handleSubmit() {
		if (!folderName.trim()) return;
		const name = folderName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || folderName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
		onCreate(name, parentSlug);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'Enter' && folderName.trim()) handleSubmit();
	}
</script>

{#if show}
	<div class="overlay" transition:fade={{ duration: 150 }} onclick={onClose} role="presentation"></div>
	<div class="dialog" transition:fly={{ y: 20, duration: 200 }}>
		<div class="dialog-header">
			<h3>Nouveau dossier</h3>
			<button class="icon-btn" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>
		<div class="dialog-body">
			<label class="field">
				<span class="label">Nom du dossier</span>
				<input
					bind:this={inputEl}
					type="text"
					class="text-input"
					bind:value={folderName}
					onkeydown={handleKeydown}
					placeholder="mon-dossier"
				/>
			</label>
			{#if parentSlug}
				<p class="hint">Créé dans <code>{parentSlug}</code></p>
			{/if}
		</div>
		<div class="dialog-footer">
			<button class="btn btn-secondary" onclick={onClose}>Annuler</button>
			<button class="btn btn-primary" onclick={handleSubmit} disabled={!folderName.trim()}>Créer</button>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.4);
		z-index: 999;
	}

	.dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: var(--c-bg);
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0,0,0,0.18);
		z-index: 1000;
		width: 360px;
		max-width: 90vw;
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
	}

	.dialog-header h3 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.dialog-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
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

	.text-input {
		font-size: 14px;
		font-family: inherit;
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg);
		color: var(--c-text);
		outline: none;
		transition: border-color 0.15s;
	}

	.text-input:focus {
		border-color: var(--c-primary);
	}

	.hint {
		font-size: 12px;
		color: var(--c-text-muted);
		margin: 0;
	}

	.hint code {
		background: var(--c-bg-muted);
		padding: 1px 5px;
		border-radius: 3px;
		font-size: 11px;
	}

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--c-border);
	}

	.btn {
		font-size: 13px;
		font-family: inherit;
		padding: 6px 14px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--c-border);
		cursor: pointer;
		transition: all 0.12s;
	}

	.btn-secondary {
		background: var(--c-bg);
		color: var(--c-text);
	}

	.btn-secondary:hover {
		background: var(--c-bg-muted);
	}

	.btn-primary {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.btn-primary:hover {
		filter: brightness(1.1);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-muted);
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}
</style>
