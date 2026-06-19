<script lang="ts">
	import { onMount } from 'svelte';
	import { ModeSync, getRawBody, splitRawContent } from '$lib/editor/mode-sync.svelte';
	import RawEditor from './RawEditor.svelte';
	import WysiwygEditor from './WysiwygEditor.svelte';
	import ImagePicker from './ImagePicker.svelte';
	import ShortcodeDialog from './ShortcodeDialog.svelte';
	import { Undo2, Redo2, Heading1, Heading2, Heading3, Bold, Italic, Code, Link, Quote, List, ListOrdered, Minus, Pilcrow, Code2, Image as ImageIcon, Zap } from '@lucide/svelte';

	interface EditorProps {
		content?: string;
		frontmatter?: Record<string, unknown>;
		frontmatterFormat?: 'yaml' | 'toml';
		rawMode?: boolean;
		showBubbleMenu?: boolean;
		showSlashMenu?: boolean;
		autoSaveDelay?: number;
		editorFont?: string;
		editorFontSize?: string;
		editorMaxWidth?: string;
		editorMaxWidthCustom?: number;
		historyDepth?: number;
		saveRequest?: number;
		getContent?: (fn: () => string) => void;
		onSave?: (markdown: string) => void;
		onFrontmatterChange?: (fm: Record<string, unknown>) => void;
		onStats?: (stats: { words: number; chars: number }) => void;
		onSaveState?: (state: 'saved' | 'unsaved' | 'saving') => void;
		onSetContent?: (fn: (content: string) => void) => void;
		onRawModeChange?: (rawMode: boolean) => void;
	}

	let { content = '', frontmatter = {}, frontmatterFormat = 'yaml', rawMode = false, showBubbleMenu = true, showSlashMenu = true, autoSaveDelay = 2000, editorFont = 'serif', editorFontSize = 'normal', editorMaxWidth = '720px', editorMaxWidthCustom = 720, historyDepth = 250, saveRequest = 0, getContent, onSave, onFrontmatterChange, onStats, onSaveState, onSetContent, onRawModeChange }: EditorProps = $props();

	let sync = $state<ModeSync | null>(null);
	let prevContent = '';
	let prevRawMode = false;
	let rawEditor = $state<RawEditor | null>(null);
	let wysiwygEditor = $state<WysiwygEditor | null>(null);

	let showImagePicker = $state(false);
	let pendingImageUrl = $state('');
	let showShortcodeDialog = $state(false);

	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let rawSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let saveVersion = 0;

	function clearAutoSave() {
		if (autoSaveTimeout) {
			clearTimeout(autoSaveTimeout);
			autoSaveTimeout = null;
		}
	}

	function markUnsaved() {
		clearAutoSave();
		++saveVersion;
		onSaveState?.('unsaved');
		autoSaveTimeout = setTimeout(doAutoSave, autoSaveDelay);
	}

	async function doAutoSave() {
		if (!wysiwygEditor) return;
		const version = ++saveVersion;
		onSaveState?.('saving');
		await onSave?.(wysiwygEditor.getMarkdown());
		if (version !== saveVersion) return;
		onSaveState?.('saved');
		autoSaveTimeout = null;
	}

	async function doRawAutoSave() {
		const version = ++saveVersion;
		onSaveState?.('saving');
		const { frontmatter: fm, body } = splitRawContent(sync?.rawContent ?? '');
		if (fm) onFrontmatterChange?.(fm);
		await onSave?.(body);
		if (version !== saveVersion) return;
		onSaveState?.('saved');
		rawSaveTimeout = null;
	}

	function markRawUnsaved() {
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		++saveVersion;
		onSaveState?.('unsaved');
		rawSaveTimeout = setTimeout(doRawAutoSave, autoSaveDelay);
	}

	async function handleManualSave() {
		clearAutoSave();
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		++saveVersion;
		onSaveState?.('saving');
		if (rawMode) {
			const { frontmatter: fm, body } = splitRawContent(sync?.rawContent ?? '');
			if (fm) onFrontmatterChange?.(fm);
			await onSave?.(body);
		} else if (wysiwygEditor) {
			await onSave?.(wysiwygEditor.getMarkdown());
		}
		onSaveState?.('saved');
	}

	function updateStats() {
		if (!wysiwygEditor) return;
		const md = wysiwygEditor.getMarkdown();
		onStats?.({
			words: md.trim() ? md.trim().split(/\s+/).length : 0,
			chars: md.length,
		});
	}

	function handleImageSelect(url: string) {
		if (rawMode) {
			rawEditor?.rawWrap('![', `](${url})`);
		} else {
			wysiwygEditor?.exec('setImage', { src: url });
		}
		showImagePicker = false;
	}

	function handleImagePickerClose() {
		showImagePicker = false;
	}

	function toolbarImage() {
		pendingImageUrl = '';
		showImagePicker = true;
	}

	function toolbarShortcode() {
		showShortcodeDialog = true;
	}

	function handleShortcodeInsert(shortcode: string) {
		if (rawMode) {
			rawEditor?.rawWrapInner(shortcode);
		} else {
			wysiwygEditor?.exec('insertContent', shortcode);
		}
		showShortcodeDialog = false;
	}

	function toggleHeading(level: 1 | 2 | 3) {
		if (rawMode) {
			rawEditor?.rawHeading(level);
		} else {
			wysiwygEditor?.toggleHeading(level);
		}
	}

	function handleBold() {
		if (rawMode) {
			rawEditor?.rawWrap('**', '**');
		} else {
			wysiwygEditor?.exec('toggleBold');
		}
	}

	function handleItalic() {
		if (rawMode) {
			rawEditor?.rawWrap('*', '*');
		} else {
			wysiwygEditor?.exec('toggleItalic');
		}
	}

	function handleCode() {
		if (rawMode) {
			rawEditor?.rawWrap('`', '`');
		} else {
			wysiwygEditor?.exec('toggleCode');
		}
	}

	function handleLink() {
		if (rawMode) {
			rawEditor?.rawLink();
		} else {
			wysiwygEditor?.setLink();
		}
	}

	function handleBlockquote() {
		if (rawMode) {
			rawEditor?.rawBlockquote();
		} else {
			wysiwygEditor?.exec('toggleBlockquote');
		}
	}

	function handleList(ordered: boolean) {
		if (rawMode) {
			rawEditor?.rawList(ordered);
		} else {
			wysiwygEditor?.exec(ordered ? 'toggleOrderedList' : 'toggleBulletList');
		}
	}

	function handleHr() {
		if (rawMode) {
			rawEditor?.rawHr();
		} else {
			wysiwygEditor?.exec('setHorizontalRule');
		}
	}

	function handleUndo() {
		if (rawMode) {
			rawEditor?.rawUndo();
		} else {
			wysiwygEditor?.exec('undo');
		}
	}

	function handleRedo() {
		if (rawMode) {
			rawEditor?.rawRedo();
		} else {
			wysiwygEditor?.exec('redo');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			handleManualSave();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
			e.preventDefault();
			onRawModeChange?.(!rawMode);
		}
	}

	onMount(() => {
		sync = new ModeSync();
		const initAction = sync.loadContent(content, rawMode, frontmatter, frontmatterFormat);
		onSaveState?.('saved');
		getContent?.(() => rawMode ? getRawBody(sync?.rawContent ?? '') : wysiwygEditor?.getMarkdown() ?? '');
		onSetContent?.((c: string) => {
			if (rawMode) {
				if (sync) sync.rawContent = c;
			} else {
				wysiwygEditor?.setContent(c);
			}
		});

		return () => {
			clearAutoSave();
			if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		};
	});

	// Coordination content + rawMode via ModeSync
	$effect(() => {
		if (!sync) return;
		if (content === prevContent && rawMode === prevRawMode) return;

		const cChanged = content !== prevContent;
		const rChanged = rawMode !== prevRawMode;

		if (cChanged) {
			const action = sync.loadContent(content, rawMode, frontmatter, frontmatterFormat);
			const body = action.buildEditor ?? action.setWysiwygContent;
			if (body) {
				wysiwygEditor?.setContent(body);
			}
		}
		if (rChanged) {
			if (rawMode) {
				if (!cChanged) {
					sync.toggleToRaw(() => wysiwygEditor?.getMarkdown() ?? '', frontmatter, frontmatterFormat);
				}
			} else if (!cChanged) {
				const { body } = sync.toggleToWysiwyg();
				wysiwygEditor?.setContent(body);
			}
		}

		if (cChanged && !rChanged) updateStats();
		if (cChanged) prevContent = content;
		if (rChanged) prevRawMode = rawMode;
	});

	// Frontmatter change → met à jour rawContent
	$effect(() => {
		if (!rawMode || !sync) return;
		if (sync.handleFrontmatterChange(frontmatter, frontmatterFormat)) {
			// rawContent a changé, RawEditor le voit via sa prop content
		}
	});

	let prevSaveRequest = $state(0);

	$effect(() => {
		if (saveRequest !== prevSaveRequest && saveRequest > 0) {
			handleManualSave();
			prevSaveRequest = saveRequest;
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-container" style="--editor-font: var(--font-{editorFont}); --editor-font-size: {editorFontSize === 'small' ? '14px' : editorFontSize === 'large' ? '18px' : '16px'}; --editor-max-width: {editorMaxWidth === 'custom' ? editorMaxWidthCustom + 'px' : editorMaxWidth}">
	<div class="editor-toolbar">
		<button onclick={handleUndo} title="Annuler (Ctrl+Z)"><Undo2 size={15} /></button>
		<button onclick={handleRedo} title="Rétablir (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
		<span class="sep"></span>
		<button onclick={() => toggleHeading(1)} class:active={!rawMode && wysiwygEditor?.isActive('heading', { level: 1 })} title="Titre 1"><Heading1 size={15} /></button>
		<button onclick={() => toggleHeading(2)} class:active={!rawMode && wysiwygEditor?.isActive('heading', { level: 2 })} title="Titre 2"><Heading2 size={15} /></button>
		<button onclick={() => toggleHeading(3)} class:active={!rawMode && wysiwygEditor?.isActive('heading', { level: 3 })} title="Titre 3"><Heading3 size={15} /></button>
		<span class="sep"></span>
		<button onclick={handleBold} class:active={!rawMode && wysiwygEditor?.isActive('bold')} title="Gras (Ctrl+B)"><Bold size={15} /></button>
		<button onclick={handleItalic} class:active={!rawMode && wysiwygEditor?.isActive('italic')} title="Italique (Ctrl+I)"><Italic size={15} /></button>
		<button onclick={handleCode} class:active={!rawMode && wysiwygEditor?.isActive('code')} title="Code"><Code size={15} /></button>
		<button onclick={handleLink} title="Lien"><Link size={15} /></button>
		<button onclick={toolbarImage} title="Image"><ImageIcon size={15} /></button>
		<button onclick={toolbarShortcode} title="Shortcode Hugo"><Zap size={15} /></button>
		<span class="sep"></span>
		<button onclick={handleBlockquote} class:active={!rawMode && wysiwygEditor?.isActive('blockquote')} title="Citation"><Quote size={15} /></button>
		<button onclick={() => handleList(false)} class:active={!rawMode && wysiwygEditor?.isActive('bulletList')} title="Liste à puces"><List size={15} /></button>
		<button onclick={() => handleList(true)} class:active={!rawMode && wysiwygEditor?.isActive('orderedList')} title="Liste numérotée"><ListOrdered size={15} /></button>
		<button onclick={handleHr} title="Ligne horizontale"><Minus size={15} /></button>
		<span class="sep"></span>
		<button class:toggle-active={rawMode} onclick={() => onRawModeChange?.(!rawMode)} title={rawMode ? 'Mode visuel' : 'Mode Markdown brut'}><Code2 size={15} /></button>
	</div>

	<RawEditor
		bind:this={rawEditor}
		content={sync?.rawContent ?? ''}
		active={rawMode}
		onchange={(c) => { if (sync) sync.rawContent = c; markRawUnsaved(); }}
	/>

	<WysiwygEditor
		bind:this={wysiwygEditor}
		content={content}
		active={!rawMode}
		{showBubbleMenu}
		{showSlashMenu}
		{historyDepth}
		onchange={markUnsaved}
	/>
</div>

<ImagePicker
	show={showImagePicker}
	onSelect={handleImageSelect}
	onClose={handleImagePickerClose}
/>

<ShortcodeDialog
	show={showShortcodeDialog}
	onInsert={handleShortcodeInsert}
	onClose={() => showShortcodeDialog = false}
/>

<style>
	.editor-container {
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--c-border);
		background: var(--c-bg-subtle);
		flex-shrink: 0;
	}

	.editor-toolbar button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		padding: 0;
		border: 1px solid transparent;
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;
		color: var(--c-text-secondary);
		transition: all 0.12s;
	}

	.editor-toolbar button:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.editor-toolbar button.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}

	.editor-toolbar button.toggle-active {
		background: var(--c-primary);
		color: white;
	}

	.sep {
		width: 1px;
		height: 20px;
		background: var(--c-border);
		margin: 0 4px;
		flex-shrink: 0;
	}
</style>
