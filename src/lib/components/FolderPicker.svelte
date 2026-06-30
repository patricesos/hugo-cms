<script lang="ts">
	import { Folder, ChevronRight, RotateCw, Home } from '@lucide/svelte';

	let {
		show = false,
		initialPath = '',
		onSelect,
		onClose,
	}: {
		show?: boolean;
		initialPath?: string;
		onSelect: (path: string) => void;
		onClose: () => void;
	} = $props();

	// svelte-ignore state_referenced_locally — volontaire : currentPath est réinitialisé
	// par loadDir() dans $effect() à chaque ouverture du dialog
	let currentPath = $state(initialPath);
	let directories = $state<string[]>([]);
	let parentPath = $state<string | null>(null);
	let loading = $state(false);
	let error = $state('');
	let dialogEl: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (show && dialogEl) {
			dialogEl.showModal();
			loadDir(initialPath);
		} else if (!show && dialogEl) {
			dialogEl.close();
		}
	});

	async function loadDir(path: string) {
		loading = true;
		error = '';
		try {
			const q = path ? `?path=${encodeURIComponent(path)}` : '';
			const res = await fetch(`/api/browse-dir${q}`);
			const data = await res.json();
			currentPath = data.path;
			directories = data.directories;
			parentPath = data.parent;
		} catch {
			error = 'Erreur de chargement';
		} finally {
			loading = false;
		}
	}

	function navigate(dir: string) {
		currentPath = dir;
		loadDir(dir);
	}

	function goUp() {
		if (parentPath !== null && parentPath !== undefined) {
			currentPath = parentPath;
			loadDir(parentPath);
		}
	}

	function goHome() {
		currentPath = '';
		loadDir('');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		const rect = dialogEl!.getBoundingClientRect();
		if (
			e.clientX < rect.left || e.clientX > rect.right ||
			e.clientY < rect.top || e.clientY > rect.bottom
		) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<dialog
		bind:this={dialogEl}
		class="folder-picker"
		onclick={handleBackdropClick}
		onclose={onClose}
	>
		<div class="header">
			<button class="icon-btn" onclick={goHome} title="Racine">
				<Home size={16} />
			</button>
			<button
				class="icon-btn"
				onclick={goUp}
				disabled={parentPath === null || parentPath === undefined}
				title="Parent"
			>
				<ChevronRight size={16} style="transform: rotate(180deg)" />
			</button>
			<span class="breadcrumb">{currentPath || '(racine)'}</span>
			<button class="icon-btn" onclick={() => loadDir(currentPath)} title="Actualiser">
				<RotateCw size={14} />
			</button>
		</div>

		<div class="dir-list">
			{#if loading}
				<div class="loading">Chargement...</div>
			{:else if error}
				<div class="error">{error}</div>
			{:else if directories.length === 0}
				<div class="empty">Aucun dossier</div>
			{:else}
				{#each directories as dir (dir)}
					<div
						class="dir-item"
						role="button"
						tabindex="0"
						ondblclick={() => navigate(dir)}
						onclick={() => { currentPath = dir; }}
						onkeydown={(e) => { if (e.key === 'Enter') { currentPath = dir; } }}
					>
						<Folder size={16} />
						<span class="dir-name">{dir.split('/').filter(Boolean).pop() || dir}</span>
						<span
							class="select-btn"
							role="button"
							tabindex="-1"
							onclick={(e) => { e.stopPropagation(); onSelect(dir); }}
							onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSelect(dir); } }}
						>
							Sélectionner
						</span>
					</div>
				{/each}
			{/if}
		</div>

		<div class="footer">
			<button class="btn-cancel" onclick={onClose}>Annuler</button>
			<button
				class="btn-select"
				disabled={!currentPath}
				onclick={() => onSelect(currentPath)}
			>
				Choisir ce dossier
			</button>
		</div>
	</dialog>
{/if}

<style>
	.folder-picker {
		width: 520px;
		max-height: 70vh;
		padding: 0;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-xl);
		background: var(--c-bg);
		color: var(--c-text);
		box-shadow: 0 8px 32px rgba(0,0,0,0.3);
		overflow: hidden;
		margin: auto;
		position: fixed;
		inset: 0;
	}
	.folder-picker::backdrop {
		background: rgba(0,0,0,0.4);
	}
	.header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
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
		color: var(--c-text-secondary);
		cursor: pointer;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}
	.icon-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}
	.breadcrumb {
		flex: 1;
		font-size: 12px;
		color: var(--c-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin: 0 4px;
	}
	.dir-list {
		overflow-y: auto;
		max-height: 40vh;
		padding: 4px 0;
	}
	.loading, .error, .empty {
		padding: 24px 16px;
		text-align: center;
		font-size: 13px;
		color: var(--c-text-muted);
	}
	.error { color: var(--c-danger); }
	.dir-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 12px;
		border: none;
		border-radius: 0;
		background: transparent;
		color: var(--c-text);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
	}
	.dir-item:hover {
		background: var(--c-bg-muted);
	}
	.dir-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.select-btn {
		padding: 2px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-primary);
		font-size: 11px;
		font-family: inherit;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.1s;
	}
	.dir-item:hover .select-btn {
		opacity: 1;
	}
	.select-btn:hover {
		background: var(--c-primary);
		color: var(--c-text-on-primary);
		border-color: var(--c-primary);
	}
	.footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid var(--c-border);
	}
	.btn-cancel {
		padding: 6px 16px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-text);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
	}
	.btn-cancel:hover { background: var(--c-bg-muted); }
	.btn-select {
		padding: 6px 16px;
		border: none;
		border-radius: var(--radius-md);
		background: var(--c-primary);
		color: var(--c-text-on-primary);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
	}
	.btn-select:hover:not(:disabled) { opacity: 0.9; }
	.btn-select:disabled { opacity: 0.4; cursor: default; }
</style>
