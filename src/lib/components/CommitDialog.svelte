<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { GitCommit, Loader2, CheckCircle2, AlertTriangle } from '@lucide/svelte';

	interface GitStatus {
		branch: string;
		modified: string[];
		added: string[];
		deleted: string[];
		renamed: string[];
		staged: string[];
		untracked: string[];
		ahead: number;
		behind: number;
	}

	let {
		show = false,
		status = null as GitStatus | null,
		onClose,
		onCommit,
	}: {
		show: boolean;
		status: GitStatus | null;
		onClose: () => void;
		onCommit: (message: string, files: string[]) => void;
	} = $props();

	let message = $state('');
	let committing = $state(false);
	let done = $state(false);
	let error = $state('');
	let selected = $state(new Set<string>());

	const allFiles = $derived.by(() => {
		if (!status) return [];
		return [
			...status.modified.map(f => ({ path: f, kind: 'M' as const })),
			...status.added.map(f => ({ path: f, kind: 'A' as const })),
			...status.deleted.map(f => ({ path: f, kind: 'D' as const })),
			...status.renamed.map(f => ({ path: f, kind: 'R' as const })),
			...status.untracked.map(f => ({ path: f, kind: '?' as const })),
		];
	});

	const allSelected = $derived(allFiles.length > 0 && selected.size === allFiles.length);
	const selectedFiles = $derived(allFiles.filter(f => selected.has(f.path)).map(f => f.path));

	$effect(() => {
		if (show) selected = new Set(allFiles.map(f => f.path));
	});

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(allFiles.map(f => f.path));
		}
	}

	function toggleFile(path: string) {
		const next = new Set(selected);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		selected = next;
	}

	function handleSubmit() {
		if (!message.trim() || committing || selectedFiles.length === 0) return;
		committing = true;
		error = '';
		try {
			onCommit(message.trim(), selectedFiles);
			done = true;
			setTimeout(() => {
				done = false;
				message = '';
				selected = new Set();
				committing = false;
				onClose();
			}, 1200);
		} catch (e) {
			error = String(e);
			committing = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !committing) onClose();
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" role="presentation" transition:fade={{ duration: 120 }} onmousedown={onClose} onkeydown={handleKeydown}>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-label="Commit"
			tabindex="0"
			transition:fly={{ duration: 160, y: 20 }}
			onmousedown={(e) => e.stopPropagation()}
		>
			<div class="dialog-header">
				<GitCommit size={16} />
				<h3>Commit</h3>
			</div>

			<div class="dialog-body">
				{#if done}
					<div class="done-banner">
						<CheckCircle2 size={18} />
						<span>Commit effectué</span>
					</div>
				{:else}
					{#if error}
						<div class="error-banner">
							<AlertTriangle size={14} />
							<span>{error}</span>
						</div>
					{/if}

					<textarea
						class="commit-message"
						bind:value={message}
						placeholder="Message de commit…"
						rows="4"
						disabled={committing}
						onkeydown={handleKeydown}
					></textarea>

					<div class="file-list">
						<div class="file-list-header">
							<span class="file-count">{allFiles.length} fichier{allFiles.length !== 1 ? 's' : ''}</span>
							<button class="toggle-all" onclick={toggleAll} disabled={committing}>
								{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
							</button>
						</div>
						{#each allFiles as file}
							<label class="file-row" class:disabled={committing}>
								<input type="checkbox" checked={selected.has(file.path)} onchange={() => toggleFile(file.path)} disabled={committing} />
								<span class="file-kind" class:added={file.kind === 'A'} class:deleted={file.kind === 'D'} class:renamed={file.kind === 'R'} class:untracked={file.kind === '?'}>{file.kind}</span>
								<span class="file-path">{file.path}</span>
							</label>
						{/each}
					</div>
				{/if}
			</div>

			<div class="dialog-footer">
				<button class="btn secondary" onclick={onClose} disabled={committing}>Annuler</button>
				{#if !done}
					<button
						class="btn primary"
						onclick={handleSubmit}
						disabled={!message.trim() || committing || selectedFiles.length === 0}
					>
						{#if committing}
							<Loader2 size={14} class="spin" />
							<span>Commit…</span>
						{:else}
							<GitCommit size={14} />
							<span>Commit {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0,0,0,0.3);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dialog {
		background: var(--c-bg);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: 480px;
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--c-border);
	}

	.dialog-header h3 {
		font-size: 15px;
		font-weight: 600;
		color: var(--c-text);
		margin: 0;
	}

	.dialog-body {
		padding: 16px 20px;
		overflow-y: auto;
		flex: 1;
	}

	.done-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px;
		background: var(--c-success-bg);
		border-radius: var(--radius-md);
		color: var(--c-success);
		font-weight: 500;
		font-size: 14px;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: var(--c-danger-bg);
		border-radius: var(--radius-md);
		color: var(--c-danger);
		font-size: 13px;
		margin-bottom: 12px;
	}

	.commit-message {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 14px;
		resize: vertical;
		color: var(--c-text);
		background: var(--c-bg);
		box-sizing: border-box;
	}

	.commit-message:focus {
		outline: none;
		border-color: var(--c-primary);
	}

	.file-list {
		margin-top: 12px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.file-list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 4px;
	}

	.file-count {
		font-size: 12px;
		color: var(--c-text-muted);
	}

	.toggle-all {
		font-size: 11px;
		color: var(--c-primary);
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		padding: 0;
	}

	.toggle-all:hover {
		text-decoration: underline;
	}

	.toggle-all:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 0;
		font-size: 13px;
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.file-row:hover {
		background: var(--c-bg-muted);
	}

	.file-row.disabled {
		cursor: default;
		opacity: 0.5;
	}

	.file-row input[type="checkbox"] {
		margin: 0;
		flex-shrink: 0;
	}

	.file-kind {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 700;
		flex-shrink: 0;
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
	}

	.file-kind.added { background: var(--c-success-bg); color: var(--c-success); }
	.file-kind.deleted { background: var(--c-danger-bg); color: var(--c-danger); }
	.file-kind.renamed { background: #faf5ff; color: #9333ea; }
	.file-kind.untracked { background: var(--c-bg-muted); color: var(--c-text-muted); }

	.file-path {
		color: var(--c-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 20px;
		border-top: 1px solid var(--c-border);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
		border: 1px solid transparent;
	}

	.btn.primary {
		background: var(--c-primary);
		color: #fff;
		border-color: var(--c-primary);
	}

	.btn.primary:hover:not(:disabled) {
		background: var(--c-primary-hover);
	}

	.btn.secondary {
		background: var(--c-bg);
		color: var(--c-text-secondary);
		border-color: var(--c-border);
	}

	.btn.secondary:hover:not(:disabled) {
		background: var(--c-bg-muted);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
