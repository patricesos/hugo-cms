<script lang="ts">
	import { fly } from 'svelte/transition';
	import { CheckCircle2, AlertCircle, Loader2, Type, Hash } from '@lucide/svelte';

	let {
		wordCount = 0,
		charCount = 0,
		saveState = 'saved',
	}: {
		wordCount?: number;
		charCount?: number;
		saveState?: 'saved' | 'unsaved' | 'saving';
	} = $props();
</script>

<div class="status-bar">
	<div class="status-left">
		{#key saveState}
			<span class="save-status" class:saved={saveState === 'saved'} class:unsaved={saveState === 'unsaved'} class:saving={saveState === 'saving'} transition:fly={{ duration: 200, y: -4 }}>
				{#if saveState === 'saved'}
					<CheckCircle2 size={13} />
					Enregistré
				{:else if saveState === 'unsaved'}
					<AlertCircle size={13} />
					Modifications non sauvegardées
				{:else}
					<Loader2 size={13} class="spin" />
					Sauvegarde…
				{/if}
			</span>
		{/key}
	</div>
	<div class="status-right">
		<span class="stat">
			<Type size={12} />
			{wordCount} mots
		</span>
		<span class="stat-sep">·</span>
		<span class="stat">
			<Hash size={12} />
			{charCount} caractères
		</span>
	</div>
</div>

<style>
	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 16px;
		font-size: 12px;
		color: var(--c-text-secondary);
		border-top: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		font-family: var(--font-mono);
		flex-shrink: 0;
	}

	.status-left, .status-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.save-status {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px;
		border-radius: 10px;
		font-weight: 500;
	}

	.save-status.saved {
		background: #f0fdf4;
		color: var(--c-success);
	}

	.save-status.unsaved {
		background: #fffbeb;
		color: var(--c-warning);
	}

	.save-status.saving {
		background: var(--c-primary-bg);
		color: var(--c-info);
	}

	:global(.spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.stat {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--c-text-muted);
	}

	.stat-sep {
		color: var(--c-border);
	}
</style>
