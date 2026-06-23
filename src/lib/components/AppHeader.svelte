<header class="app-header">
	<div class="header-brand">
		<img src="/favicon.svg" alt="Hugo" class="header-logo" />
		<h2>Hugo CMS</h2>
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
</style>
