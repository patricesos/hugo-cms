<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor as TiptapEditor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { getClientConfigSync } from '$lib/client-config';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from 'tiptap-markdown';
	import Image from '@tiptap/extension-image';
	import { SlashCommands } from '$lib/editor/slash-commands';
	import { Undo2, Redo2, Heading1, Heading2, Heading3, Bold, Italic, Code, Link, Quote, List, ListOrdered, Minus, Pilcrow, Code2, Image as ImageIcon, Zap } from '@lucide/svelte';
	import ImagePicker from './ImagePicker.svelte';
	import ShortcodeDialog from './ShortcodeDialog.svelte';
	import yaml from 'js-yaml';
	import { parse, stringify } from '@iarna/toml';

	interface EditorProps {
		content?: string;
		frontmatter?: Record<string, unknown>;
		frontmatterFormat?: 'yaml' | 'toml';
		rawMode?: boolean;
		saveRequest?: number;
		getContent?: (fn: () => string) => void;
		onSave?: (markdown: string) => void;
		onFrontmatterChange?: (fm: Record<string, unknown>) => void;
		onStats?: (stats: { words: number; chars: number }) => void;
		onSaveState?: (state: 'saved' | 'unsaved' | 'saving') => void;
		onSetContent?: (fn: (content: string) => void) => void;
	}

	const SH_OPEN_SH = 'SH_OPEN_SH';
	const SH_CLOSE_SH = 'SH_CLOSE_SH';

	let { content = '', frontmatter = {}, frontmatterFormat = 'yaml', rawMode = false, saveRequest = 0, getContent, onSave, onFrontmatterChange, onStats, onSaveState, onSetContent }: EditorProps = $props();

	let editor = $state<TiptapEditor | null>(null);
	let editorEl = $state<HTMLDivElement | null>(null);
	let bubbleEl: HTMLDivElement;
	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;
	let rawContent = $state('');

	let showImagePicker = $state(false);
	let pendingImageInsert = $state<{ editor: TiptapEditor; range: import('@tiptap/core').Range } | null>(null);
	let showShortcodeDialog = $state(false);

	function updateStats() {
		if (!editor) return;
		const text = editor.state.doc.textContent;
		onStats?.({
			words: text.trim() ? text.trim().split(/\s+/).length : 0,
			chars: text.length,
		});
	}

	function protectShortcodes(text: string): string {
		return text.replace(/\{\{</g, SH_OPEN_SH).replace(/\{\{%/g, SH_OPEN_SH).replace(/>\}\}/g, SH_CLOSE_SH).replace(/%\}\}/g, SH_CLOSE_SH);
	}

	function restoreShortcodes(text: string): string {
		return text.replace(new RegExp(SH_OPEN_SH, 'g'), '{{<').replace(new RegExp(SH_CLOSE_SH, 'g'), '>}}');
	}

	function getMarkdown(): string {
		const md = ((editor?.storage as unknown) as Record<string, Record<string, () => string>>).markdown?.getMarkdown() ?? '';
		return restoreShortcodes(md);
	}

	function handleImageSelect(url: string) {
		if (rawMode) {
			rawWrap('![', `](${url})`);
			showImagePicker = false;
		} else if (pendingImageInsert) {
			const { editor: ed, range } = pendingImageInsert;
			ed.chain().focus().deleteRange(range).setImage({ src: url }).run();
			pendingImageInsert = null;
			showImagePicker = false;
		}
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
		++saveVersion;
		onSaveState?.('unsaved');
		const delay = getClientConfigSync()?.autoSaveDelay ?? 2000;
		autoSaveTimeout = setTimeout(doAutoSave, delay);
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
		const { frontmatter: fm, body } = splitRawContent(rawContent);
		if (fm) onFrontmatterChange?.(fm);
		await onSave?.(body);
		if (version !== saveVersion) return;
		onSaveState?.('saved');
		rawSaveTimeout = null;
	}

	function markRawUnsaved() {
		pushRawHistory();
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		++saveVersion;
		onSaveState?.('unsaved');
		const delay = getClientConfigSync()?.autoSaveDelay ?? 2000;
		rawSaveTimeout = setTimeout(doRawAutoSave, delay);
	}

	async function handleManualSave() {
		clearAutoSave();
		if (rawSaveTimeout) clearTimeout(rawSaveTimeout);
		++saveVersion;
		onSaveState?.('saving');
		if (rawMode) {
			const { frontmatter: fm, body } = splitRawContent(rawContent);
			if (fm) onFrontmatterChange?.(fm);
			await onSave?.(body);
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
						history: { depth: 250 },
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
				content: protectShortcodes(initContent),
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

	let prevRawMode = false;

	$effect(() => {
		if (rawMode === prevRawMode) return;
		if (rawMode) {
			// switching to raw: Tiptap → textarea, include frontmatter
			const fmString = (frontmatter && Object.keys(frontmatter).length > 0)
				? serializeFm(frontmatter, frontmatterFormat)
				: '';
			const body = getMarkdown();
			rawContent = fmString ? `${fmString}\n\n${body}` : body;
			// seed undo history
			rawHistory = [rawContent];
			rawHistoryIdx = 0;
			rawHistoryLock = 0;
		} else {
			// switching to WYSIWYG: textarea → Tiptap, strip frontmatter
			const { body } = splitRawContent(rawContent);
			if (editor) {
				editor.commands.setContent(protectShortcodes(body));
				updateStats();
			}
		}
		prevRawMode = rawMode;
	});

	$effect(() => {
		if (!editor) return;
		const ed = editor;
		function handleClick(e: MouseEvent) {
			const target = e.target as HTMLElement;
			if ((e.metaKey || e.ctrlKey) && target.tagName === 'A') {
				const href = (target as HTMLAnchorElement).getAttribute('href');
				if (href) window.open(href, '_blank');
			}
		}
		ed.view.dom.addEventListener('click', handleClick);
		return () => {
			if (!ed.isDestroyed && ed.view.dom) {
				ed.view.dom.removeEventListener('click', handleClick);
			}
		};
	});

	// when frontmatter changes in raw mode, refresh the raw textarea
	let prevFmSnapshot = $state('');
	$effect(() => {
		if (!rawMode) return;
		const snapshot = JSON.stringify(frontmatter) + '|' + frontmatterFormat;
		if (snapshot === prevFmSnapshot) return;
		prevFmSnapshot = snapshot;
		const body = getRawBody(rawContent);
		const fmString = serializeFm(frontmatter, frontmatterFormat);
		const newContent = fmString ? `${fmString}\n\n${body}` : body;
		if (newContent === rawContent) return;
		// push current state into history before replacing
		rawHistory = rawHistory.slice(0, rawHistoryIdx + 1);
		rawHistory.push(rawContent);
		rawHistoryIdx = rawHistory.length - 1;
		if (rawHistory.length > 200) rawHistory.shift();
		rawContent = newContent;
	});

	function serializeFm(fm: Record<string, unknown>, format: 'yaml' | 'toml'): string {
		if (format === 'toml') {
			return `+++\n${stringify(fm as Record<string, unknown>)}+++`;
		}
		return `---\n${yaml.dump(fm, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false }).trim()}\n---`;
	}

	function splitRawContent(text: string): { frontmatter: Record<string, unknown> | null; body: string; format: 'yaml' | 'toml' } {
		const trimmed = text.trimStart();
		if (trimmed.startsWith('+++')) {
			const endIdx = trimmed.indexOf('+++', 3);
			if (endIdx === -1) return { frontmatter: null, body: text, format: 'toml' };
			const block = trimmed.slice(3, endIdx).trim();
			const rest = trimmed.slice(endIdx + 3).trimStart();
			if (!block) return { frontmatter: null, body: rest, format: 'toml' };
			try {
				const parsed = parse(block) as Record<string, unknown>;
				if (parsed && typeof parsed === 'object') {
					return { frontmatter: parsed, body: rest, format: 'toml' };
				}
			} catch { /* ignore */ }
			return { frontmatter: null, body: text, format: 'toml' };
		}
		if (trimmed.startsWith('---')) {
			const endIdx = trimmed.indexOf('---', 3);
			if (endIdx === -1) return { frontmatter: null, body: text, format: 'yaml' };
			const yamlBlock = trimmed.slice(3, endIdx).trim();
			const rest = trimmed.slice(endIdx + 3).trimStart();
			if (!yamlBlock) return { frontmatter: null, body: rest, format: 'yaml' };
			try {
				const parsed = yaml.load(yamlBlock);
				if (parsed && typeof parsed === 'object') {
					return { frontmatter: parsed as Record<string, unknown>, body: rest, format: 'yaml' };
				}
			} catch { /* ignore */ }
			return { frontmatter: null, body: text, format: 'yaml' };
		}
		return { frontmatter: null, body: text, format: 'yaml' };
	}

	function getRawBody(text: string): string {
		const { frontmatter: _, body } = splitRawContent(text);
		return body;
	}

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
		if (!cmd) {
			console.error(`Editor command not found: ${fn}`);
			return;
		}
		const result = cmd(...args) as Record<string, () => boolean>;
		result?.run();
	}

	function setLink() {
		const url = window.prompt('URL du lien:');
		if (url) exec('setLink', { href: url });
	}

	function toolbarImage() {
		if (rawMode) {
			showImagePicker = true;
		} else if (editor) {
			const { from, to } = editor.state.selection;
			pendingImageInsert = { editor, range: { from, to } };
			showImagePicker = true;
		}
	}

	function toolbarShortcode() {
		showShortcodeDialog = true;
	}

	function handleShortcodeInsert(shortcode: string) {
		if (rawMode) {
			rawWrapInner(shortcode);
		} else if (editor) {
			const { from, to } = editor.state.selection;
			editor.chain().focus().deleteRange({ from, to }).insertContent([{ type: 'text', text: shortcode }]).run();
		}
		showShortcodeDialog = false;
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
		markRawUnsaved();
		requestAnimationFrame(() => {
			ta.focus();
			if (selected) {
				ta.setSelectionRange(start, start + wrapped.length);
			} else {
				ta.setSelectionRange(start + prefix.length, start + prefix.length);
			}
		});
	}

	function rawWrapInner(text: string) {
		const ta = textareaEl;
		if (!ta) return;
		const start = ta.selectionStart;
		const cur = rawContent;
		rawContent = cur.substring(0, start) + text + cur.substring(start);
		markRawUnsaved();
		requestAnimationFrame(() => {
			ta.focus();
			ta.setSelectionRange(start + text.length, start + text.length);
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
		markRawUnsaved();
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
		markRawUnsaved();
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
		markRawUnsaved();
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
		markRawUnsaved();
		requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + nl.length + 5, start + nl.length + 5); });
	}

	let rawHistory = $state<string[]>([]);
	let rawHistoryIdx = $state(-1);
	let rawHistoryLock = $state(0); // prevents push during undo/redo restore

	function rawUndo() {
		if (rawHistoryIdx <= 0) return;
		rawHistoryIdx--;
		rawHistoryLock++;
		rawContent = rawHistory[rawHistoryIdx];
		textareaEl?.focus();
	}

	function rawRedo() {
		if (rawHistoryIdx >= rawHistory.length - 1) return;
		rawHistoryIdx++;
		rawHistoryLock++;
		rawContent = rawHistory[rawHistoryIdx];
		textareaEl?.focus();
	}

	function pushRawHistory() {
		if (rawHistoryLock > 0) { rawHistoryLock = Math.max(0, rawHistoryLock - 1); return; }
		// trim future
		rawHistory = rawHistory.slice(0, rawHistoryIdx + 1);
		rawHistory.push(rawContent);
		if (rawHistory.length > 200) rawHistory.shift();
		rawHistoryIdx = rawHistory.length - 1;
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
		<button onclick={rawMode ? rawUndo : () => editor?.commands.undo()} title="Annuler (Ctrl+Z)"><Undo2 size={15} /></button>
		<button onclick={rawMode ? rawRedo : () => editor?.commands.redo()} title="Rétablir (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
		<span class="sep"></span>
		<button onclick={rawMode ? () => rawHeading(1) : () => toggleHeading(1)} class:active={!rawMode && editor?.isActive('heading', { level: 1 })} title="Titre 1"><Heading1 size={15} /></button>
		<button onclick={rawMode ? () => rawHeading(2) : () => toggleHeading(2)} class:active={!rawMode && editor?.isActive('heading', { level: 2 })} title="Titre 2"><Heading2 size={15} /></button>
		<button onclick={rawMode ? () => rawHeading(3) : () => toggleHeading(3)} class:active={!rawMode && editor?.isActive('heading', { level: 3 })} title="Titre 3"><Heading3 size={15} /></button>
		<span class="sep"></span>
		<button onclick={rawMode ? () => rawWrap('**', '**') : () => exec('toggleBold')} class:active={!rawMode && editor?.isActive('bold')} title="Gras (Ctrl+B)"><Bold size={15} /></button>
		<button onclick={rawMode ? () => rawWrap('*', '*') : () => exec('toggleItalic')} class:active={!rawMode && editor?.isActive('italic')} title="Italique (Ctrl+I)"><Italic size={15} /></button>
		<button onclick={rawMode ? () => rawWrap('`', '`') : () => exec('toggleCode')} class:active={!rawMode && editor?.isActive('code')} title="Code"><Code size={15} /></button>
		<button onclick={rawMode ? rawLink : setLink} title="Lien"><Link size={15} /></button>
		<button onclick={toolbarImage} title="Image"><ImageIcon size={15} /></button>
		<button onclick={toolbarShortcode} title="Shortcode Hugo"><Zap size={15} /></button>
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
		aria-label="Contenu brut"
	></textarea>
	<div bind:this={editorEl} class="editor-content" class:active={!rawMode} role="textbox" aria-label="Éditeur de contenu"></div>

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
