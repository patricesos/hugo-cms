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
	import '@blocknote/core/style.css';

	type BlockNoteEditorProps = {
		content?: string;
		editable?: boolean;
		onChange?: (markdown: string) => void;
		onEditorReady?: (editor: BNEditor) => void;
	};

	let { content = '', editable = true, onChange, onEditorReady }: BlockNoteEditorProps = $props();

	let container: HTMLDivElement;
	let floatingContainer: HTMLDivElement;
	let editor = $state<BNEditor | null>(null);
	let markdownOutput = $state('');

	// -- État du slash menu --
	let menuShown = $state(false);
	let menuQuery = $state('');
	let menuX = $state(0);
	let menuY = $state(0);
	let menuItems = $state<DefaultSuggestionItem[]>([]);
	let menuSelectedIndex = $state(0);

	// Référence à l'extension SuggestionMenu pour fermer le menu
	let smExtension: ReturnType<typeof SuggestionMenu> | null = null;

	onMount(() => {
		editor = BNEditor.create({
			animations: true,
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

		// --- Configuration du slash menu ---
		const sm = editor.getExtension('suggestionMenu') as unknown as ReturnType<typeof SuggestionMenu>;

		if (sm) {
			smExtension = sm;

			sm.addSuggestionMenu({ triggerCharacter: '/' });

			sm.store.subscribe(() => {
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

		// --- Chargement du contenu initial ---
		if (content) {
			const blocks = editor.tryParseMarkdownToBlocks(content);
			if (blocks.length > 0) {
				editor.replaceBlocks(editor.document, blocks);
			}
		}

		editor.focus();

		if (!editable) {
			editor._tiptapEditor.setEditable(false);
		}

		editor.onChange((ed) => {
			markdownOutput = ed.blocksToMarkdownLossy();
			onChange?.(markdownOutput);
		});

		onEditorReady?.(editor);

		return () => {
			editor?.unmount();
			editor = null;
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		// Navigation du slash menu — les autres touches sont gérées
		// par l'extension BlockNote (enter-fix pour Enter sur heading, etc.)
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
		// On efface d'abord le texte "/query" pour que le bloc courant soit vide,
		// ce qui permet à insertOrUpdateBlockForSlashMenu de remplacer le bloc
		// sur place au lieu d'insérer après.
		smExtension?.clearQuery();
		item.onItemClick();
		smExtension?.closeMenu();
		menuShown = false;
		editor?.focus();
	}

	$effect(() => {
		if (editor && editable) {
			editor._tiptapEditor.setEditable(true);
		} else if (editor && !editable) {
			editor._tiptapEditor.setEditable(false);
		}
	});

	// On écoute en phase capture pour intercepter avant ProseMirror
	$effect(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('keydown', handleKeydown, true);
		return () => window.removeEventListener('keydown', handleKeydown, true);
	});
</script>

<div class="blocknote-root" role="application">
	<div class="blocknote-editor-wrapper" bind:this={container}></div>
	<div bind:this={floatingContainer}>
		{#if menuShown && menuItems.length > 0}
			<div
				class="bn-slash-menu"
				style="left: {menuX}px; top: {menuY}px;"
				role="listbox"
				aria-label="Insert block"
			>
				{#each menuItems as item, i}
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
	</div>
</div>

<style>
	.blocknote-root {
		position: relative;
		width: 100%;
	}

	.blocknote-editor-wrapper {
		min-height: 200px;
		padding: 1rem;
		border: 1px solid var(--c-border, #ddd);
		border-radius: 6px;
		background: var(--c-bg, #fff);
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

	/* Héritage des styles BlockNote */
	:global(.bn-block-group) {
		margin: 0;
		padding: 0;
	}

	:global(.bn-block) {
		margin: 0.25em 0;
	}

	:global(.bn-inline-content) {
		font-family: var(--font-editor, 'Inter', sans-serif);
		font-size: 1rem;
		line-height: 1.6;
	}

	:global(.bn-inline-content h1) {
		font-size: 1.8rem;
		font-weight: 700;
		margin: 0.5em 0 0.25em;
	}

	:global(.bn-inline-content h2) {
		font-size: 1.4rem;
		font-weight: 600;
		margin: 0.5em 0 0.25em;
	}

	:global(.bn-inline-content h3) {
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0.5em 0 0.25em;
	}

	:global(.bn-inline-content p) {
		margin: 0.4em 0;
	}
</style>
