<script lang="ts">
	import { themeStore } from '$lib/stores/theme';

	let {
		show = false,
		onClose,
	}: {
		show?: boolean;
		onClose: () => void;
	} = $props();

	let searchQuery = $state('');
	let confirmThemeId = $state<string | null>(null);

	$effect(() => {
		if (show) {
			themeStore.fetchCatalog();
		}
	});

	let filteredCatalog = $derived.by(() => {
		const catalog = $themeStore.catalog;
		if (!searchQuery.trim()) return catalog;
		const q = searchQuery.toLowerCase().trim();
		return catalog.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.description.toLowerCase().includes(q) ||
				t.tags.some((tag) => tag.toLowerCase().includes(q)),
		);
	});

	async function handleInstall(themeId: string) {
		await themeStore.install(themeId);
	}

	async function handleActivate(themeId: string) {
		await themeStore.switchTheme(themeId);
	}

	async function handleUninstall(themeId: string) {
		confirmThemeId = themeId;
	}

	async function confirmUninstall() {
		if (!confirmThemeId) return;
		await themeStore.uninstall(confirmThemeId);
		confirmThemeId = null;
	}

	function cancelUninstall() {
		confirmThemeId = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !$themeStore.installing) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay" role="presentation" onclick={() => { if (!$themeStore.installing) onClose(); }}>
		<div class="dialog" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="header">
				<h3>Installer un thème Hugo</h3>
				<button class="btn-close" onclick={onClose}>✕</button>
			</div>

			<div class="search-row">
				<input
					type="text"
					placeholder="Rechercher un thème…"
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			{#if $themeStore.error}
				<div class="error-msg">{$themeStore.error}</div>
			{/if}

			<div class="grid-scroll">
				{#if $themeStore.loading}
					<div class="loading-state">Chargement du catalogue…</div>
				{:else if filteredCatalog.length === 0}
					<div class="empty-state">Aucun thème trouvé pour « {searchQuery} »</div>
				{:else}
					<div class="grid">
						{#each filteredCatalog as theme (theme.id)}
							<article class="card" class:installed={theme.installed}>
								<div class="card-body">
									<h4 class="card-title">{theme.name}</h4>
									<p class="card-desc">{theme.description}</p>
									<div class="card-tags">
										{#each theme.tags.slice(0, 4) as tag (tag)}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								</div>
								{#if $themeStore.installing === theme.id}
									<div class="progress-bar-track">
										<div class="progress-bar-fill" style="width: {$themeStore.installProgress}%"></div>
										<span class="progress-label">{$themeStore.installProgress}%</span>
									</div>
								{/if}
								<div class="card-footer">
									{#if theme.active}
										<span class="active-badge">Actif</span>
									{:else if theme.installed}
										<div class="btn-group">
											<button
												class="btn-activate"
												disabled={$themeStore.installing !== null}
												onclick={() => handleActivate(theme.id)}
											>
												Activer
											</button>
											<button
												class="btn-uninstall"
												disabled={$themeStore.installing !== null}
												onclick={() => handleUninstall(theme.id)}
											>
												Désinstaller
											</button>
										</div>
									{:else}
										<button
											class="btn-install"
											disabled={$themeStore.installing !== null}
											onclick={() => handleInstall(theme.id)}
										>
											{$themeStore.installing === theme.id ? 'Installation…' : 'Installer'}
										</button>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if confirmThemeId}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="confirm-overlay" role="presentation" onclick={cancelUninstall}>
				<div class="confirm-dialog" role="alertdialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
					<p>Désinstaller le thème <strong>{confirmThemeId}</strong> ?</p>
					<p class="confirm-warning">Cette action est irréversible.</p>
					<div class="confirm-actions">
						<button class="btn-cancel" onclick={cancelUninstall}>Annuler</button>
						<button class="btn-confirm" onclick={confirmUninstall}>Désinstaller</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.dialog {
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-xl);
		width: 680px;
		max-width: calc(100vw - 32px);
		max-height: calc(100vh - 64px);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px 0;
	}

	.header h3 {
		margin: 0;
		font-size: 16px;
		color: var(--c-text);
	}

	.btn-close {
		border: none;
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		font-size: 16px;
		padding: 4px;
		line-height: 1;
		border-radius: var(--radius-sm);
	}

	.btn-close:hover {
		color: var(--c-text);
		background: var(--c-bg-muted);
	}

	.search-row {
		padding: 12px 24px;
	}

	.search-input {
		width: 100%;
		padding: 8px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-sm);
		font-size: 13px;
		font-family: inherit;
		background: var(--c-bg);
		color: var(--c-text);
		box-sizing: border-box;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--c-primary);
	}

	.error-msg {
		margin: 0 24px 12px;
		padding: 8px 10px;
		background: var(--c-danger-bg);
		border: 1px solid var(--c-danger-border);
		border-radius: var(--radius-sm);
		color: var(--c-danger);
		font-size: 12px;
	}

	.grid-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 0 24px 20px;
	}

	.loading-state,
	.empty-state {
		padding: 40px 0;
		text-align: center;
		font-size: 13px;
		color: var(--c-text-muted);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 12px;
	}

	.card {
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		transition: border-color 0.12s;
		overflow: hidden;
	}

	.card:hover {
		border-color: var(--c-primary);
	}

	.card.installed {
		border-color: var(--c-success);
		opacity: 0.85;
	}

	.card-body {
		flex: 1;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.card-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--c-text);
	}

	.card-desc {
		margin: 0;
		font-size: 12px;
		color: var(--c-text-secondary);
		line-height: 1.5;
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: auto;
		padding-top: 6px;
	}

	.tag {
		font-size: 10px;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: var(--c-bg-muted);
		color: var(--c-text-muted);
		text-transform: lowercase;
	}

	.card-footer {
		padding: 10px 14px;
		border-top: 1px solid var(--c-border);
		display: flex;
		justify-content: flex-end;
	}

	.active-badge {
		font-size: 12px;
		color: var(--c-primary);
		font-weight: 600;
		padding: 2px 8px;
		border: 1px solid var(--c-primary);
		border-radius: var(--radius-sm);
	}

	.btn-activate {
		padding: 6px 14px;
		border: 1px solid var(--c-warning);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-warning);
		font-size: 12px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s;
	}

	.btn-activate:hover {
		background: var(--c-warning);
		color: white;
	}

	.btn-activate:disabled {
		opacity: 0.5;
		cursor: default;
		background: transparent;
		color: var(--c-warning);
	}

	.btn-install {
		padding: 6px 14px;
		border: 1px solid var(--c-primary);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-primary);
		font-size: 12px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s;
	}

	.btn-install:hover {
		background: var(--c-primary);
		color: white;
	}

	.btn-install:disabled {
		opacity: 0.5;
		cursor: default;
		background: transparent;
		color: var(--c-primary);
	}

	.btn-group {
		display: flex;
		gap: 6px;
	}

	.btn-uninstall {
		padding: 6px 14px;
		border: 1px solid var(--c-danger-border, #e0a0a0);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-danger, #c0392b);
		font-size: 12px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.12s;
	}

	.btn-uninstall:hover {
		background: var(--c-danger, #c0392b);
		color: white;
	}

	.btn-uninstall:disabled {
		opacity: 0.5;
		cursor: default;
		background: transparent;
		color: var(--c-danger, #c0392b);
	}

	.confirm-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10;
		border-radius: var(--radius-xl);
	}

	.confirm-dialog {
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		padding: 24px;
		max-width: 320px;
		text-align: center;
		box-shadow: var(--shadow-lg);
	}

	.confirm-dialog p {
		margin: 0 0 6px;
		font-size: 14px;
		color: var(--c-text);
	}

	.confirm-warning {
		color: var(--c-danger, #c0392b) !important;
		font-size: 12px !important;
		margin-bottom: 16px !important;
	}

	.confirm-actions {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.btn-cancel {
		padding: 8px 18px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--c-text);
		font-size: 13px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-cancel:hover {
		background: var(--c-bg-muted);
	}

	.btn-confirm {
		padding: 8px 18px;
		border: 1px solid var(--c-danger, #c0392b);
		border-radius: var(--radius-md);
		background: var(--c-danger, #c0392b);
		color: white;
		font-size: 13px;
		font-family: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-confirm:hover {
		opacity: 0.85;
	}

	.progress-bar-track {
		position: relative;
		margin: 0 14px;
		height: 20px;
		background: var(--c-bg-muted);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--c-primary);
		border-radius: var(--radius-sm);
		transition: width 0.3s ease;
		min-width: 4px;
	}

	.progress-label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: var(--c-text);
	}
</style>
