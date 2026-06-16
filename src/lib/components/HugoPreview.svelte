<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ExternalLink, Play, Square, Loader2, AlertTriangle, RefreshCw } from '@lucide/svelte';

	let { show, onClose, onStatusChange }: { show: boolean; onClose: () => void; onStatusChange?: (status: 'loading' | 'running' | 'stopped' | 'error') => void } = $props();

	let status = $state<'loading' | 'running' | 'stopped' | 'error'>('stopped');
	let url = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let checking = $state(false);
	let iframeKey = $state(0);

	$effect(() => {
		onStatusChange?.(status);
	});

	onMount(() => {
		if (show) checkStatus();
	});

	onDestroy(() => {
		stopHugo();
	});

	async function checkStatus() {
		checking = true;
		try {
			const res = await fetch('/api/hugo/status');
			const data = await res.json();
			if (data.running && data.url) {
				status = 'running';
				url = data.url;
			} else {
				status = 'stopped';
			}
			errorMessage = data.error || null;
		} catch {
			status = 'error';
			errorMessage = 'Impossible de contacter le serveur.';
		} finally {
			checking = false;
		}
	}

	async function startHugo() {
		status = 'loading';
		errorMessage = null;
		try {
			const res = await fetch('/api/hugo/start', { method: 'POST' });
			const data = await res.json();
			if (data.running && data.url) {
				status = 'running';
				url = data.url;
				iframeKey++;
			} else {
				status = 'error';
				errorMessage = data.error || 'Échec du démarrage du serveur Hugo.';
			}
		} catch {
			status = 'error';
			errorMessage = 'Erreur réseau lors du démarrage.';
		}
	}

	async function stopHugo() {
		try {
			await fetch('/api/hugo/stop', { method: 'POST' });
		} catch {
			// ignore
		}
		status = 'stopped';
		url = null;
	}

	function handleStopClick() {
		stopHugo();
	}

	function reloadPreview() {
		iframeKey++;
	}
</script>

{#if show}
	<aside class="hugo-preview">
		<div class="preview-header">
			<span class="preview-title">
				<ExternalLink size={14} />
				Aperçu Hugo
			</span>
			<div class="preview-actions">
				{#if status === 'running'}
					<button class="preview-btn" onclick={reloadPreview} title="Recharger">
						<RefreshCw size={13} />
					</button>
					<button class="preview-btn stop" onclick={handleStopClick} title="Arrêter le serveur">
						<Square size={13} />
					</button>
				{/if}
				<button class="preview-btn" onclick={onClose} title="Fermer l'aperçu">
					×
				</button>
			</div>
		</div>
		<div class="preview-body">
			{#if status === 'loading'}
				<div class="preview-placeholder">
					<Loader2 size={24} class="spin" />
					<p>Démarrage du serveur Hugo…</p>
				</div>
			{:else if status === 'running' && url}
				{#key iframeKey}
					<iframe
						src={url}
						class="preview-iframe"
						title="Aperçu Hugo"
					></iframe>
				{/key}
			{:else if status === 'error'}
				<div class="preview-placeholder error">
					<AlertTriangle size={24} />
					<p class="error-text">{errorMessage || 'Erreur inconnue'}</p>
					<div class="preview-actions-row">
						<button class="action-btn" onclick={checkStatus}>Réessayer</button>
						<button class="action-btn primary" onclick={startHugo}>Redémarrer</button>
					</div>
				</div>
			{:else}
				<div class="preview-placeholder">
					<ExternalLink size={24} />
					<p>Serveur Hugo arrêté</p>
					<p class="hint">Démarrez le serveur pour prévisualiser le site.</p>
					<button class="action-btn primary" onclick={startHugo}>
						<Play size={14} />
						Démarrer le serveur
					</button>
				</div>
			{/if}
		</div>
	</aside>
{/if}

<style>
	.hugo-preview {
		width: 50%;
		min-width: 320px;
		border-left: 1px solid var(--c-border);
		background: var(--c-bg);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		flex-shrink: 0;
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
	}

	.preview-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text-secondary);
	}

	.preview-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.preview-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-muted);
		font-size: 16px;
		transition: all 0.12s;
	}

	.preview-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.preview-btn.stop:hover {
		background: #fef2f2;
		color: var(--c-danger);
	}

	.preview-body {
		flex: 1;
		overflow: hidden;
		display: flex;
	}

	.preview-iframe {
		width: 100%;
		height: 100%;
		border: none;
		background: white;
	}

	.preview-placeholder {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 32px;
		color: var(--c-text-muted);
		text-align: center;
	}

	.preview-placeholder p {
		font-size: 13px;
		margin: 0;
	}

	.preview-placeholder .hint {
		font-size: 12px;
		color: var(--c-text-muted);
		max-width: 240px;
	}

	.preview-placeholder.error {
		color: var(--c-danger);
	}

	.error-text {
		color: var(--c-danger);
		font-size: 13px;
		max-width: 300px;
	}

	.preview-actions-row {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		color: var(--c-text-secondary);
		transition: all 0.12s;
	}

	.action-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.action-btn.primary {
		background: var(--c-primary);
		color: white;
		border-color: var(--c-primary);
	}

	.action-btn.primary:hover {
		background: var(--c-primary-hover);
	}

	:global(.spin) {
		animation: hspin 0.8s linear infinite;
	}

	@keyframes hspin {
		to { transform: rotate(360deg); }
	}
</style>
