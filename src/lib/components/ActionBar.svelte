<script lang="ts">
	import { PanelLeftClose, PanelLeftOpen, Search, FilePlus, FolderPlus, RefreshCw, Map, Eye, Terminal, GitBranch, Globe, Lock, Loader2, ExternalLink, Settings, Layers, Info } from '@lucide/svelte';
	import { settingsStore } from '$lib/stores/settings';
	import { uiStore } from '$lib/stores/ui';
	import { hugoStore, hugoStatus, hugoLive, hugoTogglingLive, previewReloadKey } from '$lib/stores/hugo';
	import { gitStore } from '$lib/stores/git';
	import { fileTreeStore } from '$lib/stores/fileTree';

	const { layout } = settingsStore;
	const { dialogs } = uiStore;
	const { initialized: gitInitialized } = gitStore;
	const { loadTree, loadAssetTree, loadConfigTree } = fileTreeStore;

	function toggleSidebar() {
		settingsStore.updateLayout({ sidebarOpen: !$layout.sidebarOpen });
	}

	function toggleGit() {
		settingsStore.updateLayout({ showGit: !$layout.showGit });
		if ($layout.showGit && !gitStore.status && !$gitInitialized) {
			gitStore.initialized.set(true);
			gitStore.refresh();
		}
	}

	async function refreshTrees() {
		await Promise.all([loadTree(), loadAssetTree(), loadConfigTree()]);
	}

	async function toggleHugoLive() {
		await hugoStore.toggleLive();
	}

	async function startHugoServer() {
		await hugoStore.start();
	}

	async function stopHugoServer() {
		await hugoStore.stop();
	}

	function openPreviewInTab() {
		hugoStore.openPreviewInTab();
	}

	function reloadPreview() {
		hugoStore.reloadPreview();
		if (!$layout.showPreview) settingsStore.updateLayout({ showPreview: true });
	}
</script>

<div class="action-bar">
	<div class="action-bar-left">
		<button class="icon-btn" onclick={toggleSidebar} title={$layout.sidebarOpen ? 'Réduire la sidebar' : 'Afficher la sidebar'}>
			{#if $layout.sidebarOpen}
				<PanelLeftClose size={16} />
			{:else}
				<PanelLeftOpen size={16} />
			{/if}
		</button>
	</div>
	<div class="action-bar-center">
		<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSearch: true })} title="Rechercher (Ctrl+P)">
			<Search size={16} />
		</button>
		<button class="icon-btn" onclick={() => { uiStore.updateDialogs({ createFileSection: '' }); uiStore.updateDialogs({ showCreateDialog: true }); }} title="Nouveau fichier">
			<FilePlus size={16} />
		</button>
		<button class="icon-btn" onclick={() => { uiStore.updateDialogs({ createFolderParent: '' }); uiStore.updateDialogs({ showCreateFolderDialog: true }); }} title="Nouveau dossier">
			<FolderPlus size={16} />
		</button>
		<button class="icon-btn" onclick={refreshTrees} title="Rafraîchir">
			<RefreshCw size={16} />
		</button>
		<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSitemap: !$dialogs.showSitemap })} title="Sitemap visuel">
			<Map size={16} />
		</button>
		<button class="icon-btn" class:active={$layout.showPreview} onclick={() => settingsStore.updateLayout({ showPreview: !$layout.showPreview })} title="Aperçu Hugo (Cmd+Shift+P)">
			<Eye size={16} />
		</button>
		<button class="icon-btn" class:active={$layout.showConsole} onclick={() => settingsStore.updateLayout({ showConsole: !$layout.showConsole })} title="Console Hugo">
			<Terminal size={16} />
		</button>
		<button class="icon-btn" class:active={$layout.showGit} onclick={toggleGit} title="Git">
			<GitBranch size={16} />
		</button>
	</div>
	<div class="action-bar-right">
		<button
			class="icon-btn network-toggle"
			class:active={$hugoLive}
			onclick={toggleHugoLive}
			disabled={$hugoTogglingLive}
			title={$hugoLive ? 'Restreindre au local' : 'Exposer sur le réseau'}
		>
			{#if $hugoTogglingLive}
				<Loader2 size={13} class="spin" />
			{:else if $hugoLive}
				<Globe size={13} />
				<span class="toggle-label">Réseau</span>
			{:else}
				<Lock size={13} />
				<span class="toggle-label">Local</span>
			{/if}
		</button>
		<button
			class="hugo-indicator"
			class:running={$hugoStatus === 'running'}
			class:loading={$hugoStatus === 'loading'}
			class:error={$hugoStatus === 'error'}
			onclick={$hugoStatus === 'running' ? stopHugoServer : $hugoStatus === 'stopped' || $hugoStatus === 'error' ? startHugoServer : undefined}
			disabled={$hugoStatus === 'loading'}
			title={$hugoStatus === 'running' ? 'Arrêter le serveur' : $hugoStatus === 'loading' ? 'Démarrage…' : $hugoStatus === 'error' ? 'Relancer le serveur' : 'Démarrer le serveur'}
		>
			<span class="hugo-indicator-dot"></span>
			<span class="hugo-indicator-label">
				{ $hugoStatus === 'running' ? 'Actif' : $hugoStatus === 'loading' ? 'Démarrage…' : $hugoStatus === 'error' ? 'Erreur' : 'Arrêté' }
			</span>
		</button>
		{#if $hugoStatus === 'running'}
			<button class="icon-btn" onclick={openPreviewInTab} title="Ouvrir dans un onglet">
				<ExternalLink size={14} />
			</button>
			<button class="icon-btn" onclick={reloadPreview} title="Recharger">
				<RefreshCw size={15} />
			</button>
		{/if}
		<button class="icon-btn" onclick={() => uiStore.toggleThemeSelector()} title="Thèmes Hugo">
			<Layers size={16} />
		</button>
		<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showAbout: true })} title="À propos">
			<Info size={16} />
		</button>
		<button class="icon-btn" onclick={() => uiStore.updateDialogs({ showSettings: true })} title="Paramètres">
			<Settings size={16} />
		</button>
	</div>
</div>

<style>
	.action-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 12px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
		height: 34px;
	}

	.action-bar-left,
	.action-bar-right {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.action-bar-center {
		display: flex;
		align-items: center;
		gap: 2px;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.icon-btn {
		width: 26px;
		height: 26px;
		border: none;
		background: transparent;
		color: var(--c-text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.12s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.icon-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.icon-btn.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.network-toggle {
		gap: 4px;
		width: auto;
		padding: 0 6px;
		font-size: 11px;
		white-space: nowrap;
	}

	.network-toggle.active {
		background: var(--c-success-bg);
		color: var(--c-success);
	}

	.network-toggle.active:hover {
		background: var(--c-success-border);
	}

	.toggle-label {
		font-size: 11px;
		font-weight: 500;
	}

	.hugo-indicator {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: 1px solid var(--c-border);
		border-radius: var(--radius-md);
		background: var(--c-bg);
		color: var(--c-text-secondary);
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		transition: all 0.12s;
		margin-right: 4px;
		white-space: nowrap;
	}

	.hugo-indicator:hover:not(:disabled) {
		background: var(--c-bg-muted);
	}

	.hugo-indicator:disabled {
		cursor: default;
		opacity: 0.8;
	}

	.hugo-indicator.running {
		color: var(--c-success);
		border-color: var(--c-success-border);
	}

	.hugo-indicator.running:hover:not(:disabled) {
		background: var(--c-danger-bg);
		color: var(--c-danger);
		border-color: var(--c-danger-border);
	}

	.hugo-indicator.error {
		color: var(--c-danger);
		border-color: var(--c-danger-border);
	}

	.hugo-indicator.loading {
		color: var(--c-warning);
		border-color: var(--c-warning-border);
	}

	.hugo-indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		transition: all 0.3s;
	}

	.hugo-indicator:not(.running):not(.loading):not(.error) .hugo-indicator-dot {
		background: var(--c-text-muted);
	}

	.hugo-indicator.running .hugo-indicator-dot {
		background: var(--c-success);
		box-shadow: 0 0 6px var(--c-success);
	}

	.hugo-indicator.running:hover:not(:disabled) .hugo-indicator-dot {
		background: var(--c-danger);
		box-shadow: 0 0 6px var(--c-danger);
	}

	.hugo-indicator.loading .hugo-indicator-dot {
		background: var(--c-warning);
		box-shadow: 0 0 6px var(--c-warning);
		animation: hugo-pulse 0.8s ease-in-out infinite;
	}

	.hugo-indicator.error .hugo-indicator-dot {
		background: var(--c-danger);
		box-shadow: 0 0 6px var(--c-danger);
		animation: hugo-pulse 0.4s ease-in-out infinite;
	}

	@keyframes hugo-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.hugo-indicator.running {
		border-color: var(--c-success);
		color: var(--c-success);
	}

	.hugo-indicator.loading {
		border-color: var(--c-warning);
		color: var(--c-warning);
	}

	.hugo-indicator.error {
		border-color: var(--c-danger);
		color: var(--c-danger);
	}

	.hugo-indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.hugo-indicator.loading .hugo-indicator-dot {
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}
</style>
