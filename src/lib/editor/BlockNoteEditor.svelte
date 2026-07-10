<script lang="ts">
	import { onMount } from 'svelte';
	import {
		BlockNoteEditor as BNEditor,
		SuggestionMenu,
		getDefaultSlashMenuItems,
		filterSuggestionItems,
		createExtension,
	} from '@blocknote/core';
	import type { DefaultSuggestionItem } from '@blocknote/core';
	import { Selection } from 'prosemirror-state';
	import { protectShortcodes } from '$lib/shortcode-utils';
	import '@blocknote/core/style.css';

	interface BlockNoteEditorProps {
		content?: string;
		active?: boolean;
		showBubbleMenu?: boolean;
		showSlashMenu?: boolean;
		onchange?: () => void;
		onEditorReady?: (editor: BNEditor) => void;
	}

	let {
		content = '',
		active = false,
		showBubbleMenu = true,
		showSlashMenu = true,
		onchange,
		onEditorReady,
	}: BlockNoteEditorProps = $props();

	let container: HTMLDivElement;
	let floatingContainer: HTMLDivElement;
	let editor = $state<BNEditor | null>(null);
	let _latestMarkdown = $state('');
	let _suppressChange = false;

	// Slash menu state
	let menuShown = $state(false);
	let menuQuery = $state('');
	let menuX = $state(0);
	let menuY = $state(0);
	let menuItems = $state<DefaultSuggestionItem[]>([]);
	let menuSelectedIndex = $state(0);
	let smExtension: ReturnType<typeof SuggestionMenu> | null = null;
	let _unsubStore: (() => void) | null = null;

	// Side menu / drag handle state
	let sideMenuShow = $state(false);
	let sideMenuX = $state(0);
	let sideMenuY = $state(0);
	let sideMenuBlock: any = $state(null);
	let sideMenuExt: any = $state(null);
	let _isDragging = $state(false);
	let _unsubSideMenu: (() => void) | null = null;

	onMount(() => {
		editor = BNEditor.create({
			animations: true,
			disableExtensions: showBubbleMenu ? [] : ['formattingToolbar'],
			extensions: [
				createExtension({
					key: 'enter-fix',
					keyboardShortcuts: {
						Enter: ({ editor: bnEditor }) => {
							const tip = bnEditor._tiptapEditor;
							const sel = tip.state.selection.$from;
							if (
								!sel ||
								sel.parentOffset !== 0 ||
								sel.parent.type.name !== 'heading'
							) return false;

							const insertPos = sel.before(sel.depth - 1);
							const schema = tip.state.schema;
							const para = schema.nodes.paragraph.create();
							const blockContainer = schema.nodes.blockContainer.create(null, para);
							const tr = tip.state.tr.insert(insertPos, blockContainer);
							tr.setSelection(Selection.near(tr.doc.resolve(insertPos + 1)));
							tip.view.dispatch(tr);
							return true;
						},
					},
				}),
			],
		});
		editor.mount(container, { portalTarget: floatingContainer });

		if (showSlashMenu) {
			const sm = editor.getExtension('suggestionMenu') as unknown as ReturnType<typeof SuggestionMenu>;
			if (sm) {
				smExtension = sm;
				sm.addSuggestionMenu({ triggerCharacter: '/' });
				_unsubStore = sm.store.subscribe(() => {
					const state = sm.store.state;
					if (state?.show && state.referencePos) {
						menuShown = true;
						menuQuery = state.query;
						menuX = state.referencePos.x;
						menuY = state.referencePos.y + state.referencePos.height + 4;
						menuSelectedIndex = 0;
						const items = getDefaultSlashMenuItems(editor!);
						menuItems = state.query
							? filterSuggestionItems(items, state.query)
							: items;
					} else {
						menuShown = false;
						menuItems = [];
					}
				});
			}
		}

		// Side menu / drag handle
		const smExt = editor.getExtension('sideMenu') as any;
		if (smExt) {
			sideMenuExt = smExt;
			_unsubSideMenu = smExt.store.subscribe(() => {
				const state = smExt.store.state;
				if (state?.show && state.referencePos) {
					sideMenuShow = true;
					sideMenuX = state.referencePos.x - 26;
					sideMenuY = state.referencePos.y + state.referencePos.height / 2;
					sideMenuBlock = state.block;
				} else if (!_isDragging) {
					sideMenuShow = false;
					sideMenuBlock = null;
				}
			});
		}

		if (content) {
			const protectedContent = protectShortcodes(content);
			const blocks = editor.tryParseMarkdownToBlocks(protectedContent);
			if (blocks.length > 0) {
				editor.replaceBlocks(editor.document, blocks);
			}
		}

		editor.focus();

		if (!active) {
			editor._tiptapEditor.setEditable(false);
		}

		editor.onChange((ed) => {
			_latestMarkdown = ed.blocksToMarkdownLossy();
			if (!_suppressChange) onchange?.();
		});

		onEditorReady?.(editor);

		return () => {
			_unsubStore?.();
			_unsubStore = null;
			_unsubSideMenu?.();
			_unsubSideMenu = null;
			editor?.unmount();
			editor = null;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!menuShown) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			menuSelectedIndex = Math.min(menuSelectedIndex + 1, menuItems.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			menuSelectedIndex = Math.max(menuSelectedIndex - 1, 0);
		} else if (event.key === 'Enter' || event.key === 'Tab') {
			event.preventDefault();
			event.stopPropagation();
			selectItem(menuItems[menuSelectedIndex]);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			smExtension?.closeMenu();
			menuShown = false;
		}
	}

	function selectItem(item: DefaultSuggestionItem) {
		smExtension?.clearQuery();
		item.onItemClick();
		smExtension?.closeMenu();
		menuShown = false;
		editor?.focus();
	}

	function onDragHandleDragStart(e: DragEvent) {
		if (!sideMenuBlock || !sideMenuExt) return;
		_isDragging = true;
		sideMenuExt.blockDragStart(e, sideMenuBlock);
	}

	function onDragHandleDragEnd() {
		_isDragging = false;
		sideMenuExt?.blockDragEnd();
		sideMenuShow = false;
		sideMenuBlock = null;
	}

$effect(() => {
	if (!editor) return;
	if (active) {
		editor._tiptapEditor.setEditable(true);
		editor._tiptapEditor.view.dom.style.display = '';
	} else {
		editor._tiptapEditor.setEditable(false);
		editor._tiptapEditor.view.dom.style.display = 'none';
	}
});

$effect(() => {
	if (typeof window === 'undefined') return;
	window.addEventListener('keydown', handleKeydown, true);
	return () => window.removeEventListener('keydown', handleKeydown, true);
});

	// -- Exported API (matches WysiwygEditor interface) --

	export function getMarkdown(): string {
		return _latestMarkdown;
	}

	function changeBlockType(type: string, props?: Record<string, unknown>) {
		const pos = editor?.getTextCursorPosition();
		if (!pos) return;
		editor?.updateBlock(pos.block.id, { type, props: props as Record<string, string> });
	}

	export function exec(command: string, ...args: unknown[]) {
		const bnEditor = editor;
		if (!bnEditor) return;

		switch (command) {
			case 'toggleBold':
				bnEditor.toggleStyles({ bold: true });
				break;
			case 'toggleItalic':
				bnEditor.toggleStyles({ italic: true });
				break;
			case 'toggleCode':
				bnEditor.toggleStyles({ code: true });
				break;
			case 'setParagraph':
				changeBlockType('paragraph');
				break;
			case 'toggleBlockquote':
				changeBlockType('quote');
				break;
			case 'toggleBulletList':
				changeBlockType('bulletListItem');
				break;
			case 'toggleOrderedList':
				changeBlockType('numberedListItem');
				break;
			case 'setHorizontalRule': {
				const pos = bnEditor.getTextCursorPosition();
				if (pos) {
					bnEditor.insertBlocks(
						[{ type: 'divider', props: {} }],
						pos.block.id,
						'after',
					);
				}
				break;
			}
			case 'setImage': {
				const src = (args[0] as Record<string, unknown>)?.src as string | undefined;
				if (!src) break;
				const imgPos = bnEditor.getTextCursorPosition();
				if (imgPos) {
					bnEditor.insertBlocks(
						[{ type: 'image', props: { url: src, caption: '' } }],
						imgPos.block.id,
						'after',
					);
				}
				break;
			}
			case 'insertContent': {
				const text = args[0] as string;
				if (text) {
					const tip = bnEditor._tiptapEditor;
					tip.chain().focus().insertContent(text).run();
				}
				break;
			}
			case 'undo':
				bnEditor.undo();
				break;
			case 'redo':
				bnEditor.redo();
				break;
			case 'setLink': {
				const href = (args[0] as Record<string, unknown>)?.href as string | undefined;
				if (href) {
					const tip = bnEditor._tiptapEditor;
					tip.chain().focus().setLink({ href }).run();
				}
				break;
			}
			default:
				console.error(`BlockNote: unknown command "${command}"`);
		}
	}

	export function setLink() {
		const url = window.prompt('URL du lien:');
		if (url && editor) {
			const tip = editor._tiptapEditor;
			tip.chain().focus().setLink({ href: url }).run();
		}
	}

	export function toggleHeading(level: 1 | 2 | 3) {
		const bnEditor = editor;
		if (!bnEditor) return;
		const pos = bnEditor.getTextCursorPosition();
		if (!pos) return;
		if (pos.block.type === 'heading' && (pos.block.props as Record<string, unknown>)?.level === level) {
			changeBlockType('paragraph');
		} else {
			changeBlockType('heading', { level });
		}
	}

	export function isActive(name: string, attrs?: Record<string, unknown>): boolean {
		const bnEditor = editor;
		if (!bnEditor) return false;

		if (name === 'bold' || name === 'italic' || name === 'code') {
			const styles = bnEditor.getActiveStyles() as Record<string, boolean>;
			return styles[name] === true;
		}
		if (name === 'link') {
			return bnEditor.getSelectedLinkUrl() !== undefined;
		}

		const pos = bnEditor.getTextCursorPosition();
		if (!pos) return false;

		switch (name) {
			case 'heading':
				return pos.block.type === 'heading' && (!attrs?.level || (pos.block.props as Record<string, unknown>)?.level === attrs.level);
			case 'blockquote':
				return pos.block.type === 'quote';
			case 'bulletList':
				return pos.block.type === 'bulletListItem';
			case 'orderedList':
				return pos.block.type === 'numberedListItem';
			default:
				return false;
		}
	}

	export function focus() {
		editor?.focus();
	}

	export function setContent(c: string) {
		const bnEditor = editor;
		if (!bnEditor) return;
		const protectedContent = protectShortcodes(c);
		const blocks = bnEditor.tryParseMarkdownToBlocks(protectedContent);
		if (blocks.length > 0) {
			_suppressChange = true;
			bnEditor.replaceBlocks(bnEditor.document, blocks);
			_suppressChange = false;
		}
	}
</script>

<div class="blocknote-root" class:active role="application">
	<div class="blocknote-editor-wrapper" bind:this={container}></div>
	<div bind:this={floatingContainer}>
		{#if showSlashMenu && menuShown && menuItems.length > 0}
			<div
				class="bn-slash-menu"
				style="left: {menuX}px; top: {menuY}px;"
				role="listbox"
				aria-label="Insert block"
			>
				{#each menuItems as item, i (item.title)}
					<button
						class="bn-slash-item"
						class:active={i === menuSelectedIndex}
						role="option"
						aria-selected={i === menuSelectedIndex}
						onclick={() => selectItem(item)}
						onmouseenter={() => (menuSelectedIndex = i)}
					>
						<span class="bn-slash-title">{item.title}</span>
						{#if item.subtext}
							<span class="bn-slash-subtext">{item.subtext}</span>
						{/if}
						{#if item.badge}
							<span class="bn-slash-badge">{item.badge}</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
		{#if sideMenuShow && sideMenuBlock}
			<div
				class="bn-drag-handle"
				style="left: {sideMenuX}px; top: {sideMenuY}px;"
				draggable="true"
				ondragstart={onDragHandleDragStart}
				ondragend={onDragHandleDragEnd}
				role="button"
				aria-label="Drag block"
				tabindex="-1"
			>
				⠿
			</div>
		{/if}
	</div>
</div>

<style>
	.blocknote-root {
		position: relative;
		width: 100%;
		display: none;
		flex: 1;
		min-height: 0;
	}

	.blocknote-root.active {
		display: flex;
		flex-direction: column;
	}

	.blocknote-editor-wrapper {
		flex: 1;
		padding: 32px 48px;
		max-width: var(--editor-max-width, 740px);
		margin: 0 auto;
		width: 100%;
		font-family: var(--editor-font, var(--font-serif));
		font-size: var(--editor-font-size, 16px);
		line-height: 1.8;
		overflow-y: auto;
	}

	:global(.bn-block-group) {
		margin: 0;
		padding: 0;
	}

	:global(.bn-block) {
		margin: 0.25em 0;
	}

	:global(.bn-inline-content) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	:global(.bn-inline-content h1) {
		font-size: 2em;
		margin: 0.67em 0;
		font-weight: 700;
		color: var(--c-text);
	}

	:global(.bn-inline-content h2) {
		font-size: 1.5em;
		margin: 0.75em 0;
		font-weight: 600;
		color: var(--c-text);
	}

	:global(.bn-inline-content h3) {
		font-size: 1.17em;
		margin: 0.83em 0;
		font-weight: 600;
		color: var(--c-text);
	}

	:global(.bn-inline-content p) {
		margin: 0.5em 0;
	}

	:global(.bn-blockquote) {
		border-left: 3px solid var(--c-border);
		margin: 1em 0;
		padding: 0.5em 1em 0.5em 1.2em;
		color: var(--c-text-secondary);
		font-style: italic;
	}

	:global(.bn-code-block) {
		background: var(--c-code-bg);
		color: var(--c-code-text);
		padding: 16px;
		border-radius: var(--radius-lg);
		font-family: var(--font-mono);
		font-size: 14px;
		overflow-x: auto;
	}

	:global(.bn-inline-content code) {
		background: var(--c-bg-muted);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	:global(.bn-image) {
		max-width: 100%;
		height: auto;
		border-radius: var(--radius-md);
	}

	:global(.bn-link) {
		color: var(--c-primary);
		text-decoration: underline;
	}

	/* BlockNote native formatting toolbar styling */
	:global(.bn-formatting-toolbar) {
		background: var(--c-bg) !important;
		border: 1px solid var(--c-border) !important;
		border-radius: var(--radius-lg) !important;
		box-shadow: var(--shadow-md) !important;
		gap: 2px !important;
		padding: 4px !important;
	}

	:global(.bn-formatting-toolbar button) {
		border-radius: var(--radius-sm) !important;
	}

	:global(.bn-formatting-toolbar button:hover) {
		background: var(--c-bg-muted) !important;
	}

	:global(.bn-formatting-toolbar button.bn-button-is-active) {
		background: var(--c-primary-light) !important;
		color: var(--c-primary) !important;
	}

	/* Slash menu flottant */
	.bn-slash-menu {
		position: fixed;
		z-index: 9999;
		min-width: 220px;
		max-height: 300px;
		overflow-y: auto;
		background: var(--c-bg, #fff);
		border: 1px solid var(--c-border, #ddd);
		border-radius: 8px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.bn-slash-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		font-size: 0.9rem;
		transition: background 0.1s;
	}

	.bn-slash-item.active,
	.bn-slash-item:hover {
		background: var(--c-hover, #f0f0f0);
	}

	.bn-slash-title {
		font-weight: 500;
		color: var(--c-text, #333);
		flex: 1;
	}

	.bn-slash-subtext {
		font-size: 0.8rem;
		color: var(--c-muted, #888);
	}

	.bn-slash-badge {
		font-size: 0.75rem;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--c-muted-bg, #e8e8e8);
		color: var(--c-muted, #666);
		font-family: monospace;
	}

	/* Drag handle (comme Notion) */
	.bn-drag-handle {
		position: fixed;
		z-index: 999;
		width: 20px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: grab;
		color: var(--c-muted, #888);
		border-radius: var(--radius-sm, 4px);
		transform: translateY(-50%);
		user-select: none;
		font-size: 14px;
		line-height: 1;
		opacity: 0;
		transition: opacity 0.12s, background 0.12s;
	}

	.blocknote-root:hover .bn-drag-handle {
		opacity: 1;
	}

	.bn-drag-handle:hover {
		background: var(--c-hover, #f0f0f0);
		color: var(--c-text, #333);
	}

	.bn-drag-handle:active {
		cursor: grabbing;
		background: var(--c-hover, #e0e0e0);
	}
</style>
