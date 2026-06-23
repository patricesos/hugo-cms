<script lang="ts">
	import { uiStore } from '$lib/stores/ui.svelte';
</script>

<div class="restart-banner">
	<span>Chemin du site modifié. Redémarrez le serveur pour appliquer.</span>
	<button class="restart-banner-close" onclick={() => uiStore.updateDialogs({ showRestartBanner: false })}>✕</button>
</div>

<style>
	.restart-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--c-warning-bg);
		color: var(--c-warning);
		font-size: 13px;
		border-bottom: 1px solid var(--c-warning);
		flex-shrink: 0;
	}

	.restart-banner-close {
		border: none;
		background: transparent;
		color: var(--c-warning);
		cursor: pointer;
		font-size: 14px;
		padding: 2px 6px;
		line-height: 1;
	}

	.restart-banner-close:hover {
		opacity: 0.7;
	}
</style>
