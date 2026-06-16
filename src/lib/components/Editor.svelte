<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor as TiptapEditor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from 'tiptap-markdown';
	import Image from '@tiptap/extension-image';
	import { SlashCommands } from '$lib/editor/slash-commands';
	import { Undo2, Redo2, Heading1, Heading2, Heading3, Bold, Italic, Code, Link, Quote, List, ListOrdered, Minus, Pilcrow, Code2 } from '@lucide/svelte';
	import ImagePicker from './ImagePicker.svelte';

	interface EditorProps {
		content?: string;
		rawMode?: boolean;
		saveRequest?: number;
		getContent?: (fn: () => string) => void;
		onSave?: (markdown: string) => void;
		onStats?: (stats: { words: number; chars: number }) => void;
		onSaveState?: (state: 'saved' | 'unsaved' | 'saving') => void;
		onSetContent?: (fn: (content: string) => void) => void;
	}

	let { content = '', rawMode = $bindable(false), saveRequest = 0, getContent, onSave, onStats, onSaveState, onSetContent }: EditorProps = $props();

	let editor: TiptapEditor | null = null;
	let editorEl = $state<HTMLDivElement | null>(null);
	let bubbleEl: HTMLDivElement;
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let rawContent = $state('');

	let showImagePicker = $state(false);
	let pendingImageInsert = $state<{ editor: TiptapEditor; range: import('@tiptap/core').Range } | null>(null);

	function updateStats() {
		if (!editor) return;
		const text = editor.state.doc.textContent;
		onStats?.({
			words: text.trim() ? text.trim().split(/\s+/).length : 0,
			chars: text.length,
		});
	}

	function getMarkdown(): string {
		return ((editor?.storage as unknown) as Record<string, Record<string, () => string>>).markdown?.getMarkdown() ?? '';
	}

	function handleImageSelect(url: string) {
		if (!pendingImageInsert) return;
		const { editor: ed, range } = pendingImageInsert;
		ed.chain().focus().deleteRange(range).setImage({ src: url }).run();
		pendingImageInsert = null;
	}

	function handleImagePickerClose() {
		showImagePicker = false;
		pendingImageInsert = null;
	}

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
		onSaveState?.('unsaved');
		autoSaveTimeout = setTimeout(doAutoSave, 2000);
	}

	async function doAutoSave() {
		if (!editor) return;
		const version = ++saveVersion;
		onSaveState?.('saving');
		await onSave?.(getMarkdown());
		if (version !== saveVersion) return;
		onSaveState?.('saved');
		autoSaveTimeout = null;
	}

	async function doRawAutoSave() {
		const version = ++saveVersion;
		onSaveState?.('saving');
		await onSave?.(rawContent);
		if (version !== saveVersion) return;
		onSaveState?.('saved');
		rawSaveTimeout = null;
	}

	function markRawUnsaved() {
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		onSaveState?.('unsaved');
		rawSaveTimeout = setTimeout(doRawAutoSave, 2000);
	}

	async function handleManualSave() {
		clearAutoSave();
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		++saveVersion;
		onSaveState?.('saving');
		if (rawMode) {
			await onSave?.(rawContent);
		} else if (editor) {
			await onSave?.(getMarkdown());
		}
		onSaveState?.('saved');
	}

	function getSelectionRect(): DOMRect | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		return sel.getRangeAt(0).getBoundingClientRect();
	}

	onMount(() => {
		function onSlashImage(e: Event) {
			const detail = (e as CustomEvent).detail as { editor: TiptapEditor; range: import('@tiptap/core').Range };
			pendingImageInsert = detail;
			showImagePicker = true;
		}
		window.addEventListener('slash:image', onSlashImage);

		function createEditor(initContent: string) {
			clearAutoSave();
			if (editor) editor.destroy();
			editor = new TiptapEditor({
				element: editorEl,
				extensions: [
					StarterKit.configure({
						heading: { levels: [1, 2, 3] },
					}),
					Placeholder.configure({ placeholder: 'Commencez à écrire…' }),
					Markdown.configure({
						html: true,
						linkify: true,
						breaks: true,
					}),
					Image,
					SlashCommands,
				],
				content: initContent,
				onUpdate: markUnsaved,
				onSelectionUpdate: () => {
					if (!editor || !bubbleEl) return;
					const { empty } = editor.state.selection;
					const { from: selFrom, to: selTo } = editor.state.selection;
					const hasText = !empty && editor.state.doc.textBetween(selFrom, selTo, ' ', ' ').trim().length > 0;
					if (hasText) {
						const rect = getSelectionRect();
						if (rect) {
							bubbleEl.style.display = 'flex';
							bubbleEl.style.top = `${rect.top - bubbleEl.offsetHeight - 8}px`;
							bubbleEl.style.left = `${rect.left + (rect.width - bubbleEl.offsetWidth) / 2}px`;
						}
					} else {
						bubbleEl.style.display = 'none';
					}
				},
				onBlur: () => {
					if (bubbleEl) bubbleEl.style.display = 'none';
				},
				onFocus: () => {
					if (!editor || !bubbleEl) return;
					const { empty } = editor.state.selection;
					const { from: selFrom, to: selTo } = editor.state.selection;
					const hasText = !empty && editor.state.doc.textBetween(selFrom, selTo, ' ', ' ').trim().length > 0;
					if (!hasText) bubbleEl.style.display = 'none';
				},
			});
			updateStats();
		}

		createEditor(content);
		onSaveState?.('saved');
		getContent?.(() => rawMode ? rawContent : getMarkdown());
		onSetContent?.((c: string) => {
			if (rawMode) {
				rawContent = c;
			} else {
				createEditor(c);
			}
		});

		return () => {
			window.removeEventListener('slash:image', onSlashImage);
			editor?.destroy();
			clearAutoSave();
			if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		};
	});

	let prevRawMode = $state(rawMode);

	$effect(() => {
		if (rawMode === prevRawMode) return;
		if (rawMode) {
			// switching to raw: Tiptap → textarea
			rawContent = getMarkdown();
		} else {
			// switching to WYSIWYG: textarea → Tiptap
			if (editor) {
				editor.commands.setContent(rawContent);
				updateStats();
			}
		}
		prevRawMode = rawMode;
	});

	let prevSaveRequest = $state(0);

	$effect(() => {
		if (saveRequest !== prevSaveRequest && saveRequest > 0) {
			handleManualSave();
			prevSaveRequest = saveRequest;
		}
	});

	function exec(fn: string, ...args: unknown[]) {
		const chain = editor?.chain().focus() as Record<string, (...a: unknown[]) => unknown>;
		const cmd = chain?.[fn];
		if (cmd) {
			const result = cmd(...args) as Record<string, () => boolean>;
			result?.run();
		}
	}

	function setLink() {
		const url = window.prompt('URL du lien:');
		if (url) exec('setLink', { href: url });
	}

	function toggleHeading(level: 1 | 2 | 3) {
		if (editor?.isActive('heading', { level })) {
			exec('setParagraph');
		} else {
			exec('toggleHeading', { level });
		}
	}

	function rawWrap(prefix: string, suffix: string) {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const end = ta.selectionEnd;
		const text = rawContent;
		const selected = text.substring(start, end);
		const wrapped = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
		rawContent = text.substring(0, start) + wrapped + text.substring(end);
		requestAnimationFrame(() => {
			ta.focus();
			if (selected) {
				ta.setSelectionRange(start, start + wrapped.length);
			} else {
				ta.setSelectionRange(start + prefix.length, start + prefix.length);
			}
		});
	}

	function rawHeading(level: number) {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const text = rawContent;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		const lineEnd = text.indexOf('\n', start);
		const line = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
		const prefix = '#'.repeat(level) + ' ';
		const stripped = line.replace(/^#{1,6}\s*/, '');
		const newLine = `${prefix}${stripped}`;
		const before = text.substring(0, lineStart);
		const after = text.substring(lineEnd === -1 ? text.length : lineEnd);
		rawContent = before + newLine + after;
		requestAnimationFrame(() => {
			ta.focus();
			ta.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
		});
	}

	function rawList(ordered: boolean) {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const text = rawContent;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		const lineEnd = text.indexOf('\n', start);
		const stripped = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd).replace(/^(\s*)(\d+\.\s|[-*+]\s)/, '$1');
		const prefix = ordered ? '1. ' : '- ';
		const newLine = `${stripped ? stripped.replace(/^\s*/, '') : ''}`;
		const indent = stripped.match(/^\s*/)?.[0] || '';
		const result = `${indent}${prefix}${newLine}`;
		rawContent = text.substring(0, lineStart) + result + text.substring(lineEnd === -1 ? text.length : lineEnd);
		requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart + result.length, lineStart + result.length); });
	}

	function rawBlockquote() {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const text = rawContent;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		const lineEnd = text.indexOf('\n', start);
		const line = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);
		const newLine = line.startsWith('> ') ? line.slice(2) : `> ${line}`;
		rawContent = text.substring(0, lineStart) + newLine + text.substring(lineEnd === -1 ? text.length : lineEnd);
		requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(lineStart + newLine.length, lineStart + newLine.length); });
	}

	function rawLink() {
		const url = window.prompt('URL du lien:');
		if (!url) return;
		rawWrap('[', `](${url})`);
	}

	function rawHr() {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const text = rawContent;
		const before = text.substring(0, start);
		const after = text.substring(start);
		const nl = before.endsWith('\n') ? '' : '\n';
		rawContent = `${before}${nl}---\n\n${after}`;
		requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + nl.length + 5, start + nl.length + 5); });
	}

	function rawUndo() {
		const ta = textareaEl;
		if (!ta) return;
		ta.focus();
		document.execCommand('undo');
	}

	function rawRedo() {
		const ta = textareaEl;
		if (!ta) return;
		ta.focus();
		document.execCommand('redo');
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			handleManualSave();
		}
		if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
			e.preventDefault();
			rawMode = !rawMode;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-container">
	<div class="editor-toolbar">
		<button onclick={rawMode ? rawUndo : () => exec('undo')} title="Annuler (Ctrl+Z)"><Undo2 size={15} /></button>
		<button onclick={rawMode ? rawRedo : () => exec('redo')} title="Rétablir (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
		<span class="sep"></span>
		<button onclick={rawMode ? () => rawHeading(1) : () => toggleHeading(1)} class:active={!rawMode && editor?.isActive('heading', { level: 1 })} title="Titre 1"><Heading1 size={15} /></button>
		<button onclick={rawMode ? () => rawHeading(2) : () => toggleHeading(2)} class:active={!rawMode && editor?.isActive('heading', { level: 2 })} title="Titre 2"><Heading2 size={15} /></button>
		<button onclick={rawMode ? () => rawHeading(3) : () => toggleHeading(3)} class:active={!rawMode && editor?.isActive('heading', { level: 3 })} title="Titre 3"><Heading3 size={15} /></button>
		<span class="sep"></span>
		<button onclick={rawMode ? () => rawWrap('**', '**') : () => exec('toggleBold')} class:active={!rawMode && editor?.isActive('bold')} title="Gras (Ctrl+B)"><Bold size={15} /></button>
		<button onclick={rawMode ? () => rawWrap('*', '*') : () => exec('toggleItalic')} class:active={!rawMode && editor?.isActive('italic')} title="Italique (Ctrl+I)"><Italic size={15} /></button>
		<button onclick={rawMode ? () => rawWrap('`', '`') : () => exec('toggleCode')} class:active={!rawMode && editor?.isActive('code')} title="Code"><Code size={15} /></button>
		<button onclick={rawMode ? rawLink : setLink} title="Lien"><Link size={15} /></button>
		<span class="sep"></span>
		<button onclick={rawMode ? rawBlockquote : () => exec('toggleBlockquote')} class:active={!rawMode && editor?.isActive('blockquote')} title="Citation"><Quote size={15} /></button>
		<button onclick={rawMode ? () => rawList(false) : () => exec('toggleBulletList')} class:active={!rawMode && editor?.isActive('bulletList')} title="Liste à puces"><List size={15} /></button>
		<button onclick={rawMode ? () => rawList(true) : () => exec('toggleOrderedList')} class:active={!rawMode && editor?.isActive('orderedList')} title="Liste numérotée"><ListOrdered size={15} /></button>
		<button onclick={rawMode ? rawHr : () => exec('setHorizontalRule')} title="Ligne horizontale"><Minus size={15} /></button>
		<span class="sep"></span>
		<button class:toggle-active={rawMode} onclick={() => rawMode = !rawMode} title={rawMode ? 'Mode visuel' : 'Mode Markdown brut'}><Code2 size={15} /></button>
	</div>

	<textarea
		bind:this={textareaEl}
		class="raw-textarea"
		class:active={rawMode}
		bind:value={rawContent}
		oninput={markRawUnsaved}
		placeholder="Commencez à écrire…"
	></textarea>
	<div bind:this={editorEl} class="editor-content" class:active={!rawMode}></div>

	<div bind:this={bubbleEl} class="bubble-menu">
		<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }} class:active={editor?.isActive('bold')} title="Gras"><Bold size={14} /></button>
		<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }} class:active={editor?.isActive('italic')} title="Italique"><Italic size={14} /></button>
		<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }} class:active={editor?.isActive('code')} title="Code"><Code size={14} /></button>
		<button onmousedown={(e) => { e.preventDefault(); const url = window.prompt('URL du lien:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} class:active={editor?.isActive('link')} title="Lien"><Link size={14} /></button>
	</div>
</div>

<ImagePicker
	show={showImagePicker}
	onSelect={handleImageSelect}
	onClose={handleImagePickerClose}
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

	.editor-toolbar button, .bubble-menu button {
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

	.editor-toolbar button:hover, .bubble-menu button:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.editor-toolbar button.active, .bubble-menu button.active {
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

	.editor-content {
		flex: 1;
		padding: 32px 48px;
		max-width: 740px;
		margin: 0 auto;
		width: 100%;
		outline: none;
		font-family: var(--font-serif);
		font-size: 16px;
		line-height: 1.8;
		overflow-y: auto;
		display: none;
	}

	.editor-content.active {
		display: block;
	}

	.editor-content :global(h1) { font-size: 2em; margin: 0.67em 0; font-weight: 700; color: var(--c-text); }
	.editor-content :global(h2) { font-size: 1.5em; margin: 0.75em 0; font-weight: 600; color: var(--c-text); }
	.editor-content :global(h3) { font-size: 1.17em; margin: 0.83em 0; font-weight: 600; color: var(--c-text); }
	.editor-content :global(p) { margin: 0.5em 0; }
	.editor-content :global(blockquote) {
		border-left: 3px solid var(--c-border);
		margin: 1em 0;
		padding: 0.5em 1em 0.5em 1.2em;
		color: var(--c-text-secondary);
		font-style: italic;
	}
	.editor-content :global(pre) {
		background: #1e1e2e;
		color: #cdd6f4;
		padding: 16px;
		border-radius: var(--radius-lg);
		font-family: var(--font-mono);
		font-size: 14px;
		overflow-x: auto;
	}
	.editor-content :global(code) {
		background: var(--c-bg-muted);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.9em;
	}
	.editor-content :global(pre code) {
		background: transparent;
		padding: 0;
	}
	.editor-content :global(ul), .editor-content :global(ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}
	.editor-content :global(hr) {
		border: none;
		border-top: 2px solid var(--c-border);
		margin: 2em 0;
	}
	.editor-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}
	.editor-content :global(a) {
		color: var(--c-primary);
		text-decoration: underline;
	}
	.editor-content :global(p.is-editor-empty:first-child::before) {
		color: var(--c-text-muted);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	.raw-textarea {
		flex: 1;
		width: 100%;
		padding: 24px 32px;
		font-family: var(--font-mono);
		font-size: 14px;
		line-height: 1.7;
		border: none;
		outline: none;
		resize: none;
		background: var(--c-bg);
		color: var(--c-text);
		tab-size: 2;
		display: none;
	}

	.raw-textarea.active {
		display: block;
	}

	.raw-textarea::placeholder {
		color: var(--c-text-muted);
	}

	.bubble-menu {
		display: none;
		position: fixed;
		z-index: 100;
		gap: 2px;
		padding: 6px;
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}
</style>
