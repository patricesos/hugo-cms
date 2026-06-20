<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor as TiptapEditor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Placeholder from '@tiptap/extension-placeholder';
	import { Markdown } from 'tiptap-markdown';
	import ImageWithBlockMarkdown from '$lib/editor/tiptap-image-block';
	import { SlashCommands } from '$lib/editor/slash-commands';
	import { Bold, Code, Italic, Link } from '@lucide/svelte';
	import { protectShortcodes } from '$lib/shortcode-utils';

	interface WysiwygEditorProps {
		content?: string;
		active?: boolean;
		showBubbleMenu?: boolean;
		showSlashMenu?: boolean;
		historyDepth?: number;
		onchange?: () => void;
	}

	let { content = '', active = false, showBubbleMenu = true, showSlashMenu = true, historyDepth = 250, onchange }: WysiwygEditorProps = $props();

	let editor = $state<TiptapEditor | null>(null);
	let editorEl = $state<HTMLDivElement | null>(null);
	let bubbleEl: HTMLDivElement;

	function getSelectionRect(): DOMRect | null {
		const sel = window.getSelection();
		if (!sel || sel.rangeCount === 0) return null;
		return sel.getRangeAt(0).getBoundingClientRect();
	}

	function buildEditor(initContent: string) {
		if (editor) editor.destroy();
		editor = new TiptapEditor({
			element: editorEl,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3] },
					undoRedo: { depth: historyDepth },
				}),
				Placeholder.configure({ placeholder: 'Commencez à écrire…' }),
				Markdown.configure({
					html: true,
					linkify: true,
					breaks: false,
				}),
				ImageWithBlockMarkdown,
				...(showSlashMenu ? [SlashCommands] : []),
			],
			content: protectShortcodes(initContent),
			onUpdate: () => onchange?.(),
			onSelectionUpdate: () => {
				if (!editor || !bubbleEl || !showBubbleMenu) return;
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
				if (!editor || !bubbleEl || !showBubbleMenu) return;
				const { empty } = editor.state.selection;
				const { from: selFrom, to: selTo } = editor.state.selection;
				const hasText = !empty && editor.state.doc.textBetween(selFrom, selTo, ' ', ' ').trim().length > 0;
				if (!hasText) bubbleEl.style.display = 'none';
			},
		});
	}

	export function getMarkdown(): string {
		return ((editor?.storage as unknown) as Record<string, Record<string, () => string>>).markdown?.getMarkdown() ?? '';
	}

	export function exec(fn: string, ...args: unknown[]) {
		const chain = editor?.chain().focus() as Record<string, (...a: unknown[]) => unknown>;
		const cmd = chain?.[fn];
		if (!cmd) {
			console.error(`Editor command not found: ${fn}`);
			return;
		}
		const result = cmd(...args) as Record<string, () => boolean>;
		result?.run();
	}

	export function setLink() {
		const url = window.prompt('URL du lien:');
		if (url) exec('setLink', { href: url });
	}

	export function toggleHeading(level: 1 | 2 | 3) {
		if (editor?.isActive('heading', { level })) {
			exec('setParagraph');
		} else {
			exec('toggleHeading', { level });
		}
	}

	export function isActive(name: string, attrs?: Record<string, unknown>): boolean {
		return editor?.isActive(name, attrs) ?? false;
	}

	export function focus() {
		editor?.view.dom.focus();
	}

	// Cacher le bubble menu quand le composant est inactif
	$effect(() => {
		if (!active && bubbleEl) {
			bubbleEl.style.display = 'none';
		}
	});

	// Rebuild forcé depuis l'orchestrateur (onSetContent, tab switch)
	export function setContent(c: string) {
		buildEditor(c);
	}

	// Clics Ctrl+Meta sur les liens
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

	onMount(() => {
		buildEditor(content);
		return () => {
			editor?.destroy();
		};
	});
</script>

<div bind:this={editorEl} class="editor-content" class:active role="textbox" aria-label="Éditeur de contenu"></div>

<div bind:this={bubbleEl} class="bubble-menu" style="display: none">
	<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }} class:active={editor?.isActive('bold')} title="Gras"><Bold size={14} /></button>
	<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }} class:active={editor?.isActive('italic')} title="Italique"><Italic size={14} /></button>
	<button onmousedown={(e) => { e.preventDefault(); editor?.chain().focus().toggleCode().run(); }} class:active={editor?.isActive('code')} title="Code"><Code size={14} /></button>
	<button onmousedown={(e) => { e.preventDefault(); const url = window.prompt('URL du lien:'); if (url) editor?.chain().focus().setLink({ href: url }).run(); }} class:active={editor?.isActive('link')} title="Lien"><Link size={14} /></button>
</div>

<style>
	.editor-content {
		flex: 1;
		padding: 32px 48px;
		max-width: var(--editor-max-width, 740px);
		margin: 0 auto;
		width: 100%;
		outline: none;
		font-family: var(--editor-font, var(--font-serif));
		font-size: var(--editor-font-size, 16px);
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
		background: var(--c-code-bg);
		color: var(--c-code-text);
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

	.bubble-menu button {
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

	.bubble-menu button:hover {
		background: var(--c-bg-muted);
		color: var(--c-text);
	}

	.bubble-menu button.active {
		background: var(--c-primary-light);
		color: var(--c-primary);
	}
</style>
