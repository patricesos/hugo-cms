<script lang="ts">
	import { $effect, $state } from 'svelte';
	import { fade } from 'svelte/transition';
	import { PenLine } from '@lucide/svelte';
	import TabBar from './TabBar.svelte';
	import SitemapView from './SitemapView.svelte';
	import EditorMain from './EditorMain.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { fileTreeStore } from '$lib/stores/fileTree.svelte';
	import { hugoStore, previewReloadKey } from '$lib/stores/hugo.svelte';
	import { startPreviewResize, cleanupAllResize } from '$lib/resize';

	let { onLoadFile: _onLoadFile }: { onLoadFile?: (slug: string) => Promise<void> } = $props();

	const { settings, layout } = settingsStore;
	const { dialogs } = uiStore;
	const { tree, loadTree, loadAssetTree, loadArchetypes, loadConfigTree } = fileTreeStore;
	const {
		tabs, currentSlug,
		currentArchetype, currentConfigSlug, currentTab,
	} = editorStore;

	let ArchetypeViewComp = $state<any>(null);
	let ConfigViewComp = $state<any>(null);
	let ImageViewComp = $state<any>(null);
	let HugoPreviewComp = $state<any>(null);

	$effect(() => { if ($currentTab?.kind === 'archetype' && !ArchetypeViewComp) import('$lib/components/ArchetypeView.svelte').then(m => ArchetypeViewComp = m.default); });
	$effect(() => { if ($currentTab?.kind === 'config' && !ConfigViewComp) import('$lib/components/ConfigView.svelte').then(m => ConfigViewComp = m.default); });
	$effect(() => { if ($currentTab?.kind === 'static' && !ImageViewComp) import('$lib/components/ImageView.svelte').then(m => ImageViewComp = m.default); });
	$effect(() => { if ($layout.showPreview && !HugoPreviewComp) import('$lib/components/HugoPreview.svelte').then(m => HugoPreviewComp = m.default); });

	// Remount key pour forcer le remount de l'éditeur (passe à EditorMain)
	let remountKey = $state(0);
	export function bumpRemountKey() { remountKey++; }

	// Redimensionnement aperçu Hugo
	const startPreviewResizeHandler = startPreviewResize(
		() => $layout.previewWidth,
		(w) => settingsStore.updateLayout({ previewWidth: w }),
	);

	// Nettoyage du redimensionnement aperçu
	$effect(() => {
		return () => { cleanupAllResize(); };
	});

	// Callbacks internes
	export async function switchToTab(slug: string) {
		await editorStore.switchToTab(slug);
		const tab = $tabs.find(t => t.slug === slug);
		if (tab) {
			let v: 'content' | 'static' | 'archetypes' | 'config' = 'content';
			if (tab.kind === 'archetype') v = 'archetypes';
			else if (tab.kind === 'config') v = 'config';
			else if (tab.kind === 'static') v = 'static';
			settingsStore.updateLayout({ sidebarView: v });
		}
	}

	function handleCloseTab(slug: string) {
		editorStore.handleCloseTab(slug);
	}

	async function loadFile(slug: string) {
		await editorStore.loadFile(slug, loadTree);
		if ($currentSlug === slug) {
			settingsStore.updateLayout({ sidebarView: 'content' });
		}
	}
</script>

<main class="editor-panel">
	{#if $currentSlug || $tabs.length > 0}
		<TabBar
			tabs={$tabs}
			activeSlug={$currentSlug ?? ''}
			showFilenameInTabs={$settings.showFilenameInTabs}
			onSelect={(slug) => { switchToTab(slug); }}
			onClose={handleCloseTab}
		/>
	{/if}
	<div class="editor-panel-body">
		<div class="editor-panel-content">
			{#if $currentTab?.kind === 'archetype'}
				{#if ArchetypeViewComp}
					<ArchetypeViewComp
						slug={$currentArchetype}
						onClose={() => { editorStore.tabs.set($tabs.filter(t => t.slug !== $currentSlug)); editorStore.currentArchetype.set(null); editorStore.currentSlug.set(null); }}
						onDelete={(s: string) => { loadArchetypes(); editorStore.tabs.set($tabs.filter(t => t.slug !== s)); editorStore.currentArchetype.set(null); editorStore.currentSlug.set(null); }}
					/>
				{/if}
			{:else if $currentTab?.kind === 'config'}
				{#if ConfigViewComp}
					<ConfigViewComp
						slug={$currentConfigSlug}
						onClose={() => { editorStore.tabs.set($tabs.filter(t => t.slug !== $currentSlug)); editorStore.currentConfigSlug.set(null); editorStore.currentSlug.set(null); }}
						onDelete={(s: string) => { loadConfigTree(); editorStore.tabs.set($tabs.filter(t => t.slug !== s)); editorStore.currentConfigSlug.set(null); editorStore.currentSlug.set(null); }}
					/>
				{/if}
			{:else if $dialogs.showSitemap && !$currentSlug}
				<SitemapView
					tree={$tree}
					currentSlug={$currentSlug}
					onLoadFile={(slug) => { loadFile(slug); uiStore.updateDialogs({ showSitemap: false }); }}
					onRefresh={loadTree}
				/>
			{:else if !$currentSlug}
				{#if !$dialogs.showSitemap}
					<div class="empty-state" transition:fade={{ duration: 200 }}>
						<img class="hugo-logo" src="/hugo-cms.svg" alt="Hugo CMS" />
						<p>Sélectionnez un fichier dans la sidebar pour commencer à éditer.</p>
					</div>
				{/if}
			{:else if $currentTab?.kind === 'static'}
				<div class="editor-fixed-wrap">
					<div class="editor-header">
						<div class="header-left">
							<PenLine size={14} color="var(--c-text-muted)" />
							<span class="filename">{$currentSlug}</span>
						</div>
					</div>
					{#key $currentSlug}
						{#if ImageViewComp}
							<ImageViewComp slug={$currentSlug} assetUrl={`/api/assets/${$currentSlug}`} />
						{/if}
					{/key}
				</div>
		{:else}
			<EditorMain {remountKey} />
		{/if}
		</div>
		{#if $layout.showPreview}
			<div class="preview-resize-handle" role="presentation" onpointerdown={startPreviewResizeHandler}></div>
			{#if HugoPreviewComp}
				<HugoPreviewComp
					show={$layout.showPreview}
					onClose={() => settingsStore.updateLayout({ showPreview: false })}
					onStatusChange={(s: 'loading' | 'running' | 'stopped' | 'error') => hugoStore.update(v => ({ ...v, status: s }))}
					onUrlChange={(u: string | null) => hugoStore.update(v => ({ ...v, url: u }))}
					onLiveChange={(v: boolean) => hugoStore.update(s => ({ ...s, live: v }))}
					reloadKey={$previewReloadKey}
					style="width:{$layout.previewWidth}px;min-width:{$layout.previewWidth}px"
				/>
			{/if}
		{/if}
	</div>
</main>

<style>
	.editor-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
		position: relative;
	}

	.editor-panel-body {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 0;
	}

	.editor-panel-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-width: 0;
	}

	.editor-fixed-wrap {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.filename {
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		color: var(--c-text-muted);
		font-size: 14px;
	}

	.hugo-logo {
		width: 64px;
		height: auto;
		opacity: 0.3;
	}

	.preview-resize-handle {
		width: 5px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.preview-resize-handle:hover,
	.preview-resize-handle:active {
		background: var(--c-primary);
	}
</style>
