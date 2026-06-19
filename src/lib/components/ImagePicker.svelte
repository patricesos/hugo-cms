<script lang="ts">
	import { fade } from 'svelte/transition';
	import { Image, Upload, X, Loader2 } from '@lucide/svelte';

	let {
		show = false,
		onSelect,
		onClose,
	}: {
		show: boolean;
		onSelect: (url: string) => void;
		onClose: () => void;
	} = $props();

	let images = $state<string[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let selectedUrl = $state<string | null>(null);
	let inputEl = $state<HTMLInputElement | null>(null);
	let dragOver = $state(false);

	$effect(() => {
		if (show) {
			selectedUrl = null;
			loadImages();
		}
	});

	$effect(() => {
		if (show && inputEl) {
			inputEl.focus();
		}
	});

	function assetUrl(path: string): string {
		return `/${path}`;
	}

	async function loadImages() {
		loading = true;
		try {
			const res = await fetch('/api/assets');
			images = await res.json();
		} catch {
			images = [];
		} finally {
			loading = false;
		}
	}

	async function uploadFile(file: File) {
		uploading = true;
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/assets', { method: 'POST', body: form });
			const data = await res.json();
			if (data.path) {
				const relativePath = data.path.replace(/^\//, '');
				images = [relativePath, ...images];
				onSelect(assetUrl(relativePath));
				onClose();
			}
		} finally {
			uploading = false;
		}
	}

	async function handleUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		await uploadFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files?.[0];
		if (file && file.type.startsWith('image/')) {
			await uploadFile(file);
		}
	}

	function handleConfirm() {
		if (selectedUrl) {
			onSelect(assetUrl(selectedUrl));
			onClose();
		}
	}
</script>

{#if show}
	<div class="ip-backdrop" role="presentation" transition:fade={{ duration: 100 }} onclick={onClose}></div>
	<div class="ip-dialog {dragOver ? 'drag-over' : ''}" role="dialog" tabindex="-1" transition:fade={{ duration: 120 }} ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop}>
		<div class="ip-header">
			<Image size={16} />
			<span>Insérer une image</span>
			<button class="ip-close" onclick={onClose} title="Fermer"><X size={16} /></button>
		</div>

		<div class="ip-upload">
			<label class="ip-upload-btn" class:uploading>
				{#if uploading}
					<Loader2 size={16} style="animation: spin 0.8s linear infinite;" />
					<span>Upload en cours…</span>
				{:else}
					<Upload size={16} />
					<span>Télécharger une image</span>
				{/if}
				<input type="file" accept="image/*" hidden onchange={handleUpload} disabled={uploading} />
			</label>
			<span class="ip-hint">PNG, JPG, GIF, WebP — glisser-déposer ou cliquer</span>
		</div>

		<div class="ip-grid-wrap">
			{#if loading}
				<div class="ip-loading"><Loader2 size={20} style="animation: spin 0.8s linear infinite;" /></div>
			{:else if images.length === 0}
				<div class="ip-empty">Aucune image trouvée</div>
			{:else}
				<div class="ip-grid">
					{#each images as img}
						<button
							class="ip-item"
							class:selected={selectedUrl === img}
							onclick={() => selectedUrl = img}
							ondblclick={() => { onSelect(img.startsWith('http') ? img : assetUrl(img)); onClose(); }}
						>
							<img src={img.startsWith('http') ? img : assetUrl(img)} alt={img} loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="ip-footer">
			<button class="ip-btn secondary" onclick={onClose}>Annuler</button>
			<button class="ip-btn primary" onclick={handleConfirm} disabled={!selectedUrl}>Insérer</button>
		</div>
	</div>
{/if}

<style>
	.ip-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 200;
	}

	.ip-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 560px;
		max-width: calc(100vw - 40px);
		max-height: calc(100vh - 80px);
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		z-index: 201;
		display: flex;
		flex-direction: column;
		transition: border-color 0.15s;
	}

	.ip-dialog.drag-over {
		border-color: var(--c-primary);
		box-shadow: 0 0 0 2px var(--c-primary-light), var(--shadow-xl);
	}

	.ip-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}

	.ip-close {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--c-text-muted);
		transition: all 0.1s;
	}

	.ip-close:hover { background: var(--c-bg-muted); color: var(--c-text); }

	.ip-upload {
		padding: 12px 16px;
		border-bottom: 1px solid var(--c-border);
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ip-upload-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border-radius: var(--radius-md);
		border: 1px dashed var(--c-border);
		background: var(--c-bg-muted);
		cursor: pointer;
		font-size: 13px;
		font-family: inherit;
		color: var(--c-text);
		transition: all 0.12s;
	}

	.ip-upload-btn:hover { border-color: var(--c-primary); color: var(--c-primary); }
	.ip-upload-btn.uploading { opacity: 0.6; cursor: not-allowed; }

	.ip-hint {
		font-size: 11px;
		color: var(--c-text-muted);
	}

	.ip-grid-wrap {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		min-height: 120px;
	}

	.ip-loading, .ip-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px 0;
		color: var(--c-text-muted);
	}

	.ip-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 8px;
	}

	.ip-item {
		position: relative;
		aspect-ratio: 1;
		border: 2px solid transparent;
		border-radius: var(--radius-md);
		overflow: hidden;
		cursor: pointer;
		background: var(--c-bg-muted);
		padding: 0;
		transition: all 0.12s;
	}

	.ip-item:hover { border-color: var(--c-primary-light); }
	.ip-item.selected { border-color: var(--c-primary); box-shadow: 0 0 0 2px var(--c-primary-light); }

	.ip-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.ip-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--c-border);
	}

	.ip-btn {
		padding: 7px 16px;
		border-radius: var(--radius-md);
		border: 1px solid var(--c-border);
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.ip-btn.primary {
		background: var(--c-primary);
		color: var(--c-text-on-primary);
		border-color: var(--c-primary);
	}
	.ip-btn.primary:hover { opacity: 0.9; }
	.ip-btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }
	.ip-btn.secondary { background: var(--c-bg); color: var(--c-text); }
	.ip-btn.secondary:hover { background: var(--c-bg-muted); }

	@keyframes spin { to { transform: rotate(360deg); } }
</style>
