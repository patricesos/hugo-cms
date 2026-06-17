<script lang="ts">
	import { GitBranch, RefreshCw, GitCommit, ArrowUp, FileCode, Plus, Pencil, Trash2, HelpCircle, CheckCircle2 } from '@lucide/svelte';

	export interface GitStatus {
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
		status = null as GitStatus | null,
		loading = false,
		onRefresh,
		onCommit,
		onPush,
		onInit,
		onOpenFile,
	}: {
		status: GitStatus | null;
		loading: boolean;
		onRefresh: () => void;
		onCommit: () => void;
		onPush: () => void;
		onInit: () => void;
		onOpenFile?: (path: string) => void;
	} = $props();

	const totalChanges = $derived.by(() => {
		if (!status) return 0;
		if (typeof status.modified === 'undefined') return 0;
		return status.modified.length + status.added.length + status.deleted.length + status.renamed.length + status.untracked.length;
	});
</script>

<div class="git-sidebar">
	<div class="git-header">
		<div class="branch-info">
			<GitBranch size={14} />
			<span class="branch-name">{status?.branch ?? '—'}</span>
			{#if status && (status.ahead > 0 || status.behind > 0)}
				<span class="ahead-behind">
					{#if status.ahead > 0}
						<span class="ahead">+{status.ahead}</span>
					{/if}
					{#if status.behind > 0}
						<span class="behind">-{status.behind}</span>
					{/if}
				</span>
			{/if}
		</div>
		<div class="git-actions">
			<button class="icon-btn" onclick={onRefresh} title="Rafraîchir" disabled={loading}>
				<span class:spin={loading}><RefreshCw size={13} /></span>
			</button>
		</div>
	</div>

	{#if !status}
		<div class="empty-state">
			{#if loading}
				<span class="loading-text">Chargement…</span>
			{:else}
				<p class="no-repo">Aucun dépôt git</p>
				<button class="btn secondary" onclick={onInit}>
					<GitBranch size={13} />
					<span>Initialiser</span>
				</button>
			{/if}
		</div>
	{:else}
		{#if totalChanges === 0}
			<div class="clean-state">
				<CheckCircle2 size={16} />
				<span>Working tree propre</span>
			</div>
		{:else}
			<div class="file-list">
				{#if status.staged.length > 0}
					<div class="section-label">Stagés</div>
					{#each status.staged as file}
						<button class="file-row staged" onclick={() => onOpenFile?.(file)}>
							<FileCode size={12} />
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}

				{#if status.modified.length > 0}
					<div class="section-label">Modifiés</div>
					{#each status.modified as file}
						<button class="file-row" onclick={() => onOpenFile?.(file)}>
							<span class="icon-modified"><Pencil size={12} /></span>
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}

				{#if status.added.length > 0}
					<div class="section-label">Ajoutés</div>
					{#each status.added as file}
						<button class="file-row" onclick={() => onOpenFile?.(file)}>
							<span class="icon-added"><Plus size={12} /></span>
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}

				{#if status.deleted.length > 0}
					<div class="section-label">Supprimés</div>
					{#each status.deleted as file}
						<button class="file-row" onclick={() => onOpenFile?.(file)}>
							<span class="icon-deleted"><Trash2 size={12} /></span>
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}

				{#if status.renamed.length > 0}
					<div class="section-label">Renommés</div>
					{#each status.renamed as file}
						<button class="file-row" onclick={() => onOpenFile?.(file)}>
							<span class="icon-renamed"><FileCode size={12} /></span>
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}

				{#if status.untracked.length > 0}
					<div class="section-label">Non suivis</div>
					{#each status.untracked as file}
						<button class="file-row" onclick={() => onOpenFile?.(file)}>
							<span class="icon-untracked"><HelpCircle size={12} /></span>
							<span class="file-path">{file}</span>
						</button>
					{/each}
				{/if}
			</div>
		{/if}

		<div class="git-footer">
			{#if totalChanges > 0}
				<button class="btn primary" onclick={onCommit}>
					<GitCommit size={13} />
					<span>Commit {totalChanges > 0 ? `(${totalChanges})` : ''}</span>
				</button>
			{/if}
			{#if status && status.ahead > 0}
				<button class="btn secondary" onclick={onPush}>
					<ArrowUp size={13} />
					<span>Push ({status.ahead})</span>
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.git-sidebar {
		display: flex;
		flex-direction: column;
		height: 100%;
		font-size: 13px;
	}

	.git-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border-bottom: 1px solid var(--c-border);
	}

	.branch-info {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--c-text);
		font-weight: 500;
		font-size: 13px;
	}

	.branch-name {
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.ahead-behind {
		display: flex;
		gap: 4px;
		font-size: 11px;
		font-family: var(--font-mono);
	}

	.ahead { color: var(--c-success); }
	.behind { color: var(--c-danger); }

	.git-actions {
		display: flex;
		gap: 2px;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition: all 0.1s;
	}

	.icon-btn:hover:not(:disabled) {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.icon-btn:disabled { opacity: 0.4; cursor: default; }

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 24px;
		color: var(--c-text-muted);
	}

	.no-repo {
		font-size: 13px;
		margin: 0;
	}

	.clean-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--c-success);
		font-weight: 500;
		font-size: 13px;
	}

	.loading-text {
		font-size: 12px;
	}

	.file-list {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
	}

	.section-label {
		padding: 6px 12px 3px;
		font-size: 11px;
		font-weight: 600;
		color: var(--c-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.file-row {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 4px 12px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--c-text-secondary);
		transition: all 0.1s;
		font-family: inherit;
		font-size: 12px;
		text-align: left;
	}

	.file-row:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.file-row.staged {
		color: var(--c-text);
		font-weight: 500;
	}

	.file-path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.icon-modified { color: #d97706; }
	.icon-added { color: var(--c-success); }
	.icon-deleted { color: var(--c-danger); }
	.icon-renamed { color: #9333ea; }
	.icon-untracked { color: var(--c-text-muted); }

	.git-footer {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 12px;
		border-top: 1px solid var(--c-border);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 7px 12px;
		border-radius: var(--radius-md);
		font-size: 12px;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
		border: 1px solid transparent;
		width: 100%;
	}

	.btn.primary {
		background: var(--c-primary);
		color: #fff;
	}

	.btn.primary:hover {
		background: var(--c-primary-hover);
	}

	.btn.secondary {
		background: var(--c-bg);
		color: var(--c-text-secondary);
		border-color: var(--c-border);
	}

	.btn.secondary:hover {
		background: var(--c-bg-muted);
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
