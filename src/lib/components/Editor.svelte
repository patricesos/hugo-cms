<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor as TiptapEditor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
	import { Markdown } from 'tiptap-markdown';
	import { SlashCommands } from '$lib/editor/slash-commands';
	import { Undo2, Redo2, Heading1, Heading2, Heading3, Bold, Italic, Code, Link, Quote, List, ListOrdered, Minus, Pilcrow } from '@lucide/svelte';

	interface EditorProps {
		content?: string;
		onSave?: (markdown: string) => void;
		onStats?: (stats: { words: number; chars: number }) => void;
		onSaveState?: (state: 'saved' | 'unsaved' | 'saving') => void;
	}

	let { content = '', onSave, onStats, onSaveState }: EditorProps = $props();

	let editor = $state<TiptapEditor | null>(null);
	let editorEl: HTMLDivElement;
	let bubbleEl: HTMLDivElement;
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

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

	function markUnsaved() {
		onSaveState?.('unsaved');
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			if (!editor) return;
			onSaveState?.('saving');
			onSave?.(getMarkdown());
			onSaveState?.('saved');
		}, 2000);
	}

	function handleManualSave() {
		if (!editor) return;
		onSaveState?.('saving');
		onSave?.(getMarkdown());
		onSaveState?.('saved');
	}

	onMount(() => {
		function onSlashImage(e: Event) {
			const detail = (e as CustomEvent).detail as { editor: TiptapEditor; range: import('@tiptap/core').Range };
			const url = window.prompt('URL de l\'image :');
			if (!url) return;
			const alt = window.prompt('Texte alternatif (alt) :');
			detail.editor.chain().focus().deleteRange(detail.range).setImage({ src: url, alt: alt || '' }).run();
		}
		window.addEventListener('slash:image', onSlashImage);

		editor = new TiptapEditor({
			element: editorEl,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3] },
				}),
				Placeholder.configure({ placeholder: 'Commencez à écrire…' }),
				BubbleMenuExtension.configure({ element: bubbleEl }),
				Markdown.configure({
					html: true,
					linkify: true,
					breaks: true,
				}),
				SlashCommands,
			],
			content,
			onUpdate: markUnsaved,
		});

		updateStats();
		onSaveState?.('saved');

		return () => {
			window.removeEventListener('slash:image', onSlashImage);
			editor?.destroy();
			if (saveTimeout) clearTimeout(saveTimeout);
		};
	});

	$effect(() => {
		if (editor && content && getMarkdown() !== content) {
			editor.commands.setContent(content);
			updateStats();
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

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 's') {
			e.preventDefault();
			handleManualSave();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-container">
	<div class="editor-toolbar">
		<button onclick={() => exec('undo')} title="Annuler (Ctrl+Z)"><Undo2 size={15} /></button>
		<button onclick={() => exec('redo')} title="Rétablir (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
		<span class="sep"></span>
		<button onclick={() => toggleHeading(1)} class:active={editor?.isActive('heading', { level: 1 })} title="Titre 1"><Heading1 size={15} /></button>
		<button onclick={() => toggleHeading(2)} class:active={editor?.isActive('heading', { level: 2 })} title="Titre 2"><Heading2 size={15} /></button>
		<button onclick={() => toggleHeading(3)} class:active={editor?.isActive('heading', { level: 3 })} title="Titre 3"><Heading3 size={15} /></button>
		<span class="sep"></span>
		<button onclick={() => exec('toggleBold')} class:active={editor?.isActive('bold')} title="Gras (Ctrl+B)"><Bold size={15} /></button>
		<button onclick={() => exec('toggleItalic')} class:active={editor?.isActive('italic')} title="Italique (Ctrl+I)"><Italic size={15} /></button>
		<button onclick={() => exec('toggleCode')} class:active={editor?.isActive('code')} title="Code"><Code size={15} /></button>
		<button onclick={setLink} class:active={editor?.isActive('link')} title="Lien"><Link size={15} /></button>
		<span class="sep"></span>
		<button onclick={() => exec('toggleBlockquote')} class:active={editor?.isActive('blockquote')} title="Citation"><Quote size={15} /></button>
		<button onclick={() => exec('toggleBulletList')} class:active={editor?.isActive('bulletList')} title="Liste à puces"><List size={15} /></button>
		<button onclick={() => exec('toggleOrderedList')} class:active={editor?.isActive('orderedList')} title="Liste numérotée"><ListOrdered size={15} /></button>
		<button onclick={() => exec('setHorizontalRule')} title="Ligne horizontale"><Minus size={15} /></button>
	</div>

	<div bind:this={editorEl} class="editor-content"></div>

	<div bind:this={bubbleEl} class="bubble-menu">
		<button onclick={() => exec('toggleBold')} class:active={editor?.isActive('bold')} title="Gras"><Bold size={14} /></button>
		<button onclick={() => exec('toggleItalic')} class:active={editor?.isActive('italic')} title="Italique"><Italic size={14} /></button>
		<button onclick={() => exec('toggleCode')} class:active={editor?.isActive('code')} title="Code"><Code size={14} /></button>
		<button onclick={setLink} class:active={editor?.isActive('link')} title="Lien"><Link size={14} /></button>
	</div>
</div>

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

	.bubble-menu {
		display: flex;
		gap: 2px;
		padding: 6px;
		background: var(--c-bg);
		border: 1px solid var(--c-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-md);
	}
</style>
