<script lang="ts">
	import { FolderOpen, Plus } from '@lucide/svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
</script>

<div class="setup-overlay">
	<div class="setup-card">
		<img src="/favicon.svg" alt="Hugo" class="setup-logo" />
		<h2>Bienvenue dans Hugo CMS</h2>
		<p class="setup-desc">Aucun site Hugo configuré. Choisissez un dossier existant ou créez-en un nouveau.</p>
		<div class="setup-actions">
			<button class="btn-primary" onclick={() => uiStore.updateDialogs({ showSettings: true })}>
				<FolderOpen size={16} />
				Ouvrir un dossier existant
			</button>
			<button class="btn-secondary" onclick={() => uiStore.updateDialogs({ showNewSiteDialog: true })}>
				<Plus size={16} />
				Créer un nouveau site
			</button>
		</div>
	</div>
</div>

<style>
	.setup-overlay {
		position: fixed;
		inset: 0;
		background: var(--c-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}
	.setup-card {
		text-align: center;
		max-width: 400px;
		padding: 32px;
	}
	.setup-logo {
		width: 80px;
		margin-bottom: 16px;
		opacity: 0.9;
	}
	.setup-card h2 {
		margin: 0 0 8px;
		font-size: 20px;
		color: var(--c-text);
	}
	.setup-desc {
		margin: 0 0 28px;
		font-size: 14px;
		color: var(--c-text-secondary);
		line-height: 1.5;
	}
	.setup-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 20px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text);
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
	}
	.btn-secondary:hover {
		background: var(--c-bg-muted);
	}
</style>
