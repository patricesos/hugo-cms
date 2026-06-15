<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor as TiptapEditor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { Markdown } from 'tiptap-markdown';

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
			],
			content,
			onUpdate: markUnsaved,
		});

		updateStats();
		onSaveState?.('saved');

		return () => {
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
		<button onclick={() => exec('undo')} title="Annuler (Ctrl+Z)">↩</button>
		<button onclick={() => exec('redo')} title="Rétablir (Ctrl+Shift+Z)">↪</button>
		<span class="sep"></span>
		<button onclick={() => toggleHeading(1)} class:active={editor?.isActive('heading', { level: 1 })}>H1</button>
		<button onclick={() => toggleHeading(2)} class:active={editor?.isActive('heading', { level: 2 })}>H2</button>
		<button onclick={() => toggleHeading(3)} class:active={editor?.isActive('heading', { level: 3 })}>H3</button>
		<span class="sep"></span>
		<button onclick={() => exec('toggleBold')} class:active={editor?.isActive('bold')}><strong>B</strong></button>
		<button onclick={() => exec('toggleItalic')} class:active={editor?.isActive('italic')}><em>I</em></button>
		<button onclick={() => exec('toggleCode')} class:active={editor?.isActive('code')}>{'</>' }</button>
		<button onclick={setLink} class:active={editor?.isActive('link')}>🔗</button>
		<span class="sep"></span>
		<button onclick={() => exec('toggleBlockquote')} class:active={editor?.isActive('blockquote')}>"</button>
		<button onclick={() => exec('toggleBulletList')} class:active={editor?.isActive('bulletList')}>•</button>
		<button onclick={() => exec('toggleOrderedList')} class:active={editor?.isActive('orderedList')}>1.</button>
		<button onclick={() => exec('setHorizontalRule')}>—</button>
	</div>

	<div bind:this={editorEl} class="editor-content"></div>

	<div bind:this={bubbleEl} class="bubble-menu">
		<button onclick={() => exec('toggleBold')} class:active={editor?.isActive('bold')}><strong>B</strong></button>
		<button onclick={() => exec('toggleItalic')} class:active={editor?.isActive('italic')}><em>I</em></button>
		<button onclick={() => exec('toggleCode')} class:active={editor?.isActive('code')}>{'</>' }</button>
		<button onclick={setLink} class:active={editor?.isActive('link')}>🔗</button>
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
		gap: 2px;
		padding: 6px 12px;
		border-bottom: 1px solid #e5e7eb;
		background: #fafafa;
		flex-shrink: 0;
	}

	.editor-toolbar button, .bubble-menu button {
		padding: 4px 8px;
		border: 1px solid transparent;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		font-size: 13px;
		color: #374151;
		transition: all 0.12s;
		line-height: 1.4;
	}

	.editor-toolbar button:hover, .bubble-menu button:hover {
		background: #e5e7eb;
		border-color: #d1d5db;
	}

	.editor-toolbar button.active, .bubble-menu button.active {
		background: #e0e7ff;
		border-color: #6366f1;
		color: #4338ca;
	}

	.sep {
		width: 1px;
		height: 20px;
		background: #e5e7eb;
		margin: 0 4px;
	}

	.editor-content {
		flex: 1;
		padding: 32px 48px;
		max-width: 740px;
		margin: 0 auto;
		width: 100%;
		outline: none;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 16px;
		line-height: 1.8;
		overflow-y: auto;
	}

	.editor-content :global(h1) { font-size: 2em; margin: 0.67em 0; font-weight: 700; }
	.editor-content :global(h2) { font-size: 1.5em; margin: 0.75em 0; font-weight: 600; }
	.editor-content :global(h3) { font-size: 1.17em; margin: 0.83em 0; font-weight: 600; }
	.editor-content :global(p) { margin: 0.5em 0; }
	.editor-content :global(blockquote) {
		border-left: 3px solid #d0d0d0;
		margin: 1em 0;
		padding: 0.5em 1em 0.5em 1.2em;
		color: #555;
		font-style: italic;
	}
	.editor-content :global(pre) {
		background: #1e1e2e;
		color: #cdd6f4;
		padding: 16px;
		border-radius: 8px;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 14px;
		overflow-x: auto;
	}
	.editor-content :global(code) {
		background: #f0f0f0;
		padding: 2px 6px;
		border-radius: 3px;
		font-family: 'JetBrains Mono', monospace;
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
		border-top: 2px solid #e5e7eb;
		margin: 2em 0;
	}
	.editor-content :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}
	.editor-content :global(a) {
		color: #6366f1;
		text-decoration: underline;
	}
	.editor-content :global(p.is-editor-empty:first-child::before) {
		color: #adb5bd;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	.bubble-menu {
		display: flex;
		gap: 2px;
		padding: 4px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0,0,0,0.12);
	}
</style>
