<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { History, Loader2, GitCommit, Clock, User, AlertTriangle, Copy, CheckCircle2 } from '@lucide/svelte';

	interface GitLogEntry {
		hash: string;
		date: string;
		message: string;
		authorName: string;
	}

	let {
		show = false,
		onClose,
	}: {
		show: boolean;
		onClose: () => void;
	} = $props();

	let entries = $state<GitLogEntry[]>([]);
	let loading = $state(false);
	let error = $state('');
	let copied = $state<string | null>(null);

	$effect(() => {
		if (show) {
			loading = true;
			error = '';
			entries = [];
			fetch('/api/git/log')
				.then(r => r.json())
				.then(data => { entries = data as GitLogEntry[]; loading = false; })
				.catch(e => { error = String(e); loading = false; });
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function copyHash(hash: string) {
		navigator.clipboard.writeText(hash);
		copied = hash;
		setTimeout(() => { copied = null; }, 1500);
	}

	function formatDate(date: string) {
		const d = new Date(date);
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function shortHash(hash: string) {
		return hash.slice(0, 7);
	}
</script>

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="overlay" role="presentation" transition:fade={{ duration: 120 }} onmousedown={onClose} onkeydown={handleKeydown}>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-label="Historique Git"
			tabindex="0"
			transition:fly={{ duration: 160, y: 20 }}
			onmousedown={(e) => e.stopPropagation()}
		>
			<div class="dialog-header">
				<History size={16} />
				<h3>Historique</h3>
			</div>

			<div class="dialog-body">
				{#if loading}
					<div class="loading-state">
						<Loader2 size={20} class="spin" />
						<span>Chargement de l'historique…</span>
					</div>
				{:else if error}
					<div class="error-banner">
						<AlertTriangle size={14} />
						<span>{error}</span>
					</div>
				{:else if entries.length === 0}
					<div class="empty-state">
						<GitCommit size={20} />
						<span>Aucun commit trouvé</span>
					</div>
				{:else}
					<div class="log-list">
						{#each entries as entry}
							<div class="log-entry">
								<div class="entry-hash">
									<button class="hash-btn" title="Copier le hash" onclick={() => copyHash(entry.hash)}>
										{#if copied === entry.hash}
											<CheckCircle2 size={11} />
										{:else}
											<Copy size={11} />
										{/if}
										<code>{shortHash(entry.hash)}</code>
									</button>
								</div>
								<div class="entry-body">
									<div class="entry-message">{entry.message}</div>
									<div class="entry-meta">
										<span class="meta-item">
											<User size={11} />
											{entry.authorName}
										</span>
										<span class="meta-item">
											<Clock size={11} />
											{formatDate(entry.date)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="dialog-footer">
				<button class="btn secondary" onclick={onClose}>Fermer</button>
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
		width: 560px;
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

	.dialog-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 12px 20px;
		border-top: 1px solid var(--c-border);
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 0;
		color: var(--c-text-muted);
		font-size: 13px;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: #fef2f2;
		border-radius: var(--radius-md);
		color: var(--c-danger);
		font-size: 13px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 40px 0;
		color: var(--c-text-muted);
		font-size: 13px;
	}

	.log-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.log-entry {
		display: flex;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--c-border);
	}

	.log-entry:last-child {
		border-bottom: none;
	}

	.entry-hash {
		flex-shrink: 0;
		padding-top: 1px;
	}

	.hash-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
		font-size: 11px;
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
		font-size: 11px;
	}

	.entry-body {
		flex: 1;
		min-width: 0;
	}

	.entry-message {
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text);
		line-height: 1.4;
		word-break: break-word;
	}

	.entry-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 4px;
		color: var(--c-text-muted);
		font-size: 11px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 3px;
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
