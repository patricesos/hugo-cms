<script lang="ts">
	import { slide } from 'svelte/transition';
	import { PenLine, Save, Loader2, CheckCircle2, AlertTriangle, PanelRightOpen, PanelRightClose } from '@lucide/svelte';
	import StatusBar from './StatusBar.svelte';
	import FrontMatterEditor from './FrontMatterEditor.svelte';
	import { editorStore } from '$lib/stores/editor.svelte';
	import { settingsStore } from '$lib/stores/settings.svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { fileTreeStore } from '$lib/stores/fileTree.svelte';
	import { startFmResize, cleanupAllResize } from '$lib/resize';
	import { resolveConflict } from '$lib/conflict';

	let { remountKey = 0 }: { remountKey?: number } = $props();

	const { settings, layout } = settingsStore;
	const {
		currentSlug, editorContent, currentFrontmatter, currentFmFormat,
		saveState, saveRequest, loading, conflictSlug, currentTab,
	} = editorStore;

	// Lazy import Editor (seul composant lourd)
	let EditorComp = $state<any>(null);
	$effect(() => { import('$lib/components/Editor.svelte').then(m => EditorComp = m.default); });

	// Auto-save différé après modification du frontmatter
	let fmSaveTimeout: ReturnType<typeof setTimeout> | null = null;

	// Redimensionnement panneau frontmatter
	const startFmResizeHandler = startFmResize(
		() => $layout.fmWidth,
		(w) => settingsStore.updateLayout({ fmWidth: w }),
	);

	// Nettoyage
	$effect(() => {
		return () => {
			if (fmSaveTimeout) clearTimeout(fmSaveTimeout);
			cleanupAllResize();
		};
	});

	async function handleSave(markdown: string): Promise<boolean> {
		return await editorStore.handleSave(markdown);
	}

	function handleFrontmatterChange(fm: Record<string, unknown>) {
		editorStore.handleFrontmatterChange(fm);
		if ($currentSlug) fileTreeStore.updateTreeFrontmatter($currentSlug, fm);
		if (fmSaveTimeout) clearTimeout(fmSaveTimeout);
		fmSaveTimeout = setTimeout(() => { editorStore.saveRequest.update(r => r + 1); }, 2000);
	}
</script>

<div class="editor-fixed-wrap">
	{#if $loading}
		<div class="loading-overlay">
			<div class="skeleton-block"></div>
			<div class="skeleton-block short"></div>
			<div class="skeleton-block"></div>
		</div>
	{/if}
	{#if $conflictSlug === $currentSlug}
		<div class="conflict-banner" transition:slide={{ duration: 200, axis: 'y' }}>
			<span class="conflict-icon"><AlertTriangle size={14} /></span>
			<span class="conflict-text">Fichier modifié en externe</span>
			<button class="conflict-btn" onclick={() => resolveConflict('reload')}>Recharger</button>
			<button class="conflict-btn primary" onclick={() => resolveConflict('overwrite')}>Écraser</button>
		</div>
	{/if}
	<div class="editor-header">
		<div class="header-left">
			<PenLine size={14} color="var(--c-text-muted)" />
			<span class="filename">{$currentSlug}.md</span>
			<button
				class="save-btn"
				class:saved={$saveState === 'saved'}
				class:unsaved={$saveState === 'unsaved'}
				class:saving={$saveState === 'saving'}
				onclick={() => editorStore.saveRequest.update(n => n + 1)}
				title={$saveState === 'saving' ? 'Sauvegarde…' : $saveState === 'unsaved' ? 'Enregistrer' : 'Enregistré'}
			>
				{#if $saveState === 'saving'}
					<Loader2 size={13} class="spin" />
				{:else if $saveState === 'unsaved'}
					<Save size={13} />
				{:else}
					<CheckCircle2 size={13} />
				{/if}
			</button>
		</div>
		<div class="header-right">
			<button class="icon-btn fm-toggle" onclick={() => settingsStore.updateLayout({ fmOpen: !$layout.fmOpen })} title={$layout.fmOpen ? 'Fermer le panneau' : 'Ouvrir le panneau'}>
				{#if $layout.fmOpen}
					<PanelRightClose size={14} />
				{:else}
					<PanelRightOpen size={14} />
				{/if}
			</button>
		</div>
	</div>
	<div class="editor-body" class:with-fm={$layout.fmOpen}>
		<div class="editor-main">
			<div class="editor-area">
				{#key remountKey}
					{#if EditorComp}
						<EditorComp
							content={$editorContent}
							frontmatter={$currentFrontmatter}
							frontmatterFormat={$currentFmFormat}
							rawMode={$currentTab?.rawMode ?? $settings.defaultRawMode}
							showBubbleMenu={$settings.showBubbleMenu}
							showSlashMenu={$settings.showSlashMenu}
							autoSaveDelay={$settings.autoSaveDelay}
							editorFont={$settings.editorFont}
							editorFontSize={$settings.editorFontSize}
							editorMaxWidth={$settings.editorMaxWidth}
							editorMaxWidthCustom={$settings.editorMaxWidthCustom}
							historyDepth={$settings.historyDepth}
							saveRequest={$saveRequest}
							getContent={(fn: () => string) => { editorStore.setEditorGetContent(fn); }}
							onSetContent={(fn: (content: string) => void) => { editorStore.setEditorSetContent(fn); }}
							onSave={handleSave}
							onFrontmatterChange={(fm: Record<string, unknown>) => { editorStore.handleFrontmatterChange(fm); if ($currentSlug) fileTreeStore.updateTreeFrontmatter($currentSlug, fm); }}
							onStats={(s: { words: number; chars: number }) => { editorStore.wordCount.set(s.words); editorStore.charCount.set(s.chars); }}
							onSaveState={(s: 'saved' | 'unsaved' | 'saving') => { editorStore.saveState.set(s); }}
							onRawModeChange={(mode: boolean) => { if ($currentSlug) editorStore.updateTabRawMode($currentSlug, mode); }}
						/>
					{:else}
						<div class="editor-loading">
							<div class="skeleton-block"></div>
							<div class="skeleton-block short"></div>
							<div class="skeleton-block"></div>
						</div>
					{/if}
				{/key}
			</div>
			{#if $layout.fmOpen}
				<div class="fm-resize-handle" role="presentation" onmousedown={startFmResizeHandler}></div>
				<aside class="fm-sidebar" style="width: {$layout.fmWidth}px; min-width: {$layout.fmWidth}px;" transition:slide={{ duration: 200, axis: 'x' }}>
					<FrontMatterEditor
						frontmatter={$currentFrontmatter}
						format={$currentFmFormat}
						fmRawMode={$layout.fmRawMode}
						onChange={handleFrontmatterChange}
					/>
				</aside>
			{/if}
		</div>
	</div>
	<StatusBar saveState={$saveState} onHelp={() => uiStore.updateDialogs({ showShortcuts: true })} />
</div>

<style>
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

	.header-right {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.filename {
		font-size: 13px;
		font-weight: 500;
		color: var(--c-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.save-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		background: transparent;
		color: var(--c-text-muted);
		transition: all 0.12s;
	}

	.save-btn.saved {
		color: var(--c-success);
	}

	.save-btn.saving {
		pointer-events: none;
	}

	.save-btn.saving :global(.spin) {
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-text-muted);
		cursor: pointer;
		transition: all 0.12s;
	}

	.icon-btn:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.editor-body {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 0;
	}

	.editor-main {
		flex: 1;
		display: flex;
		overflow: hidden;
		min-height: 0;
		min-width: 0;
	}

	.editor-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
		min-width: 0;
	}

	.editor-loading {
		flex: 1;
		padding: 48px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.skeleton-block {
		height: 20px;
		background: var(--c-bg-muted);
		border-radius: var(--radius-sm);
		animation: shimmer 1.2s ease-in-out infinite;
	}

	.skeleton-block.short {
		width: 40%;
	}

	@keyframes shimmer {
		0% { opacity: 0.4; }
		50% { opacity: 0.8; }
		100% { opacity: 0.4; }
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		background: var(--c-bg);
		z-index: 10;
		padding: 48px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.conflict-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px;
		background: var(--c-danger-bg);
		border-bottom: 1px solid var(--c-danger-border);
		font-size: 12px;
		color: var(--c-danger);
		flex-shrink: 0;
	}

	.conflict-icon {
		flex-shrink: 0;
	}

	.conflict-text {
		flex: 1;
	}

	.conflict-btn {
		padding: 2px 10px;
		border: 1px solid var(--c-danger-border);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c-danger);
		font-size: 11px;
		font-family: inherit;
		cursor: pointer;
	}

	.conflict-btn.primary {
		background: var(--c-danger);
		color: white;
		border-color: var(--c-danger);
	}

	.fm-toggle {
		width: 28px;
		height: 28px;
	}

	.fm-resize-handle {
		width: 5px;
		flex-shrink: 0;
		cursor: col-resize;
		background: transparent;
		transition: background 0.15s;
		position: relative;
		z-index: 5;
	}

	.fm-resize-handle::before {
		content: '';
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 2px;
		width: 1px;
		background: var(--c-border);
		transition: background 0.15s;
	}

	.fm-resize-handle:hover,
	.fm-resize-handle:active {
		background: var(--c-primary);
	}

	.fm-resize-handle:hover::before,
	.fm-resize-handle:active::before {
		background: var(--c-primary);
	}

	.fm-sidebar {
		display: flex;
		flex-direction: column;
		border-left: none;
		background: var(--c-bg);
		overflow-y: auto;
		flex-shrink: 0;
	}
</style>
