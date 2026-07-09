<script lang="ts">
	import { onMount } from 'svelte';

	let nodeVersion = $state('');
	let hugoVersion = $state('');
	let appVersion = $state('');

	onMount(() => {
		fetch('/api/version')
			.then(r => r.json())
			.then(data => {
				appVersion = data.appVersion ?? '';
				nodeVersion = data.nodeVersion ?? '';
				hugoVersion = data.hugoVersion ?? '';
			})
			.catch(() => {});
	});
</script>

<header class="app-header">
	<div class="header-brand">
		<img src="/favicon.svg" alt="Hugo" class="header-logo" />
		<h2>Hugo CMS</h2>
	</div>
	<div class="header-versions">
		{appVersion}
		{#if nodeVersion || hugoVersion}
			<span class="sep">·</span>
			<img src="/node-logo.svg" alt="Node.js" class="header-logo-sm" />
			{nodeVersion}
			<span class="sep">·</span>
			<img src="/favicon.svg" alt="Hugo" class="header-logo-sm" />
			{hugoVersion}
		{/if}
	</div>
</header>

<style>
	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg);
		flex-shrink: 0;
		height: 48px;
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.header-logo {
		width: 24px;
		height: 24px;
	}

	h2 {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		color: var(--c-text);
	}

	.header-versions {
		display: flex;
		align-items: center;
		gap: 2px;
		font-size: 11px;
		color: var(--c-text-muted);
		white-space: nowrap;
		user-select: none;
	}

	.header-logo-sm {
		width: 12px;
		height: 12px;
		vertical-align: middle;
	}

	.sep {
		margin: 0 6px;
		color: var(--c-border);
	}
</style>
