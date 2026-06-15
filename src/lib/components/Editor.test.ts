// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';

vi.mock('@lucide/svelte', () => {
	function IconMock(_props: Record<string, unknown>) { return { $$render: () => '' }; }
	const icons = [
		'Undo2', 'Redo2', 'Heading1', 'Heading2', 'Heading3',
		'Bold', 'Italic', 'Code', 'Link', 'Quote',
		'List', 'ListOrdered', 'Minus', 'Pilcrow',
		'CheckCircle2', 'AlertCircle', 'Loader2', 'Type', 'Hash',
		'FileText', 'RefreshCw', 'ChevronRight', 'ArrowUp', 'Folder',
		'PanelRightOpen', 'PanelRightClose', 'PenLine',
		'X', 'Plus', 'AlertTriangle', 'Code2',
	] as const;
	const mod: Record<string, unknown> = {};
	for (const name of icons) mod[name] = IconMock;
	return mod;
});

vi.mock('@tiptap/core', () => {
	const noop = { configure: () => noop };
	const extension = { extend: () => extension, configure: () => extension };
	const mockInstance = {
		chain: () => ({ focus: () => ({ run: () => true }) }),
		storage: { markdown: { getMarkdown: () => '' } },
		state: { doc: { textContent: '' } },
		isActive: () => false,
		destroy: () => {},
		commands: { setContent: () => true },
		getHTML: () => '',
	};
	function MockEditor() { return mockInstance; }
	MockEditor.prototype = mockInstance;
	return {
		Editor: MockEditor as unknown as typeof import('@tiptap/core')['Editor'],
		Extension: { create: () => extension },
		Mark: { create: () => extension },
		Node: { create: () => extension },
		getExtensions: () => [],
		getSchema: () => ({}),
		getHTMLFromFragment: () => '',
	};
});

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-link', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-bubble-menu', () => ({ default: { configure: () => ({}) } }));
vi.mock('tiptap-markdown', () => ({ Markdown: { configure: () => ({}) } }));

afterEach(cleanup);

describe('Editor', () => {
	it('renders toolbar with all buttons', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Hello' });

		expect(container.querySelector('.editor-container')).toBeTruthy();
		expect(container.querySelector('.editor-toolbar')).toBeTruthy();

		const buttons = container.querySelectorAll('.editor-toolbar button');
		const titles = Array.from(buttons).map((b) => b.getAttribute('title'));
		const expected = [
			'Annuler', 'Rétablir',
			'Titre 1', 'Titre 2', 'Titre 3',
			'Gras', 'Italique', 'Code', 'Lien',
			'Citation', 'Liste à puces', 'Liste numérotée', 'Ligne horizontale',
			'Mode Markdown brut',
		];
		for (const title of expected) {
			expect(titles.some((t) => t?.startsWith(title))).toBe(true);
		}
	});

	it('renders the bubble menu element', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		const { container } = render(Editor, { content: 'Test' });
		expect(container.querySelector('.bubble-menu')).toBeTruthy();
	});

	it('renders without error with empty content', async () => {
		const { default: Editor } = await import('./Editor.svelte');
		const { render } = await import('@testing-library/svelte');
		render(Editor, {});
	});
});
