<script lang="ts">
	import { fade, slide, fly } from 'svelte/transition';
	import { GitBranch, RefreshCw, GitCommit, ArrowUp, History, FileCode, Plus, Pencil, Trash2, HelpCircle, CheckCircle2, Loader2, Undo2, Clock, User, Copy, ArrowLeft } from '@lucide/svelte';

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

	interface LogEntry {
		hash: string;
		date: string;
		message: string;
		authorName: string;
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

	let view = $state<'changes' | 'history'>('changes');
	let logEntries = $state<LogEntry[]>([]);
	let logLoading = $state(false);
	let logError = $state('');
	let copied = $state<string | null>(null);
	let reseting = $state<string | null>(null);

	$effect(() => {
		if (view === 'history') {
			logLoading = true;
			logError = '';
			logEntries = [];
			fetch('/api/git/log')
				.then(r => r.json())
				.then(data => { logEntries = data as LogEntry[]; logLoading = false; })
				.catch(e => { logError = String(e); logLoading = false; });
		}
	});

	function copyHash(hash: string) {
		navigator.clipboard.writeText(hash);
		copied = hash;
		setTimeout(() => { copied = null; }, 1500);
	}

	let confirmHash = $state<string | null>(null);

	function requestReset(hash: string) {
		confirmHash = hash;
	}

	async function handleReset(hash: string) {
		confirmHash = null;
		reseting = hash;
		try {
			const res = await fetch('/api/git/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ hash }),
			});
			if (res.ok) {
				view = 'changes';
				onRefresh();
			}
		} finally {
			reseting = null;
		}
	}

	function formatDate(date: string) {
		const d = new Date(date);
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function shortHash(hash: string) {
		return hash.slice(0, 7);
	}
</script>

<div class="git-sidebar">
	<div class="git-header">
		{#if view === 'history'}
			<div class="branch-info">
				<button class="icon-btn back-btn" onclick={() => view = 'changes'} title="Retour">
					<ArrowLeft size={13} />
				</button>
				<History size={14} />
				<span class="view-title">Historique</span>
			</div>
		{:else}
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
		{/if}
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
	{:else if view === 'history'}
		<div class="scroll-area" transition:slide={{ duration: 120 }}>
			{#if logLoading}
				<div class="loading-state">
					<Loader2 size={16} class="spin" />
					<span>Chargement…</span>
				</div>
			{:else if logError}
				<div class="error-state">{logError}</div>
			{:else if logEntries.length === 0}
				<div class="empty-state">
					<GitCommit size={16} />
					<span>Aucun commit</span>
				</div>
			{:else}
					{#each logEntries as entry, i}
					<div class="log-entry" class:is-head={i === 0}>
						<div class="entry-top-row">
							<div class="entry-hash">
								<button class="hash-btn" title="Copier le hash" onclick={() => copyHash(entry.hash)}>
									{#if copied === entry.hash}
										<CheckCircle2 size={10} />
									{:else}
										<Copy size={10} />
									{/if}
									<code>{shortHash(entry.hash)}</code>
								</button>
							</div>
							<button
								class="reset-btn"
								title="Reset — annule ce commit et garde les modifs"
								onclick={() => requestReset(entry.hash)}
								disabled={reseting === entry.hash}
							>
								{#if reseting === entry.hash}
									<Loader2 size={12} class="spin" />
								{:else}
									<Undo2 size={12} />
								{/if}
							</button>
						</div>
						<div class="entry-msg">{entry.message}</div>
						<div class="entry-meta-row">
							<span class="meta-author"><User size={10} />{entry.authorName}</span>
							<span class="meta-date"><Clock size={10} />{formatDate(entry.date)}</span>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		{#if totalChanges === 0}
			<div class="clean-state">
				<CheckCircle2 size={16} />
				<span>Working tree propre</span>
			</div>
		{:else}
			<div class="scroll-area">
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
	{/if}

	{#if confirmHash}
		<div class="overlay" role="presentation" transition:fade={{ duration: 120 }} onclick={() => confirmHash = null} onkeydown={(e) => e.key === 'Escape' && (confirmHash = null)}></div>
		<div
			class="confirm-dialog"
			role="dialog"
			aria-modal="true"
			aria-label="Confirmer le reset"
			tabindex="-1"
			transition:fly={{ duration: 160, y: 16 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (confirmHash = null)}
		>
			<div class="confirm-icon"><Undo2 size={18} /></div>
			<p class="confirm-msg">Annuler ce commit et garder les modifications ?</p>
			<div class="confirm-actions">
				<button class="btn secondary" onclick={() => confirmHash = null}>Annuler</button>
				<button class="btn danger" onclick={() => handleReset(confirmHash!)}>
					<Undo2 size={13} />
					<span>Reset</span>
				</button>
			</div>
		</div>
	{/if}

	<div class="git-footer">
		{#if view === 'changes'}
			<div class="git-footer-actions">
				{#if totalChanges > 0}
					<button class="btn-primary" onclick={onCommit}>
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
		<button class="btn secondary log-btn" onclick={() => view = view === 'history' ? 'changes' : 'history'}>
			<History size={13} />
			<span>{view === 'history' ? 'Modifications' : 'Historique'}</span>
		</button>
	</div>
</div>

<style>
	.git-sidebar {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
		height: 100%;
		font-size: 13px;
	}

	.git-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--c-border);
	}

	.branch-info {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--c-text);
		font-weight: 500;
		font-size: 12px;
		min-width: 0;
	}

	.branch-name {
		font-family: var(--font-mono);
		font-size: 11px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ahead-behind {
		display: flex;
		gap: 2px;
		font-size: 10px;
		font-family: var(--font-mono);
	}

	.ahead { color: var(--c-success); }
	.behind { color: var(--c-danger); }

	.git-actions {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition: all 0.1s;
		flex-shrink: 0;
	}

	.icon-btn:hover:not(:disabled) {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.icon-btn:disabled { opacity: 0.4; cursor: default; }

	.back-btn {
		margin-right: -2px;
		color: var(--c-text);
	}

	.view-title {
		font-weight: 500;
		font-size: 12px;
	}

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

	.scroll-area {
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

	.icon-modified { color: var(--c-warning); }
	.icon-added { color: var(--c-success); }
	.icon-deleted { color: var(--c-danger); }
	.icon-renamed { color: var(--c-renamed); }
	.icon-untracked { color: var(--c-text-muted); }

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px;
		color: var(--c-text-muted);
		font-size: 12px;
	}

	.error-state {
		padding: 12px;
		color: var(--c-danger);
		font-size: 12px;
	}

	.log-entry {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px 12px;
		border-bottom: 1px solid var(--c-border);
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.entry-top-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.entry-meta-row {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--c-text-muted);
		font-size: 10px;
	}

	.meta-author,
	.meta-date {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}

	.hash-btn {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 1px 5px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
		font-size: 10px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.1s;
	}

	.hash-btn:hover {
		border-color: var(--c-primary);
		color: var(--c-primary);
	}

	.hash-btn code {
		font-family: var(--font-mono);
		font-size: 10px;
	}

	.entry-msg {
		font-size: 12px;
		font-weight: 500;
		color: var(--c-text);
		line-height: 1.4;
		word-break: break-word;
	}

	.reset-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition: all 0.1s;
	}

	.reset-btn:hover:not(:disabled) {
		border-color: var(--c-danger);
		color: var(--c-danger);
		background: var(--c-danger-bg);
	}

	.reset-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.git-footer {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border-top: 1px solid var(--c-border);
	}

	.git-footer-actions {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.log-btn {
		width: 100%;
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

	:global(.btn-primary) {
		width: 100%;
	}
	.btn.secondary {
		background: var(--c-bg);
		color: var(--c-text-secondary);
		border-color: var(--c-border);
	}

	.btn.secondary:hover {
		background: var(--c-bg-muted);
	}

	.btn.danger {
		background: var(--c-danger);
		color: var(--c-text-on-primary);
		border-color: var(--c-danger);
	}

	.btn.danger:hover {
		background: var(--c-danger-hover);
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 100;
	}

	.confirm-dialog {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 101;
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-xl);
		padding: 24px;
		width: 300px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
	}

	.confirm-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--c-danger-bg);
		color: var(--c-danger);
	}

	.confirm-msg {
		margin: 0;
		font-size: 13px;
		color: var(--c-text);
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		gap: 8px;
		width: 100%;
	}

	.confirm-actions .btn {
		width: 100%;
	}

	:global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
