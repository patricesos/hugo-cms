<script lang="ts">
	import FolderPicker from './FolderPicker.svelte';

	let {
		show = false,
		onClose,
		onSiteCreated,
	}: {
		show?: boolean;
		onClose: () => void;
		onSiteCreated: () => void;
	} = $props();

	let path = $state('');
	let loading = $state(false);
	let error = $state('');
	let showFolderPicker = $state(false);

	async function handleCreate() {
		if (!path.trim()) return;
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/hugo/new-site', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: path.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Erreur inconnue';
				return;
			}
			onSiteCreated();
		} catch {
			error = 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	function handleFolderSelect(selected: string) {
		path = selected;
		showFolderPicker = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !loading) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" role="presentation" onclick={() => { if (!loading) onClose(); }}>
		<div class="dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<h3>Nouveau site Hugo</h3>
			<p class="desc">Crée un nouveau site Hugo dans un dossier vide ou inexistant.</p>

			<label class="field">
				<span class="label">Dossier du site</span>
				<div class="input-row">
					<input
						type="text"
						bind:value={path}
						placeholder="C:\chemin\vers\mon-site"
						disabled={loading}
					/>
					<button class="btn-browse" onclick={() => showFolderPicker = true} disabled={loading}>
						Parcourir
					</button>
				</div>
			</label>

			{#if error}
				<div class="error-msg">{error}</div>
			{/if}

			<div class="actions">
				<button class="btn-cancel" onclick={onClose} disabled={loading}>Annuler</button>
				<button class="btn-primary" onclick={handleCreate} disabled={loading || !path.trim()}>
					{loading ? 'Création...' : 'Créer le site'}
				</button>
			</div>
		</div>
	</div>
{/if}

<FolderPicker
	show={showFolderPicker}
	initialPath={path}
	onSelect={handleFolderSelect}
	onClose={() => showFolderPicker = false}
/>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}
	.dialog {
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-xl);
		padding: 24px;
		width: 480px;
		max-width: calc(100vw - 32px);
		box-shadow: var(--shadow-lg);
	}
	h3 {
		margin: 0 0 4px;
		font-size: 16px;
		color: var(--c-text);
	}
	.desc {
		margin: 0 0 20px;
		font-size: 13px;
		color: var(--c-text-secondary);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 16px;
	}
	.label {
		font-size: 12px;
		font-weight: 600;
		color: var(--c-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.input-row {
		display: flex;
		gap: 8px;
	}
	.input-row input {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-family: inherit;
		background: var(--c-bg);
		color: var(--c-text);
	}
	.btn-browse {
		padding: 8px 12px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.12s;
	}
	.btn-browse:hover { background: var(--c-bg-subtle); }
	.error-msg {
		padding: 8px 10px;
		background: var(--c-danger-bg);
		border: 1px solid var(--c-danger-border);
		border-radius: var(--radius-sm);
		color: var(--c-danger);
		font-size: 12px;
		margin-bottom: 16px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.btn-cancel {
		padding: 8px 16px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
	}
	.btn-cancel:hover { background: var(--c-bg-muted); }
	.btn-cancel:disabled { opacity: 0.5; cursor: default; }
</style>
