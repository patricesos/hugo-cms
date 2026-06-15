import { Extension, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { type Instance } from 'tippy.js';

export interface SlashCommandItem {
	title: string;
	keywords: string;
	icon: string;
	command: (props: { editor: Editor; range: Range }) => void;
}

const items: SlashCommandItem[] = [
	{ title: 'Texte', keywords: 'paragraph p', icon: 'Pilcrow', command: ({ editor, range }) => editor.chain().focus().deleteRange(range).run() },
	{ title: 'Titre 1', keywords: 'heading h1 #', icon: 'Heading1', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setHeading({ level: 1 }).run() },
	{ title: 'Titre 2', keywords: 'heading h2 ##', icon: 'Heading2', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setHeading({ level: 2 }).run() },
	{ title: 'Titre 3', keywords: 'heading h3 ###', icon: 'Heading3', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setHeading({ level: 3 }).run() },
	{ title: 'Citation', keywords: 'quote blockquote >', icon: 'Quote', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setBlockquote().run() },
	{ title: 'Code', keywords: 'code block ```', icon: 'Code', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setCodeBlock().run() },
	{ title: 'Liste', keywords: 'bullet list ul -', icon: 'List', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).toggleBulletList().run() },
	{ title: 'Liste numérotée', keywords: 'ordered list ol 1.', icon: 'ListOrdered', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).toggleOrderedList().run() },
	{ title: 'Séparateur', keywords: 'hr horizontal rule ---', icon: 'Minus', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).setHorizontalRule().run() },
	{ title: 'Image', keywords: 'img image picture', icon: 'Image', command: ({ editor, range }) => window.dispatchEvent(new CustomEvent('slash:image', { detail: { editor, range } })) },
	{ title: 'Shortcode Hugo', keywords: 'shortcode hugo template', icon: 'Zap', command: ({ editor, range }) => (editor.chain().focus().deleteRange(range) as any).insertContent('{{<  >}}').run() },
];

const iconSVGs: Record<string, string> = {
	Pilcrow: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></svg>',
	Heading1: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-3v10"/></svg>',
	Heading2: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-1-2-2.5-2S16 10.5 16 12"/></svg>',
	Heading3: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5-.3 3.5 1 0 .8-.6 1.5-1.6 1.5h-1.5"/><path d="M17.5 14.5c1.7 1 3.5.3 3.5-1 0-.8-.6-1.5-1.6-1.5h-1.5"/></svg>',
	Quote: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>',
	Code: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
	List: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
	ListOrdered: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
	Minus: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
	Image: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
	Zap: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
};

const slashPluginKey = new PluginKey('slash-commands');

const itemsProviders = (query: string): SlashCommandItem[] => {
	if (query.length > 15) return [];
	if (!query) return items;
	const q = query.toLowerCase();
	return items.filter(
		(item) => item.title.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
	);
};

export const SlashCommands = Extension.create({
	name: 'slash-commands',

	addProseMirrorPlugins() {
		const editor = this.editor;
		return [
			Suggestion({
				editor,
				char: '/',
				pluginKey: slashPluginKey,
				startOfLine: false,
				allowSpaces: false,
				items: ({ query }: { query: string }) => itemsProviders(query),
				command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
					props.command({ editor, range });
				},
				render: () => {
					let popup: Instance | null = null;
					let element: HTMLDivElement;
					let listEl: HTMLDivElement;
					let selectedIndex = 0;
					let currentItems: SlashCommandItem[] = [];

					const renderItems = () => {
						if (!listEl) return;
						listEl.innerHTML = currentItems
							.map(
								(item, i) =>
									`<button class="slash-item${i === selectedIndex ? ' active' : ''}" data-index="${i}">
										<span class="slash-icon">${iconSVGs[item.icon] || ''}</span>
										<span class="slash-label">${item.title}</span>
									</button>`,
							)
							.join('');
						const activeEl = listEl.querySelector('.active') as HTMLElement | null;
						activeEl?.scrollIntoView({ block: 'nearest' });
					};

					const onStart = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
						currentItems = props.items;
						selectedIndex = 0;

						element = document.createElement('div');
						element.className = 'slash-menu';
						listEl = document.createElement('div');
						listEl.className = 'slash-list';
						element.appendChild(listEl);

						listEl.addEventListener('click', (e) => {
							const btn = (e.target as HTMLElement).closest('button[data-index]') as HTMLElement | null;
							if (!btn) return;
							const idx = parseInt(btn.dataset.index || '', 10);
							const item = currentItems[idx];
							if (!item) return;
							item.command({ editor, range: props.range });
							editor.view.dispatch(editor.view.state.tr.setMeta(slashPluginKey, { exit: true }));
						});

						renderItems();

						popup = tippy('body', {
							getReferenceClientRect: () => props.clientRect?.() || new DOMRect(0, 0, 0, 0),
							appendTo: () => document.body,
							content: element,
							showOnCreate: true,
							interactive: true,
							trigger: 'manual',
							placement: 'bottom-start',
							maxWidth: 280,
						})[0];
					};

					const onUpdate = (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
						currentItems = props.items;
						if (currentItems.length === 0) {
							popup?.hide();
							return;
						}
						selectedIndex = Math.min(selectedIndex, currentItems.length - 1);
						renderItems();
						popup?.setProps({ getReferenceClientRect: () => props.clientRect?.() || new DOMRect(0, 0, 0, 0) });
					};

					const onKeyDown = (props: SuggestionKeyDownProps) => {
						const { event, range, view } = props;
						if (event.key === 'ArrowUp') {
							event.preventDefault();
							selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
							renderItems();
							return true;
						}
						if (event.key === 'ArrowDown') {
							event.preventDefault();
							selectedIndex = (selectedIndex + 1) % currentItems.length;
							renderItems();
							return true;
						}
						if (event.key === 'Enter') {
							event.preventDefault();
							const item = currentItems[selectedIndex];
							if (item) item.command({ editor, range });
							view.dispatch(view.state.tr.setMeta(slashPluginKey, { exit: true }));
							return true;
						}
						if (event.key === 'Escape') {
							event.preventDefault();
							popup?.hide();
							view.dispatch(view.state.tr.setMeta(slashPluginKey, { exit: true }));
							return true;
						}
						return false;
					};

					const onExit = () => {
						popup?.destroy();
						element?.remove();
						popup = null;
					};

					return { onStart, onUpdate, onKeyDown, onExit };
				},
			}),
		];
	},
});

export { items };
